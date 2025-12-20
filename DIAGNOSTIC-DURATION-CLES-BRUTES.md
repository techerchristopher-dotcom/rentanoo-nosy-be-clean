# Diagnostic : Clés `duration.*` brutes dans card HOME + bloc "Réserver" page détails moto

## 1. Emplacements où le texte "total 51,00 € (duration..." est rendu

### A. Card HOME (`src/components/vehicles/vehicle-card.tsx`)

**Fichier** : `src/components/vehicles/vehicle-card.tsx`  
**Ligne** : 229-232

```typescript
{t("pricing.total_for_duration", {
  total: rentalInfo.totalCost,
  duration: buildDurationLabel(),
})}
```

**Contexte** :
- Utilise `buildDurationLabel()` qui appelle `formatDuration(t, rentalInfo.days, rentalInfo.hours)`
- `t` vient de `useTranslation('common')` (ligne 67)
- La clé `pricing.total_for_duration` est dans `common.pricing.total_for_duration`

### B. Bloc "Réserver" page détails moto (`src/pages/vehicles/MotoVehicleDetails.tsx`)

**Fichier** : `src/pages/vehicles/MotoVehicleDetails.tsx`  
**Ligne** : 1264-1269

```typescript
<span className="text-xs text-muted-foreground">
  (
  {
    vehicleRentalInfo.formattedPrice.match(/\((.*?)\)/)?.[1]
  }
  )
</span>
```

**Contexte** :
- Utilise `vehicleRentalInfo.formattedPrice` qui est **vide** (défini ligne 199 de `src/lib/utils.ts`)
- `formattedPrice` n'est plus utilisé mais le code essaie toujours de l'extraire
- Résultat : `undefined` ou chaîne vide, ce qui peut causer l'affichage de clés brutes

---

## 2. Comparaison avec `BookingConfirmationModal`

### BookingConfirmationModal (`src/components/booking/BookingConfirmationModal.tsx`)

**Ligne** : 305-307

```typescript
<p className="text-xs text-muted-foreground pl-1">
  {formatCurrency(rentalInfo.pricePerDay, currencyLocale)}/{t("par_jour")} × {durationText || ""}
</p>
```

**Contexte** :
- `durationText` vient de `formatDuration(t, days, hours)` (ligne 163)
- `t` vient de `useTranslation()` (ligne 52) → utilise `defaultNS="translation"`
- Format : `"€12.00/per day × 4 days + 6 hours"` (concaténation directe)

### Différences clés

| Aspect | Card HOME | MotoVehicleDetails | BookingConfirmationModal |
|--------|-----------|-------------------|------------------------|
| **Helper utilisé** | `formatDuration()` via `buildDurationLabel()` | `formattedPrice.match()` (vide) | `formatDuration()` directement |
| **Clé `t()`** | `pricing.total_for_duration` | Aucune (extraction regex) | Concaténation directe |
| **Namespace** | `useTranslation('common')` | `useTranslation('common')` | `useTranslation()` (defaultNS) |
| **Format** | `"soit {{total}} ({{duration}})"` | `undefined` (formattedPrice vide) | `"€/day × X days + Y hours"` |
| **Source durée** | `formatDuration(t, days, hours)` ✅ | `formattedPrice.match()` ❌ | `formatDuration(t, days, hours)` ✅ |

---

## 3. Pourquoi la durée sort en clés brutes

### Problème identifié

1. **Card HOME** : 
   - `formatDuration()` est appelé avec `t` de `useTranslation('common')`
   - Mais `formatDuration()` utilise `t("duration.day_one")`, `t("duration.hour_one")`, etc.
   - Ces clés sont dans `common.common.duration.*` (structure imbriquée)
   - Si `t()` ne résout pas correctement, les clés brutes apparaissent

2. **MotoVehicleDetails** :
   - Utilise `vehicleRentalInfo.formattedPrice.match(/\((.*?)\)/)?.[1]`
   - Mais `formattedPrice` est **vide** (ligne 199 de `src/lib/utils.ts`)
   - Résultat : `undefined` ou chaîne vide
   - Le code essaie d'afficher quelque chose qui n'existe pas

### Vérification de la structure JSON

Dans `src/i18n/locales/fr/common.json` :
```json
{
  "common": {
    "duration": {
      "day_one": "{{count}} jour",
      "day_other": "{{count}} jours",
      "hour_one": "{{count}} heure",
      "hour_other": "{{count}} heures",
      "separator": " + "
    },
    "pricing": {
      "total_for_duration": "soit {{total}} ({{duration}})"
    }
  }
}
```

