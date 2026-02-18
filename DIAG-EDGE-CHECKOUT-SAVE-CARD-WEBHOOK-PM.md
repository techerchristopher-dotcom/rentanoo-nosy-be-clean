# DIAG — Edge Checkout save card + Webhook write PM/deposit

**Date** : 2026-02-16  
**Mode** : DIAG ONLY — aucun patch, aucune modification de code.  
**Objectif** : Valider factuellement (preuves fichier+lignes) la migration « 1 passage carte » :

- Paiement location via **Stripe Checkout**
- Carte sauvegardée automatiquement (`setup_future_usage="off_session"`)
- Après paiement, webhook Edge écrit :
  - `bookings.stripe_payment_method_id = pm_...`
  - `bookings.deposit_status = 'card_registered'` (si caution requise)
  - `profiles.stripe_customer_id = session.customer` (si absent)

---

## Contexte confirmé

| Élément | Valeur |
|---------|--------|
| Webhook prod | `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook` |
| Colonnes `bookings` | `deposit_amount_snapshot`, `deposit_status`, `stripe_payment_method_id`, `stripe_payment_intent_id`, `stripe_checkout_session_id` (présentes en DB) |

---

# 1) DIAG create-checkout-session (Edge)

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

## A. Type de paiement actuel

**Appel** : L507-526

```507:526:supabase/functions/create-checkout-session/index.ts
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description,
            },
            unit_amount: unitAmountCents, // Convertir euros → centimes
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: String(bookingId),
      },
    });
```

| Élément | Valeur |
|--------|--------|
| `mode` | `"payment"` |
| `metadata.bookingId` | Présent |
| `customer` | Absent |
| `customer_email` | Absent |
| `customer_creation` | Absent |
| `payment_intent_data` | Absent |

## B. Données lues en DB pour lier un customer

**Requête booking actuelle** : L306-310

```306:310:supabase/functions/create-checkout-session/index.ts
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("subtotal, base_price, options_total, vehicle_id, start_date, end_date")
      .eq("id", bookingId)
      .single();
```

| Champ | Inclus ? | Rôle pour customer |
|-------|----------|---------------------|
| `user_id` | ❌ Non | Requis pour joindre `profiles` (renter = locataire) |
| `subtotal`, `base_price`, etc. | ✅ Oui | Prix |

**Point d’ajout** : L308 — remplacer `"subtotal, base_price, options_total, vehicle_id, start_date, end_date"` par une chaîne incluant `user_id`.

## C. Accès à `profiles.email` / `profiles.stripe_customer_id`

**État** : Le code ne lit pas `profiles`.

Pour fournir un customer à Checkout :

1. **Avec `user_id`** : joindre `profiles` via `bookings.user_id` → `profiles.id`.
2. **Colonnes utiles** : `profiles.stripe_customer_id`, `profiles.email` (ou `auth.users.email` si non exposé).
3. **Stratégie** :
   - Si `profiles.stripe_customer_id` présent → `customer: stripe_customer_id`
   - Sinon → `customer_email: profile.email` + `customer_creation: "always"`

**Lieu** : Après la lecture booking (L306-327), ajouter une requête :

```ts
// Après lecture booking, si user_id disponible
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("stripe_customer_id, email")
  .eq("id", booking.user_id)
  .single();
```

## D. Point d’injection `setup_future_usage`

**Position** : Dans l’objet passé à `stripe.checkout.sessions.create()`, au même niveau que `line_items`.

**Code à ajouter** :

```ts
payment_intent_data: { setup_future_usage: "off_session" }
```

**Emplacement exact** : L521, juste après `cancel_url`, avant la fermeture de l’objet (L525).

| Risque | Description |
|--------|-------------|
| Sans customer | `setup_future_usage` exige qu’un Customer soit lié. Sans `customer` ni `customer_email` + `customer_creation`, la carte ne sera pas sauvegardée. |
| Incompatibilité mode | Aucune — compatible avec `mode: "payment"`. |
| Manque customer | Risque principal — l’ajout de `payment_intent_data` seul ne suffit pas sans customer. |

## Tableau synthèse create-checkout-session

| Élément | Actuel | Cible | Preuve (fichier+ligne) | Risque |
|--------|--------|-------|------------------------|--------|
| `mode` | `"payment"` | Inchangé | L508 | Aucun |
| `metadata.bookingId` | ✅ Présent | Inchangé | L524-526 | Aucun |
| `select` booking | `subtotal, base_price, options_total, vehicle_id, start_date, end_date` | + `user_id` | L308 | Sans `user_id`, impossible de joindre profile |
| Lecture `profiles` | Absente | Ajouter après L327 | — | — |
| `customer` | Absent | `customer: profile.stripe_customer_id` si présent | — | Obligatoire pour `setup_future_usage` |
| `customer_email` | Absent | `customer_email: profile.email` si pas de customer | — | Idem |
| `customer_creation` | Absent | `"always"` si `customer_email` | — | Idem |
| `payment_intent_data` | Absent | `{ setup_future_usage: "off_session" }` | L521 (à ajouter) | Faible si customer fourni |

