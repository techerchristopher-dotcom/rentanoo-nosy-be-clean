# DIAGNOSTIC i18n — Textes FR résiduels dans RenterBookingCard

**Date:** 2025-01-XX  
**Composant:** `RenterBookingCard.tsx`  
**Périmètre:** `/me/renter/bookings` (page `RenterBookings.tsx`)

---

## 1. Identification du composant

### Composant exact
- **Fichier:** `src/components/RenterBookingCard.tsx`
- **Nom composant:** `RenterBookingCard` (export default)
- **Ligne de définition:** Ligne 91

### Utilisation
- **Page parent:** `src/pages/renter/RenterBookings.tsx`
- **Ligne d'import:** Ligne 20
- **Ligne d'utilisation:** Ligne 857-872
- **Props reçues:**
  - `booking: BookingWithDetails`
  - `isExpanded: boolean`
  - `toggleExpanded: (id: string) => void`
  - `formatDate: (date: string) => string` ⚠️ **Formatage externe**
  - `getDuration: (start: string, end: string) => string` ⚠️ **Formatage externe**
  - `onBookingDeleted`, `onBookingUpdated`, `onRequestPay`

---

## 2. Inventaire des textes FR visibles (source de vérité)

### Liste exhaustive des textes FR hardcodés dans le JSX

