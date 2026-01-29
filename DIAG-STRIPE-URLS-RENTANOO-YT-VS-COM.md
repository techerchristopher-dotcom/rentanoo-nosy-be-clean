# Diagnostic Stripe URLs - rentanoo.yt vs rentanoo.com

## 🔍 Diagnostic : rentanoo.yt encore utilisé ?

### Résultats du scan

**Occurrences de `rentanoo.yt` dans le code** :

1. **`supabase/functions/create-checkout-session/index.ts` lignes 85-86** :
   ```typescript
   const PROD_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS")
     ? Deno.env.get("CORS_ALLOWED_ORIGINS")!.split(",").map(o => o.trim())
     : [
         "https://rentanoo.yt",        // ⚠️ ANCIEN DOMAINE
         "https://www.rentanoo.yt",    // ⚠️ ANCIEN DOMAINE
         "https://rentanoo.com",
         "https://www.rentanoo.com",
       ];
   ```
   **Impact** : Whitelist CORS par défaut. Si `CORS_ALLOWED_ORIGINS` n'est pas défini, `rentanoo.yt` est utilisé comme fallback.

2. **Documentation/Templates** : Références dans des fichiers de documentation (non bloquant)

**Conclusion** : `rentanoo.yt` est présent dans la whitelist CORS par défaut, mais **PAS directement utilisé** pour construire les URLs Stripe.

## 📋 URLs réelles utilisées par l'app

### A) Success URL et Cancel URL

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Lignes 450-451** :
```typescript
const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");
```

**Ligne 502** :
```typescript
success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: cancelUrl,
```

**Source** : Variables d'environnement Supabase Secrets (pas dans le code)

**URLs attendues** :
- `STRIPE_SUCCESS_URL` : `https://rentanoo.com/success` (sans www, sans rentanoo.yt)
- `STRIPE_CANCEL_URL` : `https://rentanoo.com/cancel` (sans www, sans rentanoo.yt)

### B) Webhook Stripe Endpoint

**⚠️ IMPORTANT** : Il existe **DEUX webhooks** possibles dans le code :

#### Option 1 : Express Route (server/index.ts)

**Fichier** : `server/index.ts`  
**Ligne 50** : `app.post("/api/stripe/webhook", ...)`

**URL complète** :
```
https://rentanoo.com/api/stripe/webhook
```

**Variables utilisées** :
- `STRIPE_WEBHOOK_SECRET` (process.env, Railway)

**Configuration** : Dans Stripe Dashboard → Webhooks → Endpoints

#### Option 2 : Supabase Edge Function

**Fichier** : `supabase/functions/stripe-webhook/index.ts`

**URL complète** :
```
https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook
```

**Variables utilisées** :
- `STRIPE_WEBHOOK_SECRET` (Deno.env, Supabase Secrets)
- `STRIPE_SECRET_KEY` (Deno.env, Supabase Secrets)

**Configuration** : Dans Stripe Dashboard → Webhooks → Endpoints

**⚠️ Question** : Lequel est utilisé en production ? Les deux existent et peuvent être configurés dans Stripe.

## 🔧 Variables d'environnement à vérifier

### Variables Supabase Secrets (Edge Functions)

**Où vérifier** : Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Variables à vérifier** :
1. `STRIPE_SUCCESS_URL` → Doit être `https://rentanoo.com/success` (pas `rentanoo.yt`)
2. `STRIPE_CANCEL_URL` → Doit être `https://rentanoo.com/cancel` (pas `rentanoo.yt`)
3. `STRIPE_SECRET_KEY` → Préfixe `sk_test_` ou `sk_live_` (pour identifier TEST vs LIVE)
4. `STRIPE_WEBHOOK_SECRET` → Si Edge Function webhook est utilisé

**Commande pour vérifier** :
```bash
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE
```

### Variables Railway (Express Webhook)

**Où vérifier** : Railway Dashboard → Variables d'environnement

**Variables à vérifier** :
1. `STRIPE_WEBHOOK_SECRET` → Si Express webhook est utilisé
2. `STRIPE_SECRET_KEY` → Si utilisé côté serveur Express

## 🔍 Vérification Stripe Dashboard

### Étape 1 : Identifier le mode (TEST vs LIVE)

**Dans Stripe Dashboard** :
1. Vérifier le toggle en haut à droite : **TEST** ou **LIVE**
2. Aller dans **Developers > API keys**
3. Vérifier quelle clé secrète est utilisée :
   - `sk_test_...` → Mode TEST
   - `sk_live_...` → Mode LIVE

**Important** : Les webhooks TEST et LIVE sont **séparés**. Il faut vérifier les deux.

### Étape 2 : Vérifier les Webhooks (TEST)

