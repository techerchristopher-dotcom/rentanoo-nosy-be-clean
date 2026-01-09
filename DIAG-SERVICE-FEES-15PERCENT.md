# DIAGNOSTIC COMPLET — Frais de Service (15% renter + 15% owner)

**Date**: 2025-01-27  
**Scope**: Diagnostic ONLY — Aucune modification de code

---

## 📋 RÉSUMÉ EXÉCUTIF

### Règle métier identifiée
- **15% côté renter (locataire)**: Ajouté au `subtotal` pour calculer le `totalAmount` payé par le locataire
- **15% côté owner (propriétaire)**: Prélevé sur le `subtotal` (commission plateforme), réduisant le revenu du propriétaire

**Base de calcul**: Les deux 15% sont calculés sur le **même `subtotal`** (basePrice + optionsTotal)

**Exemple**:
- Subtotal: 100€
- Service fee renter: 15€ → Total payé par renter: 115€
- Service fee owner: 15€ → Revenu owner: 85€
- **Total commission plateforme**: 30€ (15€ + 15€)

---

## 🔍 A) INVENTAIRE DES SOURCES

### A.1 Recherche "15%"

| Fichier | Ligne | Contexte | Type |
|---------|-------|----------|------|
| `src/components/PaymentFlowModal.tsx` | 120 | `<span>Frais de service (15%)</span>` | UI - Texte hardcodé FR |
| `src/components/OwnerBookingCard.tsx` | 981 | `<span>Commission (15%)</span>` | UI - Texte hardcodé FR |
| `src/components/OwnerBookingCard.tsx` | 1379 | `<span>Commission de la plateforme (15%)</span>` | UI - Texte hardcodé FR |
| `src/components/RenterBookingCard.tsx` | 1060 | `// Ajouter les frais de service (15%)` | Commentaire |
| `src/components/RenterBookingCard.tsx` | 1140 | `<span>Frais de service (15%)</span>` | UI - Texte hardcodé FR |
| `src/components/RenterBookingCard.tsx` | 1727 | `Frais de service (15%)` | UI - Texte hardcodé FR |
| `src/components/booking/BookingConfirmationModal.tsx` | 126 | `// Calculer les frais de service (15%)` | Commentaire |
| `server/index.ts` | 89 | `// Calculs business (15% locataire + 15% propriétaire) sur subtotal` | Commentaire |
| `supabase/functions/stripe-webhook/index.ts` | 160 | `// 15% locataire / 15% propriétaire` | Commentaire |

### A.2 Recherche "0.15" (calculs)

| Fichier | Ligne | Code | Contexte |
|---------|-------|------|----------|
| `src/components/OwnerBookingCard.tsx` | 982 | `* 0.15` | Calcul commission owner (affichage) |
| `src/components/OwnerBookingCard.tsx` | 1380 | `* 0.15` | Calcul commission owner (fallback) |
| `src/components/OwnerBookingCard.tsx` | 1390 | `* 0.15` | Calcul commission owner (revenu) |
| `src/components/RenterBookingCard.tsx` | 1061 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `src/components/RenterBookingCard.tsx` | 1116 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter (tooltip) |
| `src/components/RenterBookingCard.tsx` | 1217 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter (paiement) |
| `src/components/RenterBookingCard.tsx` | 1271 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter (paiement) |
| `src/components/RenterBookingCard.tsx` | 1757 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter (fonction) |
| `src/components/RenterBookingCard.tsx` | 1797 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter (fonction) |
| `src/pages/booking/BookingDiscussion.tsx` | 960 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `src/pages/vehicles/VehicleDetails.tsx` | 541 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `src/pages/vehicles/MotoVehicleDetails.tsx` | 532 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `src/components/booking/BookingConfirmationModal.tsx` | 127 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `src/pages/renter/RenterBookings.tsx` | 109 | `base * 0.15` | Calcul service fee renter (simplifié) |
| `src/services/localStorage/bookingStorage.ts` | 163 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `src/services/localStorage/bookingStorage.ts` | 204 | `subtotal * 0.15 * 100) / 100` | Calcul service fee renter |
| `server/index.ts` | 91 | `commissionBase * 0.15` | Calcul serviceFeeRenter |
| `server/index.ts` | 92 | `commissionBase * 0.15` | Calcul serviceFeeOwner |
| `supabase/functions/stripe-webhook/index.ts` | 161 | `commissionBase * 0.15` | Calcul serviceFeeRenter |
| `supabase/functions/stripe-webhook/index.ts` | 162 | `commissionBase * 0.15` | Calcul serviceFeeOwner |