| Texte FR | Ligne | Contexte | Hardcodé ? |
|----------|-------|----------|------------|
| `"Paiement confirmé"` | 233 | `getUserBookingStatusUI()` | ✅ OUI |
| `"En attente de la caution"` | 234 | `getUserBookingStatusUI()` | ✅ OUI |
| `"Finaliser ma réservation"` | 238 | `getUserBookingStatusUI()` | ✅ OUI |
| `"Prêt à partir"` | 245 | `getUserBookingStatusUI()` | ✅ OUI |
| `"Paiement et caution validés"` | 246 | `getUserBookingStatusUI()` | ✅ OUI |
| `"En cours"` | 257 | `getUserBookingStatusUI()` | ✅ OUI |
| `"Terminé"` | 268 | `getUserBookingStatusUI()` | ✅ OUI |
| `"Annulée"` | 279 | `getUserBookingStatusUI()` | ✅ OUI |
| `"1 jour"` | 212 | `calculateRealDuration()` | ✅ OUI |
| `"jour"` / `"jours"` | 214, 218 | `calculateRealDuration()` | ✅ OUI |
| `"heure"` / `"heures"` | 218 | `calculateRealDuration()` | ✅ OUI |
| `"Début:"` | 806 | Label JSX | ✅ OUI |
| `"Fin:"` | 823 | Label JSX | ✅ OUI |
| `"Durée:"` | 839 | Label JSX | ✅ OUI |
| `"Total:"` | 846 | Label JSX | ✅ OUI |
| `"Location ({durationText})"` | 922 | Tooltip détail prix | ✅ OUI |
| `"Options supplémentaires"` | 947 | Tooltip détail prix | ✅ OUI |
| `"Sous-total"` | 930 | Tooltip détail prix | ✅ OUI |
| `"Frais de service (15%)"` | 935 | Tooltip détail prix | ✅ OUI |
| `"TOTAL"` | 938 | Tooltip détail prix | ✅ OUI |
| `"✨ Services supplémentaires:"` | 957 | Section options | ✅ OUI |
| `"Payer ma location"` | 1105 | Bouton CTA | ✅ OUI |
| `"Annuler"` | 1131 | Bouton annulation | ✅ OUI |
| `"Annuler la réservation"` | 1136 | DialogTitle modal | ✅ OUI |
| `"Sélectionnez un motif ou rédigez votre message."` | 1137 | DialogDescription | ✅ OUI |
| `"Changement de dates"` | 1143-1144 | RadioGroupItem + Label | ✅ OUI |
| `"Trouvé une autre option"` | 1147-1148 | RadioGroupItem + Label | ✅ OUI |
| `"Imprévu personnel"` | 1151-1152 | RadioGroupItem + Label | ✅ OUI |
| `"Erreur de réservation"` | 1155-1156 | RadioGroupItem + Label | ✅ OUI |
| `"Autre raison (personnalisée)"` | 1159-1160 | RadioGroupItem + Label | ✅ OUI |
| `"Expliquez votre motif"` | 1166 | Label textarea | ✅ OUI |
| `"Ex: Mon planning a changé..."` | 1167 | Textarea placeholder | ✅ OUI |
| `"Retour"` | 1172 | Bouton modal | ✅ OUI |
| `"Annulation..."` | 1174 | Bouton modal (loading) | ✅ OUI |
| `"Confirmer"` | 1174, 1197 | Boutons | ✅ OUI |
| `"Fonctionnalité à venir"` | 1189 | Toast title | ✅ OUI |
| `"La confirmation de réservation sera bientôt disponible"` | 1191 | Toast description | ✅ OUI |
| `"Détails de votre réservation"` | 1233 | DialogTitle modal détails | ✅ OUI |
| `"Réservation #..."` | 1237 | Texte modal | ✅ OUI |
| `"Créée le"` | 1241 | Texte modal (formatage date) | ✅ OUI |
| `"Année {year}"` | 1265 | Texte modal | ✅ OUI |
| `"Informations client"` | 1281 | Titre section modal | ✅ OUI |
| `"Nom"` | 1286 | Label modal | ✅ OUI |
| `"Prénom"` | 1290 | Label modal | ✅ OUI |
| `"Téléphone"` | 1294 | Label modal | ✅ OUI |
| `"Email"` | 1298 | Label modal | ✅ OUI |
| `"Non renseigné"` | 1287, 1291, 1295, 1299 | Fallback modal | ✅ OUI |
| `"Zone de prise en charge"` | 1313 | Label modal | ✅ OUI |
| `"Non spécifiée"` | 1315 | Fallback modal | ✅ OUI |
| `"Dates de location"` | 1328 | Titre section modal | ✅ OUI |
| `"Départ"` | 1333 | Label modal | ✅ OUI |
| `"Retour"` | 1344 | Label modal | ✅ OUI |
| `"Durée :"` | 1357 | Badge modal | ✅ OUI |
| `"Tarif de base"` | 1350 | Titre section modal | ✅ OUI |
| `"Location véhicule"` | 1357 | Label modal | ✅ OUI |
| `"/jour ×"` | 1416 | Format prix/jour | ✅ OUI |
| `"Options sélectionnées"` | 1433 | Titre section modal | ✅ OUI |
| `"Sous-total options"` | 1469 | Label modal | ✅ OUI |
| `"Sous-total"` | 1485 | Label modal | ✅ OUI |
| `"Frais de service (15%)"` | 1519 | Label modal | ✅ OUI |
| `"TOTAL À PAYER"` | 1560 | Label modal | ✅ OUI |
| `"Télécharger en PDF"` | 1607 | Bouton modal | ✅ OUI |
| `"Fermer"` | 1613 | Bouton modal | ✅ OUI |
| `"Bonjour {ownerName}, cliquez ici pour discuter avec moi"` | 775 | Tooltip message | ✅ OUI |
| `"Propriétaire"` | 775 | Fallback owner | ✅ OUI |
| `"Mise à jour le :"` | 690, 701 | Texte statut annulé | ✅ OUI |
| `"Réservation refusée"` | 676 | Fallback statut declined | ✅ OUI |

**Total:** ~60+ occurrences de textes FR hardcodés

---

## 3. Vérification de l'usage i18n

### Hook `useTranslation()` utilisé
- **Ligne 103:** `const { t, i18n } = useTranslation("common")`
- **Namespace:** `"common"` (explicite)
- ✅ Le composant utilise bien i18n

### Clés i18n existantes (vérifiées dans `en/common.json`)

