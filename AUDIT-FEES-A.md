# AUDIT FEES-A — Vérification des modifications

**Date**: 2025-01-27  
**Objectif**: Vérifier les modifications effectuées sans rien changer

---

## ✅ CHECKLIST GLOBALE

- [x] Liste des fichiers modifiés identifiée
- [x] Diff résumé par fichier documenté
- [x] Script SQL non utilisé/exécuté confirmé
- [x] Flow Stripe inchangé confirmé

---

## 📁 FICHIERS MODIFIÉS PAR FEES-A

### Fichiers créés (1)

1. **`src/utils/serviceFees.ts`** (NOUVEAU)
   - Module source de vérité pour les frais de service
   - Constantes: `SERVICE_FEE_PERCENT_RENTER = 0.15`, `SERVICE_FEE_PERCENT_OWNER = 0.15`
   - Helpers: `calcServiceFeeRenter()`, `calcServiceFeeOwner()`, `calcRenterTotal()`, `calcOwnerPayout()`, `calcPlatformTotalFee()`
   - Self-check: `validateFeeCalculations()` (DEV-only)

### Fichiers modifiés (11)

#### Frontend (8 fichiers)

1. **`src/components/RenterBookingCard.tsx`**
   - **Import ajouté** (ligne 61): `import { calcServiceFeeRenter, calcRenterTotal } from '@/utils/serviceFees'`
   - **6 zones modifiées**:
     - Ligne 1062: `const serviceFee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)
     - Ligne 1065: `const totalAmount = calcRenterTotal(subtotal)` (remplace `Math.round((subtotal + serviceFee) * 100) / 100`)
     - Ligne 1117: `const serviceFee = calcServiceFeeRenter(subtotal)`
     - Ligne 1118: `const totalAmount = calcRenterTotal(subtotal)`
     - Ligne 1218: `const fee = calcServiceFeeRenter(subtotal)`
     - Ligne 1219: `const total = calcRenterTotal(subtotal)`
     - Ligne 1272: `const fee = calcServiceFeeRenter(subtotal)`
     - Ligne 1273: `const total = calcRenterTotal(subtotal)`
     - Ligne 1758: `return calcServiceFeeRenter(subtotal)`
     - Ligne 1798: `const serviceFee = calcServiceFeeRenter(subtotal)`
     - Ligne 1799: `return calcRenterTotal(subtotal)`
   - **Impact**: Tous les calculs utilisent maintenant les helpers au lieu de `* 0.15` hardcodé

2. **`src/components/OwnerBookingCard.tsx`**
   - **Import ajouté** (ligne 61): `import { calcServiceFeeOwner, calcOwnerPayout } from '@/utils/serviceFees'`
   - **3 zones modifiées**:
     - Ligne 979: `const ownerFee = calcServiceFeeOwner(subtotal)` (remplace `Math.round(total * 0.15)`)
     - Ligne 980: `const ownerPayout = calcOwnerPayout(subtotal)` (remplace `total - commission`)
     - Ligne 1397: `const ownerFee = (booking as any).serviceFee || calcServiceFeeOwner(subtotal)` (remplace `Math.round(((booking as any).totalPrice || 0) * 0.15)`)
     - Ligne 1412: `return Math.round(calcOwnerPayout(subtotal))` (remplace `total - commission`)
   - **Impact**: ✅ **CORRECTION IMPORTANTE** — Utilise maintenant `subtotal` au lieu de `totalPrice * 0.15` (corrige le désalignement identifié dans le diagnostic)

3. **`src/components/booking/BookingConfirmationModal.tsx`**
   - **Import ajouté** (ligne 16): `import { calcServiceFeeRenter, calcRenterTotal } from "@/utils/serviceFees"`
   - **2 zones modifiées**:
     - Ligne 128: `const serviceFee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)
     - Ligne 131: `const totalAmount = calcRenterTotal(subtotal)` (remplace `Math.round((subtotal + serviceFee) * 100) / 100`)

