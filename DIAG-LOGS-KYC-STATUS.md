# DIAGNOSTIC LOGS — kyc_status ne passe pas à verified

**Date** : 2026-02-11  
**Objectif** : Identifier si le blocage vient de SELECT, UPDATE, profil absent ou RLS

---

## 📝 LOGS AJOUTÉS

### Fichier : `src/pages/auth/Callback.tsx`

#### 1. Vérification user authentifié (après ligne 112)
```typescript
const { data: { user: authUser } } = await supabase.auth.getUser();
console.log("[AuthCallback] DIAG auth user:", {
  id: authUser?.id,
  email: authUser?.email,
  email_confirmed_at: authUser?.email_confirmed_at,
});
```

#### 2. Avant SELECT profiles (ligne 122)
```typescript
console.log("[AuthCallback] DIAG before SELECT profiles, userId:", userId);
```

#### 3. Après SELECT profiles (ligne 128)
```typescript
console.log("[AuthCallback] DIAG after SELECT profiles:", {
  profile: profile ? {
    kyc_status: profile.kyc_status,
    email: profile.email,
    first_name: profile.first_name,
    welcome_email_sent_at: profile.welcome_email_sent_at,
  } : null,
  fetchError: fetchError ? {
    code: fetchError.code,
    message: fetchError.message,
    details: fetchError.details,
    hint: fetchError.hint,
  } : null,
});
```

#### 4. Si profil absent ou erreur (ligne 138)
```typescript
console.error("[AuthCallback] Failed to fetch profile:", {
  fetchError,
  profileIsNull: !profile,
  errorCode: fetchError?.code,
  errorMessage: fetchError?.message,
  errorDetails: fetchError?.details,
});
```

#### 5. Avant UPDATE profiles (ligne 159)
```typescript
console.log("[AuthCallback] DIAG before UPDATE profiles: updating kyc_status to verified");
```

#### 6. Après UPDATE profiles (ligne 165)
```typescript
console.log("[AuthCallback] DIAG after UPDATE profiles:", {
  updateError: updateError ? {
    code: updateError.code,
    message: updateError.message,
    details: updateError.details,
    hint: updateError.hint,
  } : null,
});
```

#### 7. Si UPDATE échoue (ligne 173)
```typescript
console.error("[AuthCallback] UPDATE kyc_status FAILED:", {
  updateError,
  errorCode: updateError.code,
  errorMessage: updateError.message,
  errorDetails: updateError.details,
  errorHint: updateError.hint,
});
```

---

## 📊 SÉQUENCES DE LOGS ATTENDUES

### ✅ CAS 1 : SUCCÈS (tout fonctionne)

```
[AuthCallback] handleVerifiedUser called { userId: "abc-123", locked: false }
[AuthCallback] DIAG auth user: { id: "abc-123", email: "user@example.com", email_confirmed_at: "2026-02-11T..." }
[AuthCallback] DIAG before SELECT profiles, userId: abc-123
[AuthCallback] DIAG after SELECT profiles: {
  profile: {
    kyc_status: "pending",
    email: "user@example.com",
    first_name: "Jean",
    welcome_email_sent_at: null
  },
  fetchError: null
}
[AuthCallback] handleVerifiedUser lock set
[AuthCallback] DIAG before UPDATE profiles: updating kyc_status to verified
[AuthCallback] DIAG after UPDATE profiles: { updateError: null }
[AuthCallback] kyc_status updated to verified
[Welcome] sent
```

**Résultat DB** : `kyc_status = "verified"`, `welcome_email_sent_at` rempli

---

### ❌ CAS 2 : RLS BLOQUE SELECT

```
[AuthCallback] handleVerifiedUser called { userId: "abc-123", locked: false }
[AuthCallback] DIAG auth user: { id: "abc-123", email: "user@example.com", email_confirmed_at: "2026-02-11T..." }
[AuthCallback] DIAG before SELECT profiles, userId: abc-123
[AuthCallback] DIAG after SELECT profiles: {
  profile: null,
  fetchError: {
    code: "PGRST116",
    message: "The result contains 0 rows",
    details: null,
    hint: null
  }
}
[AuthCallback] Failed to fetch profile: {
  fetchError: { code: "PGRST116", message: "The result contains 0 rows", ... },
  profileIsNull: true,
  errorCode: "PGRST116",
  errorMessage: "The result contains 0 rows",
  errorDetails: null
}
```