### A.3 Recherche "service fee" / "serviceFee"

| Fichier | Ligne | Contexte | Type |
|---------|-------|----------|------|
| `src/components/OwnerBookingCard.tsx` | 74 | `serviceFee?: number` | Type TypeScript |
| `src/components/OwnerBookingCard.tsx` | 1380 | `(booking as any).serviceFee` | Lecture DB |
| `src/components/OwnerBookingCard.tsx` | 1390 | `(booking as any).serviceFee` | Lecture DB |
| `src/components/RenterBookingCard.tsx` | 1061 | `const serviceFee = ...` | Variable locale |
| `src/components/RenterBookingCard.tsx` | 1116 | `const serviceFee = ...` | Variable locale |
| `src/components/RenterBookingCard.tsx` | 1797 | `const serviceFee = ...` | Variable locale |
| `src/pages/vehicles/VehicleDetails.tsx` | 541 | `const serviceFee = ...` | Variable locale |
| `src/pages/vehicles/VehicleDetails.tsx` | 555 | `serviceFee: serviceFee` | Envoi à DB |
| `src/components/booking/BookingConfirmationModal.tsx` | 127 | `const serviceFee = ...` | Variable locale |
| `src/services/localStorage/bookingStorage.ts` | 49 | `serviceFee: number` | Type TypeScript |
| `src/services/localStorage/bookingStorage.ts` | 163 | `const serviceFee = ...` | Variable locale |
| `src/services/localStorage/bookingStorage.ts` | 171 | `serviceFee` | Stockage localStorage |
| `src/services/localStorage/bookingStorage.ts` | 204 | `const serviceFee = ...` | Variable locale |
| `src/services/localStorage/bookingStorage.ts` | 224 | `serviceFee` | Stockage localStorage |
| `src/services/supabase/bookings.ts` | 26 | `serviceFee?: number` | Type TypeScript |
| `src/services/supabase/bookings.ts` | 65 | `service_fee: bookingData.serviceFee \|\| 0` | Insertion DB |
| `src/integrations/supabase/types.ts` | 34 | `service_fee: number` | Type DB |
| `src/integrations/supabase/types.ts` | 56 | `service_fee?: number` | Type DB Insert |
| `src/integrations/supabase/types.ts` | 78 | `service_fee?: number` | Type DB Update |
| `src/pages/owner/OwnerBookings.tsx` | 45 | `serviceFee?: number` | Type TypeScript |
| `src/pages/owner/OwnerBookings.tsx` | 207 | `serviceFee: booking.service_fee` | Mapping DB |

### A.4 Recherche "commission"

| Fichier | Ligne | Contexte | Type |
|---------|-------|----------|------|
| `src/components/OwnerBookingCard.tsx` | 981 | `Commission (15%)` | UI - Texte hardcodé FR |
| `src/components/OwnerBookingCard.tsx` | 1379 | `Commission de la plateforme (15%)` | UI - Texte hardcodé FR |
| `src/components/OwnerBookingCard.tsx` | 1390 | `const commission = ...` | Variable locale |
| `server/index.ts` | 77 | `// Lire commission base depuis Supabase: subtotal` | Commentaire |
| `server/index.ts` | 88 | `const commissionBase = ...` | Variable locale |
| `supabase/functions/stripe-webhook/index.ts` | 158 | `const commissionBase = ...` | Variable locale |

### A.5 Clés i18n

