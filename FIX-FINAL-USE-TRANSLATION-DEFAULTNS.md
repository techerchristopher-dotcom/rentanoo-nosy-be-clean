# Fix final : useTranslation() defaultNS + formatDuration direct

## Fichiers modifiés (2 fichiers)

### 1. `src/components/vehicles/moto-vehicle-card.tsx`

**Changements** :
- Ligne 52 : `useTranslation("common")` → `useTranslation()` (defaultNS runtime)
- Ligne 208 : `t("common.par_jour")` → `t("par_jour")` (même clé que BookingConfirmationModal)
- Ligne 212 : Format direct `formatCurrency(rentalInfo.pricePerDay)}/{t("par_jour")} × {durationLabel || ""}`

**Avant** :
```typescript
const { t } = useTranslation("common");
// ...
{t("common.par_jour")}
{t("pricing.total_for_duration", {
  total: formatCurrency(rentalInfo.totalCost),
  duration: durationLabel,
})}
```

**Après** :
```typescript
const { t } = useTranslation();
// ...
{t("par_jour")}
{formatCurrency(rentalInfo.pricePerDay)}/{t("par_jour")} × {durationLabel || ""}
```

### 2. `src/pages/vehicles/MotoVehicleDetails.tsx`

**Changements** :
- Ligne 110 : `useTranslation("common")` → `useTranslation()` (defaultNS runtime)
- Lignes 112-118 : Ajout de `currencyLocale` (comme BookingConfirmationModal)
- Lignes 338-341 : Simplification - utilisation directe de `formatDuration(t, vehicleRentalInfo.days, vehicleRentalInfo.hours)` sans recalcul
- Ligne 1279 : Format direct `formatCurrency(vehicleRentalInfo.pricePerDay, currencyLocale)}/{t("par_jour")} × {durationText || ""}`
- Ligne 1283 : `t("par_jour")` au lieu de `t("common.par_jour")`

**Avant** :
```typescript
const { t, i18n } = useTranslation("common");
// Calcul complexe de days/hours à partir de startDate/endDate...
const durationText = formatDuration(t, days, hours);
// ...
{vehicleRentalInfo.formattedPrice.match(/\((.*?)\)/)?.[1]}
```

**Après** :
```typescript
const { t, i18n } = useTranslation();
// Locale pour formatCurrency (comme dans BookingConfirmationModal)
const currentLang = i18n.language || "fr";
const currencyLocale = 
  currentLang.startsWith("fr") ? "fr-FR" :
  currentLang.startsWith("it") ? "it-IT" :
  currentLang.startsWith("de") ? "de-DE" :
  "en-US";
// ...
// Utiliser formatDuration directement avec les valeurs de vehicleRentalInfo
const durationText = vehicleRentalInfo 
  ? formatDuration(t, vehicleRentalInfo.days, vehicleRentalInfo.hours)
  : null;
// ...
{formatCurrency(vehicleRentalInfo.pricePerDay, currencyLocale)}/{t("par_jour")} × {durationText || ""}
```

## Validation obligatoire

### Screenshots requis

#### 1. Card HOME (moto-vehicle-card.tsx)

**FR** :
- [ ] Screenshot montrant : `"51,00 €/par jour × 4 jours + 6 heures"`
- [ ] Vérifier : **ZÉRO** occurrence de `duration.` ou `common.` dans l'UI visible

**EN** :
- [ ] Screenshot montrant : `"€51.00/per day × 4 days + 6 hours"`
- [ ] Vérifier : **ZÉRO** occurrence de `duration.` ou `common.` dans l'UI visible

#### 2. Bloc "Réserver" page détails moto (MotoVehicleDetails.tsx)

**FR** :
- [ ] Screenshot montrant : `"51,00 €*"` avec `"51,00 €/par jour × 4 jours + 6 heures"` en dessous
- [ ] Vérifier : **ZÉRO** occurrence de `duration.` ou `common.` dans l'UI visible

**EN** :
- [ ] Screenshot montrant : `"$51.00*"` avec `"$51.00/per day × 4 days + 6 hours"` en dessous
- [ ] Vérifier : **ZÉRO** occurrence de `duration.` ou `common.` dans l'UI visible

### Vérification console

```javascript
// Dans la console du navigateur
// Vérifier qu'aucune clé brute n'apparaît
document.body.innerText.includes('duration.')
// Doit retourner false

document.body.innerText.includes('common.')
// Doit retourner false (sauf dans les clés i18n normales comme "common.not_specified")
```

## Résumé des changements

✅ **2 fichiers modifiés** : `moto-vehicle-card.tsx` et `MotoVehicleDetails.tsx`
✅ **useTranslation()** : Utilisation de `useTranslation()` au lieu de `useTranslation("common")` pour dépendre du defaultNS runtime
✅ **Clé i18n** : Utilisation de `t("par_jour")` exactement comme dans `BookingConfirmationModal`
✅ **FormatDuration** : Utilisation directe de `formatDuration(t, rentalInfo.days, rentalInfo.hours)` sans recalcul
✅ **Format** : `pricePerDay + "/{par_jour}" + " × " + durationLabel` (exactement comme BookingConfirmationModal)
✅ **Aucun changement** : Pas de modification de `src/i18n/config.ts` ou des fichiers JSON

## Diff technique

- **Namespace** : Plus de dépendance à `common.*` ou `restructureResources`
- **Calcul** : Plus de recalcul de `days`/`hours` - utilisation directe des valeurs de `vehicleRentalInfo`
- **Cohérence** : Format identique à `BookingConfirmationModal` ligne 306

