# LOT PAY-401 — DIAG + FIX — create-checkout-session returns 401 "Missing authorization header"

## 🔍 Cause racine

**Problème identifié :** L'appel `fetch` direct vers l'Edge Function Supabase `create-checkout-session` n'incluait pas les headers d'autorisation requis. Par défaut, Supabase vérifie le JWT (`verify_jwt = true`), ce qui nécessite l'envoi du token d'authentification dans le header `Authorization: Bearer <token>`.

**Fichier concerné :** `src/lib/payerLocation.ts` (lignes 14-24)

## ✅ Fix appliqué

**Fix A (préféré) :** Remplacement du `fetch` direct par `supabase.functions.invoke()` qui gère automatiquement :
- L'ajout du header `Authorization: Bearer <session.access_token>`
- L'ajout du header `apikey: <VITE_SUPABASE_ANON_KEY>`
- La gestion des erreurs d'authentification
- Le refresh automatique du token si nécessaire

### Modifications effectuées

**Fichier :** `src/lib/payerLocation.ts`

**Changements :**
1. ✅ Import de `supabase` depuis `@/integrations/supabase/client`
2. ✅ Vérification de la session avant l'appel (`supabase.auth.getSession()`)
3. ✅ Remplacement de `fetch()` par `supabase.functions.invoke()`
4. ✅ Ajout de logs DEV-only pour diagnostiquer les headers (token masqué)
5. ✅ Gestion d'erreur améliorée avec messages explicites

**Lignes modifiées :** 1-55 (fichier complet refactorisé)

### Code avant (❌)

```typescript
const response = await fetch(EDGE_FUNCTION_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({...}),
});
```

### Code après (✅)

```typescript
// Vérifier que l'utilisateur est connecté
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (!session) {
  throw new Error("Vous devez être connecté pour effectuer un paiement.");
}

// Utiliser supabase.functions.invoke qui gère automatiquement l'autorisation
const { data, error } = await supabase.functions.invoke("create-checkout-session", {
  body: {
    amount: reservation.totalTTC,
    description: `Location de ${reservation.voiture}`,
    bookingId: reservation.id,
  },
});
```

## 🔐 Configuration Edge Function

**Fichier :** `supabase/functions/create-checkout-session/index.ts`

**Vérification JWT :** Par défaut, Supabase vérifie le JWT (`verify_jwt = true`). Aucun fichier `function.toml` n'existe pour cette fonction, donc la vérification est active.

**Note :** Le webhook Stripe (`stripe-webhook`) a `verify_jwt = false` car il est appelé par Stripe (pas par l'utilisateur).

## 🧪 Test manuel avec curl

### Prérequis

1. Récupérer votre token de session Supabase :
   - Ouvrir la console du navigateur sur `http://localhost:3012`
   - Exécuter : `localStorage.getItem('sb-<project-ref>-auth-token-tenant')` (ou `-owner` selon le contexte)
   - Extraire `access_token` du JSON

2. Récupérer votre `VITE_SUPABASE_ANON_KEY` depuis `.env.local`

### Commande curl (DEV)

```bash
curl -X POST \
  "https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.50,
    "description": "Location de véhicule test",
    "bookingId": "test-booking-123"
  }'
```

### Résultat attendu (✅)

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### Résultat si 401 (❌ - avant le fix)

```json
{
  "message": "Missing authorization header"
}
```

### Test avec token invalide (vérification)

```bash
curl -X POST \
  "https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session" \
  -H "Authorization: Bearer invalid_token" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"amount": 150.50, "description": "Test"}'
```

**Résultat attendu :** `401 Unauthorized` (comportement normal pour un token invalide)

## 📋 Logs DEV-only

Les logs suivants sont ajoutés uniquement en mode développement (`import.meta.env.DEV`):

```typescript
console.log('🔍 [payerLocation DEV] Headers envoyés:', {
  'Authorization': `Bearer ${maskedToken}`, // Token masqué (20 premiers + 10 derniers caractères)
  'apikey': 'présent (masqué)',
  'Content-Type': 'application/json',
  'hasSession': true,
  'userId': 'user-uuid'
});
```

**Note :** Le token est masqué pour la sécurité (affichage partiel uniquement).

## ✅ Validation

1. ✅ Le fetch direct est remplacé par `supabase.functions.invoke()`
2. ✅ La session est vérifiée avant l'appel
3. ✅ Les logs DEV-only sont présents (token masqué)
4. ✅ La gestion d'erreur est améliorée
5. ✅ Aucune modification des calculs de fees
6. ✅ Pas de changement CORS (déjà configuré correctement)

## 🚀 Déploiement

**Aucun changement requis côté Edge Function.** Le fix est uniquement côté frontend.

**Test recommandé :**
1. Démarrer le serveur : `npm run dev:3012` (tenant) ou `npm run dev:3013` (owner)
2. Se connecter avec un compte utilisateur
3. Tenter un paiement via le modal `PaymentFlowModal`
4. Vérifier dans la console que les logs DEV s'affichent
5. Vérifier que la redirection vers Stripe fonctionne (plus de 401)

## 📝 Notes

- **Fix B (alternative) :** Si on avait conservé `fetch`, il aurait fallu ajouter manuellement :
  ```typescript
  headers: {
    "Authorization": `Bearer ${session.access_token}`,
    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  }
  ```
  Mais `supabase.functions.invoke()` est préféré car il gère automatiquement le refresh du token et les erreurs d'auth.

- **Sécurité :** Le token n'est jamais loggé en clair (masqué dans les logs DEV).