---

# 2) DIAG stripe-webhook (Edge)

**Fichier** : `supabase/functions/stripe-webhook/index.ts`

## A. Event traité

**Filtre** : L102-108

```102:108:supabase/functions/stripe-webhook/index.ts
  // 4. On ne traite que checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    console.log("ℹ️ Event ignoré:", event.type);
    return new Response(
      JSON.stringify({ ok: true, ignored: true, type: event.type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
```

Event traité : `checkout.session.completed`.

## B. Données extraites

**Extraction** : L111-118

```111:118:supabase/functions/stripe-webhook/index.ts
  const session = event.data.object;
  const bookingId = session?.metadata?.bookingId;
  const paymentIntentId = session?.payment_intent ?? null;
  const checkoutSessionId = session?.id ?? null;
  const amountTotalCents = session?.amount_total ?? 0;
  const currency = (session?.currency || "eur").toUpperCase();
  const amountTotalPaid = amountTotalCents / 100;
```

| Donnée | Source Stripe | Extrait ? |
|--------|---------------|-----------|
| `bookingId` | `session.metadata.bookingId` | ✅ |
| `paymentIntentId` | `session.payment_intent` | ✅ |
| `checkoutSessionId` | `session.id` | ✅ |
| `session.customer` | `session.customer` | ❌ Non lu |

**Point d’ajout** : après L118, ajouter :

```ts
const stripeCustomerId = session?.customer ?? null;
```

## C. Récupération du PaymentMethod

**Usage actuel de `paymentIntents.retrieve`** : aucun (grep dans le repo).

**Emplacement** : après le select booking (L139-155), avant la construction de `updatePayload` (L195).

**Logique** :
1. Si `paymentIntentId` est présent :
   ```ts
   const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
   const paymentMethodId = paymentIntent?.payment_method ?? null;
   ```
2. Si `payment_method` est une string → utiliser telle quelle.
3. Si objet (expanded) → `payment_method.id` ou équivalent.
4. Si null → ne pas écrire `stripe_payment_method_id` ni `deposit_status` pour la caution.

**Champ Stripe** : `paymentIntent.payment_method` (ID `pm_xxx` ou objet si expand).

## D. Conditions DB pour écrire la caution

**Règle** : ne mettre `stripe_payment_method_id` et `deposit_status = 'card_registered'` que si :
- `deposit_amount_snapshot > 0`
- paiement effectué (événement `checkout.session.completed`)

**Lecture booking actuelle** : L139-144

```139:144:supabase/functions/stripe-webhook/index.ts
  const { data: bookingRow, error: fetchErr } = await supabaseAdmin
    .from("bookings")
    .select("subtotal")
    .eq("id", bookingId)
    .single();
```

**Problème** : `deposit_amount_snapshot` n’est pas lu.

**Correction (DIAG)** : L141 — compléter le select :
- Actuel : `.select("subtotal")`
- Cible : `.select("subtotal, deposit_amount_snapshot, user_id")`

`deposit_amount_snapshot` : pour la condition caution.  
`user_id` : pour l’update `profiles.stripe_customer_id`.

## E. Écriture de `profiles.stripe_customer_id`

**Condition** : `session.customer` présent et `profiles.stripe_customer_id` vide.

**Données** :
- `session.customer` : ID Stripe Customer (`cus_xxx`)
- `booking.user_id` : ID du renter (profile)

**Requête** (à ajouter après l’update booking, L228-234) :

- Condition : `stripeCustomerId` non null ET `bookingRow.user_id` présent.
- Lecture préalable du profile pour vérifier `stripe_customer_id` null :
  ```ts
  const { data: prof } = await supabaseAdmin.from("profiles").select("stripe_customer_id").eq("id", bookingRow.user_id).single();
  if (stripeCustomerId && !prof?.stripe_customer_id) {
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: stripeCustomerId, updated_at: now }).eq("id", bookingRow.user_id);
  }
  ```
- Ou : `.is("stripe_customer_id", null)` dans le filtre pour ne mettre à jour que les profils sans customer.

**Emplacement** : après L234 (réponse 200), avant le `return` final, ou en parallèle de l’update booking.

## Tableau synthèse stripe-webhook

| Champ à écrire | Condition | Source Stripe | Source DB | Preuve (fichier+ligne) |
|----------------|-----------|---------------|-----------|------------------------|
| `status` | Toujours | — | — | L196 (déjà) |
| `paid_at` | Toujours | — | — | L197 |
| `stripe_payment_intent_id` | Toujours | `session.payment_intent` | — | L200 |
| `stripe_checkout_session_id` | Toujours | `session.id` | — | L201 |
| `stripe_payment_method_id` | `deposit_amount_snapshot > 0` ET `paymentMethodId` non null | `paymentIntents.retrieve(piId).payment_method` | — | À ajouter L195+ |
| `deposit_status` | `deposit_amount_snapshot > 0` ET `paymentMethodId` non null | — | — | À ajouter L195+ : `'card_registered'` |
| `profiles.stripe_customer_id` | `session.customer` présent ET `profiles.stripe_customer_id` null | `session.customer` | `booking.user_id` → profiles.id | À ajouter après L234 |