Les clés sont sous `common.common.duration.*`, donc avec `useTranslation('common')`, il faut utiliser `t("common.duration.day_one")` ou simplement `t("duration.day_one")` si le namespace est correctement configuré.

---

## 4. Patch minimal proposé

### Principe
Réutiliser **exactement** la même construction que `BookingConfirmationModal` :
- Utiliser `formatDuration(t, days, hours)` directement
- Afficher au format `"€/day × X days + Y hours"` (concaténation directe)
- Ne pas utiliser `pricing.total_for_duration` (qui peut causer des problèmes de résolution)

### Modifications

#### A. Card HOME (`src/components/vehicles/vehicle-card.tsx`)

**Avant** (lignes 228-233) :
```typescript
<div className="text-sm text-muted-foreground mt-1">
  {t("pricing.total_for_duration", {
    total: rentalInfo.totalCost,
    duration: buildDurationLabel(),
  })}
</div>
```

**Après** :
```typescript
<div className="text-sm text-muted-foreground mt-1">
  {formatCurrency(rentalInfo.pricePerDay)}/{t("par_jour")} × {buildDurationLabel() || ""}
</div>
```

#### B. MotoVehicleDetails (`src/pages/vehicles/MotoVehicleDetails.tsx`)

**Avant** (lignes 1260-1270) :
```typescript
<div className="flex items-baseline gap-2">
  <span className="text-2xl font-bold text-primary">
    {vehicleRentalInfo.totalCost}€*
  </span>
  <span className="text-xs text-muted-foreground">
    (
    {
      vehicleRentalInfo.formattedPrice.match(/\((.*?)\)/)?.[1]
    }
    )
  </span>
</div>
```

**Après** :
```typescript
<div className="flex items-baseline gap-2">
  <span className="text-2xl font-bold text-primary">
    {formatCurrency(vehicleRentalInfo.totalCost, currencyLocale)}*
  </span>
  <span className="text-xs text-muted-foreground">
    {formatCurrency(vehicleRentalInfo.pricePerDay, currencyLocale)}/{t("par_jour")} × {formatDuration(t, vehicleRentalInfo.days, vehicleRentalInfo.hours) || ""}
  </span>
</div>
```

**Note** : Il faut aussi :
- Importer `formatDuration` en haut du fichier
- Importer `formatCurrency` si pas déjà fait
- Définir `currencyLocale` comme dans `BookingConfirmationModal`

---

## 5. Diff final attendu

### A. `src/components/vehicles/vehicle-card.tsx`

```diff
--- a/src/components/vehicles/vehicle-card.tsx
+++ b/src/components/vehicles/vehicle-card.tsx
@@ -17,6 +17,7 @@ import { Vehicle, Photo, VehicleRentalInfo } from "@/types";
 import { cn } from "@/lib/utils";
 import { PhotoService } from "@/services/supabase/photos";
 import { formatDuration } from "@/utils/formatDuration";
+import { formatCurrency } from "@/utils/currency";
 
 // ... existing code ...
 
@@ -225,9 +226,7 @@ export function VehicleCard({ vehicle, primaryPhoto, onClick, className, renta
                 </div>
                 <div className="text-xs text-muted-foreground">{t('par_jour')}</div>
                 <div className="text-sm text-muted-foreground mt-1">
-                  {t("pricing.total_for_duration", {
-                    total: rentalInfo.totalCost,
-                    duration: buildDurationLabel(),
-                  })}
+                  {formatCurrency(rentalInfo.pricePerDay)}/{t("par_jour")} × {buildDurationLabel() || ""}
                 </div>
               </div>)
             ) : (
```

### B. `src/pages/vehicles/MotoVehicleDetails.tsx`

