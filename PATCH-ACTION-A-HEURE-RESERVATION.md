# 🔧 Patch Action A — Correction perte heure réservation

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Fonction** : `createLegalSnapshot` (ligne 395)  
**Objectif** : Récupérer `start_time` / `end_time` depuis `bookings` et construire des datetime ISO Madagascar complets.

---

## 📋 Extraits du code actuel

### 1️⃣ SELECT du booking (lignes 457-461)

```typescript
// 2.1. Charger la réservation
const { data: booking, error: bookingError } = await supabase
  .from("bookings")
  .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
  // ❌ start_time et end_time manquants
  .eq("id", checkinTyped.booking_id)
  .single();
```

**Problème** : `start_time` et `end_time` ne sont pas sélectionnés.

---

### 2️⃣ Construction de bookingSnapshot (lignes 591-597)

```typescript
// 3.4. Booking (réservation)
const bookingSnapshot: CheckinLegalSnapshotBooking = {
  referenceNumber: booking?.reference_number ?? null,
  departureDatetime: booking?.start_date ?? null,  // ❌ Date-only, pas d'heure
  returnDatetime: booking?.end_date ?? null,       // ❌ Date-only, pas d'heure
  departureLocation: booking?.pickup_location ?? null,
  returnLocation: booking?.pickup_location ?? null,
};
```

**Problème** : Utilise seulement `start_date` / `end_date` (date-only), ignore `start_time` / `end_time`.

---

### 3️⃣ updatePayload (lignes 733-738)

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

**Problème** : `new Date("2026-01-29")` interprété comme minuit UTC au lieu de 08:00 Madagascar.

---

## 🔧 Patch minimal

### Helper function (à ajouter AVANT l'objet `SupabaseCheckinService`)

**Emplacement** : Après les imports, avant l'objet `SupabaseCheckinService` (vers ligne 68)

```typescript
/**
 * Construit un datetime ISO complet en timezone Madagascar (UTC+3)
 * à partir d'une date (YYYY-MM-DD) et d'une heure (HH:MM).
 * 
 * @param date - Date au format "YYYY-MM-DD" ou null
 * @param time - Heure au format "HH:MM" ou null
 * @param fallbackTime - Heure par défaut si time est null (défaut: "08:00")
 * @returns ISO string avec timezone Madagascar (ex: "2026-01-29T08:00:00+03:00") ou null
 */
function buildIsoMada(
  date: string | null | undefined,
  time: string | null | undefined,
  fallbackTime: string = "08:00"
): string | null {
  if (!date) return null;
  const hhmm = time || fallbackTime;
  return `${date}T${hhmm}:00+03:00`; // Indian/Antananarivo (UTC+3)
}
```

---

### Diff complet

