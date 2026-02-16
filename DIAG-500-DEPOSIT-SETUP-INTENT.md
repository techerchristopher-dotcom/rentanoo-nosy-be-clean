# DIAG 500 — POST /api/deposit/create-setup-intent

**Mode** : DIAG ONLY — aucun patch, aucune modification de logique.  
**Objectif** : Identifier la cause factuelle du 500 Internal Server Error.

---

## 1️⃣ TRACE DE LA ROUTE

### Emplacement

| Fichier | Ligne | Élément |
|---------|-------|---------|
| `server/index.ts` | 268 | `app.post("/api/deposit/create-setup-intent", ...)` |
| `server/index.ts` | 269-342 | Corps du handler (try/catch) |

### Flux exact et points de sortie

```
L271  getAuthUserFromRequest(req)     → si !ok: return 401 (pas 500)
L276  bookingId requis                → si absent: return 400
L281  supabaseAdmin.from("bookings")  → si erreur: return 404
L290  user_id !== booking.user_id     → return 403
L294  depositSnapshot <= 0             → return 400
L300  status ∉ [confirmed, accepted]   → return 400
L306  deposit_status !== "pending"     → return 400
L310  stripe_payment_method_id déjà   → return 400
L314  supabaseAdmin.from("profiles")  → si erreur: return 500 (PROFILE_NOT_FOUND)
L322  getStripe()                     → THROW si STRIPE_SECRET_KEY absente
L323  stripe.customers.create()       → THROW (Stripe API)
L328  supabaseAdmin.update(profiles)  → pas de throw, erreur dans result
L332  stripe.setupIntents.create()    → THROW (Stripe API)
L339  return 200
L339  catch (err)                     → return 500 + message
```

---

## 2️⃣ LIGNES SUSCEPTIBLES DE THROW (→ 500)

Toute exception non interceptée dans le `try` atterrit dans le `catch` L339-342 :

| Ligne | Code | Peut throw ? |
|-------|------|--------------|
| 271 | `getAuthUserFromRequest(req)` | Non (retourne un objet) |
| 281-285 | `supabaseAdmin.from("bookings").select(...).single()` | Oui (erreur réseau, client invalide) |
| 314-318 | `supabaseAdmin.from("profiles").select(...).single()` | Oui (idem) |
| 322 | `getStripe()` | **Oui** si `STRIPE_SECRET_KEY` manquante |
| 324-327 | `stripe.customers.create(...)` | **Oui** (Stripe API : clé invalide, réseau, permissions) |
| 328 | `supabaseAdmin.from("profiles").update(...)` | Peu probable (retourne `{ error }`) |
| 332-336 | `stripe.setupIntents.create(...)` | **Oui** (idem Stripe) |

---

## 3️⃣ APPELS EXTERNES

| Type | Appel | Fichier:Ligne |
|------|-------|---------------|
| Supabase | `supabaseAdmin.from("bookings").select(...)` | server/index.ts:281-285 |
| Supabase | `supabaseAdmin.from("profiles").select(...)` | server/index.ts:314-318 |
| Supabase | `supabaseAdmin.from("profiles").update(...)` | server/index.ts:328 |
| Stripe | `stripe.customers.create(...)` | server/index.ts:324-327 |
| Stripe | `stripe.setupIntents.create(...)` | server/index.ts:332-336 |
| Auth | `getAuthUserFromRequest` → `supabaseAuth.auth.getUser(token)` | server/lib/depositAuth.ts:50 |

---

## 4️⃣ VÉRIFICATION STRIPE

### Lecture de la clé

**Fichier** : `server/lib/stripe.ts`

| Ligne | Code | Comportement |
|-------|------|--------------|
| 22-25 | `getStripeSecretKey()` | `process.env.STRIPE_SECRET_KEY \|\| null` |
| 39-49 | `getStripe()` | **throw** si `!secretKey` |
| 52-54 | Détection du type | `sk_test_` → TEST, `sk_live_` → LIVE, sinon UNKNOWN |
| 56-58 | `new Stripe(secretKey, ...)` | Pas de filtre sur `rk_` |

