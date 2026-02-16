# Diagnostic Onboarding post-inscription — Email Gate V1

**Date :** 2026-02-10  
**Objectif :** Harmoniser le parcours après inscription (1ère fois) vs après confirmation email, et identifier la cause des redirections incohérentes (compléter profil → login).

---

## 1. Résumé du parcours actuel (schéma)

```
Inscription Google (Register ou Login)
  → signInWithOAuth({ provider: 'google', options: { redirectTo: AUTH_CALLBACK_URL } })
  → Redirection externe Google puis retour vers SITE_URL/auth/callback

/auth/callback (Callback.tsx)
  → getSession() immédiat
  → Si session → toast "Connexion réussie" + navigate("/")   [HOME]
  → Si pas de session / erreur → toast + navigate("/auth/login")

Inscription email (Register)
  → signUp({ email, password, options: { emailRedirectTo: origin + '/auth/callback' } })
  → navigate("/auth/login") + toast "Vérifiez votre email pour confirmer"
  → Utilisateur clique lien email → Supabase redirige vers /auth/callback (tokens dans URL)
  → Même Callback : getSession() → si null → navigate("/auth/login") [BOUCLE / INCOHÉRENCE]

Page /profile
  → ProfileService.getCurrentUserProfile() (getUser() + table profiles)
  → Si pas de session → error, toast, currentUser reste null → affichage "Chargement de votre profil..."
  → Pas de redirection explicite vers /auth/login ; pas de CTA "Compléter mon profil" vers login dans le code
```

En une ligne : **OAuth/Email → callback → getSession() → home si OK, sinon login ; pas de gate “vérifie ton email”, pas de distinction 1ère inscription / connexion.**

---

## 2. Points d’incohérence confirmés

- **Callback après email** : Sur `/auth/callback`, `getSession()` est appelé sans attendre que le client Supabase ait traité les tokens présents dans l’URL (hash ou query). En arrivant du lien email, la session peut ne pas encore être enregistrée → “Aucune session trouvée” → redirection vers `/auth/login` alors que l’utilisateur vient de confirmer.
- **Aucune “Onboarding Gate”** : Après première inscription (Google ou email), il n’existe pas de page dédiée “Vérifie ton email” ; l’inscription email envoie vers login + toast, et le callback envoie soit vers home soit vers login.
- **Pas de distinction signup / login** : Aucun flag `is_new_user`, ni lecture de `created_at` / `last_sign_in_at` de `auth.users`, ni colonne type `onboarding_status` en base. On ne peut pas différencier “première inscription” et “connexion” dans le code actuel.
- **“Compléter mon profil” → login** : Aucune page ni CTA nommés exactement “Compléter mon profil” qui redirige vers login. Les causes probables du ressenti :
  - **Callback** : après clic sur le lien email, session absente → redirect `/auth/login`.
  - **Profile** : accès à `/profile` sans session (ex. nouvel onglet) → `getCurrentUserProfile()` échoue → toast + écran “Chargement de votre profil...” (pas de redirect, mais pas de CTA “compléter” non plus). Le lien navbar “Modifier mon profil” mène vers `/profile` ; si la session est perdue, l’utilisateur reste sur un état de chargement ou va vers login ailleurs.
- **Routes non protégées** : Pas de `ProtectedRoute` / `RequireAuth` dans `App.tsx`. Les pages (Dashboard, Profile, etc.) font leurs propres vérifications (ex. `getCurrentUserProfile()` ou `getUser()`) et redirigent vers `/auth/login` ou affichent un état d’erreur ; aucune logique centralisée “pending / email non confirmé”.

---

## 3. Source de vérité actuelle (états / statuts)

| Champ / concept        | Table / origine      | Utilisé où (front)                    | Valeurs / remarques |
|------------------------|----------------------|----------------------------------------|---------------------|
| Session / user         | Supabase Auth        | AuthContext, Callback, ProfileService  | Session présente ou non |
| `profiles`             | `public.profiles`    | ProfileService, Navbar, pages métier   | id, email, first_name, last_name, role, kyc_status, … |
| `kyc_status`           | `profiles.kyc_status`| Profile, OwnerVehicles, etc.          | `pending` \| `verified` \| `rejected` (KYC, pas onboarding) |
| “Pending” user         | **Non existant**     | —                                      | Aucune colonne “pending” pour compte en attente de confirmation email |
| Email confirmé         | `auth.users` (Supabase) | **Non lu côté front**                | Supabase gère `email_confirmed_at` ; pas utilisé dans l’app |
| Profil créé à l’inscription | —                 | ProfileService (création si PGRST116)  | Profil créé à la première lecture, pas par trigger migration visible |

