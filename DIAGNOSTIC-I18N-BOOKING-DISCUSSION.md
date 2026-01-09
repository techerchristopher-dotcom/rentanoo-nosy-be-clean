# Diagnostic i18n + Plan d'implémentation : Page Discussion Réservation

**URL cible** : `http://localhost:3012/moto/0FFA7FD8/booking/discussion?start=2025-12-17T05:00:00.000Z&end=2025-12-21T16:00:00.000Z&bookingId=97506a6b-c6a5-4a48-abd6-9d3e5ed22379`

**Fichier principal** : `src/pages/booking/BookingDiscussion.tsx` (1248 lignes)

**Pattern i18n existant** : 
- `BookingConfirmationModal.tsx` utilise `useTranslation()` avec namespace `common` (implicite via `defaultNS`)
- `MotoVehicleDetails.tsx` utilise `useTranslation()` avec namespace `common`
- Tous les fichiers JSON sont dans `src/i18n/locales/{lang}/common.json`

---

## A) INVENTAIRE COMPLET DES TEXTES À TRADUIRE

### 1. En-tête / Navigation

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "Retour au véhicule" | 881 | Bouton | Bouton retour avec icône ArrowLeft |
| "Discussion avec le locataire" | 885 | Titre H1 | Conditionnel : `isOwner ? 'Discussion avec le locataire' : 'Discussion avec le propriétaire'` |
| "Discussion avec le propriétaire" | 885 | Titre H1 | Conditionnel : `isOwner ? 'Discussion avec le locataire' : 'Discussion avec le propriétaire'` |
| "Vous êtes le propriétaire" | 890 | Badge | Badge bleu avec icône Car |
| "Vous êtes le locataire" | 895 | Badge | Badge vert avec emoji 👤 |

### 2. Card Header (Informations véhicule)

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "{brand} {model}" | 925 | Titre H3 | Données dynamiques DB (ne PAS traduire) |
| "{pickupLocation}" | 928 | Texte | Données dynamiques DB (ne PAS traduire) |
| "Localisation non spécifiée" | 928 | Fallback | Texte statique UI |
| "Du {startDate} au {endDate}" | 931 | Texte | Format date dynamique |
| "{price}€" | 937 | Prix | Données dynamiques DB (ne PAS traduire) |
| "{duration}" | 940 | Durée | Calculée dynamiquement (utiliser `duration.day` / `duration.hour`) |

### 3. Boutons d'action

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "Voir les détails de ma réservation" | 957 | Bouton | Bouton avec icône FileText |
| "Payer ma location" | 979 | Bouton | Bouton avec icônes CreditCard + Shield, conditionnel (`status === 'pending_payment'`) |

### 4. Message initial (bulle de conversation)

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :" | 1008 | Message | Conditionnel : `isRenter ? ... : ...` |
| "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :" | 1008 | Message | Conditionnel : `isRenter ? ... : ...` |
| "{brand} {model}" | 1024 | Titre | Données dynamiques DB (ne PAS traduire) |
| "{color} • {year} • ID: {license}" | 1027 | Texte | Données dynamiques DB (ne PAS traduire) |
| "Du {startDate} au {endDate}" | 1038 | Texte | Format date dynamique |
| "Départ à {startTime}" | 1044 | Texte | Format heure dynamique |
| "Non spécifié" | 1044 | Fallback | Texte statique UI |
| "Lieu : {pickupLocation}" | 1050 | Texte | Données dynamiques DB (ne PAS traduire) |
| "Non spécifié" | 1050 | Fallback | Texte statique UI |
| "Options supplémentaires :" | 1060 | Label | Section conditionnelle |
| "{option.name} (+{price}€)" | 607 | Texte | Formatage dynamique des options |
| "{pricePerDay}€ × {duration}" | 1076 | Texte | Calcul dynamique |
| "{totalPrice}€" | 1080 | Prix | Données dynamiques DB (ne PAS traduire) |
| "Dont {optionsTotal}€ d'options" | 1088 | Texte | Conditionnel si `optionsTotal > 0` |
| "Pouvez-vous confirmer la disponibilité ? Merci !" | 1098 | Message | Conditionnel : `isRenter ? ... : ...` |
| "Merci de confirmer votre disponibilité !" | 1098 | Message | Conditionnel : `isRenter ? ... : ...` |
| "{time}" | 1102 | Timestamp | Formatage dynamique (`toLocaleTimeString`) |