---

# 3) RISQUES / EDGE CASES

| Risque | Preuve | Impact | Vérification | Mitigation (descriptif) |
|--------|--------|--------|--------------|--------------------------|
| 1. `session.customer` null | Stripe : customer peut être null si Checkout n’a pas créé/lié de customer | Impossible d’écrire `profiles.stripe_customer_id` | Log `session.customer` dans le webhook | Ne pas mettre à jour profiles ; flow SetupIntent reste disponible pour la caution. Vérifier que create-checkout-session envoie bien `customer` ou `customer_email` + `customer_creation`. |
| 2. `payment_method` null | `paymentIntent.payment_method` peut être null (ex. méthodes non-carte, erreur) | Pas d’écriture PM / deposit | Log `paymentIntent.payment_method` après retrieve | Ne pas écrire `stripe_payment_method_id` ni `deposit_status` ; flow SetupIntent reste disponible. |
| 3. Booking sans `deposit_amount_snapshot` | `deposit_amount_snapshot` peut être NULL (legacy, snapshot non encore écrit) | Écrire `card_registered` sans snapshot = incohérent | Vérifier `Number(bookingRow?.deposit_amount_snapshot ?? 0) > 0` | Ne mettre à jour PM/deposit que si snapshot > 0. |
| 4. `deposit_status` null vs `pending` | UI (`RenterBookingCard` L407) : `deposit_status === 'pending'` ET `!stripePmId` | Si null : UI peut considérer comme « pas de caution » | `RenterBookingCard` : `depositStatus === 'pending'` | Cohérent : si `deposit_status` null et snapshot > 0, le flow SetupIntent reste utilisé. Pas d’impact négatif. |
| 5. Trigger `booking-confirmed` (n8n) sur UPDATE | Trigger SQL `booking-confirmed` : `AFTER UPDATE ON bookings` → HTTP POST n8n | Chaque `UPDATE` bookings déclenche n8n | `pg_trigger` : tgname=`booking-confirmed` | Faire un seul UPDATE (fees + PM + deposit_status). Éviter deux updates séparés pour ne pas doubler l’appel n8n. |

**Preuve trigger** :
```sql
-- Résultat pg_trigger
tgname: "booking-confirmed"
def: CREATE TRIGGER "booking-confirmed" AFTER UPDATE ON bookings
     FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(...)
```

---

# 4) CHECKLIST GO / NO GO (production-safe)

## Avant déploiement

- [ ] Colonnes DB : `deposit_amount_snapshot`, `deposit_status`, `stripe_payment_method_id` présentes sur `bookings` ; `stripe_customer_id` sur `profiles`
- [ ] Webhook Edge actif en prod : `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`
- [ ] Clés Stripe LIVE alignées : `sk_live_`, `STRIPE_WEBHOOK_SECRET` correspondant
- [ ] create-checkout-session peut lire `user_id` + profile (stripe_customer_id, email)

## Après déploiement (1 booking test)

- [ ] Paiement Checkout réussi
- [ ] `bookings.status` = `'confirmed'`
- [ ] `bookings.stripe_payment_method_id` rempli (si snapshot > 0)
- [ ] `bookings.deposit_status` = `'card_registered'` si snapshot > 0
- [ ] `profiles.stripe_customer_id` rempli si absent avant paiement
- [ ] Pas de bouton « Activer caution » pour ce booking (PM déjà présent)

---

# 5) CONCLUSION

| Critère | État |
|---------|------|
| create-checkout-session : mode, metadata | OK |
| create-checkout-session : customer / setup_future_usage | À ajouter (user_id, profile, customer/customer_email, payment_intent_data) |
| stripe-webhook : event, données de base | OK |
| stripe-webhook : PM, deposit_status, profiles | À ajouter (select étendu, paymentIntents.retrieve, update conditionnel) |
| Colonnes DB | OK (confirmé par `list_tables`) |
| Risques identifiés | Maîtrisables (single update, conditions snapshot, gestion null) |

## Verdict : **GO** sous conditions

Le diagnostic confirme que la migration « 1 passage carte » est faisable. Les changements sont localisés dans :

1. **create-checkout-session** : `user_id` dans le select, lecture profile, `customer` ou `customer_email` + `customer_creation`, `payment_intent_data: { setup_future_usage: "off_session" }`.
2. **stripe-webhook** : select avec `deposit_amount_snapshot`, `user_id`, extraction de `session.customer`, `paymentIntents.retrieve`, mise à jour conditionnelle de `stripe_payment_method_id`, `deposit_status` et `profiles.stripe_customer_id`, en un seul `UPDATE` pour éviter le double appel n8n.

---

**Rappel** : DIAG ONLY — aucune modification de code.