| Clé | Fichiers JSON | Usage |
|-----|---------------|-------|
| `booking.serviceFee` | `fr/common.json:149`, `en/common.json:149`, `it/common.json:855`, `de/common.json:855` | Label avec interpolation `{{percent}}` |
| `booking.excludingFeesNote` | `fr/common.json:131`, `en/common.json:131`, `it/common.json:837` | Note "* Hors options et frais de service" |

**⚠️ PROBLÈME**: Les textes hardcodés "Frais de service (15%)" et "Commission (15%)" ne utilisent PAS la clé i18n `booking.serviceFee`.

---

## 🔄 B) FLOW TECHNIQUE

### B.1 Flow Frontend → Backend → Stripe

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Calcul)                                                │
├─────────────────────────────────────────────────────────────────┤
│ 1. Calcul du subtotal                                            │
│    basePrice + optionsTotal = subtotal                           │
│                                                                  │
│ 2. Calcul service fee renter                                    │
│    serviceFee = Math.round(subtotal * 0.15 * 100) / 100        │
│                                                                  │
│ 3. Calcul total à payer                                          │
│    totalAmount = subtotal + serviceFee                           │
│                                                                  │
│ 4. Création booking dans Supabase                               │
│    - subtotal: subtotal                                          │
│    - service_fee: serviceFee (⚠️ UN SEUL CHAMP)                   │
│    - total_price: totalAmount                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STRIPE CHECKOUT SESSION (create-checkout-session)                │
├─────────────────────────────────────────────────────────────────┤
│ - amount: reservation.totalTTC (déjà calculé avec serviceFee)  │
│ - line_items: UNE SEULE LIGNE avec le montant total             │
│ - ⚠️ PAS de frais séparés dans Stripe                            │
│ - ⚠️ PAS d'application_fee_amount                               │
│ - ⚠️ PAS de transfer_data                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ WEBHOOK STRIPE (checkout.session.completed)                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Lecture booking.subtotal depuis DB                           │
│                                                                  │
│ 2. Calcul des frais                                             │
│    serviceFeeRenter = round2(subtotal * 0.15)                  │
│    serviceFeeOwner = round2(subtotal * 0.15)                    │
│    amountTotalPaid = subtotal + serviceFeeRenter                │
│    ownerPayoutAmount = subtotal - serviceFeeOwner                │
│    platformTotalFee = serviceFeeRenter + serviceFeeOwner         │
│                                                                  │
│ 3. Mise à jour booking                                          │
│    - service_fee_renter: serviceFeeRenter                        │
│    - service_fee_owner: serviceFeeOwner                          │
│    - owner_payout_amount: ownerPayoutAmount                      │
│    - platform_total_fee: platformTotalFee                       │
│    - amount_total_paid: amountTotalPaid                          │
│                                                                  │
│ ⚠️ PROBLÈME: Ces colonnes n'existent peut-être pas dans le      │
│    schéma actuel de la table bookings                           │
└─────────────────────────────────────────────────────────────────┘
```

### B.2 Côté Frontend — Calculs

#### B.2.1 Helpers de calcul

**Fichier**: `src/components/RenterBookingCard.tsx`
- **Ligne 1061**: `const serviceFee = Math.round(subtotal * 0.15 * 100) / 100`
- **Ligne 1064**: `const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100`

**Fichier**: `src/services/localStorage/bookingStorage.ts`
- **Ligne 163**: `const serviceFee = Math.round(subtotal * 0.15 * 100) / 100`
- **Ligne 164**: `const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100`

**Fichier**: `src/components/booking/BookingConfirmationModal.tsx`
- **Ligne 127**: `const serviceFee = Math.round(subtotal * 0.15 * 100) / 100`
- **Ligne 130**: `const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100`

**Pattern identique dans**:
- `src/pages/vehicles/VehicleDetails.tsx:541`
- `src/pages/vehicles/MotoVehicleDetails.tsx:532`
- `src/pages/booking/BookingDiscussion.tsx:960`

#### B.2.2 Calcul côté Owner (affichage)

**Fichier**: `src/components/OwnerBookingCard.tsx`
- **Ligne 982**: `Math.round(((booking as any).totalPrice || booking.totalAmount || 0) * 0.15)`
- **Ligne 1380**: `(booking as any).serviceFee || Math.round(((booking as any).totalPrice || 0) * 0.15)`
- **Ligne 1390**: `const commission = (booking as any).serviceFee || Math.round(total * 0.15)`

**⚠️ PROBLÈME**: Le calcul owner utilise `totalPrice * 0.15` au lieu de `subtotal * 0.15`, ce qui peut créer un désalignement si `totalPrice` inclut déjà le service fee renter.

### B.3 Côté Backend — Endpoints

#### B.3.1 Webhook Stripe (server/index.ts)

**Fichier**: `server/index.ts`  
**Lignes**: 88-116

```typescript
const commissionBase = Number(bookingRow?.subtotal || 0);
const serviceFeeRenter = round2(commissionBase * 0.15);
const serviceFeeOwner = round2(commissionBase * 0.15);
const amountTotalPaid = round2(commissionBase + serviceFeeRenter);
const ownerPayoutAmount = round2(commissionBase - serviceFeeOwner);
const platformTotalFee = round2(serviceFeeRenter + serviceFeeOwner);

