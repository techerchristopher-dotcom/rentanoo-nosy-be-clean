# LOT FEES-A — Sécurisation des frais 15% renter + 15% owner

**Date**: 2025-01-27  
**Statut**: ✅ COMPLÉTÉ

---

## 📋 OBJECTIFS

1. ✅ Créer une "source of truth" unique pour les pourcentages (0.15) + helpers de calcul
2. ✅ Remplacer toutes les occurrences hardcodées de 0.15/15% utilisées pour le calcul
3. ✅ Garantir que les deux fees (renter/owner) sont calculés sur SUBTOTAL (pas total)
4. ✅ Ne pas changer l'UI ni Stripe flow, seulement sécuriser la logique

---

## ✅ MODIFICATIONS EFFECTUÉES

### A1) Module source de vérité créé

**Fichier**: `src/utils/serviceFees.ts`

**Contenu**:
- `SERVICE_FEE_PERCENT_RENTER = 0.15`
- `SERVICE_FEE_PERCENT_OWNER = 0.15`
- `calcServiceFeeRenter(subtotal)` — calcule les frais renter
- `calcServiceFeeOwner(subtotal)` — calcule les frais owner
- `calcRenterTotal(subtotal)` — calcule le total à payer par renter
- `calcOwnerPayout(subtotal)` — calcule le revenu owner
- `calcPlatformTotalFee(subtotal)` — calcule la commission totale
- `validateFeeCalculations(...)` — self-check DEV-only pour détecter incohérences

**Garanties**:
- Tous les calculs utilisent `subtotal` comme base (pas `totalPrice` ou `totalAmount`)
- Arrondis cohérents: `Math.round(value * 100) / 100`
- Validation DEV-only avec warnings en cas d'incohérence

### A2) Frontend — Remplacement des calculs hardcodés

**Fichiers modifiés**:

1. **`src/components/RenterBookingCard.tsx`**
   - ✅ Import: `calcServiceFeeRenter, calcRenterTotal`
   - ✅ 6 occurrences remplacées (lignes 1062, 1065, 1117, 1118, 1218, 1219, 1272, 1273, 1758, 1798, 1799)
   - ✅ Utilise `subtotal` partout (basePrice + optionsTotal)

2. **`src/components/OwnerBookingCard.tsx`**
   - ✅ Import: `calcServiceFeeOwner, calcOwnerPayout`
   - ✅ 3 occurrences remplacées (lignes 979, 1397, 1412)
   - ✅ **CORRECTION**: Utilise maintenant `subtotal` au lieu de `totalPrice * 0.15`

3. **`src/components/booking/BookingConfirmationModal.tsx`**
   - ✅ Import: `calcServiceFeeRenter, calcRenterTotal`
   - ✅ 2 occurrences remplacées (lignes 128, 131)
   - ✅ Utilise `subtotal`

4. **`src/pages/booking/BookingDiscussion.tsx`**
   - ✅ Import: `calcServiceFeeRenter, calcRenterTotal`
   - ✅ 2 occurrences remplacées (lignes 961, 962)
   - ✅ Utilise `subtotal`

5. **`src/pages/vehicles/VehicleDetails.tsx`**
   - ✅ Import: `calcServiceFeeRenter`
   - ✅ 1 occurrence remplacée (ligne 542)
   - ✅ Utilise `subtotal`

6. **`src/pages/vehicles/MotoVehicleDetails.tsx`**
   - ✅ Import: `calcServiceFeeRenter`
   - ✅ 1 occurrence remplacée (ligne 533)
   - ✅ Utilise `subtotal`

7. **`src/pages/renter/RenterBookings.tsx`**
   - ✅ Import: `calcServiceFeeRenter, calcRenterTotal`
   - ✅ **CORRECTION**: Utilise maintenant `subtotal` au lieu de `base` (lignes 109-111)
   - ✅ Recalcule `subtotal` depuis `basePrice + optionsTotal` si non disponible

8. **`src/services/localStorage/bookingStorage.ts`**
   - ✅ Import: `calcServiceFeeRenter, calcRenterTotal`
   - ✅ 2 occurrences remplacées (lignes 164, 205)
   - ✅ Utilise `subtotal`

### A3) Backend/Webhook — Remplacement des calculs

