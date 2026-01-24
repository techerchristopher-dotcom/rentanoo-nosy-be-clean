# Fix Redirection www → non-www (301) - Railway + Express

## 🔍 Problème

**Symptôme** :
- ✅ `https://rentanoo.com/success?session_id=test` fonctionne
- ❌ `https://www.rentanoo.com/success?session_id=test` ne fonctionne pas (crash)
- Certaines redirections Stripe reviennent sur `www` et cassent la page success

**Cause** : Pas de redirection 301 de `www.rentanoo.com` vers `rentanoo.com` (domaine canonique).

## ✅ Solution appliquée

### 1. Configuration trust proxy

**Fichier** : `server/index.ts`  
**Ajout** : `app.set("trust proxy", true);`

**Pourquoi** : Railway est derrière un proxy. Sans `trust proxy`, `req.hostname` peut être incorrect en production.

### 2. Middleware de redirection www → non-www

**Fichier** : `server/index.ts`  
**Position** : Juste après `trust proxy` et `cors()`, AVANT toutes les routes

**Code ajouté** :
```typescript
// Redirection www → non-www (canonique: https://rentanoo.com)
// DOIT être déclaré AVANT toutes les routes pour capturer toutes les requêtes www
app.use((req, res, next) => {
  const host = req.hostname || req.get("host") || "";
  
  // Rediriger www.rentanoo.com vers rentanoo.com
  if (host === "www.rentanoo.com") {
    const protocol = req.protocol || "https"; // Railway termine TLS en amont
    const canonicalUrl = `${protocol}://rentanoo.com${req.originalUrl || req.url}`;
    
    console.log(`🔄 [Redirect] www → non-www: ${host}${req.originalUrl} → ${canonicalUrl}`);
    return res.redirect(301, canonicalUrl);
  }
  
  // Pas de redirection nécessaire, continuer
  next();
});
```

**Caractéristiques** :
- ✅ Redirection 301 (permanent redirect, bon pour SEO)
- ✅ Conserve le path complet (`req.originalUrl` inclut path + query string)
- ✅ Utilise HTTPS (Railway termine TLS en amont)
- ✅ Log pour debug
- ✅ Ne crée pas de boucle (vérifie uniquement `www.rentanoo.com`)

### 3. Ordre des middlewares

**Ordre actuel** (correct) :
1. `trust proxy` - Configuration Railway
2. `cors()` - Headers CORS
3. **Redirection www → non-www** - Middleware de redirection
4. Routes API (`/api/*`)
5. `express.static()` - Fichiers statiques (production)
6. Fallback SPA (`*splat`) - Routes React Router

## 🧪 Tests

### Test 1 : Redirection www → non-www

```bash
curl -I https://www.rentanoo.com/success?session_id=test
```

**Résultat attendu** :
```
HTTP/1.1 301 Moved Permanently
Location: https://rentanoo.com/success?session_id=test
```

### Test 2 : Non-www fonctionne toujours

```bash
curl -I https://rentanoo.com/success?session_id=test
```

**Résultat attendu** :
```
HTTP/1.1 200 OK
Content-Type: text/html
```

### Test 3 : Redirection avec path complexe

```bash
curl -I "https://www.rentanoo.com/me/renter/bookings?afterPayment=1&filter=active"
```

**Résultat attendu** :
```
HTTP/1.1 301 Moved Permanently
Location: https://rentanoo.com/me/renter/bookings?afterPayment=1&filter=active
```

### Test 4 : Routes API ne sont pas redirigées (si www)

```bash
curl -I https://www.rentanoo.com/api/stripe-health
```

**Résultat attendu** :
```
HTTP/1.1 301 Moved Permanently
Location: https://rentanoo.com/api/stripe-health
```

**Note** : Les routes API sont aussi redirigées (normal, elles sont sur le même domaine). Le handler API s'exécutera après la redirection.

### Test 5 : Paiement Stripe complet

1. Lancer un paiement test sur rentanoo.com
2. Compléter le paiement sur Stripe Checkout
3. **Vérifier** : Si Stripe redirige vers `www.rentanoo.com/success?session_id=...`, la redirection 301 doit fonctionner
4. **Résultat attendu** : Redirection vers `rentanoo.com/success?session_id=...` puis page PaymentSuccess s'affiche

## 🔧 Vérification STRIPE_SUCCESS_URL

### Configuration requise

**Variable d'environnement Supabase** : `STRIPE_SUCCESS_URL`

**Valeur correcte** :
```
STRIPE_SUCCESS_URL=https://rentanoo.com/success
```

**Valeur incorrecte** (à éviter) :
```
STRIPE_SUCCESS_URL=https://www.rentanoo.com/success  ❌
```

### Vérification

**Dans Supabase Dashboard** :
1. Aller dans Project Settings → Edge Functions → Secrets
2. Vérifier que `STRIPE_SUCCESS_URL=https://rentanoo.com/success` (sans www)

**Via CLI** :
```bash
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE_SUCCESS_URL
```

### Correction si nécessaire

```bash
supabase secrets set STRIPE_SUCCESS_URL=https://rentanoo.com/success --project-ref tbsgzykqcksmqxpimwry
```

**Note** : Même si `STRIPE_SUCCESS_URL` contient `www`, la redirection 301 côté serveur corrigera le problème. Mais il est préférable d'utiliser directement le domaine canonique.

## 🚀 Déploiement Railway

### Option 1 : Auto-deploy (si activé)

```bash
git add server/index.ts
git commit -m "Fix: Redirection 301 www → non-www + trust proxy Railway"
git push origin main
```

Railway redéploiera automatiquement.

### Option 2 : Redeploy manuel

1. Commit et push (voir Option 1)
2. Sur Railway Dashboard → Redeploy

## ✅ Validation après déploiement

### 1. Vérifier les logs Railway

Dans Railway Dashboard → Logs, chercher :
- ✅ `🔄 [Redirect] www → non-www: www.rentanoo.com/... → https://rentanoo.com/...`
- ✅ Pas d'erreur de redirection

### 2. Tests en production

#### Test 1 : Redirection www
```bash
curl -I https://www.rentanoo.com/success?session_id=test
```
**Attendu** : `301` avec `Location: https://rentanoo.com/success?session_id=test`

#### Test 2 : Non-www fonctionne
```bash
curl -I https://rentanoo.com/success?session_id=test
```
**Attendu** : `200 OK`

#### Test 3 : Paiement complet
1. Lancer un paiement test
2. Compléter sur Stripe Checkout
3. Vérifier que la redirection fonctionne même si Stripe renvoie vers www

## 🚨 Troubleshooting

### Problème : Redirection ne fonctionne pas

**Vérifications** :
1. ✅ Vérifier que `trust proxy` est configuré
2. ✅ Vérifier que le middleware est AVANT toutes les routes
3. ✅ Vérifier les logs Railway pour voir si le middleware s'exécute
4. ✅ Vérifier que Railway a bien redéployé

### Problème : Boucle de redirection

**Cause** : Le middleware redirige aussi `rentanoo.com` vers `rentanoo.com`

**Solution** : Vérifier que la condition est bien `host === "www.rentanoo.com"` (pas `host.includes("www")`)

### Problème : Query string perdue

**Cause** : Utilisation de `req.url` au lieu de `req.originalUrl`

**Solution** : Utiliser `req.originalUrl` qui inclut path + query string

### Problème : Routes API cassées

**Vérification** : Les routes API sont définies APRÈS le middleware de redirection, donc elles fonctionnent normalement. La redirection se fait avant, mais c'est normal pour unifier le domaine.

## 📊 Résumé

- **Problème** : `www.rentanoo.com` ne fonctionne pas, casse les redirections Stripe
- **Solution** : Redirection 301 `www.rentanoo.com` → `rentanoo.com` avec conservation du path + query string
- **Fichier modifié** : `server/index.ts` (ajout trust proxy + middleware redirection)
- **Impact** : Toutes les requêtes `www` sont redirigées vers le domaine canonique
- **SEO** : Redirection 301 permanente (bon pour le référencement)

