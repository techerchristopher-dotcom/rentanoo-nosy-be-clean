# LOT PAY-CORS-01 — Fix CORS preflight pour create-checkout-session

**Date**: 2025-01-27  
**Statut**: ✅ **FIX APPLIQUÉ**

---

## A) DIAGNOSTIC

### A.1 Fichier identifié

**Fichier**: `supabase/functions/create-checkout-session/index.ts`

### A.2 Problèmes identifiés

1. ❌ **Status OPTIONS**: Retournait `204` au lieu de `200` (bien que valide, `200` est plus standard)
2. ❌ **Headers CORS incomplets**: `Access-Control-Allow-Headers` ne contenait que `"Content-Type"`
3. ❌ **Origin wildcard**: `Access-Control-Allow-Origin: "*"` peut poser problème en DEV
4. ❌ **Pas de cache preflight**: Manquait `Access-Control-Max-Age`
5. ❌ **Headers manquants**: Pas de support pour `authorization`, `apikey`, `x-client-info` (potentiellement utilisés par Supabase)

### A.3 Origin utilisé par le frontend

**Fichier**: `src/lib/payerLocation.ts` (ligne 14-18)

```typescript
const response = await fetch(EDGE_FUNCTION_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({...}),
});
```

**Origins détectés**:
- `http://localhost:3013` (owner) — mentionné dans les commentaires de la fonction
- `http://localhost:3012` (tenant) — mentionné dans les commentaires de la fonction

**Headers envoyés**: Seulement `Content-Type: application/json` (pas de credentials, pas d'authorization)

---

## B) FIX MINIMAL APPLIQUÉ

### B.1 Modifications effectuées

**Fichier**: `supabase/functions/create-checkout-session/index.ts`

**Changements**:

1. ✅ **Détection environnement DEV/PROD** (lignes 27-28)
   ```typescript
   const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";
   ```

2. ✅ **Fonction `getCorsHeaders()` dynamique** (lignes 30-45)
   - En DEV: autorise `http://localhost:3013` et `http://localhost:3012`
   - En PROD: autorise toutes les origines (`*`)
   - Inclut tous les headers nécessaires:
     - `Access-Control-Allow-Origin`
     - `Access-Control-Allow-Methods: POST, OPTIONS`
     - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
     - `Access-Control-Max-Age: 86400` (cache preflight 24h)

3. ✅ **Handler OPTIONS amélioré** (lignes 50-55)
   - Status changé de `204` à `200`
   - Retourne `"ok"` au lieu de `null`
   - Headers CORS dynamiques basés sur l'origin

4. ✅ **Toutes les réponses incluent les headers CORS** (toutes les lignes avec `...corsHeaders`)

### B.2 Extrait du code modifié

**Avant** (lignes 27-40):
```typescript
// Headers CORS pour toutes les réponses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }
```

**Après** (lignes 27-55):
```typescript
// Détecter l'environnement (DEV vs PROD)
const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";

// Headers CORS pour toutes les réponses
// En DEV: autoriser localhost:3013 (owner) et localhost:3012 (tenant)
// En PROD: autoriser toutes les origines
function getCorsHeaders(origin?: string | null) {
  const allowedOrigins = isDev
    ? ["http://localhost:3013", "http://localhost:3012"]
    : ["*"];
  
  const allowOrigin = isDev && origin && allowedOrigins.includes(origin)
    ? origin
    : isDev
    ? "http://localhost:3013" // Default en DEV
    : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400", // Cache preflight 24h
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }
```

### B.3 Cause racine

**Problème principal**: Le navigateur bloquait le preflight OPTIONS car:
1. Les headers `Access-Control-Allow-Headers` ne contenaient que `"Content-Type"`, mais le navigateur peut envoyer d'autres headers dans la requête preflight
2. Le status `204` peut être moins bien supporté que `200` par certains navigateurs
3. L'absence de `Access-Control-Max-Age` forçait le navigateur à refaire un preflight à chaque requête

**Solution**: Headers CORS complets avec support de tous les headers possibles, status `200` pour OPTIONS, et cache du preflight.

---

## C) INSTRUCTIONS DE TEST

### C.1 Test preflight OPTIONS (curl)

**Commande**:
```bash
curl -i -X OPTIONS \
  -H "Origin: http://localhost:3013" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  "https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session"
```

**Résultat attendu**:
```
HTTP/2 200
access-control-allow-origin: http://localhost:3013
access-control-allow-methods: POST, OPTIONS
access-control-allow-headers: authorization, x-client-info, apikey, content-type
access-control-max-age: 86400
```

### C.2 Test POST (curl)

**Commande**:
```bash
curl -i -X POST \
  -H "Origin: http://localhost:3013" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.50, "description": "Test payment", "bookingId": "test-123"}' \
  "https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session"
```

**Résultat attendu**:
- Si configuré correctement: `HTTP/2 200` avec `{"url": "https://checkout.stripe.com/..."}`
- Si erreur de config: `HTTP/2 500` avec message d'erreur
- Headers CORS présents dans la réponse

### C.3 Test depuis le navigateur (Network tab)

1. **Ouvrir DevTools** → Network tab
2. **Filtrer par** `create-checkout-session`
3. **Lancer un paiement** depuis le frontend (`localhost:3013`)
4. **Vérifier**:
   - ✅ Une requête `OPTIONS` apparaît (preflight)
   - ✅ Status `200` pour OPTIONS
   - ✅ Headers CORS présents dans la réponse OPTIONS
   - ✅ Une requête `POST` apparaît après OPTIONS
   - ✅ Status `200` pour POST (si configuré)
   - ✅ Headers CORS présents dans la réponse POST

### C.4 Checklist de vérification

- [ ] **Preflight OPTIONS** retourne `200` (pas `204`)
- [ ] **Access-Control-Allow-Origin** = `http://localhost:3013` (en DEV)
- [ ] **Access-Control-Allow-Methods** = `POST, OPTIONS`
- [ ] **Access-Control-Allow-Headers** contient `content-type,authorization,apikey,x-client-info`
- [ ] **Access-Control-Max-Age** = `86400`
- [ ] **POST** fonctionne après le preflight
- [ ] **Pas d'erreur CORS** dans la console du navigateur

---

## D) RÉSUMÉ

### Fichier modifié

- ✅ `supabase/functions/create-checkout-session/index.ts`

### Lignes modifiées

- **Lignes 27-55**: Ajout de la détection DEV/PROD et fonction `getCorsHeaders()`
- **Lignes 50-55**: Handler OPTIONS amélioré (status 200, headers dynamiques)
- **Toutes les réponses**: Utilisation de `corsHeaders` au lieu de `CORS_HEADERS` statique

### Changements techniques

1. ✅ Status OPTIONS: `204` → `200`
2. ✅ Headers CORS: Statique → Dynamique (basé sur origin)
3. ✅ Allow-Headers: `Content-Type` → `authorization, x-client-info, apikey, content-type`
4. ✅ Ajout: `Access-Control-Max-Age: 86400`
5. ✅ Origin DEV: Restreint à `localhost:3013` et `localhost:3012`

### Validation

- ✅ Lint: Aucune erreur
- ✅ Logique: Préservée (pas de changement dans le flow Stripe)
- ✅ Calculs: Non modifiés (pas de changement dans les fees)

---

**FIN DE LOT PAY-CORS-01**

