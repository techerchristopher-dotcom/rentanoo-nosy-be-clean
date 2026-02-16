# FIX — kyc_status reste pending (race condition hasRunRef)

**Date** : 2026-02-11  
**Statut** : ✅ Fix appliqué  
**Problème** : `hasRunRef` verrouillé trop tôt, empêchant retry si profil absent

---

## 🎯 PROBLÈME IDENTIFIÉ

### Comportement bugué (AVANT)

```typescript
const handleVerifiedUser = async (userId: string) => {
  if (hasRunRef.current) return;
  hasRunRef.current = true; // ❌ VERROUILLÉ TROP TÔT

  const { data: profile, error: fetchError } = await supabase...
  if (fetchError || !profile) {
    return; // ❌ Lock déjà activé, pas de retry possible
  }
  // ...
}
```

**Scénario problématique** :
1. `onAuthStateChange` se déclenche en premier
2. Appelle `handleVerifiedUser`
3. `hasRunRef.current = true` ✅
4. Fetch profile échoue (profil pas encore créé)
5. Early return
6. `tryGetSession` trouve la session plus tard
7. Appelle `handleVerifiedUser`
8. **SKIP** car `hasRunRef.current === true` ❌
9. **Résultat** : `kyc_status` reste `"pending"`

---

## ✅ SOLUTION APPLIQUÉE

### Comportement corrigé (APRÈS)

```typescript
const handleVerifiedUser = async (userId: string) => {
  console.log("[AuthCallback] handleVerifiedUser called", { userId, locked: hasRunRef.current });

  if (hasRunRef.current) return;

  const { data: profile, error: fetchError } = await supabase...
  if (fetchError || !profile) {
    return; // ✅ Pas de lock, retry possible
  }

  // ✅ VERROUILLÉ APRÈS FETCH RÉUSSI
  console.log("[AuthCallback] handleVerifiedUser lock set");
  hasRunRef.current = true;

  // Suite du traitement...
}
```

**Nouveau comportement** :
1. `onAuthStateChange` se déclenche en premier
2. Appelle `handleVerifiedUser`
3. Fetch profile échoue (profil pas encore créé)
4. Early return **SANS activer le lock** ✅
5. `tryGetSession` trouve la session plus tard
6. Appelle `handleVerifiedUser`
7. Fetch profile réussit
8. `hasRunRef.current = true` ✅
9. Update `kyc_status = "verified"` ✅

---

## 📝 MODIFICATIONS EFFECTUÉES

### Fichier : `src/pages/auth/Callback.tsx`

#### Changement 1 : Ajout log d'entrée (ligne 112)

```diff
+ console.log("[AuthCallback] handleVerifiedUser called", { userId, locked: hasRunRef.current });
+
  // Anti-doublon: prevent double execution
  if (hasRunRef.current) {
```

**Objectif** : Tracer chaque appel et voir si le lock est déjà activé

---

#### Changement 2 : Déplacement du lock (ligne 117 → ligne 134)

```diff
  if (hasRunRef.current) {
    console.log("[AuthCallback] Already processed, skipping");
    return;
  }
- hasRunRef.current = true;

  try {
    // 1. Fetch profile to check current state
    const { data: profile, error: fetchError } = await supabase...

    if (fetchError || !profile) {
      console.error("[AuthCallback] Failed to fetch profile:", fetchError);
-     return;
+     return; // Don't lock, allow retry
    }

+   // Lock after successful profile fetch
+   console.log("[AuthCallback] handleVerifiedUser lock set");
+   hasRunRef.current = true;
```

**Objectif** : Ne verrouiller qu'après un fetch profile réussi

---

#### Changement 3 : Ajout log de verrouillage (ligne 133)

```diff
+ console.log("[AuthCallback] handleVerifiedUser lock set");
+ hasRunRef.current = true;
```

**Objectif** : Confirmer que le lock est bien activé après fetch réussi

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Nouveau signup (profil créé immédiatement)

**Scénario** :
1. Créer un compte via `/auth/register`
2. Cliquer sur le magic link
3. Ouvrir la console (F12)

**Logs attendus** :
```
[AuthCallback] handleVerifiedUser called { userId: "...", locked: false }
[AuthCallback] handleVerifiedUser lock set
[AuthCallback] kyc_status updated to verified
```

**Résultat attendu** :
- ✅ `kyc_status = "verified"` en DB
- ✅ Pas de log "Already processed, skipping"

---

### Test 2 : Profil créé avec délai (race condition)

**Scénario** :
1. Créer un compte
2. Supprimer le profil en DB (simuler race condition)
3. Cliquer sur le magic link
4. Recréer le profil manuellement après 1-2 secondes

**Logs attendus** :
```
[AuthCallback] handleVerifiedUser called { userId: "...", locked: false }
[AuthCallback] Failed to fetch profile: ...
[AuthCallback] handleVerifiedUser called { userId: "...", locked: false }
[AuthCallback] handleVerifiedUser lock set
[AuthCallback] kyc_status updated to verified
```

**Résultat attendu** :
- ✅ Premier appel échoue SANS verrouiller
- ✅ Deuxième appel réussit et verrouille
- ✅ `kyc_status = "verified"` en DB

---

### Test 3 : Double clic sur magic link (anti-doublon)

**Scénario** :
1. Créer un compte et confirmer
2. Cliquer à nouveau sur le magic link

**Logs attendus** :
```
[AuthCallback] handleVerifiedUser called { userId: "...", locked: false }
[AuthCallback] handleVerifiedUser lock set
[AuthCallback] Already verified, checking welcome email
```

**Résultat attendu** :
- ✅ Lock activé après fetch réussi
- ✅ Update skippé car déjà `verified`
- ✅ Welcome email vérifié

---

## 📊 DIFF RÉSUMÉ

| Ligne | Avant | Après |
|-------|-------|-------|
| 112 | - | `console.log("[AuthCallback] handleVerifiedUser called", ...)` |
| 117 | `hasRunRef.current = true;` | (supprimé) |
| 130 | `return;` | `return; // Don't lock, allow retry` |
| 133-134 | - | `console.log("[AuthCallback] handleVerifiedUser lock set");`<br>`hasRunRef.current = true;` |

**Total** : +4 lignes, -1 ligne

---

## ✅ VALIDATION

### Comportement garanti

| Scénario | Avant (bugué) | Après (fixé) |
|----------|---------------|--------------|
| Profil absent au 1er appel | Lock activé → pas de retry → `kyc_status` reste `pending` | Pas de lock → retry possible → `kyc_status` devient `verified` |
| Profil présent au 1er appel | Lock activé → update OK | Lock activé → update OK |
| Double appel avec profil présent | Lock activé au 1er → 2ème skippé | Lock activé au 1er → 2ème skippé |

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester en local** : Suivre la checklist de tests ci-dessus
2. **Vérifier les logs** : Confirmer que le lock est activé au bon moment
3. **Commit + Push** : Si tests OK
4. **Tester en prod** : Créer un nouveau compte et vérifier `kyc_status`

---

**Fix appliqué et prêt pour tests !** ✅