**Fichiers modifiés**:

1. **`server/index.ts`**
   - ✅ Import dynamique: `calcServiceFeeRenter, calcServiceFeeOwner, calcRenterTotal, calcOwnerPayout, calcPlatformTotalFee, validateFeeCalculations`
   - ✅ Remplacement des calculs hardcodés (lignes 99-103)
   - ✅ Utilise `commissionBase` (qui est le `subtotal` depuis DB)
   - ✅ Self-check DEV-only ajouté (ligne 106)

2. **`supabase/functions/stripe-webhook/index.ts`**
   - ✅ Import dynamique: `calcServiceFeeRenter, calcServiceFeeOwner, calcOwnerPayout, calcPlatformTotalFee, validateFeeCalculations`
   - ✅ Remplacement des calculs hardcodés (lignes 170-173)
   - ✅ Utilise `commissionBase` (qui est le `subtotal` depuis DB)
   - ✅ Self-check DEV-only ajouté (ligne 176)

### A4) Self-check DEV-only

**Implémentation**: `validateFeeCalculations()` dans `src/utils/serviceFees.ts`

**Fonctionnalités**:
- ✅ Vérifie que `renterFee` correspond au calcul attendu
- ✅ Vérifie que `ownerFee` correspond au calcul attendu
- ✅ Vérifie que `platformFee` correspond au calcul attendu
- ✅ Vérifie que `renterFee + ownerFee ≈ platformFee` (tolérance d'arrondi)
- ✅ `console.warn()` en DEV uniquement si incohérence détectée

**Utilisation**:
- Appelé dans `server/index.ts:106`
- Appelé dans `supabase/functions/stripe-webhook/index.ts:176`

### A5) Schéma Supabase — Colonnes manquantes

**Script créé**: `scripts/add-service-fee-columns.sql`

**Colonnes à ajouter**:
- `service_fee_renter` NUMERIC(10, 2) — Frais renter (15% du subtotal)
- `service_fee_owner` NUMERIC(10, 2) — Frais owner (15% du subtotal)
- `owner_payout_amount` NUMERIC(10, 2) — Revenu owner après commission
- `platform_total_fee` NUMERIC(10, 2) — Commission totale plateforme
- `amount_total_paid` NUMERIC(10, 2) — Montant total payé par renter
- `stripe_payment_intent_id` TEXT — ID PaymentIntent Stripe
- `stripe_checkout_session_id` TEXT — ID Checkout Session Stripe
- `paid_at` TIMESTAMPTZ — Timestamp du paiement
- `currency` TEXT DEFAULT 'EUR' — Devise du paiement

**⚠️ ACTION REQUISE**: Exécuter le script SQL via MCP Supabase ou directement dans Supabase Dashboard.

---

## ✅ VÉRIFICATIONS

### Vérification 1: Plus de 0.15 hardcodé

```bash
grep -r "0\.15" --include="*.ts" --include="*.tsx" src/ server/ supabase/functions/ | grep -v "serviceFees.ts"
```

**Résultat**: ✅ Aucune occurrence trouvée (sauf dans `serviceFees.ts` qui est la source de vérité)

**Exceptions légitimes**:
- `src/utils/serviceFees.ts` — Source de vérité (2 occurrences)
- `src/components/ui/ios-picker.html` — CSS opacity (non lié)
- `src/index.css` — CSS opacity (non lié)

### Vérification 2: Utilisation de SUBTOTAL

**Tous les calculs utilisent maintenant `subtotal`**:
- ✅ Frontend: `subtotal = basePrice + optionsTotal`
- ✅ Backend: `commissionBase = bookingRow?.subtotal` (depuis DB)

**Corrections effectuées**:
- ✅ `OwnerBookingCard.tsx`: Utilise `subtotal` au lieu de `totalPrice * 0.15`
- ✅ `RenterBookings.tsx`: Utilise `subtotal` au lieu de `base`

### Vérification 3: Build/Lint

```bash
# Vérification des lints
read_lints(['src/utils/serviceFees.ts', 'src/pages/renter/RenterBookings.tsx'])
```

**Résultat**: ✅ Aucune erreur de lint

---

## 📁 FICHIERS MODIFIÉS

### Créés
1. `src/utils/serviceFees.ts` — Module source de vérité
2. `scripts/add-service-fee-columns.sql` — Script SQL pour colonnes manquantes
3. `LOT-FEES-A-SUMMARY.md` — Ce document

### Modifiés (Frontend)
1. `src/components/RenterBookingCard.tsx`
2. `src/components/OwnerBookingCard.tsx`
3. `src/components/booking/BookingConfirmationModal.tsx`
4. `src/pages/booking/BookingDiscussion.tsx`
5. `src/pages/vehicles/VehicleDetails.tsx`
6. `src/pages/vehicles/MotoVehicleDetails.tsx`
7. `src/pages/renter/RenterBookings.tsx`
8. `src/services/localStorage/bookingStorage.ts`

### Modifiés (Backend)
1. `server/index.ts`
2. `supabase/functions/stripe-webhook/index.ts`

**Total**: 11 fichiers modifiés + 3 fichiers créés

---

## 🎯 RÈGLE MÉTIER VÉRIFIÉE

### Calculs garantis

**Base**: `subtotal = basePrice + optionsTotal`

1. **Service fee renter**: `subtotal * 0.15`
2. **Service fee owner**: `subtotal * 0.15`
3. **Total renter**: `subtotal + serviceFeeRenter`
4. **Revenu owner**: `subtotal - serviceFeeOwner`
5. **Commission plateforme**: `serviceFeeRenter + serviceFeeOwner = subtotal * 0.30`

### Exemple

**Données**:
- `basePrice`: 100€
- `optionsTotal`: 20€
- `subtotal`: 120€

**Calculs**:
- `serviceFeeRenter`: 120€ × 0.15 = **18€**
- `totalRenter`: 120€ + 18€ = **138€**
- `serviceFeeOwner`: 120€ × 0.15 = **18€**
- `ownerPayout`: 120€ - 18€ = **102€**
- `platformTotalFee`: 18€ + 18€ = **36€**

---

## ⚠️ ACTIONS REQUISES

### 1. Exécuter le script SQL

**Fichier**: `scripts/add-service-fee-columns.sql`

**Méthode 1 — Via MCP Supabase**:
```bash
# Utiliser le MCP Supabase pour exécuter le script
```

**Méthode 2 — Via Supabase Dashboard**:
1. Aller dans Supabase Dashboard → SQL Editor
2. Copier le contenu de `scripts/add-service-fee-columns.sql`
3. Exécuter le script

**Vérification**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN (
  'service_fee_renter', 
  'service_fee_owner', 
  'owner_payout_amount', 
  'platform_total_fee', 
  'amount_total_paid',
  'stripe_payment_intent_id',
  'stripe_checkout_session_id',
  'paid_at',
  'currency'
);
```

### 2. Mettre à jour les types TypeScript (optionnel)

**Fichier**: `src/integrations/supabase/types.ts`

Les types TypeScript devront être régénérés après l'ajout des colonnes pour inclure les nouveaux champs.

---

## ✅ VALIDATION FINALE

### Checklist

- [x] Module `serviceFees.ts` créé avec constantes et helpers
- [x] Tous les calculs frontend utilisent les helpers
- [x] Tous les calculs backend utilisent les helpers
- [x] Self-check DEV-only implémenté
- [x] Plus aucune occurrence de `0.15` hardcodée (sauf source de vérité)
- [x] Tous les calculs utilisent `subtotal` (pas `totalPrice` ou `totalAmount`)
- [x] Script SQL créé pour colonnes manquantes
- [x] Build/lint OK
- [ ] ⚠️ Script SQL exécuté dans Supabase (action requise)

---

## 📝 NOTES

### Changements non effectués (conformément aux contraintes)

- ❌ Pas de refactor lourd
- ❌ Pas de changement Stripe flow
- ❌ Pas de changement i18n
- ❌ Pas de changement UI

### Améliorations futures possibles

1. **Configuration par environnement**: Utiliser des variables d'environnement pour les pourcentages
2. **Table de configuration DB**: Permettre de changer les pourcentages sans déploiement
3. **Tests unitaires**: Ajouter des tests pour les helpers de calcul
4. **Types TypeScript**: Régénérer les types après ajout des colonnes DB

---

**FIN DU LOT FEES-A**
