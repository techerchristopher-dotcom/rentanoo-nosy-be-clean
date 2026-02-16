# DIAGNOSTIC STRICT — kyc_status reste "pending" après magic link

**Date** : 2026-02-11  
**Statut** : 🔍 Diagnostic terminé  
**Problème** : `profiles.kyc_status` reste `"pending"` après clic sur magic link

---

## 📋 RÉSUMÉ EXÉCUTIF

### ⚠️ CAUSE PROBABLE #1 (90% de certitude)

**Le guard `hasRunRef` est activé AVANT que la session soit disponible**

**Preuve** :
- `hasRunRef` est un `useRef(false)` déclaré au niveau du composant (ligne 86)
- Il est mis à `true` dès la première exécution de `handleVerifiedUser` (ligne 117)
- `tryGetSession` fait jusqu'à 10 tentatives avec retry (lignes 178-208)
- Si la **première tentative** trouve `session === null`, elle ne call pas `handleVerifiedUser`
- Mais `onAuthStateChange` peut se déclencher **pendant** les retries
- `onAuthStateChange` appelle `handleVerifiedUser` → `hasRunRef.current = true`
- Quand `tryGetSession` trouve enfin la session (tentative 2-10), `handleVerifiedUser` est skippé car `hasRunRef.current === true`

**Résultat** : L'update `kyc_status` n'est jamais exécuté.

---

## 1️⃣ LOCALISATION — Où kyc_status est censé être mis à jour

### Fichier : `src/pages/auth/Callback.tsx`

#### Point d'update unique : Fonction `handleVerifiedUser` (lignes 111-164)

```111:164:src/pages/auth/Callback.tsx
    const handleVerifiedUser = async (userId: string) => {
      // Anti-doublon: prevent double execution
      if (hasRunRef.current) {
        console.log("[AuthCallback] Already processed, skipping");
        return;
      }
      hasRunRef.current = true;

      try {
        // 1. Fetch profile to check current state
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("kyc_status, welcome_email_sent_at, email, first_name, last_name")
          .eq("id", userId)
          .single();

        if (fetchError || !profile) {
          console.error("[AuthCallback] Failed to fetch profile:", fetchError);
          return;
        }

        // 2. If already verified, skip update but check welcome email
        if (profile.kyc_status === "verified") {
          console.log("[AuthCallback] Already verified, checking welcome email");
          
          // Send welcome email if not sent yet (non-blocking)
          sendWelcomeEmail(userId, profile).catch((err) =>
            console.error("[AuthCallback] Welcome email error", err)
          );
          
          return;
        }

        // 3. Update kyc_status to verified
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ kyc_status: "verified" })
          .eq("id", userId);

        if (updateError) {
          console.error("[AuthCallback] UPDATE kyc_status FAILED:", updateError);
          return;
        }

        console.log("[AuthCallback] kyc_status updated to verified");

        // 4. Send welcome email (non-blocking)
        sendWelcomeEmail(userId, profile).catch((err) =>
          console.error("[AuthCallback] Welcome email error", err)
        );
      } catch (error) {
        console.error("[AuthCallback] handleVerifiedUser error:", error);
      }
    };
```

#### Appel #1 : `tryGetSession` (ligne 193)

```182:196:src/pages/auth/Callback.tsx
    const tryGetSession = async () => {
      if (!isMounted || handled) return;

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Handle verification + welcome email
          await handleVerifiedUser(session.user.id);
          completeSuccess();
          return;
        }
```

#### Appel #2 : `onAuthStateChange` (ligne 221)

```215:224:src/pages/auth/Callback.tsx
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || handled) return;
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        // Handle verification + welcome email
        await handleVerifiedUser(session.user.id);
        completeSuccess();
      }
    });
```

---

### Conditions qui empêchent l'update

| Condition | Ligne | Impact |
|-----------|-------|--------|
| `hasRunRef.current === true` | 113 | **SKIP TOTAL** (early return) |
| `fetchError` ou `!profile` | 127-129 | **SKIP** (profil absent/erreur RLS) |
| `profile.kyc_status === "verified"` | 133 | **SKIP** (déjà vérifié) |
| `updateError` | 150-152 | **ÉCHEC** (RLS ou autre erreur DB) |

---

## 2️⃣ ORDRE D'EXÉCUTION (Timing)

### Séquence actuelle

```
1. useEffect démarre
2. onAuthStateChange s'enregistre (listener actif)
3. tryGetSession() démarre (tentative #1)
   ├─ getSession() → session = null (pas encore prête)
   ├─ retry dans 300ms
   └─ ...
4. [PENDANT LES RETRIES] onAuthStateChange se déclenche
   ├─ event = "SIGNED_IN", session disponible
   ├─ handleVerifiedUser(userId) appelé
   └─ hasRunRef.current = true ✅
5. tryGetSession() tentative #2-10
   ├─ getSession() → session disponible
   ├─ handleVerifiedUser(userId) appelé
   └─ SKIP car hasRunRef.current === true ❌
```