await supabaseAdmin.from("bookings").update({
  service_fee_renter: serviceFeeRenter,
  service_fee_owner: serviceFeeOwner,
  owner_payout_amount: ownerPayoutAmount,
  platform_total_fee: platformTotalFee,
  amount_total_paid: amountTotalPaid,
  // ...
});
```

#### B.3.2 Webhook Stripe (Edge Function)

**Fichier**: `supabase/functions/stripe-webhook/index.ts`  
**Lignes**: 158-183

```typescript
const commissionBase = Number(bookingRow?.subtotal || 0);
const serviceFeeRenter = round2(commissionBase * 0.15);
const serviceFeeOwner = round2(commissionBase * 0.15);
const ownerPayoutAmount = round2(commissionBase - serviceFeeOwner);
const platformTotalFee = round2(serviceFeeRenter + serviceFeeOwner);

await supabaseAdmin.from("bookings").update({
  service_fee_renter: serviceFeeRenter,
  service_fee_owner: serviceFeeOwner,
  owner_payout_amount: ownerPayoutAmount,
  platform_total_fee: platformTotalFee,
  // ...
});
```

**⚠️ PROBLÈME CRITIQUE**: Les webhooks tentent d'écrire dans des colonnes (`service_fee_renter`, `service_fee_owner`, `owner_payout_amount`, `platform_total_fee`, `amount_total_paid`) qui **n'existent pas** dans le schéma actuel de la table `bookings` (voir section C.3).

### B.4 Côté Stripe — Configuration

#### B.4.1 Création de la session checkout

**Fichier**: `supabase/functions/create-checkout-session/index.ts`  
**Lignes**: 145-165

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [
    {
      price_data: {
        currency: "eur",
        product_data: { name: description },
        unit_amount: Math.round(amount * 100), // amount = totalTTC (déjà avec serviceFee)
      },
      quantity: 1,
    },
  ],
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: { bookingId: String(bookingId) },
});
```

**⚠️ OBSERVATIONS**:
- **PAS** d'`application_fee_amount` (frais Stripe Connect)
- **PAS** de `transfer_data` (split payment)
- **PAS** de ligne séparée pour les frais
- Le montant envoyé à Stripe est le **total final** (subtotal + serviceFee renter)

**Conséquence**: Stripe facture le montant total, mais la plateforme doit gérer manuellement le split owner/renter dans le webhook.

---

## 📊 C) RÈGLE MÉTIER EXACTE

### C.1 Règle identifiée

**Base de calcul**: `subtotal = basePrice + optionsTotal`

1. **Service fee renter (15%)**:
   - Calcul: `serviceFeeRenter = subtotal * 0.15`
   - Ajouté au subtotal: `totalAmount = subtotal + serviceFeeRenter`
   - **Payé par le locataire**