### 5. Zone de saisie de message

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "Tapez votre message..." | 1174 | Placeholder | Input avec bouton Send |
| "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌" | 1194 | Message d'erreur | Affiché si `conversation.status !== 'active'` |

### 6. États de chargement / Erreurs

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "Chargement..." | 840 | Loading | État de chargement initial |
| "Véhicule non trouvé" | 855 | Erreur | État si `!vehicle` |
| "Retour à l'accueil" | 857 | Bouton | Bouton dans l'état d'erreur |
| "Erreur" | 123 | Toast | Toast d'erreur (plusieurs occurrences) |
| "Vous devez être connecté pour faire une réservation" | 124 | Toast | Toast d'erreur |
| "Véhicule non trouvé" | 146 | Toast | Toast d'erreur |
| "Ce véhicule n'existe pas ou n'est plus disponible." | 147 | Toast | Toast d'erreur |
| "Impossible de charger les informations du véhicule." | 333 | Toast | Toast d'erreur |
| "Erreur" | 360 | Toast | Toast d'erreur |
| "Vous devez être connecté" | 361 | Toast | Toast d'erreur |
| "Erreur" | 746 | Toast | Toast d'erreur |
| "Impossible d'envoyer le message" | 747 | Toast | Toast d'erreur |
| "Message envoyé" | 756 | Toast | Toast de succès |
| "Votre message a été envoyé au propriétaire" | 757 | Toast | Toast de succès |
| "Erreur" | 762 | Toast | Toast d'erreur |
| "Une erreur est survenue" | 763 | Toast | Toast d'erreur |
| "Erreur" | 783 | Toast | Toast d'erreur |
| "Impossible de récupérer les informations de réservation" | 784 | Toast | Toast d'erreur |
| "Réservation annulée" | 532 | Toast | Toast d'erreur |
| "Cette réservation a été supprimée par le locataire." | 533 | Toast | Toast d'erreur |
| "Vous ne pouvez plus discuter. La demande de réservation a été annulée." | 1211 | Alerte sticky | Alerte en bas de page si `isConversationCancelled` |
| "Nouvelle réservation" | 1218 | Bouton | Bouton dans l'alerte |

### 7. Labels / Formatage dynamique

| Texte actuel (FR) | Ligne | Type | Notes |
|-------------------|-------|------|-------|
| "Essence" / "Diesel" / "Électrique" / "Hybride" | 619-622 | Labels | `fuelLabels` object (hardcodé) |
| "Manuelle" / "Automatique" | 626-627 | Labels | `transmissionLabels` object (hardcodé) |
| "1 jour" | 715, 723 | Durée | Formatage dynamique dans `calculateRealDuration()` |
| "{days} jours" | 725 | Durée | Formatage dynamique |
| "{days} jours + {hours} heures" | 729 | Durée | Formatage dynamique |
| "{hours} heure" / "{hours} heures" | 729 | Durée | Formatage dynamique |

### 8. Contenu dynamique DB (NE PAS TRADUIRE)

- `vehicle.brand`, `vehicle.model`, `vehicle.year`, `vehicle.color`, `vehicle.license`
- `bookingData.rentalInfo.pickupLocation`
- `owner.firstName`, `owner.lastName`
- `currentUser.firstName`, `currentUser.lastName`
- `messages[].content` (messages utilisateur)
- Prix (`{price}€`)
- Dates formatées (utiliser `formatDate()` avec locale)

---

## B) MAPPING VERS CLÉS EXISTANTES

### ✅ Clés existantes réutilisables