**Conclusion :** La source de vérité pour “utilisateur connecté” est la session Supabase. Il n’y a pas de source de vérité pour “1ère inscription” ou “email en attente de confirmation” côté app (ni en base, ni en front).

---

## 4. Cartographie Auth & Redirect

### Fichiers / services / hooks

| Rôle | Fichier / ressource |
|------|----------------------|
| OAuth (Google) signup/login | `src/pages/auth/Register.tsx`, `src/pages/auth/Login.tsx` — `signInWithOAuth({ provider: 'google', options: { redirectTo: AUTH_CALLBACK_URL } })` |
| Inscription email | `Register.tsx` — `signUp({ options: { emailRedirectTo: window.location.origin + '/auth/callback' } })` |
| Réception OAuth / email confirm | `src/pages/auth/Callback.tsx` — `getSession()` puis `navigate("/")` ou `navigate("/auth/login")` |
| Session / état auth | `src/contexts/AuthContext.tsx` — `onAuthStateChange` + `getSession()` ; `src/hooks/use-auth-store.ts` (optionnel) |
| URL de callback | `src/lib/config.ts` — `AUTH_CALLBACK_URL = getFullUrl('/auth/callback')`, `SITE_URL` via `VITE_PUBLIC_SITE_URL` ou `window.location.origin` |

### URLs de redirect

- **Après OAuth (Google)** : `redirectTo: AUTH_CALLBACK_URL` → `/auth/callback` (puis code : `/` ou `/auth/login`).
- **Après confirmation email** : `emailRedirectTo: origin + '/auth/callback'` → même page `/auth/callback`. Pas de `auth/v1/callback` explicite côté app ; Supabase envoie l’utilisateur vers l’URL configurée avec les tokens dans l’URL.

### Schéma synthétique

```
Inscription Google  →  redirectTo: AUTH_CALLBACK_URL
                             ↓
                    /auth/callback  (Callback.tsx)
                             ↓
                    getSession()
                   /        \
              session?     non/erreur
                 |              |
            navigate("/")   navigate("/auth/login")

Inscription email   →  emailRedirectTo: origin + '/auth/callback'
                             ↓
                    (clic lien email) → /auth/callback (tokens en hash/query)
                             ↓
                    getSession() [risque: pas encore de session si URL non traitée]
                             ↓
                    souvent "Aucune session trouvée" → navigate("/auth/login")
```

---

## 5. Détection “1ère inscription” vs “connexion”

- **Aujourd’hui :** On ne peut pas distinguer de façon fiable. Aucun stockage de “première connexion” ou “inscription”, pas de lecture de `auth.users.created_at` / `last_sign_in_at`, pas de flag `is_new_user` (Supabase peut l’exposer dans certains événements, non utilisé ici).
- **Recommandation minimale :** Introduire une source de vérité pour l’onboarding, par exemple :
  - **Option A** : Colonne `profiles.onboarding_status` (`pending_email` | `profile_incomplete` | `completed`) ou équivalent, mise à jour au premier login / après confirmation email.
  - **Option B** : Utiliser `profiles.created_at` + “jamais connecté après signup” (ex. pas de `last_sign_in_at` ou une seule connexion) — nécessite d’exposer ou d’utiliser ces infos (RPC ou politique Supabase).

---

## 6. Pourquoi “Compléter mon profil” peut renvoyer vers login

- **Cause 1 (la plus probable)** : **Callback** — Après clic sur le lien de confirmation email, l’utilisateur arrive sur `/auth/callback` avec des tokens dans l’URL. Le code appelle `getSession()` tout de suite ; le client Supabase n’a pas toujours fini de persister la session → `session` null → toast “Aucune session trouvée” + `navigate("/auth/login")`. Donc l’utilisateur a l’impression d’être renvoyé vers la connexion après avoir “complété” (confirmé) son email.
- **Cause 2** : **Guard “user must be authed”** — Sur des pages comme VehicleDetails, Dashboard, OwnerBookings, etc., si `getUser()` ou le profil renvoie null, on fait `navigate('/auth/login')`. Si la session a expiré ou est perdue (autre onglet, lien email ouvert dans un nouvel onglet), un CTA qui mène vers “profil” ou “compléter profil” peut donc aboutir à une page qui redirige vers login.
- **Cause 3** : Pas de `redirectTo` mal configuré pour l’app elle-même (AUTH_CALLBACK_URL est cohérent) ; le problème est surtout le **timing** sur le callback et l’absence de gate “vérifie ton email”.

