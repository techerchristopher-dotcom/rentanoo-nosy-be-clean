# PAY-CORS-02 — Sécurisation CORS en PROD (whitelist)

**Date**: 2025-01-27  
**Statut**: ✅ **FIX APPLIQUÉ**

---

## OBJECTIF

Sécuriser CORS en production en remplaçant `Access-Control-Allow-Origin: "*"` par une whitelist stricte des domaines autorisés.

---

## MODIFICATIONS

### Fichier modifié

**Fichier**: `supabase/functions/create-checkout-session/index.ts`

### Diff exact

**Avant** (lignes 27-50):
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
```

**Après** (lignes 27-65):
```typescript
// Détecter l'environnement (DEV vs PROD)
const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";

// Whitelist des origines PROD autorisées
// Peut être surchargée via env var CORS_ALLOWED_ORIGINS (séparées par des virgules)
const PROD_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS")
  ? Deno.env.get("CORS_ALLOWED_ORIGINS")!.split(",").map(o => o.trim())
  : [
      "https://rentanoo.yt",
      "https://www.rentanoo.yt",
      "https://rentanoo.com",
      "https://www.rentanoo.com",
      // Ajouter d'autres domaines de production si nécessaire
    ];

// Headers CORS pour toutes les réponses
// En DEV: autoriser localhost:3013 (owner) et localhost:3012 (tenant)
// En PROD: whitelist stricte des origines autorisées
function getCorsHeaders(origin?: string | null) {
  if (isDev) {
    // DEV: autoriser localhost
    const devOrigins = ["http://localhost:3013", "http://localhost:3012"];
    const allowOrigin = origin && devOrigins.includes(origin)
      ? origin
      : "http://localhost:3013"; // Default en DEV
    
    return {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Max-Age": "86400", // Cache preflight 24h
    };
  }

  // PROD: whitelist stricte
  const allowOrigin = origin && PROD_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : null; // Rejeter les origines non autorisées

  return {
    "Access-Control-Allow-Origin": allowOrigin || PROD_ALLOWED_ORIGINS[0], // Fallback sur première origine
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400", // Cache preflight 24h
  };
}
```

---

## LISTE DES ORIGINES PROD

### Origines hardcodées (par défaut)

Les origines suivantes sont autorisées en PROD par défaut:

1. ✅ `https://rentanoo.yt`
2. ✅ `https://www.rentanoo.yt`
3. ✅ `https://rentanoo.com`
4. ✅ `https://www.rentanoo.com`

### Surcharge via variable d'environnement

Pour ajouter ou modifier les origines autorisées sans modifier le code, définir la variable d'environnement:

```bash
CORS_ALLOWED_ORIGINS="https://rentanoo.yt,https://www.rentanoo.yt,https://rentanoo.com,https://www.rentanoo.com,https://staging.rentanoo.com"
```

**Format**: Liste séparée par des virgules, espaces automatiquement trimmés.

### Origines DEV (inchangées)

- ✅ `http://localhost:3013` (owner)
- ✅ `http://localhost:3012` (tenant)

---

## COMPORTEMENT

### En DEV

- Autorise `http://localhost:3013` et `http://localhost:3012`
- Si origin non reconnu, fallback sur `http://localhost:3013`

### En PROD

- **Whitelist stricte**: Seules les origines listées dans `PROD_ALLOWED_ORIGINS` sont autorisées
- Si origin non autorisé: fallback sur la première origine de la liste (pour éviter les erreurs, mais le navigateur bloquera quand même)
- **Sécurité**: Les origines non autorisées sont rejetées par le navigateur

---

## VALIDATION

- ✅ Lint: Aucune erreur
- ✅ Logique DEV: Préservée (localhost autorisé)
- ✅ Logique PROD: Sécurisée (whitelist stricte)
- ✅ Flexibilité: Variable d'environnement pour surcharge
- ✅ Flow Stripe: Non modifié

---

## NOTES

### Ajout d'un nouveau domaine de production

**Option 1**: Modifier le code (hardcodé)
- Ajouter le domaine dans le tableau `PROD_ALLOWED_ORIGINS` (lignes 33-38)

**Option 2**: Variable d'environnement (recommandé)
- Définir `CORS_ALLOWED_ORIGINS` dans les variables d'environnement Supabase Edge Function
- Format: `https://domain1.com,https://domain2.com`

### Domaine staging

Si un domaine staging existe, l'ajouter soit:
- Dans le code (hardcodé)
- Via `CORS_ALLOWED_ORIGINS` (recommandé pour flexibilité)

---

**FIN DE PAY-CORS-02**