1. Aller dans **Developers > Webhooks**
2. **Vérifier le toggle** : Doit être sur **TEST**
3. Chercher les endpoints webhook configurés
4. Pour chaque endpoint, vérifier :
   - **URL** : Doit être `https://rentanoo.com/api/stripe/webhook` OU `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`
   - **❌ Ne doit PAS être** : `https://rentanoo.yt/...` ou `https://www.rentanoo.com/...`
   - **Events** : Doit inclure `checkout.session.completed`
   - **Recent deliveries** : Vérifier les dernières tentatives (doivent être 200 OK)

### Étape 3 : Vérifier les Webhooks (LIVE)

1. **Basculer le toggle** sur **LIVE**
2. Répéter l'étape 2 pour le mode LIVE

### Étape 4 : Vérifier les URLs de redirection

**Dans Stripe Dashboard** :
1. Aller dans **Settings > Branding**
2. Vérifier les URLs de redirection (si configurées globalement)

**Note** : Les URLs `success_url` et `cancel_url` sont généralement définies lors de la création de la session (`checkout.sessions.create`), pas dans les settings Stripe.

## 🔧 Corrections à appliquer

### Correction 1 : Mettre à jour la whitelist CORS (optionnel)

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Lignes 84-90** : Retirer `rentanoo.yt` de la whitelist par défaut

**Avant** :
```typescript
const PROD_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS")
  ? Deno.env.get("CORS_ALLOWED_ORIGINS")!.split(",").map(o => o.trim())
  : [
      "https://rentanoo.yt",        // ⚠️ ANCIEN
      "https://www.rentanoo.yt",    // ⚠️ ANCIEN
      "https://rentanoo.com",
      "https://www.rentanoo.com",
    ];
```

**Après** :
```typescript
const PROD_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS")
  ? Deno.env.get("CORS_ALLOWED_ORIGINS")!.split(",").map(o => o.trim())
  : [
      "https://rentanoo.com",
      "https://www.rentanoo.com",
      // rentanoo.yt retiré (ancien domaine)
    ];
```

**Alternative** : Utiliser `CORS_ALLOWED_ORIGINS` dans Supabase Secrets pour surcharger.

### Correction 2 : Ajouter logs pour vérifier les URLs utilisées

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Ajouter après ligne 450** :
```typescript
// Log des URLs utilisées (sans révéler de secrets)
console.log("🔗 [create-checkout-session] URLs de redirection configurées:", {
  successUrl: successUrl ? `${successUrl.substring(0, 20)}...` : "MANQUANT",
  cancelUrl: cancelUrl ? `${cancelUrl.substring(0, 20)}...` : "MANQUANT",
  successUrlDomain: successUrl ? new URL(successUrl).hostname : "N/A",
  cancelUrlDomain: cancelUrl ? new URL(cancelUrl).hostname : "N/A",
  timestamp: new Date().toISOString(),
});
```

**Ajouter après ligne 502** (dans les logs de session créée) :
```typescript
console.log("✅ [create-checkout-session] Session créée avec succès:", {
  // ... logs existants ...
  successUrlUsed: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrlUsed: cancelUrl,
});
```

### Correction 3 : Vérifier/corriger Supabase Secrets

**Si `STRIPE_SUCCESS_URL` contient `rentanoo.yt`** :

```bash
# Vérifier la valeur actuelle
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE_SUCCESS_URL

# Corriger si nécessaire
supabase secrets set STRIPE_SUCCESS_URL=https://rentanoo.com/success --project-ref tbsgzykqcksmqxpimwry
supabase secrets set STRIPE_CANCEL_URL=https://rentanoo.com/cancel --project-ref tbsgzykqcksmqxpimwry
```

### Correction 4 : Vérifier/corriger Stripe Dashboard Webhooks

**Pour Express webhook** (`/api/stripe/webhook`) :
1. Aller dans Stripe Dashboard → Developers → Webhooks
2. Vérifier le mode (TEST ou LIVE)
3. Pour chaque endpoint :
   - Si URL contient `rentanoo.yt` → **Modifier** l'URL
   - Nouvelle URL : `https://rentanoo.com/api/stripe/webhook`
   - Vérifier les events : `checkout.session.completed` doit être activé
   - Copier le **Signing secret** (commence par `whsec_`)
   - Mettre à jour `STRIPE_WEBHOOK_SECRET` dans Railway si nécessaire

**Pour Edge Function webhook** :
1. URL doit être : `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`
2. Vérifier les events : `checkout.session.completed` doit être activé
3. Copier le **Signing secret** (commence par `whsec_`)
4. Mettre à jour `STRIPE_WEBHOOK_SECRET` dans Supabase Secrets si nécessaire

## 🧪 Checklist de validation

