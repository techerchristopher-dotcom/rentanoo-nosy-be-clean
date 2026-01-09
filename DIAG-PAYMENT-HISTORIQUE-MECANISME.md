# Diagnostic: Historique du mécanisme de paiement Stripe Checkout

**Date**: 2025-01-XX  
**Mode**: DIAG uniquement (pas de fix)  
**Objectif**: Identifier l'ancien mécanisme de création de session Stripe avant l'introduction de l'Edge Function

---

## Résumé exécutif

**Conclusion**: Il n'y a **jamais eu d'endpoint Express** `/api/create-checkout-session` dans ce repo. L'Edge Function `create-checkout-session` a toujours été utilisée depuis le commit initial. Le changement principal concerne la méthode d'appel côté front : passage de `fetch` direct (sans auth) à `supabase.functions.invoke()` (avec auth automatique).

---

## 1) Ancien mécanisme (commit initial 388397c)

### Fichier: `src/lib/payerLocation.ts`

**Code original**:
```typescript
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-checkout-session`;

export async function payerLocation(reservation: ReservationPayment) {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: reservation.totalTTC,
      description: `Location de ${reservation.voiture}`,
      bookingId: reservation.id,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  window.location.href = data.url;
}
```

### Caractéristiques

- ✅ **Endpoint**: Edge Function Supabase (`/functions/v1/create-checkout-session`)
- ❌ **Authentification**: **AUCUNE** (pas de headers `Authorization` ni `apikey`)
- ✅ **Méthode**: `fetch` direct
- ✅ **Body**: JSON avec `amount`, `description`, `bookingId`

### Problèmes identifiés

1. **Pas d'authentification**: Le front n'envoyait pas de token JWT
2. **Gestion d'erreur basique**: Pas de logs détaillés
3. **Pas de vérification de session**: Pas de vérification que l'utilisateur est connecté

---

## 2) Nouveau mécanisme (commit 3a68338)

### Fichier: `src/lib/payerLocation.ts`

**Code actuel**:
```typescript
export async function payerLocation(reservation: ReservationPayment) {
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

  if (error) {
    throw new Error(error.message || `Erreur lors de la création de la session`);
  }

  window.location.href = data.url;
}
```

### Caractéristiques

- ✅ **Endpoint**: Edge Function Supabase (identique)
- ✅ **Authentification**: **AUTOMATIQUE** via `supabase.functions.invoke()` (ajoute `Authorization: Bearer <token>` et `apikey`)
- ✅ **Méthode**: `supabase.functions.invoke()` (wrapper autour de `fetch`)
- ✅ **Vérification de session**: Vérifie que l'utilisateur est connecté avant l'appel
- ✅ **Logs améliorés**: Logs DEV-only pour debug

---

## 3) Historique Git

### Commits pertinents

| Commit | Date | Message | Changement |
|--------|------|---------|------------|
| `388397c` | 2025-12-14 | Initial commit | Création du repo avec Edge Function + `fetch` direct |
| `3a68338` | 2025-01-XX | fix: Stripe payment 401 + diagnostics | Migration vers `supabase.functions.invoke()` + auth |

### Différence entre les deux versions

```diff
- const response = await fetch(EDGE_FUNCTION_URL, {
-   method: "POST",
-   headers: {
-     "Content-Type": "application/json",
-   },
-   body: JSON.stringify({...}),
- });
+ const { data, error } = await supabase.functions.invoke("create-checkout-session", {
+   body: {...},
+ });
```

**Changements clés**:
1. ✅ Ajout de la vérification de session (`getSession()`)
2. ✅ Remplacement de `fetch` par `supabase.functions.invoke()`
3. ✅ Authentification automatique (headers `Authorization` et `apikey` ajoutés automatiquement)
4. ✅ Gestion d'erreur améliorée avec logs DEV-only

---

## 4) Endpoint Express: jamais existé

### Commentaire dans `server/index.ts` (lignes 511-514)

```typescript
// ⚠️ ENDPOINT OBSOLÈTE - Migré vers Supabase Edge Function
// L'endpoint /api/create-checkout-session a été remplacé par la Supabase Edge Function
// déployée à: https://zykwfjxurwmputxwlkxs.functions.supabase.co/create-checkout-session
// Le frontend utilise maintenant payerLocation() dans src/lib/payerLocation.ts
```

### Analyse

- ❌ **Aucune trace** d'un endpoint Express `/api/create-checkout-session` dans l'historique Git
- ❌ **Aucune route** `app.post("/api/create-checkout-session", ...)` dans `server/index.ts` (ni dans le commit initial, ni dans les commits suivants)
- ✅ Le commentaire fait probablement référence à un **autre projet** (lagon-car-share) ou à une **intention non implémentée**

### Routes Express existantes dans `server/index.ts`

1. ✅ `/api/stripe/webhook` (POST) - Webhook Stripe pour `checkout.session.completed`
2. ✅ `/api/stripe-health` (GET) - Health check Stripe
3. ✅ `/api/checkin/start` (POST) - Démarrer un état des lieux
4. ✅ `/api/checkin/saveDraft` (POST) - Sauvegarder un brouillon d'état des lieux

**Aucune route** pour créer une session checkout.

---

## 5) Edge Function: toujours présente

### Historique de `supabase/functions/create-checkout-session/index.ts`

| Commit | État |
|--------|------|
| `388397c` (initial) | ✅ Edge Function créée |
| `603499a` | ✅ Edge Function présente |
| `3a68338` | ✅ Edge Function présente + logs améliorés |

**Conclusion**: L'Edge Function a **toujours existé** depuis le commit initial. Il n'y a pas eu de migration depuis un endpoint Express vers l'Edge Function dans ce repo.

---

## 6) Ce qui manque maintenant (vs ancien mécanisme)

### Variables d'environnement requises

L'Edge Function nécessite (depuis le début):

1. **STRIPE_SECRET_KEY** (ligne 182)
   - Utilisé via `Deno.env.get("STRIPE_SECRET_KEY")`
   - Vérifié ligne 196: `if (!stripeSecret)`

2. **STRIPE_SUCCESS_URL** (ligne 221)
   - Utilisé via `Deno.env.get("STRIPE_SUCCESS_URL")`
   - Vérifié ligne 224: `if (!successUrl || !cancelUrl)`

3. **STRIPE_CANCEL_URL** (ligne 222)
   - Utilisé via `Deno.env.get("STRIPE_CANCEL_URL")`
   - Vérifié ligne 224: `if (!successUrl || !cancelUrl)`

### Différences d'authentification

| Aspect | Ancien (fetch direct) | Nouveau (supabase.functions.invoke) |
|--------|---------------------|-------------------------------------|
| **Headers Authorization** | ❌ Absent | ✅ Automatique (Bearer token) |
| **Headers apikey** | ❌ Absent | ✅ Automatique (VITE_SUPABASE_ANON_KEY) |
| **Vérification session** | ❌ Absente | ✅ Vérifiée avant l'appel |
| **Gestion erreur 401** | ❌ Pas gérée | ✅ Gérée par Supabase client |

### Problèmes potentiels

1. **Secrets Supabase**: Les secrets doivent être configurés dans Supabase Dashboard → Edge Functions → Secrets
2. **Project ref**: Vérifier que les secrets sont configurés pour le bon projet (`tbsgzykqcksmqxpimwry`)
3. **Redéploiement**: Si les secrets ont été ajoutés récemment, redéployer l'Edge Function

---

## 7) Comparaison: Ancien vs Nouveau

### Ancien mécanisme (fetch direct)

**Avantages**:
- ✅ Simple (pas de dépendance Supabase client)
- ✅ Contrôle total sur les headers

**Inconvénients**:
- ❌ Pas d'authentification (401 probable)
- ❌ Pas de vérification de session
- ❌ Gestion d'erreur basique

### Nouveau mécanisme (supabase.functions.invoke)

**Avantages**:
- ✅ Authentification automatique
- ✅ Vérification de session avant l'appel
- ✅ Logs améliorés (DEV-only)
- ✅ Gestion d'erreur améliorée

**Inconvénients**:
- ⚠️ Dépendance Supabase client
- ⚠️ Moins de contrôle sur les headers (mais suffisant)

---

## 8) Conclusion

### Réponses aux questions

1. **Ancien endpoint**: ❌ **Aucun endpoint Express**. L'Edge Function a toujours été utilisée.
2. **Nouveau endpoint**: ✅ Edge Function Supabase (identique, mais appel différemment)
3. **Quand/quel commit**: Commit `3a68338` - Migration de `fetch` direct vers `supabase.functions.invoke()`
4. **Ce qui manque maintenant**:
   - ✅ Secrets Supabase: `STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
   - ✅ Vérification que les secrets sont configurés pour le bon projet (`tbsgzykqcksmqxpimwry`)
   - ✅ Redéploiement de l'Edge Function si les secrets ont été ajoutés récemment

### Prochaines étapes (diagnostic)

1. ✅ Vérifier les secrets dans Supabase Dashboard → Edge Functions → Secrets
2. ✅ Tester le mode self-check (header `X-Diagnostic: 1`)
3. ✅ Observer les logs Supabase pour identifier la cause exacte du non-2xx
4. ⏳ Identifier le status exact (401/500/400) et la branche prise dans l'Edge Function

---

## 9) Références

- **Ancien code**: `git show 388397c:src/lib/payerLocation.ts`
- **Nouveau code**: `src/lib/payerLocation.ts` (actuel)
- **Edge Function**: `supabase/functions/create-checkout-session/index.ts`
- **Commentaire obsolète**: `server/index.ts` lignes 511-514

---

**Note**: Le commentaire dans `server/index.ts` mentionnant un endpoint Express obsolète est probablement un copier-coller d'un autre projet ou une intention non implémentée. Aucune trace d'un tel endpoint n'existe dans l'historique Git de ce repo.

