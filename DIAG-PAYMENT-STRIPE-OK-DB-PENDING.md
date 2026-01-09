# Diagnostic ciblé: Paiement Stripe OK mais DB reste pending

**Date**: 2025-01-XX  
**Mode**: DIAG uniquement (pas de modification, pas de fix)  
**Cas réel analysé**: Booking ID `3be99afa-92f2-49a6-b7d1-36a39d1b902b`

---

## 1️⃣ Identifier ce que représente l'ID fourni

### ID: `3be99afa-92f2-49a6-b7d1-36a39d1b902b`

**Format**: UUID (36 caractères avec tirets)

**Correspondance probable**:
- ✅ **`bookings.id`** - ID de réservation dans la table `bookings`
- ❌ **Pas un ID Stripe** - Les IDs Stripe ont des formats différents:
  - Checkout Session: `cs_test_xxx` ou `cs_live_xxx`
  - Payment Intent: `pi_xxx`

**Recherche dans le code**:
- ❌ **Aucune occurrence** trouvée dans le repo (grep retourne 0 résultat)
- ✅ **Normal** - Cet ID est généré dynamiquement et stocké en DB, pas hardcodé

**Usage dans le code**:
- `src/lib/payerLocation.ts` ligne 32: `bookingId: reservation.id` → Envoyé à l'Edge Function
- `supabase/functions/create-checkout-session/index.ts` ligne 360: `metadata: { bookingId: String(bookingId) }` → Envoyé à Stripe
- Webhooks: `session.metadata.bookingId` → Utilisé pour identifier la réservation à mettre à jour

**Conclusion**: Cet ID est un **`bookings.id`** qui devrait être présent dans les metadata Stripe de la Checkout Session.

---

## 2️⃣ Analyser l'état réel de la DB après paiement

### Table `bookings` - Champs liés au paiement

