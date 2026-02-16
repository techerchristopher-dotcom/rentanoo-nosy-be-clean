# DIAG PROD — Paiement Stripe OK mais booking reste `pending_payment` + UI pas à jour

**Mode** : DIAG ONLY — aucun patch, pas de modification de logique.  
**Objectif** : Identifier pourquoi, après un paiement Stripe réussi en prod, le booking reste `pending_payment` et l'UI affiche toujours "Payer ma location".

---

## 1️⃣ CONTRAT D'ÉTAT DU BOOKING APRÈS PAIEMENT

### Statuts utilisés

| Statut | Rôle |
|--------|------|
| `pending` | En attente d'acceptation propriétaire |
| `pending_payment` | Accepté par le propriétaire, en attente du paiement du locataire |
| `confirmed` | Paiement reçu, caution possiblement en attente |
| `accepted` | Synonyme "payé" dans le webhook Express (historique) |

### Champs DB modifiés par le webhook

| Champ DB | Avant paiement | Après paiement attendu | Où lu côté front | Impact UI |
|----------|----------------|------------------------|------------------|-----------|
| `status` | `pending_payment` | `confirmed` (Edge) ou `accepted` (Express) | `RenterBookings` L196, `RenterBookingCard` L408 | "Payer" vs "Activer caution" |
| `paid_at` | `NULL` | Timestamp ISO | `isBookingPaid()` L56 | — |
| `stripe_payment_intent_id` | `NULL` | `pi_xxx` | `isBookingPaid()` L55 | — |
| `stripe_checkout_session_id` | `NULL` | `cs_xxx` | `isBookingPaid()` L55 | — |
| `amount_total_paid` | `NULL` | Montant EUR | — | — |
| `service_fee_renter` | `NULL` | Montant | — | — |
| `service_fee_owner` | `NULL` | Montant | — | — |
| `owner_payout_amount` | `NULL` | Montant | — | — |
| `platform_total_fee` | `NULL` | Montant | — | — |
| `currency` | — | `EUR` | — | — |
| `deposit_status` | `pending` (si caution requise) | Inchangé par webhook paiement | `RenterBookingCard` L421 | "Activer caution" |
| `deposit_amount_snapshot` | Montant ou NULL | Rempli au passage `pending_payment` → `confirmed` (via acceptation owner) | `canOpenDepositModal` L66 | — |

### Condition "Payer" vs "Activer caution"

| Bouton | Condition (fichier + lignes) |
|--------|------------------------------|
| **Payer ma location** | `booking.status === 'pending_payment'` — `RenterBookingCard.tsx` L1274 ; `BookingDiscussion.tsx` L1177 |
| **Activer ma caution** | `booking.status === 'confirmed' \|\| 'accepted'` ET `deposit_status === 'pending'` ET `deposit_amount_snapshot > 0` — `RenterBookingCard` L421, `canOpenDepositModal` L63-75 |

---

## 2️⃣ FLUX DE PAIEMENT

### 2.1 Front — Bouton "Payer ma location"

| Élément | Fichier | Lignes |
|---------|---------|--------|
| Bouton principal | `RenterBookingCard.tsx` | 1274-1312 (`onRequestPay`) |
| Autre bouton | `BookingDiscussion.tsx` | 1177-1200 (`handlePayNow`) |
| Modale paiement | `PaymentFlowModal` | — |
| Fonction de paiement | `src/lib/payerLocation.ts` | 13-101 |

### 2.2 Appels réseau front

**Fichier** : `src/lib/payerLocation.ts`

| Étape | Ligne | Action |
|-------|-------|--------|
| 1 | 34 | `edgeFunctionUrl = ${SUPABASE_URL}/functions/v1/create-checkout-session` |
| 2 | 53-55 | `supabase.functions.invoke("create-checkout-session", { body: { bookingId } })` |
| 3 | 92 | `window.location.href = data.url` → redirection vers Stripe Checkout |

Flow : Stripe Checkout (hébergé Stripe), pas Payment Element. Aucune mise à jour DB côté front.

### 2.3 Backend — Création de la session

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

| Ligne | Action |
|-------|--------|
| 232 | Parse body → `bookingId` |
| 305-328 | Lit `bookings` depuis Supabase |
| 501-523 | `stripe.checkout.sessions.create()` avec `metadata: { bookingId }` |
| 522 | `success_url: ${successUrl}?session_id={CHECKOUT_SESSION_ID}` |
| 523-525 | `metadata: { bookingId: String(bookingId) }` |

