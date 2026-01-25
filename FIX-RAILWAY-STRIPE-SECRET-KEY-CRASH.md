# Fix Railway Crash : STRIPE_SECRET_KEY manquante

## 🔍 Problème identifié

L'application crashait au démarrage sur Railway avec l'erreur :
```
Error: ❌ STRIPE_SECRET_KEY manquante dans .env.local
```

**Cause racine** :
- Le fichier `src/lib/stripe.ts` lançait une erreur au **top-level** lors de l'import du module
- Le code vérifiait `process.env.STRIPE_SECRET_KEY` mais le message d'erreur mentionnait `.env.local`
- En production Railway, il n'y a pas de `.env.local`, seulement des variables d'environnement `process.env`
- Le crash se produisait **avant** même que le serveur puisse démarrer

## ✅ Corrections appliquées

### 1. Création d'un module serveur-only (`server/lib/stripe.ts`)

**Fichier créé** : `server/lib/stripe.ts`

**Caractéristiques** :
- ✅ **Lazy initialization** : ne lance jamais d'erreur au top-level
- ✅ **Gestion prod/dev** : utilise `process.env` directement (pas besoin de dotenv en prod)
- ✅ **Server-only** : ne peut pas être importé depuis le frontend (`src/`)
- ✅ **Logs de diagnostic** : affiche le type de clé (TEST/LIVE) sans révéler la clé complète

**Fonctions exportées** :
- `getStripe()` : Retourne l'instance Stripe (lazy init)
- `isStripeConfigured()` : Vérifie si la clé est présente (sans initialiser)
- `getStripeKeyType()` : Retourne "TEST" / "LIVE" / "UNKNOWN" / "NOT_CONFIGURED"

### 2. Mise à jour de `server/index.ts`

**Changements** :
- ✅ Remplacement de l'import `src/lib/stripe.ts` par `server/lib/stripe.ts`
- ✅ Chargement conditionnel de `.env.local` (uniquement en dev, si fichier existe)
- ✅ Ajout de logs au boot pour vérifier la présence de `STRIPE_SECRET_KEY`
- ✅ Utilisation de `getStripe()` dans la route `/api/stripe-health` (lazy init)

**Logs ajoutés au boot** :
```typescript
🔑 [Stripe] Configuration: ✅ Présente (mode TEST) // ou ❌ Manquante
```

### 3. Suppression de `src/lib/stripe.ts`

**Raison** :
- ✅ Évite tout risque d'import côté client (sécurité)
- ✅ Le code serveur utilise maintenant `server/lib/stripe.ts` uniquement
- ✅ Aucun import trouvé dans `src/` (vérifié)

### 4. Mise à jour de `package.json` pour Node 20

**Changement** :
```json
"engines": {
  "node": ">=20.0.0"  // était ">=18.0.0"
}
```

**Raison** : Résout les warnings `supabase-js` et améliore la compatibilité.

## 📋 Checklist Railway : Variables d'environnement requises

### Variables obligatoires pour Stripe

Ajoutez ces variables dans **Railway > Votre Service > Variables** :

| Variable | Description | Exemple | Où trouver |
|----------|-------------|---------|------------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (TEST ou LIVE) | `sk_test_51...` ou `sk_live_51...` | [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe (optionnel mais recommandé en prod) | `whsec_...` | [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks) |

### Variables Supabase (si utilisées)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SUPABASE_URL` | URL du projet Supabase | `https://tbsgzykqcksmqxpimwry.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Instructions Railway

1. **Aller dans Railway Dashboard** :
   - Ouvrir votre projet Railway
   - Sélectionner le service qui héberge l'application
   - Aller dans l'onglet **"Variables"**

2. **Ajouter `STRIPE_SECRET_KEY`** :
   - Cliquer sur **"New Variable"**
   - Nom : `STRIPE_SECRET_KEY`
   - Valeur : Votre clé secrète Stripe (commence par `sk_test_` ou `sk_live_`)
   - ⚠️ **IMPORTANT** : Ne pas inclure de guillemets ou espaces

3. **Ajouter `STRIPE_WEBHOOK_SECRET` (recommandé)** :
   - Créer un webhook dans [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - URL du webhook : `https://rentanoo.com/api/stripe/webhook`
   - Copier le "Signing secret" (commence par `whsec_`)
   - Ajouter comme variable Railway : `STRIPE_WEBHOOK_SECRET`

4. **Redéployer** :
   - Railway redéploie automatiquement après l'ajout de variables
   - Ou cliquer sur **"Redeploy"** manuellement

## 🧪 Validation après déploiement

### 1. Vérifier les logs Railway au boot

**Logs attendus** :
```
🔑 [Stripe] Configuration: ✅ Présente (mode TEST)
✅ [Stripe] Instance initialisée (mode TEST)
```

**Si erreur** :
```
🔑 [Stripe] Configuration: ❌ Manquante
⚠️ [Stripe] STRIPE_SECRET_KEY non configurée. Les routes Stripe ne fonctionneront pas.
```

### 2. Tester la route health check

```bash
curl https://rentanoo.com/api/stripe-health
```

**Réponse attendue** :
```json
{
  "ok": true,
  "stripeReady": true,
  "livemode": false  // ou true si mode LIVE
}
```

### 3. Tester un paiement Stripe

1. Aller sur `https://rentanoo.com`
2. Créer une réservation
3. Lancer un paiement test
4. Vérifier que le checkout Stripe s'affiche
5. Vérifier que la redirection après paiement fonctionne

## 🔒 Sécurité

### ✅ Bonnes pratiques appliquées

- ✅ **Server-only** : Le module Stripe est dans `server/lib/` et ne peut pas être importé côté client
- ✅ **Lazy initialization** : Pas d'erreur au top-level, initialisation uniquement quand nécessaire
- ✅ **Logs sécurisés** : Affiche le type de clé (TEST/LIVE) mais jamais la clé complète
- ✅ **Gestion d'erreurs** : Messages d'erreur clairs pour faciliter le debugging

### ⚠️ À ne jamais faire

- ❌ Ne jamais exposer `STRIPE_SECRET_KEY` dans le frontend
- ❌ Ne jamais commiter `.env.local` dans Git
- ❌ Ne jamais logger la clé complète dans les logs

## 📝 Résumé des fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `server/lib/stripe.ts` | ✅ Créé | Module serveur-only avec lazy initialization |
| `server/index.ts` | ✅ Modifié | Import du nouveau module + logs au boot |
| `src/lib/stripe.ts` | ✅ Supprimé | Ancien module qui causait le crash |
| `package.json` | ✅ Modifié | Node >= 20.0.0 |

## 🚀 Prochaines étapes

1. ✅ Ajouter `STRIPE_SECRET_KEY` dans Railway Variables
2. ✅ Redéployer sur Railway
3. ✅ Vérifier les logs au boot
4. ✅ Tester la route `/api/stripe-health`
5. ✅ Tester un paiement complet

---

**Date** : 2025-01-XX  
**Auteur** : Auto (Cursor AI)  
**Status** : ✅ Corrections appliquées et prêtes pour déploiement

