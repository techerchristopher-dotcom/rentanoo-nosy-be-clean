# Checklist Stripe : Passage TEST → LIVE

## 🎯 Objectif
Passer Stripe de TEST à LIVE sans casser la production, et valider qu'un vrai paiement arrive sur le compte.

---

## 📋 1. ARCHITECTURE ACTUELLE (Diagnostic)

### 1.1 Service de création Checkout Session

**✅ Service utilisé en production** : **Supabase Edge Function**

- **Fichier** : `supabase/functions/create-checkout-session/index.ts`
- **Appelé depuis** : `src/lib/payerLocation.ts` via `supabase.functions.invoke("create-checkout-session")`
- **URL Edge Function** : `https://zykwfjxurwmputxwlkxs.supabase.co/functions/v1/create-checkout-session`
- **Variables d'environnement** (Supabase Secrets) :
  - `STRIPE_SECRET_KEY` (Deno.env)
  - `STRIPE_SUCCESS_URL` (Deno.env)
  - `STRIPE_CANCEL_URL` (Deno.env)
  - `SUPABASE_URL` (Deno.env)
  - `SUPABASE_SERVICE_ROLE_KEY` (Deno.env)

**❌ Service NON utilisé** : Railway Express route `/api/create-checkout-session` (obsolète, commenté ligne 867-870 dans `server/index.ts`)

### 1.2 Service de réception Webhook

**⚠️ DEUX endpoints webhook existent dans le code** :

#### Option A : Railway Express (server/index.ts)
- **Route** : `POST /api/stripe/webhook`
- **URL complète** : `https://rentanoo.com/api/stripe/webhook`
- **Fichier** : `server/index.ts` (lignes 65-227)
- **Variables** (Railway env vars) :
  - `STRIPE_WEBHOOK_SECRET` (process.env)
  - `STRIPE_SECRET_KEY` (process.env, utilisé indirectement via `getStripe()`)
  - `SUPABASE_URL` (process.env)
  - `SUPABASE_SERVICE_ROLE_KEY` (process.env)

#### Option B : Supabase Edge Function
- **Route** : `POST /functions/v1/stripe-webhook`
- **URL complète** : `https://zykwfjxurwmputxwlkxs.supabase.co/functions/v1/stripe-webhook`
- **Fichier** : `supabase/functions/stripe-webhook/index.ts`
- **Variables** (Supabase Secrets) :
  - `STRIPE_WEBHOOK_SECRET` (Deno.env)
  - `STRIPE_SECRET_KEY` (Deno.env)
  - `SUPABASE_URL` (Deno.env)
  - `SUPABASE_SERVICE_ROLE_KEY` (Deno.env)

**🔍 Action requise** : Vérifier dans Stripe Dashboard → Webhooks quel endpoint est configuré en production.

---

## 🔍 2. IDENTIFICATION DU WEBHOOK UTILISÉ EN PROD

### Étape 1 : Vérifier dans Stripe Dashboard (TEST)

1. Aller sur https://dashboard.stripe.com/test/webhooks
2. Lister tous les endpoints webhook configurés
3. Identifier celui qui correspond à votre production :
   - `https://rentanoo.com/api/stripe/webhook` → Railway Express
   - `https://zykwfjxurwmputxwlkxs.supabase.co/functions/v1/stripe-webhook` → Supabase Edge Function

### Étape 2 : Vérifier les logs

**Railway Express** : Vérifier les logs Railway pour voir si `/api/stripe/webhook` reçoit des événements.

**Supabase Edge Function** : Vérifier les logs Supabase → Edge Functions → stripe-webhook.

**⚠️ CRITIQUE** : Un seul webhook doit être actif en production. Si les deux sont configurés dans Stripe, désactiver celui qui n'est pas utilisé.

---

## ✅ 3. VARIABLES D'ENVIRONNEMENT REQUISES POUR LIVE

### 3.1 Supabase Secrets (Edge Functions)

**Projet Supabase** : `zykwfjxurwmputxwlkxs` (rentanoo.yt)

**Variables à mettre à jour** :

