# Diagnostic rattrapage — Preuves runtime + règles onboarding (V1.1)

**Date :** 2026-02-10  
**Objectif :** Preuves console réelles pour "email confirmé" + règles "profil complet" par rôle (renter vs owner).  
**Contraintes :** Diagnostic uniquement. Logs `console.debug` temporaires ajoutés ; aucune refacto, redirection, flow, guard ou nouvelle page.

---

## 1. Email confirmé — Preuves runtime

### A. Logs obligatoires (format [AUTH_PROBE])

Des probes ont été ajoutées dans :

- **Callback.tsx** : au moment où une session est trouvée (`getSession` et `onAuthStateChange`), avec `where`, `href`, `params` (code, token_hash, type), et champs `user`.
- **AuthContext.tsx** : dans `getSession` initial et dans `onAuthStateChange`, même format.
- **ProfileService (profile.ts)** : après `getUser()` quand `authUser` existe, même format.

Chaque log a la forme :

```ts
[AUTH_PROBE] {
  where: "Callback|getSession" | "Callback|onAuthStateChange" | "AuthContext|getSession" | "AuthContext|onAuthStateChange" | "ProfileService|getUser",
  event?: string,  // uniquement pour onAuthStateChange
  href: string,
  params: { code: boolean, token_hash: boolean, type: string | null },
  user: {
    id, email, email_confirmed_at, confirmed_at,
    provider, providers, user_metadata
  }
}
```

### B. Comment collecter les 3 blocs de logs

1. **Cas 1 — email/password juste après `signUp` (avant clic lien)**  
   - Aller sur `/auth/register`, s’inscrire avec email + mot de passe.  
   - Après la redirection vers `/auth/login`, ouvrir une page qui appelle `ProfileService.getCurrentUserProfile()` (ex. aller sur `/profile` en étant déjà connecté si Supabase vous a connecté, ou vérifier si un log `ProfileService|getUser` apparaît au chargement).  
   - **Si l’utilisateur n’est pas encore connecté après signUp**, ce cas peut ne pas produire de log `[AUTH_PROBE]` avec un `user` (car pas de session). Dans ce cas, noter : « Pas de session après signUp (attendu) ».

2. **Cas 2 — email/password après clic sur le lien de confirmation**  
   - Cliquer sur le lien reçu par email (confirmation d’inscription).  
   - Vous devez arriver sur `/auth/callback` (avec éventuellement `token_hash`, `type=signup` dans l’URL).  
   - Dans la console : copier **tous** les logs `[AUTH_PROBE]` affichés (Callback et/ou AuthContext).

3. **Cas 3 — Google OAuth après login**  
   - Aller sur `/auth/login` (ou `/auth/register`), cliquer « Continuer avec Google », terminer le flux Google.  
   - Vous êtes redirigé vers `/auth/callback`.  
   - Dans la console : copier **tous** les logs `[AUTH_PROBE]` affichés.

Collez ci‑dessous les 3 blocs (un par cas) :

---

**Bloc 1 — email/password après signUp (avant clic lien)**  
```
(Collez ici les logs [AUTH_PROBE] ou notez "Pas de session après signUp")
```

**Bloc 2 — email/password après clic lien**  
```
(Collez ici les logs [AUTH_PROBE])
```

**Bloc 3 — Google OAuth après login**  
```
(Collez ici les logs [AUTH_PROBE])
```

---

### C. Tableau « champ dispo / valeur / flow » (à remplir après collecte)

À compléter avec les valeurs **réelles** observées dans les logs :

| Champ / flow                         | email/pass avant clic | email/pass après clic | Google OAuth |
|-------------------------------------|------------------------|------------------------|--------------|
| `user.email_confirmed_at`           | ?                      | ?                      | ?            |
| `user.confirmed_at`                 | ?                      | ?                      | ?            |
| `user.app_metadata.provider`        | ?                      | ?                      | ?            |
| `params.type` (sur callback)        | —                      | ?                      | ?            |
| `params.token_hash`                 | —                      | ?                      | ?            |

### D. Réponses attendues (à valider avec vos logs)

- **Est-ce que `email_confirmed_at` existe vraiment chez nous ?**  
  Supabase expose `email_confirmed_at` sur l’objet `User` (session.user). Si vos logs montrent une clé `email_confirmed_at` (même `null`), la réponse est oui.

