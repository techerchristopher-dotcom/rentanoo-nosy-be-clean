# LOT R1 — RenterBookingCard i18n — Résumé des modifications

**Date:** 2025-01-XX  
**Fichier modifié:** `src/components/RenterBookingCard.tsx`  
**Objectif:** Remplacer uniquement les textes FR hardcodés pour lesquels une clé i18n existe déjà (0 nouvelles clés JSON)

---

## Remplacements effectués (clés existantes)

### 1. Badges statut (`getUserBookingStatusUI()`)
- ✅ `"Paiement confirmé"` → `t('bookings.status.paymentConfirmed')` (ligne 236)
- ✅ `"En attente de la caution"` → `t('bookings.status.depositPending')` (ligne 237)
- ✅ `"Finaliser ma réservation"` → `t('bookings.card.finalizeBooking')` (ligne 241)
- ✅ `"Prêt à partir"` → `t('bookings.status.readyToGo')` (ligne 248)
- ✅ `"Paiement et caution validés"` → `t('bookings.status.paymentDepositValidated')` (ligne 249)
- ✅ `"En cours"` → `t('bookings.status.active')` (ligne 260)
- ✅ `"Terminé"` → `t('bookings.status.completed')` (ligne 271)
- ✅ `"Annulée"` → `t('bookings.status.cancelled')` (ligne 282)

### 2. Labels principaux
- ✅ `"Début:"` → `t('bookings.card.startLabel')` (ligne 809)
- ✅ `"Fin:"` → `t('bookings.card.endLabel')` (ligne 826)
- ✅ `"Total:"` → `t('bookings.card.totalLabel')` (ligne 849)

### 3. Modal annulation
- ✅ `"Annuler"` → `t('common.annuler')` (ligne 1140)
- ✅ `"Annuler la réservation"` → `t('bookings.cancel.title')` (ligne 1145)
- ✅ `"Sélectionnez un motif..."` → `t('bookings.cancel.description')` (ligne 1146)
- ✅ `"Changement de dates"` → `t('bookings.cancel.reason.dateChange')` (lignes 1152-1153)
- ✅ `"Trouvé une autre option"` → `t('bookings.cancel.reason.otherOption')` (lignes 1156-1157)
- ✅ `"Imprévu personnel"` → `t('bookings.cancel.reason.personalIssue')` (lignes 1160-1161)
- ✅ `"Erreur de réservation"` → `t('bookings.cancel.reason.bookingError')` (lignes 1164-1165)
- ✅ `"Autre raison (personnalisée)"` → `t('bookings.cancel.reason.custom')` (lignes 1168-1169)
- ✅ `"Expliquez votre motif"` → `t('bookings.cancel.reasonLabel')` (ligne 1175)
- ✅ `"Ex: Mon planning a changé..."` → `t('bookings.cancel.reasonPlaceholder')` (ligne 1176)
- ✅ `"Retour"` → `t('bookings.cancel.back')` (ligne 1181)
- ✅ `"Annulation..."` → `t('bookings.cancel.processing')` (ligne 1183)
- ✅ `"Confirmer"` → `t('bookings.cancel.confirm')` (lignes 1183, 1205)

### 4. Modal détails
- ✅ `"Détails de votre réservation"` → `t('bookings.details.title')` (ligne 1242)
- ✅ `"Réservation #..."` → `t('bookings.details.referenceNumber', { referenceNumber })` (ligne 1246)
- ✅ `"Créée le"` → `t('bookings.details.createdAt', { date })` (ligne 1250)
- ✅ `"Année {year}"` → `t('bookings.details.yearLabel', { year })` (ligne 1274)
- ✅ `"Informations client"` → `t('bookings.details.clientInfo')` (ligne 1290)
- ✅ `"Nom"` → `t('bookings.details.lastName')` (ligne 1295)
- ✅ `"Prénom"` → `t('bookings.details.firstName')` (ligne 1299)
- ✅ `"Téléphone"` → `t('bookings.details.phone')` (ligne 1303)
- ✅ `"Email"` → `t('bookings.details.email')` (ligne 1307)
- ✅ `"Non renseigné"` → `t('bookings.details.notProvided')` (lignes 1296, 1300, 1304, 1308)
- ✅ `"Zone de prise en charge"` → `t('bookings.details.pickupZone')` (ligne 1322)
- ✅ `"Non spécifiée"` → `t('bookings.details.notSpecified')` (ligne 1324)
- ✅ `"Dates de location"` → `t('bookings.details.rentalDates')` (ligne 1337)
- ✅ `"Tarif de base"` → `t('bookings.details.baseRate')` (ligne 1379)
- ✅ `"Télécharger en PDF"` → `t('bookings.details.downloadPdf')` (ligne 1628)
- ✅ `"Fermer"` → `t('bookings.details.close')` (ligne 1635)