**Résultat DB** : `kyc_status` reste `"pending"` (SELECT bloqué par RLS)

**Code erreur** : `PGRST116` = aucune ligne retournée (RLS ou profil absent)

---

### ❌ CAS 3 : PROFIL N'EXISTE PAS

```
[AuthCallback] handleVerifiedUser called { userId: "abc-123", locked: false }
[AuthCallback] DIAG auth user: { id: "abc-123", email: "user@example.com", email_confirmed_at: "2026-02-11T..." }
[AuthCallback] DIAG before SELECT profiles, userId: abc-123
[AuthCallback] DIAG after SELECT profiles: {
  profile: null,
  fetchError: {
    code: "PGRST116",
    message: "The result contains 0 rows",
    details: null,
    hint: null
  }
}
[AuthCallback] Failed to fetch profile: {
  fetchError: { code: "PGRST116", message: "The result contains 0 rows", ... },
  profileIsNull: true,
  errorCode: "PGRST116",
  errorMessage: "The result contains 0 rows",
  errorDetails: null
}
```

**Résultat DB** : Pas de ligne dans `profiles` pour cet `id`

**Note** : Identique au CAS 2 (impossible de distinguer RLS vs profil absent sans vérifier manuellement en DB)

---

### ❌ CAS 4 : RLS BLOQUE UPDATE

```
[AuthCallback] handleVerifiedUser called { userId: "abc-123", locked: false }
[AuthCallback] DIAG auth user: { id: "abc-123", email: "user@example.com", email_confirmed_at: "2026-02-11T..." }
[AuthCallback] DIAG before SELECT profiles, userId: abc-123
[AuthCallback] DIAG after SELECT profiles: {
  profile: {
    kyc_status: "pending",
    email: "user@example.com",
    first_name: "Jean",
    welcome_email_sent_at: null
  },
  fetchError: null
}
[AuthCallback] handleVerifiedUser lock set
[AuthCallback] DIAG before UPDATE profiles: updating kyc_status to verified
[AuthCallback] DIAG after UPDATE profiles: {
  updateError: {
    code: "42501",
    message: "new row violates row-level security policy for table \"profiles\"",
    details: null,
    hint: null
  }
}
[AuthCallback] UPDATE kyc_status FAILED: {
  updateError: { code: "42501", message: "new row violates row-level security policy...", ... },
  errorCode: "42501",
  errorMessage: "new row violates row-level security policy for table \"profiles\"",
  errorDetails: null,
  errorHint: null
}
```

**Résultat DB** : `kyc_status` reste `"pending"` (UPDATE bloqué par RLS)

**Code erreur** : `42501` = violation de RLS policy

---

### ❌ CAS 5 : USER NON AUTHENTIFIÉ

```
[AuthCallback] handleVerifiedUser called { userId: "abc-123", locked: false }
[AuthCallback] DIAG auth user: { id: null, email: null, email_confirmed_at: null }
[AuthCallback] DIAG before SELECT profiles, userId: abc-123
[AuthCallback] DIAG after SELECT profiles: {
  profile: null,
  fetchError: {
    code: "PGRST116",
    message: "The result contains 0 rows",
    details: null,
    hint: null
  }
}
[AuthCallback] Failed to fetch profile: { ... }
```

**Résultat** : User pas authentifié → RLS bloque tout

---

## 🔍 COMMANDES SQL DE VÉRIFICATION

### 1. Vérifier si RLS est activé sur `profiles`

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';
```

**Résultat attendu** :
- `rls_enabled = true` → RLS activé
- `rls_enabled = false` → RLS désactivé (pas de blocage possible)

---

### 2. Lister toutes les policies sur `profiles`

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**Colonnes importantes** :
- `policyname` : Nom de la policy
- `cmd` : Commande (`SELECT`, `UPDATE`, `INSERT`, `DELETE`, `ALL`)
- `roles` : Rôles concernés (`public`, `authenticated`, `anon`)
- `qual` : Condition USING (pour SELECT/UPDATE/DELETE)
- `with_check` : Condition WITH CHECK (pour INSERT/UPDATE)

---

### 3. Vérifier si un profil existe pour un user ID

```sql
SELECT 
  id,
  email,
  kyc_status,
  welcome_email_sent_at,
  created_at