```diff
--- a/src/services/supabaseCheckinService.ts
+++ b/src/services/supabaseCheckinService.ts
@@ -65,6 +65,24 @@ import {
   SNAPSHOT_VERSION,
 } from "@/types/snapshot-legal";
 
+/**
+ * Construit un datetime ISO complet en timezone Madagascar (UTC+3)
+ * à partir d'une date (YYYY-MM-DD) et d'une heure (HH:MM).
+ * 
+ * @param date - Date au format "YYYY-MM-DD" ou null
+ * @param time - Heure au format "HH:MM" ou null
+ * @param fallbackTime - Heure par défaut si time est null (défaut: "08:00")
+ * @returns ISO string avec timezone Madagascar (ex: "2026-01-29T08:00:00+03:00") ou null
+ */
+function buildIsoMada(
+  date: string | null | undefined,
+  time: string | null | undefined,
+  fallbackTime: string = "08:00"
+): string | null {
+  if (!date) return null;
+  const hhmm = time || fallbackTime;
+  return `${date}T${hhmm}:00+03:00`; // Indian/Antananarivo (UTC+3)
+}
+
 export interface CheckinDepart {
   id: string;
   booking_id: string;
@@ -457,7 +475,7 @@ export const SupabaseCheckinService = {
       // 2.1. Charger la réservation
       const { data: booking, error: bookingError } = await supabase
         .from("bookings")
-        .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
+        .select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
         .eq("id", checkinTyped.booking_id)
         .single();
 
@@ -590,8 +608,10 @@ export const SupabaseCheckinService = {
 
       // 3.4. Booking (réservation)
       const bookingSnapshot: CheckinLegalSnapshotBooking = {
         referenceNumber: booking?.reference_number ?? null,
-        departureDatetime: booking?.start_date ?? null,
-        returnDatetime: booking?.end_date ?? null,
+        departureDatetime: buildIsoMada(booking?.start_date, booking?.start_time),
+        returnDatetime: buildIsoMada(booking?.end_date, booking?.end_time),
         departureLocation: booking?.pickup_location ?? null,
         returnLocation: booking?.pickup_location ?? null, // Pour l'instant = departureLocation
       };
@@ -732,8 +752,8 @@ export const SupabaseCheckinService = {
         // Colonnes SQL critiques - Booking
         booking_reference_number: bookingSnapshot.referenceNumber,
         booking_departure_datetime: bookingSnapshot.departureDatetime
-          ? new Date(bookingSnapshot.departureDatetime).toISOString()
+          ? new Date(bookingSnapshot.departureDatetime).toISOString() // ISO Madagascar → UTC automatiquement
           : null,
         booking_return_datetime: bookingSnapshot.returnDatetime
-          ? new Date(bookingSnapshot.returnDatetime).toISOString()
+          ? new Date(bookingSnapshot.returnDatetime).toISOString() // ISO Madagascar → UTC automatiquement
           : null,
         booking_departure_location: bookingSnapshot.departureLocation,
    * 
    * NOTE: createLegalSnapshot centralise toute la logique de snapshot légal pour checkin_depart.
@@ -457,7 +475,7 @@ export const SupabaseCheckinService = {
       // 2.1. Charger la réservation
       const { data: booking, error: bookingError } = await supabase
         .from("bookings")
-        .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
+        .select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
         .eq("id", checkinTyped.booking_id)
         .single();
 
@@ -590,8 +608,10 @@ export const SupabaseCheckinService = {
 
       // 3.4. Booking (réservation)
       const bookingSnapshot: CheckinLegalSnapshotBooking = {
         referenceNumber: booking?.reference_number ?? null,
-        departureDatetime: booking?.start_date ?? null,
-        returnDatetime: booking?.end_date ?? null,
+        departureDatetime: buildIsoMada(booking?.start_date, booking?.start_time),
+        returnDatetime: buildIsoMada(booking?.end_date, booking?.end_time),
         departureLocation: booking?.pickup_location ?? null,
         returnLocation: booking?.pickup_location ?? null, // Pour l'instant = departureLocation
       };
@@ -732,8 +752,8 @@ export const SupabaseCheckinService = {
         // Colonnes SQL critiques - Booking
         booking_reference_number: bookingSnapshot.referenceNumber,
         booking_departure_datetime: bookingSnapshot.departureDatetime
-          ? new Date(bookingSnapshot.departureDatetime).toISOString()
+          ? new Date(bookingSnapshot.departureDatetime).toISOString() // ISO Madagascar → UTC automatiquement
           : null,
         booking_return_datetime: bookingSnapshot.returnDatetime
-          ? new Date(bookingSnapshot.returnDatetime).toISOString()
+          ? new Date(bookingSnapshot.returnDatetime).toISOString() // ISO Madagascar → UTC automatiquement
           : null,
         booking_departure_location: bookingSnapshot.departureLocation,
```

---

## 📝 Explication du patch

### 1. Helper `buildIsoMada`

- **Input** : `date` ("YYYY-MM-DD") + `time` ("HH:MM")
- **Output** : ISO string avec timezone Madagascar (`"2026-01-29T08:00:00+03:00"`)
- **Fallback** : Si `time` est null, utilise `"08:00"` (heure métier par défaut)

**Justification du fallback** : Les anciennes réservations peuvent ne pas avoir `start_time` / `end_time`. Le fallback `"08:00"` est cohérent avec l'heure métier standard.

### 2. SELECT enrichi

- **Avant** : `select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")`
- **Après** : `select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")`

### 3. bookingSnapshot avec ISO complet

- **Avant** : `departureDatetime: booking?.start_date ?? null` (date-only)
- **Après** : `departureDatetime: buildIsoMada(booking?.start_date, booking?.start_time)` (ISO complet)

### 4. updatePayload inchangé (conversion automatique)

- `new Date("2026-01-29T08:00:00+03:00").toISOString()` → `"2026-01-29T05:00:00.000Z"` (UTC)
- PostgreSQL `timestamptz` stocke en UTC, donc c'est correct.

---

## ✅ Checklist de vérification

### Avant le patch

**Test 1 : Vérifier les données en base**

```sql
-- Vérifier qu'une réservation a bien start_time / end_time
SELECT 
  id,
  start_date,
  start_time,
  end_date,
  end_time
FROM bookings
WHERE start_time IS NOT NULL
LIMIT 1;
```

**Résultat attendu** :
```
id: 33b55c9d-052e-4905-a728-d04280854a3e
start_date: 2026-01-29
start_time: 08:00
end_date: 2026-01-31
end_time: 08:00
```

**Test 2 : Vérifier le snapshot actuel (AVANT patch)**

```sql
SELECT 
  id,
  booking_departure_datetime,
  booking_return_datetime,
  snapshot_legal->'booking'->>'departureDatetime' as snapshot_departure,
  snapshot_legal->'booking'->>'returnDatetime' as snapshot_return
FROM checkin_depart
WHERE status = 'completed'
LIMIT 1;
```

