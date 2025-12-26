# DIAGNOSTIC STRICT — STRIPE_SECRET_KEY

## 📋 Résumé du problème

**Symptôme :** L'Edge Function `create-checkout-session` retourne une erreur indiquant que `STRIPE_SECRET_KEY` est manquante, alors que le paiement Stripe fonctionnait auparavant.

**Fichier concerné :** `supabase/functions/create-checkout-session/index.ts`

**Ligne de vérification :** Ligne 182 (`Deno.env.get("STRIPE_SECRET_KEY")`)

**Erreur retournée :** `"Configuration serveur manquante: STRIPE_SECRET_KEY"` (HTTP 500)

---

## 🔍 Analyse du code

### Comment la clé est lue

**Méthode :** `Deno.env.get("STRIPE_SECRET_KEY")`

**Emplacement :** Ligne 182 de `supabase/functions/create-checkout-session/index.ts`

```typescript
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecret) {
  console.error("❌ [create-checkout-session] STRIPE_SECRET_KEY manquante");
  return new Response(
    JSON.stringify({ ok: false, error: "Configuration serveur manquante: STRIPE_SECRET_KEY" }),
    { status: 500, ... }
  );
}
```

### Nom exact de la variable

**Variable attendue :** `STRIPE_SECRET_KEY` (exactement, case-sensitive)

**Format attendu :** Clé secrète Stripe (ex: `sk_test_...` ou `sk_live_...`)

---

## 🔐 Où la clé est censée être injectée

### Environnement Supabase Edge Functions

Les variables d'environnement pour les Edge Functions Supabase sont configurées via :

1. **Dashboard Supabase** (PROD) :
   - Aller dans : `Project Settings` → `Edge Functions` → `Secrets`
   - Ajouter/Modifier : `STRIPE_SECRET_KEY`

2. **CLI Supabase (DEV local)** :
   - Fichier `.env.local` dans le projet (pour le serveur local)
   - Variables définies via `supabase secrets set STRIPE_SECRET_KEY=...`

3. **Déploiement** :
   - Les secrets doivent être définis dans le projet Supabase avant le déploiement
   - Commande : `supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx`

### Projet Supabase actuel

**Project ID :** `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)

**URL :** `https://tbsgzykqcksmqxpimwry.supabase.co`

**Configuration :** Voir `supabase/config.toml`

---

## 📊 Logs de diagnostic ajoutés

### Logs DEV-only ajoutés

**1. Log au démarrage du module** (une seule fois au chargement de la fonction) :

```typescript
console.info("🔍 [stripe-env-check] Variables d'environnement Stripe au démarrage:", {
  stripeEnvVars: {
    STRIPE_SECRET_KEY: { exists: boolean, length?: number },
    STRIPE_SUCCESS_URL: { exists: boolean, length?: number },
    STRIPE_CANCEL_URL: { exists: boolean, length?: number },
    // ...
  },
  allStripeVarNames: string[], // Toutes les variables commençant par STRIPE_
  runtime: "edge",
  isDev: true,
  denoEnv: string | "undefined",
});
```

**2. Log avant vérification de la clé** (à chaque requête POST) :

```typescript
console.info("🔍 [stripe-env-check] Vérification STRIPE_SECRET_KEY:", {
  hasStripeSecretKey: boolean,
  keyLength: number,
  keyPrefix: string, // Ex: "sk_test..." (7 premiers caractères)
  keySuffix: string, // Ex: "...xxxx" (4 derniers caractères)
  runtime: "edge",
  timestamp: string, // ISO 8601
});
```

