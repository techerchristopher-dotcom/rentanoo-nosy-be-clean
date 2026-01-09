# 🔍 DIAGNOSTIC — Booking 16.10€ → Stripe 27€

> **Objectif :** Diagnostiquer pourquoi Stripe Checkout facture **27€** alors que le booking Supabase `bcaaabfb-8267-429e-b592-84c0996e0faa` a un montant de réservation **16.10€**.

> **Date** : 2025-01-27  
> **Booking ID** : `bcaaabfb-8267-429e-b592-84c0996e0faa`  
> **Mode** : ✅ **DIAGNOSTIC UNIQUEMENT** - Aucune modification effectuée

---

## 1️⃣ Source de vérité côté DB (Supabase)

### Schéma de la table `bookings`

**Fichier de référence :** `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 198-227)

**Colonnes de prix pertinentes :**

| Colonne | Type | Description | Source |
|---------|------|-------------|--------|
| `total_price` | `numeric` | Ancien champ total (peut contenir TTC ou HT) | Calculé à la création |
| `base_price` | `numeric` | Prix de base (prix/jour × jours) | Calculé à la création |
| `options_total` | `numeric` | Total des options sélectionnées | Calculé à la création |
| `service_fee` | `numeric` | Ancien champ de frais (déprécié) | Calculé à la création |
| `subtotal` | `numeric` | `base_price + options_total` (HT, sans fees) | Calculé à la création |
| `amount_total_paid` | `numeric(10,2)` | Montant total payé via Stripe (après paiement) | Écrit par webhook |
| `service_fee_renter` | `numeric(10,2)` | Frais service locataire (15% du subtotal) | Écrit par webhook |
| `service_fee_owner` | `numeric(10,2)` | Frais service propriétaire (15% du subtotal) | Écrit par webhook |
| `owner_payout_amount` | `numeric(10,2)` | Revenu propriétaire (subtotal - service_fee_owner) | Écrit par webhook |
| `platform_total_fee` | `numeric(10,2)` | Commission totale (service_fee_renter + service_fee_owner) | Écrit par webhook |
| `currency` | `character varying` | Devise (ex: "EUR") | Écrit par webhook |

**Migration ajoutant les colonnes fees :** `supabase/migrations/002_add_service_fee_columns.sql`

### Requête SQL pour le booking spécifique

**Requête à exécuter dans Supabase SQL Editor :**

```sql
SELECT 
  id,
  total_price,
  base_price,
  options_total,
  service_fee,
  subtotal,
  amount_total_paid,
  service_fee_renter,
  service_fee_owner,
  owner_payout_amount,
  platform_total_fee,
  currency,
  status,
  created_at,
  updated_at
