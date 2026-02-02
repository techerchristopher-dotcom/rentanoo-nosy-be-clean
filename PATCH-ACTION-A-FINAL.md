# ✅ Patch Action A — Application finale

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Fonction** : `createLegalSnapshot`  
**Statut** : ✅ **APPLIQUÉ**

---

## 📋 Diff Git final

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

## ✅ Modifications appliquées

### 1. SELECT enrichi (ligne 459)

**Modification** : Ajout de `start_time, end_time` dans le SELECT

```typescript
.select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
```

**Résultat** : `booking.start_time` et `booking.end_time` sont maintenant disponibles.

---

### 2. Construction ISO Madagascar inline (lignes 591-605)

**Emplacement** : Juste avant la création de `bookingSnapshot` (après ligne 588)

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

**Caractéristiques** :
- ✅ **Inline** : Pas de helper externe, code localisé
- ✅ **ISO explicite** : Format `"YYYY-MM-DDTHH:MM:00+03:00"` (timezone Madagascar)
- ✅ **Fallback conditionnel** : `"08:00"` uniquement si `start_time` / `end_time` est `null` ou `undefined`
- ✅ **Logging** : Avertissement si fallback utilisé

---

### 3. bookingSnapshot modifié (lignes 609-610)

**Avant** :
```typescript
departureDatetime: booking?.start_date ?? null,  // Date-only
returnDatetime: booking?.end_date ?? null,        // Date-only
```

**Après** :
```typescript
departureDatetime: departureIso,  // ISO complet Madagascar
returnDatetime: returnIso,         // ISO complet Madagascar
```

**Résultat** : Le snapshot contient maintenant des ISO complets avec heure.

---

### 4. updatePayload inchangé (lignes 750, 753)

**Code existant** (non modifié, comme demandé) :
```typescript
booking_departure_datetime: bookingSnapshot.departureDatetime
  ? new Date(bookingSnapshot.departureDatetime).toISOString()  // ISO Madagascar → UTC
  : null,
booking_return_datetime: bookingSnapshot.returnDatetime
  ? new Date(bookingSnapshot.returnDatetime).toISOString()     // ISO Madagascar → UTC
  : null,
```

**Raison** : La conversion automatique `new Date(isoMada).toISOString()` est correcte pour PostgreSQL `timestamptz`.

---

## 📊 Valeurs finales attendues

### Exemple avec `start_time = "08:00"` et `end_time = "08:00"`

**Input** :
- `booking.start_date` = `"2026-01-29"`
- `booking.start_time` = `"08:00"`
- `booking.end_date` = `"2026-01-31"`
- `booking.end_time` = `"08:00"`

**Résultats** :

1. **`departureIso`** (variable locale) :
   ```
   "2026-01-29T08:00:00+03:00"
   ```

2. **`returnIso`** (variable locale) :
   ```
   "2026-01-31T08:00:00+03:00"
   ```

3. **`snapshot_legal.booking.departureDatetime`** (JSONB) :
   ```json
   "2026-01-29T08:00:00+03:00"
   ```

4. **`snapshot_legal.booking.returnDatetime`** (JSONB) :
   ```json
   "2026-01-31T08:00:00+03:00"
   ```

5. **`checkin_depart.booking_departure_datetime`** (timestamptz UTC) :
   ```
   2026-01-29T05:00:00.000Z
   ```
   *(08:00 Madagascar = 05:00 UTC)*

6. **`checkin_depart.booking_return_datetime`** (timestamptz UTC) :
   ```
   2026-01-31T05:00:00.000Z
   ```
   *(08:00 Madagascar = 05:00 UTC)*

---

## ✅ Confirmation des valeurs finales

### Format attendu dans `snapshot_legal.booking`

```typescript
departureDatetime: "YYYY-MM-DDTHH:MM:00+03:00"  // ISO Madagascar complet
returnDatetime: "YYYY-MM-DDTHH:MM:00+03:00"      // ISO Madagascar complet
```

**Exemple** :
```json
{
  "booking": {
    "departureDatetime": "2026-01-29T08:00:00+03:00",
    "returnDatetime": "2026-01-31T08:00:00+03:00"
  }
}
```

### Format attendu dans `checkin_depart` (DB timestamptz)

```sql
booking_departure_datetime: UTC équivalent de l'ISO Madagascar
booking_return_datetime: UTC équivalent de l'ISO Madagascar
```

**Exemple** :
```sql
booking_departure_datetime = '2026-01-29 05:00:00+00'  -- 08:00 Mada = 05:00 UTC
booking_return_datetime = '2026-01-31 05:00:00+00'      -- 08:00 Mada = 05:00 UTC
```

**Note** : PostgreSQL stocke en UTC, donc `05:00 UTC` est correct pour `08:00 Madagascar` (UTC+3).

---

## 🧪 Test de vérification

### Requête SQL pour vérifier après patch

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

**Résultat attendu** :
```
booking_departure_datetime: 2026-01-29T05:00:00+00:00  ✅ (08:00 Mada → 05:00 UTC)
snapshot_departure: "2026-01-29T08:00:00+03:00"        ✅ (ISO Madagascar complet)
```

---

## 📝 Résumé

- ✅ **SELECT** : Inclut `start_time, end_time`
- ✅ **ISO Madagascar** : Construits inline avec fallback `"08:00"` si nécessaire
- ✅ **bookingSnapshot** : Utilise les ISO complets
- ✅ **updatePayload** : Inchangé, conversion automatique UTC correcte
- ✅ **Pas de refactor** : Code minimal et localisé
- ✅ **Pas de changement UI/DB** : Seulement la logique de snapshot

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0 (Final)  
**Statut** : ✅ **PATCH APPLIQUÉ**