**3. Log si la clé est absente** (dans le cas d'erreur) :

```typescript
console.error("❌ [stripe-env-check] STRIPE_SECRET_KEY ABSENTE - Diagnostic:", {
  hasStripeSecretKey: false,
  allEnvKeys: string[], // Toutes les clés contenant "STRIPE" ou "stripe"
  denoEnvKeys: number, // Nombre total de variables d'environnement
  runtime: "edge",
  timestamp: string,
});
```

### Où voir les logs

**En DEV local :**
- Console du terminal où `supabase functions serve` est exécuté

**En PROD :**
- Dashboard Supabase → `Edge Functions` → `Logs` → Sélectionner `create-checkout-session`
- Ou via CLI : `supabase functions logs create-checkout-session`

---

## 🧪 Ce que montrent les logs runtime

### Scénario 1 : Clé présente ✅

```
🔍 [stripe-env-check] Variables d'environnement Stripe au démarrage: {
  stripeEnvVars: {
    STRIPE_SECRET_KEY: { exists: true, length: 32 },
    STRIPE_SUCCESS_URL: { exists: true, length: 45 },
    STRIPE_CANCEL_URL: { exists: true, length: 44 }
  },
  allStripeVarNames: ["STRIPE_SECRET_KEY", "STRIPE_SUCCESS_URL", "STRIPE_CANCEL_URL"],
  runtime: "edge",
  isDev: true
}

🔍 [stripe-env-check] Vérification STRIPE_SECRET_KEY: {
  hasStripeSecretKey: true,
  keyLength: 32,
  keyPrefix: "sk_test...",
  keySuffix: "...xxxx",
  runtime: "edge",
  timestamp: "2025-01-XX..."
}
```

**Conclusion :** La clé est présente et accessible.

### Scénario 2 : Clé absente ❌

```
🔍 [stripe-env-check] Variables d'environnement Stripe au démarrage: {
  stripeEnvVars: {
    STRIPE_SECRET_KEY: { exists: false },
    STRIPE_SUCCESS_URL: { exists: true, length: 45 },
    STRIPE_CANCEL_URL: { exists: true, length: 44 }
  },
  allStripeVarNames: ["STRIPE_SUCCESS_URL", "STRIPE_CANCEL_URL"],
  runtime: "edge",
  isDev: true
}

🔍 [stripe-env-check] Vérification STRIPE_SECRET_KEY: {
  hasStripeSecretKey: false,
  keyLength: 0,
  keyPrefix: "N/A",
  keySuffix: "N/A",
  runtime: "edge",
  timestamp: "2025-01-XX..."
}

❌ [stripe-env-check] STRIPE_SECRET_KEY ABSENTE - Diagnostic: {
  hasStripeSecretKey: false,
  allEnvKeys: ["STRIPE_SUCCESS_URL", "STRIPE_CANCEL_URL"],
  denoEnvKeys: 15,
  runtime: "edge",
  timestamp: "2025-01-XX..."
}
```

**Conclusion :** La clé n'est pas définie dans l'environnement runtime.

---

## 💡 Hypothèses possibles expliquant "ça marchait avant"

### Hypothèse 1 : Secret non défini dans le projet Supabase

**Cause :** Le secret `STRIPE_SECRET_KEY` n'a jamais été défini dans le projet Supabase `tbsgzykqcksmqxpimwry`, ou a été supprimé accidentellement.

**Vérification :**
1. Aller dans le Dashboard Supabase → `Project Settings` → `Edge Functions` → `Secrets`
2. Vérifier si `STRIPE_SECRET_KEY` est présent dans la liste

**Solution :**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx --project-ref tbsgzykqcksmqxpimwry
```

### Hypothèse 2 : Changement de projet Supabase

**Cause :** Le code a été migré vers un nouveau projet Supabase (`tbsgzykqcksmqxpimwry`) mais les secrets n'ont pas été copiés.

**Vérification :**
- Vérifier `supabase/config.toml` : `project_id = "tbsgzykqcksmqxpimwry"`
- Vérifier si les secrets existent dans ce projet

**Solution :** Copier les secrets depuis l'ancien projet vers le nouveau.

### Hypothèse 3 : Secret défini mais non déployé

**Cause :** Le secret a été défini localement mais n'a pas été synchronisé avec Supabase Cloud.

**Vérification :**
- Vérifier les logs de déploiement
- Vérifier si `supabase secrets list` affiche la clé

**Solution :**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx --project-ref tbsgzykqcksmqxpimwry
```

### Hypothèse 4 : Nom de variable incorrect

**Cause :** La variable est définie sous un nom différent (ex: `STRIPE_KEY`, `STRIPE_API_KEY`).

**Vérification :**
- Vérifier les logs `allStripeVarNames` pour voir toutes les variables `STRIPE_*` disponibles

**Solution :** Renommer la variable ou adapter le code pour utiliser le bon nom.

### Hypothèse 5 : Problème de cache / redémarrage nécessaire

**Cause :** Les Edge Functions peuvent mettre du temps à récupérer les nouveaux secrets.

**Vérification :** Vérifier les logs pour voir si la clé apparaît après un redéploiement.

**Solution :** Redéployer la fonction :
```bash
supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
```

### Hypothèse 6 : Environnement DEV vs PROD

**Cause :** La clé est définie en PROD mais pas en DEV (ou vice versa).

**Vérification :** Vérifier les logs `isDev` et `denoEnv` pour identifier l'environnement.

**Solution :** Définir la clé dans l'environnement concerné.

---

## ✅ Actions de diagnostic recommandées

### 1. Vérifier les secrets Supabase

```bash
# Lister tous les secrets du projet
supabase secrets list --project-ref tbsgzykqcksmqxpimwry
```

**Résultat attendu :** `STRIPE_SECRET_KEY` doit apparaître dans la liste.

### 2. Vérifier les logs runtime

1. Déclencher une requête vers `create-checkout-session`
2. Consulter les logs dans le Dashboard Supabase
3. Chercher les logs `[stripe-env-check]`

**Interprétation :**
- Si `hasStripeSecretKey: false` → La clé n'est pas accessible au runtime
- Si `hasStripeSecretKey: true` mais erreur → Problème différent (format, permissions, etc.)

### 3. Vérifier la configuration du projet

```bash
# Vérifier le project_id
cat supabase/config.toml | grep project_id

# Vérifier l'URL Supabase
echo $VITE_SUPABASE_URL
```

**Résultat attendu :** `project_id = "tbsgzykqcksmqxpimwry"`

### 4. Tester en local (DEV)

```bash
# Définir le secret localement
export STRIPE_SECRET_KEY=sk_test_xxx

# Tester la fonction localement
supabase functions serve create-checkout-session
```

**Résultat attendu :** Les logs DEV doivent afficher `hasStripeSecretKey: true`.

---

## 📝 Conclusion

### Diagnostic à effectuer

1. ✅ **Logs ajoutés** : Les logs DEV-only sont en place pour diagnostiquer
2. ⏳ **Vérification requise** : Consulter les logs runtime pour confirmer :
   - Si `STRIPE_SECRET_KEY` est présente (`hasStripeSecretKey: true/false`)
   - Sa longueur (`keyLength`)
   - Toutes les variables `STRIPE_*` disponibles (`allStripeVarNames`)

### Prochaines étapes

1. **Déclencher une requête** vers `create-checkout-session` (via le frontend ou curl)
2. **Consulter les logs** dans le Dashboard Supabase → `Edge Functions` → `Logs`
3. **Analyser les logs** `[stripe-env-check]` pour déterminer :
   - Clé absente → Définir le secret via `supabase secrets set`
   - Clé présente mais erreur → Problème différent (format, permissions, etc.)
   - Variables différentes → Adapter le code ou renommer les variables

### Résultat attendu après fix

```
🔍 [stripe-env-check] Vérification STRIPE_SECRET_KEY: {
  hasStripeSecretKey: true,
  keyLength: 32,
  keyPrefix: "sk_test...",
  keySuffix: "...xxxx",
  runtime: "edge"
}

✅ [create-checkout-session] Stripe initialisé, création de la session...
```

---

## 🔒 Sécurité

**⚠️ IMPORTANT :**
- Les logs **NE JAMAIS** afficher la valeur complète de `STRIPE_SECRET_KEY`
- Seuls le préfixe (7 caractères) et le suffixe (4 caractères) sont loggés
- La longueur est affichée pour validation (format attendu : ~32 caractères pour `sk_test_...`)
- Les logs sont **DEV-only** (`if (isDev)`) et ne s'affichent pas en production

---

## 📚 Références

- **Fichier modifié :** `supabase/functions/create-checkout-session/index.ts`
- **Lignes modifiées :** 28-60 (log au démarrage), 184-203 (log avant vérification)
- **Documentation Supabase :** https://supabase.com/docs/guides/functions/secrets
- **Documentation Stripe :** https://stripe.com/docs/keys

---

**Date de diagnostic :** 2025-01-XX  
**Version Edge Function :** Actuelle (avec logs de diagnostic)  
**Projet Supabase :** `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)

