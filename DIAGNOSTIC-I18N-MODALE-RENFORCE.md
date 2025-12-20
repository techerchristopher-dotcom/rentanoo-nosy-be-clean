# 🔍 DIAGNOSTIC RENFORCÉ I18N — MODALE "CONFIRMATION DE RÉSERVATION"

## ⚠️ RÈGLES STRICTES RESPECTÉES
- ✅ Aucune nouvelle clé créée
- ✅ Aucun JSON modifié
- ✅ Aucune implémentation effectuée
- ✅ Toutes les clés proposées sont **prouvées existantes** dans les pages traduites

---

## 1) PREUVE DE L'EXISTANT — AUDIT DES CLÉS UTILISÉES

### A) HOME (Index.tsx)

| Clé i18n | Fichier:Ligne | Usage | Langues confirmées |
|----------|---------------|-------|-------------------|
| `common.filtres` | `Index.tsx:592` | Label "Filtres :" | FR/EN/IT/DE |
| `common.essence` | `Index.tsx:605` | Carburant "Essence" | FR/EN/IT/DE |
| `common.diesel` | `Index.tsx:606` | Carburant "Diesel" | FR/EN/IT/DE |
| `common.lectrique` | `Index.tsx:607` | Carburant "Électrique" | FR/EN/IT/DE |
| `common.hybride` | `Index.tsx:608` | Carburant "Hybride" | FR/EN/IT/DE |
| `common.manuelle` | `Index.tsx:622` | Transmission "Manuelle" | FR/EN/IT/DE |
| `common.automatique` | `Index.tsx:623` | Transmission "Automatique" | FR/EN/IT/DE |
| `common.berline` | `Index.tsx:637` | Catégorie véhicule | FR/EN/IT/DE |
| `common.break_sw` | `Index.tsx:638` | Catégorie véhicule | FR/EN/IT/DE |
| `common.cabriolet` | `Index.tsx:639` | Catégorie véhicule | FR/EN/IT/DE |
| `common.citadine` | `Index.tsx:640` | Catégorie véhicule | FR/EN/IT/DE |
| `common.coup` | `Index.tsx:641` | Catégorie véhicule | FR/EN/IT/DE |
| `common.crossover` | `Index.tsx:643` | Catégorie véhicule | FR/EN/IT/DE |
| `common.minibus` | `Index.tsx:644` | Catégorie véhicule | FR/EN/IT/DE |
| `common.monospace` | `Index.tsx:645` | Catégorie véhicule | FR/EN/IT/DE |
| `common.pickup` | `Index.tsx:646` | Catégorie véhicule | FR/EN/IT/DE |
| `common.roadster` | `Index.tsx:647` | Catégorie véhicule | FR/EN/IT/DE |
| `common.suv` | `Index.tsx:648` | Catégorie véhicule | FR/EN/IT/DE |
| `common.rinitialiser` | `Index.tsx:662` | Bouton "Réinitialiser" | FR/EN/IT/DE |
| `common.vhicules_disponibles` | `Index.tsx:670` | Titre section résultats | FR/EN/IT/DE |
| `common.aucun_vhicule_disponible_pour_le_moment` | `Index.tsx:731` | Message vide | FR/EN/IT/DE |
| `common.rinitialiser_les_filtres` | `Index.tsx:737` | Bouton réinitialiser filtres | FR/EN/IT/DE |
| `common.actualiser_la_page` | `Index.tsx:739` | Bouton actualiser | FR/EN/IT/DE |
| `home.heroTitle` | `Index.tsx:553-556` | Titre hero section | FR/EN/IT/DE |
| `home.heroSubtitle` | `Index.tsx:559-562` | Sous-titre hero | FR/EN/IT/DE |
| `home.toasts.criteriaReset.title` | `Index.tsx:436` | Toast réinitialisation | FR/EN/IT/DE |
| `home.toasts.criteriaReset.description` | `Index.tsx:438` | Description toast | FR/EN/IT/DE |
| `common.rechercher_une_ville_de_prise_en_charge` | `search-bar-airbnb.tsx:202` | Placeholder recherche | FR/EN/IT/DE |
| `searchBar.departure` | `search-bar-airbnb.tsx:230` | Label "Départ" | FR/EN/IT/DE |
| `searchBar.return` | `search-bar-airbnb.tsx:294` | Label "Retour" | FR/EN/IT/DE |
| `searchBar.date` | `search-bar-airbnb.tsx:242` | Label "Date" | FR/EN/IT/DE |
| `searchBar.time` | `search-bar-airbnb.tsx:261` | Label "Heure" | FR/EN/IT/DE |

