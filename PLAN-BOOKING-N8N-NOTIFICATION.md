# Plan d'Implémentation - Notification automatique n8n lors d'une réservation confirmée

## 1) IDENTIFICATION - Source de vérité "réservation confirmée"

### Fichiers identifiés

**A. Webhook Stripe (point de confirmation principal)**
- **Fichier**: `server/index.ts`
- **Route**: `POST /api/stripe/webhook` (lignes 28-190)
- **Événement**: `checkout.session.completed`
- **Action**: Met à jour le booking avec `status: "accepted"` après paiement réussi

**B. Service de création de booking**
- **Fichier**: `src/services/supabase/bookings.ts`
- **Fonction**: `SupabaseBookingsService.createBooking()` (ligne 44)
- **Action**: Crée le booking initial avec `status: 'pending'`

**C. Schéma de données (table `bookings`)**
- **Fichier**: `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 199-227)
- **Champs principaux**:
  - `id` (uuid)
  - `user_id` (uuid) → référence vers `profiles.id`
  - `vehicle_id` (uuid) → référence vers `vehicles.id`
  - `start_date`, `end_date` (date)
  - `total_price`, `subtotal`, `base_price`, `options_total`, `service_fee`
  - `status` (enum: 'pending', 'pending_payment', 'confirmed', 'accepted', 'active', 'completed', 'cancelled', 'rejected', 'declined')
  - `created_at`, `updated_at`
  - `stripe_payment_intent_id`, `stripe_checkout_session_id`
  - `paid_at` (timestamp)
  - `currency`
  - `reference_number`

### Flux actuel

1. **Création booking** (`SupabaseBookingsService.createBooking`) → `status: 'pending'`
2. **Paiement Stripe** → création de `checkout.session`
3. **Webhook Stripe** (`checkout.session.completed`) → met à jour booking avec `status: "accepted"` + infos paiement

---

## 2) CHOIX DU POINT DE DÉCLENCHEMENT

### ✅ Option B recommandée : Webhook Stripe (après paiement réussi)

**Justification (3 lignes)**:
- C'est le moment où la réservation devient **réellement confirmée et payée** (pas juste créée).
- Le webhook existe déjà et met à jour le statut → point idéal pour déclencher la notification.
- Garantit que l'email n'est envoyé que pour les réservations **payées**, pas les brouillons ou annulées.

**Point d'injection**: Juste après la mise à jour réussie du booking (ligne 154 de `server/index.ts`), avant le `return res.status(200)`.

---

## 3) PAYLOAD MINIMAL pour n8n

### Champs obligatoires

```json
{
  "bookingId": "uuid",
  "status": "accepted",
  "startDate": "2026-01-15",
  "endDate": "2026-01-20",
  "vehicleId": "uuid",
  "vehicleTitle": "Toyota Yaris 2023",
  "customerFullName": "Jean Dupont",
  "customerEmail": "jean@example.com",
  "customerPhone": "+33612345678",
  "totalAmount": 350.00,
  "currency": "EUR",
  "paymentStatus": "paid",
  "stripeCheckoutSessionId": "cs_test_...",
  "createdAt": "2026-01-10T10:00:00.000Z",
  "paidAt": "2026-01-10T10:05:00.000Z"
}
```

### Exemple JSON exact

```json
{
  "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "accepted",
  "startDate": "2026-01-15",
  "endDate": "2026-01-20",
  "vehicleId": "v1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "vehicleTitle": "Toyota Yaris 2023 - Location voiture Nosy Be",
  "customerFullName": "Jean Dupont",
  "customerEmail": "jean.dupont@example.com",
  "customerPhone": "+33612345678",
  "totalAmount": 350.00,
  "currency": "EUR",
  "paymentStatus": "paid",
  "stripeCheckoutSessionId": "cs_test_a1b2c3d4e5f6",
  "createdAt": "2026-01-10T10:00:00.000Z",
  "paidAt": "2026-01-10T10:05:00.000Z"
}
```

---

## 4) IMPLÉMENTATION BACKEND

### A. Fonction utilitaire `sendBookingToN8N`

**Fichier**: `server/index.ts` (ajouter après les imports, avant les routes)

```typescript
/**
 * Envoie une notification de réservation confirmée vers n8n
 * Fire-and-forget: n'empêche pas la réservation si l'appel échoue
 */