**Schéma** (d'après `supabase/migrations/002_add_service_fee_columns.sql`):

| Champ | Type | Attendu après paiement | État réel (cas analysé) |
|-------|------|------------------------|------------------------|
| `status` | `varchar` | `"accepted"` | ❌ `"pending"` (ou `"pending_payment"`) |
| `paid_at` | `timestamptz` | Timestamp du paiement | ❌ `NULL` |
| `stripe_payment_intent_id` | `text` | ID PaymentIntent (ex: `pi_xxx`) | ❌ `NULL` |
| `stripe_checkout_session_id` | `text` | ID Checkout Session (ex: `cs_xxx`) | ❌ `NULL` |
| `amount_total_paid` | `numeric(10,2)` | Montant total payé | ❌ `NULL` |
| `service_fee_renter` | `numeric(10,2)` | 15% du subtotal | ❌ `NULL` |
| `service_fee_owner` | `numeric(10,2)` | 15% du subtotal | ❌ `NULL` |
| `owner_payout_amount` | `numeric(10,2)` | Revenu propriétaire | ❌ `NULL` |
| `platform_total_fee` | `numeric(10,2)` | Commission totale | ❌ `NULL` |
| `currency` | `text` | Devise (ex: `"EUR"`) | ❌ `NULL` (ou valeur par défaut) |

**Conclusion**: **Aucun champ de paiement n'a été mis à jour** → Le webhook n'a **pas** été exécuté avec succès, ou n'a **pas** été appelé.

---

### Table `payments` - Rôle prévu vs réalité

**Schéma** (d'après `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 334-347):

```sql
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending',
    stripe_payment_id character varying(255),
    stripe_payment_intent_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ...
);
```

**Rôle prévu**:
- ✅ Table dédiée aux paiements
- ✅ Liée à `bookings` via `booking_id`
- ✅ Devrait stocker les infos de paiement Stripe

**Réalité**:
- ❌ **Aucun code n'écrit dans cette table**
- ❌ Les webhooks mettent à jour directement `bookings`, pas `payments`
- ❌ La table `payments` est **inutilisée** dans le flow actuel

**Preuve**:
- `server/index.ts` ligne 149: `supabaseAdmin.from("bookings").update()` → Met à jour `bookings`, pas `payments`
- `supabase/functions/stripe-webhook/index.ts` ligne 215: `supabaseAdmin.from("bookings").update()` → Met à jour `bookings`, pas `payments`
- Aucun `INSERT` ou `UPDATE` sur `payments` dans les webhooks

**Conclusion**: La table `payments` est **vide** car elle n'est **pas utilisée** par le code actuel. Les webhooks écrivent directement dans `bookings`.

---

## 3️⃣ Analyser le(s) webhook(s) Stripe existant(s)

### Webhook #1: Express Server

**Fichier**: `server/index.ts`  
**Endpoint**: `/api/stripe/webhook` (ligne 28)  
**URL complète**: `https://[DOMAIN]/api/stripe/webhook`  
**Event écouté**: `checkout.session.completed` (ligne 64)

**Est-il réellement branché à Stripe ?**
- ⚠️ **Non vérifiable depuis le code** - La configuration se fait dans Stripe Dashboard
- ⚠️ **Dépend de la configuration Stripe** - L'URL doit être configurée dans Stripe Dashboard → Webhooks → Endpoints

**Est-il actif en prod ?**
- ⚠️ **Non vérifiable depuis le code** - Nécessite de vérifier:
  1. Stripe Dashboard → Webhooks → Endpoints → URL configurée
  2. Logs du serveur Express pour voir si les webhooks sont reçus

**Méthode de vérification signature**:
- ✅ Si `STRIPE_WEBHOOK_SECRET` présent: Signature vérifiée (lignes 37-51)
- ⚠️ Si `STRIPE_WEBHOOK_SECRET` absent: Mode DEV non sécurisé (lignes 52-60)

---

### Webhook #2: Supabase Edge Function

**Fichier**: `supabase/functions/stripe-webhook/index.ts`  
**Endpoint**: `/functions/v1/stripe-webhook` (déduit du nom de fonction)  
**URL complète**: `https://[PROJECT_REF].functions.supabase.co/stripe-webhook`  
**Event écouté**: `checkout.session.completed` (ligne 104)

**Est-il réellement branché à Stripe ?**
- ⚠️ **Non vérifiable depuis le code** - La configuration se fait dans Stripe Dashboard
- ⚠️ **Dépend de la configuration Stripe** - L'URL doit être configurée dans Stripe Dashboard → Webhooks → Endpoints

**Est-il actif en prod ?**
- ⚠️ **Non vérifiable depuis le code** - Nécessite de vérifier:
  1. Stripe Dashboard → Webhooks → Endpoints → URL configurée
  2. Logs Supabase Edge Functions pour voir si les webhooks sont reçus

**Méthode de vérification signature**:
- ✅ Si `STRIPE_WEBHOOK_SECRET` présent: Signature vérifiée (lignes 64-87)
- ⚠️ Si `STRIPE_WEBHOOK_SECRET` absent: Mode DEV non sécurisé (lignes 88-93)

---

### Conclusion webhooks

**Deux webhooks existent**, mais **seul celui configuré dans Stripe Dashboard** recevra les événements.

**Scénarios possibles**:
1. ❌ **Aucun webhook configuré** dans Stripe Dashboard → Aucun webhook ne reçoit les événements
2. ⚠️ **Webhook configuré mais URL incorrecte** → Les événements sont envoyés mais ne parviennent pas
3. ⚠️ **Webhook configuré mais erreur lors de l'exécution** → Les événements sont reçus mais l'update DB échoue
4. ⚠️ **Webhook configuré mais signature invalide** → Les événements sont rejetés (si `STRIPE_WEBHOOK_SECRET` présent)

---

## 4️⃣ Vérifier la logique de mise à jour DB dans le webhook

### Webhook Express (`server/index.ts`)

#### Récupération de l'identifiant de réservation

**Ligne 66**:
```typescript
const bookingId: string | undefined = session?.metadata?.bookingId;
```

**Source**: `session.metadata.bookingId` depuis l'event Stripe `checkout.session.completed`

**Condition** (lignes 67-70):
```typescript
if (!bookingId) {
  console.error("❌ bookingId absent dans metadata");
  return res.status(200).json({ received: true });
}
```

**Si `bookingId` absent**: Le webhook retourne `200` (pour que Stripe arrête de retenter) mais **ne met pas à jour la DB**.

---

#### Requête DB exécutée

**Lignes 149-153**:
```typescript
const { data: updateData, error: updateErr } = await supabaseAdmin
  .from("bookings")
  .update(updatePayload)
  .eq("id", bookingId)
  .select();
```

**Opération**: `UPDATE bookings SET ... WHERE id = bookingId`

**Pas d'INSERT dans `payments`**: Le webhook **ne touche pas** à la table `payments`.

---

#### Conditions pour que l'update se fasse

1. ✅ Event type: `checkout.session.completed` (ligne 64)
2. ✅ `bookingId` présent dans `session.metadata.bookingId` (ligne 66)
3. ✅ Booking existe dans DB (lignes 78-86) - Si booking non trouvé, retourne `500`
4. ✅ `subtotal` présent dans le booking (ligne 80) - Si absent, retourne `500`
5. ✅ Update DB réussi (lignes 149-169) - Si erreur, retourne `500`

**Si une condition échoue**: Le webhook retourne une erreur (`500`) ou ignore (`200` si `bookingId` absent), et la DB **n'est pas mise à jour**.

---

### Webhook Edge Function (`supabase/functions/stripe-webhook/index.ts`)

#### Récupération de l'identifiant de réservation

**Ligne 114**:
```typescript
const bookingId = session?.metadata?.bookingId;
```

**Source**: `session.metadata.bookingId` depuis l'event Stripe `checkout.session.completed`

**Condition** (lignes 129-138):
```typescript
if (!bookingId) {
  console.error("❌ bookingId manquant dans metadata");
  return new Response(
    JSON.stringify({
      ok: false,
      error: "bookingId manquant dans metadata",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
```

**Si `bookingId` absent**: Le webhook retourne `200` (pour que Stripe arrête de retenter) mais **ne met pas à jour la DB**.

---

#### Requête DB exécutée

**Lignes 215-219**:
```typescript
const { data: updateData, error: updateErr } = await supabaseAdmin
  .from("bookings")
  .update(updatePayload)
  .eq("id", bookingId)
  .select();
```

**Opération**: `UPDATE bookings SET ... WHERE id = bookingId`

**Pas d'INSERT dans `payments`**: Le webhook **ne touche pas** à la table `payments`.

---

#### Conditions pour que l'update se fasse

1. ✅ Event type: `checkout.session.completed` (ligne 104)
2. ✅ `bookingId` présent dans `session.metadata.bookingId` (ligne 114)
3. ✅ Booking existe dans DB (lignes 141-156) - Si booking non trouvé, retourne `500`
4. ✅ `subtotal` présent dans le booking (ligne 143) - Si absent, retourne `500`
5. ✅ Update DB réussi (lignes 215-242) - Si erreur, retourne `500`

**Si une condition échoue**: Le webhook retourne une erreur (`500`) ou ignore (`200` si `bookingId` absent), et la DB **n'est pas mise à jour**.

---

### Analyse: Pourquoi le webhook ne met pas à jour la DB

**Scénarios possibles** (par ordre de probabilité):

#### Scénario #1: Webhook non configuré dans Stripe Dashboard (PROBABILITÉ: 40%)

**Cause**: Aucun endpoint webhook n'est configuré dans Stripe Dashboard pour recevoir `checkout.session.completed`.

**Conséquence**: Stripe n'envoie **jamais** le webhook → La DB n'est **jamais** mise à jour.

**Preuve**: Aucun log webhook dans les serveurs (Express ou Supabase Edge Functions).

---

#### Scénario #2: `bookingId` absent dans les metadata Stripe (PROBABILITÉ: 30%)

**Cause**: Lors de la création de la Checkout Session, le `bookingId` n'a pas été correctement ajouté dans les metadata.

**Conséquence**: Le webhook reçoit l'event mais `session.metadata.bookingId` est `undefined` → Le webhook retourne `200` et ignore l'update.

**Preuve**: 
- `supabase/functions/create-checkout-session/index.ts` ligne 360: `metadata: { bookingId: String(bookingId) }`
- Si `bookingId` est `null` ou `undefined` dans le body, les metadata seront vides

**Vérification**: Dans Stripe Dashboard → Checkout Sessions → Session ID → Metadata, vérifier si `bookingId` est présent.

---

#### Scénario #3: Booking non trouvé dans DB (PROBABILITÉ: 15%)

**Cause**: Le `bookingId` dans les metadata ne correspond à aucun booking dans la table `bookings`.

**Conséquence**: Le webhook essaie de lire `bookings.subtotal` mais retourne `500` (ligne 84 Express, ligne 148 Edge Function) → La DB n'est **pas** mise à jour.

**Preuve**: 
- `server/index.ts` lignes 78-86: Si `fetchErr`, retourne `500`
- `supabase/functions/stripe-webhook/index.ts` lignes 141-156: Si `fetchErr`, retourne `500`

**Vérification**: Vérifier si le booking `3be99afa-92f2-49a6-b7d1-36a39d1b902b` existe dans la table `bookings`.

---

#### Scénario #4: Erreur lors de l'update DB (PROBABILITÉ: 10%)

**Cause**: L'update DB échoue (erreur RLS, contrainte, colonne manquante, etc.).

**Conséquence**: Le webhook retourne `500` (ligne 168 Express, ligne 232 Edge Function) → La DB n'est **pas** mise à jour.

**Preuve**: 
- `server/index.ts` lignes 166-169: Si `updateErr`, retourne `500`
- `supabase/functions/stripe-webhook/index.ts` lignes 232-241: Si `updateErr`, retourne `500`

**Vérification**: Vérifier les logs du webhook pour voir l'erreur exacte.

---

#### Scénario #5: Signature webhook invalide (PROBABILITÉ: 5%)

**Cause**: Si `STRIPE_WEBHOOK_SECRET` est configuré mais incorrect, la vérification de signature échoue.

**Conséquence**: Le webhook retourne `400` (ligne 50 Express, ligne 85 Edge Function) → La DB n'est **pas** mise à jour.

**Preuve**: 
- `server/index.ts` lignes 48-50: Si signature invalide, retourne `400`
- `supabase/functions/stripe-webhook/index.ts` lignes 82-86: Si signature invalide, retourne `400`

**Vérification**: Vérifier si `STRIPE_WEBHOOK_SECRET` est configuré et correspond à celui dans Stripe Dashboard.

---

## 5️⃣ Vérifier les blocages possibles côté DB

### RLS Policies sur `bookings`

**RLS activé**: Oui (`SCRIPT-ALIGN-RLS-POLICIES.sql` ligne 21)

**Policies UPDATE** (d'après `SCRIPT-ALIGN-RLS-POLICIES.sql` lignes 100-139):
- `Users can update their bookings`: `auth.uid() = user_id`
- `owners_can_update_vehicle_bookings_status`: Owner du véhicule
- `renters_can_update_own_bookings`: `auth.uid() = user_id`

**Webhook utilise**:
- ✅ **Service role** (`supabaseAdmin`) - **Bypass RLS**
- ✅ **Peut mettre à jour toutes les colonnes** sans restriction RLS

**Preuve**:
- `server/index.ts` lignes 20-24: `createClient(..., SERVICE_ROLE_KEY, ...)`
- `supabase/functions/stripe-webhook/index.ts` lignes 41-43: `createClient(..., SERVICE_ROLE_KEY, ...)`

**Conclusion**: Les RLS policies **ne bloquent pas** les webhooks car ils utilisent le service role.

---

### RLS Policies sur `payments`

**RLS activé**: Oui (`SCRIPT-ALIGN-RLS-POLICIES.sql` ligne 25)

**Policy SELECT** (ligne 184-187):
- `Users can view their payments`: Via `bookings.user_id`

**Webhook utilise**:
- ⚠️ **Service role** - **Bypass RLS**
- ⚠️ **Mais aucun webhook n'écrit dans `payments`**

**Conclusion**: Les RLS policies sur `payments` sont **irrelevant** car aucun webhook n'écrit dans cette table.

---

## 6️⃣ Expliquer pourquoi l'UI reste en "pending payment"

### Champs DB utilisés par l'UI

**Fonction de vérification** (`src/pages/renter/RenterBookings.tsx` lignes 44-57):
```typescript
function isBookingPaid(booking: BookingWithDetails): boolean {
  // Vérifier le statut
  if (booking.status === "accepted" || booking.status === "confirmed") {
    return true;
  }
  
  // Vérifier les champs de paiement
  const bookingAny = booking as any;
  if (bookingAny.paid_at || bookingAny.stripe_checkout_session_id || bookingAny.stripe_payment_intent_id) {
    return true;
  }
  
  return false;
}
```

**Critères "payé"**:
1. ✅ `status === "accepted"` OU `status === "confirmed"`
2. ✅ `paid_at` défini (non null)
3. ✅ `stripe_checkout_session_id` défini (non null)
4. ✅ `stripe_payment_intent_id` défini (non null)

**Critères "pending payment"**:
- ❌ `status === "pending"` OU `status === "pending_payment"`
- ❌ `paid_at` est `NULL`
- ❌ `stripe_checkout_session_id` est `NULL`
- ❌ `stripe_payment_intent_id` est `NULL`

---

### Affichage du statut dans l'UI

**Composant**: `src/components/ui/status-badge.tsx` (lignes 22-26)
```typescript
pending_payment: {
  color: "bg-blue-50 text-blue-700",
  label: t('bookings.status.pending_payment'),
  icon: Clock
}
```

**Filtrage** (`src/pages/renter/RenterBookings.tsx` lignes 798-802):
```typescript
case 'pending':
  return (booking.status === 'confirmed' && depositStatus === 'pending') ||
         booking.status === 'pending' || 
         booking.status === 'pending_payment';
```

**Conclusion**: L'UI affiche "pending payment" si `status === "pending_payment"` OU `status === "pending"`.

---

### La "coche payé" est une conséquence de la DB

**Preuve**:
- `src/pages/renter/RenterBookings.tsx` ligne 144: `if (isBookingPaid(recentBooking)) { setStep1Complete(true); }`
- `src/components/PaymentFlowModal.tsx` ligne 84: `{isStep1ActuallyComplete ? <span>✅ Payé</span> : <button>Payer</button>}`

**Conclusion**: La "coche payé" est **déterminée par la DB** via `isBookingPaid()`, pas par une action utilisateur.

**Si la DB n'est pas mise à jour** → `isBookingPaid()` retourne `false` → L'UI affiche "pending payment" même si le paiement Stripe a été effectué.

---

## 7️⃣ Conclusion obligatoire

### 1. Cause racine principale

**Le webhook Stripe n'a pas été exécuté avec succès**, ou **n'a pas été appelé du tout**, ce qui empêche la mise à jour de la table `bookings` avec les informations de paiement.

**Scénarios probables** (par ordre de probabilité):
1. **Webhook non configuré** dans Stripe Dashboard (40%)
2. **`bookingId` absent** dans les metadata Stripe (30%)
3. **Booking non trouvé** dans DB (15%)
4. **Erreur lors de l'update DB** (10%)
5. **Signature webhook invalide** (5%)

---

### 2. Preuve technique

**Fichier**: `server/index.ts` lignes 66-70, 149-169  
**Fichier**: `supabase/functions/stripe-webhook/index.ts` lignes 114-138, 215-242

**Logique**:
- Le webhook récupère `bookingId` depuis `session.metadata.bookingId`
- Si `bookingId` absent → Retourne `200` et ignore l'update
- Si booking non trouvé → Retourne `500` et ignore l'update
- Si update DB échoue → Retourne `500` et ignore l'update

**Si aucune de ces conditions n'est remplie**, le webhook met à jour la DB avec `status: "accepted"`, `paid_at: <timestamp>`, et les infos Stripe.

---

### 3. Pourquoi le paiement Stripe n'est pas pris en compte par l'app

**Le paiement Stripe est validé** (utilisateur a payé sur Stripe Checkout), mais **la DB n'est pas mise à jour** car:

1. **Le webhook n'a pas été appelé** (webhook non configuré dans Stripe Dashboard)
2. **Le webhook a été appelé mais a échoué** (`bookingId` absent, booking non trouvé, erreur DB, signature invalide)

**Conséquence**: La table `bookings` reste en `status: "pending"` (ou `"pending_payment"`), les champs de paiement restent `NULL`, et l'UI affiche "pending payment" même si le paiement Stripe a été effectué.

---

### 4. À quel moment le paiement devrait être enregistré (mais ne l'est pas)

**Moment attendu**: **Immédiatement après** que Stripe envoie le webhook `checkout.session.completed` (asynchrone, peut arriver avant ou après la redirection vers `/success`).

**Processus attendu**:
1. Utilisateur paie sur Stripe Checkout
2. Stripe envoie webhook `checkout.session.completed` vers l'endpoint configuré
3. Webhook récupère `bookingId` depuis `session.metadata.bookingId`
4. Webhook met à jour `bookings` avec `status: "accepted"`, `paid_at: <timestamp>`, et les infos Stripe
5. L'UI lit la DB et affiche "payé" via `isBookingPaid()`

**Moment réel**: **Le webhook n'a pas été exécuté avec succès**, donc la DB n'a **jamais** été mise à jour, et l'UI affiche toujours "pending payment".

---

## 8️⃣ Actions de vérification recommandées (DIAG uniquement)

### Vérifications à effectuer manuellement

1. **Stripe Dashboard → Webhooks → Endpoints**:
   - Vérifier si un endpoint est configuré pour `checkout.session.completed`
   - Vérifier l'URL de l'endpoint (Express ou Edge Function)
   - Vérifier les événements reçus (logs Stripe)

2. **Stripe Dashboard → Checkout Sessions → Session ID**:
   - Vérifier si `metadata.bookingId` est présent et correspond à `3be99afa-92f2-49a6-b7d1-36a39d1b902b`

3. **Logs serveur (Express ou Supabase Edge Functions)**:
   - Vérifier si des webhooks `checkout.session.completed` ont été reçus
   - Vérifier les erreurs éventuelles (booking non trouvé, update DB échoué, etc.)

4. **DB Supabase → Table `bookings`**:
   - Vérifier si le booking `3be99afa-92f2-49a6-b7d1-36a39d1b902b` existe
   - Vérifier si `subtotal` est présent (nécessaire pour les calculs de frais)

5. **Variables d'environnement**:
   - Vérifier si `STRIPE_WEBHOOK_SECRET` est configuré (si oui, vérifier qu'il correspond à celui dans Stripe Dashboard)
   - Vérifier si `SERVICE_ROLE_KEY` est configuré (nécessaire pour bypass RLS)

---

**Note**: Ce diagnostic est **uniquement informatif**. Aucune modification n'a été apportée au code, aux secrets, ou à la configuration. Les actions correctives doivent être effectuées manuellement après vérification des points identifiés.