- **Est-ce que Google a `email_confirmed_at` non-null ?**  
  En général oui : pour OAuth, Supabase considère l’email vérifié par le provider, donc `email_confirmed_at` est renseigné dès le premier login.

- **Si `email_confirmed_at` absent : quel champ à la place ?**  
  Fallback possible : considérer « email confirmé » dès qu’une session valide existe (`user.id` présent), avec la limite de ne plus distinguer « inscrit non confirmé » de « confirmé » pour l’email/password.

### E. Recommandation V1 du champ à utiliser

- **Champ recommandé :** `user.email_confirmed_at` (via `session.user` ou `authUser` dans ProfileService).
- **Critère :** `Boolean(user.email_confirmed_at)` → email confirmé si non-null (string ISO), sinon non confirmé.
- **Fallback si indisponible :** considérer confirmé dès que `session?.user?.id` est présent (limite : pas de distinction signup non confirmé / confirmé pour email/password).

---

## 2. Profil complet — Par rôle (renter vs owner)

### A. Où le rôle est décidé

- **Source de vérité :** table `public.profiles`, colonne `role` (`'renter' | 'owner' | 'admin'`).
- **Mapping front :** `ProfileService.getCurrentUserProfile()` lit `profile.role` et expose `user.roles` (tableau) : `roles: profile.role ? [profile.role] : ['renter']`.
- **Guards owner existants :**
  - **OwnerBookings.tsx** (l.100–124) : `ProfileService.getCurrentUserProfile()` puis `if (!user.roles.includes('owner')) { toast "Accès refusé"; navigate('/'); }`.
  - **Dashboard.tsx** (l.50–59) : besoin d’un profil valide pour charger les stats ; pas de check explicite `owner` mais la page est dans les routes owner.
  - **OwnerVehicles.tsx** (l.183–196) : `getCurrentUserProfile()` ; si pas de `currentUser` → « Accès refusé » + lien login. Puis (l.328–354) : si `currentUser.kycStatus !== "verified"` → bandeau « Vérification KYC requise » (pas de blocage de route, juste message).
  - **Navbar** : `userProfile.roles.includes("owner")` / `"renter"` pour afficher Dashboard / « Mes véhicules » / « Mes réservations ».

Aucune logique centralisée « profil complet » n’existe aujourd’hui ; les blocages sont : session absente → login, pas owner → home (OwnerBookings), KYC non vérifié → message sur OwnerVehicles.

### B. Features bloquantes par rôle (existant)

- **Renter**
  - **Réservation :** téléphone requis. Dans `VehicleDetails.tsx` / `MotoVehicleDetails.tsx`, si le profil n’a pas de `phone`, une modal « Numéro de téléphone requis » s’ouvre avant de pouvoir continuer la réservation. Donc **champ bloquant réel :** `phone`.
  - Nom / prénom : utilisés partout (affichage, messages, EDL) ; pas de blocage explicite « sans prénom pas de réservation », mais nécessaires pour une expérience cohérente → **recommandation V1 :** `firstName`, `lastName`, `phone` pour « profil renter complet ».

- **Owner**
  - **Accès dashboard / véhicules :** pas de check « profil owner complet » ; seul le rôle `owner` et un profil chargé sont requis.
  - **Publier / proposer véhicules :** dans **OwnerVehicles.tsx**, si `kycStatus !== "verified"`, un bandeau indique « Vérification KYC requise - Pour publier vos véhicules, vous devez compléter votre vérification d'identité ». Donc **KYC vérifié** est une exigence métier pour « publier » (pas un blocage de route).
  - **RentMyCarRegister** : formulaire propriétaire avec beaucoup de champs (véhicule + identité). Les champs « identité » recoupent le profil (first_name, last_name, email, phone, city, etc.). Pour un owner existant, le produit s’appuie sur le profil pour pré-remplir.

Donc en V1 :

- **Renter :** champs minimum pour réserver sans blocage = **firstName, lastName, phone** (aligné sur la seule contrainte explicite actuelle : téléphone pour réservation + identité minimale).
- **Owner :** champs minimum pour utiliser le dashboard sans être bloqué plus tard = même base que renter (**firstName, lastName, phone**) + pour « publier des véhicules » le produit affiche déjà une exigence **KYC vérifié**. On peut donc en V1 définir « owner profile complete » = mêmes champs que renter + **kyc_status === 'verified'** (optionnel selon que vous vouliez bloquer l’onboarding ou seulement afficher l’étape KYC).

