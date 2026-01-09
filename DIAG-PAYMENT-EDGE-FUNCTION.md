# Diagnostic: Edge Function create-checkout-session (non-2xx)

**Date**: 2025-01-XX  
**Projet**: `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)  
**Edge Function**: `create-checkout-session`  
**Front**: `http://localhost:3012` (tenant) ou `3013` (owner)

---

## A) Appel côté Front (`src/lib/payerLocation.ts`)

### Code actuel

```43:49:src/lib/payerLocation.ts
const { data, error } = await supabase.functions.invoke("create-checkout-session", {
  body: {
    amount: reservation.totalTTC,
    description: `Location de ${reservation.voiture}`,
    bookingId: reservation.id,
  },
});
```

### Informations capturées actuellement

- ✅ Session auth vérifiée (lignes 17-26)
- ✅ Log DEV-only des headers masqués (lignes 29-40)
- ❌ **MANQUE**: Log du body exact envoyé
- ❌ **MANQUE**: Log de l'URL complète appelée
- ❌ **MANQUE**: Log du status HTTP retourné
- ❌ **MANQUE**: Log de la réponse complète en cas d'erreur

### Améliorations nécessaires

1. Logger le body exact (amount, description, bookingId)
2. Logger l'URL complète de l'Edge Function
3. Logger le status HTTP retourné (même en cas d'erreur)
4. Logger la réponse complète de l'Edge Function (error.message, error.status, etc.)

---

## B) Branches non-2xx dans Edge Function

### Tableau des branches de retour

| Status | Ligne | Condition | Message log | Message réponse |
|--------|-------|-----------|-------------|-----------------|
| **405** | 128-138 | `req.method !== "POST"` | `"❌ [create-checkout-session] Méthode non autorisée: {method}"` | `"Méthode non autorisée. Utilisez POST."` |
| **400** | 153-164 | `amount` invalide (pas number ou <= 0) | `"❌ [create-checkout-session] Montant invalide: {amount}"` | `"amount (number > 0) requis"` |
| **400** | 167-178 | `description` manquante ou invalide | `"❌ [create-checkout-session] Description manquante ou invalide"` | `"description (string) requis"` |
| **500** | 196-218 | `STRIPE_SECRET_KEY` manquante | `"❌ [create-checkout-session] STRIPE_SECRET_KEY manquante"` + log DEV détaillé | `"Configuration serveur manquante: STRIPE_SECRET_KEY"` |
| **500** | 224-241 | `STRIPE_SUCCESS_URL` ou `STRIPE_CANCEL_URL` manquantes | `"❌ [create-checkout-session] URLs de redirection manquantes: {hasSuccessUrl, hasCancelUrl}"` | `"Configuration serveur manquante: STRIPE_SUCCESS_URL et/ou STRIPE_CANCEL_URL"` |
| **500** | 292-308 | Exception non gérée (catch général) | `"❌ [create-checkout-session] Erreur lors de la création de la session: {error}"` | `{error.message}` ou `"Erreur inconnue lors de la création de la session de paiement"` |

### Notes importantes

- **Status 200**: Ligne 281-289 (succès)
- **Status 200**: Ligne 119-123 (OPTIONS preflight)
- Tous les retours non-2xx incluent les headers CORS
- Les logs DEV-only sont présents pour `STRIPE_SECRET_KEY` (lignes 185-206)

---

## C) Logs runtime actuels vs nécessaires

### Logs actuels dans Edge Function

✅ **Présents**:
- Log au démarrage du module: variables Stripe (lignes 34-68, DEV-only)
- Log de la requête reçue: amount, description, bookingId (lignes 144-148)
- Log DEV-only pour STRIPE_SECRET_KEY (lignes 185-194)
- Log d'erreur détaillé si STRIPE_SECRET_KEY absente (lignes 198-206, DEV-only)
- Log de succès: session créée (lignes 274-278)

❌ **Manquants**:
- Log au début du handler avec: origin, méthode, headers présents, body keys
- Log juste avant chaque return non-2xx avec tag explicite `[FAIL][<reason>]`
- Log du status retourné

### Logs actuels côté Front

✅ **Présents**:
- Log de la réservation (ligne 14)
- Log DEV-only des headers masqués (lignes 29-40)
- Log d'erreur générique (ligne 52)

❌ **Manquants**:
- Log du body exact envoyé
- Log de l'URL complète
- Log du status HTTP retourné
- Log de la réponse complète (error.status, error.message, data)

---

## D) Vérification des secrets

### Secrets attendus par la fonction

| Variable | Ligne | Usage |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | 182 | Initialisation Stripe (ligne 245) |
| `STRIPE_SUCCESS_URL` | 221 | `success_url` dans session Stripe (ligne 267) |
| `STRIPE_CANCEL_URL` | 222 | `cancel_url` dans session Stripe (ligne 268) |

### Vérification actuelle

- ✅ Log au démarrage du module (DEV-only) qui liste toutes les variables STRIPE_ (lignes 34-68)
- ✅ Log avant vérification de STRIPE_SECRET_KEY (lignes 185-194, DEV-only)
- ❌ **MANQUE**: Endpoint "self-check" pour vérifier les secrets sans créer de session

### Mode "self-check" (✅ IMPLÉMENTÉ)

**Condition d'activation**: 
- Header `X-Diagnostic: 1` (DEV-only, vérifié via `isDev`)
- Fonctionne uniquement en environnement DEV

**Réponse JSON**:
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

⚠️ **Sécurité**: Ne retourne jamais les valeurs des secrets, seulement leur présence et longueur.

**Comment tester**:
```bash
curl -X POST https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
  -H "X-Diagnostic: 1" \
  -H "Content-Type: application/json"
```

Ou depuis le front (DEV-only):
```typescript
const { data } = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
  method: 'POST',
  headers: {
    'X-Diagnostic': '1',
    'Content-Type': 'application/json',
  },
});
```

---

## E) Configuration Supabase

### Noms exacts des variables d'environnement

D'après le code (`supabase/functions/create-checkout-session/index.ts`):

1. **STRIPE_SECRET_KEY** (ligne 182)
   - Utilisé via `Deno.env.get("STRIPE_SECRET_KEY")`
   - Vérifié ligne 196: `if (!stripeSecret)`

2. **STRIPE_SUCCESS_URL** (ligne 221)
   - Utilisé via `Deno.env.get("STRIPE_SUCCESS_URL")`
   - Vérifié ligne 224: `if (!successUrl || !cancelUrl)`

3. **STRIPE_CANCEL_URL** (ligne 222)
   - Utilisé via `Deno.env.get("STRIPE_CANCEL_URL")`
   - Vérifié ligne 224: `if (!successUrl || !cancelUrl)`

### Où configurer dans Supabase

1. **Dashboard Supabase** → Project Settings → Edge Functions → Secrets
2. Ou via CLI: `supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx --project-ref tbsgzykqcksmqxpimwry`

### Différence: secrets "set" vs visibles au runtime

- **Secrets "set"**: Configurés dans Supabase Dashboard/CLI
- **Visibles au runtime**: Accessibles via `Deno.env.get()` dans l'Edge Function
- ⚠️ **Problème connu**: Les secrets peuvent être "set" mais non visibles si:
  - Le projet ref est incorrect
  - La fonction n'a pas été redéployée après l'ajout du secret
  - Le secret a été ajouté dans le mauvais environnement (local vs remote)

---

## Prochaines étapes (diagnostic)

1. ✅ **Améliorer les logs côté front** (`payerLocation.ts`)
   - ✅ Logger body exact, URL, status, réponse complète
   - ✅ Log DEV-only détaillé de l'erreur (error.status, error.context, etc.)

2. ✅ **Améliorer les logs côté Edge Function**
   - ✅ Log au début du handler (origin, méthode, headers, body keys)
   - ✅ Log avant chaque return non-2xx avec tag `[FAIL][<reason>]`
   - ✅ Logs DEV-only pour le body reçu

3. ✅ **Ajouter mode "self-check"** (DEV-only)
   - ✅ Endpoint qui retourne la présence des secrets sans créer de session
   - ✅ Activé via header `X-Diagnostic: 1`

4. ⏳ **Tester et observer les logs Supabase**
   - Relancer le paiement depuis le front
   - Observer les logs dans Supabase Dashboard → Edge Functions → Logs
   - Identifier le status exact et la branche prise (rechercher `[FAIL]` dans les logs)
   - Vérifier les logs `[INIT]`, `[BODY]`, `[FAIL][<reason>]`

5. ⏳ **Vérifier les secrets dans Supabase**
   - Dashboard → Project Settings → Edge Functions → Secrets
   - Vérifier que `STRIPE_SECRET_KEY`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` sont présents
   - Vérifier le project ref: `tbsgzykqcksmqxpimwry`
   - Tester le mode self-check pour confirmer la présence des secrets au runtime

6. ⏳ **Redéployer l'Edge Function si nécessaire**
   - Si les secrets ont été ajoutés récemment, redéployer la fonction:
   ```bash
   supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
   ```

---

## Questions à résoudre

1. **Quel status exact** est retourné aujourd'hui? (401/403/400/500)
2. **Quelle branche** du code est prise? (voir tableau ci-dessus)
3. **Quels headers** sont réellement reçus par la fonction? (authorization, apikey, content-type)
4. **Quels secrets** sont visibles au runtime? (via logs DEV ou self-check)
5. **Le project ref** est-il correct dans l'appel? (`tbsgzykqcksmqxpimwry`)

---

## Comment interpréter les logs

### Logs côté Front (Console navigateur)

Rechercher dans la console:
- `🔍 [payerLocation DEV]` : Headers, body, URL
- `[payerLocation DEV] Erreur Edge Function détaillée` : Erreur complète avec status, message, context
- `[payerLocation] Erreur Edge Function` : Erreur générique

### Logs côté Edge Function (Supabase Dashboard)

Dans Supabase Dashboard → Edge Functions → Logs, rechercher:

1. **Au début de chaque requête**:
   - `🔍 [create-checkout-session][INIT]` : Origin, méthode, headers présents
   - `🔍 [create-checkout-session][BODY]` : Body keys, valeurs (DEV-only)

2. **En cas d'erreur**:
   - `❌ [create-checkout-session][FAIL][METHOD_NOT_ALLOWED]` : Status 405
   - `❌ [create-checkout-session][FAIL][INVALID_AMOUNT]` : Status 400
   - `❌ [create-checkout-session][FAIL][INVALID_DESCRIPTION]` : Status 400
   - `❌ [create-checkout-session][FAIL][MISSING_STRIPE_SECRET]` : Status 500
   - `❌ [create-checkout-session][FAIL][MISSING_REDIRECT_URLS]` : Status 500
   - `❌ [create-checkout-session][FAIL][EXCEPTION]` : Status 500 (exception non gérée)

3. **Au démarrage du module** (une seule fois):
   - `🔍 [stripe-env-check] Variables d'environnement Stripe au démarrage` : Liste des variables STRIPE_ présentes

### Exemple de log d'erreur attendu

```
❌ [create-checkout-session][FAIL][MISSING_STRIPE_SECRET] STRIPE_SECRET_KEY manquante
```

Cela indique que la fonction a pris la branche ligne 196-218, retournant un status 500.

---

## Livrable final attendu

- [x] Tableau des branches non-2xx (✅ fait ci-dessus)
- [x] Logs runtime (front + edge) améliorés (✅ fait)
- [x] Mode self-check pour vérifier les secrets (✅ fait)
- [ ] Status actuel observé (401/500/400…) + message exact (⏳ à observer après test)
- [ ] Cause racine prouvée (⏳ après observation des logs)
- [ ] Proposition de fix minimal (⏳ après identification de la cause)

---

## Instructions pour tester

1. **Redéployer l'Edge Function** (si les logs ont été modifiés):
   ```bash
   supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
   ```

2. **Tester le mode self-check** (vérifier les secrets):
   ```bash
   curl -X POST https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
     -H "X-Diagnostic: 1" \
     -H "Content-Type: application/json"
   ```
   Réponse attendue: JSON avec `hasStripeSecretKey`, `hasSuccessUrl`, `hasCancelUrl`.

3. **Tester le paiement depuis le front**:
   - Ouvrir la console navigateur (F12)
   - Lancer un paiement
   - Observer les logs `[payerLocation DEV]` dans la console
   - Observer les logs `[create-checkout-session]` dans Supabase Dashboard

4. **Identifier la cause**:
   - Chercher `[FAIL]` dans les logs Supabase
   - Noter le tag `[FAIL][<reason>]` pour identifier la branche
   - Vérifier les valeurs loggées (amount, description, secrets présents, etc.)

5. **Rapporter les résultats**:
   - Status HTTP observé
   - Tag `[FAIL][<reason>]` trouvé dans les logs
   - Valeurs loggées (amount, description, secrets, etc.)
   - Message d'erreur exact retourné au front

