# 🔧 Diff Git — Patch correction heure snapshot

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Fonction** : `createLegalSnapshot`  
**Date** : 2025-01-XX

---

## 📋 Diff complet

```diff
--- a/src/services/supabaseCheckinService.ts
+++ b/src/services/supabaseCheckinService.ts
@@ -456,7 +456,7 @@ export const SupabaseCheckinService = {
       // 2.1. Charger la réservation
       const { data: booking, error: bookingError } = await supabase
         .from("bookings")
-        .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
+        .select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
         .eq("id", checkinTyped.booking_id)
         .single();
 
@@ -588,7 +588,20 @@ export const SupabaseCheckinService = {
       };
 
       // 3.4. Booking (réservation)
+      // Construire les datetime ISO Madagascar (UTC+3) à partir de date + heure
+      const departureIso = booking?.start_date
+        ? `${booking.start_date}T${booking.start_time || "08:00"}:00+03:00`
+        : null;
+      const returnIso = booking?.end_date
+        ? `${booking.end_date}T${booking.end_time || "08:00"}:00+03:00`
+        : null;
+
+      // Log si fallback utilisé (pour debugging)
+      if (booking?.start_date && !booking?.start_time) {
+        console.warn("[SupabaseCheckinService] ⚠️ start_time manquant, utilisation fallback 08:00 pour", booking.start_date);
+      }
+      if (booking?.end_date && !booking?.end_time) {
+        console.warn("[SupabaseCheckinService] ⚠️ end_time manquant, utilisation fallback 08:00 pour", booking.end_date);
+      }
+
       const bookingSnapshot: CheckinLegalSnapshotBooking = {
         referenceNumber: booking?.reference_number ?? null,
-        departureDatetime: booking?.start_date ?? null,
-        returnDatetime: booking?.end_date ?? null,
+        departureDatetime: departureIso,
+        returnDatetime: returnIso,
         departureLocation: booking?.pickup_location ?? null,
         returnLocation: booking?.pickup_location ?? null, // Pour l'instant = departureLocation
       };
```

---

## 📝 Explication des modifications

### 1. SELECT enrichi (ligne 459)

**Avant** :
```typescript
.select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
```

**Après** :
```typescript
.select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
```

**Raison** : Récupérer `start_time` et `end_time` depuis la base de données.

---

### 2. Construction ISO Madagascar (lignes 590-602, INLINE)

**Emplacement** : Juste avant la construction de `bookingSnapshot` (après ligne 588)

**Code ajouté** :
```typescript
// Construire les datetime ISO Madagascar (UTC+3) à partir de date + heure
const departureIso = booking?.start_date
  ? `${booking.start_date}T${booking.start_time || "08:00"}:00+03:00`
  : null;
const returnIso = booking?.end_date
  ? `${booking.end_date}T${booking.end_time || "08:00"}:00+03:00`
  : null;

// Log si fallback utilisé (pour debugging)
if (booking?.start_date && !booking?.start_time) {
  console.warn("[SupabaseCheckinService] ⚠️ start_time manquant, utilisation fallback 08:00 pour", booking.start_date);
}
if (booking?.end_date && !booking?.end_time) {
  console.warn("[SupabaseCheckinService] ⚠️ end_time manquant, utilisation fallback 08:00 pour", booking.end_date);
}
```

**Raison** :
- ✅ **Inline** : Pas de helper externe, code simple et localisé
- ✅ **ISO Madagascar** : Format `"2026-01-29T08:00:00+03:00"` (timezone explicite)
- ✅ **Fallback conditionnel** : `"08:00"` uniquement si `start_time` / `end_time` est `null` ou `undefined`
- ✅ **Logging** : Avertissement si fallback utilisé (pour détecter les anciennes réservations)

---

### 3. bookingSnapshot modifié (lignes 604-605)

**Avant** :
```typescript
departureDatetime: booking?.start_date ?? null,  // Date-only
returnDatetime: booking?.end_date ?? null,       // Date-only
```

**Après** :
```typescript
departureDatetime: departureIso,  // ISO complet Madagascar
returnDatetime: returnIso,         // ISO complet Madagascar
```

**Raison** : Utiliser les ISO complets avec heure au lieu de date-only.

---

### 4. updatePayload inchangé (lignes 733-738)

**Code existant** (non modifié) :
```typescript
booking_departure_datetime: bookingSnapshot.departureDatetime
  ? new Date(bookingSnapshot.departureDatetime).toISOString()  // ISO Madagascar → UTC
  : null,
```

**Raison** : 
- `bookingSnapshot.departureDatetime` contient maintenant `"2026-01-29T08:00:00+03:00"`
- `new Date("2026-01-29T08:00:00+03:00").toISOString()` → `"2026-01-29T05:00:00.000Z"` (UTC)
- PostgreSQL `timestamptz` stocke en UTC, donc c'est correct.

---

## ✅ Résultats attendus

### Avant le patch

```
booking.start_date = "2026-01-29"
booking.start_time = "08:00" (non récupéré)
→ bookingSnapshot.departureDatetime = "2026-01-29" (date-only)
→ booking_departure_datetime = "2026-01-29T00:00:00.000Z" (minuit UTC) ❌
```

### Après le patch

```
booking.start_date = "2026-01-29"
booking.start_time = "08:00" (récupéré)
→ departureIso = "2026-01-29T08:00:00+03:00" (ISO Madagascar)
→ bookingSnapshot.departureDatetime = "2026-01-29T08:00:00+03:00"
→ booking_departure_datetime = "2026-01-29T05:00:00.000Z" (08:00 Mada = 05:00 UTC) ✅
```

---

## 📊 Fichiers modifiés

- ✅ `src/services/supabaseCheckinService.ts` (2 modifications)

---

## 🧪 Test rapide

```typescript
// Vérifier qu'un check-in completed a maintenant les bonnes valeurs
const { data: checkin } = await supabase
  .from('checkin_depart')
  .select('booking_departure_datetime, snapshot_legal')
  .eq('status', 'completed')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

console.log('booking_departure_datetime:', checkin.booking_departure_datetime);
// Attendu: "2026-01-29T05:00:00.000Z" (08:00 Mada)

console.log('snapshot departureDatetime:', checkin.snapshot_legal?.booking?.departureDatetime);
// Attendu: "2026-01-29T08:00:00+03:00" (ISO Madagascar)
```

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Auteur** : Cursor AI