### C. Champs requis V1 (résumé)

| Rôle   | Champs requis V1 (profil complet)     | Commentaire |
|--------|----------------------------------------|-------------|
| renter | `firstName`, `lastName`, `phone`       | Téléphone requis pour réserver ; nom/prénom pour affichage et EDL. |
| owner  | `firstName`, `lastName`, `phone`      | Idem pour accès dashboard / formulaire. |
| owner  | + `kyc_status === 'verified'`         | Pour « publier véhicules » (déjà exigé en UI sur OwnerVehicles). |

Les champs sont ceux de `public.profiles` / `User` côté app : `first_name` → `firstName`, `last_name` → `lastName`, `phone`, `kyc_status` → `kycStatus`.

### D. Pseudo-code des 3 fonctions

```ts
// Règle V1 : renter peut réserver sans blocage si nom, prénom, téléphone renseignés.
function isRenterProfileComplete(profile: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}): boolean {
  const hasName =
    !!profile.firstName?.trim() && !!profile.lastName?.trim();
  const hasPhone = !!profile.phone?.trim();
  return hasName && hasPhone;
}

// Règle V1 : owner peut utiliser le dashboard ; pour "publier" on exige en plus KYC vérifié.
function isOwnerProfileComplete(profile: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  kycStatus?: string | null;
}): boolean {
  const base = isRenterProfileComplete(profile);
  const kycVerified = profile.kycStatus === "verified";
  return base && kycVerified;
}

// Route-agnostic : retourne la liste des champs manquants pour l'onboarding.
function getOnboardingMissing(
  profile: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    kycStatus?: string | null;
  },
  role: "renter" | "owner" | "admin"
): string[] {
  const missing: string[] = [];
  if (!profile.firstName?.trim()) missing.push("firstName");
  if (!profile.lastName?.trim()) missing.push("lastName");
  if (!profile.phone?.trim()) missing.push("phone");
  if ((role === "owner" || role === "admin") && profile.kycStatus !== "verified") {
    missing.push("kycVerified"); // ou "kyc_status" selon convention
  }
  return missing;
}
```

Ces règles s’appuient sur les champs existants dans `profiles`, sur l’UI actuelle (Profile.tsx, VehicleDetails/MotoVehicleDetails pour le téléphone, OwnerVehicles pour le KYC) et n’introduisent pas de nouvelle redirection ni de guard.

---

## 3. Fichiers où des logs ont été ajoutés (TEMP LOG)

| Fichier | Lignes exactes | Description |
|---------|----------------|-------------|
| **src/pages/auth/Callback.tsx** | 16–28 (helper `getUrlParams`), 96–108 (log dans `tryGetSession`), 162–176 (log dans `onAuthStateChange`). | TEMP LOG — AUTH_PROBE (diagnostic onboarding V1.1) |
| **src/contexts/AuthContext.tsx** | 20–52 (helper `getUrlParams`, fonction `logAuthProbe`), 56 (appel dans `onAuthStateChange`), 65 (appel dans `getSession().then`). | TEMP LOG — AUTH_PROBE (diagnostic onboarding V1.1) |
| **src/services/supabase/profile.ts** | 38–69 (bloc après `getUser()` : construction params + `console.debug("[AUTH_PROBE]", …)`). | TEMP LOG — AUTH_PROBE (diagnostic onboarding V1.1) |

À retirer ou désactiver une fois la collecte des 3 blocs de logs et la validation du tableau terminées.

---

## Suite prévue

Une fois les 3 blocs de logs collés et le tableau rempli :

1. Création de la page **/onboarding** (UI statique — step 1).  
2. Brancher la détection **email confirmé** + **profil complet** (renter/owner) sur cette page.  
3. Ajuster les redirections Register/Callback vers `/onboarding` si besoin (étapes suivantes).

**Rappel :** Aucune redirection, flow, guard ou nouvelle page n’a été modifié ou créé dans ce diagnostic ; uniquement des logs temporaires.