| Variable | Valeur TEST actuelle | Valeur LIVE requise | Où vérifier |
|----------|---------------------|-------------------|------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | Supabase Dashboard → Project Settings → Edge Functions → Secrets |
| `STRIPE_SUCCESS_URL` | `https://rentanoo.com/success` | `https://rentanoo.com/success` | ✅ Déjà correct |
| `STRIPE_CANCEL_URL` | `https://rentanoo.com/cancel` | `https://rentanoo.com/cancel` | ✅ Déjà correct |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (TEST) | `whsec_...` (LIVE) | ⚠️ À créer après webhook LIVE |

**Commandes pour vérifier** :
```bash
# Lister toutes les variables Stripe
supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE

# Vérifier une variable spécifique
supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE_SECRET_KEY
```

### 3.2 Railway Environment Variables

**Variables à mettre à jour** :

| Variable | Valeur TEST actuelle | Valeur LIVE requise | Où vérifier |
|----------|---------------------|-------------------|------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | Railway Dashboard → Variables |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (TEST) | `whsec_...` (LIVE) | ⚠️ Si Railway webhook utilisé |

**⚠️ Note** : `STRIPE_SECRET_KEY` dans Railway n'est utilisé que si le webhook Railway est actif. Sinon, seule la Supabase Edge Function utilise sa propre `STRIPE_SECRET_KEY`.

---

## 🔒 4. VÉRIFICATION QU'AUCUNE CLÉ TEST N'EST UTILISÉE EN PROD

### 4.1 Logs au boot

**Railway Express** (`server/index.ts` lignes 21-27) :
```typescript
console.log(`🔑 [Stripe] Configuration: ${stripeConfigured ? `✅ Présente (mode ${stripeKeyType})` : "❌ Manquante"}`);
```

**Supabase Edge Function** (`create-checkout-session/index.ts` lignes 396-410) :
```typescript
console.log("🔑 [create-checkout-session] Configuration Stripe:", {
  keyType: stripeKeyType, // "TEST" ou "LIVE"
  keyPrefix: stripeKeyPrefix,
  dashboardMode: stripeKeyType === "TEST" ? "TEST MODE" : "LIVE MODE",
});
```

**✅ Action** : Après mise à jour des variables, vérifier les logs au boot pour confirmer `mode LIVE`.

### 4.2 Vérification code hardcodé

**✅ Aucune clé hardcodée détectée** :
- Toutes les références utilisent `process.env.STRIPE_SECRET_KEY` ou `Deno.env.get("STRIPE_SECRET_KEY")`
- Aucun `sk_test_` ou `sk_live_` en dur dans le code

### 4.3 Vérification endpoints Stripe

**✅ Aucun endpoint test hardcodé** :
- Le SDK Stripe détecte automatiquement TEST vs LIVE selon la clé utilisée
- Pas de `api.stripe.com/test/...` hardcodé

---

## 🌐 5. VÉRIFICATION DES URLs STRIPE

### 5.1 Success URL

**Fichier** : `supabase/functions/create-checkout-session/index.ts` (ligne 500-502)

```typescript
success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
```

**✅ Format correct** : Inclut `?session_id={CHECKOUT_SESSION_ID}` pour récupérer la session après paiement.

**Valeur attendue** : `https://rentanoo.com/success?session_id={CHECKOUT_SESSION_ID}`

### 5.2 Cancel URL

**Fichier** : `supabase/functions/create-checkout-session/index.ts` (ligne 503)

```typescript
cancel_url: cancelUrl,
```

**Valeur attendue** : `https://rentanoo.com/cancel`

### 5.3 Vérification domaines

**✅ Domaines corrects** :
- `https://rentanoo.com` (canonique, sans www)
- Pas de `rentanoo.yt` dans les URLs Stripe
- Pas de `localhost` en production
- Redirection `www.rentanoo.com` → `rentanoo.com` gérée côté serveur (lignes 36-52 de `server/index.ts`)

---

## 📝 6. CHECKLIST "GO-LIVE" STRIPE

### 6.1 Préparation Stripe Dashboard

- [ ] **Activer le compte Stripe LIVE**
  - Aller sur https://dashboard.stripe.com/settings/account
  - Compléter les informations requises (business details, bank account, etc.)
  - Vérifier que le compte est activé pour recevoir des paiements

