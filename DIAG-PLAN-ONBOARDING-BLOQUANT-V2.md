# DIAG + PLAN V2 FINAL — Onboarding bloquant: email confirmé + state refresh

**Date** : 2026-02-10  
**Objectif** : Plan final (pas d’implémentation)

---

## P0. Preuve du bug — Exemples de logs [ONBOARDING_PROBE]

Le log `[ONBOARDING_PROBE]` est déjà présent dans `ClientOnboarding.tsx` (l.42-52). Exemples attendus selon le flux :

### Cas 1 — Email/password juste après signup (avant clic sur le lien)

```
[ONBOARDING_PROBE] currentStep calculation {
  hasSession: true,
  isEmailConfirmed: false,
  email_confirmed_at: null,
  "profile.firstName": "Jean",
  "profile.lastName": "Dupont",
  "profile.phone": "+262692123456",
  "profile.kycStatus": "pending",
  isProfileComplete: true,
  currentStep: 2
}
```

**Interprétation** : `session` existe (Supabase crée la session même avant confirmation si config le permet), mais `email_confirmed_at` est `null`. Le profil est déjà rempli via `user_metadata` du signup → `isProfileComplete: true`. Step 2 correct (bloqué sur email).

### Cas 2 — Email/password après clic sur le lien (retour callback)

```
[ONBOARDING_PROBE] currentStep calculation {
  hasSession: true,
  isEmailConfirmed: true,
  email_confirmed_at: "2026-02-10T14:32:00.000Z",
  "profile.firstName": "Jean",
  "profile.lastName": "Dupont",
  "profile.phone": "+262692123456",
  "profile.kycStatus": "pending",
  isProfileComplete: true,
  currentStep: 4
}
```

**Interprétation** : Email confirmé → `isEmailConfirmed: true`. Profil complet → step 4. `kycStatus: "pending"` n’est pas bloquant (hors scope V2).

**Bug observable** : Si en cas 1 on obtient `currentStep: 3` ou `4` avec `email_confirmed_at: null`, c’est que `isEmailConfirmed` est mal évalué (ex. confirmation désactivée ou OAuth).

---

## 1. Cause du bug (résumé)

1. **Email confirmé** : La source de vérité `user.email_confirmed_at` peut être fausse si :
   - Supabase a la confirmation désactivée (Dashboard → Auth → Providers → Email → "Confirm email" = OFF) → tous les users ont `email_confirmed_at` défini à la création
   - OAuth (Google) : Supabase renvoie `email_confirmed_at` automatiquement car le provider a vérifié l’email
   - Le bouton "Rafraîchir" appelle `getSession()` mais pas `getUser()` : `getSession()` peut renvoyer une session en cache sans refetch côté serveur

2. **Profil complété trop tôt** : La condition `isProfileComplete` ne regarde que `firstName`, `lastName`, `phone`. Elle **ignore** `profiles.kyc_status`. Un profil créé au signup avec metadata (prénom, nom, tel) est déjà "complet" dès la première visite.

3. **Statut backend ignoré** : `profiles.kyc_status` (`pending` | `verified` | `rejected`) n’est **jamais** utilisé dans l’onboarding. L’étape "Terminé" s’affiche dès que le profil a prénom+nom+téléphone, même si `kyc_status === 'pending'`.

---

## 2. Champ backend "pending/verified"

| Élément | Valeur |
|--------|--------|
| **Champ** | `profiles.kyc_status` |
| **Valeurs** | `"pending"` \| `"verified"` \| `"rejected"` \| `null` (défaut `'pending'`) |
| **Schéma** | `src/integrations/supabase/types.ts` (profiles Row) |
| **Où c’est lu** | `ProfileService.getCurrentUserProfile()` → `User.kycStatus` |
| **Où c’est utilisé** | `Profile.tsx` (badge statut), `OwnerVehicles.tsx` (banner si non vérifié), `BookingDiscussion.tsx`, `MessageToOwners.tsx` |
| **Pas utilisé dans** | `ClientOnboarding.tsx` (aucune lecture de `kycStatus`) |

---

## Stale user — Comment recalculer immédiatement

### Problème

Quand l’utilisateur clique « J’ai confirmé mon compte », on appelle `supabase.auth.getUser()`. La réponse contient `freshUser` avec `email_confirmed_at` à jour. Mais `ClientOnboarding` utilise `useAuth().user` (AuthContext), qui n’est pas mis à jour automatiquement par ce simple appel.

### Mécanisme de recalcul

- `isEmailConfirmed = Boolean(user?.email_confirmed_at)` dépend de `user` (AuthContext)
- `currentStep` est dérivé de `isEmailConfirmed` (et des autres flags)
- Tant que `user` ne change pas, React ne recalcule pas avec les nouvelles données

### Choix d’approche V2 : **A) `refreshUser()` dans AuthContext**