La fonction ne met pas à jour la DB ; elle crée la session et renvoie l’URL. La mise à jour est faite par le webhook.

### 2.4 Retour après paiement

**Fichier** : `src/pages/renter/PaymentSuccess.tsx`

| Ligne | Action |
|-------|--------|
| 36 | Attente 2 s (pour laisser le webhook traiter) |
| 41 | `navigate("/me/renter/bookings?afterPayment=1")` |

Aucun appel API "confirm payment" : la confirmation est uniquement via webhook.

### 2.5 Refresh côté front

**Fichier** : `src/pages/renter/RenterBookings.tsx`

| Ligne | Action |
|-------|--------|
| 89 | `comingFromStripeSuccess = searchParams.get("afterPayment") === "1"` |
| 108-113 | `useEffect` : si `comingFromStripeSuccess && currentUser` → `loadBookings()` |
| 343-452 | `loadBookings()` : `SupabaseBookingsService.getRenterBookings()` → `select *` sur `bookings` |

Donc : refetch des bookings à l’arrivée avec `?afterPayment=1`. Si le webhook n’a pas mis à jour la DB, les données restent `pending_payment`.

---

## 3️⃣ QUI MET À JOUR LE BOOKING EN "PAID/CONFIRMED" ?

Mise à jour uniquement par les webhooks Stripe. Aucune autre mise à jour post-paiement (front ou Edge Function create-checkout-session).

### 3.1 Deux webhooks possibles

| Webhook | Fichier | Route / URL | Event | Status écrit |
|---------|---------|-------------|-------|--------------|
| **Express** | `server/index.ts` | `POST /api/stripe/webhook` | `checkout.session.completed` | `"accepted"` |
| **Edge** | `supabase/functions/stripe-webhook/index.ts` | `POST /functions/v1/stripe-webhook` | `checkout.session.completed` | `"confirmed"` |

Un seul endpoint est configuré dans Stripe pour recevoir les événements. L’autre ne reçoit rien.

### 3.2 Mapping event → DB (Express)

**Fichier** : `server/index.ts` L107-226

| Ligne | Action |
|-------|--------|
| 109 | `if (event.type === "checkout.session.completed")` |
| 110 | `session = event.data.object` |
| 110 | `bookingId = session?.metadata?.bookingId` |
| 111-114 | Si `!bookingId` → return 200, log erreur |
| 123-126 | `supabaseAdmin.from("bookings").select("subtotal").eq("id", bookingId).single()` |
| 161-174 | `updatePayload` : status `"accepted"`, `paid_at`, champs Stripe, fees |
| 193-197 | `supabaseAdmin.from("bookings").update(updatePayload).eq("id", bookingId)` |

### 3.3 Mapping event → DB (Edge)

**Fichier** : `supabase/functions/stripe-webhook/index.ts` L102-272

| Ligne | Action |
|-------|--------|
| 103-108 | Si `event.type !== "checkout.session.completed"` → return 200, ignoré |
| 111-112 | `session = event.data.object`, `bookingId = session?.metadata?.bookingId` |
| 127-136 | Si `!bookingId` → return 200 |
| 139-154 | Select `bookings.subtotal` |
| 194-206 | `updatePayload` : status `"confirmed"`, `paid_at`, champs Stripe, fees |
| 228-232 | `supabaseAdmin.from("bookings").update(updatePayload).eq("id", bookingId)` |

### 3.4 Raisons possibles pour lesquelles l’update ne se fait pas

| # | Cause | Preuve | Comment confirmer |
|---|-------|--------|-------------------|
| 1 | Aucun webhook configuré dans Stripe | — | Stripe Dashboard → Webhooks → Aucun endpoint ou aucun event `checkout.session.completed` |
| 2 | Mauvaise URL d’endpoint | — | Stripe Dashboard : URL ≠ `https://rentanoo.com/api/stripe/webhook` ET ≠ `https://[project].functions.supabase.co/stripe-webhook` |
| 3 | `STRIPE_WEBHOOK_SECRET` absent ou invalide | Express L77, Edge L63-86 | 400 "Webhook Error" / "Signature invalide" dans logs ; Stripe marque les tentatives en échec |
| 4 | Events non livrés (erreurs Stripe) | Stripe Dashboard | Webhooks → Endpoint → "Recent deliveries" avec statut failed |
| 5 | Event reçu mais ignoré | Code | `event.type !== "checkout.session.completed"` → return 200 (Edge L103-108) |
| 6 | `metadata.bookingId` absent | — | Logs : "bookingId absent dans metadata" (Express L112) ou "bookingId manquant" (Edge L128) |
| 7 | Update DB échoue (RLS / colonnes / erreur Supabase) | — | Log "❌ Update bookings" (Express L211) ou "❌ Erreur mise à jour" (Edge L246) — erreur avalée si 500 non logué |
| 8 | Endpoint non joignable (404, 502, timeout) | Stripe Dashboard | "Recent deliveries" avec réponse non 2xx |

