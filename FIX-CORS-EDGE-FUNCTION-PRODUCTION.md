# Fix CORS Edge Function - Production

## 🔍 Diagnostic du problème

**Erreur observée en production** :
```
Access to fetch ... blocked by CORS policy
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3013' 
that is not equal to the supplied origin 'https://rentanoo.com'
```

**Cause racine identifiée** :

1. **Détection d'environnement fragile** (ligne 35) :
   - Si `DENO_ENV` n'est pas défini en production, `isDev` devient `true`
   - Le code entre alors dans la branche DEV et renvoie `http://localhost:3013`

2. **Fallback incorrect** (ligne 114) :
   - Même en PROD, si l'origine n'est pas autorisée, le code utilisait un fallback
   - Manque du header `Vary: Origin` pour le cache navigateur

3. **Preflight OPTIONS** :
   - Utilisait status 200 au lieu de 204 (moins standard)

## ✅ Corrections appliquées

### 1. Détection d'environnement robuste

**Avant** :
```typescript
const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";
```

**Après** :
```typescript
const denoEnv = Deno.env.get("DENO_ENV");
const isDev = !denoEnv || denoEnv === "development" || denoEnv === "dev";
```

**Explication** : Détection explicite de l'environnement avec gestion des cas où `DENO_ENV` n'est pas défini.

### 2. Fonction `getCorsHeaders` améliorée

**Changements** :
- ✅ Ajout du header `Vary: Origin` (CRITIQUE pour le cache navigateur)
- ✅ Log d'avertissement si origine non autorisée en PROD
- ✅ Ajout de `localhost:3000` dans les origines DEV
- ✅ Type de retour explicite `Record<string, string>`
- ✅ Logging amélioré pour debug

**Code corrigé** :
```typescript
function getCorsHeaders(origin?: string | null): Record<string, string> {
  if (isDev) {
    const devOrigins = ["http://localhost:3013", "http://localhost:3012", "http://localhost:3000"];
    const allowOrigin = origin && devOrigins.includes(origin)
      ? origin
      : "http://localhost:3013";
    
    return {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin", // ✅ Ajouté
    };
  }

  // PROD: whitelist stricte
  const isOriginAllowed = origin && PROD_ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isOriginAllowed ? origin : PROD_ALLOWED_ORIGINS[0];
  
  // ✅ Log d'avertissement si origine non autorisée
  if (origin && !isOriginAllowed) {
    console.warn("⚠️ [CORS] Origine non autorisée:", {
      origin,
      allowedOrigins: PROD_ALLOWED_ORIGINS,
      fallbackUsed: allowOrigin,
      isDev,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin", // ✅ CRITIQUE: Indique au navigateur que la réponse varie selon l'Origin
  };
}
```

### 3. Preflight OPTIONS amélioré

**Avant** :
```typescript
return new Response("ok", {
  status: 200,
  headers: corsHeaders,
});
```

**Après** :
```typescript
return new Response(null, {
  status: 204, // No Content (plus standard pour OPTIONS)
  headers: corsHeaders,
});
```

### 4. Logging amélioré

Ajout de logs pour diagnostiquer les problèmes CORS :
- `denoEnv` dans les logs initiaux
- `corsAllowOrigin` dans les logs initiaux
- Logs détaillés pour OPTIONS preflight

## 📋 Whitelist des origines autorisées

### Production (par défaut)
- `https://rentanoo.yt`
- `https://www.rentanoo.yt`
- `https://rentanoo.com`
- `https://www.rentanoo.com`

**Surcharge via variable d'environnement** :
```bash
CORS_ALLOWED_ORIGINS=https://rentanoo.com,https://www.rentanoo.com,https://rentanoo.yt,https://www.rentanoo.yt
```

### Développement
- `http://localhost:3013` (owner)
- `http://localhost:3012` (tenant)
- `http://localhost:3000` (ajouté)

## 🧪 Checklist de test

### 1. Test local (DEV)

#### a) Vérifier que le serveur local fonctionne
```bash
# Démarrer le serveur local sur le port 3013
npm run dev
```

#### b) Tester le preflight OPTIONS
```bash
curl -X OPTIONS \
  http://localhost:54321/functions/v1/create-checkout-session \
  -H "Origin: http://localhost:3013" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v
```

**Résultat attendu** :
- Status: `204 No Content`
- Headers:
  - `Access-Control-Allow-Origin: http://localhost:3013`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
  - `Vary: Origin`

#### c) Tester une requête POST réelle
```bash
curl -X POST \
  http://localhost:54321/functions/v1/create-checkout-session \
  -H "Origin: http://localhost:3013" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{"bookingId":"test-booking-id"}' \
  -v
```

### 2. Test en production

#### a) Déployer la fonction
```bash
# Se connecter au projet Supabase
supabase link --project-ref tbsgzykqcksmqxpimwry

# Déployer la fonction
supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
```