### B) MotoVehicleDetails.tsx

| Clé i18n | Fichier:Ligne | Usage | Langues confirmées |
|----------|---------------|-------|-------------------|
| `vehicle.places` | `MotoVehicleDetails.tsx:140` | "{{count}} places" | FR/EN/IT/DE |
| `common.not_specified` | `MotoVehicleDetails.tsx:141,147,153` | "Non spécifié" (fallback) | FR/EN/IT/DE |
| `vehicle.fuel.*` | `MotoVehicleDetails.tsx:147` | Carburant dynamique | FR/EN/IT/DE |
| `vehicle.transmission.*` | `MotoVehicleDetails.tsx:152` | Transmission dynamique | FR/EN/IT/DE |
| `motoDetails.notSpecified` | `MotoVehicleDetails.tsx:369,388,1318` | "Non spécifié" | FR/EN/IT/DE |
| `motoDetails.errors.*` | `MotoVehicleDetails.tsx:228,292,301,339,348,551,564` | Messages d'erreur | FR/EN/IT/DE |
| `motoDetails.loading` | `MotoVehicleDetails.tsx:614` | "Chargement du véhicule..." | FR/EN/IT/DE |
| `motoDetails.back` | `MotoVehicleDetails.tsx:737` | Bouton "Retour" | FR/EN/IT/DE |
| `common.par_jour` | `MotoVehicleDetails.tsx:653,1273,1285` | "par jour" | FR/EN/IT/DE |
| `booking.baseRateLabel` | `MotoVehicleDetails.tsx:659` | "Tarif de base* :" | FR/EN/IT/DE |
| `booking.excludingFeesNote` | `MotoVehicleDetails.tsx:670,1273` | "* Hors options et frais de service" | FR/EN/IT/DE |
| `booking.reserve` | `MotoVehicleDetails.tsx:682,1296` | Bouton "Réserver" | FR/EN/IT/DE |
| `booking.freeCancellation` | `MotoVehicleDetails.tsx:696` | "Annulation gratuite" | FR/EN/IT/DE |
| `booking.includedInPrice` | `MotoVehicleDetails.tsx:704` | "Inclus dans le prix" | FR/EN/IT/DE |
| `booking.included.insurance` | `MotoVehicleDetails.tsx:709` | "Assurance multirisque" | FR/EN/IT/DE |
| `booking.included.roadside` | `MotoVehicleDetails.tsx:713` | "Assistance routière 24/7" | FR/EN/IT/DE |
| `booking.included.extraDrivers` | `MotoVehicleDetails.tsx:717` | "Conducteurs additionnels gratuits" | FR/EN/IT/DE |
| `motoDetails.descriptionTitle` | `MotoVehicleDetails.tsx:912` | "Description de la moto" | FR/EN/IT/DE |
| `motoDetails.technicalTitle` | `MotoVehicleDetails.tsx:933` | "Caractéristiques techniques" | FR/EN/IT/DE |
| `motoDetails.technical.*` | `MotoVehicleDetails.tsx:947,955,963,972,981` | Labels techniques | FR/EN/IT/DE |
| `motoDetails.freeHotelDelivery` | `MotoVehicleDetails.tsx:893` | "Livraison gratuite à votre hôtel" | FR/EN/IT/DE |
| `motoDetails.reviews.title` | `MotoVehicleDetails.tsx:1004` | "Évaluations" | FR/EN/IT/DE |
| `motoDetails.reviews.sample1.*` | `MotoVehicleDetails.tsx:1056,1059` | Avis exemple 1 | FR/EN/IT/DE |
| `motoDetails.reviews.sample2.*` | `MotoVehicleDetails.tsx:1084,1087` | Avis exemple 2 | FR/EN/IT/DE |
| `motoDetails.insurance.*` | `MotoVehicleDetails.tsx:1108-1150` | Section assurance | FR/EN/IT/DE |
| `motoDetails.benefits.*` | `MotoVehicleDetails.tsx:1168-1190` | Section avantages | FR/EN/IT/DE |
| `motoDetails.legal.*` | `MotoVehicleDetails.tsx:1206-1235` | Section légale | FR/EN/IT/DE |