async function sendBookingToN8N(bookingData: {
  bookingId: string;
  status: string;
  startDate: string;
  endDate: string;
  vehicleId: string;
  vehicleTitle: string;
  customerFullName: string;
  customerEmail: string;
  customerPhone?: string;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  stripeCheckoutSessionId?: string;
  createdAt: string;
  paidAt: string;
}): Promise<void> {
  const n8nWebhookUrl = process.env.N8N_BOOKING_WEBHOOK_URL;
  
  if (!n8nWebhookUrl) {
    console.warn("[BOOKING-N8N] ⚠️ N8N_BOOKING_WEBHOOK_URL non configuré, notification ignorée");
    return;
  }

  const startTime = Date.now();
  
  try {
    console.log("[BOOKING-N8N] 📡 Envoi notification réservation vers n8n", {
      bookingId: bookingData.bookingId,
      customerEmail: bookingData.customerEmail,
      totalAmount: bookingData.totalAmount,
      currency: bookingData.currency,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 secondes timeout

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_BOOKING_WEBHOOK_SECRET && {
          "X-Webhook-Secret": process.env.N8N_BOOKING_WEBHOOK_SECRET,
        }),
      },
      body: JSON.stringify(bookingData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[BOOKING-N8N] ❌ Erreur n8n webhook", {
        bookingId: bookingData.bookingId,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        duration: `${duration}ms`,
      });
      return;
    }

    console.log("[BOOKING-N8N] ✅ Notification envoyée avec succès", {
      bookingId: bookingData.bookingId,
      status: response.status,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error?.name === "AbortError" || 
                      error?.code === "ETIMEDOUT" ||
                      error?.message?.toLowerCase().includes("timeout");

    console.error("[BOOKING-N8N] ❌ Erreur lors de l'envoi vers n8n", {
      bookingId: bookingData.bookingId,
      message: error?.message,
      code: error?.code,
      name: error?.name,
      duration: `${duration}ms`,
      isTimeout,
    });
    // Ne pas throw: fire-and-forget, ne doit pas bloquer la réservation
  }
}
```

### B. Modification du webhook Stripe

**Fichier**: `server/index.ts` (ligne ~154, après la mise à jour réussie du booking)

**Code à ajouter** (juste après `console.log("✅ [webhook] Booking mis à jour après paiement:", ...)`):

```typescript
        // ✅ CHECKPOINT 1: Réservation créée et payée
        console.log("✅ [webhook] Booking mis à jour après paiement:", {
          bookingId,
          status: "accepted",
          paymentStatus: "paid",
          amountTotalPaid,
          ownerPayoutAmount,
          platformTotalFee,
        });
        
        console.log(`✅ [webhook] bookingId=${bookingId}, payment confirmed -> statutReservation=accepted, statutPaiement=paid`);

        // ✅ CHECKPOINT 2: Récupérer les données complètes pour n8n
        // Récupérer le booking complet avec relations (user + vehicle)
        const { data: bookingFull, error: bookingFullError } = await supabaseAdmin
          .from("bookings")
          .select(`
            id,
            user_id,
            vehicle_id,
            start_date,
            end_date,
            total_price,
            currency,
            status,
            created_at,
            paid_at,
            stripe_checkout_session_id,
            reference_number
          `)
          .eq("id", bookingId)
          .single();

        if (bookingFullError || !bookingFull) {
          console.error("[BOOKING-N8N] ❌ Impossible de récupérer le booking complet:", bookingFullError);
          // Ne pas bloquer: on continue même si on ne peut pas notifier n8n
        } else {
          // Récupérer le profil utilisateur (customer)
          const { data: customerProfile, error: customerError } = await supabaseAdmin
            .from("profiles")
            .select("id, email, first_name, last_name, phone, full_name")
            .eq("id", bookingFull.user_id)
            .single();

          // Récupérer le véhicule
          const { data: vehicle, error: vehicleError } = await supabaseAdmin
            .from("vehicles")
            .select("id, brand, model, year, license_plate")
            .eq("id", bookingFull.vehicle_id)
            .single();

          if (customerError || vehicleError) {
            console.error("[BOOKING-N8N] ❌ Erreur récupération données complémentaires:", {
              customerError: customerError?.message,
              vehicleError: vehicleError?.message,
            });
            // Ne pas bloquer: on continue même si on ne peut pas notifier n8n
          } else {
            // Construire le nom complet du client
            const customerFullName = 
              customerProfile?.full_name ||
              (customerProfile?.first_name && customerProfile?.last_name
                ? `${customerProfile.first_name} ${customerProfile.last_name}`
                : customerProfile?.email?.split("@")[0] || "Client");

            // Construire le titre du véhicule
            const vehicleTitle = vehicle
              ? `${vehicle.brand} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ""}${vehicle.license_plate ? ` - ${vehicle.license_plate}` : ""}`
              : "Véhicule";

            // ✅ CHECKPOINT 3: Générer le payload
            const n8nPayload = {
              bookingId: bookingFull.id,
              status: bookingFull.status || "accepted",
              startDate: bookingFull.start_date,
              endDate: bookingFull.end_date,
              vehicleId: bookingFull.vehicle_id,
              vehicleTitle,
              customerFullName,
              customerEmail: customerProfile?.email || "",
              customerPhone: customerProfile?.phone || undefined,
              totalAmount: Number(bookingFull.total_price || 0),
              currency: bookingFull.currency || "EUR",
              paymentStatus: "paid",
              stripeCheckoutSessionId: bookingFull.stripe_checkout_session_id || undefined,
              createdAt: bookingFull.created_at || new Date().toISOString(),
              paidAt: bookingFull.paid_at || new Date().toISOString(),
            };

            console.log("[BOOKING-N8N] 📦 Payload généré pour n8n", {
              bookingId: n8nPayload.bookingId,
              customerEmail: n8nPayload.customerEmail,
              vehicleTitle: n8nPayload.vehicleTitle,
              totalAmount: n8nPayload.totalAmount,
            });

            // Envoyer vers n8n (fire-and-forget)
            sendBookingToN8N(n8nPayload).catch((err) => {
              console.error("[BOOKING-N8N] ❌ Erreur non capturée dans sendBookingToN8N:", err);
              // Ne pas throw: ne doit pas bloquer la réponse du webhook
            });
          }
        }
      }
