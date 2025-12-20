# Diff final - Correction des clés duration.* brutes

## Fichiers modifiés (2 fichiers max)

### 1. `src/components/vehicles/moto-vehicle-card.tsx`

**Ligne 210-213** : Remplacement de `pricing.total_for_duration` par le format direct comme BookingConfirmationModal

```diff
-                    {t("pricing.total_for_duration", {
-                      total: formatCurrency(rentalInfo.totalCost),
-                      duration: durationLabel,
-                    })}
+                    {formatCurrency(rentalInfo.pricePerDay)}/{t("par_jour")} × {durationLabel || ""}
```

**Note** : `durationLabel` est déjà calculé avec `formatDuration(t, rentalInfo.days, rentalInfo.hours)` (ligne 112-115)

### 2. `src/pages/vehicles/MotoVehicleDetails.tsx`

**Ajouts** :
- Import de `formatDuration` (ligne 62)
- Définition de `currencyLocale` (lignes 112-118) - exactement comme BookingConfirmationModal
- Calcul de `days`, `hours`, `durationText` (lignes 338-375) - exactement comme BookingConfirmationModal

**Modifications** :
- Ligne 1307-1310 : Remplacement de `formattedPrice.match()` par `formatCurrency` + `durationText`
- Ligne 1313 : Utilisation de `formatCurrency` pour `dailyRate`

```diff
+import { formatDuration } from "@/utils/formatDuration";
+
   const { t, i18n } = useTranslation("common");
   
+  // Locale pour formatCurrency (comme dans BookingConfirmationModal)
+  const currentLang = i18n.language || "fr";
+  const currencyLocale = 
+    currentLang.startsWith("fr") ? "fr-FR" :
+    currentLang.startsWith("it") ? "it-IT" :
+    currentLang.startsWith("de") ? "de-DE" :
+    "en-US";
+
   // ... existing code ...
 
   const vehicleRentalInfo: VehicleRentalInfo | null =
     vehicle && navigationState?.rentalCalculation
       ? createVehicleRentalInfo(
           vehicle.id,
           vehicle.dailyPrice,
           navigationState.rentalCalculation
         )
       : null;
 
+  // Calculer la durée en jours et heures pour formatDuration (exactement comme BookingConfirmationModal)
+  let days: number = 0;
+  let hours: number = 0;
+  let durationText: string | null = null;
+  
+  if (vehicleRentalInfo && navigationState?.startDate && navigationState?.endDate && navigationState?.startTime && navigationState?.endTime) {
+    const startDateTime = new Date(navigationState.startDate);
+    const endDateTime = new Date(navigationState.endDate);
+    const startHour = parseInt(navigationState.startTime.split(':')[0]);
+    const startMinute = parseInt(navigationState.startTime.split(':')[1]);
+    const endHour = parseInt(navigationState.endTime.split(':')[0]);
+    const endMinute = parseInt(navigationState.endTime.split(':')[1]);
+    
+    startDateTime.setHours(startHour, startMinute, 0, 0);
+    endDateTime.setHours(endHour, endMinute, 0, 0);
+    
+    const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
+    
+    if (rentalHours < 24) {
+      // Si moins de 24h, on considère comme 1 jour
+      days = 1;
+      hours = 0;
+    } else {
+      days = Math.floor(rentalHours / 24);
+      hours = Math.floor(rentalHours % 24);
+    }
+    
+    // Utiliser formatDuration pour la durée localisée (exactement comme BookingConfirmationModal)
+    durationText = formatDuration(t, days, hours);
+  } else if (vehicleRentalInfo) {
+    // Fallback : utiliser les valeurs de vehicleRentalInfo si disponibles
+    days = vehicleRentalInfo.days;
+    hours = vehicleRentalInfo.hours;
+    durationText = formatDuration(t, days, hours);
+  }

   // ... existing code ...

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
+                      {formatCurrency(vehicleRentalInfo.pricePerDay, currencyLocale)}/{t("par_jour")} × {durationText || ""}
                     </span>
                   </div>
                   <div className="text-xs text-muted-foreground">
-                    {dailyRate}€/{t("common.par_jour")} • {t("booking.excludingFeesNote")}
+                    {formatCurrency(dailyRate, currencyLocale)}/{t("par_jour")} • {t("booking.excludingFeesNote")}
                   </div>
```

## Validation

### Checklist de validation visuelle

#### Card HOME (moto-vehicle-card.tsx)

- [ ] **FR** : Affiche `"51,00 €/par jour × 4 jours + 6 heures"` (plus de `"soit 51,00 € (duration...")`)
- [ ] **EN** : Affiche `"€51.00/per day × 4 days + 6 hours"`
- [ ] **IT** : Affiche `"€51,00/al giorno × 4 giorni + 6 ore"`
- [ ] **DE** : Affiche `"51,00 €/pro Tag × 4 Tage + 6 Stunden"`
- [ ] **Vérification** : Plus aucune clé brute `duration.*` visible

#### Bloc "Réserver" page détails moto (MotoVehicleDetails.tsx)

- [ ] **FR** : Affiche `"51,00 €*"` avec `"51,00 €/par jour × 4 jours + 6 heures"` en dessous
- [ ] **EN** : Affiche `"$51.00*"` avec `"$51.00/per day × 4 days + 6 hours"` en dessous
- [ ] **IT** : Affiche `"€51,00*"` avec `"€51,00/al giorno × 4 giorni + 6 ore"` en dessous
- [ ] **DE** : Affiche `"51,00 €*"` avec `"51,00 €/pro Tag × 4 Tage + 6 Stunden"` en dessous
- [ ] **Vérification** : Plus aucune clé brute `duration.*` visible
- [ ] **Vérification** : Plus de `undefined` ou `(duration...)` visible

### Tests de cas limites

- [ ] **1 jour, 0 heure** : Affiche `"1 jour"` (pas `"1 jour + 0 heures"`)
- [ ] **0 jour, 6 heures** : Affiche `"6 heures"` (pas `"0 jours + 6 heures"`)
- [ ] **1 jour, 1 heure** : Affiche `"1 jour + 1 heure"` (singulier correct)
- [ ] **4 jours, 6 heures** : Affiche `"4 jours + 6 heures"` (pluriel correct)

## Preuve console

Pour vérifier qu'aucune chaîne `duration.*` n'apparaît, ouvrir la console du navigateur et rechercher :

```javascript
// Dans la console
document.body.innerText.includes('duration.')
// Doit retourner false

// Ou vérifier visuellement dans le DOM
Array.from(document.querySelectorAll('*')).some(el => 
  el.textContent && el.textContent.includes('duration.')
)
// Doit retourner false
```

## Résumé

- ✅ **2 fichiers modifiés** : `moto-vehicle-card.tsx` et `MotoVehicleDetails.tsx`
- ✅ **Logique identique** à `BookingConfirmationModal` : même calcul de `days`/`hours`, même `formatDuration()`, même format d'affichage
- ✅ **Clés i18n** : Utilisation de `t("par_jour")` comme dans `BookingConfirmationModal` (avec `useTranslation("common")`, i18next résout automatiquement)
- ✅ **Plus de clés brutes** : `formatDuration()` utilise `duration.day_one`/`duration.day_other` et `duration.hour_one`/`duration.hour_other` correctement