**Résultat attendu (PROBLÈME)** :
```
booking_departure_datetime: 2026-01-29T00:00:00+00:00  ❌ Minuit UTC
snapshot_departure: "2026-01-29"                        ❌ Date-only
```

---

### Après le patch

**Test 3 : Vérifier le snapshot corrigé (APRÈS patch)**

```sql
SELECT 
  id,
  booking_departure_datetime,
  booking_return_datetime,
  snapshot_legal->'booking'->>'departureDatetime' as snapshot_departure,
  snapshot_legal->'booking'->>'returnDatetime' as snapshot_return
FROM checkin_depart
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 1;
```

**Résultat attendu (CORRIGÉ)** :
```
booking_departure_datetime: 2026-01-29T05:00:00+00:00  ✅ 08:00 Mada → 05:00 UTC
snapshot_departure: "2026-01-29T08:00:00+03:00"        ✅ ISO complet Madagascar
```

**Test 4 : Vérifier l'affichage PDF**

1. Finaliser un check-in avec une réservation ayant `start_time = "08:00"`
2. Générer le PDF
3. Vérifier que la date affichée est **"29/01/2026 à 08:00"** (pas 03:00)

**Test 5 : Vérifier l'email n8n**

1. Exécuter le workflow n8n pour un check-in `completed`
2. Vérifier que l'email affiche **"29/01/2026 à 08:00"** (pas 00:00)

---

## 🧪 Test reproductible

### Script de test (à exécuter dans la console du navigateur)

```javascript
// 1. Trouver une réservation avec start_time
const { data: booking } = await supabase
  .from('bookings')
  .select('id, start_date, start_time, end_date, end_time')
  .eq('start_time', '08:00')
  .limit(1)
  .single();

console.log('📋 Booking:', booking);

// 2. Trouver le check-in associé
const { data: checkin } = await supabase
  .from('checkin_depart')
  .select('id, booking_departure_datetime, snapshot_legal')
  .eq('booking_id', booking.id)
  .maybeSingle();

if (checkin) {
  console.log('📸 Check-in actuel:');
  console.log('  booking_departure_datetime:', checkin.booking_departure_datetime);
  console.log('  snapshot departureDatetime:', checkin.snapshot_legal?.booking?.departureDatetime);
  
  // 3. Tester la fonction buildIsoMada
  const buildIsoMada = (date, time, fallback = "08:00") => {
    if (!date) return null;
    const hhmm = time || fallback;
    return `${date}T${hhmm}:00+03:00`;
  };
  
  const expectedIso = buildIsoMada(booking.start_date, booking.start_time);
  console.log('✅ ISO attendu:', expectedIso);
  console.log('✅ UTC attendu:', new Date(expectedIso).toISOString());
} else {
  console.log('⚠️ Aucun check-in trouvé pour cette réservation');
}
```

**Résultat attendu** :
```
📋 Booking: { id: "...", start_date: "2026-01-29", start_time: "08:00", ... }
📸 Check-in actuel:
  booking_departure_datetime: 2026-01-29T00:00:00+00:00  ❌ (avant patch)
  snapshot departureDatetime: "2026-01-29"               ❌ (avant patch)
✅ ISO attendu: "2026-01-29T08:00:00+03:00"
✅ UTC attendu: "2026-01-29T05:00:00.000Z"
```

---

## 📊 Valeurs attendues après patch

| Source | Format | Exemple |
|--------|--------|---------|
| **UI** | `dd/MM/yyyy à HH:mm` | `29/01/2026 à 08:00` |
| **DB bookings** | `start_date` + `start_time` | `2026-01-29` + `08:00` |
| **snapshot_legal.booking.departureDatetime** | ISO Madagascar | `"2026-01-29T08:00:00+03:00"` |
| **checkin_depart.booking_departure_datetime** | timestamptz UTC | `2026-01-29T05:00:00.000Z` |
| **PDF formaté** | `dd/MM/yyyy à HH:mm` (Mada) | `29/01/2026 à 08:00` |
| **Email n8n formaté** | `dd/MM/yyyy à HH:mm` (Mada) | `29/01/2026 à 08:00` |

**Note** : `2026-01-29T08:00:00+03:00` (Madagascar) = `2026-01-29T05:00:00.000Z` (UTC). PostgreSQL stocke en UTC, donc c'est correct.

---

## 🚀 Application du patch

1. **Ouvrir** : `src/services/supabaseCheckinService.ts`
2. **Ajouter** la fonction `buildIsoMada` après les imports, avant l'objet `SupabaseCheckinService` (vers ligne 68)
3. **Modifier** le SELECT (ligne 459) : ajouter `start_time, end_time`
4. **Modifier** `bookingSnapshot` (lignes 593-594) : utiliser `buildIsoMada`
5. **Tester** avec un check-in existant ou créer un nouveau check-in

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Auteur** : Cursor AI