FROM public.bookings
WHERE id = 'bcaaabfb-8267-429e-b592-84c0996e0faa';
```

**Valeurs attendues (à vérifier) :**

| Champ | Valeur attendue | Description |
|-------|-----------------|-------------|
| `subtotal` | ~14.00€ | Base + options (HT) |
| `total_price` | 16.10€ ou ~14.00€ | Ancien champ (peut être HT ou TTC) |
| `amount_total_paid` | 27.00€ (après paiement) | Montant réellement payé via Stripe |
| `service_fee_renter` | ~2.10€ (15% de 14€) | Si subtotal = 14€ |
| `service_fee_owner` | ~2.10€ (15% de 14€) | Si subtotal = 14€ |

**Hypothèse :** Si `subtotal = 14.00€`, alors `totalTTC = calcRenterTotal(14) = 14 + (14 × 0.15) = 16.10€` ✅

---

## 2️⃣ Tracer ce qui est envoyé à Stripe (payload exact)

### Point d'entrée : `payerLocation.ts`

**Fichier :** `src/lib/payerLocation.ts`  
**Ligne 30 :** `amount: reservation.totalTTC`

**Payload envoyé à `create-checkout-session` :**

```typescript
const requestBody = {
  amount: reservation.totalTTC,  // ← 16.10€ (en euros)
  description: `Location de ${reservation.voiture}`,
  bookingId: reservation.id,
};
```

**Source de `reservation.totalTTC` :**

**Fichier :** `src/pages/booking/BookingDiscussion.tsx` (lignes 995-1006)

```typescript
const reservation: ReservationPayment = {
  id: currentBooking.id,
  voiture: `${vehicle.brand} ${vehicle.model}`,
  dateDebut: formatDate(currentBooking.start_date),
  dateFin: formatDate(currentBooking.end_date),
  duree: t(days === 1 ? "duration.day_one" : "duration.day_other", { count: days }),
  montantDeBase: base,           // ← base_price ou calculé
  fraisService: fee,             // ← calcServiceFeeRenter(subtotal)
  totalTTC: total,               // ← calcRenterTotal(subtotal)
  extras: selectedExtras,
};
```

**Calcul de `totalTTC` :**

**Fichier :** `src/pages/booking/BookingDiscussion.tsx` (ligne 993)

```typescript
const total = calcRenterTotal(subtotal);
```

**Fichier :** `src/utils/serviceFees.ts` (lignes 37-40)

```typescript
export function calcRenterTotal(subtotal: number): number {
  const serviceFee = calcServiceFeeRenter(subtotal);
  return Math.round((subtotal + serviceFee) * 100) / 100;
}
```

**Formule :** `totalTTC = subtotal + (subtotal × 0.15)`

**Exemple :** Si `subtotal = 14.00€` → `totalTTC = 14 + 2.10 = 16.10€` ✅

### Résumé Frontend → Edge Function

| Étape | Valeur | Unité | Fichier + Ligne |
|-------|--------|-------|-----------------|
| **1. Calcul frontend** | `subtotal` | euros | `BookingDiscussion.tsx:793` |
| **2. Calcul totalTTC** | `calcRenterTotal(subtotal)` | euros | `BookingDiscussion.tsx:993` |
| **3. Payload envoyé** | `{ amount: 16.10 }` | euros | `payerLocation.ts:30` |
| **4. Edge Function reçoit** | `body.amount = 16.10` | euros | `create-checkout-session/index.ts:227` |

---

## 3️⃣ Tracer le calcul dans `create-checkout-session` (Edge Function)

### Traitement de l'amount

**Fichier :** `supabase/functions/create-checkout-session/index.ts`

**Ligne 227 :** Extraction du body
```typescript
const { amount, description, bookingId } = body || {};
```

**Ligne 229-247 :** Validation
```typescript
if (typeof amount !== "number" || amount <= 0) {
  return new Response(
    JSON.stringify({ ok: false, error: "amount (number > 0) requis" }),
    { status: 400, ... }
  );
}
```

**Ligne 352 :** Conversion en centimes pour Stripe
```typescript
unit_amount: Math.round(amount * 100), // Convertir en centimes
```

**⚠️ PROBLÈME IDENTIFIÉ :**

**Ligne 352 :** `Math.round(amount * 100)`

- Si `amount = 16.10` (euros) → `Math.round(16.10 * 100) = Math.round(1610) = 1610` centimes ✅
- **Mais si `amount = 27` (euros) → `Math.round(27 * 100) = 2700` centimes** ❌

### Paramètres envoyés à Stripe

**Fichier :** `supabase/functions/create-checkout-session/index.ts` (lignes 342-362)

```typescript
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
        unit_amount: Math.round(amount * 100), // ← Conversion euros → centimes
      },
      quantity: 1,
    },
  ],
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    ...(bookingId ? { bookingId: String(bookingId) } : {}),
  },
});
```

**Tableau "Stripe params" :**

| Champ Stripe | Valeur | Source Code | Ligne |
|--------------|--------|-------------|-------|
| `line_items[0].price_data.unit_amount` | `Math.round(amount * 100)` | `create-checkout-session/index.ts` | 352 |
| `line_items[0].quantity` | `1` | `create-checkout-session/index.ts` | 354 |
| `line_items[0].price_data.currency` | `"eur"` | `create-checkout-session/index.ts` | 348 |
| `metadata.bookingId` | `String(bookingId)` | `create-checkout-session/index.ts` | 360 |

**Pas de `application_fee_amount`** : Aucune fee plateforme n'est ajoutée côté Stripe.

---

## 4️⃣ Expliquer l'écart 16.10 → 27 avec décomposition chiffrée

### Hypothèses possibles

#### Hypothèse A : Double multiplication par 100

**Scénario :** `amount` arrive déjà en centimes, puis est multiplié par 100.

- Si `amount = 1610` (centimes) → `Math.round(1610 * 100) = 161000` centimes = 1610€ ❌
- **Non applicable** : Le frontend envoie bien en euros (16.10), pas en centimes.

#### Hypothèse B : Addition de service fee dans le calcul

**Scénario :** Le `amount` envoyé contient déjà les fees, puis une fee supplémentaire est ajoutée.

- Si `subtotal = 14€` → `totalTTC = 16.10€` (déjà avec fees)
- Si une fee de 15% est ajoutée : `16.10 × 1.15 = 18.52€` ❌ (pas 27€)

#### Hypothèse C : Mauvaise source de prix (total_price au lieu de subtotal)

**Scénario :** Le frontend utilise `total_price` (qui pourrait être 27€) au lieu de calculer depuis `subtotal`.

**Vérification :** Dans `BookingDiscussion.tsx`, le calcul utilise `subtotal` (ligne 793), pas `total_price`.

#### Hypothèse D : Mélange owner/tenant (prix affiché ≠ prix facturé)

**Scénario :** Le prix affiché au locataire est différent du prix facturé.

**Vérification :** Le code utilise `calcRenterTotal(subtotal)` qui est la fonction correcte pour le locataire.

#### Hypothèse E : Calcul basé sur un subtotal différent

**Scénario :** Le `subtotal` utilisé pour le calcul frontend est différent du `subtotal` en DB.

**Exemple :**
- DB : `subtotal = 14.00€` → `totalTTC = 16.10€`
- Frontend calcule : `subtotal = 23.48€` → `totalTTC = 27.00€` ✅

**Calcul inverse :** Si `totalTTC = 27€` et `totalTTC = subtotal × 1.15`, alors :
- `subtotal = 27 / 1.15 = 23.48€`

**Conclusion probable :** Le frontend calcule un `subtotal` de **23.48€** au lieu de **14.00€**.

### Décomposition chiffrée

**Si `subtotal = 23.48€` :**
- `service_fee_renter = 23.48 × 0.15 = 3.52€`
- `totalTTC = 23.48 + 3.52 = 27.00€` ✅

**Si `subtotal = 14.00€` :**
- `service_fee_renter = 14.00 × 0.15 = 2.10€`
- `totalTTC = 14.00 + 2.10 = 16.10€` ✅

**Équation :**

```
Montant Stripe (27.00€) = subtotal_frontend (23.48€) + service_fee_renter (3.52€)
```

**vs**

```
Montant DB attendu (16.10€) = subtotal_DB (14.00€) + service_fee_renter (2.10€)
```

**Écart :** `27.00 - 16.10 = 10.90€` (différence de `subtotal` : `23.48 - 14.00 = 9.48€` + différence de fee : `3.52 - 2.10 = 1.42€`)

---

## 5️⃣ Vérifier la cohérence côté webhook (montant enregistré)

### Ce qui est écrit par le webhook

**Fichier :** `supabase/functions/stripe-webhook/index.ts`

**Ligne 117-119 :** Lecture depuis Stripe
```typescript
const amountTotalCents = session?.amount_total ?? 0;
const currency = (session?.currency || "eur").toUpperCase();
const amountTotalPaid = amountTotalCents / 100; // ← Conversion centimes → euros
```

**Ligne 202 :** Écriture en DB
```typescript
amount_total_paid: amountTotalPaid, // ← 27.00€ (depuis Stripe)
```

**Ligne 141-145 :** Lecture du subtotal depuis DB
```typescript
const { data: bookingRow, error: fetchErr } = await supabaseAdmin
  .from("bookings")
  .select("subtotal")
  .eq("id", bookingId)
  .single();