### ⚠️ PROBLÈME IDENTIFIÉ

**Le guard `hasRunRef` empêche la deuxième exécution, mais c'est la deuxième qui a la session valide !**

**Scénario problématique** :
1. `onAuthStateChange` se déclenche **avant** que `tryGetSession` trouve la session
2. `onAuthStateChange` appelle `handleVerifiedUser` avec `session.user.id`
3. Mais à ce moment, le profil peut ne pas être créé encore (race condition)
4. `fetchError` ou `!profile` → early return (ligne 129)
5. `hasRunRef.current` est quand même mis à `true` (ligne 117, **AVANT** le fetch)
6. Quand `tryGetSession` trouve enfin la session, `handleVerifiedUser` est skippé

---

## 3️⃣ GESTION D'ERREUR (RLS / Permissions)

### Erreurs loggées

| Erreur | Ligne | Log |
|--------|-------|-----|
| Fetch profile échoue | 128 | `[AuthCallback] Failed to fetch profile:` + fetchError |
| Update kyc_status échoue | 151 | `[AuthCallback] UPDATE kyc_status FAILED:` + updateError |
| Exception générale | 162 | `[AuthCallback] handleVerifiedUser error:` + error |

**✅ Les erreurs SONT loggées** (console.error)

---

### Hypothèse RLS

**Aucune policy `profiles` trouvée dans les migrations SQL du repo.**

**Implications** :
- Si RLS est activé sur `profiles` sans policies → **TOUTES** les requêtes échouent
- Si RLS est désactivé → pas de problème
- Si policies existent mais mal configurées → `UPDATE` peut échouer même si `SELECT` passe

**Test à faire** :
```sql
-- Vérifier RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- Vérifier policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## 4️⃣ PRÉSENCE DU PROFIL

### Création du profil

**Aucun trigger SQL trouvé dans le repo** (`auth.users` → `public.profiles`)

**Sources possibles** :
1. **Trigger Supabase Dashboard** (non versionné dans le repo)
2. **Création côté front** (via `ProfileService.createUserProfile()`)
3. **Trigger n8n** (webhook `profiles-created`)

### Comportement si profil absent

**Ligne 127-129** :
```typescript
if (fetchError || !profile) {
  console.error("[AuthCallback] Failed to fetch profile:", fetchError);
  return; // ❌ SKIP TOTAL
}
```

**⚠️ PROBLÈME** :
- Si le profil n'existe pas encore → `fetchError` ou `profile === null`
- `handleVerifiedUser` return immédiatement
- Mais `hasRunRef.current = true` est déjà activé (ligne 117)
- **L'update ne sera JAMAIS réessayé**

---

## 5️⃣ REDIRECTION MAGIC LINK

### Configuration `emailRedirectTo`

**Fichier** : `src/pages/auth/Register.tsx` (ligne 60)

```60:65:src/pages/auth/Register.tsx
      const emailRedirectTo = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