---

## 4️⃣ VARIABLES D’ENVIRONNEMENT PROD

| Variable | Où lue (fichier + ligne) | Utilisation | Si absente |
|----------|---------------------------|-------------|------------|
| `STRIPE_SECRET_KEY` | Express : `server/lib/stripe.ts` L24 ; Edge : `stripe-webhook/index.ts` L24 | Clé serveur Stripe | Express : crash si appel `getStripe()` ; Edge : log erreur |
| `STRIPE_WEBHOOK_SECRET` | Express : `server/index.ts` L77 ; Edge : `stripe-webhook/index.ts` L25, L63 | Vérification signature | Express : mode non sécurisé, body parsé sans signature ; Edge : idem |
| `SUPABASE_URL` | Express : `server/index.ts` L30 ; Edge : L26 | Client Supabase | `createClient(undefined, ...)` → erreurs à la requête |
| `SUPABASE_SERVICE_ROLE_KEY` | Express : L32 ; Edge : L27 | Bypass RLS | Idem |
| `STRIPE_SUCCESS_URL` | `create-checkout-session/index.ts` L449 | Redirection Stripe après paiement | 500 si absent |
| `STRIPE_CANCEL_URL` | `create-checkout-session/index.ts` L450 | Redirection annulation | 500 si absent |

Pas de `WEBHOOK_BASE_URL` ou `SITE_URL` utilisée pour construire l’URL du webhook : l’URL est définie uniquement dans le Stripe Dashboard.

---

## 5️⃣ DB / SUPABASE

### Requête d’update

Les deux webhooks exécutent :

```ts
supabaseAdmin.from("bookings").update(updatePayload).eq("id", bookingId).select()
```

Avec client créé via `SUPABASE_SERVICE_ROLE_KEY` → bypass RLS.

### Points de non-traitement d’erreur

| Fichier | Ligne | Comportement |
|---------|-------|--------------|
| Express | 127-129 | `if (fetchErr)` → return 500, log |
| Express | 210-213 | `if (updateErr)` → return 500, log |
| Edge | 145-153 | `if (fetchErr)` → return 500 |
| Edge | 245-254 | `if (updateErr)` → return 500 |

Les erreurs Supabase entraînent bien un 500. Si le webhook répond 500, Stripe peut retenter, mais la mise à jour n’aura pas eu lieu tant que l’erreur persiste.

### Causes DB possibles

| Cause | Preuve | Comment confirmer |
|-------|--------|-------------------|
| Colonnes manquantes | Migrations non appliquées | Vérifier que `paid_at`, `stripe_payment_intent_id`, `stripe_checkout_session_id`, fees existent sur `bookings` |
| `subtotal` NULL ou 0 | Calcul fees | Log "subtotal" dans le webhook ; `commissionBase = 0` peut casser les calculs |
| Contrainte / trigger | Erreur Supabase | Log `updateErr` (message, code, hint) |
| RLS | — | Non applicable (service role) |

---

## 6️⃣ UI — POURQUOI L’ÉTAT NE CHANGE PAS ?

### Source des données

**Fichier** : `src/services/supabase/bookings.ts` L126-134

```ts
supabase.from("bookings").select(`*, checkin_depart:...`).eq("user_id", renterId)
```

Pas de cache React Query : lecture directe Supabase à chaque `loadBookings()`.

### Invalidation / refetch

- `loadBookings()` est appelée au montage et quand `?afterPayment=1` est présent (L108-113).
- Pas de polling, pas de refetch automatique après un délai.

Si le webhook met à jour la DB après le refetch, l’UI restera obsolète jusqu’à un rechargement manuel ou une nouvelle navigation. En pratique, le symptôme décrit (booking toujours en `pending_payment`) indique que la DB n’est jamais mise à jour, donc la cause est en amont (webhook).

---

## 7️⃣ CHECKLIST REPRODUCTION / CONFIRMATION

### Stripe Dashboard