2. **Service fee owner (15%)**:
   - Calcul: `serviceFeeOwner = subtotal * 0.15`
   - Prélevé du subtotal: `ownerPayoutAmount = subtotal - serviceFeeOwner`
   - **Revenu du propriétaire**

3. **Commission totale plateforme**:
   - `platformTotalFee = serviceFeeRenter + serviceFeeOwner = subtotal * 0.30`

### C.2 Exemple concret

**Données**:
- `basePrice`: 100€
- `optionsTotal`: 20€
- `subtotal`: 120€

**Calculs**:
- `serviceFeeRenter`: 120€ × 0.15 = 18€
- `totalAmount` (payé par renter): 120€ + 18€ = **138€**
- `serviceFeeOwner`: 120€ × 0.15 = 18€
- `ownerPayoutAmount`: 120€ - 18€ = **102€**
- `platformTotalFee`: 18€ + 18€ = **36€**

### C.3 Schéma de base de données

#### C.3.1 Colonnes existantes (confirmées)

**Fichier**: `src/integrations/supabase/types.ts` (lignes 17-39)  
**Fichier**: `ETAPE-3-PLAN-RECREATE-SANS-DONNEES.md` (lignes 206-227)

```sql
CREATE TABLE public.bookings (
  -- ...
  base_price NUMERIC(10, 2),
  options_total NUMERIC(10, 2),
  service_fee NUMERIC(10, 2),  -- ✅ EXISTE (mais UN SEUL champ)
  subtotal NUMERIC(10, 2),
  total_price NUMERIC(10, 2),
  -- ...
);
```

#### C.3.2 Colonnes manquantes (utilisées dans webhooks)

Les webhooks tentent d'écrire dans ces colonnes qui **n'existent pas**:

- ❌ `service_fee_renter`
- ❌ `service_fee_owner`
- ❌ `owner_payout_amount`
- ❌ `platform_total_fee`
- ❌ `amount_total_paid`
- ❌ `stripe_payment_intent_id`
- ❌ `stripe_checkout_session_id`
- ❌ `paid_at`

**⚠️ RISQUE CRITIQUE**: Les webhooks échoueront silencieusement ou avec erreur lors de la mise à jour de la table `bookings`.

---

## 🖥️ D) UI — OÙ C'EST AFFICHÉ

### D.1 Écrans avec affichage des frais

#### D.1.1 PaymentFlowModal — "Confirmer et payer"

**Fichier**: `src/components/PaymentFlowModal.tsx`  
**Lignes**: 119-121

```tsx
<div className="flex justify-between text-sm text-muted-foreground">
  <span>Frais de service (15%)</span>
  <span>+{reservation.fraisService.toFixed(2)}€</span>
</div>
```

**Contexte**: Modal de paiement, étape 1 "Payer ma location"  
**Texte**: Hardcodé FR "Frais de service (15%)"  
**Calcul**: `reservation.fraisService` (passé en props, calculé en amont)

#### D.1.2 RenterBookingCard — Détail du prix (tooltip)

**Fichier**: `src/components/RenterBookingCard.tsx`  
**Lignes**: 1138-1142

```tsx
<div className="flex justify-between text-muted-foreground">
  {/* TODO(i18n): bookings.details.serviceFee */}
  <span>Frais de service (15%)</span>
  <span>+{formatMoney(serviceFee)}</span>
</div>
```

**Contexte**: Tooltip sur le montant total de la réservation  
**Texte**: Hardcodé FR "Frais de service (15%)"  
**Calcul**: `const serviceFee = Math.round(subtotal * 0.15 * 100) / 100` (ligne 1116)

#### D.1.3 RenterBookingCard — Modal de paiement

**Fichier**: `src/components/RenterBookingCard.tsx`  
**Ligne**: 1727

```tsx
Frais de service (15%)
```

**Contexte**: Affichage dans une modal (contexte exact à vérifier)  
**Texte**: Hardcodé FR