### Test 1 : Vérifier les logs Edge Function

**Après un paiement test** :
```bash
supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry
```

**Chercher** :
- `🔗 [create-checkout-session] URLs de redirection configurées:` → Vérifier `successUrlDomain` et `cancelUrlDomain`
- `✅ [create-checkout-session] Session créée avec succès:` → Vérifier `successUrlUsed`

**Résultat attendu** :
- `successUrlDomain: "rentanoo.com"` (pas `rentanoo.yt`)
- `cancelUrlDomain: "rentanoo.com"` (pas `rentanoo.yt`)

### Test 2 : Vérifier Stripe Dashboard Webhooks

**Dans Stripe Dashboard → Developers → Webhooks** :

1. **Mode TEST** :
   - Vérifier que l'URL de l'endpoint est `rentanoo.com` (pas `rentanoo.yt`)
   - Vérifier "Recent deliveries" → Les dernières tentatives doivent être 200 OK
   - Vérifier les events activés → `checkout.session.completed` doit être présent

2. **Mode LIVE** :
   - Répéter les mêmes vérifications pour le mode LIVE

### Test 3 : Tester un paiement complet

1. Lancer un paiement test sur rentanoo.com
2. Compléter le paiement sur Stripe Checkout
3. **Vérifier la redirection** :
   - URL doit être `https://rentanoo.com/success?session_id=cs_test_...` (pas `rentanoo.yt`)
4. **Vérifier Stripe Dashboard** :
   - Aller dans **Payments** (mode TEST)
   - Chercher le `session_id` noté dans les logs
   - La transaction doit apparaître

### Test 4 : Vérifier les logs webhook

**Si Express webhook utilisé** :
```bash
# Vérifier les logs Railway
# Chercher dans Railway Dashboard → Logs
```

**Si Edge Function webhook utilisé** :
```bash
supabase functions logs stripe-webhook --project-ref tbsgzykqcksmqxpimwry
```

**Chercher** :
- `💳 checkout.session.completed reçu:` → Le webhook doit être appelé
- `✅ Réservation mise à jour avec succès:` → La DB doit être mise à jour

## 📝 Patch code complet

### Patch 1 : Retirer rentanoo.yt de la whitelist CORS

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

```typescript
// Lignes 84-90
const PROD_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS")
  ? Deno.env.get("CORS_ALLOWED_ORIGINS")!.split(",").map(o => o.trim())
  : [
      "https://rentanoo.com",
      "https://www.rentanoo.com",
      // rentanoo.yt retiré (ancien domaine, migration vers rentanoo.com)
    ];
```

### Patch 2 : Ajouter logs des URLs utilisées

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Ajouter après ligne 451** :
```typescript
// Log des URLs utilisées pour vérification (sans révéler de secrets)
console.log("🔗 [create-checkout-session] URLs de redirection configurées:", {
  successUrl: successUrl ? `${successUrl.substring(0, Math.min(30, successUrl.length))}...` : "MANQUANT",
  cancelUrl: cancelUrl ? `${cancelUrl.substring(0, Math.min(30, cancelUrl.length))}...` : "MANQUANT",
  successUrlDomain: successUrl ? (() => {
    try {
      return new URL(successUrl).hostname;
    } catch {
      return "INVALID_URL";
    }
  })() : "N/A",
  cancelUrlDomain: cancelUrl ? (() => {
    try {
      return new URL(cancelUrl).hostname;
    } catch {
      return "INVALID_URL";
    }
  })() : "N/A",
  timestamp: new Date().toISOString(),
});
```

**Modifier ligne 509** (ajouter dans les logs de session créée) :
```typescript
console.log("✅ [create-checkout-session] Session créée avec succès:", {
  sessionId: session.id,
  sessionIdPrefix: session.id.substring(0, Math.min(15, session.id.length)) + "...",
  paymentIntentId: session.payment_intent || "N/A",
  url: session.url?.substring(0, 50) + "...",
  bookingId,
  amountTTC_DB: amountTTC,
  amountTTC_cents: unitAmountCents,
  subtotal_DB: subtotal,
  stripeKeyType: stripeKeyType,
  dashboardUrl: stripeKeyType === "TEST" 
    ? "https://dashboard.stripe.com/test/payments" 
    : stripeKeyType === "LIVE"
    ? "https://dashboard.stripe.com/payments"
    : "N/A",
  searchHint: `Chercher dans le dashboard Stripe (mode ${stripeKeyType}) avec session_id: ${session.id}`,
  // URLs utilisées pour redirection
  successUrlUsed: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrlUsed: cancelUrl,
  successUrlDomain: successUrl ? (() => {
    try {
      return new URL(successUrl).hostname;
    } catch {
      return "INVALID_URL";
    }
  })() : "N/A",
});
```