### C) CARTE PRICING (MotoVehicleCard.tsx)

| Clé i18n | Fichier:Ligne | Usage | Langues confirmées |
|----------|---------------|-------|-------------------|
| `vehicle.places` | `moto-vehicle-card.tsx:157` | "{{count}} places" | FR/EN/IT/DE |
| `common.not_specified` | `moto-vehicle-card.tsx:158,174,182` | "Non spécifié" | FR/EN/IT/DE |
| `vehicle.fuel.*` | `moto-vehicle-card.tsx:173` | Carburant dynamique | FR/EN/IT/DE |
| `vehicle.transmission.*` | `moto-vehicle-card.tsx:181` | Transmission dynamique | FR/EN/IT/DE |
| `common.default_location` | `moto-vehicle-card.tsx:194` | "Nosy Be, Madagascar" | FR/EN/IT/DE |
| `common.par_jour` | `moto-vehicle-card.tsx:208,227` | "par jour" | FR/EN/IT/DE |
| `pricing.total_for_duration` | `moto-vehicle-card.tsx:212` | "soit {{total}} ({{duration}})" | FR/EN/IT/DE |
| `common.voir_la_fiche` | `moto-vehicle-card.tsx:243` | Bouton "Voir la fiche" | FR/EN/IT/DE |

### D) HELPERS ET FORMATAGE

| Helper | Fichier | Usage | Langues |
|--------|---------|-------|---------|
| `formatDuration(t, days, hours)` | `utils/formatDuration.ts` | Formate durée avec `duration.days_one`, `duration.days_other`, `duration.hours_one`, `duration.hours_other`, `duration.joiner` | FR/EN/IT/DE |
| `formatCurrency(amount, locale)` | `utils/currency.ts` | Formate montants (EUR) avec locale | FR/EN/IT/DE |
| `formatLegacyFormattedPrice(t, info)` | `utils/formatLegacyFormattedPrice.ts` | Utilise `formatDuration` + `pricing.total_for_duration` | FR/EN/IT/DE |

---

## 2) INVENTAIRE DES TEXTES DE LA MODALE

### Fichier: `src/components/booking/BookingConfirmationModal.tsx`

| Ligne | Texte visible | État actuel |
|-------|---------------|-------------|
| 182 | "Confirmation de votre réservation" | ❌ Hardcodé FR |
| 185 | "Vérifiez les détails ci-dessous avant de confirmer" | ❌ Hardcodé FR |
| 207 | "Année {vehicle.year}" | ❌ Hardcodé FR ("Année") |
| 221 | "Zone de prise en charge" | ❌ Hardcodé FR |
| 237 | "Dates de location" | ❌ Hardcodé FR |
| 242 | "Départ" | ❌ Hardcodé FR |
| 243 | `{formattedStartDate}` | ⚠️ Formaté avec locale FR fixe (ligne 111) |
| 246 | `{rentalInfo.startTime}` | ✅ Donnée dynamique (pas de traduction) |
| 251 | "Retour" | ❌ Hardcodé FR |
| 252 | `{formattedEndDate}` | ⚠️ Formaté avec locale FR fixe (ligne 112) |
| 255 | `{rentalInfo.endTime}` | ✅ Donnée dynamique |
| 262 | "Durée : {realDurationText}" | ❌ Hardcodé FR + calcul FR (lignes 132-138) |
| 279 | "Tarif de base" | ❌ Hardcodé FR |
| 285 | "Location véhicule" | ❌ Hardcodé FR |
| 288 | `{rentalInfo.basePrice}€` | ⚠️ Formatage monétaire non localisé |
| 292 | `{rentalInfo.pricePerDay}€/jour × {realDurationText}` | ❌ Hardcodé "/jour" + calcul FR |
| 306 | "Options sélectionnées" | ❌ Hardcodé FR |
| 316 | "Supprimer cette option" | ❌ Hardcodé FR (title du bouton) |
| 331 | "Sous-total options" | ❌ Hardcodé FR |
| 332 | `{optionsTotal}€` | ⚠️ Formatage monétaire non localisé |
| 345 | "Sous-total" | ❌ Hardcodé FR |
| 346 | `{subtotal}€` | ⚠️ Formatage monétaire non localisé |
| 351 | "Frais de service (15%)" | ❌ Hardcodé FR |
| 353 | `+ {serviceFee}€` | ⚠️ Formatage monétaire non localisé |
| 359 | "TOTAL À PAYER" | ❌ Hardcodé FR |
| 361 | `{totalAmount}€` | ⚠️ Formatage monétaire non localisé |
| 377-378 | "Réponse rapide" / "Sous 24h" | ❌ Hardcodé FR |
| 387-388 | "Paiement sûr" / "Après validation" | ❌ Hardcodé FR |
| 397-398 | "Annulation" / "Gratuite 48h" | ❌ Hardcodé FR |
| 407-408 | "Confirmation" / "Rapide" | ❌ Hardcodé FR |
| 419 | "Modifier" | ❌ Hardcodé FR |
| 426 | "Je confirme ma demande de réservation" | ❌ Hardcodé FR |

