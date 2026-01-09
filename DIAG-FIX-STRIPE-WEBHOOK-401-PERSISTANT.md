# 🔍 DIAGNOSTIC + FIX MINIMAL — Stripe Webhook 401 Persistant

> **Date** : 2025-01-27  
> **Problème** : `stripe-webhook` renvoie toujours `401 Missing authorization header` même après `verify_jwt = false` dans config locale + redeploy

---

## A) DIAGNOSTIC — Cause racine du 401 persistant

### Problème identifié

**La configuration locale `supabase/functions/stripe-webhook/config.toml` n'est pas prise en compte par Supabase CLI lors du déploiement.**

### Explication technique

Selon la documentation Supabase et les pratiques observées :

1. **Configuration globale prioritaire** : La configuration dans `supabase/config.toml` (racine) est la source de vérité pour toutes les Edge Functions.

2. **Configuration locale ignorée** : Le fichier `supabase/functions/stripe-webhook/config.toml` (local) peut être ignoré ou non pris en compte selon la version de Supabase CLI et la configuration globale.

3. **Comportement par défaut** : Si aucune configuration n'est présente dans `supabase/config.toml` pour une fonction spécifique, Supabase applique `verify_jwt = true` par défaut.

### Fichiers concernés

**Avant le fix :**
- ✅ `supabase/functions/stripe-webhook/config.toml` → `verify_jwt = false` (non pris en compte)
- ❌ `supabase/config.toml` → Pas de section `[functions.stripe-webhook]` (donc `verify_jwt = true` par défaut)

**Résultat :** La fonction reste protégée par JWT malgré la config locale.

---

## B) FIX MINIMAL — Configuration globale

### Modification appliquée

**Fichier :** `supabase/config.toml`

**Ajout :**
```toml
[functions.stripe-webhook]
verify_jwt = false
```

**Contenu final :**
```toml
project_id = "tbsgzykqcksmqxpimwry"

[functions.stripe-webhook]
verify_jwt = false
```

### Pourquoi ce fix fonctionne

- La configuration globale `supabase/config.toml` est **toujours** prise en compte lors du déploiement
- Cette configuration est appliquée **uniquement** à la fonction `stripe-webhook`
- Les autres fonctions ne sont pas affectées (pas de changement global)

---

## C) FIX MINIMAL — Warning de build

### Problème identifié

**Warning lors du déploiement :**
```
failed to read file: open supabase/src/utils/serviceFees.ts: no such file or directory
```

### Cause racine

L'Edge Function `stripe-webhook` tentait d'importer un fichier depuis `../../src/utils/serviceFees.ts` :

```typescript
const serviceFeesModule = await import("../../src/utils/serviceFees.ts");
```

**Problème :** Lors du déploiement, Supabase CLI ne copie **pas** le dossier `src/` dans le contexte de build de l'Edge Function. Les Edge Functions ont leur propre contexte d'exécution isolé et ne peuvent pas accéder aux fichiers du projet frontend.

### Fix appliqué

**Fichier :** `supabase/functions/stripe-webhook/index.ts`

**Remplacement :** Import dynamique → Fonctions inline (logique minimale nécessaire)

**Avant (lignes 160-176) :**
```typescript
// Import du module serviceFees (chemin relatif depuis supabase/functions/)
const serviceFeesModule = await import("../../src/utils/serviceFees.ts");
const { 
  calcServiceFeeRenter, 
  calcServiceFeeOwner, 
  calcOwnerPayout, 
  calcPlatformTotalFee,
  validateFeeCalculations
} = serviceFeesModule;
const serviceFeeRenter = calcServiceFeeRenter(commissionBase);
const serviceFeeOwner = calcServiceFeeOwner(commissionBase);
const ownerPayoutAmount = calcOwnerPayout(commissionBase);
const platformTotalFee = calcPlatformTotalFee(commissionBase);

// Self-check DEV-only
validateFeeCalculations(commissionBase, serviceFeeRenter, serviceFeeOwner, platformTotalFee);
```

**Après (lignes 160-180) :**
```typescript
// 15% locataire / 15% propriétaire
// Fonctions de calcul des fees (inline pour éviter import externe)
const SERVICE_FEE_PERCENT_RENTER = 0.15;
const SERVICE_FEE_PERCENT_OWNER = 0.15;

function calcServiceFeeRenter(subtotal: number): number {
  return Math.round(subtotal * SERVICE_FEE_PERCENT_RENTER * 100) / 100;
}

function calcServiceFeeOwner(subtotal: number): number {
  return Math.round(subtotal * SERVICE_FEE_PERCENT_OWNER * 100) / 100;
}

function calcOwnerPayout(subtotal: number): number {
  const serviceFee = calcServiceFeeOwner(subtotal);
  return Math.round((subtotal - serviceFee) * 100) / 100;
}

function calcPlatformTotalFee(subtotal: number): number {
  const renterFee = calcServiceFeeRenter(subtotal);
  const ownerFee = calcServiceFeeOwner(subtotal);
  return Math.round((renterFee + ownerFee) * 100) / 100;
}

const serviceFeeRenter = calcServiceFeeRenter(commissionBase);
const serviceFeeOwner = calcServiceFeeOwner(commissionBase);
const ownerPayoutAmount = calcOwnerPayout(commissionBase);
const platformTotalFee = calcPlatformTotalFee(commissionBase);
```

### Changements

- ✅ Suppression de l'import dynamique vers `../../src/utils/serviceFees.ts`
- ✅ Duplication minimale des fonctions nécessaires directement dans le webhook
- ✅ Suppression de `validateFeeCalculations` (self-check DEV-only, non critique)
- ✅ Logique identique : 15% renter + 15% owner = 30% platform total

---

## 📊 Résumé des modifications

### Fichiers modifiés

1. **`supabase/config.toml`**
   - Ajout : `[functions.stripe-webhook] verify_jwt = false`
   - Impact : Désactive la vérification JWT pour cette fonction uniquement

2. **`supabase/functions/stripe-webhook/index.ts`**
   - Remplacement : Import externe → Fonctions inline
   - Impact : Supprime le warning de build, logique identique

### Fichiers non modifiés

- ❌ Aucune autre Edge Function
- ❌ Aucune logique Stripe modifiée
- ❌ Aucune modification DB/RLS
- ❌ Aucun refactor

---

## 🚀 Commande de redeploy

**Commande à exécuter :**

```bash
supabase functions deploy stripe-webhook
```

**Résultat attendu :**

- ✅ **Pas de warning** "failed to read file"
- ✅ **Pas de 401** lors d'un `curl` direct sur `/functions/v1/stripe-webhook`
- ✅ **Webhook Stripe fonctionnel** (accepte les requêtes sans `Authorization` header)

### Test après déploiement

**Test curl (sans Authorization header) :**
```bash
curl -X POST \
  "https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed", "data": {"object": {"metadata": {"bookingId": "test"}}}}'
```

**Résultat attendu :** `200 OK` (ou `400` si signature invalide, mais **pas** `401`)

---

## ✅ Validation

- ✅ Configuration globale ajoutée dans `supabase/config.toml`
- ✅ Import externe remplacé par fonctions inline
- ✅ Logique de calcul identique (15% + 15% = 30%)
- ✅ Aucun autre fichier modifié
- ✅ Aucun refactor effectué

**Le webhook devrait maintenant fonctionner correctement après le redeploy.**

---

**Fin du diagnostic + fix minimal**