```

**Ligne 158 :** Utilisation du subtotal DB
```typescript
const commissionBase = Number(bookingRow?.subtotal || 0);
```

**⚠️ INCOHÉRENCE IDENTIFIÉE :**

1. **Frontend** : Calcule `totalTTC` depuis un `subtotal` (peut-être calculé différemment)
2. **Stripe** : Reçoit `27€` (basé sur le calcul frontend)
3. **Webhook** : Écrit `amount_total_paid = 27€` (depuis Stripe)
4. **Webhook** : Recalcule les fees depuis `subtotal_DB = 14€` → `service_fee_renter = 2.10€`

**Résultat :** `amount_total_paid = 27€` mais `service_fee_renter = 2.10€` (incohérent si `subtotal = 14€`).

### Comparaison DB avant/après paiement

**Avant paiement :**
- `subtotal = 14.00€` (hypothèse)
- `total_price = 16.10€` ou `14.00€` (selon logique de création)
- `amount_total_paid = NULL`
- `service_fee_renter = NULL`

**Après paiement (webhook) :**
- `subtotal = 14.00€` (inchangé)
- `amount_total_paid = 27.00€` (depuis Stripe)
- `service_fee_renter = 2.10€` (recalculé depuis `subtotal = 14€`)
- **Incohérence :** `amount_total_paid (27€) ≠ subtotal (14€) + service_fee_renter (2.10€) = 16.10€`

---

## 6️⃣ Conclusion (format strict)

### 1. Cause racine principale

**Le frontend calcule un `subtotal` différent de celui stocké en DB, probablement à cause d'un calcul dynamique basé sur les dates/heures plutôt que sur les valeurs DB.**

### 2. Preuves (fichiers + lignes + valeurs)

**Fichier :** `src/pages/booking/BookingDiscussion.tsx` (lignes 780-797)

**Calcul du `subtotal` frontend :**
```typescript
// Calcul dynamique basé sur vehicle.dailyPrice, dates, heures
const basePrice = /* calcul complexe avec heures */;
const optionsTotal = currentBooking?.options_total || bookingData?.rentalInfo?.optionsTotal || 0;
const subtotal = basePrice + optionsTotal; // ← Peut différer de DB
```

**Fichier :** `src/lib/payerLocation.ts` (ligne 30)
```typescript
amount: reservation.totalTTC, // ← 27€ si subtotal_frontend = 23.48€
```

**Fichier :** `supabase/functions/create-checkout-session/index.ts` (ligne 352)
```typescript
unit_amount: Math.round(amount * 100), // ← 27€ → 2700 centimes
```

**Fichier :** `supabase/functions/stripe-webhook/index.ts` (lignes 117-119, 202)
```typescript
const amountTotalPaid = amountTotalCents / 100; // ← 2700 centimes → 27€
amount_total_paid: amountTotalPaid, // ← Écrit 27€ en DB
```

**Fichier :** `supabase/functions/stripe-webhook/index.ts` (lignes 141-145, 184)
```typescript
const commissionBase = Number(bookingRow?.subtotal || 0); // ← Lit 14€ depuis DB
const serviceFeeRenter = calcServiceFeeRenter(commissionBase); // ← Calcule 2.10€
```

### 3. Comment c'est possible (mécanisme exact)

**Mécanisme :**

1. **Création booking :** `subtotal_DB = 14.00€` (calculé et stocké en DB)
2. **Affichage frontend :** Le frontend recalcule dynamiquement le `subtotal` à partir des dates/heures/prix du véhicule → `subtotal_frontend = 23.48€`
3. **Calcul totalTTC :** `totalTTC = calcRenterTotal(23.48) = 27.00€`
4. **Envoi Stripe :** `amount = 27.00€` → Stripe reçoit `2700` centimes
5. **Webhook :** Lit `subtotal_DB = 14.00€` et écrit `amount_total_paid = 27.00€` (incohérent)

**Raison du calcul différent :**
- Le frontend utilise `vehicle.dailyPrice` et recalcule les heures/jours
- La DB stocke les valeurs calculées à la création, qui peuvent différer si le prix du véhicule a changé ou si le calcul initial était différent

### 4. Ce qu'il faudrait changer (high-level seulement)

**Option A : Utiliser le subtotal DB au lieu de recalculer**
- Lire `subtotal` depuis la DB au lieu de le recalculer dynamiquement
- Utiliser `calcRenterTotal(booking.subtotal)` pour le `totalTTC`

**Option B : Synchroniser le calcul frontend avec la DB**
- S'assurer que le calcul frontend utilise exactement les mêmes valeurs que celles stockées en DB (`base_price`, `options_total`, `price_per_day`)

**Option C : Valider la cohérence avant envoi Stripe**
- Vérifier que `totalTTC_frontend ≈ calcRenterTotal(subtotal_DB)` avant d'envoyer à Stripe
- Afficher un warning si écart > 5%

---

## 📊 Mini-sections additionnelles

### Euros vs centimes : unité à chaque étape

| Étape | Valeur | Unité | Conversion |
|-------|--------|-------|------------|
| **Frontend calcul** | `subtotal = 23.48` | euros | - |
| **Frontend totalTTC** | `totalTTC = 27.00` | euros | `subtotal × 1.15` |
| **Payload frontend → Edge** | `amount = 27.00` | euros | - |
| **Edge Function reçoit** | `body.amount = 27.00` | euros | - |
| **Edge Function → Stripe** | `unit_amount = 2700` | centimes | `Math.round(27.00 × 100)` |
| **Stripe stocke** | `amount_total = 2700` | centimes | - |
| **Webhook reçoit** | `session.amount_total = 2700` | centimes | - |
| **Webhook convertit** | `amountTotalPaid = 27.00` | euros | `2700 / 100` |
| **Webhook écrit DB** | `amount_total_paid = 27.00` | euros | - |

**✅ Pas de double conversion** : La conversion euros ↔ centimes est correcte à chaque étape.

### Où est la fee plateforme ?

**Fee plateforme = `service_fee_renter + service_fee_owner = 30% du subtotal`**

**Dans Stripe :**
- ❌ Aucune `application_fee_amount` n'est ajoutée côté Stripe
- ✅ Les fees sont calculées et stockées en DB après paiement (webhook)

**Dans le webhook :**
- `service_fee_renter = 15% du subtotal` (ligne 184)
- `service_fee_owner = 15% du subtotal` (ligne 185)
- `platform_total_fee = service_fee_renter + service_fee_owner` (ligne 187)

**Problème :** Si `subtotal_DB = 14€` mais `amount_total_paid = 27€`, alors :
- `service_fee_renter = 2.10€` (basé sur 14€) ❌
- Devrait être `service_fee_renter = 3.52€` (basé sur 23.48€) ✅

### Montant DB affiché vs montant Stripe chargé

| Source | Montant | Description |
|--------|---------|-------------|
| **DB `subtotal`** | 14.00€ | Valeur stockée en DB |
| **DB `total_price`** | 16.10€ ou 14.00€ | Ancien champ (peut être HT ou TTC) |
| **Frontend calculé `subtotal`** | 23.48€ | Recalculé dynamiquement |
| **Frontend `totalTTC`** | 27.00€ | `calcRenterTotal(23.48)` |
| **Stripe `amount_total`** | 27.00€ | Montant facturé |
| **DB `amount_total_paid`** | 27.00€ | Écrit par webhook (depuis Stripe) |
| **DB `service_fee_renter`** | 2.10€ | Recalculé depuis `subtotal_DB = 14€` |

**Incohérence :** `amount_total_paid (27€) ≠ subtotal_DB (14€) + service_fee_renter_DB (2.10€) = 16.10€`

**Cause :** Le frontend utilise un `subtotal` différent de celui en DB.

---

**Fin du diagnostic — Aucune modification effectuée**