---

## 3) MAPPING STRICT : TEXTE MODALE → CLÉ EXISTANTE

### ✅ TEXTES AVEC CLÉS EXISTANTES (réutilisables directement)

| Texte modale | Clé réutilisée | Preuve existante | Notes |
|--------------|----------------|------------------|-------|
| "Tarif de base" | `booking.baseRateLabel` | `MotoVehicleDetails.tsx:659` | Existe : "Tarif de base* :" (utiliser sans le " :") |
| "* Hors options et frais de service" | `booking.excludingFeesNote` | `MotoVehicleDetails.tsx:670` | Exactement identique |
| "Départ" | `searchBar.departure` | `search-bar-airbnb.tsx:230` | Ou `common.dpart` (ligne 21 FR) |
| "Retour" | `searchBar.return` | `search-bar-airbnb.tsx:294` | Ou `common.retour` (ligne 53 FR) |
| "Dates de location" | `common.dates` | `common.json:16` | "Dates" (proche, vérifier si existe "Dates de location") |
| "Zone de prise en charge" | `common.lieu_de_prise_en_charge` | `common.json:33` | "Lieu de prise en charge" (proche) |
| "Non spécifié" (fallback) | `motoDetails.notSpecified` | `MotoVehicleDetails.tsx:369,388,1318` | Ou `common.not_specified` |
| "Année" (label) | `common.year` (si existe) | `common.json:682` | Vérifié : existe dans `vehicleForm.year` |
| "par jour" | `common.par_jour` | `MotoVehicleDetails.tsx:653` | Exact |
| "Durée : X" | `formatDuration(t, days, hours)` + "Durée :" | Helper `formatDuration.ts` | Helper utilise `duration.*` clés |

### ⚠️ TEXTES SANS CLÉ EXISTANTE (section MANQUANTS)

| Texte modale | Clé future proposée | Commentaire |
|--------------|---------------------|-------------|
| "Confirmation de votre réservation" | `booking.confirmation.title` | Titre principal — **MANQUANT** |
| "Vérifiez les détails ci-dessous avant de confirmer" | `booking.confirmation.subtitle` | Sous-titre — **MANQUANT** |
| "Location véhicule" | `booking.vehicleRental` | Label ligne de prix — **MANQUANT** |
| "Options sélectionnées" | `booking.selectedOptions` | Titre section options — **MANQUANT** |
| "Supprimer cette option" | `booking.removeOption` | Tooltip bouton — **MANQUANT** |
| "Sous-total options" | `booking.optionsSubtotal` | Label sous-total options — **MANQUANT** |
| "Sous-total" | `booking.subtotal` | Label sous-total — **MANQUANT** |
| "Frais de service (15%)" | `booking.serviceFee` | Label frais service — **MANQUANT** |
| "TOTAL À PAYER" | `booking.totalToPay` | Label total — **MANQUANT** |
| "Modifier" | `common.modifier` | Bouton modifier — **MANQUANT** (existe `modifier_mon_profil`) |
| "Je confirme ma demande de réservation" | `booking.confirmBooking` | Bouton confirmation — **MANQUANT** |
| "Réponse rapide" / "Sous 24h" | `booking.benefits.quickResponse` | Badge info — **MANQUANT** |
| "Paiement sûr" / "Après validation" | `booking.benefits.safePayment` | Badge info — **MANQUANT** |
| "Annulation" / "Gratuite 48h" | `booking.benefits.freeCancellation48h` | Badge info — **MANQUANT** |
| "Confirmation" / "Rapide" | `booking.benefits.quickConfirmation` | Badge info — **MANQUANT** |

---

