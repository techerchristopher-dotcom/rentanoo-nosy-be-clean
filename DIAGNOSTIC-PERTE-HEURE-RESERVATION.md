# 🔎 Diagnostic — Perte de l'heure de réservation

**Date** : 2025-01-XX  
**Problème** : L'heure de prise en charge sélectionnée par le client (ex: 08:00) n'est pas correctement enregistrée en base de données.

---

## 📊 Résumé exécutif

| Étape | Statut | Heure présente ? |
|-------|--------|------------------|
| **1. UI Homepage** | ✅ | OUI — `startTime` / `endTime` dans state React |
| **2. Navigation vers VehicleDetails** | ✅ | OUI — Passé via `location.state` |
| **3. VehicleDetails.handleConfirmBooking** | ✅ | OUI — Récupéré depuis `navigationState` |
| **4. Payload vers createBooking** | ✅ | OUI — `startTime` / `endTime` présents |
| **5. SupabaseBookingsService.createBooking** | ✅ | OUI — Mappé vers `insertData.start_time` / `end_time` |
| **6. Insertion Supabase** | ✅ | OUI — Colonnes `start_time` / `end_time` écrites |

**Conclusion** : Le flux de données est **correct** jusqu'à l'écriture en base.

**⚠️ PROBLÈME IDENTIFIÉ** : L'heure est perdue **lors de la création du snapshot légal** (`createLegalSnapshot`), qui **ignore** `start_time` / `end_time` et ne stocke que `start_date` / `end_date` (date-only).

---

## 🔍 Diagnostic détaillé étape par étape

### 1️⃣ Source UI de l'heure

**Fichier** : `src/pages/Index.tsx`

**Variables** :
- `startTime` : `string` (format `"HH:MM"`, ex: `"08:00"`)
- `endTime` : `string` (format `"HH:MM"`, ex: `"08:00"`)

**État initial** :
```typescript
const [startTime, setStartTime] = useState("06:30");  // Ligne 48
const [endTime, setEndTime] = useState("06:00");      // Ligne 49
```

**Modification** :
- Via composant `SearchBarAirbnb` (lignes 571-574)
- Props : `startTime`, `endTime`, `onStartTimeChange`, `onEndTimeChange`

**✅ Conclusion** : L'heure existe bien dans le state React de la homepage.

---

### 2️⃣ Payload envoyé au backend

**Fichier** : `src/pages/Index.tsx` (fonction `handleVehicleClick`, lignes 522-541)

**Navigation vers VehicleDetails** :
```typescript
navigate(route, {
  state: {
    rentalCalculation: rentalCalculation || undefined,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    startTime,        // ✅ Passé
    endTime,          // ✅ Passé
    pickupLocation: FEATURES.pickupLocationEnabled ? (searchText || undefined) : undefined,
  }
});
```

**✅ Conclusion** : `startTime` et `endTime` sont bien passés via `location.state`.

---

### 3️⃣ Récupération dans VehicleDetails

**Fichier** : `src/pages/vehicles/VehicleDetails.tsx`

**Récupération du state** (ligne 750) :
```typescript
const navigationState = location.state as {
  rentalCalculation?: RentalCalculation;
  startDate?: string;
  endDate?: string;
  startTime?: string;  // ✅ Récupéré
  endTime?: string;    // ✅ Récupéré
  pickupLocation?: string;
};
```

**Extraction dans handleConfirmBooking** (lignes 475-484) :
```typescript
let startTime: string = '06:30';  // Valeur par défaut
let endTime: string = '06:00';    // Valeur par défaut

if (navigationState?.startDate && navigationState?.endDate) {
  startDate = new Date(navigationState.startDate);
  endDate = new Date(navigationState.endDate);
  pickupLocation = navigationState.pickupLocation || '';
  startTime = navigationState.startTime || '06:30';  // ✅ Récupéré
  endTime = navigationState.endTime || '06:00';      // ✅ Récupéré
  // ...
}
```

**✅ Conclusion** : `startTime` et `endTime` sont bien récupérés depuis `navigationState`.

---

### 4️⃣ Payload vers createBooking

**Fichier** : `src/pages/vehicles/VehicleDetails.tsx` (lignes 599-615)

