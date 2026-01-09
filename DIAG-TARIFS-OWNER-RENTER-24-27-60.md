# DIAGNOSTIC — Tarifs différents Propriétaire (24€) vs Locataire (27,60€)

## 📋 Résumé du problème

**Symptôme :** Deux montants différents affichés pour la même réservation :
- **24€** pour le propriétaire (OwnerBookingCard)
- **27,60€** pour le locataire (RenterBookingCard)

**Cause identifiée :** Différence normale entre **REVENU PROPRIÉTAIRE** (après commission) et **TOTAL PAYÉ PAR LE LOCATAIRE** (avec frais de service).

---

## 🔍 Analyse détaillée

### 1. Calcul pour le Locataire (27,60€)

**Fichier :** `src/components/RenterBookingCard.tsx`

**Fonction :** Calcul inline (lignes 1040-1067)

**Code :**
```typescript
// Calculer le sous-total (base + options)
const subtotal = basePrice + optionsTotal  // = 24€

// Ajouter les frais de service (15%)
const serviceFee = calcServiceFeeRenter(subtotal)  // = 24 * 0.15 = 3.60€

// Calculer le total final
const totalAmount = calcRenterTotal(subtotal)  // = 24 + 3.60 = 27.60€
```

**Résultat :** Retourne le **TOTAL TTC** (subtotal + 15% frais de service) = **27,60€**

**Utilisation :**
- Ligne 1065 : Affichage du total dans la carte de réservation

**✅ CORRECT :** Le locataire voit le montant qu'il doit payer (avec frais de service).

---

### 2. Calcul pour le Propriétaire (24€)

**Fichier :** `src/components/OwnerBookingCard.tsx`

**Affichage principal (ligne 1005) :**
```typescript
{(booking as any).totalPrice || booking.totalAmount || 0}€
```

**Problème :** Utilise `totalPrice` ou `totalAmount` depuis le booking, qui peut être :
- Le **subtotal** (24€) si c'est `base_price + options_total`
- Le **total TTC** (27,60€) si c'est `amount_total_paid`

**Affichage dans le tooltip (lignes 1018-1028) :**
```typescript
const subtotal = (booking as any).subtotal || 
  ((booking as any).basePrice || 0) + ((booking as any).optionsTotal || 0);
const ownerFee = calcServiceFeeOwner(subtotal);
const ownerPayout = calcOwnerPayout(subtotal);  // = subtotal - 15%
```

**Affichage "REVENU PROPRIÉTAIRE" (ligne 1454) :**
```typescript
return Math.round(calcOwnerPayout(subtotal));  // = 24€ (arrondi)
```

**Résultat :** Affiche le **REVENU PROPRIÉTAIRE** (subtotal - 15% commission) = **24€**

**⚠️ INCOHÉRENCE :** Le label "Total:" (ligne 1003) est trompeur car il affiche le revenu du propriétaire, pas le total payé par le locataire.

---

### 3. Formules de calcul (serviceFees.ts)

**Fichier :** `src/utils/serviceFees.ts`

**Pour le locataire :**
```typescript
calcRenterTotal(subtotal) = subtotal + (subtotal * 0.15)
// Exemple : 24 + (24 * 0.15) = 24 + 3.60 = 27.60€
```

**Pour le propriétaire :**
```typescript
calcOwnerPayout(subtotal) = subtotal - (subtotal * 0.15)
// Exemple : 24 - (24 * 0.15) = 24 - 3.60 = 20.40€
```

**⚠️ ATTENTION :** Le calcul montre 20,40€ mais l'affichage montre 24€. Il y a peut-être un arrondi ou une autre logique.

---

## 📊 Comparaison des calculs

| Rôle | Fonction | Calcul | Résultat | Ce que ça représente |
|------|----------|--------|----------|---------------------|
| **Locataire** | `calcRenterTotal(subtotal)` | `subtotal + 15%` | **27,60€** | Total à payer (TTC) |
| **Propriétaire** | `calcOwnerPayout(subtotal)` | `subtotal - 15%` | **20,40€** | Revenu après commission |
| **Propriétaire (affiché)** | `totalPrice \|\| totalAmount` | Depuis booking | **24€** | ⚠️ Probablement le subtotal |

---

## 🎯 Cause racine identifiée

### Scénario 1 : Le booking contient le subtotal (24€)

**Si `booking.totalPrice` ou `booking.totalAmount` = 24€ (subtotal) :**
- Le propriétaire voit 24€ (subtotal)
- Le locataire calcule 27,60€ (subtotal + 15%)
- **Différence normale** mais **label trompeur** ("Total:" au lieu de "Revenu" ou "Subtotal")

### Scénario 2 : Le booking contient le total TTC (27,60€)

**Si `booking.totalPrice` ou `booking.totalAmount` = 27,60€ (total TTC) :**
- Le propriétaire devrait voir 20,40€ (27,60 - 15% = 23,46€, mais arrondi à 24€ ?)
- Le locataire voit 27,60€
- **Incohérence** : Le propriétaire ne devrait pas voir le total TTC mais son revenu