FROM public.profiles
WHERE id = 'REMPLACER-PAR-USER-ID';
```

**Remplacer** `REMPLACER-PAR-USER-ID` par l'ID du log `[AuthCallback] DIAG auth user`

**Si aucune ligne** → Profil n'existe pas (pas encore créé)

---

### 4. Vérifier les policies SELECT sur `profiles`

```sql
SELECT 
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'profiles' 
  AND cmd IN ('SELECT', 'ALL')
ORDER BY policyname;
```

**Exemple de policy correcte** :
```sql
-- Policy qui autorise SELECT pour l'utilisateur authentifié
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
```

---

### 5. Vérifier les policies UPDATE sur `profiles`

```sql
SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' 
  AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;
```

**Exemple de policy correcte** :
```sql
-- Policy qui autorise UPDATE pour l'utilisateur authentifié
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

### 6. Tester manuellement SELECT en tant que user

```sql
-- Se connecter avec le JWT du user (via Supabase Dashboard SQL Editor)
-- Ou exécuter en tant que service_role pour bypasser RLS

SET ROLE authenticated;
SET request.jwt.claim.sub = 'REMPLACER-PAR-USER-ID';

SELECT 
  id,
  kyc_status
FROM public.profiles
WHERE id = 'REMPLACER-PAR-USER-ID';
```

**Si erreur** → RLS bloque SELECT

---

### 7. Tester manuellement UPDATE en tant que user

```sql
SET ROLE authenticated;
SET request.jwt.claim.sub = 'REMPLACER-PAR-USER-ID';

UPDATE public.profiles
SET kyc_status = 'verified'
WHERE id = 'REMPLACER-PAR-USER-ID';
```

**Si erreur** → RLS bloque UPDATE

---

## 🎯 INTERPRÉTATION DES RÉSULTATS

### Si `fetchError.code = "PGRST116"`

**Causes possibles** :
1. Profil n'existe pas (vérifier avec SQL #3)
2. RLS bloque SELECT (vérifier policies SQL #4)

**Action** :
- Exécuter SQL #3 pour vérifier si profil existe
- Si profil existe → RLS bloque SELECT
- Si profil n'existe pas → Problème de création du profil

---

### Si `updateError.code = "42501"`

**Cause** : RLS bloque UPDATE

**Action** :
- Vérifier policies UPDATE (SQL #5)
- Créer/corriger la policy UPDATE si nécessaire

---

### Si `profile.kyc_status = "verified"` dès le SELECT

**Cause** : Le profil est déjà vérifié (pas un bug)

**Log attendu** : `[AuthCallback] Already verified, checking welcome email`

---

### Si `authUser.id = null`

**Cause** : User pas authentifié

**Action** :
- Vérifier que le magic link est valide
- Vérifier que la session est bien créée

---

## 📋 CHECKLIST DE DIAGNOSTIC

### Étape 1 : Créer un compte et cliquer sur magic link

1. Ouvrir la console (F12)
2. Créer un compte via `/auth/register`
3. Cliquer sur le magic link
4. Copier TOUS les logs `[AuthCallback]`

---

### Étape 2 : Analyser les logs

- [ ] `DIAG auth user` → `id` et `email_confirmed_at` remplis ?
- [ ] `DIAG after SELECT profiles` → `profile` non-null ?
- [ ] `DIAG after SELECT profiles` → `fetchError` null ?
- [ ] `DIAG after UPDATE profiles` → `updateError` null ?

---

### Étape 3 : Vérifier en DB

```sql
-- Remplacer USER_ID par l'id du log "DIAG auth user"
SELECT id, email, kyc_status, welcome_email_sent_at
FROM public.profiles
WHERE id = 'USER_ID';
```

- [ ] Profil existe ?
- [ ] `kyc_status = "verified"` ?

---

### Étape 4 : Vérifier RLS

```sql
-- Vérifier si RLS activé
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- Lister policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
```

- [ ] RLS activé ?
- [ ] Policies SELECT et UPDATE existent ?

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester avec les nouveaux logs**
2. **Copier la séquence de logs complète**
3. **Identifier le cas correspondant** (CAS 1-5)
4. **Exécuter les commandes SQL** selon le cas
5. **Corriger la policy RLS** si nécessaire

---

**Diagnostic logs prêts pour tests !** ✅