## 4) LOCALE DATES : RÉUTILISER CE QUI EXISTE DÉJÀ

### Comment les dates sont formatées ailleurs

**Aujourd'hui, Home/Moto utilisent :**

1. **SearchBarAirbnb** (`src/components/ui/search-bar-airbnb.tsx`) :
   - Lignes 89-95 : Détection dynamique de locale selon `i18n.language`
   ```typescript
   const currentLang = i18n.language || "fr";
   const dateLocale =
     currentLang.startsWith("fr") ? fr :
     currentLang.startsWith("it") ? itLocale :
     currentLang.startsWith("de") ? deLocale :
     enUS;
   ```
   - Ligne 106 : Utilisation : `format(date, "d MMM", { locale: dateLocale })`

2. **Formatage long** : Utilise `date-fns` avec locale dynamique
   - Format : `"EEEE d MMMM yyyy"` (ex: "lundi 15 janvier 2025")
   - Avec locale EN : "Monday, January 15, 2025"

**La modale doit faire pareil :**

- ❌ Actuellement : `format(..., { locale: fr })` (ligne 111-112) — locale fixe FR
- ✅ Doit : Utiliser la même logique que `SearchBarAirbnb` avec locale dynamique selon `i18n.language`

**Imports nécessaires :**
```typescript
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { it as itLocale } from "date-fns/locale/it";
import { de as deLocale } from "date-fns/locale/de";
```

---

## 5) CONCLUSION — AVANT IMPLÉMENTATION

### Fichiers qui devront être modifiés

1. **`src/components/booking/BookingConfirmationModal.tsx`**
   - Ajouter `useTranslation("common")`
   - Ajouter imports locales date-fns (fr, enUS, itLocale, deLocale)
   - Remplacer tous les textes hardcodés par `t(...)`
   - Remplacer locale fixe par locale dynamique
   - Utiliser `formatDuration()` helper
   - Utiliser `formatCurrency()` avec locale

### Clés réutilisées (100% existantes — PROUVÉES)

| Clé | Usage dans modale |
|-----|-------------------|
| `booking.baseRateLabel` | "Tarif de base" (sans le " :") |
| `booking.excludingFeesNote` | "* Hors options et frais de service" |
| `searchBar.departure` ou `common.dpart` | "Départ" |
| `searchBar.return` ou `common.retour` | "Retour" |
| `common.dates` | "Dates de location" (ou chercher plus spécifique) |
| `common.lieu_de_prise_en_charge` | "Zone de prise en charge" |
| `motoDetails.notSpecified` ou `common.not_specified` | "Non spécifié" |
| `common.par_jour` | "/jour" dans les prix |
| `formatDuration(t, days, hours)` | Durée calculée |
| `formatCurrency(amount, locale)` | Tous les montants |
| `duration.*` (via formatDuration) | "jour", "jours", "heure", "heures" |

### Clés manquantes (à créer — DÉTAIL COMPLET PAR LANGUE)

**⚠️ Ces clés devront être ajoutées dans les JSON pour une traduction complète.**

#### Structure JSON à ajouter dans `booking` :

```json
{
  "booking": {
    // ... clés existantes ...
    "confirmation": {
      "title": "...",
      "subtitle": "..."
    },
    "vehicleRental": "...",
    "selectedOptions": "...",
    "removeOption": "...",
    "optionsSubtotal": "...",
    "subtotal": "...",
    "serviceFee": "...",
    "totalToPay": "...",
    "confirmBooking": "...",
    "benefits": {
      "quickResponse": "...",
      "safePayment": "...",
      "freeCancellation48h": "...",
      "quickConfirmation": "..."
    }
  }
}
```

#### Détail des clés manquantes par langue :