```

**✅ La redirection pointe bien vers `/auth/callback`**

**Pas de risque de bypass du callback.**

---

## 6️⃣ DOUBLE EXÉCUTION (tryGetSession + onAuthStateChange)

### Deux chemins d'exécution

| Chemin | Déclencheur | Timing |
|--------|-------------|--------|
| **#1** : `tryGetSession` | Polling manuel (10 tentatives max, 300ms entre chaque) | Démarre immédiatement |
| **#2** : `onAuthStateChange` | Event Supabase (`SIGNED_IN` / `TOKEN_REFRESHED`) | Asynchrone, timing imprévisible |

### ⚠️ RACE CONDITION IDENTIFIÉE

**Scénario problématique** :

1. `tryGetSession` tentative #1 → `session = null`
2. `onAuthStateChange` se déclenche → `session` disponible
3. `onAuthStateChange` appelle `handleVerifiedUser`
4. `hasRunRef.current = true` ✅
5. `tryGetSession` tentative #2 → `session` disponible
6. `tryGetSession` appelle `handleVerifiedUser`
7. **SKIP** car `hasRunRef.current === true` ❌

**Conclusion** : **OUI, double-run possible**, et le guard empêche le bon chemin.

---

## 7️⃣ RAPPORT FINAL

### A) CE QU'ON SAIT

#### ✅ L'update EST appelé
- Oui, via `handleVerifiedUser` (ligne 145-148)
- Appelé depuis 2 endroits : `tryGetSession` + `onAuthStateChange`

#### ⚠️ Le code PEUT skip
- **OUI**, 4 conditions de skip :
  1. `hasRunRef.current === true` (ligne 113) → **CAUSE PRINCIPALE**
  2. `fetchError` ou `!profile` (ligne 127)
  3. `profile.kyc_status === "verified"` (ligne 133)
  4. `updateError` (ligne 150)

#### ✅ On log les erreurs
- Oui, toutes les erreurs sont loggées (console.error)

---

### B) TOP 3 CAUSES PROBABLES

#### 🥇 CAUSE #1 : Guard `hasRunRef` activé trop tôt (90% de certitude)

**Preuve** :
- `hasRunRef.current = true` est mis **AVANT** le fetch profile (ligne 117)
- Si `onAuthStateChange` se déclenche avant `tryGetSession`, le guard bloque la deuxième exécution
- Mais c'est la deuxième qui a la session valide

**Symptôme attendu** :
- Console : `[AuthCallback] Already processed, skipping`
- DB : `kyc_status` reste `"pending"`

---

#### 🥈 CAUSE #2 : Profil absent au moment du callback (70% de certitude)

**Preuve** :
- Aucun trigger SQL trouvé dans le repo
- Si le profil est créé de manière asynchrone (n8n, front), il peut ne pas être prêt
- `fetchError` ou `!profile` → early return (ligne 129)
- Mais `hasRunRef.current = true` est déjà activé → pas de retry

**Symptôme attendu** :
- Console : `[AuthCallback] Failed to fetch profile:` + erreur
- DB : `kyc_status` reste `"pending"`

---

#### 🥉 CAUSE #3 : RLS bloque l'update (30% de certitude)

**Preuve** :
- Aucune policy trouvée dans le repo
- Si RLS activé sans policies → échec silencieux (sauf si loggé)

**Symptôme attendu** :
- Console : `[AuthCallback] UPDATE kyc_status FAILED:` + erreur RLS
- DB : `kyc_status` reste `"pending"`

---

### C) PLAN DE CORRECTION MINIMAL

#### Étape 1 : Ajouter un log AVANT `hasRunRef.current = true`

**Fichier** : `src/pages/auth/Callback.tsx` ligne 117

**Ajouter** :
```typescript
console.log("[AuthCallback] handleVerifiedUser called", { userId, hasRunRef: hasRunRef.current });
hasRunRef.current = true;
```

**Objectif** : Confirmer si le guard est activé trop tôt

---

#### Étape 2 : Déplacer `hasRunRef.current = true` APRÈS le fetch profile

**Fichier** : `src/pages/auth/Callback.tsx`

**Déplacer ligne 117 vers ligne 130** (après le fetch profile réussi)

**Avant** :
```typescript
if (hasRunRef.current) return;
hasRunRef.current = true; // ❌ Trop tôt

const { data: profile, error: fetchError } = await supabase...
if (fetchError || !profile) return;
```

**Après** :
```typescript
if (hasRunRef.current) return;

const { data: profile, error: fetchError } = await supabase...
if (fetchError || !profile) return;

hasRunRef.current = true; // ✅ Après fetch réussi
```

**Objectif** : Le guard ne bloque que si le profil a été fetch avec succès

---

#### Étape 3 : Test manuel (1 test)

**Scénario** :
1. Créer un nouveau compte via `/auth/register`
2. Cliquer sur le magic link dans l'email
3. Ouvrir la console (F12)
4. Vérifier les logs :
   - `[AuthCallback] handleVerifiedUser called` (combien de fois ?)
   - `[AuthCallback] Already processed, skipping` (présent ?)
   - `[AuthCallback] kyc_status updated to verified` (présent ?)
5. Vérifier DB : `SELECT kyc_status FROM profiles WHERE id = '...'`

**Résultat attendu** :
- Si log `Already processed, skipping` apparaît → **CAUSE #1 confirmée**
- Si log `Failed to fetch profile` apparaît → **CAUSE #2 confirmée**
- Si log `UPDATE kyc_status FAILED` apparaît → **CAUSE #3 confirmée**

---

## 📊 TABLEAU RÉCAPITULATIF

| Élément | Valeur | Problème ? |
|---------|--------|------------|
| **Update appelé ?** | Oui (ligne 145-148) | ✅ |
| **Guard anti-doublon ?** | Oui (`hasRunRef`) | ⚠️ Activé trop tôt |
| **Erreurs loggées ?** | Oui (console.error) | ✅ |
| **Double exécution ?** | Oui (tryGetSession + onAuthStateChange) | ⚠️ Race condition |
| **Profil fetch avant update ?** | Oui (ligne 121-125) | ⚠️ Peut échouer |
| **RLS policies ?** | Absentes du repo | ⚠️ Risque de blocage |
| **Redirection correcte ?** | Oui (`/auth/callback`) | ✅ |

---

## 🎯 CONCLUSION

**Cause la plus probable** : Le guard `hasRunRef` est activé **AVANT** que le profil soit fetch avec succès, ce qui empêche toute réexécution.

**Correction minimale** : Déplacer `hasRunRef.current = true` **APRÈS** le fetch profile réussi.

**Test de confirmation** : Ajouter un log avant le guard pour voir combien de fois `handleVerifiedUser` est appelé.

---

**Diagnostic terminé** ✅