```diff
--- a/src/pages/vehicles/MotoVehicleDetails.tsx
+++ b/src/pages/vehicles/MotoVehicleDetails.tsx
@@ -58,6 +58,8 @@ import { createVehicleRentalInfo } from "@/lib/utils";
 import { formatLegacyFormattedPrice } from "@/utils/formatLegacyFormattedPrice";
 import { formatCurrency } from "@/utils/currency";
+import { formatDuration } from "@/utils/formatDuration";
+import { enUS } from "date-fns/locale/en-US";
+import { it as itLocale } from "date-fns/locale/it";
+import { de as deLocale } from "date-fns/locale/de";
+import { fr } from "date-fns/locale/fr";
 
 // ... existing code ...
 
@@ -1255,15 +1257,20 @@ export default function MotoVehicleDetails() {
           <div className="flex items-center justify-between gap-4">
             <div className="flex flex-col">
               {vehicleRentalInfo ? (
                 <>
                   <div className="flex items-baseline gap-2">
                     <span className="text-2xl font-bold text-primary">
-                      {vehicleRentalInfo.totalCost}€*
+                      {formatCurrency(vehicleRentalInfo.totalCost, currencyLocale)}*
                     </span>
                     <span className="text-xs text-muted-foreground">
-                      (
-                      {
-                        vehicleRentalInfo.formattedPrice.match(/\((.*?)\)/)?.[1]
-                      }
-                      )
+                      {formatCurrency(vehicleRentalInfo.pricePerDay, currencyLocale)}/{t("par_jour")} × {formatDuration(t, vehicleRentalInfo.days, vehicleRentalInfo.hours) || ""}
                     </span>
                   </div>
                   <div className="text-xs text-muted-foreground">
-                    {dailyRate}€/{t("common.par_jour")} • {t("booking.excludingFeesNote")}
+                    {dailyRate}€/{t("par_jour")} • {t("booking.excludingFeesNote")}
                   </div>
```

**Note** : Il faut aussi ajouter la définition de `currencyLocale` dans `MotoVehicleDetails` (comme dans `BookingConfirmationModal`) :

```typescript
const currentLang = i18n.language || "fr";
const currencyLocale = 
  currentLang.startsWith("fr") ? "fr-FR" :
  currentLang.startsWith("it") ? "it-IT" :
  currentLang.startsWith("de") ? "de-DE" :
  "en-US";
```

---

## 6. Checklist de validation visuelle (EN/FR/IT/DE)

### Card HOME

- [ ] **FR** : Affiche `"soit 51,00 € (4 jours + 6 heures)"` → doit devenir `"51,00 €/par jour × 4 jours + 6 heures"`
- [ ] **EN** : Affiche `"total 51.00 € (4 days + 6 hours)"` → doit devenir `"€51.00/per day × 4 days + 6 hours"`
- [ ] **IT** : Affiche `"totale 51,00 € (4 giorni + 6 ore)"` → doit devenir `"€51,00/al giorno × 4 giorni + 6 ore"`
- [ ] **DE** : Affiche `"gesamt 51,00 € (4 Tage + 6 Stunden)"` → doit devenir `"51,00 €/pro Tag × 4 Tage + 6 Stunden"`
- [ ] **Vérification** : Plus aucune clé brute `duration.*` visible

### Bloc "Réserver" page détails moto

- [ ] **FR** : Affiche `"51,00 €* (undefined)"` → doit devenir `"51,00 €*"` avec `"51,00 €/par jour × 4 jours + 6 heures"` en dessous
- [ ] **EN** : Affiche `"$51.00* (undefined)"` → doit devenir `"$51.00*"` avec `"$51.00/per day × 4 days + 6 hours"` en dessous
- [ ] **IT** : Affiche `"€51,00* (undefined)"` → doit devenir `"€51,00*"` avec `"€51,00/al giorno × 4 giorni + 6 ore"` en dessous
- [ ] **DE** : Affiche `"51,00 €* (undefined)"` → doit devenir `"51,00 €*"` avec `"51,00 €/pro Tag × 4 Tage + 6 Stunden"` en dessous
- [ ] **Vérification** : Plus aucune clé brute `duration.*` visible

### Tests de cas limites

- [ ] **1 jour, 0 heure** : Affiche `"X jours"` (pas `"X jours + 0 heures"`)
- [ ] **0 jour, 6 heures** : Affiche `"6 heures"` (pas `"0 jours + 6 heures"`)
- [ ] **1 jour, 1 heure** : Affiche `"1 jour + 1 heure"` (singulier correct)
- [ ] **4 jours, 6 heures** : Affiche `"4 jours + 6 heures"` (pluriel correct)

---

## Résumé

**Problème** : Les clés `duration.*` s'affichent en brut car :
1. Card HOME utilise `pricing.total_for_duration` qui peut mal résoudre les clés imbriquées
2. MotoVehicleDetails utilise `formattedPrice` qui est vide

**Solution** : Réutiliser exactement la même construction que `BookingConfirmationModal` :
- Format `"€/day × X days + Y hours"` (concaténation directe)
- Utiliser `formatDuration(t, days, hours)` directement
- Ne pas utiliser `pricing.total_for_duration`