| Texte actuel | Clé i18n candidate | Fichier | Ligne | Statut |
|--------------|-------------------|---------|-------|--------|
| "Retour au véhicule" | `motoDetails.back` | `fr/common.json` | 162 | ✅ Existe |
| "Chargement..." | `loading` | `fr/common.json` | 34 | ✅ Existe |
| "Véhicule non trouvé" | `motoDetails.errors.vehicleNotFound.title` | `fr/common.json` | 196 | ✅ Existe |
| "Ce véhicule n'existe pas ou n'est plus disponible." | `motoDetails.errors.vehicleNotFound.description` | `fr/common.json` | 197 | ✅ Existe |
| "Erreur" | `error` | `fr/common.json` | 22 | ✅ Existe |
| "Vous devez être connecté pour faire une réservation" | `motoDetails.errors.loginRequired.description` | `fr/common.json` | 205 | ✅ Existe (proche) |
| "Impossible de charger les informations du véhicule." | `motoDetails.errors.loadError.description` | `fr/common.json` | 201 | ✅ Existe |
| "Retour à l'accueil" | `profile.hero.back` | `fr/common.json` | 321 | ✅ Existe (proche) |
| "Essence" / "Diesel" / "Électrique" / "Hybride" | `vehicle.fuel.{gasoline\|diesel\|electric\|hybrid}` | `fr/common.json` | 88-91 | ✅ Existe |
| "Manuelle" / "Automatique" | `vehicle.transmission.{manual\|automatic}` | `fr/common.json` | 94-95 | ✅ Existe |
| "Non spécifié" | `motoDetails.notSpecified` | `fr/common.json` | 220 | ✅ Existe |
| "Départ" | `searchBar.departure` | `fr/common.json` | 80 | ✅ Existe |
| "Retour" | `searchBar.return` | `fr/common.json` | 81 | ✅ Existe |
| "Heure" | `searchBar.time` | `fr/common.json` | 83 | ✅ Existe |
| "Date" | `searchBar.date` | `fr/common.json` | 82 | ✅ Existe |
| "jours" / "jour" | `duration.day` / `duration.day_one` / `duration.day_other` | `fr/common.json` | ~100+ | ✅ Existe |
| "heures" / "heure" | `duration.hour` / `duration.hour_one` / `duration.hour_other` | `fr/common.json` | ~100+ | ✅ Existe |
| "par jour" | `par_jour` | `fr/common.json` | 47 | ✅ Existe |

### ❌ Clés manquantes (à créer dans Passe 2)

| Texte actuel | Clé i18n proposée | Namespace | Notes |
|--------------|-------------------|-----------|-------|
| "Discussion avec le locataire" | `booking.discussion.withRenter` | `booking` | Conditionnel selon rôle |
| "Discussion avec le propriétaire" | `booking.discussion.withOwner` | `booking` | Conditionnel selon rôle |
| "Vous êtes le propriétaire" | `booking.discussion.youAreOwner` | `booking` | Badge |
| "Vous êtes le locataire" | `booking.discussion.youAreRenter` | `booking` | Badge |
| "Voir les détails de ma réservation" | `booking.discussion.viewBookingDetails` | `booking` | Bouton |
| "Payer ma location" | `booking.discussion.payRental` | `booking` | Bouton CTA |
| "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :" | `booking.discussion.initialMessage.renter` | `booking` | Message initial locataire |
| "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :" | `booking.discussion.initialMessage.owner` | `booking` | Message initial propriétaire |
| "Lieu :" | `booking.discussion.locationLabel` | `booking` | Label |
| "Options supplémentaires :" | `booking.selectedOptions` | `booking` | ✅ Existe déjà (146) |
| "Dont {optionsTotal}€ d'options" | `booking.discussion.optionsTotal` | `booking` | Formatage avec interpolation |
| "Pouvez-vous confirmer la disponibilité ? Merci !" | `booking.discussion.confirmAvailability.renter` | `booking` | Message de fin locataire |
| "Merci de confirmer votre disponibilité !" | `booking.discussion.confirmAvailability.owner` | `booking` | Message de fin propriétaire |
| "Tapez votre message..." | `booking.discussion.messagePlaceholder` | `booking` | Placeholder input |
| "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌" | `booking.discussion.conversationCancelled` | `booking` | Message d'erreur |
| "Message envoyé" | `booking.discussion.messageSent` | `booking` | Toast succès |
| "Votre message a été envoyé au propriétaire" | `booking.discussion.messageSentToOwner` | `booking` | Toast description |
| "Impossible d'envoyer le message" | `booking.discussion.sendMessageError` | `booking` | Toast erreur |
| "Impossible de récupérer les informations de réservation" | `booking.discussion.loadBookingError` | `booking` | Toast erreur |
| "Une erreur est survenue" | `booking.discussion.unexpectedError` | `booking` | Toast erreur générique |
| "Réservation annulée" | `booking.discussion.bookingCancelled` | `booking` | Toast titre |
| "Cette réservation a été supprimée par le locataire." | `booking.discussion.bookingDeletedByRenter` | `booking` | Toast description |
| "Vous ne pouvez plus discuter. La demande de réservation a été annulée." | `booking.discussion.cannotDiscussAnymore` | `booking` | Alerte sticky |
| "Nouvelle réservation" | `booking.discussion.newBooking` | `booking` | Bouton dans alerte |
| "Localisation non spécifiée" | `booking.discussion.locationNotSpecified` | `booking` | Fallback (différent de `motoDetails.notSpecified`) |

---

## C) PLAN STEP-BY-STEP

### 🔵 PASSE 1 : Réutilisation maximale (0 nouvelles clés)

**Objectif** : Remplacer uniquement les textes qui ont une clé existante, laisser le reste en FR hardcodé avec `TODO(i18n)`.

#### Étape 1.1 : Ajouter `useTranslation()` hook

**Fichier** : `src/pages/booking/BookingDiscussion.tsx`

```typescript
import { useTranslation } from "react-i18next";

const BookingDiscussion = () => {
  const { t, i18n } = useTranslation(); // Ajouter cette ligne après les hooks React Router
  // ... reste du code
```

**Pattern** : Identique à `BookingConfirmationModal.tsx` ligne 52.

#### Étape 1.2 : Remplacer les textes avec clés existantes

| Ligne | Texte actuel | Remplacement | Clé |
|-------|--------------|--------------|-----|
| 840 | `"Chargement..."` | `{t("loading")}` | `loading` |
| 855 | `"Véhicule non trouvé"` | `{t("motoDetails.errors.vehicleNotFound.title")}` | `motoDetails.errors.vehicleNotFound.title` |
| 857 | `"Retour à l'accueil"` | `{t("profile.hero.back")}` | `profile.hero.back` |
| 881 | `"Retour au véhicule"` | `{t("motoDetails.back")}` | `motoDetails.back` |
| 1044 | `"Non spécifié"` | `{t("motoDetails.notSpecified")}` | `motoDetails.notSpecified` |
| 1050 | `"Non spécifié"` | `{t("motoDetails.notSpecified")}` | `motoDetails.notSpecified` |
| 1060 | `"Options supplémentaires :"` | `{t("booking.selectedOptions")}` | `booking.selectedOptions` |
| 123 | `"Erreur"` | `{t("error")}` | `error` |
| 124 | `"Vous devez être connecté pour faire une réservation"` | `{t("motoDetails.errors.loginRequired.description")}` | `motoDetails.errors.loginRequired.description` |
| 146 | `"Véhicule non trouvé"` | `{t("motoDetails.errors.vehicleNotFound.title")}` | `motoDetails.errors.vehicleNotFound.title` |
| 147 | `"Ce véhicule n'existe pas ou n'est plus disponible."` | `{t("motoDetails.errors.vehicleNotFound.description")}` | `motoDetails.errors.vehicleNotFound.description` |
| 333 | `"Impossible de charger les informations du véhicule."` | `{t("motoDetails.errors.loadError.description")}` | `motoDetails.errors.loadError.description` |
| 360 | `"Erreur"` | `{t("error")}` | `error` |
| 361 | `"Vous devez être connecté"` | `{t("motoDetails.errors.loginRequired.description")}` | `motoDetails.errors.loginRequired.description` |

#### Étape 1.3 : Remplacer les labels carburant/transmission

**Lignes 618-628** : Remplacer les objets hardcodés par des appels `t()`.

```typescript
// AVANT
const fuelLabels = {
  gasoline: "Essence",
  diesel: "Diesel", 
  electric: "Électrique",
  hybrid: "Hybride"
};

const transmissionLabels = {
  manual: "Manuelle",
  automatic: "Automatique"
};

// APRÈS
const fuelLabels = {
  gasoline: t("vehicle.fuel.gasoline"),
  diesel: t("vehicle.fuel.diesel"), 
  electric: t("vehicle.fuel.electric"),
  hybrid: t("vehicle.fuel.hybrid")
};

const transmissionLabels = {
  manual: t("vehicle.transmission.manual"),
  automatic: t("vehicle.transmission.automatic")
};
```

#### Étape 1.4 : Utiliser `formatDuration()` pour la durée

**Ligne 940** : Remplacer `calculateRealDuration()` par `formatDuration()` (déjà utilisé dans `BookingConfirmationModal.tsx`).

```typescript
// AVANT
{calculateRealDuration()}

// APRÈS
{formatDuration(
  bookingData?.rentalInfo?.startDate ? new Date(bookingData.rentalInfo.startDate) : (startDate ? new Date(startDate) : new Date()),
  bookingData?.rentalInfo?.endDate ? new Date(bookingData.rentalInfo.endDate) : (endDate ? new Date(endDate) : new Date()),
  bookingData?.rentalInfo?.startTime || (startDate ? formatTime(startDate) : '06:30'),
  bookingData?.rentalInfo?.endTime || (endDate ? formatTime(endDate) : '14:00')
)}
```

**Note** : `formatDuration()` utilise déjà `duration.day` / `duration.hour` avec pluriels.

#### Étape 1.5 : Ajouter TODO(i18n) pour les textes sans clé

Pour chaque texte qui n'a pas de clé existante, ajouter un commentaire `// TODO(i18n): ...` :

```typescript
// Ligne 885
<h1 className="text-3xl font-bold text-slate-800">
  {isOwner ? 'Discussion avec le locataire' : 'Discussion avec le propriétaire'} {/* TODO(i18n): booking.discussion.withRenter / withOwner */}
</h1>

// Ligne 890
<Badge className="mt-2 bg-blue-600">
  <Car className="h-3 w-3 mr-1" />
  Vous êtes le propriétaire {/* TODO(i18n): booking.discussion.youAreOwner */}
</Badge>

// ... etc pour tous les textes sans clé
```

#### Étape 1.6 : Ajouter logs DEV-only

**Après le hook `useTranslation()`**, ajouter :

```typescript
const { t, i18n } = useTranslation();

// DEV-only debug logs
if (import.meta.env.DEV) {
  console.log('[BookingDiscussion I18N DEBUG]', {
    lang: i18n.language,
    defaultNS: i18n.options?.defaultNS,
    namespaces: i18n.options?.ns,
    exists: {
      loading: i18n.exists('loading'),
      error: i18n.exists('error'),
      back: i18n.exists('motoDetails.back'),
      vehicleNotFound: i18n.exists('motoDetails.errors.vehicleNotFound.title'),
      selectedOptions: i18n.exists('booking.selectedOptions'),
    },
    tValues: {
      loading: t('loading'),
      error: t('error'),
      back: t('motoDetails.back'),
      selectedOptions: t('booking.selectedOptions'),
    },
  });
}
```

#### Critère de succès Passe 1

- ✅ 0 clé brute visible à l'écran (ex: `"common.xxx"`)
- ✅ Tous les textes avec clés existantes sont traduits
- ✅ Les textes sans clé restent en FR hardcodé avec `TODO(i18n)`
- ✅ Les logs DEV montrent `exists: { ... } === true` pour toutes les clés utilisées
- ✅ Le build passe (`npm run build`)

---

### 🟢 PASSE 2 : Ajout des clés manquantes

**Objectif** : Ajouter uniquement les nouvelles clés indispensables et remplacer les `TODO(i18n)`.

#### Étape 2.1 : Ajouter les nouvelles clés dans `fr/common.json`

**Fichier** : `src/i18n/locales/fr/common.json`

Ajouter dans l'objet `booking` (après la ligne 159) :

```json
"discussion": {
  "withRenter": "Discussion avec le locataire",
  "withOwner": "Discussion avec le propriétaire",
  "youAreOwner": "Vous êtes le propriétaire",
  "youAreRenter": "Vous êtes le locataire",
  "viewBookingDetails": "Voir les détails de ma réservation",
  "payRental": "Payer ma location",
  "initialMessage": {
    "renter": "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :",
    "owner": "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :"
  },
  "locationLabel": "Lieu :",
  "locationNotSpecified": "Localisation non spécifiée",
  "optionsTotal": "Dont {{optionsTotal}}€ d'options",
  "confirmAvailability": {
    "renter": "Pouvez-vous confirmer la disponibilité ? Merci !",
    "owner": "Merci de confirmer votre disponibilité !"
  },
  "messagePlaceholder": "Tapez votre message...",
  "conversationCancelled": "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌",
  "messageSent": "Message envoyé",
  "messageSentToOwner": "Votre message a été envoyé au propriétaire",
  "sendMessageError": "Impossible d'envoyer le message",
  "loadBookingError": "Impossible de récupérer les informations de réservation",
  "unexpectedError": "Une erreur est survenue",
  "bookingCancelled": "Réservation annulée",
  "bookingDeletedByRenter": "Cette réservation a été supprimée par le locataire.",
  "cannotDiscussAnymore": "Vous ne pouvez plus discuter. La demande de réservation a été annulée.",
  "newBooking": "Nouvelle réservation"
}
```

#### Étape 2.2 : Traduire en anglais (`en/common.json`)

**Fichier** : `src/i18n/locales/en/common.json`

Ajouter la même structure avec traductions anglaises :

```json
"discussion": {
  "withRenter": "Discussion with renter",
  "withOwner": "Discussion with owner",
  "youAreOwner": "You are the owner",
  "youAreRenter": "You are the renter",
  "viewBookingDetails": "View my booking details",
  "payRental": "Pay my rental",
  "initialMessage": {
    "renter": "Hello! I'm interested in renting your vehicle. Here are the details:",
    "owner": "Hello! You have a new booking request. Here are the details:"
  },
  "locationLabel": "Location:",
  "locationNotSpecified": "Location not specified",
  "optionsTotal": "Including {{optionsTotal}}€ in options",
  "confirmAvailability": {
    "renter": "Can you confirm availability? Thank you!",
    "owner": "Please confirm your availability!"
  },
  "messagePlaceholder": "Type your message...",
  "conversationCancelled": "You can no longer discuss. The booking request has been cancelled or completed. ❌",
  "messageSent": "Message sent",
  "messageSentToOwner": "Your message has been sent to the owner",
  "sendMessageError": "Unable to send message",
  "loadBookingError": "Unable to retrieve booking information",
  "unexpectedError": "An error occurred",
  "bookingCancelled": "Booking cancelled",
  "bookingDeletedByRenter": "This booking has been deleted by the renter.",
  "cannotDiscussAnymore": "You can no longer discuss. The booking request has been cancelled.",
  "newBooking": "New booking"
}
```

#### Étape 2.3 : Traduire en italien et allemand (optionnel)

**Fichiers** : `src/i18n/locales/it/common.json` et `src/i18n/locales/de/common.json`

Ajouter la même structure avec traductions IT/DE (ou laisser `__STRING_NOT_TRANSLATED__` temporairement).

#### Étape 2.4 : Remplacer les TODO(i18n) par `t()`

**Fichier** : `src/pages/booking/BookingDiscussion.tsx`

Remplacer tous les `TODO(i18n)` par des appels `t()` :

```typescript
// Ligne 885
<h1 className="text-3xl font-bold text-slate-800">
  {isOwner ? t('booking.discussion.withRenter') : t('booking.discussion.withOwner')}
</h1>

// Ligne 890
<Badge className="mt-2 bg-blue-600">
  <Car className="h-3 w-3 mr-1" />
  {t('booking.discussion.youAreOwner')}
</Badge>

// Ligne 895
<Badge className="mt-2 bg-green-600">
  👤 {t('booking.discussion.youAreRenter')}
</Badge>

// ... etc pour tous les TODO(i18n)
```

#### Étape 2.5 : Gérer les interpolations

Pour les clés avec interpolation (`{{optionsTotal}}`), utiliser le 2e paramètre de `t()` :

```typescript
// Ligne 1088
{t('booking.discussion.optionsTotal', { optionsTotal })}
```

#### Étape 2.6 : Mettre à jour les logs DEV

Ajouter les nouvelles clés dans les logs DEV :

```typescript
exists: {
  // ... clés existantes
  withRenter: i18n.exists('booking.discussion.withRenter'),
  withOwner: i18n.exists('booking.discussion.withOwner'),
  youAreOwner: i18n.exists('booking.discussion.youAreOwner'),
  messagePlaceholder: i18n.exists('booking.discussion.messagePlaceholder'),
},
tValues: {
  // ... valeurs existantes
  withRenter: t('booking.discussion.withRenter'),
  withOwner: t('booking.discussion.withOwner'),
  messagePlaceholder: t('booking.discussion.messagePlaceholder'),
},
```

#### Critère de succès Passe 2

- ✅ Tous les `TODO(i18n)` sont remplacés par `t()`
- ✅ 0 texte FR hardcodé visible (sauf données DB dynamiques)
- ✅ Les traductions EN/IT/DE fonctionnent (changement de langue 🇬🇧/🇮🇹/🇩🇪)
- ✅ Les logs DEV montrent `exists: { ... } === true` pour toutes les nouvelles clés
- ✅ Le build passe (`npm run build`)

---

## D) LISTE DES FICHIERS À MODIFIER

### Fichiers TypeScript/TSX

1. **`src/pages/booking/BookingDiscussion.tsx`**
   - Ajouter `useTranslation()` hook
   - Remplacer textes hardcodés par `t()`
   - Ajouter logs DEV-only
   - Utiliser `formatDuration()` au lieu de `calculateRealDuration()`
   - Remplacer `fuelLabels` / `transmissionLabels` par `t()`

### Fichiers JSON (Passe 2 uniquement)

2. **`src/i18n/locales/fr/common.json`**
   - Ajouter `booking.discussion.*` (20+ nouvelles clés)

3. **`src/i18n/locales/en/common.json`**
   - Ajouter `booking.discussion.*` (traductions anglaises)

4. **`src/i18n/locales/it/common.json`** (optionnel)
   - Ajouter `booking.discussion.*` (traductions italiennes)

5. **`src/i18n/locales/de/common.json`** (optionnel)
   - Ajouter `booking.discussion.*` (traductions allemandes)

### Fichiers de test / documentation

6. **`DIAGNOSTIC-I18N-BOOKING-DISCUSSION.md`** (ce fichier)
   - Documenter les changements

---

## E) VALIDATION FINALE

### Checklist avant merge

- [ ] Passe 1 complétée : toutes les clés existantes utilisées
- [ ] Passe 2 complétée : toutes les nouvelles clés ajoutées et utilisées
- [ ] 0 clé brute visible (`"common.xxx"` ou `"booking.xxx"`)
- [ ] 0 texte FR hardcodé (sauf données DB)
- [ ] Logs DEV montrent `exists: true` pour toutes les clés
- [ ] Build passe (`npm run build`)
- [ ] Test manuel : changement de langue 🇬🇧/🇫🇷 fonctionne
- [ ] Test manuel : tous les textes changent correctement
- [ ] Test manuel : pas de régression sur les autres pages

### Tests manuels à effectuer

1. **En français (FR)** :
   - Ouvrir la page discussion
   - Vérifier que tous les textes sont en français
   - Vérifier que les données dynamiques (prix, dates, noms) s'affichent correctement

2. **En anglais (EN)** :
   - Changer la langue vers 🇬🇧
   - Vérifier que tous les textes sont en anglais
   - Vérifier que les données dynamiques restent formatées correctement

3. **Régression** :
   - Vérifier que la Home fonctionne toujours
   - Vérifier que `MotoVehicleDetails` fonctionne toujours
   - Vérifier que `BookingConfirmationModal` fonctionne toujours

---

## F) NOTES IMPORTANTES

### ⚠️ Contraintes anti-régression

1. **NE PAS modifier** `src/i18n/config.ts` (defaultNS/ns/resources) sauf preuve runtime indispensable
2. **NE PAS créer** de nouvelles clés tant qu'une clé existante ne peut pas être réutilisée
3. **Toujours aligner** le pattern avec `BookingConfirmationModal.tsx` et `MotoVehicleDetails.tsx`
4. **Interdire** l'affichage de clés brutes : utiliser `TODO(i18n)` + fallback temporaire si nécessaire
5. **Ne pas casser** les autres pages : vérifier que les composants partagés (Navbar, Footer) ne sont pas impactés

### 📝 Pattern à suivre

- **Hook** : `const { t, i18n } = useTranslation();` (namespace implicite via `defaultNS: "common"`)
- **Clés** : Toujours préfixer par le namespace (ex: `booking.discussion.*`, `motoDetails.*`)
- **Interpolation** : Utiliser `t('key', { var: value })` pour les variables
- **Pluriels** : Utiliser `duration.day` / `duration.day_one` / `duration.day_other` avec `count`
- **Logs DEV** : Toujours ajouter des logs DEV-only pour diagnostiquer les problèmes

### 🔍 Points d'attention

- Les messages utilisateur (`messages[].content`) ne doivent **PAS** être traduits (données DB)
- Les noms propres (`owner.firstName`, `vehicle.brand`) ne doivent **PAS** être traduits (données DB)
- Les prix (`{price}€`) ne doivent **PAS** être traduits (données DB)
- Les dates formatées doivent utiliser `formatDate()` avec locale dynamique (déjà fait dans `BookingConfirmationModal.tsx`)

---

**Fin du diagnostic**