**Option A** : Exposer `refreshUser()` dans AuthContext qui appelle `getUser()` et met à jour `user`.

```ts
// AuthContext
const refreshUser = async () => {
  const { data: { user: freshUser } } = await supabase.auth.getUser();
  setUser(freshUser ?? null);
  // Optionnel : getSession() + setSession pour garder session cohérente
};
// value = { ..., refreshUser }
```

Dans `ClientOnboarding`, après `getUser()` dans `handleCheckEmailConfirmed()` :
- Appeler `refreshUser()` du contexte
- Le re-render mettra à jour `user` → `isEmailConfirmed` → `currentStep` (step 3 ou 4)

**Avantages** : Une seule source de vérité, pas de state local redondant, tous les composants sous AuthProvider profitent du refresh.

**Option B (rejetée)** : `freshUserOverride` local dans ClientOnboarding. Duplication de la donnée user, risque d’incohérence avec le reste de l’app.

**Option C** : `getUser()` met à jour le storage Supabase ; `onAuthStateChange` pourrait émettre un nouvel event. En pratique, la confirmation via lien ne déclenche pas toujours un refresh automatique du client. Moins fiable qu’un refresh explicite.

---

## API `resend` — Validation et messages UX

### Usage confirmé

```ts
const { data, error } = await supabase.auth.resend({
  type: "signup",
  email: user.email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`
  }
});
```

**Note** : Certaines versions anciennes ignoraient `emailRedirectTo` sur resend ; les versions récentes le gèrent (cf. auth-js source : `redirectTo: options?.emailRedirectTo`). À tester en prod.

### Erreurs possibles et messages UX

| Erreur | Condition | Message UX |
|--------|-----------|------------|
| `User already registered` | Email déjà confirmé | "Votre compte est déjà confirmé. Vous pouvez vous connecter." |
| `Email not confirmed` / 422 | User non trouvé ou état incohérent | "Impossible d’envoyer l’email. Vérifiez l’adresse ou réessayez plus tard." |
| 429 | Rate limit | "Trop de demandes. Réessayez dans quelques minutes." |
| 500 | Erreur serveur | "Service temporairement indisponible. Réessayez plus tard." |
| Réseau / timeout | Pas de réponse | "Erreur de connexion. Vérifiez votre réseau." |

**Succès** : `error === null` → toast "Un nouvel email de confirmation a été envoyé. Vérifiez votre boîte de réception."

---

## A) Règle actuelle de progression

### Tableau Step → condition → source

| Step | Condition | Source |
|------|-----------|--------|
| 1 | `!hasSession` | `session?.user` (AuthContext) |
| 2 | `!isEmailConfirmed` | `user?.email_confirmed_at` (AuthContext) |
| 3 | `!isProfileComplete` | `profile.firstName`, `profile.lastName`, `profile.phone` (ProfileService) |
| 4 | Tout OK | — |

### Où ça valide "Profil complété" trop tôt

- **Ligne 27-29** : `isProfileComplete = firstName && lastName && phone` (tous non vides)
- Le profil est rempli via `user_metadata` au signup (Register envoie `firstName`, `lastName`, `phone` dans `options.data`)
- `ProfileService.createUserProfile` crée le profil avec ces valeurs dès la première visite (PGRST116)
- Donc dès qu’un profil existe avec prénom/nom/tel (même venant du signup), `isProfileComplete = true`
- **Manque** : aucune vérification de `email_confirmed_at` après un refresh fiable, ni de `kyc_status`

---

## B) Email confirmé — preuve runtime

### Où on lit `email_confirmed_at`

- `ClientOnboarding.tsx` L26 : `(user as any)?.email_confirmed_at` via `useAuth().user`
- `AuthContext` fournit `user` depuis `session?.user` (onAuthStateChange / getSession)
- Supabase : `auth.users.email_confirmed_at` (colonne GoTrue)

### Pourquoi ça peut passer malgré email non confirmé

1. **Confirmation désactivée** : Si "Confirm email" est OFF dans Supabase, les nouveaux comptes ont `email_confirmed_at` défini à la création
2. **OAuth** : Google/Facebook → email considéré confirmé par le provider
3. **Cache session** : `getSession()` lit le storage local ; `getUser()` fait un appel API. Le refresh actuel utilise `getSession()` → pas de refetch serveur

---

## C) Callback flow (email confirm → onboarding)

| Étape | Fichier | Comportement |
|-------|---------|--------------|
| 1 | Email cliqué | Lien avec `token_hash` + `type=signup` (ou `type=recovery`) |
| 2 | `Callback.tsx` | `hasAuthTokensInUrl()` détecte `token_hash` / `type=signup` |
| 3 | `tryGetSession()` | Boucle jusqu’à 10 tentatives (300ms) jusqu’à `session?.user` |
| 4 | `completeSuccess()` | `navigate("/onboarding/client")` |
| 5 | `onAuthStateChange` | Si `SIGNED_IN` / `TOKEN_REFRESHED` → `completeSuccess()` |

**Risque de timing** : Supabase met à jour la session après traitement du `token_hash`. Le premier `getSession()` peut être null ; les retries laissent le temps au client de recevoir la session. Pas de redirection explicite avant d’avoir une session.

---

## PLAN V2 FINAL — 8 étapes

### Étape 1 — AuthContext : `refreshUser()`
- Ajouter `refreshUser` dans `AuthContext` : appelle `supabase.auth.getUser()`, met à jour `user` et `session` dans le state.
- Exposer `refreshUser` dans le value du contexte.

### Étape 2 — ClientOnboarding Step 2 : CTA « J’ai confirmé mon compte »
- Remplacer / compléter le bouton « Rafraîchir » par un CTA principal « J’ai confirmé mon compte ».
- Au clic : appeler `supabase.auth.getUser()`, puis `refreshUser()` si confirmé. Si `email_confirmed_at` présent → le re-render fera passer à step 3/4.

### Étape 3 — ClientOnboarding Step 2 : Message d’erreur si non confirmé
- Si `getUser()` renvoie `email_confirmed_at === null` : afficher message « Email non confirmé. Vérifiez votre boîte mail. » et afficher le bouton « Renvoyer l’email ».

### Étape 4 — ClientOnboarding Step 2 : `handleResendEmail()`
- Implémenter `handleResendEmail()` : `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } })`.
- Gérer les erreurs (voir tableau messages UX ci-dessus).
- Toast succès : « Un nouvel email de confirmation a été envoyé. »

### Étape 5 — ClientOnboarding : Remplacer `getSession` par `getUser` dans `handleRefresh`
- Dans `handleRefresh`, remplacer `supabase.auth.getSession()` par `supabase.auth.getUser()` + appel à `refreshUser()` pour forcer un refetch serveur.

### Étape 6 — Retirer le log [ONBOARDING_PROBE]
- Une fois les tests OK, supprimer le `console.debug("[ONBOARDING_PROBE] ...")` de `ClientOnboarding.tsx`.

### Étape 7 — (Optionnel) Garder le bouton « Rafraîchir »
- Conserver un bouton secondaire « Rafraîchir » qui appelle `handleRefresh` (utile si l’utilisateur a cliqué le lien dans un autre onglet).

### Étape 8 — Tests manuels
- Exécuter la checklist ci-dessous.

---

## Fichiers exacts à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/contexts/AuthContext.tsx` | Ajout de `refreshUser()`, exposition dans le value |
| `src/pages/onboarding/ClientOnboarding.tsx` | Step 2 : CTA « J’ai confirmé », `handleCheckEmailConfirmed`, `handleResendEmail`, adaptation de `handleRefresh` (getUser + refreshUser), messages UX |
| Aucun autre | — |