4. **`src/pages/booking/BookingDiscussion.tsx`**
   - **Import ajouté** (ligne 43): `import { calcServiceFeeRenter, calcRenterTotal } from "@/utils/serviceFees"`
   - **2 zones modifiées**:
     - Ligne 961: `const fee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)
     - Ligne 962: `const total = calcRenterTotal(subtotal)` (remplace `Math.round((subtotal + fee) * 100) / 100`)

5. **`src/pages/vehicles/VehicleDetails.tsx`**
   - **Import ajouté** (ligne 55): `import { calcServiceFeeRenter } from "@/utils/serviceFees"`
   - **1 zone modifiée**:
     - Ligne 542: `const serviceFee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)

6. **`src/pages/vehicles/MotoVehicleDetails.tsx`**
   - **Import ajouté** (ligne 58): `import { calcServiceFeeRenter } from "@/utils/serviceFees"`
   - **1 zone modifiée**:
     - Ligne 533: `const serviceFee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)

7. **`src/pages/renter/RenterBookings.tsx`**
   - **Import ajouté** (ligne 24): `import { calcServiceFeeRenter, calcRenterTotal } from "@/utils/serviceFees"`
   - **1 zone modifiée** (lignes 108-111):
     - **AVANT**: 
       ```typescript
       const base = recentBooking.totalAmount || (days * (recentBooking.vehicle.dailyPrice || 0));
       const fee = calcServiceFeeRenter(base);
       const total = calcRenterTotal(base);
       ```
     - **APRÈS**:
       ```typescript
       const basePrice = (recentBooking as any).basePrice || (days * (recentBooking.vehicle.dailyPrice || 0));
       const optionsTotal = (recentBooking as any).optionsTotal || 0;
       const subtotal = (recentBooking as any).subtotal || (basePrice + optionsTotal);
       const fee = calcServiceFeeRenter(subtotal);
       const total = calcRenterTotal(subtotal);
       ```
   - **Impact**: ✅ **CORRECTION** — Utilise maintenant `subtotal` au lieu de `base` (qui était incorrect)

8. **`src/services/localStorage/bookingStorage.ts`**
   - **Import ajouté** (ligne 7): `import { calcServiceFeeRenter, calcRenterTotal } from "@/utils/serviceFees"`
   - **2 zones modifiées**:
     - Ligne 164: `const serviceFee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)
     - Ligne 165: `const totalAmount = calcRenterTotal(subtotal)` (remplace `Math.round((subtotal + serviceFee) * 100) / 100`)
     - Ligne 205: `const serviceFee = calcServiceFeeRenter(subtotal)` (remplace `Math.round(subtotal * 0.15 * 100) / 100`)
     - Ligne 206: `const totalAmount = calcRenterTotal(subtotal)` (remplace `Math.round((subtotal + serviceFee) * 100) / 100`)

#### Backend (2 fichiers)

9. **`server/index.ts`**
   - **Import dynamique ajouté** (lignes 90-97):
     ```typescript
     const { 
       calcServiceFeeRenter, 
       calcServiceFeeOwner, 
       calcRenterTotal, 
       calcOwnerPayout, 
       calcPlatformTotalFee,
       validateFeeCalculations
     } = await import("../src/utils/serviceFees");
     ```
   - **5 zones modifiées** (lignes 99-106):
     - Ligne 99: `const serviceFeeRenter = calcServiceFeeRenter(commissionBase)` (remplace `round2(commissionBase * 0.15)`)
     - Ligne 100: `const serviceFeeOwner = calcServiceFeeOwner(commissionBase)` (remplace `round2(commissionBase * 0.15)`)
     - Ligne 101: `const amountTotalPaid = calcRenterTotal(commissionBase)` (remplace `round2(commissionBase + serviceFeeRenter)`)
     - Ligne 102: `const ownerPayoutAmount = calcOwnerPayout(commissionBase)` (remplace `round2(commissionBase - serviceFeeOwner)`)
     - Ligne 103: `const platformTotalFee = calcPlatformTotalFee(commissionBase)` (remplace `round2(serviceFeeRenter + serviceFeeOwner)`)
     - Ligne 106: `validateFeeCalculations(commissionBase, serviceFeeRenter, serviceFeeOwner, platformTotalFee)` (NOUVEAU — self-check DEV-only)
   - **Impact**: Utilise les helpers au lieu de calculs hardcodés, ajoute validation DEV-only