**Trace de code (cause 1)** :  
`src/pages/auth/Callback.tsx` lignes 12–41 : `handleAuthCallback` → `getSession()` → si `!session?.user` → `navigate("/auth/login")`. Aucun échange explicite des paramètres d’URL (hash/query) avec la session ; on suppose que le client Supabase a déjà mis à jour la session, ce qui peut être faux au premier rendu.

---

## 7. Guards & routing global

- **App.tsx** : Aucune route protégée par un composant type `RequireAuth` / `ProtectedRoute`. Toutes les routes sont déclarées sans wrapper d’auth.
- **Redirection vers home** : Elle a lieu **uniquement dans** `Callback.tsx` en cas de succès : `if (session?.user) { ... navigate("/"); }`. Aucun `useEffect` global ou layout ne redirige vers home selon l’état auth ; Index (home) est accessible à tous.
- **Résumé** : “La redirection vers la home après auth se fait dans **Callback.tsx**, condition **session?.user** présente.”

---

## 8. Où brancher la “Onboarding Gate” (fichiers exacts)

- **Page “Vérifie ton email” (gate après 1ère inscription)**  
  - Créer une nouvelle page (ex. `src/pages/auth/VerifyEmail.tsx`) et une route (ex. `/auth/verify-email`) dans `App.tsx`.  
  - Après **inscription email** dans `Register.tsx` : au lieu de (ou en plus de) `navigate("/auth/login")`, rediriger vers cette page (ou y rester si on affiche déjà le message sur Register).  
  - Ne pas rediriger vers home tant que l’utilisateur n’a pas cliqué sur le lien email (pour le flux email) ; pour Google, la “gate” peut être un simple message ou un redirect direct vers complétion de profil.

- **Callback après confirmation email**  
  - **Fichier** : `src/pages/auth/Callback.tsx`.  
  - S’assurer que la session est bien établie à partir de l’URL (attendre un cycle ou utiliser l’API Supabase qui consomme les paramètres de redirect), puis rediriger selon l’état onboarding (ex. “compléter profil” ou home).  
  - Éviter de rediriger vers `/auth/login` si l’URL contient des tokens de confirmation (type `recovery` ou `signup`).

- **Distinction 1ère inscription / connexion et redirection “compléter profil”**  
  - **Fichier** : `src/pages/auth/Callback.tsx` (et éventuellement `AuthContext` ou un hook dédié).  
  - Après établissement de la session : lire le profil (et éventuellement `onboarding_status` si ajouté) ; si profil à compléter ou nouveau user → `navigate("/profile")` (ou page dédiée “compléter profil”) avec un paramètre optionnel (ex. `?onboarding=1`) ; sinon → `navigate("/")`.

- **Protection des routes “profil” / “compléter profil”**  
  - Soit garder la logique actuelle dans `Profile.tsx` (getCurrentUserProfile + affichage selon `currentUser`).  
  - Soit ajouter un wrapper `RequireAuth` utilisé uniquement pour certaines routes (ex. `/profile`, `/me/*`) et rediriger vers `/auth/login` si pas de session, pour centraliser la logique.

---

## 9. Trois options de fix (de la plus simple à la plus propre)

### Option 1 — Minimale (fix callback + message)

- Dans **Callback.tsx** : attendre que la session soit disponible après redirect (ex. `getSession()` après un court délai ou après un `onAuthStateChange` qui signale `SIGNED_IN` / utilisation des query params si besoin), au lieu d’un seul `getSession()` synchrone au montage.
- Après **inscription email** dans **Register.tsx** : afficher une page ou un bloc dédié “Vérifiez votre email” (sans rediriger immédiatement vers login), avec un lien “Déjà confirmé ? Se connecter”.
- **Effort** : faible. **Risque** : ne règle pas la distinction signup/login ni un parcours “compléter profil” structuré.

### Option 2 — Callback + gate “vérifie ton email” + redirection “compléter profil”