| Clé i18n | Existe EN ? | Ligne EN | Traduction EN |
|----------|-------------|----------|---------------|
| `bookings.card.startLabel` | ✅ OUI | 717 | `"Start:"` |
| `bookings.card.endLabel` | ✅ OUI | 718 | `"End:"` |
| `bookings.card.totalLabel` | ✅ OUI | 719 | `"Total:"` |
| `bookings.status.paymentConfirmed` | ✅ OUI | 725 | `"Payment confirmed"` |
| `bookings.status.depositPending` | ✅ OUI | 726 | `"Deposit pending"` |
| `bookings.status.readyToGo` | ✅ OUI | 727 | `"Ready to go"` |
| `bookings.status.active` | ✅ OUI | 729 | `"Ongoing"` |
| `bookings.status.completed` | ✅ OUI | 730 | `"Completed"` |
| `bookings.status.cancelled` | ✅ OUI | 731 | `"Cancelled"` |
| `bookings.cancel.title` | ✅ OUI | 734 | `"Cancel booking"` |
| `bookings.cancel.description` | ✅ OUI | 735 | `"Select a reason or write your message."` |
| `bookings.cancel.reason.dateChange` | ✅ OUI | 737 | `"Date change"` |
| `bookings.cancel.reason.otherOption` | ✅ OUI | 738 | `"Found another option"` |
| `bookings.cancel.reason.personalIssue` | ✅ OUI | 739 | `"Personal issue"` |
| `bookings.cancel.reason.bookingError` | ✅ OUI | 740 | `"Booking error"` |
| `bookings.cancel.reason.custom` | ✅ OUI | 741 | `"Other reason (custom)"` |
| `bookings.cancel.reasonLabel` | ✅ OUI | 743 | `"Explain your reason"` |
| `bookings.cancel.reasonPlaceholder` | ✅ OUI | 744 | `"Ex: My schedule changed..."` |
| `bookings.cancel.back` | ✅ OUI | 745 | `"Back"` |
| `bookings.cancel.confirm` | ✅ OUI | 746 | `"Confirm"` |
| `bookings.cancel.processing` | ✅ OUI | 747 | `"Cancelling..."` |
| `bookings.details.title` | ✅ OUI | 760 | `"Your booking details"` |
| `bookings.details.referenceNumber` | ✅ OUI | 761 | `"Booking #{{referenceNumber}}"` |
| `bookings.details.createdAt` | ✅ OUI | 762 | `"Created on {{date}}"` |
| `bookings.details.yearLabel` | ✅ OUI | 763 | `"Year {{year}}"` |
| `bookings.details.clientInfo` | ✅ OUI | 764 | `"Client information"` |
| `bookings.details.lastName` | ✅ OUI | 765 | `"Last name"` |
| `bookings.details.firstName` | ✅ OUI | 766 | `"First name"` |
| `bookings.details.phone` | ✅ OUI | 767 | `"Phone"` |
| `bookings.details.email` | ✅ OUI | 768 | `"Email"` |
| `bookings.details.notProvided` | ✅ OUI | 769 | `"Not provided"` |
| `bookings.details.pickupZone` | ✅ OUI | 770 | `"Pickup zone"` |
| `bookings.details.notSpecified` | ✅ OUI | 771 | `"Not specified"` |
| `bookings.details.rentalDates` | ✅ OUI | 772 | `"Rental dates"` |
| `bookings.details.baseRate` | ✅ OUI | 773 | `"Base rate"` |
| `bookings.details.downloadPdf` | ✅ OUI | 775 | `"Download PDF"` |
| `bookings.details.close` | ✅ OUI | 776 | `"Close"` |
| `common.annuler` | ✅ OUI | 5 | `"Cancel"` |

**Conclusion:** Les clés i18n existent en EN mais **ne sont PAS utilisées** dans le composant.

---

## 4. Diagnostic "langue réelle" (log DEV-only)