#### D.1.4 OwnerBookingCard — Détail du revenu (tooltip)

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: 980-982

```tsx
<div className="flex justify-between text-muted-foreground">
  <span>Commission (15%)</span>
  <span>-{Math.round(((booking as any).totalPrice || booking.totalAmount || 0) * 0.15)}€</span>
</div>
```

**Contexte**: Tooltip sur le revenu du propriétaire  
**Texte**: Hardcodé FR "Commission (15%)"  
**Calcul**: `totalPrice * 0.15` (⚠️ devrait être `subtotal * 0.15`)

#### D.1.5 OwnerBookingCard — Résumé revenu propriétaire

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: 1378-1380

```tsx
<div className="flex justify-between text-muted-foreground">
  <span className="text-sm">Commission de la plateforme (15%)</span>
  <span className="text-sm text-destructive">- {(booking as any).serviceFee || Math.round(((booking as any).totalPrice || 0) * 0.15)}€</span>
</div>
```

**Contexte**: Section "REVENU PROPRIÉTAIRE" dans la card  
**Texte**: Hardcodé FR "Commission de la plateforme (15%)"  
**Calcul**: `(booking as any).serviceFee || totalPrice * 0.15` (fallback)

#### D.1.6 BookingConfirmationModal

**Fichier**: `src/components/booking/BookingConfirmationModal.tsx`  
**Lignes**: 127, 371-373

```tsx
const serviceFee = Math.round(subtotal * 0.15 * 100) / 100;

// ...

{t("booking.serviceFee", { percent: 15 })}
<span className="text-base font-bold text-muted-foreground min-w-[80px] text-right">
  + {formatCurrency(serviceFee, currencyLocale)}
</span>
```

**Contexte**: Modal de confirmation de réservation  
**Texte**: ✅ Utilise i18n `booking.serviceFee` avec interpolation  
**Calcul**: `subtotal * 0.15`

### D.2 Résumé des textes hardcodés

| Fichier | Ligne | Texte | i18n ? |
|---------|-------|-------|--------|
| `PaymentFlowModal.tsx` | 120 | "Frais de service (15%)" | ❌ |
| `RenterBookingCard.tsx` | 1140 | "Frais de service (15%)" | ❌ |
| `RenterBookingCard.tsx` | 1727 | "Frais de service (15%)" | ❌ |
| `OwnerBookingCard.tsx` | 981 | "Commission (15%)" | ❌ |
| `OwnerBookingCard.tsx` | 1379 | "Commission de la plateforme (15%)" | ❌ |
| `BookingConfirmationModal.tsx` | 371 | `t("booking.serviceFee", { percent: 15 })` | ✅ |

**⚠️ PROBLÈME**: 5 occurrences hardcodées FR sur 6 écrans.

---

## ⚠️ E) RISQUES IDENTIFIÉS

### E.1 Risques critiques

#### E.1.1 Colonnes DB manquantes

**Problème**: Les webhooks tentent d'écrire dans des colonnes qui n'existent pas:
- `service_fee_renter`
- `service_fee_owner`
- `owner_payout_amount`
- `platform_total_fee`
- `amount_total_paid`
- `stripe_payment_intent_id`
- `stripe_checkout_session_id`
- `paid_at`

**Impact**: 
- Les webhooks échoueront lors de la mise à jour
- Les données de split owner/renter ne seront pas stockées
- Impossible de calculer le revenu owner correctement

**Preuve**: 
- `server/index.ts:113-116`
- `supabase/functions/stripe-webhook/index.ts:177-180`
- Schéma DB: `src/integrations/supabase/types.ts:34` (uniquement `service_fee`)

#### E.1.2 Désalignement calcul owner

**Problème**: Le calcul de la commission owner utilise `totalPrice * 0.15` au lieu de `subtotal * 0.15`.

**Fichiers**:
- `src/components/OwnerBookingCard.tsx:982`
- `src/components/OwnerBookingCard.tsx:1380`

