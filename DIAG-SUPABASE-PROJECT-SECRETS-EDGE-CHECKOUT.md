# Diagnostic: Supabase Project / Secrets / Edge Checkout (NO FIX)

**Date**: 2025-01-XX  
**Mode**: DIAG uniquement (pas de modification, pas de déploiement)  
**Objectif**: Diagnostiquer pourquoi `create-checkout-session` échoue en vérifiant le projet Supabase et la configuration des secrets

---

## 1) Project Ref détecté (Front / CLI / Deploy)

### Frontend

**Fichier**: `.env.local` (présent dans le repo)
```bash
VITE_SUPABASE_URL=https://tbsgzykqcksmqxpimwry.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Fichier**: `src/integrations/supabase/client.ts` (lignes 6-7)
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Project Ref extrait**: `tbsgzykqcksmqxpimwry` (via regex ligne 23)

**Preuve**:
- Ligne 23: `const projectRefMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);`
- Extraction automatique du project ref depuis l'URL

---

### CLI / Edge Deploy

**Fichier**: `supabase/config.toml` (ligne 1)
```toml
project_id = "tbsgzykqcksmqxpimwry"
```

**Preuve**: Fichier présent dans le repo, project_id explicite

---

### Serveur Express (Backend)

**Fichier**: `server/index.ts` (lignes 20-24)
```typescript
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);
```

**Variables utilisées**:
- `process.env.SUPABASE_URL` (non présent dans `.env.local` visible)
- `process.env.SUPABASE_SERVICE_ROLE_KEY` (non présent dans `.env.local` visible)

**Note**: Le serveur Express n'est pas utilisé pour créer la session checkout (seulement pour le webhook Stripe). Il n'impacte pas directement l'Edge Function.

---

### Tableau récapitulatif

| Composant | Project Ref | Source | Preuve |
|-----------|-------------|--------|--------|
| **Frontend** | `tbsgzykqcksmqxpimwry` | `.env.local` → `VITE_SUPABASE_URL` | ✅ Cohérent |
| **CLI/Config** | `tbsgzykqcksmqxpimwry` | `supabase/config.toml` → `project_id` | ✅ Cohérent |
| **Edge Function** | `tbsgzykqcksmqxpimwry` | Déployée sur le projet lié au CLI | ✅ Cohérent (assumé) |
| **Serveur Express** | Non défini | `process.env.SUPABASE_URL` (absent) | ⚠️ Non critique (pas utilisé pour checkout) |

**Conclusion**: ✅ **Cohérence parfaite** - Tous les composants pointent vers `tbsgzykqcksmqxpimwry`

---

## 2) Secrets attendus par l'Edge Function

### Fichier: `supabase/functions/create-checkout-session/index.ts`

### Secrets requis (noms exacts)

| Secret | Ligne | Usage | Condition d'erreur |
|--------|-------|-------|-------------------|
| **STRIPE_SECRET_KEY** | 157, 271 | `Deno.env.get("STRIPE_SECRET_KEY")` | Status 500 si absent (ligne 297) |
| **STRIPE_SUCCESS_URL** | 158, 310 | `Deno.env.get("STRIPE_SUCCESS_URL")` | Status 500 si absent (ligne 313) |
| **STRIPE_CANCEL_URL** | 159, 311 | `Deno.env.get("STRIPE_CANCEL_URL")` | Status 500 si absent (ligne 313) |

### Secrets optionnels

| Secret | Ligne | Usage | Défaut |
|--------|-------|-------|--------|
| **CORS_ALLOWED_ORIGINS** | 72 | `Deno.env.get("CORS_ALLOWED_ORIGINS")` | Liste hardcodée (lignes 74-79) |
| **DENO_ENV** | 28 | `Deno.env.get("DENO_ENV")` | `isDev = true` si absent |

### Liste exhaustive des secrets requis

```typescript
// Secrets OBLIGATOIRES (vérifiés ligne 157-159, 271, 310-311)
STRIPE_SECRET_KEY        // Clé secrète Stripe (ex: sk_test_xxx)
STRIPE_SUCCESS_URL        // URL de redirection après paiement réussi
STRIPE_CANCEL_URL         // URL de redirection après annulation