**GO / NO GO**

| Vérification | GO | NO GO |
|--------------|-----|-------|
| Clé `sk_` (secrète) | ✅ | ❌ |
| Clé `rk_` (restricted) | ❌ Non gérée | Peut échouer sur `setupIntents.create` si permission non incluse |
| Clé `pk_` (publique) | ❌ | Toujours invalide côté serveur |
| Clé absente | ❌ | `getStripe()` throw → 500 |

**Preuve** : Boot du serveur affiche `🔑 [Stripe] Configuration: ✅ Présente (mode TEST)` ou `❌ Manquante`. Si manquante, **toute** route Stripe renverra 500 au premier appel à `getStripe()`.

---

## 5️⃣ VÉRIFICATION SUPABASE (SERVER)

### Variables d’environnement

**Fichier** : `server/index.ts` L29-34

```typescript
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
```

**Client admin** : L65-68

```typescript
const supabaseAdmin = createClient(
  SUPABASE_URL as string,
  SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);
```

**GO / NO GO**

| Variable | Rôle | Si manquante |
|----------|------|---------------|
| `SUPABASE_URL` | Connexion Supabase | `createClient(undefined, ...)` → requêtes peuvent throw |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès service role | Idem |
| `SUPABASE_ANON_KEY` | Utilisée par `depositAuth` | 401 si JWT invalide (pas 500) |

**Preuve** : Boot affiche `📦 [Supabase] URL: ✅|❌ | ANON_KEY: ✅|❌ | SERVICE_ROLE_KEY: ✅|❌`.

La route deposit utilise **uniquement** `supabaseAdmin`. Si `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` sont null/undefined, le client est créé avec des valeurs invalides et la première requête (bookings ou profiles) peut lever une exception → 500.

**Table profiles** : la colonne `stripe_customer_id` doit exister (migration `20260214170000_add_profiles_stripe_customer_id.sql`). Si la migration n’est pas appliquée, le `select` sur `profiles` peut échouer.

---

## 6️⃣ VÉRIFICATION PROXY VITE

**Fichier** : `vite.config.ts` L16-24

```typescript
proxy: {
  "/api": {
    target: "http://localhost:3000",
    changeOrigin: true,
    secure: false,
  },
},
```

**Fichier** : `server/index.ts` L1079

```typescript
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
```

**GO / NO GO**

| Cas | Résultat |
|-----|----------|
| API sur 3000 (défaut), proxy → 3000 | ✅ Requête atteint l’API |
| API sur 3001 (`PORT=3001`), proxy → 3000 | ❌ Proxy tente 3000 → connexion refusée → typiquement 502, pas 500 |
| 500 reçu côté navigateur | Le 500 vient **de l’API**, pas du proxy (le proxy transmet la réponse) |

**Conclusion** : Un 500 affiché dans le navigateur prouve que la requête est arrivée au serveur Express et que le handler a exécuté `return res.status(500).json(...)`.

---

## 7️⃣ REPRODUCTION AVEC CURL

### Via proxy Vite (ex. Vite sur 3003)

```bash
curl -X POST http://localhost:3003/api/deposit/create-setup-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"bookingId":"<uuid-de-la-reservation>"}'
```

Remplacer :
- `<JWT>` : token Supabase (`session.access_token`)
- `<uuid-de-la-reservation>` : ID de la réservation (status=`confirmed`, deposit_status=`pending`, deposit_amount_snapshot=12000000)

### Directement sur l’API (ex. API sur 3000)

```bash
curl -X POST http://localhost:3000/api/deposit/create-setup-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"bookingId":"<uuid>"}'
```

### Réponse attendue en cas de 500

Format JSON typique :

```json
{
  "ok": false,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "<message d'erreur ou erreur Stripe/Supabase>"
}
```

Le serveur log :