## 🚨 Procédure de correction complète

### Étape 1 : Vérifier Supabase Secrets

```bash
# Lister tous les secrets Stripe
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE
```

**Vérifier** :
- `STRIPE_SUCCESS_URL` → Doit être `https://rentanoo.com/success`
- `STRIPE_CANCEL_URL` → Doit être `https://rentanoo.com/cancel`
- `STRIPE_SECRET_KEY` → Préfixe `sk_test_` ou `sk_live_` (pour identifier le mode)

**Si incorrect** :
```bash
supabase secrets set STRIPE_SUCCESS_URL=https://rentanoo.com/success --project-ref tbsgzykqcksmqxpimwry
supabase secrets set STRIPE_CANCEL_URL=https://rentanoo.com/cancel --project-ref tbsgzykqcksmqxpimwry
```

### Étape 2 : Vérifier Stripe Dashboard Webhooks (TEST)

1. Aller sur https://dashboard.stripe.com
2. **Vérifier le toggle** : Doit être sur **TEST**
3. Aller dans **Developers > Webhooks**
4. Pour chaque endpoint :
   - **Vérifier l'URL** :
     - Express : `https://rentanoo.com/api/stripe/webhook`
     - Edge Function : `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`
   - **Si URL contient `rentanoo.yt`** :
     - Cliquer sur l'endpoint
     - Cliquer sur "Edit"
     - Modifier l'URL
     - Sauvegarder
   - **Vérifier les events** :
     - `checkout.session.completed` doit être activé
     - `payment_intent.succeeded` (optionnel mais recommandé)
   - **Vérifier "Recent deliveries"** :
     - Les dernières tentatives doivent être 200 OK
     - Si 404/401 → L'URL est incorrecte ou le secret ne correspond pas

### Étape 3 : Vérifier Stripe Dashboard Webhooks (LIVE)

1. **Basculer le toggle** sur **LIVE**
2. Répéter l'étape 2 pour le mode LIVE

### Étape 4 : Vérifier les Signing Secrets

**Pour Express webhook** :
1. Dans Stripe Dashboard → Webhooks → Endpoint → "Signing secret"
2. Copier le secret (commence par `whsec_`)
3. Vérifier dans Railway → Variables d'environnement :
   - `STRIPE_WEBHOOK_SECRET` doit correspondre

**Pour Edge Function webhook** :
1. Dans Stripe Dashboard → Webhooks → Endpoint → "Signing secret"
2. Copier le secret (commence par `whsec_`)
3. Vérifier dans Supabase Secrets :
   ```bash
   supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE_WEBHOOK_SECRET
   ```
4. Si incorrect ou absent :
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref tbsgzykqcksmqxpimwry
   ```

### Étape 5 : Appliquer les patches code

1. Appliquer Patch 1 (retirer rentanoo.yt de CORS)
2. Appliquer Patch 2 (ajouter logs URLs)
3. Déployer :
   ```bash
   supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
   ```

### Étape 6 : Tester et valider

1. Lancer un paiement test
2. Vérifier les logs :
   ```bash
   supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry
   ```
3. Vérifier que `successUrlDomain: "rentanoo.com"` (pas `rentanoo.yt`)
4. Vérifier Stripe Dashboard → Payments → La transaction apparaît
5. Vérifier Stripe Dashboard → Webhooks → Recent deliveries → 200 OK

## 📊 Résumé des URLs attendues

### URLs Stripe (depuis Edge Function)

| Variable | Valeur attendue | Où configurée |
|---------|----------------|---------------|
| `STRIPE_SUCCESS_URL` | `https://rentanoo.com/success` | Supabase Secrets |
| `STRIPE_CANCEL_URL` | `https://rentanoo.com/cancel` | Supabase Secrets |

### Webhook Endpoints

| Type | URL attendue | Où configurée |
|------|--------------|---------------|
| Express | `https://rentanoo.com/api/stripe/webhook` | Stripe Dashboard |
| Edge Function | `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook` | Stripe Dashboard |

**⚠️ Important** : Les deux webhooks peuvent coexister. Vérifier lequel est utilisé en production.

## 🎯 Action immédiate recommandée

1. **Vérifier Supabase Secrets** :
   ```bash
   supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE
   ```

2. **Vérifier Stripe Dashboard** :
   - Mode TEST → Webhooks → Vérifier les URLs
   - Mode LIVE → Webhooks → Vérifier les URLs

3. **Corriger si nécessaire** :
   - Mettre à jour `STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL` dans Supabase
   - Mettre à jour les URLs webhook dans Stripe Dashboard

4. **Appliquer les patches code** (logs améliorés)

5. **Tester** : Lancer un paiement test et vérifier les logs