### Log ajouté (lignes 157-188)
```typescript
useEffect(() => {
  if (import.meta.env.DEV) {
    const criticalKeys = [
      'bookings.card.startLabel',
      'bookings.card.endLabel',
      'bookings.card.totalLabel',
      'bookings.status.paymentConfirmed',
      // ... autres clés
    ]
    
    console.info('[card-i18n-debug]', {
      language: i18n.language,
      resolvedLanguage: i18n.resolvedLanguage,
      defaultNS: i18n.options.defaultNS,
      fallbackLng: i18n.options.fallbackLng,
      sample: criticalKeys.map(key => ({
        key,
        exists: i18n.exists(key),
        t_current: t(key),
        t_en: t(key, { lng: 'en' }),
        t_fr: t(key, { lng: 'fr' }),
      }))
    })
  }
}, [i18n, t])
```

**À vérifier en console:** Le log affichera la langue réelle et les traductions disponibles.

---

## 5. Dates/formatage (cause très probable)

### Formatage des dates

#### Formatage interne (dans le composant)
- **Ligne 815:** `format(date, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })`
- **Ligne 830:** `format(date, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })`
- **Ligne 680:** `format(new Date(updatedTs), "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })`
- **Ligne 1241:** `format(new Date(booking.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })`
- **Ligne 1335:** `format(new Date(booking.startDate), "EEEE d MMMM yyyy", { locale: dateLocale })`
- **Ligne 1346:** `format(new Date(booking.endDate), "EEEE d MMMM yyyy", { locale: dateLocale })`

**Locale utilisée (lignes 106-111):**
```typescript
const currentLang = i18n.language || "fr"
const dateLocale =
  currentLang.startsWith("fr") ? fr :
  currentLang.startsWith("it") ? itLocale :
  currentLang.startsWith("de") ? deLocale :
  enUS
```

✅ **Le formatage des dates utilise bien la locale dynamique** (pas hardcodé FR).

#### Formatage externe (via props)
- **Props `formatDate` et `getDuration`:** Passées depuis `RenterBookings.tsx`
- ⚠️ **À vérifier:** Ces fonctions peuvent être hardcodées FR dans la page parent.

#### Formatage durée (`calculateRealDuration`)
- **Lignes 212-218:** Retourne des strings hardcodées FR:
  - `"1 jour"`
  - `"${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}"`
  - `"${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}"`

❌ **Catégorie D:** Formatage durée hardcodé FR.

---

## 6. Classification des textes FR par catégorie

### Catégorie A: UI hardcodée (à remplacer par `t()`)
**~55 occurrences**