- Conserver Option 1 pour le callback.
- Ajouter une route `/auth/verify-email` (ou équivalent) affichant “Vérifiez votre email” après inscription email ; depuis Register, rediriger vers cette page au lieu de login.
- Dans Callback, une fois la session établie : appeler ProfileService (ou équivalent) ; si profil vide ou “à compléter” (critères à définir : ex. pas de téléphone), rediriger vers `/profile?onboarding=1`, sinon vers `/`.
- **Effort** : moyen. **Risque** : “profil à compléter” reste défini par des règles métier (champs manquants) tant qu’il n’y a pas de statut explicite.

### Option 3 — Source de vérité onboarding + flow complet

- Ajouter en base (ex. `profiles`) un champ type `onboarding_status` (`pending_email` | `profile_incomplete` | `completed`) ou équivalent, mis à jour par le backend (trigger ou Edge Function) à la création de l’utilisateur / à la première connexion.
- Page “Vérifie ton email” après inscription email ; Callback lit le profil + `onboarding_status` et redirige :
  - `pending_email` (si encore pertinent) → page “Vérifiez votre email” ou équivalent ;
  - `profile_incomplete` → `/profile?onboarding=1` ;
  - `completed` → `/`.
- Protéger les routes sensibles avec un guard (ex. `RequireAuth`) et, optionnellement, un guard “onboarding complété” pour éviter d’accéder au reste de l’app sans avoir complété le profil.
- **Effort** : plus élevé. **Risque** : migrations et cohérence des mises à jour du statut.

---

## 10. Recommandation V1 (celle qui casse le moins)

- **Recommandation** : **Option 1 + une partie d’Option 2** sans toucher au schéma de données.
  - **Callback** : corriger le timing (attendre que la session soit disponible après redirect, ou consommer les paramètres d’URL si l’API Supabase le permet) pour éviter la redirection systématique vers login après clic sur le lien email.
  - **Inscription email** : après `signUp`, rediriger vers une page dédiée “Vérifiez votre email” (nouvelle route, ex. `/auth/verify-email`) au lieu de `/auth/login`, avec un message clair et un lien “Se connecter” pour ceux qui ont déjà confirmé.
  - **Callback (suite)** : une fois la session OK, rediriger les nouveaux utilisateurs (ex. profil créé récemment ou champs essentiels manquants) vers `/profile` avec un paramètre optionnel `?onboarding=1`, et les autres vers `/`. On peut définir “nouveau” par `profiles.created_at` récent (ex. même jour) ou par champs manquants (ex. pas de téléphone) sans ajouter de colonne.
- **Ne pas faire en V1** : pas de `ProtectedRoute` global sur toutes les routes, pas de migration `onboarding_status` (Option 3) ; à prévoir en V2 si besoin.

---

## 11. Référence des recherches (grep / ripgrep)

Fichiers pertinents identifiés :

| Terme | Fichiers |
|-------|----------|
| `signInWithOAuth` | `Register.tsx`, `Login.tsx` |
| `onAuthStateChange` | `AuthContext.tsx`, `use-auth-store.ts` |
| `getSession` / `setSession` | `AuthContext.tsx`, `Callback.tsx`, `use-auth-store.ts`, `profile.ts` (getUser) |
| `emailRedirectTo` / `redirectTo` | `Register.tsx`, `Login.tsx` |
| `SITE_URL` / `AUTH_CALLBACK_URL` | `src/lib/config.ts` |
| `auth/callback` | `App.tsx`, `Callback.tsx`, `config.ts`, `Register.tsx`, `Login.tsx` |
| `confirmed_at` / `email_confirmed` | Aucune occurrence (non utilisé) |
| `pending` | Surtout bookings/KYC/i18n ; pas pour onboarding user |
| `ProtectedRoute` / `RequireAuth` | Aucune occurrence |
| “Compléter mon profil” | Aucune occurrence exacte ; “Modifier mon profil” dans navbar → `/profile` |
| Redirection vers login | `Callback.tsx`, `Dashboard.tsx`, `OwnerBookings.tsx`, `VehicleDetails.tsx`, `MotoVehicleDetails.tsx`, `BookingDiscussion.tsx`, etc. |

---

**Fin du diagnostic.** Aucun fichier de prod n’a été modifié ; ce document sert de base pour implémenter la Onboarding Gate et les correctifs recommandés.