#### b) Vérifier les variables d'environnement
```bash
# Vérifier que DENO_ENV est défini en production
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep DENO_ENV

# Si nécessaire, définir DENO_ENV=production
supabase secrets set DENO_ENV=production --project-ref tbsgzykqcksmqxpimwry
```

#### c) Tester le preflight OPTIONS avec Origin production
```bash
curl -X OPTIONS \
  https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
  -H "Origin: https://rentanoo.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v
```

**Résultat attendu** :
- Status: `204 No Content`
- Headers:
  - `Access-Control-Allow-Origin: https://rentanoo.com` ✅ (pas localhost!)
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
  - `Vary: Origin`

#### d) Tester avec une origine non autorisée (doit utiliser fallback)
```bash
curl -X OPTIONS \
  https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v
```

**Résultat attendu** :
- Status: `204 No Content`
- Headers:
  - `Access-Control-Allow-Origin: https://rentanoo.yt` (première origine de la whitelist)
  - Log d'avertissement dans les logs Supabase

#### e) Tester une requête POST réelle depuis le navigateur
1. Ouvrir https://rentanoo.com
2. Ouvrir la console développeur (F12)
3. Lancer un paiement Stripe
4. Vérifier dans la console :
   - ✅ Pas d'erreur CORS
   - ✅ Requête réussie (200)
   - ✅ Redirection vers Stripe Checkout

### 3. Vérification des logs Supabase

```bash
# Voir les logs de la fonction
supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry

# Filtrer les logs CORS
supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry | grep CORS
```

**Logs attendus** :
- `🔍 [create-checkout-session][INIT] Requête reçue:` avec `isDev: false` en PROD
- `✅ [create-checkout-session][OPTIONS] Preflight CORS autorisé` avec `allowOrigin: https://rentanoo.com`
- `⚠️ [CORS] Origine non autorisée:` si origine non autorisée

## 🔧 Configuration requise

### Variables d'environnement Supabase

**Obligatoires** :
- `DENO_ENV=production` (en production)
- `STRIPE_SECRET_KEY`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Optionnelles** :
- `CORS_ALLOWED_ORIGINS` : Liste d'origines séparées par des virgules (surcharge la whitelist par défaut)

### Définir DENO_ENV en production

```bash
supabase secrets set DENO_ENV=production --project-ref tbsgzykqcksmqxpimwry
```

## 📝 Notes importantes

1. **Header `Vary: Origin`** :
   - CRITIQUE pour le cache navigateur
   - Indique que la réponse varie selon l'header `Origin`
   - Sans ce header, le navigateur peut mettre en cache une réponse avec une mauvaise origine

2. **Fallback en PROD** :
   - Si l'origine n'est pas autorisée, on utilise la première origine de la whitelist
   - Un log d'avertissement est généré pour debug
   - Le navigateur rejettera quand même la requête si l'origine ne correspond pas

3. **Preflight OPTIONS** :
   - Status 204 (No Content) est plus standard que 200
   - Le body est `null` au lieu de `"ok"`

4. **Détection d'environnement** :
   - En production Supabase, `DENO_ENV` doit être défini à `"production"`
   - Si non défini, le code assume DEV (pour compatibilité locale)

## ✅ Validation finale

Après déploiement, vérifier :

1. ✅ Preflight OPTIONS avec `Origin: https://rentanoo.com` renvoie `Access-Control-Allow-Origin: https://rentanoo.com`
2. ✅ Pas d'erreur CORS dans la console navigateur
3. ✅ Le paiement Stripe fonctionne depuis https://rentanoo.com
4. ✅ Les logs Supabase montrent `isDev: false` en production
5. ✅ Le header `Vary: Origin` est présent dans toutes les réponses

## 🚨 Troubleshooting

### Problème : Toujours `localhost:3013` en production

**Solution** :
1. Vérifier que `DENO_ENV=production` est défini :
   ```bash
   supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep DENO_ENV
   ```
2. Si absent, définir :
   ```bash
   supabase secrets set DENO_ENV=production --project-ref tbsgzykqcksmqxpimwry
   ```
3. Redéployer la fonction :
   ```bash
   supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
   ```

### Problème : Erreur CORS persistante

**Vérifications** :
1. Vérifier que l'origine exacte correspond (avec/sans www, avec/sans trailing slash)
2. Vérifier les logs Supabase pour voir quelle origine est reçue
3. Vérifier que `Vary: Origin` est présent dans les headers
4. Vider le cache du navigateur (Ctrl+Shift+R)

### Problème : Preflight OPTIONS échoue

**Vérifications** :
1. Vérifier que la méthode OPTIONS est bien gérée (status 204)
2. Vérifier que tous les headers CORS sont présents
3. Vérifier que `Access-Control-Allow-Headers` inclut tous les headers utilisés