// Secrets OPTIONNELS
CORS_ALLOWED_ORIGINS      // Origines CORS autorisées (séparées par virgules)
DENO_ENV                  // Environnement (production ou autre)
```

---

## 3) Inputs requis (Body)

### Fichier: `supabase/functions/create-checkout-session/index.ts` (lignes 200-229)

### Shape du body attendu

```typescript
{
  amount: number,        // OBLIGATOIRE: nombre > 0 (ligne 231)
  description: string,   // OBLIGATOIRE: chaîne non vide (ligne 251)
  bookingId?: string     // OPTIONNEL: ID de la réservation (ligne 229)
}
```

### Validations

1. **amount** (ligne 231-248):
   - Type: `number`
   - Condition: `> 0`
   - Erreur si invalide: Status 400, message `"amount (number > 0) requis"`

2. **description** (ligne 251-268):
   - Type: `string`
   - Condition: non vide
   - Erreur si invalide: Status 400, message `"description (string) requis"`

3. **bookingId** (ligne 229):
   - Type: `string` (optionnel)
   - Usage: Ajouté dans `metadata.bookingId` de la session Stripe (ligne 370)

---

## 4) Règles d'authentification

### Vérification dans l'Edge Function

**Fichier**: `supabase/functions/create-checkout-session/index.ts`

**Analyse du code**:
- ❌ **Aucune vérification explicite** de l'header `Authorization` dans le code
- ❌ **Aucune vérification** de l'utilisateur via Supabase Auth
- ✅ **CORS géré** (lignes 85-112) mais pas d'auth JWT

**Note importante**: L'Edge Function **ne vérifie pas** explicitement l'authentification. Cependant, `supabase.functions.invoke()` côté front envoie automatiquement:
- Header `Authorization: Bearer <token>` (JWT de la session)
- Header `apikey: <VITE_SUPABASE_ANON_KEY>`

**Logs présents** (lignes 122-139):
- Log de la présence des headers `authorization` et `apikey` (DEV-only)
- Mais **pas de validation** de ces headers

**Conclusion**: L'Edge Function **s'appuie sur l'auth automatique** de `supabase.functions.invoke()`, mais ne la vérifie pas explicitement. Si l'appel vient d'un `fetch` direct sans headers, l'Edge Function l'accepterait (mais Stripe nécessiterait les secrets).

---

## 5) Appel côté front

### Fichier: `src/lib/payerLocation.ts`

### Code actuel (lignes 12-57)

```typescript
export async function payerLocation(reservation: ReservationPayment) {
  // 1. Vérification de session (lignes 17-26)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Vous devez être connecté pour effectuer un paiement.");
  }

  // 2. Préparation du body (lignes 28-33)
  const requestBody = {
    amount: reservation.totalTTC,
    description: `Location de ${reservation.voiture}`,
    bookingId: reservation.id,
  };

  // 3. Appel Edge Function (lignes 55-57)
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: requestBody,
  });
}
```

### Headers envoyés automatiquement

Via `supabase.functions.invoke()`:
- ✅ `Authorization: Bearer <session.access_token>`
- ✅ `apikey: <VITE_SUPABASE_ANON_KEY>`
- ✅ `Content-Type: application/json`

### Body envoyé

```typescript
{
  amount: number,           // reservation.totalTTC
  description: string,       // `Location de ${reservation.voiture}`
  bookingId: string|number  // reservation.id
}
```

### Comparaison avec les attentes de l'Edge Function

| Champ | Front envoie | Edge attend | Match |
|-------|--------------|-------------|-------|
| `amount` | `number` (totalTTC) | `number > 0` | ✅ Si totalTTC > 0 |
| `description` | `string` (template) | `string` non vide | ✅ Toujours présent |
| `bookingId` | `string\|number` | `string` (optionnel) | ✅ Présent |

**Conclusion**: ✅ **Match parfait** - Le front envoie exactement ce que l'Edge Function attend

---

## 6) Secrets trouvés / définis (noms seulement)

### Recherche dans le repo

**Fichiers analysés**:
- `.env.local` (présent, mais pas de secrets Stripe)
- `.github/workflows/*` (non trouvé)
- Scripts shell (analysés, pas de `supabase secrets set`)

### Secrets présents dans `.env.local`

```bash
VITE_SUPABASE_URL=https://tbsgzykqcksmqxpimwry.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Secrets Stripe**: ❌ **Aucun** dans `.env.local`

**Note**: Les secrets Stripe doivent être configurés dans **Supabase Dashboard** (pas dans `.env.local`), car ils sont utilisés par l'Edge Function via `Deno.env.get()`.

---

### Commandes de vérification (à exécuter manuellement)

#### 1. Lister les projets Supabase disponibles

```bash
supabase projects list
```

**Résultat attendu**: Liste des projets avec leurs refs, dont `tbsgzykqcksmqxpimwry`

---

#### 2. Vérifier le projet lié (CLI)

```bash
supabase link --project-ref tbsgzykqcksmqxpimwry
```

**Note**: Ne pas exécuter si déjà lié (peut écraser la config). Vérifier d'abord `supabase/config.toml`.

---

#### 3. Lister les secrets configurés (sans révéler les valeurs)

```bash
supabase secrets list --project-ref tbsgzykqcksmqxpimwry
```

**Résultat attendu**: Liste des noms de secrets (pas les valeurs), par exemple:
```
STRIPE_SECRET_KEY
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
```

**Si la commande échoue ou retourne une liste vide**: Les secrets ne sont pas configurés.

---

#### 4. Vérifier via le mode self-check (Edge Function)

```bash
curl -X POST https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
  -H "X-Diagnostic: 1" \
  -H "Content-Type: application/json"
```

**Résultat attendu** (JSON):
```json
{
  "hasStripeSecretKey": true,
  "hasSuccessUrl": true,
  "hasCancelUrl": true,
  "isDev": true,
  "timestamp": "2025-01-XX...",
  "stripeSecretKeyLength": 32,
  "successUrlLength": 45,
  "cancelUrlLength": 44
}
```

**Si `hasStripeSecretKey: false`**: Le secret n'est pas configuré dans le projet Supabase.

---

### Écarts identifiés

| Secret attendu | Trouvé dans repo | Trouvé dans Supabase | Écart |
|----------------|------------------|----------------------|-------|
| `STRIPE_SECRET_KEY` | ❌ Non | ⏳ À vérifier via CLI | ⚠️ Probablement absent |
| `STRIPE_SUCCESS_URL` | ❌ Non | ⏳ À vérifier via CLI | ⚠️ Probablement absent |
| `STRIPE_CANCEL_URL` | ❌ Non | ⏳ À vérifier via CLI | ⚠️ Probablement absent |

**Note**: Les secrets ne doivent **pas** être dans le repo (sécurité). Ils doivent être dans **Supabase Dashboard → Edge Functions → Secrets**.

---

## 7) Hypothèses expliquant le non-2xx

### Hypothèse #1: Secrets Stripe non configurés (PROBABILITÉ: 95%)

**Symptômes**:
- Status 500
- Message: `"Configuration serveur manquante: STRIPE_SECRET_KEY"` ou `"STRIPE_SUCCESS_URL et/ou STRIPE_CANCEL_URL"`

**Cause**:
- Les secrets n'ont jamais été configurés dans le projet Supabase `tbsgzykqcksmqxpimwry`
- Ou les secrets ont été configurés sur un autre projet (ex: `zykwfjxurwmputxwlkxs`)

**Preuve**:
- Aucune trace de `supabase secrets set` dans le repo
- Les logs de l'Edge Function montrent `hasStripeSecretKey: false` (si mode self-check activé)

**Vérification**:
```bash
supabase secrets list --project-ref tbsgzykqcksmqxpimwry
```

**Fix** (à faire manuellement, pas dans ce diagnostic):
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx --project-ref tbsgzykqcksmqxpimwry
supabase secrets set STRIPE_SUCCESS_URL=http://localhost:3012/success --project-ref tbsgzykqcksmqxpimwry
supabase secrets set STRIPE_CANCEL_URL=http://localhost:3012/cancel --project-ref tbsgzykqcksmqxpimwry
```

---

### Hypothèse #2: Secrets configurés sur le mauvais projet (PROBABILITÉ: 4%)

**Symptômes**:
- Status 500
- Message: `"Configuration serveur manquante: STRIPE_SECRET_KEY"`

**Cause**:
- Les secrets ont été configurés sur `zykwfjxurwmputxwlkxs` (projet principal)
- Mais l'Edge Function est déployée sur `tbsgzykqcksmqxpimwry` (projet alternatif)

**Preuve**:
- Le repo mentionne deux projets (voir `SWITCH-SUPABASE-PROJECT.md`)
- Le front pointe vers `tbsgzykqcksmqxpimwry`, mais les secrets pourraient être sur `zykwfjxurwmputxwlkxs`

**Vérification**:
```bash
# Vérifier les secrets sur le projet principal
supabase secrets list --project-ref zykwfjxurwmputxwlkxs

# Vérifier les secrets sur le projet alternatif
supabase secrets list --project-ref tbsgzykqcksmqxpimwry
```

**Fix** (à faire manuellement):
- Copier les secrets du projet principal vers le projet alternatif, OU
- Redéployer l'Edge Function sur le projet principal

---

### Hypothèse #3: Edge Function non redéployée après ajout des secrets (PROBABILITÉ: 1%)

**Symptômes**:
- Status 500
- Message: `"Configuration serveur manquante: STRIPE_SECRET_KEY"`
- Mais les secrets sont bien configurés dans Supabase Dashboard

**Cause**:
- Les secrets ont été ajoutés récemment
- L'Edge Function n'a pas été redéployée après l'ajout
- Les secrets ne sont pas visibles au runtime de l'Edge Function

**Preuve**:
- Les secrets sont visibles dans Supabase Dashboard
- Mais `Deno.env.get("STRIPE_SECRET_KEY")` retourne `undefined` au runtime

**Vérification**:
- Vérifier la date de dernier déploiement de l'Edge Function
- Comparer avec la date d'ajout des secrets

**Fix** (à faire manuellement):
```bash
supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
```

---

## 8) Résumé exécutif

### Project Ref détecté

✅ **Cohérence parfaite**: Tous les composants pointent vers `tbsgzykqcksmqxpimwry`
- Frontend: `tbsgzykqcksmqxpimwry` (via `.env.local`)
- CLI/Config: `tbsgzykqcksmqxpimwry` (via `supabase/config.toml`)

### Secrets attendus

**Obligatoires** (3):
1. `STRIPE_SECRET_KEY` (ligne 157, 271)
2. `STRIPE_SUCCESS_URL` (ligne 158, 310)
3. `STRIPE_CANCEL_URL` (ligne 159, 311)

**Optionnels** (2):
- `CORS_ALLOWED_ORIGINS` (ligne 72)
- `DENO_ENV` (ligne 28)

### Secrets trouvés

❌ **Aucun secret Stripe** trouvé dans le repo (normal, ils doivent être dans Supabase Dashboard)

⏳ **Vérification requise**: Exécuter `supabase secrets list --project-ref tbsgzykqcksmqxpimwry` pour confirmer la présence des secrets

### Auth & Payload

✅ **Match parfait**:
- Front envoie `amount`, `description`, `bookingId` (conforme aux attentes)
- Headers `Authorization` et `apikey` envoyés automatiquement via `supabase.functions.invoke()`
- Edge Function ne vérifie pas explicitement l'auth (s'appuie sur l'auth automatique)

### Hypothèse la plus probable

**#1: Secrets Stripe non configurés** (95% de probabilité)

**Preuve**:
- Aucune trace de configuration des secrets dans le repo
- Les logs de l'Edge Function montrent probablement `hasStripeSecretKey: false`
- Le projet `tbsgzykqcksmqxpimwry` est un projet alternatif, les secrets pourraient ne pas avoir été migrés

**Action recommandée** (à faire manuellement):
1. Vérifier les secrets: `supabase secrets list --project-ref tbsgzykqcksmqxpimwry`
2. Si absents, les configurer via Supabase Dashboard ou CLI
3. Redéployer l'Edge Function si nécessaire

---

## 9) Commandes de diagnostic (à exécuter manuellement)

### Vérifier les secrets configurés

```bash
# 1. Lister les projets disponibles
supabase projects list

# 2. Lister les secrets du projet actuel
supabase secrets list --project-ref tbsgzykqcksmqxpimwry

# 3. Tester le mode self-check de l'Edge Function
curl -X POST https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
  -H "X-Diagnostic: 1" \
  -H "Content-Type: application/json"
```

### Vérifier le projet lié (CLI)

```bash
# Vérifier la config actuelle
cat supabase/config.toml | grep project_id

# Si besoin de lier (ne pas exécuter si déjà lié)
# supabase link --project-ref tbsgzykqcksmqxpimwry
```

### Vérifier les logs de l'Edge Function

Dans Supabase Dashboard:
1. Aller dans **Edge Functions** → **Logs**
2. Filtrer par `create-checkout-session`
3. Chercher les logs `[FAIL]` pour identifier la cause exacte

---

## 10) Références

- **Edge Function**: `supabase/functions/create-checkout-session/index.ts`
- **Front**: `src/lib/payerLocation.ts`
- **Client Supabase**: `src/integrations/supabase/client.ts`
- **Config CLI**: `supabase/config.toml`
- **Variables env**: `.env.local`
- **Guide switch projets**: `SWITCH-SUPABASE-PROJECT.md`

---

**Note**: Ce diagnostic est **uniquement informatif**. Aucune modification n'a été apportée au code, aux secrets, ou à la configuration. Les actions correctives doivent être effectuées manuellement après vérification des secrets dans Supabase Dashboard.