- [ ] **Vérifier les capabilities**
  - Aller sur https://dashboard.stripe.com/settings/payments
  - Vérifier que les méthodes de paiement souhaitées sont activées (cartes, etc.)

- [ ] **Configurer les payouts**
  - Aller sur https://dashboard.stripe.com/settings/payouts
  - Vérifier que le compte bancaire est configuré et vérifié
  - Vérifier le délai de payout (généralement 2-7 jours)

- [ ] **Branding (optionnel)**
  - Aller sur https://dashboard.stripe.com/settings/branding
  - Configurer logo, couleurs pour les pages Checkout

### 6.2 Créer le webhook LIVE

**⚠️ CRITIQUE** : Créer un nouveau webhook en mode LIVE (ne pas réutiliser le webhook TEST).

1. Aller sur https://dashboard.stripe.com/webhooks
2. **Basculer en mode LIVE** (toggle en haut à droite)
3. Cliquer sur "Add endpoint"
4. **URL de l'endpoint** :
   - Si Railway Express : `https://rentanoo.com/api/stripe/webhook`
   - Si Supabase Edge Function : `https://zykwfjxurwmputxwlkxs.supabase.co/functions/v1/stripe-webhook`
5. **Événements à écouter** :
   - `checkout.session.completed` (requis)
   - Optionnel : `payment_intent.succeeded`, `payment_intent.payment_failed` (pour monitoring)
6. **Copier le Signing secret** (commence par `whsec_...`) → À utiliser pour `STRIPE_WEBHOOK_SECRET`

### 6.3 Mise à jour des variables d'environnement

#### A. Supabase Secrets (Edge Functions)

**Projet** : `zykwfjxurwmputxwlkxs`

```bash
# 1. Récupérer la clé secrète LIVE depuis Stripe Dashboard
# https://dashboard.stripe.com/apikeys (mode LIVE)

# 2. Mettre à jour STRIPE_SECRET_KEY
supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref zykwfjxurwmputxwlkxs

# 3. Mettre à jour STRIPE_WEBHOOK_SECRET (si Edge Function webhook utilisé)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref zykwfjxurwmputxwlkxs

# 4. Vérifier que STRIPE_SUCCESS_URL et STRIPE_CANCEL_URL sont corrects
supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE_SUCCESS_URL
supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE_CANCEL_URL

# Si incorrects, mettre à jour :
supabase secrets set STRIPE_SUCCESS_URL=https://rentanoo.com/success --project-ref zykwfjxurwmputxwlkxs
supabase secrets set STRIPE_CANCEL_URL=https://rentanoo.com/cancel --project-ref zykwfjxurwmputxwlkxs
```

#### B. Railway Environment Variables

**⚠️ Seulement si le webhook Railway est utilisé** :

1. Aller sur Railway Dashboard → Votre service → Variables
2. Mettre à jour :
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_...` (du webhook LIVE créé)

### 6.4 Redéploiement

- [ ] **Railway** : Redéployer le service (ou attendre le redeploy automatique après changement de variables)
- [ ] **Supabase Edge Functions** : Les secrets sont appliqués automatiquement, pas besoin de redéployer

### 6.5 Tests de validation

#### Test 1 : Vérifier les logs au boot

**Railway** :
```bash
# Vérifier les logs Railway au démarrage
# Rechercher : "🔑 [Stripe] Configuration: ✅ Présente (mode LIVE)"
```

**Supabase Edge Function** :
- Aller sur Supabase Dashboard → Edge Functions → create-checkout-session → Logs
- Rechercher : `"keyType": "LIVE"` dans les logs

#### Test 2 : Health check Stripe

**Endpoint** : `GET https://rentanoo.com/api/stripe-health`

**Réponse attendue** :
```json
{
  "ok": true,
  "stripeReady": true,
  "livemode": true
}
```

**Commande curl** :
```bash
curl https://rentanoo.com/api/stripe-health
```

#### Test 3 : Test paiement réel (montant faible)

**⚠️ CRITIQUE** : Effectuer un paiement réel avec une carte de test Stripe en mode LIVE.

1. **Créer une réservation** sur https://rentanoo.com
2. **Procéder au paiement** avec une carte de test Stripe LIVE :
   - Carte réussie : `4242 4242 4242 4242`
   - Date d'expiration : n'importe quelle date future (ex: `12/34`)
   - CVC : n'importe quel 3 chiffres (ex: `123`)
   - Code postal : n'importe quel code postal valide