**Appel à SupabaseBookingsService.createBooking** :
```typescript
const bookingResult = await SupabaseBookingsService.createBooking({
  vehicleId: vehicle.id,
  renterId: currentUser.id,
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  totalPrice: totalPriceWithOptions,
  pickupLocation: bookingData.rentalInfo.pickupLocation,
  startTime: bookingData.rentalInfo.startTime,  // ✅ Passé (ligne 606)
  endTime: bookingData.rentalInfo.endTime,        // ✅ Passé (ligne 607)
  // ...
});
```

**Où `bookingData.rentalInfo.startTime` vient de** (lignes 574-579) :
```typescript
const bookingData = {
  // ...
  rentalInfo: {
    pickupLocation,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startTime,  // ✅ Depuis la variable locale (ligne 578)
    endTime,    // ✅ Depuis la variable locale (ligne 579)
    // ...
  },
  // ...
};
```

**✅ Conclusion** : `startTime` et `endTime` sont bien passés à `createBooking`.

---

### 5️⃣ API de création de réservation

**Fichier** : `src/services/supabase/bookings.ts`

**Interface BookingData** (lignes 10-31) :
```typescript
export interface BookingData {
  vehicleId: string;
  renterId: string;
  startDate: string; // Format ISO
  endDate: string;   // Format ISO
  totalPrice: number;
  pickupLocation?: string;
  startTime?: string; // Format "06:30"  ✅ Présent
  endTime?: string;   // Format "14:00"  ✅ Présent
  // ...
}
```

**Mapping vers insertData** (lignes 71-89) :
```typescript
const insertData: SupabaseBookingInsert = {
  user_id: bookingData.renterId,
  vehicle_id: bookingData.vehicleId,
  start_date: bookingData.startDate.split('T')[0],  // Date-only
  end_date: bookingData.endDate.split('T')[0],      // Date-only
  total_price: bookingData.totalPrice,
  status: 'pending',
  start_time: bookingData.startTime || null,  // ✅ Mappé (ligne 78)
  end_time: bookingData.endTime || null,      // ✅ Mappé (ligne 79)
  pickup_location: bookingData.pickupLocation || null,
  // ...
};
```

**✅ Conclusion** : `start_time` et `end_time` sont bien mappés vers `insertData`.

---

### 6️⃣ Écriture Supabase

**Fichier** : `src/services/supabase/bookings.ts` (lignes 91-95)

**Insertion** :
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert(insertData)  // Contient start_time et end_time
  .select()
  .single();
```

**Schéma DB** (d'après `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql`) :
```sql
CREATE TABLE public.bookings (
  -- ...
  start_date date,
  end_date date,
  start_time character varying,  -- ✅ Colonne existe
  end_time character varying,    -- ✅ Colonne existe
  -- ...
);
```

**✅ Conclusion** : Les colonnes `start_time` et `end_time` existent et sont bien écrites.

---

## ❌ PROBLÈME IDENTIFIÉ : Perte lors du snapshot légal

### 🔴 Point de rupture : `createLegalSnapshot`

**Fichier** : `src/services/supabaseCheckinService.ts`

**Fonction** : `createLegalSnapshot` (ligne 395)

**Problème** : Lors de la création du snapshot légal (étape 7 de l'état des lieux), le code **ignore** `start_time` / `end_time` et ne stocke que `start_date` / `end_date`.

**Code problématique** (lignes 457-459) :
```typescript
// 2.1. Charger la réservation
const { data: booking, error: bookingError } = await supabase
  .from("bookings")
  .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
  // ❌ start_time et end_time ne sont PAS sélectionnés
  .eq("id", checkinTyped.booking_id)
  .single();
```

**Construction du snapshot** (lignes 591-597) :
```typescript
const bookingSnapshot: CheckinLegalSnapshotBooking = {
  referenceNumber: booking?.reference_number ?? null,
  departureDatetime: booking?.start_date ?? null,  // ❌ Date-only, pas d'heure
  returnDatetime: booking?.end_date ?? null,       // ❌ Date-only, pas d'heure
  departureLocation: booking?.pickup_location ?? null,
  returnLocation: booking?.pickup_location ?? null,
};
```

**Écriture dans checkin_depart** (lignes 733-738) :
```typescript
booking_departure_datetime: bookingSnapshot.departureDatetime
  ? new Date(bookingSnapshot.departureDatetime).toISOString()  // ❌ "2026-01-29" → minuit UTC
  : null,