10. **`supabase/functions/stripe-webhook/index.ts`**
   - **Import dynamique ajouté** (lignes 162-169):
     ```typescript
     const serviceFeesModule = await import("../../src/utils/serviceFees.ts");
     const { 
       calcServiceFeeRenter, 
       calcServiceFeeOwner, 
       calcOwnerPayout, 
       calcPlatformTotalFee,
       validateFeeCalculations
     } = serviceFeesModule;
     ```
   - **5 zones modifiées** (lignes 170-176):
     - Ligne 170: `const serviceFeeRenter = calcServiceFeeRenter(commissionBase)` (remplace `round2(commissionBase * 0.15)`)
     - Ligne 171: `const serviceFeeOwner = calcServiceFeeOwner(commissionBase)` (remplace `round2(commissionBase * 0.15)`)
     - Ligne 172: `const ownerPayoutAmount = calcOwnerPayout(commissionBase)` (remplace `round2(commissionBase - serviceFeeOwner)`)
     - Ligne 173: `const platformTotalFee = calcPlatformTotalFee(commissionBase)` (remplace `round2(serviceFeeRenter + serviceFeeOwner)`)
     - Ligne 176: `validateFeeCalculations(commissionBase, serviceFeeRenter, serviceFeeOwner, platformTotalFee)` (NOUVEAU — self-check DEV-only)
   - **Impact**: Utilise les helpers au lieu de calculs hardcodés, ajoute validation DEV-only

#### Script SQL (1 fichier créé, non utilisé)

11. **`scripts/add-service-fee-columns.sql`** (NOUVEAU, NON EXÉCUTÉ)
   - Script SQL pour ajouter les colonnes manquantes à la table `bookings`
   - Colonnes: `service_fee_renter`, `service_fee_owner`, `owner_payout_amount`, `platform_total_fee`, `amount_total_paid`, `stripe_payment_intent_id`, `stripe_checkout_session_id`, `paid_at`, `currency`
   - **Statut**: ⚠️ **NON EXÉCUTÉ** — Action requise (voir section "Script SQL")

---

## ✅ VÉRIFICATIONS

### 1. Script SQL — Non utilisé/exécuté

**Recherche effectuée**:
```bash
grep -r "add-service-fee-columns|execute.*sql|run.*sql|exec.*sql" -i
```

**Résultat**: ✅ **CONFIRMÉ** — Le script SQL n'est référencé nulle part dans le code
- Le script existe uniquement dans `scripts/add-service-fee-columns.sql`
- Aucune référence dans le code TypeScript/JavaScript
- Aucun appel automatique
- Aucune migration automatique

**Statut**: ⚠️ **ACTION REQUISE** — Le script doit être exécuté manuellement via MCP Supabase ou Supabase Dashboard pour ajouter les colonnes manquantes.

### 2. Flow Stripe — Inchangé

#### 2.1 Endpoint create-checkout-session

**Fichier**: `supabase/functions/create-checkout-session/index.ts`

**Vérification**:
- ✅ Endpoint: `/functions/v1/create-checkout-session` (inchangé)
- ✅ Méthode: `POST` (inchangé)
- ✅ Payload attendu (lignes 68-96):
  ```typescript
  {
    amount: number,        // Montant en euros (ex: 150.50)
    description: string,   // Description du produit/service
    bookingId: string      // (optionnel) ID de la réservation
  }
  ```
- ✅ Réponse: `{ "url": "https://checkout.stripe.com/..." }` (inchangé)
- ✅ Configuration Stripe (lignes 145-165):
  - `mode: "payment"` (inchangé)
  - `payment_method_types: ["card"]` (inchangé)
  - `line_items`: Une seule ligne avec `unit_amount` (inchangé)
  - `metadata.bookingId` (inchangé)
  - **AUCUN changement** dans la structure de la session Stripe

#### 2.2 Appel depuis frontend

**Fichier**: `src/lib/payerLocation.ts`

**Vérification**:
- ✅ URL: `${SUPABASE_URL}/functions/v1/create-checkout-session` (inchangé)
- ✅ Méthode: `POST` (inchangé)
- ✅ Headers: `Content-Type: application/json` (inchangé)
- ✅ Payload envoyé (lignes 19-23):
  ```typescript
  {
    amount: reservation.totalTTC,           // ✅ Inchangé
    description: `Location de ${reservation.voiture}`,  // ✅ Inchangé
    bookingId: reservation.id               // ✅ Inchangé
  }
  ```