3. **Vérifier dans Stripe Dashboard** (mode LIVE) :
   - Aller sur https://dashboard.stripe.com/payments
   - Vérifier que le paiement apparaît
   - Vérifier le montant, la devise, les métadonnées
4. **Vérifier dans la base de données** :
   - La réservation doit avoir `status = 'accepted'` (ou `'confirmed'` selon le webhook utilisé)
   - `paid_at` doit être renseigné
   - `stripe_checkout_session_id` doit être renseigné
   - `amount_total_paid` doit correspondre au montant Stripe
5. **Vérifier les logs webhook** :
   - Railway : Logs Railway pour `/api/stripe/webhook`
   - Supabase : Logs Edge Function `stripe-webhook`
   - Vérifier que l'événement `checkout.session.completed` a été reçu et traité

#### Test 4 : Refund du paiement test

1. Aller sur https://dashboard.stripe.com/payments (mode LIVE)
2. Trouver le paiement test effectué
3. Cliquer sur "Refund"
4. Vérifier que le refund est bien traité

---

## 🧪 7. COMMANDES DE TEST

### 7.1 Vérifier la configuration Stripe

```bash
# Health check Railway
curl https://rentanoo.com/api/stripe-health

# Vérifier les secrets Supabase
supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE
```

### 7.2 Vérifier les logs

**Railway** :
- Aller sur Railway Dashboard → Votre service → Logs
- Rechercher : `"mode LIVE"`, `"keyType": "LIVE"`

**Supabase** :
- Aller sur Supabase Dashboard → Edge Functions → Logs
- Rechercher : `"keyType": "LIVE"`, `"dashboardMode": "LIVE MODE"`

### 7.3 Test de création de session Checkout (sans payer)

**⚠️ Ne pas exécuter en production** : Ce test créerait une vraie session Checkout en LIVE.

Pour tester en local avec Stripe CLI :
```bash
# Installer Stripe CLI : https://stripe.com/docs/stripe-cli
stripe login

# Forwarder les webhooks vers votre local
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Tester un événement
stripe trigger checkout.session.completed
```

---

## 📊 8. MONITORING POST-GO-LIVE

### 8.1 Vérifications quotidiennes (première semaine)

- [ ] **Stripe Dashboard** (mode LIVE) :
  - Vérifier les paiements entrants
  - Vérifier les échecs de paiement
  - Vérifier les webhooks (section "Webhooks" → "Events")

- [ ] **Base de données** :
  - Vérifier que les réservations sont bien mises à jour après paiement
  - Vérifier que `paid_at` est renseigné
  - Vérifier que les montants correspondent

- [ ] **Logs** :
  - Vérifier qu'aucune erreur webhook n'apparaît
  - Vérifier que les signatures webhook sont validées

### 8.2 Alertes à configurer (optionnel)

Dans Stripe Dashboard → Settings → Notifications :
- Alertes email pour les échecs de paiement
- Alertes email pour les webhooks en erreur
- Alertes email pour les refunds

---

## ⚠️ 9. POINTS D'ATTENTION

### 9.1 Stripe Connect non utilisé

**✅ Aucune configuration Stripe Connect détectée** :
- Pas de `STRIPE_ACCOUNT` dans les variables d'environnement
- Pas de paramètre `stripeAccount` dans les appels Stripe
- Pas de header `Stripe-Account` dans les requêtes

**Conclusion** : Pas de configuration supplémentaire nécessaire pour Connect.

### 9.2 Différence entre Railway et Supabase webhook

**⚠️ IMPORTANT** : Les deux webhooks mettent à jour la table `bookings` mais avec des statuts différents :

- **Railway Express** (`server/index.ts` ligne 156) : `status: "accepted"`
- **Supabase Edge Function** (`stripe-webhook/index.ts` ligne 198) : `status: "confirmed"`

**Action** : Vérifier quel statut est attendu dans votre schéma de base de données et utiliser le webhook correspondant.

### 9.3 URLs de redirection

