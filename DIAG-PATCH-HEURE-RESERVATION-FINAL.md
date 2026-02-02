# 🔍 Diagnostic + Patch — Perte heure réservation

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Fonction** : `createLegalSnapshot` (ligne 395)

---

## 📋 ÉTAPE 1 — DIAGNOSTIC

### ✅ Confirmation du problème

**1. SELECT sur `bookings` — Ligne 459**

```typescript
.select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
```

**Trouvé à la ligne ~459** : `start_time` et `end_time` sont **ABSENTS** du SELECT.

---

**2. Construction de `bookingSnapshot` — Lignes 593-594**

```typescript
departureDatetime: booking?.start_date ?? null,  // Ligne 593
returnDatetime: booking?.end_date ?? null,       // Ligne 594
```

**Trouvé à la ligne ~593-594** : `departureDatetime` et `returnDatetime` sont basés **uniquement** sur `start_date` / `end_date` (date-only), **sans l'heure**.

---

**3. Conversion en timestamptz — Lignes 733-738**

```typescript
booking_departure_datetime: bookingSnapshot.departureDatetime
  ? new Date(bookingSnapshot.departureDatetime).toISOString()  // Ligne 734
  : null,
booking_return_datetime: bookingSnapshot.returnDatetime
  ? new Date(bookingSnapshot.returnDatetime).toISOString()    // Ligne 737
  : null,
```

**Trouvé à la ligne ~734 et ~737** : `new Date("2026-01-29").toISOString()` convertit une **date-only** en minuit UTC (`"2026-01-29T00:00:00.000Z"`), au lieu de 08:00 Madagascar.

---

### 🎯 Cause racine confirmée

**Cause racine** : Le SELECT ne récupère pas `start_time` / `end_time`, donc `bookingSnapshot.departureDatetime` contient seulement `"2026-01-29"` (date-only). Quand on fait `new Date("2026-01-29").toISOString()`, JavaScript interprète cela comme minuit UTC, pas comme 08:00 Madagascar.

**Impact** :
- `snapshot_legal.booking.departureDatetime` = `"2026-01-29"` (date-only)
- `checkin_depart.booking_departure_datetime` = `"2026-01-29T00:00:00.000Z"` (minuit UTC)
- PDF/Email affichent 03:00 (minuit UTC + 3h) au lieu de 08:00

---

## 🔧 ÉTAPE 2 — PATCH MINIMAL

### Helper function (à ajouter avant l'objet `SupabaseCheckinService`)

**Emplacement** : Après les imports, avant `export interface CheckinDepart` (vers ligne 67)

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

**Justification du fallback `"08:00"`** : Heure métier standard pour les réservations. Les anciennes réservations peuvent ne pas avoir `start_time` / `end_time` en base.

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
```

**Note** : Les lignes 733-738 (`updatePayload`) restent **inchangées**. `new Date("2026-01-29T08:00:00+03:00").toISOString()` convertit automatiquement en UTC (`"2026-01-29T05:00:00.000Z"`), ce qui est correct pour PostgreSQL `timestamptz`.

---

## ✅ Checklist de test SQL

### Test 1 : Vérifier qu'une réservation a bien `start_time` / `end_time`

```sql
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
start_date: 2026-01-29
start_time: 08:00
end_date: 2026-01-31
end_time: 08:00
```

---

### Test 2 : Vérifier le snapshot AVANT patch (problème actuel)

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

**Résultat attendu (PROBLÈME)** :
```
booking_departure_datetime: 2026-01-29T00:00:00+00:00  ❌ Minuit UTC
snapshot_departure: "2026-01-29"                        ❌ Date-only
```

---

### Test 3 : Vérifier le snapshot APRÈS patch (corrigé)

**Exécuter le même SELECT après avoir appliqué le patch et régénéré un snapshot** :

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

**Vérification** :
- `snapshot_departure` contient bien `+03:00` ✅
- `booking_departure_datetime` en UTC = 05:00Z (équivalent à 08:00+03:00) ✅

---

### Test 4 : Vérifier la conversion UTC

```sql
-- Vérifier que 08:00 Madagascar = 05:00 UTC
SELECT 
  '2026-01-29T08:00:00+03:00'::timestamptz as mada_time,
  '2026-01-29T08:00:00+03:00'::timestamptz AT TIME ZONE 'UTC' as utc_time;
```

**Résultat attendu** :
```
mada_time: 2026-01-29 08:00:00+03:00
utc_time: 2026-01-29 05:00:00+00:00  ✅ Correct
```

---

## 📊 Résumé des modifications

| Fichier | Lignes modifiées | Changement |
|---------|------------------|------------|
| `src/services/supabaseCheckinService.ts` | 67-84 | Ajout helper `buildIsoMada` |
| `src/services/supabaseCheckinService.ts` | 459 | Ajout `start_time, end_time` au SELECT |
| `src/services/supabaseCheckinService.ts` | 593-594 | Utilisation de `buildIsoMada` pour construire ISO complet |

**Total** : 3 modifications ciblées, pas de refactoring.

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Auteur** : Cursor AI