### 5. Tooltip message
- ✅ `"Bonjour {ownerName}, cliquez ici..."` → `t('bookings.card.messageTooltip', { ownerName })` (ligne 778)
- ✅ `"Propriétaire"` → `t('bookings.card.ownerFallback')` (lignes 738, 778)

### 6. Toast
- ✅ `"Fonctionnalité à venir"` → `t('bookings.toasts.comingSoon')` (ligne 1198)
- ✅ `"La confirmation de réservation..."` → `t('bookings.toasts.comingSoonDescription')` (ligne 1199)

---

## TODO(i18n) ajoutés (clés manquantes)

Les textes suivants n'ont **pas** été remplacés car les clés i18n n'existent pas encore. Des commentaires `TODO(i18n)` ont été ajoutés :

1. **`bookings.card.durationLabel`** (ligne 845)
   - Texte: `"Durée:"`
   - Proposé EN: `"Duration:"`

2. **`bookings.details.vehicleRental`** (ligne 947)
   - Texte: `"Location ({durationText})"`
   - Proposé EN: `"Vehicle rental ({{duration}})"`

3. **`bookings.card.servicesTitle`** (lignes 954, 971)
   - Texte: `"Options supplémentaires"` / `"✨ Services supplémentaires:"`
   - Proposé EN: `"Additional services:"`

4. **`bookings.details.subtotal`** (lignes 960, 1537)
   - Texte: `"Sous-total"`
   - Proposé EN: `"Subtotal"`

5. **`bookings.details.serviceFee`** (lignes 965, 1538)
   - Texte: `"Frais de service (15%)"`
   - Proposé EN: `"Service fee (15%)"`

6. **`bookings.details.totalToPay`** (lignes 970, 1579)
   - Texte: `"TOTAL"` / `"TOTAL À PAYER"`
   - Proposé EN: `"TOTAL TO PAY"`

7. **`bookings.details.payBooking`** (ligne 1117)
   - Texte: `"Payer ma location"`
   - Proposé EN: `"Pay my booking"`

8. **`bookings.details.departure`** (ligne 1346)
   - Texte: `"Départ"`
   - Proposé EN: `"Departure"`

9. **`bookings.details.return`** (ligne 1358)
   - Texte: `"Retour"`
   - Proposé EN: `"Return"`

10. **`bookings.details.duration`** (ligne 1372)
    - Texte: `"Durée :"`
    - Proposé EN: `"Duration:"`

11. **`bookings.details.selectedOptions`** (ligne 1471)
    - Texte: `"Options sélectionnées"`
    - Proposé EN: `"Selected options"`

12. **`bookings.details.optionsSubtotal`** (ligne 1488)
    - Texte: `"Sous-total options"`
    - Proposé EN: `"Options subtotal"`

13. **`bookings.details.updatedAt`** (lignes 693, 706)
    - Texte: `"Mise à jour le :"`
    - Proposé EN: `"Updated on:"`

14. **`bookings.details.bookingRefused`** (ligne 702)
    - Texte: `"Réservation refusée"`
    - Proposé EN: `"Booking refused"`

---

## Textes non modifiés (hors périmètre LOT R1)

- **`calculateRealDuration()`** (lignes 212-218): Formatage durée hardcodé FR (`"1 jour"`, `"jours"`, `"heure"`, `"heures"`)
  - ⚠️ **Conservé tel quel** (sera traité dans un lot séparé pour la durée)

- **Props externes:** `formatDate` et `getDuration` (passées depuis `RenterBookings.tsx`)
  - ⚠️ **Conservées intactes** (seront vérifiées dans la page parent)

---

## Statistiques

- **Remplacements effectués:** ~40+ textes FR → `t(...)`
- **Clés i18n utilisées:** 30+ clés existantes
- **TODO(i18n) ajoutés:** 14 clés manquantes identifiées
- **Lignes modifiées:** ~50+ lignes
- **Erreurs lint:** 0
- **Nouvelles clés JSON créées:** 0 (conforme à l'objectif)

---

## Vérifications

- ✅ Build/lint: **OK** (aucune erreur)
- ✅ Clés i18n: Toutes vérifiées dans `en/common.json`
- ✅ Namespace: `useTranslation("common")` déjà présent
- ✅ Formatage dates: Non modifié (utilise déjà `dateLocale` dynamique)
- ✅ `calculateRealDuration()`: Non modifié (lot séparé prévu)

---

## Prochaines étapes recommandées

1. **LOT R2:** Créer les 14 clés i18n manquantes dans `en/common.json` (et autres locales)
2. **LOT R3:** Internationaliser `calculateRealDuration()` avec clés pluriels
3. **LOT R4:** Vérifier et internationaliser `formatDate`/`getDuration` dans `RenterBookings.tsx`

---

**FIN DU LOT R1**