**✅ URLs correctes** :
- `STRIPE_SUCCESS_URL` : `https://rentanoo.com/success` (avec `?session_id={CHECKOUT_SESSION_ID}`)
- `STRIPE_CANCEL_URL` : `https://rentanoo.com/cancel`

**⚠️ Vérifier** : Que les pages `/success` et `/cancel` existent et fonctionnent correctement.

---

## 📋 10. RÉSUMÉ DES FICHIERS CONCERNÉS

### Fichiers à vérifier (pas de modification nécessaire)

1. **`supabase/functions/create-checkout-session/index.ts`**
   - Crée la session Checkout Stripe
   - Utilise `STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` (Supabase Secrets)

2. **`supabase/functions/stripe-webhook/index.ts`**
   - Reçoit les webhooks Stripe (si utilisé)
   - Utilise `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (Supabase Secrets)

3. **`server/index.ts`**
   - Route webhook Railway `/api/stripe/webhook` (si utilisé)
   - Utilise `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (Railway env vars)

4. **`server/lib/stripe.ts`**
   - Module d'initialisation Stripe côté serveur
   - Détecte automatiquement TEST vs LIVE selon la clé

5. **`src/lib/payerLocation.ts`**
   - Appelle l'Edge Function `create-checkout-session`
   - Pas de modification nécessaire

### Variables d'environnement à mettre à jour

**Supabase Secrets** (projet `zykwfjxurwmputxwlkxs`) :
- `STRIPE_SECRET_KEY` : `sk_test_...` → `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` : `whsec_...` (TEST) → `whsec_...` (LIVE)

**Railway Variables** (si webhook Railway utilisé) :
- `STRIPE_SECRET_KEY` : `sk_test_...` → `sk_live_...`
- `STRIPE_WEBHOOK_SECRET` : `whsec_...` (TEST) → `whsec_...` (LIVE)

---

## ✅ 11. CHECKLIST FINALE

### Avant le passage en LIVE

- [ ] Compte Stripe activé et vérifié
- [ ] Compte bancaire configuré pour les payouts
- [ ] Webhook LIVE créé dans Stripe Dashboard
- [ ] Variables d'environnement mises à jour (Supabase + Railway si nécessaire)
- [ ] Redéploiement effectué
- [ ] Logs vérifiés (mode LIVE confirmé)

### Tests post-go-live

- [ ] Health check Stripe : `livemode: true`
- [ ] Test paiement réel (montant faible) : ✅ Réussi
- [ ] Vérification Stripe Dashboard : Paiement visible
- [ ] Vérification base de données : Réservation mise à jour
- [ ] Vérification logs webhook : Événement traité
- [ ] Refund test : ✅ Réussi

### Monitoring (première semaine)

- [ ] Vérification quotidienne des paiements
- [ ] Vérification des échecs de paiement
- [ ] Vérification des webhooks en erreur

---

## 🆘 12. EN CAS DE PROBLÈME

### Problème : Webhook non reçu

1. Vérifier l'URL du webhook dans Stripe Dashboard
2. Vérifier que `STRIPE_WEBHOOK_SECRET` correspond au secret du webhook LIVE
3. Vérifier les logs Railway/Supabase pour les erreurs de signature
4. Tester avec Stripe CLI : `stripe trigger checkout.session.completed`

### Problème : Paiement réussi mais réservation non mise à jour

1. Vérifier les logs webhook (Railway ou Supabase)
2. Vérifier que l'événement `checkout.session.completed` est bien reçu
3. Vérifier que `bookingId` est présent dans les métadonnées de la session Stripe
4. Vérifier les logs de mise à jour de la base de données

### Problème : Erreur de signature webhook

1. Vérifier que `STRIPE_WEBHOOK_SECRET` correspond au secret du webhook LIVE (pas TEST)
2. Vérifier que le webhook est bien configuré en mode LIVE dans Stripe Dashboard
3. Vérifier que le body de la requête n'est pas modifié (express.raw pour Railway)

---

## 📝 NOTES FINALES

- **Ne jamais afficher les secrets en clair** dans les logs ou la documentation
- **Distinguer clairement TEST vs LIVE** dans Stripe Dashboard (toggle en haut à droite)
- **Tester avec de petits montants** avant de passer en production complète
- **Garder le webhook TEST actif** pour les tests de développement

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX

