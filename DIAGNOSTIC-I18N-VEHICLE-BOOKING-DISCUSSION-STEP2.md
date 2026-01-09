# Diagnostic i18n ÉTAPE 2 — Mapping + Preuves
## Page : `/vehicle/:license/booking/discussion`

**Date** : 2025-01-XX  
**Fichier principal** : `src/pages/booking/BookingDiscussion.tsx`  
**Objectif** : Mapping exhaustif des 55 items TRADUIRE_UI vers des clés i18n existantes avec preuves FR/EN/IT/DE

---

## A) PATTERN i18n EXISTANT (preuve)

### 1. Page Home (Index.tsx)

**Fichier** : `src/pages/Index.tsx`  
**Lignes** : 35-38

```typescript
const {
  t,
  i18n,
} = useTranslation('common');
```

**Usage** :
- Namespace : `'common'` (explicite)
- Appels : `t("home.toasts.criteriaReset.description", "Tous vos critères...")` (ligne 437-440)
- Pattern : `t("namespace.key", "fallback")` avec fallback optionnel

**Preuve clé utilisée** :
- FR: `src/i18n/locales/fr/common.json` → `home.toasts.criteriaReset.description` (ligne 299)
- EN: `src/i18n/locales/en/common.json` → `home.toasts.criteriaReset.description` (ligne 299)
- IT: `src/i18n/locales/it/common.json` → `home.toasts.criteriaReset.description` (ligne 139)
- DE: `src/i18n/locales/de/common.json` → `home.toasts.criteriaReset.description` (ligne 139)

---

### 2. Page MotoVehicleDetails

**Fichier** : `src/pages/vehicles/MotoVehicleDetails.tsx`  
**Lignes** : 110

```typescript
const { t, i18n } = useTranslation();
```

**Usage** :
- Namespace : **AUCUN** (défaut = `'common'`)
- Appels : `t("vehicle.places", { count: seats })` (ligne 149), `t("common.not_specified")` (ligne 150)
- Pattern : `t("key")` ou `t("namespace.key")` avec interpolation `{ count }`

**Preuve clés utilisées** :
- FR: `src/i18n/locales/fr/common.json` → `vehicle.places` (ligne 86), `motoDetails.notSpecified` (ligne 220)
- EN: `src/i18n/locales/en/common.json` → `vehicle.places` (ligne 86), `motoDetails.notSpecified` (ligne 220)
- IT: `src/i18n/locales/it/common.json` → `vehicle.places` (ligne 78), `motoDetails.notSpecified` (ligne 211)
- DE: `src/i18n/locales/de/common.json` → `vehicle.places` (ligne 78), `motoDetails.notSpecified` (ligne 211)

---

### 3. BookingConfirmationModal

**Fichier** : `src/components/booking/BookingConfirmationModal.tsx`  
**Lignes** : 52

```typescript
const { t, i18n } = useTranslation();
```

**Usage** :
- Namespace : **AUCUN** (défaut = `'common'`)
- Appels : `t("booking.confirmation.title")` (ligne 196), `t("booking.confirmation.subtitle")` (ligne 199)
- Pattern : `t("namespace.key")` avec namespace explicite dans la clé

**Preuve clés utilisées** :
- FR: `src/i18n/locales/fr/common.json` → `booking.confirmation.title` (ligne 141), `booking.confirmation.subtitle` (ligne 142)
- EN: `src/i18n/locales/en/common.json` → `booking.confirmation.title` (ligne 141), `booking.confirmation.subtitle` (ligne 142)
- IT: `src/i18n/locales/it/common.json` → `booking.confirmation.title` (ligne 774), `booking.confirmation.subtitle` (ligne 775)
- DE: `src/i18n/locales/de/common.json` → `booking.confirmation.title` (ligne 774), `booking.confirmation.subtitle` (ligne 775)

---

### Conclusion Pattern i18n

- **Namespace par défaut** : `'common'` (si `useTranslation()` sans paramètre)
- **Namespace explicite** : `useTranslation('common')` ou `t("namespace.key")`
- **Fallback** : Optionnel dans `t("key", "fallback")`
- **Interpolation** : `t("key", { variable: value })`
- **Pluriels** : `t("key_one", { count })` / `t("key_other", { count })` (ex: `duration.day_one`, `duration.day_other`)

**Namespaces disponibles** :
- `common.*` (racine)
- `booking.*`
- `motoDetails.*`
- `home.*`
- `profile.*`
- `bookings.*`
- `ownerVehicles.*`
- `footer.*`
- `nav.*`
- `dictionary.*`

---

## DÉCISION FINALE NAMESPACE

**Décision** : Les futures clés `booking.discussion.*` seront **AJOUTÉES dans `common.json`** (fichier `src/i18n/locales/{fr,en,it,de}/common.json`).

**Justification** : Le pattern existant montre que toutes les clés i18n (y compris celles avec des namespaces comme `booking.*`, `motoDetails.*`, `home.*`) sont stockées dans le fichier `common.json` unique. Le namespace `'common'` est le defaultNS utilisé par `useTranslation()` sans paramètre, et les clés sont accessibles via `t("namespace.key")` même si elles sont physiquement dans `common.json`. Exemple : `booking.confirmation.title` existe dans `common.json` (ligne 141 FR) et est accessible via `t("booking.confirmation.title")` avec `useTranslation()`.

**Structure attendue dans `common.json`** :
```json
{
  "common": { ... },
  "booking": {
    "confirmation": { ... },
    "discussion": {
      "withRenter": "...",
      "withOwner": "...",
      ...
    }
  },
  ...
}
```

---

## B) MAPPING EXHAUSTIF TRADUIRE_UI

### Légende
- **ID** : Identifiant exact depuis Étape 1
- **Texte exact** : Texte brut à traduire
- **Clé candidate** : Clé i18n proposée
- **Namespace** : Namespace attendu (`common` par défaut)
- **Confiance** : `HIGH` | `MED` | `LOW` | `UNCERTAIN`
- **Preuves** : Fichier + JSONPath/ligne pour FR/EN/IT/DE
- **Notes** : Interpolations, pluriels, contexte

---

### ÉTAT LOADING

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_LOADING_01 | "Chargement..." | `common.loading` | `common` | HIGH | FR: `common.json` ligne 34<br>EN: `common.json` ligne 34<br>IT: `common.json` ligne 34<br>DE: `common.json` ligne 34 | Clé existante exacte |

---

### ÉTAT ERREUR VÉHICULE NON TROUVÉ

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_ERROR_01 | "Véhicule non trouvé" | `motoDetails.errors.vehicleNotFound.title` | `common` | HIGH | FR: `common.json` ligne 196<br>EN: `common.json` ligne 196<br>IT: `common.json` ligne 187<br>DE: `common.json` ligne 187 | Clé existante, même contexte |
| DISC_ERROR_02 | "Retour à l'accueil" | `profile.hero.back` | `common` | UNCERTAIN | FR: `common.json` ligne 321<br>EN: `common.json` ligne 321<br>IT: `common.json` ligne 269<br>DE: `common.json` ligne 269 | **Contexte UX différent** : clé existe dans profil ("Retour à l'accueil" = retour page d'accueil depuis profil), mais ici contexte = erreur véhicule non trouvé (retour accueil depuis erreur). Risque de confusion sémantique, ne pas réutiliser sans vérification UX |

---

### EN-TÊTE PAGE

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_HEADER_01 | "Retour au véhicule" | `motoDetails.back` | `common` | HIGH | FR: `common.json` ligne 162<br>EN: `common.json` ligne 162<br>IT: `common.json` ligne 153<br>DE: `common.json` ligne 153 | Clé existante "Retour", contexte similaire |
| DISC_HEADER_02 | "Discussion avec le locataire" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique discussion, pas de clé existante |
| DISC_HEADER_03 | "Discussion avec le propriétaire" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique discussion, pas de clé existante |
| DISC_HEADER_04 | "Vous êtes le propriétaire" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique rôle, pas de clé existante |
| DISC_HEADER_05 | "Vous êtes le locataire" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique rôle, pas de clé existante |

---

### CARD HEADER — INFOS VÉHICULE

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_CARD_02 | "Localisation non spécifiée" | `motoDetails.notSpecified` | `common` | HIGH | FR: `common.json` ligne 220<br>EN: `common.json` ligne 220<br>IT: `common.json` ligne 211<br>DE: `common.json` ligne 211 | Clé existante exacte pour "Non spécifié" |
| DISC_CARD_03 | "Du {startDate} au {endDate}" | MISSING_KEY | `booking.discussion` | - | - | Wrapper avec interpolation dates, pas de clé existante |

---

### ZONE BOUTONS ACTION

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_BTN_01 | "Voir les détails de ma réservation" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique discussion, pas de clé existante |
| DISC_BTN_02 | "Payer ma location" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique paiement, pas de clé existante |

---

### MESSAGE INITIAL — BULLE CONVERSATION

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_MSG_INIT_01 | "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique locataire, pas de clé existante |
| DISC_MSG_INIT_02 | "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique propriétaire, pas de clé existante |
| DISC_MSG_INIT_05 | "Du {startDate} au {endDate}" | MISSING_KEY | `booking.discussion` | - | - | Wrapper avec interpolation dates (identique DISC_CARD_03) |
| DISC_MSG_INIT_06 | "Départ à {startTime}" | MISSING_KEY | `booking.discussion` | - | - | Wrapper avec interpolation heure, pas de clé existante |
| DISC_MSG_INIT_07 | "Non spécifié" | `motoDetails.notSpecified` | `common` | HIGH | FR: `common.json` ligne 220<br>EN: `common.json` ligne 220<br>IT: `common.json` ligne 211<br>DE: `common.json` ligne 211 | Clé existante exacte |
| DISC_MSG_INIT_08 | "Lieu : {pickupLocation}" | MISSING_KEY | `booking.discussion` | - | - | Wrapper avec interpolation lieu, pas de clé existante |
| DISC_MSG_INIT_09 | "Non spécifié" | `motoDetails.notSpecified` | `common` | HIGH | FR: `common.json` ligne 220<br>EN: `common.json` ligne 220<br>IT: `common.json` ligne 211<br>DE: `common.json` ligne 211 | Clé existante exacte (identique DISC_MSG_INIT_07) |
| DISC_MSG_INIT_10 | "Options supplémentaires :" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique options, pas de clé existante |
| DISC_MSG_INIT_14 | "Dont {optionsTotal}€ d'options" | MISSING_KEY | `booking.discussion` | - | - | Wrapper avec interpolation montant, pas de clé existante |
| DISC_MSG_INIT_15 | "Pouvez-vous confirmer la disponibilité ? Merci !" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique locataire, pas de clé existante |
| DISC_MSG_INIT_16 | "Merci de confirmer votre disponibilité !" | MISSING_KEY | `booking.discussion` | - | - | Texte spécifique propriétaire, pas de clé existante |

---

### ZONE SAISIE MESSAGE

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_INPUT_01 | "Tapez votre message..." | MISSING_KEY | `booking.discussion` | - | - | Placeholder spécifique discussion, pas de clé existante |
| DISC_INPUT_02 | "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌" | MISSING_KEY | `booking.discussion` | - | - | Message erreur spécifique, pas de clé existante |

---

### ALERTE STICKY BAS

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_ALERT_01 | "Vous ne pouvez plus discuter. La demande de réservation a été annulée." | MISSING_KEY | `booking.discussion` | - | - | Message erreur spécifique (similaire DISC_INPUT_02 mais texte différent) |
| DISC_ALERT_02 | "Nouvelle réservation" | `bookings.header.newBooking` | `common` | HIGH | FR: `common.json` ligne 651<br>EN: `common.json` ligne 648<br>IT: `common.json` ligne 596<br>DE: `common.json` ligne 596 | Clé existante exacte |

---

### TOASTS (Notifications)

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_TOAST_01 | "Erreur" | `common.error` | `common` | HIGH | FR: `common.json` ligne 22<br>EN: `common.json` ligne 22<br>IT: `common.json` ligne 22<br>DE: `common.json` ligne 22 | Clé existante exacte (utilisée 6 fois) |
| DISC_TOAST_02 | "Vous devez être connecté pour faire une réservation" | `motoDetails.errors.loginRequired.description` | `common` | UNCERTAIN | FR: `common.json` ligne 205<br>EN: `common.json` ligne 205<br>IT: `common.json` ligne 196<br>DE: `common.json` ligne 196 | **Contexte UX différent** : clé existe dans motoDetails ("Vous devez être connecté pour réserver un véhicule" = contexte page détails véhicule), mais ici contexte = discussion/booking (toast erreur lors tentative réservation depuis discussion). Texte légèrement différent ("faire une réservation" vs "réserver un véhicule"), ne pas réutiliser sans vérification UX |
| DISC_TOAST_03 | "Véhicule non trouvé" | `motoDetails.errors.vehicleNotFound.title` | `common` | HIGH | FR: `common.json` ligne 196<br>EN: `common.json` ligne 196<br>IT: `common.json` ligne 187<br>DE: `common.json` ligne 187 | Clé existante exacte (identique DISC_ERROR_01) |
| DISC_TOAST_04 | "Ce véhicule n'existe pas ou n'est plus disponible." | `motoDetails.errors.vehicleNotFound.description` | `common` | HIGH | FR: `common.json` ligne 197<br>EN: `common.json` ligne 197<br>IT: `common.json` ligne 188<br>DE: `common.json` ligne 188 | Clé existante exacte |
| DISC_TOAST_05 | "Impossible de charger les informations du véhicule." | `motoDetails.errors.loadError.description` | `common` | HIGH | FR: `common.json` ligne 201<br>EN: `common.json` ligne 201<br>IT: `common.json` ligne 192<br>DE: `common.json` ligne 192 | Clé existante exacte |
| DISC_TOAST_06 | "Vous devez être connecté" | `motoDetails.errors.loginRequired.title` | `common` | UNCERTAIN | FR: `common.json` ligne 204<br>EN: `common.json` ligne 204<br>IT: `common.json` ligne 195<br>DE: `common.json` ligne 195 | **Contexte UX différent** : clé existe dans motoDetails ("Connexion requise" = titre erreur page détails véhicule), mais ici contexte = discussion/booking (toast erreur lors tentative action depuis discussion). Texte différent ("Vous devez être connecté" vs "Connexion requise"), ne pas réutiliser sans vérification UX |
| DISC_TOAST_07 | "Impossible d'envoyer le message" | MISSING_KEY | `booking.discussion` | - | - | Erreur spécifique message, pas de clé existante |
| DISC_TOAST_08 | "Message envoyé" | MISSING_KEY | `booking.discussion` | - | - | Succès spécifique message, pas de clé existante |
| DISC_TOAST_09 | "Votre message a été envoyé au propriétaire" | MISSING_KEY | `booking.discussion` | - | - | Description succès spécifique, pas de clé existante |
| DISC_TOAST_10 | "Une erreur est survenue" | MISSING_KEY | `booking.discussion` | - | - | Erreur générique mais pas de clé exacte (existe `motoDetails.errors.unexpectedError.description` mais texte différent) |
| DISC_TOAST_11 | "Impossible de récupérer les informations de réservation" | MISSING_KEY | `booking.discussion` | - | - | Erreur spécifique réservation, pas de clé existante |
| DISC_TOAST_12 | "Réservation annulée" | MISSING_KEY | `booking.discussion` | - | - | Titre toast spécifique, pas de clé existante |
| DISC_TOAST_13 | "Cette réservation a été supprimée par le locataire." | MISSING_KEY | `booking.discussion` | - | - | Description toast spécifique, pas de clé existante |
| DISC_TOAST_14 | "Erreur paiement" | MISSING_KEY | `booking.discussion` | - | - | Erreur spécifique paiement, pas de clé existante |
| DISC_TOAST_15 | "Impossible de démarrer le paiement" | MISSING_KEY | `booking.discussion` | - | - | Description erreur paiement, pas de clé existante |

---

### LABELS HARDCODÉS (objets)

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_LABEL_01 | "Essence" | `common.vehicle.fuel.gasoline` | `common` | HIGH | FR: `common.json` ligne 88<br>EN: `common.json` ligne 88<br>IT: `common.json` ligne 80<br>DE: `common.json` ligne 80 | Clé existante exacte |
| DISC_LABEL_02 | "Diesel" | `common.vehicle.fuel.diesel` | `common` | HIGH | FR: `common.json` ligne 89<br>EN: `common.json` ligne 89<br>IT: `common.json` ligne 81<br>DE: `common.json` ligne 81 | Clé existante exacte |
| DISC_LABEL_03 | "Électrique" | `common.vehicle.fuel.electric` | `common` | HIGH | FR: `common.json` ligne 90<br>EN: `common.json` ligne 90<br>IT: `common.json` ligne 82<br>DE: `common.json` ligne 82 | Clé existante exacte |
| DISC_LABEL_04 | "Hybride" | `common.vehicle.fuel.hybrid` | `common` | HIGH | FR: `common.json` ligne 91<br>EN: `common.json` ligne 91<br>IT: `common.json` ligne 83<br>DE: `common.json` ligne 83 | Clé existante exacte |
| DISC_LABEL_05 | "Manuelle" | `common.vehicle.transmission.manual` | `common` | HIGH | FR: `common.json` ligne 94<br>EN: `common.json` ligne 94<br>IT: `common.json` ligne 86<br>DE: `common.json` ligne 86 | Clé existante exacte |
| DISC_LABEL_06 | "Automatique" | `common.vehicle.transmission.automatic` | `common` | HIGH | FR: `common.json` ligne 95<br>EN: `common.json` ligne 95<br>IT: `common.json` ligne 87<br>DE: `common.json` ligne 87 | Clé existante exacte |

---

### TEXTES CALCULÉS (formatDuration)

| ID | Texte exact | Clé candidate | Namespace | Confiance | Preuves FR/EN/IT/DE | Notes |
|----|-------------|---------------|-----------|-----------|---------------------|-------|
| DISC_CALC_01 | "1 jour" | `common.duration.day_one` | `common` | HIGH | FR: `common.json` ligne 101<br>EN: `common.json` ligne 101<br>IT: `common.json` ligne 93<br>DE: `common.json` ligne 93 | Clé existante avec interpolation `{{count}}` → utiliser `t("duration.day_one", { count: 1 })` |
| DISC_CALC_02 | "{completeDays} jour" | `common.duration.day_one` | `common` | HIGH | FR: `common.json` ligne 101<br>EN: `common.json` ligne 101<br>IT: `common.json` ligne 93<br>DE: `common.json` ligne 93 | Clé existante avec interpolation `{{count}}` → utiliser `t("duration.day_one", { count: completeDays })` |
| DISC_CALC_03 | "{completeDays} jours" | `common.duration.day_other` | `common` | HIGH | FR: `common.json` ligne 102<br>EN: `common.json` ligne 102<br>IT: `common.json` ligne 94<br>DE: `common.json` ligne 94 | Clé existante avec interpolation `{{count}}` → utiliser `t("duration.day_other", { count: completeDays })` |
| DISC_CALC_04 | "{completeDays} jour + {extraHours} heure" | `formatDuration()` avec clés existantes | `common` | HIGH | FR: `common.json` lignes 101, 103, 105<br>EN: `common.json` lignes 101, 103, 105<br>IT: `common.json` lignes 93, 95, 97<br>DE: `common.json` lignes 93, 95, 97 | **Géré par `formatDuration()`** : utilise `duration.day_one` + `duration.hour_one` + `duration.separator` (clés existantes). Le code actuel `calculateRealDuration()` doit être remplacé par `formatDuration(t, completeDays, extraHours)`. **PAS MISSING_KEY** |
| DISC_CALC_05 | "{completeDays} jours + {extraHours} heures" | `formatDuration()` avec clés existantes | `common` | HIGH | FR: `common.json` lignes 102, 104, 105<br>EN: `common.json` lignes 102, 104, 105<br>IT: `common.json` lignes 94, 96, 97<br>DE: `common.json` lignes 94, 96, 97 | **Géré par `formatDuration()`** : utilise `duration.day_other` + `duration.hour_other` + `duration.separator` (clés existantes). Le code actuel `calculateRealDuration()` doit être remplacé par `formatDuration(t, completeDays, extraHours)`. **PAS MISSING_KEY** |
| DISC_CALC_06 | "1 jour" | `common.duration.day_one` | `common` | HIGH | FR: `common.json` ligne 101<br>EN: `common.json` ligne 101<br>IT: `common.json` ligne 93<br>DE: `common.json` ligne 93 | Clé existante (identique DISC_CALC_01) |
| DISC_CALC_07 | "1 jour" | `common.duration.day_one` | `common` | HIGH | FR: `common.json` ligne 101<br>EN: `common.json` ligne 101<br>IT: `common.json` ligne 93<br>DE: `common.json` ligne 93 | Clé existante (identique DISC_CALC_01) |
| DISC_CALC_08 | "{days} jours" | `common.duration.day_other` | `common` | HIGH | FR: `common.json` ligne 102<br>EN: `common.json` ligne 102<br>IT: `common.json` ligne 94<br>DE: `common.json` ligne 94 | Clé existante (identique DISC_CALC_03) |

**Note importante** : Les clés `duration.day_one`, `duration.day_other`, `duration.hour_one`, `duration.hour_other`, `duration.separator` existent et sont **déjà utilisées par `formatDuration()`** (voir `src/utils/formatDuration.ts`). Les items DISC_CALC_04 et DISC_CALC_05 doivent utiliser `formatDuration(t, completeDays, extraHours)` au lieu de `calculateRealDuration()` hardcodé. **Aucune nouvelle clé nécessaire**.

---

## C) MISSING_KEY (liste minimale)

Uniquement pour les items TRADUIRE_UI sans clé existante prouvée :

**Note** : Les items UNCERTAIN (DISC_ERROR_02, DISC_TOAST_02, DISC_TOAST_06) ne sont PAS dans cette liste car ils ont une clé candidate mais avec un contexte UX différent. Ils nécessitent une vérification UX avant réutilisation ou création d'une nouvelle clé spécifique.

| ID | Texte exact | Clé proposée | Namespace recommandé | Justification | FR | EN | IT | DE | Interpolations |
|----|-------------|--------------|----------------------|---------------|----|----|----|----|----------------|
| DISC_HEADER_02 | "Discussion avec le locataire" | `discussion.withRenter` | `booking.discussion` | Titre spécifique discussion, contexte unique | "Discussion avec le locataire" | "Discussion with renter" | "Discussione con il locatario" | "Diskussion mit Mieter" | - |
| DISC_HEADER_03 | "Discussion avec le propriétaire" | `discussion.withOwner` | `booking.discussion` | Titre spécifique discussion, contexte unique | "Discussion avec le propriétaire" | "Discussion with owner" | "Discussione con il proprietario" | "Diskussion mit Eigentümer" | - |
| DISC_HEADER_04 | "Vous êtes le propriétaire" | `discussion.role.owner` | `booking.discussion` | Badge rôle spécifique | "Vous êtes le propriétaire" | "You are the owner" | "Sei il proprietario" | "Sie sind der Eigentümer" | - |
| DISC_HEADER_05 | "Vous êtes le locataire" | `discussion.role.renter` | `booking.discussion` | Badge rôle spécifique | "Vous êtes le locataire" | "You are the renter" | "Sei il locatario" | "Sie sind der Mieter" | - |
| DISC_CARD_03 | "Du {startDate} au {endDate}" | `discussion.dateRange` | `booking.discussion` | Wrapper dates avec interpolation | "Du {{startDate}} au {{endDate}}" | "From {{startDate}} to {{endDate}}" | "Dal {{startDate}} al {{endDate}}" | "Vom {{startDate}} bis {{endDate}}" | `{ startDate, endDate }` |
| DISC_BTN_01 | "Voir les détails de ma réservation" | `discussion.viewBookingDetails` | `booking.discussion` | Bouton spécifique discussion | "Voir les détails de ma réservation" | "View my booking details" | "Visualizza i dettagli della mia prenotazione" | "Details meiner Buchung anzeigen" | - |
| DISC_BTN_02 | "Payer ma location" | `discussion.payRental` | `booking.discussion` | Bouton paiement spécifique | "Payer ma location" | "Pay my rental" | "Paga il mio noleggio" | "Meine Miete bezahlen" | - |
| DISC_MSG_INIT_01 | "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :" | `discussion.initialMessage.renter` | `booking.discussion` | Message initial locataire | "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :" | "Hello! I'm interested in renting your vehicle. Here are the details:" | "Ciao! Sono interessato al noleggio del tuo veicolo. Ecco i dettagli:" | "Hallo! Ich bin an der Miete Ihres Fahrzeugs interessiert. Hier sind die Details:" | - |
| DISC_MSG_INIT_02 | "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :" | `discussion.initialMessage.owner` | `booking.discussion` | Message initial propriétaire | "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :" | "Hello! You have a new booking request. Here are the details:" | "Ciao! Hai una nuova richiesta di prenotazione. Ecco i dettagli:" | "Hallo! Sie haben eine neue Buchungsanfrage. Hier sind die Details:" | - |
| DISC_MSG_INIT_05 | "Du {startDate} au {endDate}" | `discussion.dateRange` | `booking.discussion` | Wrapper dates (identique DISC_CARD_03) | "Du {{startDate}} au {{endDate}}" | "From {{startDate}} to {{endDate}}" | "Dal {{startDate}} al {{endDate}}" | "Vom {{startDate}} bis {{endDate}}" | `{ startDate, endDate }` |
| DISC_MSG_INIT_06 | "Départ à {startTime}" | `discussion.departureTime` | `booking.discussion` | Wrapper heure départ | "Départ à {{startTime}}" | "Departure at {{startTime}}" | "Partenza alle {{startTime}}" | "Abfahrt um {{startTime}}" | `{ startTime }` |
| DISC_MSG_INIT_08 | "Lieu : {pickupLocation}" | `discussion.pickupLocation` | `booking.discussion` | Wrapper lieu | "Lieu : {{pickupLocation}}" | "Location: {{pickupLocation}}" | "Luogo: {{pickupLocation}}" | "Ort: {{pickupLocation}}" | `{ pickupLocation }` |
| DISC_MSG_INIT_10 | "Options supplémentaires :" | `discussion.additionalOptions` | `booking.discussion` | Titre section options | "Options supplémentaires :" | "Additional options:" | "Opzioni aggiuntive:" | "Zusätzliche Optionen:" | - |
| DISC_MSG_INIT_14 | "Dont {optionsTotal}€ d'options" | `discussion.optionsTotal` | `booking.discussion` | Wrapper montant options | "Dont {{optionsTotal}}€ d'options" | "Including {{optionsTotal}}€ of options" | "Inclusi {{optionsTotal}}€ di opzioni" | "Einschließlich {{optionsTotal}}€ Optionen" | `{ optionsTotal }` |
| DISC_MSG_INIT_15 | "Pouvez-vous confirmer la disponibilité ? Merci !" | `discussion.confirmAvailability.renter` | `booking.discussion` | Demande confirmation locataire | "Pouvez-vous confirmer la disponibilité ? Merci !" | "Can you confirm availability? Thank you!" | "Puoi confermare la disponibilità? Grazie!" | "Können Sie die Verfügbarkeit bestätigen? Vielen Dank!" | - |
| DISC_MSG_INIT_16 | "Merci de confirmer votre disponibilité !" | `discussion.confirmAvailability.owner` | `booking.discussion` | Demande confirmation propriétaire | "Merci de confirmer votre disponibilité !" | "Please confirm your availability!" | "Conferma la tua disponibilità!" | "Bitte bestätigen Sie Ihre Verfügbarkeit!" | - |
| DISC_INPUT_01 | "Tapez votre message..." | `discussion.messagePlaceholder` | `booking.discussion` | Placeholder input message | "Tapez votre message..." | "Type your message..." | "Scrivi il tuo messaggio..." | "Geben Sie Ihre Nachricht ein..." | - |
| DISC_INPUT_02 | "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌" | `discussion.conversationCancelled` | `booking.discussion` | Message erreur conversation annulée | "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌" | "You can no longer chat. The booking request has been cancelled or completed. ❌" | "Non puoi più chattare. La richiesta di prenotazione è stata annullata o completata. ❌" | "Sie können nicht mehr chatten. Die Buchungsanfrage wurde storniert oder abgeschlossen. ❌" | - |
| DISC_ALERT_01 | "Vous ne pouvez plus discuter. La demande de réservation a été annulée." | `discussion.conversationCancelledShort` | `booking.discussion` | Message erreur court (alerte sticky) | "Vous ne pouvez plus discuter. La demande de réservation a été annulée." | "You can no longer chat. The booking request has been cancelled." | "Non puoi più chattare. La richiesta di prenotazione è stata annullata." | "Sie können nicht mehr chatten. Die Buchungsanfrage wurde storniert." | - |
| DISC_TOAST_07 | "Impossible d'envoyer le message" | `discussion.toasts.sendMessageError` | `booking.discussion` | Erreur envoi message | "Impossible d'envoyer le message" | "Unable to send message" | "Impossibile inviare il messaggio" | "Nachricht konnte nicht gesendet werden" | - |
| DISC_TOAST_08 | "Message envoyé" | `discussion.toasts.messageSent.title` | `booking.discussion` | Succès envoi message | "Message envoyé" | "Message sent" | "Messaggio inviato" | "Nachricht gesendet" | - |
| DISC_TOAST_09 | "Votre message a été envoyé au propriétaire" | `discussion.toasts.messageSent.description` | `booking.discussion` | Description succès envoi | "Votre message a été envoyé au propriétaire" | "Your message has been sent to the owner" | "Il tuo messaggio è stato inviato al proprietario" | "Ihre Nachricht wurde an den Eigentümer gesendet" | - |
| DISC_TOAST_10 | "Une erreur est survenue" | `discussion.toasts.unexpectedError` | `booking.discussion` | Erreur générique discussion | "Une erreur est survenue" | "An error occurred" | "Si è verificato un errore" | "Ein Fehler ist aufgetreten" | - |
| DISC_TOAST_11 | "Impossible de récupérer les informations de réservation" | `discussion.toasts.loadBookingError` | `booking.discussion` | Erreur chargement réservation | "Impossible de récupérer les informations de réservation" | "Unable to retrieve booking information" | "Impossibile recuperare le informazioni sulla prenotazione" | "Buchungsinformationen konnten nicht abgerufen werden" | - |
| DISC_TOAST_12 | "Réservation annulée" | `discussion.toasts.bookingCancelled.title` | `booking.discussion` | Titre toast annulation | "Réservation annulée" | "Booking cancelled" | "Prenotazione annullata" | "Buchung storniert" | - |
| DISC_TOAST_13 | "Cette réservation a été supprimée par le locataire." | `discussion.toasts.bookingCancelled.description` | `booking.discussion` | Description toast annulation | "Cette réservation a été supprimée par le locataire." | "This booking has been deleted by the renter." | "Questa prenotazione è stata eliminata dal locatario." | "Diese Buchung wurde vom Mieter gelöscht." | - |
| DISC_TOAST_14 | "Erreur paiement" | `discussion.toasts.paymentError.title` | `booking.discussion` | Titre erreur paiement | "Erreur paiement" | "Payment error" | "Errore di pagamento" | "Zahlungsfehler" | - |
| DISC_TOAST_15 | "Impossible de démarrer le paiement" | `discussion.toasts.paymentError.description` | `booking.discussion` | Description erreur paiement | "Impossible de démarrer le paiement" | "Unable to start payment" | "Impossibile avviare il pagamento" | "Zahlung konnte nicht gestartet werden" | - |

**Total MISSING_KEY** : **26** clés à créer dans `booking.discussion.*` (ajoutées dans `common.json`)

**Note** : DISC_CALC_04 et DISC_CALC_05 ne sont PAS dans MISSING_KEY car gérés par `formatDuration()` avec clés existantes.

---

## D) RISQUES & CONTRÔLES (anti-régression)

### Clés sensibles identifiées

| Clé | Risque | Contrôle proposé |
|-----|--------|-------------------|
| `common.loading` | Fallback manquant si clé absente | Log DEV: `console.log('[i18n] Loading key exists:', !!t('loading'))` |
| `common.error` | Utilisée 6 fois, risque de régression si modifiée | Log DEV: `console.log('[i18n] Error key result:', t('error'))` |
| `motoDetails.errors.vehicleNotFound.title` | Clé partagée avec autres pages, risque de conflit | Log DEV: `console.log('[i18n] VehicleNotFound key:', t('motoDetails.errors.vehicleNotFound.title'))` |
| `common.duration.day_one` / `day_other` | Interpolation `{{count}}` critique, pluriels | Log DEV: `console.log('[i18n] Duration test:', t('duration.day_one', { count: 1 }), t('duration.day_other', { count: 2 }))` |
| `booking.discussion.dateRange` (MISSING) | Wrapper avec 2 interpolations, risque de formatage | Log DEV: `console.log('[i18n] DateRange test:', t('booking.discussion.dateRange', { startDate: 'test1', endDate: 'test2' }))` |
| `booking.discussion.conversationCancelled` (MISSING) | Message critique utilisateur, risque de non-traduction | Log DEV: `console.log('[i18n] ConversationCancelled key exists:', !!t('booking.discussion.conversationCancelled'))` |
| `booking.discussion.toasts.messageSent` (MISSING) | Toast succès critique, risque de non-traduction | Log DEV: `console.log('[i18n] MessageSent key exists:', !!t('booking.discussion.toasts.messageSent.title'))` |
| `common.vehicle.fuel.*` | Labels hardcodés remplacés, risque de non-traduction | Log DEV: `console.log('[i18n] Fuel labels:', t('vehicle.fuel.gasoline'), t('vehicle.fuel.diesel'))` |
| `common.vehicle.transmission.*` | Labels hardcodés remplacés, risque de non-traduction | Log DEV: `console.log('[i18n] Transmission labels:', t('vehicle.transmission.manual'), t('vehicle.transmission.automatic'))` |
| `motoDetails.notSpecified` | Utilisée 2 fois (DISC_CARD_02, DISC_MSG_INIT_07, DISC_MSG_INIT_09), risque de réutilisation incorrecte | Log DEV: `console.log('[i18n] NotSpecified key:', t('motoDetails.notSpecified'))` |

### Logs DEV-only proposés (Passe 1)

**À ajouter dans `BookingDiscussion.tsx` (DEV uniquement)** :

```typescript
// En haut du composant, après useTranslation
if (import.meta.env.DEV) {
  const { t } = useTranslation();
  
  // Vérifier existence clés critiques
  console.log('[i18n DEV] Loading key exists:', !!t('loading'));
  console.log('[i18n DEV] Error key result:', t('error'));
  console.log('[i18n DEV] VehicleNotFound key:', t('motoDetails.errors.vehicleNotFound.title'));
  console.log('[i18n DEV] Duration test:', t('duration.day_one', { count: 1 }), t('duration.day_other', { count: 2 }));
  console.log('[i18n DEV] DateRange test:', t('booking.discussion.dateRange', { startDate: 'test1', endDate: 'test2' }));
  console.log('[i18n DEV] ConversationCancelled key exists:', !!t('booking.discussion.conversationCancelled'));
  console.log('[i18n DEV] MessageSent key exists:', !!t('booking.discussion.toasts.messageSent.title'));
  console.log('[i18n DEV] Fuel labels:', t('vehicle.fuel.gasoline'), t('vehicle.fuel.diesel'));
  console.log('[i18n DEV] Transmission labels:', t('vehicle.transmission.manual'), t('vehicle.transmission.automatic'));
  console.log('[i18n DEV] NotSpecified key:', t('motoDetails.notSpecified'));
}
```

**Note** : Ces logs doivent être **retirés après validation** de l'implémentation.

---

## STATISTIQUES FINALES (ÉTAPE 2)

- **Total items TRADUIRE_UI** : **55**
- **Items mappés avec clé existante** : **27** (49%)
  - HIGH confiance : **27** (inclut DISC_CALC_04/05 via `formatDuration()` avec clés existantes)
- **MISSING_KEY** : **26** (47%)
- **UNCERTAIN** : **3** (5%)
  - DISC_ERROR_02 : "Retour à l'accueil" → contexte différent (profil vs erreur)
  - DISC_TOAST_02 : "Vous devez être connecté pour faire une réservation" → contexte différent (réserver véhicule vs discussion)
  - DISC_TOAST_06 : "Vous devez être connecté" → contexte différent (connexion requise vs discussion)

**Note** : DISC_CALC_04 et DISC_CALC_05 sont comptés dans "Items mappés" car ils utilisent `formatDuration()` avec les clés existantes `duration.*` (pas de nouvelle clé nécessaire, refactoring code uniquement).

### Répartition par zone

| Zone | Total | Mappés | MISSING_KEY |
|------|-------|--------|-------------|
| État Loading | 1 | 1 | 0 |
| État Erreur | 2 | 2 | 0 |
| En-tête Page | 5 | 1 | 4 |
| Card Header | 2 | 1 | 1 |
| Boutons Action | 2 | 0 | 2 |
| Message Initial | 10 | 2 | 8 |
| Zone Saisie | 2 | 0 | 2 |
| Alerte Sticky | 2 | 1 | 1 |
| Toasts | 15 | 6 | 9 |
| Labels Hardcodés | 6 | 6 | 0 |
| Textes Calculés | 8 | 6 | 0 |

*Note : DISC_CALC_04 et DISC_CALC_05 sont gérés par `formatDuration()` avec clés existantes `duration.*` + `separator` (comptés séparément, pas dans "Mappés"). Refactoring nécessaire : remplacer `calculateRealDuration()` par `formatDuration(t, completeDays, extraHours)`.

---

**Fin du diagnostic i18n ÉTAPE 2 — `/vehicle/:license/booking/discussion`**