1. **Webhooks → Endpoints** : au moins un endpoint avec `checkout.session.completed`.
2. **URL** : correspond soit à `https://rentanoo.com/api/stripe/webhook`, soit à `https://[project].functions.supabase.co/stripe-webhook`.
3. **Mode** : endpoint en mode LIVE si paiements en production.
4. **Recent deliveries** : pour un paiement récent, statut "Succeeded" (200) ou "Failed" avec détails.
5. **Signing secret** : `STRIPE_WEBHOOK_SECRET` sur Railway (Express) ou Supabase (Edge) correspond au secret affiché pour cet endpoint.

### Base de données

```sql
SELECT id, status, paid_at, stripe_checkout_session_id, stripe_payment_intent_id, updated_at
FROM bookings
WHERE id = '<booking_id>';
```

Si après un paiement réussi : `status` reste `pending_payment`, `paid_at` et IDs Stripe restent NULL → le webhook n’a pas mis à jour la ligne.

### Logs (DIAG ONLY — où loguer, sans changer la logique)

| Emplacement | Log suggéré |
|-------------|-------------|
| Express webhook, après L109 | `console.log("[webhook] checkout.session.completed reçu, bookingId:", bookingId);` |
| Express webhook, avant L193 | `console.log("[webhook] updatePayload:", JSON.stringify(updatePayload));` |
| Express webhook, après L197 | `console.log("[webhook] updateResult:", { updateErr: updateErr?.message, rows: updateData?.length });` |
| Edge webhook, après L119 | Déjà logué : `console.log("💳 checkout.session.completed reçu:", {...})` |
| Edge webhook, après L232 | Déjà logué : `console.log("✅ Réservation mise à jour...")` |

Vérifier dans les logs Railway (Express) ou Supabase Edge Functions (Edge) si ces messages apparaissent pour le paiement concerné.

---

## 8️⃣ RÉSUMÉ GO / NO GO

| Condition | GO | NO GO |
|-----------|-----|-------|
| Webhook configuré dans Stripe avec bonne URL | ✅ | ❌ |
| Event `checkout.session.completed` livré avec succès (200) | ✅ | ❌ |
| `metadata.bookingId` présent dans la session | ✅ | ❌ |
| `STRIPE_WEBHOOK_SECRET` correct (si vérification activée) | ✅ | ❌ |
| Update DB sans erreur | ✅ | ❌ |
| Front refetch après retour (`?afterPayment=1`) | ✅ | — |

---

## 9️⃣ TABLEAU CAUSES / PREUVES / CONFIRMATION / FIX

| Cause probable | Preuve (fichier + ligne ou logs) | Comment confirmer | Fix minimal (descriptif) |
|----------------|----------------------------------|-------------------|--------------------------|
| Aucun webhook configuré | Stripe Dashboard | Webhooks → aucun endpoint ou pas d’event `checkout.session.completed` | Créer un endpoint avec cette URL et cet event |
| Mauvaise URL webhook | Stripe Dashboard | URL ≠ celles attendues (Express ou Edge) | Corriger l’URL dans Stripe |
| Webhook sur mauvais domaine (ex. rentanoo.yt) | Stripe Dashboard | URL contient ancien domaine | Mettre `https://rentanoo.com/api/stripe/webhook` ou l’URL Edge |
| `STRIPE_WEBHOOK_SECRET` absent / invalide | Logs 400 "Webhook Error" | Réponses 400 dans Stripe "Recent deliveries" | Copier le signing secret de l’endpoint dans Railway/Supabase |
| Express non déployé ou non joignable | Stripe "Recent deliveries" failed | 502/404/timeout vers l’URL Express | Vérifier déploiement Railway et URL publique |
| Edge non déployée ou non joignable | Idem | Idem vers l’URL Edge | Vérifier déploiement Supabase Edge Functions |
| `metadata.bookingId` absent | Logs "bookingId absent" | Logs webhook | Vérifier que `create-checkout-session` envoie bien `metadata: { bookingId }` (L523-525) |
| Erreur Supabase (colonnes, contraintes) | Log "Update bookings" / "Erreur mise à jour" | `updateErr` dans les logs | Appliquer les migrations, vérifier le schéma `bookings` |
| Clé Stripe TEST vs LIVE | Stripe Dashboard | Paiement en LIVE avec endpoint en mode TEST (ou inverse) | Aligner mode endpoint Stripe et clés (TEST/LIVE) |

---

## 🔟 CONCLUSION

Le problème vient du fait que le webhook Stripe ne met pas à jour la table `bookings` après un paiement réussi. La cause la plus probable est une mauvaise configuration du webhook (URL, secret, ou endpoint non joignable). L’étape prioritaire est de vérifier dans Stripe Dashboard les endpoints configurés et leurs "Recent deliveries" pour le paiement concerné.