---

## Checklist de tests manuels

- [ ] **Signup email/password** → onboarding step 2 → boutons « J’ai confirmé » et « Renvoyer l’email » visibles
- [ ] **Step 2, sans clic sur le lien** : clic « J’ai confirmé » → message « Email non confirmé » + bouton « Renvoyer l’email »
- [ ] **Step 2, clic « Renvoyer l’email »** → toast succès, email reçu (vérifier boîte mail)
- [ ] **Après confirmation** : clic sur le lien email → callback → onboarding → « J’ai confirmé » → passage step 3 ou 4
- [ ] **Profil incomplet** : step 3 → bouton « Compléter mon profil » → `/profile`
- [ ] **Google OAuth** : connexion → onboarding direct step 3 ou 4 (email déjà confirmé)
- [ ] **kyc_status pending** : step 4 affichée (KYC hors scope V2)

---

## E) Logs temporaires ajoutés

Dans `ClientOnboarding.tsx`, log `[ONBOARDING_PROBE]` :

```ts
{
  hasSession,
  isEmailConfirmed,
  email_confirmed_at,
  "profile.firstName", "profile.lastName", "profile.phone",
  "profile.kycStatus",
  isProfileComplete,
  currentStep,
}
```

**Exemple attendu** pour un user "pending" (email non confirmé, profil créé au signup) :

```json
{
  "hasSession": true,
  "isEmailConfirmed": false,
  "email_confirmed_at": null,
  "profile.firstName": "Jean",
  "profile.lastName": "Dupont",
  "profile.phone": "+262...",
  "profile.kycStatus": "pending",
  "isProfileComplete": true,
  "currentStep": 2
}
```

Ici, `currentStep` reste 2 car `isEmailConfirmed` est false. Si `currentStep` est 3 ou 4 alors que `email_confirmed_at` est null, le bug vient de `isEmailConfirmed` (ex. confirmation désactivée ou OAuth).