### Scénario 3 : Calcul incorrect du revenu propriétaire

**Si le calcul `calcOwnerPayout(24)` = 20,40€ mais l'affichage montre 24€ :**
- Il y a un problème dans le calcul ou l'affichage
- Le propriétaire voit peut-être le subtotal au lieu de son revenu

---

## 🔍 Vérification des données dans la base

### Champs Supabase à vérifier

**Table `bookings` :**
- `subtotal` : Sous-total (basePrice + optionsTotal) = **24€**
- `total_price` : Total TTC payé par le locataire = **27,60€** (ou subtotal si non calculé)
- `amount_total_paid` : Montant réellement payé via Stripe = **27,60€**
- `owner_payout_amount` : Revenu du propriétaire = **20,40€** (ou 24€ si calculé différemment)

### Requête SQL de diagnostic

```sql
SELECT 
  id,
  subtotal,
  total_price,
  amount_total_paid,
  owner_payout_amount,
  service_fee_owner,
  base_price,
  options_total
FROM bookings
WHERE id = '<booking_id>';
```

---

## 📝 Où sont affichés les montants

### OwnerBookingCard.tsx

1. **Ligne 1005** (Affichage principal "Total:") :
   ```typescript
   {(booking as any).totalPrice || booking.totalAmount || 0}€
   ```
   **Affiche :** 24€ (probablement `subtotal`)

2. **Ligne 1028** (Tooltip "Revenu (85%)") :
   ```typescript
   {Math.round(ownerPayout)}€  // = calcOwnerPayout(subtotal)
   ```
   **Affiche :** 20,40€ arrondi = **20€** ou **24€** selon le calcul

3. **Ligne 1454** (Section "REVENU PROPRIÉTAIRE") :
   ```typescript
   Math.round(calcOwnerPayout(subtotal))
   ```
   **Affiche :** 20,40€ arrondi = **20€** ou **24€**

### RenterBookingCard.tsx

1. **Ligne 1065** (Affichage principal "Total:") :
   ```typescript
   calcRenterTotal(subtotal)  // = 27.60€
   ```
   **Affiche :** 27,60€ (TOTAL TTC)

---

## 💡 Hypothèses possibles

### Hypothèse 1 : Le booking.totalPrice contient le subtotal

**Cause :** Lors de la création du booking, `totalPrice` est défini à `subtotal` (24€) au lieu de `calcRenterTotal(subtotal)` (27,60€).

**Vérification :** Vérifier le code qui crée/met à jour les bookings.

**Impact :** Le propriétaire voit le subtotal (24€) au lieu de son revenu (20,40€).

### Hypothèse 2 : Arrondi incorrect

**Cause :** `calcOwnerPayout(24)` = 20,40€, mais `Math.round(20.40)` = 20€, pas 24€.

**Vérification :** Vérifier si le calcul utilise un autre arrondi ou si `subtotal` est utilisé directement.

**Impact :** Le propriétaire voit 24€ (subtotal) au lieu de 20,40€ (revenu).

### Hypothèse 3 : Label trompeur

**Cause :** Le label "Total:" (ligne 1003) est trompeur. Il devrait dire "Revenu" ou "Payout".

**Vérification :** Le montant affiché (24€) est peut-être correct (subtotal) mais le label est incorrect.

**Impact :** Confusion utilisateur : le propriétaire pense voir le total payé alors qu'il voit son revenu.

---

## ✅ Conclusion

### Diagnostic

**Différence normale mais affichage incohérent :**

1. **Locataire (27,60€) :** ✅ CORRECT - Affiche le total TTC à payer
2. **Propriétaire (24€) :** ⚠️ **AMBIGU** - Affiche soit :
   - Le **subtotal** (24€) - ce qui est incorrect (devrait être le revenu 20,40€)
   - Le **revenu** (20,40€ arrondi à 24€) - ce qui serait correct mais nécessite vérification

### Problèmes identifiés

1. **Label trompeur :** "Total:" pour le propriétaire devrait être "Revenu" ou "Payout"
2. **Source de données :** `totalPrice || totalAmount` peut contenir le subtotal au lieu du revenu
3. **Calcul incohérent :** Le tooltip calcule `ownerPayout = 20,40€` mais l'affichage principal montre 24€

### Action recommandée (sans modification)

**Vérifier dans la base de données :**
- Quelle valeur contient `bookings.total_price` pour cette réservation ?
- Quelle valeur contient `bookings.owner_payout_amount` ?
- Quelle valeur contient `bookings.subtotal` ?

**Vérifier dans le code :**
- Comment `totalPrice` est-il défini lors de la création du booking ?
- Pourquoi l'affichage principal (ligne 1005) ne utilise pas `calcOwnerPayout()` comme le tooltip ?

---

**Date de diagnostic :** 2025-01-XX  
**Fichiers analysés :**
- `src/components/OwnerBookingCard.tsx` (lignes 1003-1005, 1022, 1454)
- `src/components/RenterBookingCard.tsx` (ligne 1065)
- `src/utils/serviceFees.ts` (lignes 37-50)