```

### C. Variables d'environnement à ajouter

**Fichier**: `.env.local` (ou Railway/Hostinger env vars)

```bash
# Webhook n8n pour notifications de réservation confirmée
N8N_BOOKING_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/rentanoo-booking-confirmed
N8N_BOOKING_WEBHOOK_SECRET=your-secret-here  # Optionnel
```

---

## 5) VALIDATION / TEST

### A. Test manuel (curl)

**Test 1: Vérifier que le webhook n8n répond**

```bash
curl -X POST https://n8n.srv1285649.hstgr.cloud/webhook/rentanoo-booking-confirmed \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "test-booking-123",
    "status": "accepted",
    "startDate": "2026-01-15",
    "endDate": "2026-01-20",
    "vehicleId": "test-vehicle-123",
    "vehicleTitle": "Toyota Yaris 2023",
    "customerFullName": "Jean Dupont",
    "customerEmail": "jean@example.com",
    "customerPhone": "+33612345678",
    "totalAmount": 350.00,
    "currency": "EUR",
    "paymentStatus": "paid",
    "stripeCheckoutSessionId": "cs_test_123",
    "createdAt": "2026-01-10T10:00:00.000Z",
    "paidAt": "2026-01-10T10:05:00.000Z"
  }'
```

**Test 2: Simuler un webhook Stripe local (pour tester le flux complet)**

```bash
# Dans un terminal séparé, démarrer le serveur backend
npm run dev:api  # ou équivalent