| Texte FR | Ligne | Clé i18n disponible |
|----------|-------|---------------------|
| `"Paiement confirmé"` | 233 | `bookings.status.paymentConfirmed` ✅ |
| `"En attente de la caution"` | 234 | `bookings.status.depositPending` ✅ |
| `"Finaliser ma réservation"` | 238 | `bookings.card.finalizeBooking` ✅ |
| `"Prêt à partir"` | 245 | `bookings.status.readyToGo` ✅ |
| `"Paiement et caution validés"` | 246 | `bookings.status.paymentDepositValidated` ✅ |
| `"En cours"` | 257 | `bookings.status.active` ✅ |
| `"Terminé"` | 268 | `bookings.status.completed` ✅ |
| `"Annulée"` | 279 | `bookings.status.cancelled` ✅ |
| `"Début:"` | 806 | `bookings.card.startLabel` ✅ |
| `"Fin:"` | 823 | `bookings.card.endLabel` ✅ |
| `"Durée:"` | 839 | ❌ **MANQUANTE** (`bookings.card.durationLabel` n'existe pas) |
| `"Total:"` | 846 | `bookings.card.totalLabel` ✅ |
| `"Annuler"` | 1131 | `common.annuler` ✅ |
| `"Annuler la réservation"` | 1136 | `bookings.cancel.title` ✅ |
| `"Sélectionnez un motif..."` | 1137 | `bookings.cancel.description` ✅ |
| `"Changement de dates"` | 1143 | `bookings.cancel.reason.dateChange` ✅ |
| `"Trouvé une autre option"` | 1147 | `bookings.cancel.reason.otherOption` ✅ |
| `"Imprévu personnel"` | 1151 | `bookings.cancel.reason.personalIssue` ✅ |
| `"Erreur de réservation"` | 1155 | `bookings.cancel.reason.bookingError` ✅ |
| `"Autre raison (personnalisée)"` | 1159 | `bookings.cancel.reason.custom` ✅ |
| `"Expliquez votre motif"` | 1166 | `bookings.cancel.reasonLabel` ✅ |
| `"Ex: Mon planning a changé..."` | 1167 | `bookings.cancel.reasonPlaceholder` ✅ |
| `"Retour"` | 1172 | `bookings.cancel.back` ✅ |
| `"Annulation..."` | 1174 | `bookings.cancel.processing` ✅ |
| `"Confirmer"` | 1174, 1197 | `bookings.cancel.confirm` ✅ |
| `"Détails de votre réservation"` | 1233 | `bookings.details.title` ✅ |
| `"Réservation #..."` | 1237 | `bookings.details.referenceNumber` ✅ |
| `"Créée le"` | 1241 | `bookings.details.createdAt` ✅ (mais formatage date à vérifier) |
| `"Année {year}"` | 1265 | `bookings.details.yearLabel` ✅ |
| `"Informations client"` | 1281 | `bookings.details.clientInfo` ✅ |
| `"Nom"` | 1286 | `bookings.details.lastName` ✅ |
| `"Prénom"` | 1290 | `bookings.details.firstName` ✅ |
| `"Téléphone"` | 1294 | `bookings.details.phone` ✅ |
| `"Email"` | 1298 | `bookings.details.email` ✅ |
| `"Non renseigné"` | 1287+ | `bookings.details.notProvided` ✅ |
| `"Zone de prise en charge"` | 1313 | `bookings.details.pickupZone` ✅ |
| `"Non spécifiée"` | 1315 | `bookings.details.notSpecified` ✅ |
| `"Dates de location"` | 1328 | `bookings.details.rentalDates` ✅ |
| `"Départ"` | 1333 | ❌ **MANQUANTE** |
| `"Retour"` | 1344 | ❌ **MANQUANTE** |
| `"Durée :"` | 1357 | ❌ **MANQUANTE** |
| `"Tarif de base"` | 1350 | `bookings.details.baseRate` ✅ |
| `"Télécharger en PDF"` | 1607 | `bookings.details.downloadPdf` ✅ |
| `"Fermer"` | 1613 | `bookings.details.close` ✅ |

**Clés manquantes à créer:**
- `bookings.card.durationLabel` → `"Duration:"`
- `bookings.details.departure` → `"Departure"`
- `bookings.details.return` → `"Return"`
- `bookings.details.duration` → `"Duration:"`
- `bookings.card.servicesTitle` → `"Additional services:"`
- `bookings.details.selectedOptions` → `"Selected options"`
- `bookings.details.optionsSubtotal` → `"Options subtotal"`
- `bookings.details.subtotal` → `"Subtotal"`
- `bookings.details.serviceFee` → `"Service fee (15%)"`
- `bookings.details.totalToPay` → `"TOTAL TO PAY"`
- `bookings.details.vehicleRental` → `"Vehicle rental"`
- `bookings.details.payBooking` → `"Pay my booking"`
- `bookings.details.messageTooltip` → `"Hello {{ownerName}}, click here to chat with me"`
- `bookings.details.ownerFallback` → `"Owner"`
- `bookings.details.updatedAt` → `"Updated on:"`
- `bookings.details.bookingRefused` → `"Booking refused"`

### Catégorie B: Clé i18n manquante / mauvaise traduction EN
**~10 occurrences**

Voir liste ci-dessus (clés manquantes).

### Catégorie C: Backend renvoie déjà du FR (API/DB)
**0 occurrence**

Aucun texte FR ne provient du backend.

### Catégorie D: Formatage date/heure/nombre hardcodé FR
**~8 occurrences**

| Texte FR | Ligne | Cause |
|----------|-------|-------|
| `"1 jour"` | 212 | `calculateRealDuration()` hardcodé |
| `"jour"` / `"jours"` | 214, 218 | `calculateRealDuration()` hardcodé |
| `"heure"` / `"heures"` | 218 | `calculateRealDuration()` hardcodé |
| `"/jour ×"` | 1416 | Format prix/jour hardcodé |
| Dates formatées "17 décembre" | 815, 830, etc. | ⚠️ **À vérifier:** Si `i18n.language` est bien "en", la locale devrait être `enUS` |

**Note:** Les dates utilisent `dateLocale` qui dépend de `i18n.language`. Si la langue est EN mais que les dates restent en FR, c'est que `i18n.language` n'est pas correctement défini.

### Catégorie E: Namespace non chargé / mauvais usage useTranslation
**0 occurrence**

Le namespace `"common"` est correctement utilisé.

---

## 7. Conclusion

### Cause(s) racine(s)

1. **Cause principale:** **Textes FR hardcodés dans le JSX** (~55 occurrences)
   - Les clés i18n existent en EN mais ne sont **jamais utilisées** dans le composant
   - Preuve: `src/components/RenterBookingCard.tsx:233-279` (badges statut), `806-846` (labels), `1131-1613` (modals)

2. **Cause secondaire:** **Formatage durée hardcodé FR** (`calculateRealDuration()`)
   - Preuve: `src/components/RenterBookingCard.tsx:212-218`
   - Retourne des strings FR directement sans i18n

3. **Cause possible:** **Formatage dates externe** (via props `formatDate` / `getDuration`)
   - À vérifier dans `src/pages/renter/RenterBookings.tsx`
   - Si ces fonctions sont hardcodées FR, elles affecteront l'affichage

### Preuves (fichier:ligne)

- **Badges statut FR:** `src/components/RenterBookingCard.tsx:233,234,238,245,246,257,268,279`
- **Labels FR:** `src/components/RenterBookingCard.tsx:806,823,839,846`
- **Durée FR:** `src/components/RenterBookingCard.tsx:212,214,218`
- **Modal annulation FR:** `src/components/RenterBookingCard.tsx:1131-1178`
- **Modal détails FR:** `src/components/RenterBookingCard.tsx:1233-1613`

### Fix minimal recommandé (sans implémenter)

1. **Remplacer tous les textes hardcodés par `t(...)`**
   - Exemple: `"Début:"` → `{t("bookings.card.startLabel")}`
   - Exemple: `"Paiement confirmé"` → `{t("bookings.status.paymentConfirmed")}`

2. **Créer les clés i18n manquantes**
   - Ajouter dans `en/common.json`: `bookings.card.durationLabel`, `bookings.details.departure`, `bookings.details.return`, etc.

3. **Internationaliser `calculateRealDuration()`**
   - Utiliser `t()` pour "jour"/"jours"/"heure"/"heures"
   - Exemple: `t("common.day", { count: completeDays })`

4. **Vérifier les props `formatDate` et `getDuration`**
   - S'assurer qu'elles utilisent i18n dans `RenterBookings.tsx`

5. **Vérifier la langue réelle en console**
   - Utiliser le log DEV-only ajouté pour confirmer que `i18n.language === "en"` quand l'UI est en EN

---

## 8. Log DEV-only ajouté

Un log DEV-only a été ajouté aux lignes 157-188 pour diagnostiquer:
- `i18n.language`
- `i18n.resolvedLanguage`
- `i18n.options.defaultNS`
- `i18n.options.fallbackLng`
- Existence et traduction de 11 clés critiques

**À consulter en console:** `[card-i18n-debug]`

---

**FIN DU DIAGNOSTIC**