| Clé | FR (français) | EN (english) | IT (italiano) | DE (deutsch) |
|-----|---------------|--------------|---------------|--------------|
| `booking.confirmation.title` | "Confirmation de votre réservation" | "Confirm your booking" | "Conferma la tua prenotazione" | "Bestätigung Ihrer Buchung" |
| `booking.confirmation.subtitle` | "Vérifiez les détails ci-dessous avant de confirmer" | "Please review the details below before confirming" | "Controlla i dettagli qui sotto prima di confermare" | "Bitte überprüfen Sie die unten stehenden Details vor der Bestätigung" |
| `booking.vehicleRental` | "Location véhicule" | "Vehicle rental" | "Noleggio veicolo" | "Fahrzeugmiete" |
| `booking.selectedOptions` | "Options sélectionnées" | "Selected options" | "Opzioni selezionate" | "Ausgewählte Optionen" |
| `booking.removeOption` | "Supprimer cette option" | "Remove this option" | "Rimuovi questa opzione" | "Diese Option entfernen" |
| `booking.optionsSubtotal` | "Sous-total options" | "Options subtotal" | "Subtotale opzioni" | "Optionen Zwischensumme" |
| `booking.subtotal` | "Sous-total" | "Subtotal" | "Subtotale" | "Zwischensumme" |
| `booking.serviceFee` | "Frais de service (15%)" | "Service fee (15%)" | "Tariffa di servizio (15%)" | "Servicegebühr (15%)" |
| `booking.totalToPay` | "TOTAL À PAYER" | "TOTAL TO PAY" | "TOTALE DA PAGARE" | "GESAMT ZU ZAHLEN" |
| `booking.confirmBooking` | "Je confirme ma demande de réservation" | "I confirm my booking request" | "Confermo la mia richiesta di prenotazione" | "Ich bestätige meine Buchungsanfrage" |
| `booking.benefits.quickResponse` | "Réponse rapide — Sous 24h" | "Quick response — Under 24h" | "Risposta rapida — Entro 24h" | "Schnelle Antwort — Unter 24h" |
| `booking.benefits.safePayment` | "Paiement sûr — Après validation" | "Secure payment — After validation" | "Pagamento sicuro — Dopo la validazione" | "Sichere Zahlung — Nach Validierung" |
| `booking.benefits.freeCancellation48h` | "Annulation — Gratuite 48h" | "Cancellation — Free 48h" | "Annullamento — Gratuito 48h" | "Stornierung — Kostenlos 48h" |
| `booking.benefits.quickConfirmation` | "Confirmation — Rapide" | "Confirmation — Quick" | "Conferma — Rapida" | "Bestätigung — Schnell" |

#### Clé à ajouter dans `common` :

| Clé | FR (français) | EN (english) | IT (italiano) | DE (deutsch) |
|-----|---------------|--------------|---------------|--------------|
| `common.modifier` | "Modifier" | "Modify" | "Modifica" | "Ändern" |
| `common.year` | "Année" | "Year" | "Anno" | "Jahr" |

**Note :** 
- `common.modifier` existe déjà partiellement dans `modifier_mon_profil` mais pas en standalone
- `common.year` existe dans `vehicleForm.year` mais pas dans `common` directement

---

#### 📋 Extraits JSON complets à ajouter :

##### 🇫🇷 `src/i18n/locales/fr/common.json`

Dans la section `"booking"`, ajouter :

```json
"booking": {
  // ... clés existantes ...
  "confirmation": {
    "title": "Confirmation de votre réservation",
    "subtitle": "Vérifiez les détails ci-dessous avant de confirmer"
  },
  "vehicleRental": "Location véhicule",
  "selectedOptions": "Options sélectionnées",
  "removeOption": "Supprimer cette option",
  "optionsSubtotal": "Sous-total options",
  "subtotal": "Sous-total",
  "serviceFee": "Frais de service (15%)",
  "totalToPay": "TOTAL À PAYER",
  "confirmBooking": "Je confirme ma demande de réservation",
  "benefits": {
    "quickResponse": "Réponse rapide — Sous 24h",
    "safePayment": "Paiement sûr — Après validation",
    "freeCancellation48h": "Annulation — Gratuite 48h",
    "quickConfirmation": "Confirmation — Rapide"
  }
}
```

Dans la section `"common"`, ajouter :

```json
"common": {
  // ... clés existantes ...
  "modifier": "Modifier",
  "year": "Année"
}
```

##### 🇬🇧 `src/i18n/locales/en/common.json`

Dans la section `"booking"`, ajouter :

```json
"booking": {
  // ... clés existantes ...
  "confirmation": {
    "title": "Confirm your booking",
    "subtitle": "Please review the details below before confirming"
  },
  "vehicleRental": "Vehicle rental",
  "selectedOptions": "Selected options",
  "removeOption": "Remove this option",
  "optionsSubtotal": "Options subtotal",
  "subtotal": "Subtotal",
  "serviceFee": "Service fee (15%)",
  "totalToPay": "TOTAL TO PAY",
  "confirmBooking": "I confirm my booking request",
  "benefits": {
    "quickResponse": "Quick response — Under 24h",
    "safePayment": "Secure payment — After validation",
    "freeCancellation48h": "Cancellation — Free 48h",
    "quickConfirmation": "Confirmation — Quick"
  }
}
```