- ✅ Redirection: `window.location.href = data.url` (inchangé)

**Note**: Le `reservation.totalTTC` est calculé en amont avec les nouveaux helpers, mais le payload envoyé à Stripe reste identique (montant total en euros).

#### 2.3 Webhook Stripe

**Fichier**: `supabase/functions/stripe-webhook/index.ts`

**Vérification**:
- ✅ Event type: `checkout.session.completed` (inchangé)
- ✅ Lecture depuis DB: `bookingRow?.subtotal` (inchangé)
- ✅ Calculs: Utilise maintenant les helpers au lieu de `* 0.15` hardcodé
- ✅ Mise à jour DB: Même structure, mêmes colonnes (lignes 181-195)
- ✅ **AUCUN changement** dans la logique du webhook, seulement remplacement des calculs

**Impact**: Les calculs sont maintenant centralisés, mais le flow reste identique.

#### 2.4 Webhook serveur Express

**Fichier**: `server/index.ts`

**Vérification**:
- ✅ Route: `/api/stripe/webhook` (inchangé)
- ✅ Event type: `checkout.session.completed` (inchangé)
- ✅ Lecture depuis DB: `bookingRow?.subtotal` (inchangé)
- ✅ Calculs: Utilise maintenant les helpers au lieu de `* 0.15` hardcodé
- ✅ Mise à jour DB: Même structure, mêmes colonnes (lignes 116-125)
- ✅ **AUCUN changement** dans la logique du webhook, seulement remplacement des calculs

**Impact**: Les calculs sont maintenant centralisés, mais le flow reste identique.

### 3. Résumé des changements

#### Changements effectués

1. ✅ **Création module source de vérité**: `src/utils/serviceFees.ts`
2. ✅ **Remplacement calculs hardcodés**: Tous les `* 0.15` remplacés par des helpers
3. ✅ **Correction calculs owner**: Utilise `subtotal` au lieu de `totalPrice * 0.15`
4. ✅ **Correction calculs renter**: Utilise `subtotal` au lieu de `base` dans `RenterBookings.tsx`
5. ✅ **Self-check DEV-only**: Ajout de `validateFeeCalculations()` dans les webhooks

#### Changements NON effectués (conformément aux contraintes)

1. ❌ **Pas de changement UI**: Aucune modification des composants d'affichage
2. ❌ **Pas de changement i18n**: Aucune modification des clés de traduction
3. ❌ **Pas de changement Stripe flow**: Endpoints, payloads, structure inchangés
4. ❌ **Pas d'exécution script SQL**: Script créé mais non exécuté

---

## 📊 STATISTIQUES

- **Fichiers créés**: 2 (`serviceFees.ts`, `add-service-fee-columns.sql`)
- **Fichiers modifiés**: 10
- **Lignes modifiées**: ~50 (imports + remplacements de calculs)
- **Occurrences `0.15` hardcodées supprimées**: ~20
- **Helpers utilisés**: 5 fonctions (`calcServiceFeeRenter`, `calcServiceFeeOwner`, `calcRenterTotal`, `calcOwnerPayout`, `calcPlatformTotalFee`)
- **Self-checks ajoutés**: 2 (dans les 2 webhooks)

---

## ⚠️ ACTIONS REQUISES

### 1. Exécuter le script SQL

**Fichier**: `scripts/add-service-fee-columns.sql`

**Méthode recommandée**: Via MCP Supabase ou Supabase Dashboard

**Impact si non exécuté**: Les webhooks Stripe échoueront silencieusement lors de la mise à jour des colonnes `service_fee_renter`, `service_fee_owner`, etc.

---

## ✅ VALIDATION FINALE

### Checklist de validation

- [x] Tous les fichiers modifiés identifiés
- [x] Diff résumé par fichier documenté
- [x] Script SQL non utilisé/exécuté confirmé
- [x] Flow Stripe inchangé confirmé (endpoints, payloads, structure)
- [x] Calculs centralisés dans `serviceFees.ts`
- [x] Plus aucune occurrence `0.15` hardcodée (sauf source de vérité)
- [x] Corrections importantes documentées (owner/renter utilisent `subtotal`)

---

**FIN DE L'AUDIT**