**Impact**: Si `totalPrice` inclut déjà le service fee renter, la commission owner sera surévaluée.

**Exemple**:
- `subtotal`: 100€
- `totalPrice`: 115€ (avec serviceFee renter)
- Calcul actuel: 115€ × 0.15 = 17.25€ ❌
- Calcul correct: 100€ × 0.15 = 15€ ✅

### E.2 Risques moyens

#### E.2.1 Pas de source de vérité unique

**Problème**: Le pourcentage `0.15` est hardcodé dans **20+ endroits** du code.

**Impact**: 
- Impossible de changer le pourcentage sans modifier tous les fichiers
- Risque d'incohérence si un fichier est oublié
- Pas de configuration centralisée

#### E.2.2 Textes hardcodés FR

**Problème**: 5 occurrences de textes hardcodés "Frais de service (15%)" / "Commission (15%)" au lieu d'utiliser i18n.

**Impact**: 
- Pas de traduction
- Impossible de changer le texte sans modifier le code
- Incohérence avec `BookingConfirmationModal` qui utilise i18n

#### E.2.3 Stripe ne gère pas le split

**Problème**: Stripe reçoit uniquement le montant total, sans information sur le split owner/renter.

**Impact**: 
- La plateforme doit gérer manuellement le split dans le webhook
- Pas de garantie que le split soit correct
- Risque de désalignement si le calcul change

### E.3 Risques mineurs

#### E.3.1 Arrondis multiples

**Problème**: Les arrondis sont effectués à chaque étape (`Math.round(... * 100) / 100`).

**Impact**: 
- Petites différences d'arrondi possibles entre frontend et backend
- Risque de désalignement de quelques centimes

#### E.3.2 Calcul simplifié dans RenterBookings

**Fichier**: `src/pages/renter/RenterBookings.tsx:109`

```typescript
const fee = base * 0.15; // ⚠️ Pas d'arrondi, pas de subtotal
```