# Puis simuler un webhook Stripe checkout.session.completed
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "payment_intent": "pi_test_123",
        "amount_total": 35000,
        "currency": "eur",
        "metadata": {
          "bookingId": "VOTRE_BOOKING_ID_ICI"
        }
      }
    }
  }'
```

### B. Test end-to-end (réservation complète)

1. Créer une réservation via l'UI frontend
2. Compléter le paiement Stripe (mode test)
3. Vérifier les logs backend:
   - ✅ `[webhook] Booking mis à jour après paiement`
   - ✅ `[BOOKING-N8N] 📦 Payload généré pour n8n`
   - ✅ `[BOOKING-N8N] ✅ Notification envoyée avec succès`
4. Vérifier dans n8n que le webhook a reçu le payload

### C. Checkpoints de validation (logs)

**Checkpoint 1**: Réservation créée et payée
```typescript
console.log("✅ [webhook] Booking mis à jour après paiement:", { bookingId, status: "accepted", ... });
```

**Checkpoint 2**: Payload généré
```typescript
console.log("[BOOKING-N8N] 📦 Payload généré pour n8n", { bookingId, customerEmail, vehicleTitle, totalAmount });
```

**Checkpoint 3**: Requête n8n 200 OK
```typescript
console.log("[BOOKING-N8N] ✅ Notification envoyée avec succès", { bookingId, status: response.status, duration });
```

---

## 6) RÉSUMÉ DES MODIFICATIONS

### Fichiers à modifier

1. **`server/index.ts`**:
   - Ajouter la fonction `sendBookingToN8N()` (après les imports, avant les routes)
   - Modifier le webhook Stripe (après ligne 181) pour appeler `sendBookingToN8N()`

### Variables d'environnement à ajouter

- `N8N_BOOKING_WEBHOOK_URL` (obligatoire)
- `N8N_BOOKING_WEBHOOK_SECRET` (optionnel)

### Points d'attention

- ✅ **Fire-and-forget**: L'appel n8n ne doit jamais bloquer la réservation (try/catch + pas de throw)
- ✅ **Timeout**: 10 secondes max pour l'appel n8n
- ✅ **Logs**: Logs détaillés pour debugging, mais pas de données sensibles (pas de tokens Stripe complets)
- ✅ **Robustesse**: Si n8n est down ou l'URL manquante, la réservation continue normalement

---

## 7) PROCHAINES ÉTAPES

1. ✅ Ajouter le code dans `server/index.ts`
2. ✅ Configurer `N8N_BOOKING_WEBHOOK_URL` dans l'environnement
3. ✅ Créer le workflow n8n qui reçoit le webhook et envoie l'email
4. ✅ Tester avec une réservation réelle (mode test Stripe)
5. ✅ Vérifier que l'email arrive bien dans la boîte de réception

---

## 8) WORKFLOW N8N (conceptuel)

**Structure recommandée**:
1. **Webhook** (reçoit le payload)
2. **Function/Code** (optionnel: validation/transformation)
3. **Gmail** ou **Email** node (envoie l'email au client)
4. **Respond to Webhook** (200 OK)

**Template email suggéré**:
- **To**: `{{$json.customerEmail}}`
- **Subject**: `Confirmation de réservation #{{$json.bookingId}}`
- **Body**: Template HTML avec les détails de la réservation (dates, véhicule, montant, etc.)