```
[deposit/create-setup-intent] 500 <objet Error>
```

---

## 8️⃣ TABLEAU : CAUSES PROBABLES / PREUVE / CONFIRMATION / FIX MINIMAL

| Cause probable | Preuve | Comment confirmer | Fix minimal (descriptif) |
|----------------|--------|-------------------|---------------------------|
| **STRIPE_SECRET_KEY manquante** | Boot : `🔑 [Stripe] Configuration: ❌ Manquante` | Vérifier `.env.local` : variable présente et chargée | Définir `STRIPE_SECRET_KEY=sk_test_xxx` dans `.env.local` |
| **STRIPE_SECRET_KEY invalide ou rk_** | Boot OK, erreur au premier appel Stripe | Consulter le message dans le catch : `err?.message` | Utiliser une clé secrète `sk_test_` ou `sk_live_` valide, pas `rk_` |
| **Permission Stripe manquante (rk_)** | Erreur Stripe du type "permission denied" ou "not allowed" | Log serveur au moment du 500 | Changer pour une clé secrète complète ou étendre les permissions de la clé restreinte |
| **SUPABASE_URL / SERVICE_ROLE_KEY manquants** | Boot : `📦 [Supabase] URL: ❌` ou `SERVICE_ROLE_KEY: ❌` | Vérifier `.env.local` | Définir `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ou `VITE_*`) |
| **Profil introuvable** | Réponse 500 avec `PROFILE_NOT_FOUND` | Body JSON de la réponse | Vérifier que l’utilisateur a une ligne dans `profiles` pour son `user.id` |
| **Erreur Stripe API (customers.create)** | Log serveur avec message Stripe (ex. "Invalid API Key") | `console.error` L340 | Vérifier la clé, le mode (test/live), et les limites du compte Stripe |
| **Erreur Stripe API (setupIntents.create)** | Idem | Idem | Idem + s’assurer que `setupIntents` est autorisé pour la clé |
| **Migration stripe_customer_id non appliquée** | Erreur Supabase "column does not exist" | Log serveur + vérifier migrations | Appliquer `20260214170000_add_profiles_stripe_customer_id.sql` |

---

## 9️⃣ LOG POUR CONCLUSIONS

Si la cause exacte n’est pas identifiable, ajouter ce log **en première ligne du catch** (après L339) :

**Fichier** : `server/index.ts`  
**Emplacement** : juste après `} catch (err: any) {` (L339)

```javascript
console.error("[deposit/create-setup-intent] 500", err);
// AJOUT DIAG — sans modifier autre logique :
console.error("[deposit/create-setup-intent] DIAG err.name:", err?.name);
console.error("[deposit/create-setup-intent] DIAG err.message:", err?.message);
console.error("[deposit/create-setup-intent] DIAG err.code:", err?.code);
console.error("[deposit/create-setup-intent] DIAG err.type:", err?.type);
```

Les propriétés `code` et `type` sont typiques des erreurs Stripe (ex. `StripeInvalidRequestError`, `card_error`).

Relancer la requête et inspecter la sortie du serveur pour déterminer si l’échec vient de Stripe, Supabase ou du handler.

---

## 🔟 RÉSUMÉ

| Élément | GO | NO GO |
|---------|-----|-------|
| Route atteinte (500 = backend) | Oui | 502/ECONNREFUSED = proxy/port |
| Erreur loguée serveur | `[deposit/create-setup-intent] 500` présent | Vérifier que le terminal du serveur est visible |
| Clé Stripe | `sk_test_` ou `sk_live_` valide | `rk_`, `pk_`, absente ou invalide |
| Supabase server | `SUPABASE_URL` + `SERVICE_ROLE_KEY` OK au boot | Manquants ou invalides |
| Table profiles | Colonne `stripe_customer_id` existante | Migration non appliquée |

**Action immédiate** : Consulter la sortie du serveur au moment du 500. Le message après `[deposit/create-setup-intent] 500` indique la cause réelle.
