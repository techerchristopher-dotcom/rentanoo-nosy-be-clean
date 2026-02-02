# 🔍 Diagnostic — Perte de l'heure dans createLegalSnapshot

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Fonction** : `createLegalSnapshot` (ligne 395)  
**Date** : 2025-01-XX

---

## 📋 Analyse des 3 points critiques

### 1️⃣ SELECT sur la table "bookings"

**Lignes** : 457-461

```typescript
// 2.1. Charger la réservation
const { data: booking, error: bookingError } = await supabase
  .from("bookings")
  .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
  .eq("id", checkinTyped.booking_id)
  .single();
```

**✅ Diagnostic** :
- ❌ `start_time` **N'EST PAS** sélectionné
- ❌ `end_time` **N'EST PAS** sélectionné
- ✅ Seulement `start_date` et `end_date` sont récupérés

**Conséquence** : `booking.start_time` et `booking.end_time` sont `undefined` dans la suite du code.

---

### 2️⃣ Construction de bookingSnapshot

**Lignes** : 590-597

```typescript
// 3.4. Booking (réservation)
const bookingSnapshot: CheckinLegalSnapshotBooking = {
  referenceNumber: booking?.reference_number ?? null,
  departureDatetime: booking?.start_date ?? null,  // ❌ Date-only (ex: "2026-01-29")
  returnDatetime: booking?.end_date ?? null,       // ❌ Date-only (ex: "2026-01-31")
  departureLocation: booking?.pickup_location ?? null,
  returnLocation: booking?.pickup_location ?? null,
};
```

**✅ Diagnostic** :
- `departureDatetime` utilise **uniquement** `booking?.start_date` (date-only, format `"YYYY-MM-DD"`)
- `returnDatetime` utilise **uniquement** `booking?.end_date` (date-only, format `"YYYY-MM-DD"`)
- ❌ `booking?.start_time` et `booking?.end_time` ne sont **jamais utilisés** (car `undefined` depuis le SELECT)

**Conséquence** : Le snapshot contient des dates sans heure (ex: `"2026-01-29"` au lieu de `"2026-01-29T08:00:00+03:00"`).

---

### 3️⃣ Écriture dans updatePayload

**Lignes** : 732-738

```typescript
// Colonnes SQL critiques - Booking
booking_reference_number: bookingSnapshot.referenceNumber,
booking_departure_datetime: bookingSnapshot.departureDatetime
  ? new Date(bookingSnapshot.departureDatetime).toISOString()  // ❌ "2026-01-29" → minuit UTC
  : null,
booking_return_datetime: bookingSnapshot.returnDatetime
  ? new Date(bookingSnapshot.returnDatetime).toISOString()     // ❌ "2026-01-31" → minuit UTC
  : null,
```

**✅ Diagnostic** :
- ✅ Il y a bien un `new Date("YYYY-MM-DD").toISOString()`
- ❌ `bookingSnapshot.departureDatetime` contient `"2026-01-29"` (date-only)
- ❌ `new Date("2026-01-29")` est interprété comme **minuit UTC** (`2026-01-29T00:00:00.000Z`)
- ❌ L'heure métier (ex: `08:00` Madagascar) est **perdue**

**Conséquence** : 
- `checkin_depart.booking_departure_datetime` = `"2026-01-29T00:00:00.000Z"` (minuit UTC)
- Au lieu de `"2026-01-29T05:00:00.000Z"` (08:00 Madagascar = 05:00 UTC)

---

## 🎯 Conclusion

### ❌ L'heure est perdue à l'étape 1 (SELECT) parce que `start_time` et `end_time` ne sont pas récupérés

**Chaîne de causalité** :

1. **Étape 1 (ligne 459)** : Le SELECT ne récupère pas `start_time` / `end_time`
   - → `booking.start_time` = `undefined`
   - → `booking.end_time` = `undefined`

2. **Étape 2 (lignes 593-594)** : `bookingSnapshot` utilise seulement `start_date` / `end_date`
   - → `departureDatetime` = `"2026-01-29"` (date-only)
   - → `returnDatetime` = `"2026-01-31"` (date-only)

3. **Étape 3 (lignes 734, 737)** : `new Date("2026-01-29").toISOString()` interprète la date comme minuit UTC
   - → `booking_departure_datetime` = `"2026-01-29T00:00:00.000Z"` (minuit UTC)
   - → Au lieu de `"2026-01-29T05:00:00.000Z"` (08:00 Madagascar = 05:00 UTC)

**Résultat final** :
- ❌ L'heure métier (`08:00` Madagascar) est **perdue dès l'étape 1**
- ❌ Le snapshot et les colonnes `timestamptz` contiennent des dates à minuit UTC
- ❌ Les affichages (PDF, email, n8n) montrent des heures incorrectes (00:00 ou 03:00 selon la timezone du process)

---

## 📊 Résumé visuel

```
┌─────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : SELECT bookings (ligne 459)                  │
│ ❌ start_time / end_time NON récupérés                  │
│ → booking.start_time = undefined                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : bookingSnapshot (lignes 593-594)              │
│ ❌ Utilise seulement start_date / end_date              │
│ → departureDatetime = "2026-01-29" (date-only)          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ ÉTAPE 3 : updatePayload (lignes 734, 737)               │
│ ❌ new Date("2026-01-29").toISOString()                 │
│ → booking_departure_datetime = "2026-01-29T00:00:00Z"   │
│    (minuit UTC au lieu de 08:00 Madagascar)             │
└─────────────────────────────────────────────────────────┘
```

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Auteur** : Cursor AI