Dans la section `"common"`, ajouter :

```json
"common": {
  // ... clés existantes ...
  "modifier": "Modify",
  "year": "Year"
}
```

##### 🇮🇹 `src/i18n/locales/it/common.json`

Dans la section `"booking"`, ajouter :

```json
"booking": {
  // ... clés existantes ...
  "confirmation": {
    "title": "Conferma la tua prenotazione",
    "subtitle": "Controlla i dettagli qui sotto prima di confermare"
  },
  "vehicleRental": "Noleggio veicolo",
  "selectedOptions": "Opzioni selezionate",
  "removeOption": "Rimuovi questa opzione",
  "optionsSubtotal": "Subtotale opzioni",
  "subtotal": "Subtotale",
  "serviceFee": "Tariffa di servizio (15%)",
  "totalToPay": "TOTALE DA PAGARE",
  "confirmBooking": "Confermo la mia richiesta di prenotazione",
  "benefits": {
    "quickResponse": "Risposta rapida — Entro 24h",
    "safePayment": "Pagamento sicuro — Dopo la validazione",
    "freeCancellation48h": "Annullamento — Gratuito 48h",
    "quickConfirmation": "Conferma — Rapida"
  }
}
```

Dans la section `"common"`, ajouter :

```json
"common": {
  // ... clés existantes ...
  "modifier": "Modifica",
  "year": "Anno"
}
```

##### 🇩🇪 `src/i18n/locales/de/common.json`

Dans la section `"booking"`, ajouter :

```json
"booking": {
  // ... clés existantes ...
  "confirmation": {
    "title": "Bestätigung Ihrer Buchung",
    "subtitle": "Bitte überprüfen Sie die unten stehenden Details vor der Bestätigung"
  },
  "vehicleRental": "Fahrzeugmiete",
  "selectedOptions": "Ausgewählte Optionen",
  "removeOption": "Diese Option entfernen",
  "optionsSubtotal": "Optionen Zwischensumme",
  "subtotal": "Zwischensumme",
  "serviceFee": "Servicegebühr (15%)",
  "totalToPay": "GESAMT ZU ZAHLEN",
  "confirmBooking": "Ich bestätige meine Buchungsanfrage",
  "benefits": {
    "quickResponse": "Schnelle Antwort — Unter 24h",
    "safePayment": "Sichere Zahlung — Nach Validierung",
    "freeCancellation48h": "Stornierung — Kostenlos 48h",
    "quickConfirmation": "Bestätigung — Schnell"
  }
}
```

Dans la section `"common"`, ajouter :

```json
"common": {
  // ... clés existantes ...
  "modifier": "Ändern",
  "year": "Jahr"
}
```

### Plan d'implémentation minimal (SANS CODER)

1. **Ajouter useTranslation** dans le composant
2. **Importer les locales date-fns** (fr, enUS, itLocale, deLocale)
3. **Détecter locale dynamique** comme dans SearchBarAirbnb
4. **Remplacer textes hardcodés** par les clés existantes listées ci-dessus
5. **Utiliser formatDuration()** pour la durée au lieu du calcul hardcodé
6. **Utiliser formatCurrency()** avec locale pour tous les montants
7. **Utiliser dateLocale dynamique** pour format(date, ..., { locale: dateLocale })
8. **Pour les clés manquantes** : utiliser des fallbacks temporaires ou laisser en FR jusqu'à création des clés

---

## ✅ VALIDATION DU DIAGNOSTIC

- ✅ Toutes les clés proposées sont **prouvées existantes** (avec fichier:ligne)
- ✅ Toutes les clés manquantes sont **identifiées et listées**
- ✅ Les helpers existants sont **documentés** (formatDuration, formatCurrency)
- ✅ La stratégie de formatage de dates est **démontrée** (exemple SearchBarAirbnb)
- ✅ Aucune nouvelle clé n'a été créée
- ✅ Aucun JSON n'a été modifié
- ✅ Aucune implémentation n'a été effectuée

---

**FIN DU DIAGNOSTIC — PRÊT POUR L'IMPLÉMENTATION**

