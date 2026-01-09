# DIAGNOSTIC — Tarifs différents (54€ vs 62,10€)

## 📋 Résumé du problème

**Symptôme :** Deux tarifs différents affichés pour la même location :
- **54€** dans la bulle de message (BookingDiscussion)
- **62,10€** dans la carte de réservation (RenterBookingCard)

**Cause identifiée :** Incohérence d'affichage entre **SUBTOTAL** et **TOTAL TTC** (avec frais de service).

---

## 🔍 Analyse détaillée

### 1. Calcul dans BookingDiscussion.tsx

**Fichier :** `src/pages/booking/BookingDiscussion.tsx`

**Fonction :** `calculateTotalPrice()` (lignes 760-816)

**Code :**
```typescript
const calculateTotalPrice = () => {
  // ... calcul de basePrice et optionsTotal ...
  const optionsTotal = currentBooking?.options_total || bookingData?.rentalInfo?.optionsTotal || 0;
  return basePrice + optionsTotal;  // ⚠️ RETOURNE LE SUBTOTAL (SANS frais de service)
}
```

**Résultat :** Retourne le **SUBTOTAL** (basePrice + optionsTotal) = **54€**

**Utilisation :**
- Ligne 1095 : `{calculateTotalPrice()}€` (dans le header de la conversation)
- Ligne 1245 : `{calculateTotalPrice()}€` (dans la bulle de message initiale)

**⚠️ PROBLÈME :** Cette fonction n'inclut **PAS** les frais de service de 15%.

---

### 2. Calcul dans RenterBookingCard.tsx

**Fichier :** `src/components/RenterBookingCard.tsx`

**Fonction :** Calcul inline (lignes 1040-1067)

**Code :**
```typescript
// Calculer le sous-total (base + options)
const subtotal = basePrice + optionsTotal  // = 54€

// Ajouter les frais de service (15%)
const serviceFee = calcServiceFeeRenter(subtotal)  // = 54 * 0.15 = 8.10€

// Calculer le total final
const totalAmount = calcRenterTotal(subtotal)  // = 54 + 8.10 = 62.10€
```

**Résultat :** Retourne le **TOTAL TTC** (subtotal + 15% frais de service) = **62,10€**

**Utilisation :**
- Ligne 1065 : Affichage du total dans la carte de réservation

**✅ CORRECT :** Cette fonction inclut les frais de service de 15%.

---

### 3. Fonction utilitaire serviceFees.ts

**Fichier :** `src/utils/serviceFees.ts`

**Fonction :** `calcRenterTotal(subtotal)` (lignes 37-40)

```typescript
export function calcRenterTotal(subtotal: number): number {
  const serviceFee = calcServiceFeeRenter(subtotal);  // 15% du subtotal
  return Math.round((subtotal + serviceFee) * 100) / 100;
}
```

**Formule :** `subtotal + (subtotal * 0.15)`

**Exemple avec 54€ :**
- Subtotal = 54€
- Frais de service (15%) = 54 * 0.15 = 8.10€
- Total TTC = 54 + 8.10 = **62,10€**

---

## 📊 Comparaison des calculs

| Composant | Fonction | Calcul | Résultat | Inclut frais 15% ? |
|-----------|----------|--------|----------|-------------------|
| **BookingDiscussion** | `calculateTotalPrice()` | `basePrice + optionsTotal` | **54€** | ❌ NON (SUBTOTAL) |
| **RenterBookingCard** | `calcRenterTotal(subtotal)` | `subtotal + (subtotal * 0.15)` | **62,10€** | ✅ OUI (TOTAL TTC) |

---

## 🎯 Cause racine

**Incohérence d'affichage :** 

1. **BookingDiscussion** affiche le **SUBTOTAL** (54€) sans les frais de service
2. **RenterBookingCard** affiche le **TOTAL TTC** (62,10€) avec les frais de service

**Les deux sont techniquement corrects** mais **incohérents** car :
- L'utilisateur voit deux montants différents pour la même réservation
- Il n'est pas clair lequel est le montant final à payer

---

## 📝 Détails techniques

### Calcul du subtotal (54€)

**Base :** 12€/jour × 4 jours = 48€
**Heures supplémentaires :** 11 heures × (12€ / 24h) = 5.50€
**Total base :** 48 + 5.50 = 53.50€ → arrondi à **54€** (Math.ceil)

**Options :** 0€ (aucune option sélectionnée)

**Subtotal = 54€**

### Calcul du total TTC (62,10€)

**Subtotal :** 54€
**Frais de service (15%) :** 54 × 0.15 = 8.10€
**Total TTC :** 54 + 8.10 = **62,10€**

---

## 🔍 Où sont affichés les montants

### BookingDiscussion.tsx

1. **Ligne 1095** (Header de la conversation) :
   ```typescript
   {calculateTotalPrice()}€  // Affiche 54€ (SUBTOTAL)
   ```

2. **Ligne 1245** (Bulle de message initiale) :
   ```typescript
   {calculateTotalPrice()}€  // Affiche 54€ (SUBTOTAL)
   ```

### RenterBookingCard.tsx

1. **Ligne 1065** (Carte de réservation) :
   ```typescript
   {calcRenterTotal(subtotal)}  // Affiche 62,10€ (TOTAL TTC)
   ```

### handlePayNow dans BookingDiscussion.tsx

**Ligne 962** : Utilise correctement `calcRenterTotal(subtotal)` pour le paiement :
```typescript
const total = calcRenterTotal(subtotal);  // = 62,10€ (CORRECT pour le paiement)
```

**✅ Le paiement utilise le bon montant (62,10€)**

---

## ✅ Conclusion

### Problème identifié

**Incohérence d'affichage :** 
- `calculateTotalPrice()` dans BookingDiscussion retourne le **SUBTOTAL** (54€)
- `calcRenterTotal()` dans RenterBookingCard retourne le **TOTAL TTC** (62,10€)

### Impact

- **Confusion utilisateur :** Deux montants différents affichés
- **Paiement correct :** Le montant utilisé pour le paiement (62,10€) est correct
- **Affichage incorrect :** La bulle de message montre 54€ au lieu de 62,10€

### Action recommandée (sans modification)

**Option 1 :** Modifier `calculateTotalPrice()` dans BookingDiscussion pour utiliser `calcRenterTotal(subtotal)` au lieu de retourner uniquement le subtotal.

**Option 2 :** Renommer `calculateTotalPrice()` en `calculateSubtotal()` et créer une nouvelle fonction `calculateTotalTTC()` qui utilise `calcRenterTotal()`.

**Option 3 :** Afficher les deux montants clairement :
- "Sous-total : 54€"
- "Frais de service (15%) : 8,10€"
- "Total TTC : 62,10€"

---

**Date de diagnostic :** 2025-01-XX  
**Fichiers analysés :**
- `src/pages/booking/BookingDiscussion.tsx` (lignes 760-816, 1095, 1245)
- `src/components/RenterBookingCard.tsx` (lignes 1040-1067)
- `src/utils/serviceFees.ts` (lignes 37-40)