**Impact**: Calcul différent des autres endroits (pas d'arrondi, pas de prise en compte des options).

---

## 📁 F) FICHIERS IMPACTÉS (pour changement futur)

### F.1 Fichiers avec calcul `0.15`

Si on veut changer le pourcentage, il faudra modifier:

1. `src/components/RenterBookingCard.tsx` (6 occurrences)
2. `src/components/OwnerBookingCard.tsx` (3 occurrences)
3. `src/components/booking/BookingConfirmationModal.tsx` (1 occurrence)
4. `src/pages/booking/BookingDiscussion.tsx` (1 occurrence)
5. `src/pages/vehicles/VehicleDetails.tsx` (1 occurrence)
6. `src/pages/vehicles/MotoVehicleDetails.tsx` (1 occurrence)
7. `src/pages/renter/RenterBookings.tsx` (1 occurrence)
8. `src/services/localStorage/bookingStorage.ts` (2 occurrences)
9. `server/index.ts` (2 occurrences)
10. `supabase/functions/stripe-webhook/index.ts` (2 occurrences)

**Total**: 20 fichiers avec calculs hardcodés

### F.2 Fichiers avec textes hardcodés "15%"

1. `src/components/PaymentFlowModal.tsx`
2. `src/components/RenterBookingCard.tsx` (2 occurrences)
3. `src/components/OwnerBookingCard.tsx` (2 occurrences)

**Total**: 3 fichiers avec textes hardcodés

### F.3 Fichiers avec clés i18n

1. `src/i18n/locales/fr/common.json`
2. `src/i18n/locales/en/common.json`
3. `src/i18n/locales/it/common.json`
4. `src/i18n/locales/de/common.json`

**Total**: 4 fichiers JSON i18n (déjà corrects)

---

## 🎯 G) SOURCE OF TRUTH RECOMMANDÉE

### G.1 Constante centralisée (recommandé)

**Fichier recommandé**: `src/config/fees.ts` (à créer)

```typescript
export const SERVICE_FEE_PERCENT = 0.15; // 15%
export const SERVICE_FEE_RENTER_PERCENT = 0.15; // 15%
export const SERVICE_FEE_OWNER_PERCENT = 0.15; // 15%
```

**Avantages**:
- Source unique de vérité
- Facile à changer
- Type-safe

### G.2 Variable d'environnement (alternative)

**Fichier**: `.env.local`

```bash
VITE_SERVICE_FEE_PERCENT=0.15
```

**Avantages**:
- Configuration par environnement
- Pas besoin de rebuild pour changer

**Inconvénients**:
- Moins type-safe
- Nécessite parsing string → number

### G.3 Table de configuration DB (pour production)

**Table**: `platform_config`

```sql
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_config (key, value) VALUES
  ('service_fee_renter_percent', 0.15),
  ('service_fee_owner_percent', 0.15);
```

**Avantages**:
- Changement sans déploiement
- Historique des changements
- Différents pourcentages par type de véhicule possible

---

## 📝 H) DIAGRAMME DE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND - Calcul initial                                    │
├─────────────────────────────────────────────────────────────┤
│ subtotal = basePrice + optionsTotal                          │
│ serviceFee = subtotal * 0.15                                 │
│ totalAmount = subtotal + serviceFee                          │
│                                                              │
│ → Création booking dans Supabase                             │
│   - subtotal: 120€                                           │
│   - service_fee: 18€ (⚠️ UN SEUL CHAMP)                     │
│   - total_price: 138€                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STRIPE CHECKOUT SESSION                                       │
├─────────────────────────────────────────────────────────────┤
│ amount: 138€ (totalAmount)                                   │
│ line_items: [ { unit_amount: 13800 centimes } ]             │
│ ⚠️ PAS de split, PAS de frais séparés                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ (paiement réussi)
┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK STRIPE (checkout.session.completed)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Lecture booking.subtotal = 120€                           │
│                                                              │
│ 2. Calculs                                                   │
│    serviceFeeRenter = 120€ * 0.15 = 18€                     │
│    serviceFeeOwner = 120€ * 0.15 = 18€                       │
│    ownerPayoutAmount = 120€ - 18€ = 102€                     │
│    platformTotalFee = 18€ + 18€ = 36€                        │
│                                                              │
│ 3. Mise à jour booking                                       │
│    ⚠️ TENTATIVE d'écriture dans colonnes inexistantes:       │
│    - service_fee_renter: 18€                                 │
│    - service_fee_owner: 18€                                  │
│    - owner_payout_amount: 102€                               │
│    - platform_total_fee: 36€                                 │
│    → ÉCHEC SILENCIEUX ou ERREUR                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ H) CHECKLIST DE VALIDATION

- [x] Inventaire complet des occurrences "15%" et "0.15"
- [x] Identification du flow frontend → backend → Stripe
- [x] Compréhension de la règle métier (15% renter + 15% owner)
- [x] Liste des écrans UI avec affichage des frais
- [x] Identification des risques (colonnes DB manquantes, calculs désalignés)
- [x] Liste des fichiers impactés pour changement futur
- [x] Recommandation source of truth

---

## 🚨 CONCLUSIONS

### Points critiques

1. **Colonnes DB manquantes**: Les webhooks échoueront lors de la mise à jour des frais owner/renter
2. **Calcul owner désaligné**: Utilise `totalPrice * 0.15` au lieu de `subtotal * 0.15`
3. **Pas de source de vérité**: 20+ occurrences hardcodées de `0.15`
4. **Textes hardcodés FR**: 5 occurrences non traduites

### Recommandations (sans implémentation)

1. **Créer les colonnes DB manquantes** avant de déployer les webhooks
2. **Corriger le calcul owner** pour utiliser `subtotal` au lieu de `totalPrice`
3. **Créer une constante centralisée** pour le pourcentage (ex: `src/config/fees.ts`)
4. **Remplacer les textes hardcodés** par la clé i18n `booking.serviceFee`
5. **Valider le flow** avec des tests end-to-end (création booking → paiement → webhook)

---

**FIN DU DIAGNOSTIC**