booking_return_datetime: bookingSnapshot.returnDatetime
  ? new Date(bookingSnapshot.returnDatetime).toISOString()     // ❌ "2026-01-31" → minuit UTC
  : null,
```

**Résultat** :
- `snapshot_legal.booking.departureDatetime` = `"2026-01-29"` (date-only)
- `checkin_depart.booking_departure_datetime` = `"2026-01-29T00:00:00.000Z"` (minuit UTC)
- L'heure **08:00 Madagascar** est perdue.

---

## 📌 Résumé du diagnostic

### ✅ L'heure existe jusqu'à : **L'insertion dans `bookings`**

- ✅ UI Homepage : `startTime` / `endTime` dans state
- ✅ Navigation : Passé via `location.state`
- ✅ VehicleDetails : Récupéré depuis `navigationState`
- ✅ Payload : Passé à `createBooking`
- ✅ Mapping : Mappé vers `insertData.start_time` / `end_time`
- ✅ Insertion DB : Écrit dans `bookings.start_time` / `end_time`

### ❌ L'heure est perdue à : **La création du snapshot légal (`createLegalSnapshot`)**

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Fonction** : `createLegalSnapshot` (ligne 395)  
**Lignes problématiques** : 457-459 (SELECT sans `start_time` / `end_time`), 591-597 (snapshot avec date-only)

### 📌 Raison exacte : **Le SELECT ne récupère pas `start_time` / `end_time`**

**Code actuel** (ligne 457-459) :
```typescript
const { data: booking } = await supabase
  .from("bookings")
  .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
  // ❌ start_time et end_time manquants
  .eq("id", checkinTyped.booking_id)
  .single();
```

**Conséquence** :
1. `booking.start_time` et `booking.end_time` sont `undefined`
2. Le snapshot est construit avec seulement `start_date` / `end_date` (date-only)
3. `booking_departure_datetime` / `booking_return_datetime` sont créés à partir de date-only → minuit UTC
4. L'heure métier (08:00 Madagascar) est perdue

---

## 🎯 Solution recommandée (hors scope diagnostic)

**Fichier à modifier** : `src/services/supabaseCheckinService.ts`

**Modification 1** : Ajouter `start_time` / `end_time` au SELECT (ligne 457-459) :
```typescript
const { data: booking } = await supabase
  .from("bookings")
  .select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
  // ✅ Ajouter start_time et end_time
  .eq("id", checkinTyped.booking_id)
  .single();
```

**Modification 2** : Construire le snapshot avec l'heure (lignes 591-597) :
```typescript
const bookingSnapshot: CheckinLegalSnapshotBooking = {
  referenceNumber: booking?.reference_number ?? null,
  departureDatetime: booking?.start_date && booking?.start_time
    ? `${booking.start_date}T${booking.start_time}:00+03:00`  // ✅ ISO complet avec heure Madagascar
    : null,
  returnDatetime: booking?.end_date && booking?.end_time
    ? `${booking.end_date}T${booking.end_time}:00+03:00`       // ✅ ISO complet avec heure Madagascar
    : null,
  departureLocation: booking?.pickup_location ?? null,
  returnLocation: booking?.pickup_location ?? null,
};
```

**Modification 3** : Écrire les timestamptz corrects (lignes 733-738) :
```typescript
booking_departure_datetime: bookingSnapshot.departureDatetime
  ? new Date(bookingSnapshot.departureDatetime).toISOString()  // ✅ ISO complet → timestamptz correct
  : null,
booking_return_datetime: bookingSnapshot.returnDatetime
  ? new Date(bookingSnapshot.returnDatetime).toISOString()     // ✅ ISO complet → timestamptz correct
  : null,
```

---

## 📋 Checklist de vérification

- [x] ✅ L'heure existe dans l'UI (homepage)
- [x] ✅ L'heure est passée via navigation state
- [x] ✅ L'heure est récupérée dans VehicleDetails
- [x] ✅ L'heure est passée à createBooking
- [x] ✅ L'heure est mappée vers insertData
- [x] ✅ L'heure est écrite dans `bookings.start_time` / `end_time`
- [x] ❌ L'heure est **perdue** lors de `createLegalSnapshot` (SELECT incomplet)

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Auteur** : Cursor AI

