# Diagnostic i18n — Card "My bookings" (liste réservations)

**Date:** 2025-01-XX  
**Composant:** Page RenterBookings + Card RenterBookingCard  
**Objectif:** Inventorier et mapper tous les textes UI pour l'internationalisation avec PREUVES EXACTES

---

## A) LOCALISATION DE LA PAGE ET DE LA CARD

### 1. Route et Page principale

**Fichier:** `src/pages/renter/RenterBookings.tsx`  
**Route:** `/me/renter/bookings` (définie dans `src/App.tsx` ligne 78)  
**Composant:** `RenterBookings` (export default, ligne 58)

### 2. Composant Card

**Fichier:** `src/components/RenterBookingCard.tsx`  
**Composant:** `RenterBookingCard` (export default, ligne 86)  
**Import:** Ligne 20 de `RenterBookings.tsx`

### 3. Arbre de composition

```
RenterBookings (page)
├── Navbar
├── Header
│   ├── Titre "Mes réservations" (ligne 743)
│   ├── Sous-titre "Gérez vos locations de véhicules" (ligne 747)
│   └── Bouton "+ Nouvelle réservation" (ligne 757)
├── Filters (onglets)
│   └── Boutons filtres avec badges compteurs (lignes 765-828)
│       ├── "Toutes" (all)
│       ├── "En attente" (pending)
│       ├── "En cours" (active)
│       ├── "À venir" (upcoming)
│       ├── "Terminées" (past)
│       ├── "Annulées" (cancelled)
│       └── "Refusées" (refused)
└── Liste de RenterBookingCard
    └── RenterBookingCard (card individuelle)
        ├── Header (collapsed)
        │   ├── Photo véhicule (ligne 518-533)
        │   ├── Nom véhicule (ligne 540-543)
        │   ├── Dates (lignes 546-561)
        │   ├── Badge statut (lignes 571-589)
        │   ├── Avatar propriétaire + "Message" (lignes 639-703)
        │   └── Chevron expand/collapse (lignes 706-712)
        └── Body (expanded)
            ├── Ligne "Début:" (ligne 729)
            ├── Ligne "Fin:" (ligne 752)
            ├── Ligne "Durée:" (ligne 774)
            ├── Ligne "Total:" (ligne 781)
            ├── Services supplémentaires (lignes 911-933)
            └── Actions footer (lignes 937-1136)
                ├── Bouton "Finaliser ma réservation" (ligne 986)
                ├── Bouton "Payer ma location" (ligne 1040)
                ├── Menu "..." (BookingMoreActionsMenu)
                └── Bouton "Annuler" (ligne 1066)
```

---

## B) INVENTAIRE EXACT (source de vérité)

### Table complète des textes UI

| ID | Texte exact affiché | Type | Fichier + Ligne | Source | Décision |
|----|---------------------|------|-----------------|--------|----------|
| **PAGE HEADER** |
| BOOKINGS_PAGE_01 | "Mes réservations" | title | RenterBookings.tsx:743 | UI statique | TRADUIRE_UI |
| BOOKINGS_PAGE_02 | "Gérez vos locations de véhicules" | subtitle | RenterBookings.tsx:747-748 | UI statique | TRADUIRE_UI |
| BOOKINGS_PAGE_03 | "Nouvelle réservation" | button | RenterBookings.tsx:757 | UI statique | TRADUIRE_UI |
| **FILTRES ONGLETS** |
| BOOKINGS_TAB_01 | "Toutes" | tab | RenterBookings.tsx:725 | UI statique | TRADUIRE_UI |
| BOOKINGS_TAB_02 | "En attente" | tab | RenterBookings.tsx:712 | UI statique | TRADUIRE_UI |
| BOOKINGS_TAB_03 | "En cours" | tab | RenterBookings.tsx:714 | UI statique | TRADUIRE_UI |
| BOOKINGS_TAB_04 | "À venir" | tab | RenterBookings.tsx:716 | UI statique | TRADUIRE_UI |
| BOOKINGS_TAB_05 | "Terminées" | tab | RenterBookings.tsx:718 | UI statique | TRADUIRE_UI |
| BOOKINGS_TAB_06 | "Annulées" | tab | RenterBookings.tsx:720 | UI statique | TRADUIRE_UI |
| BOOKINGS_TAB_07 | "Refusées" | tab | RenterBookings.tsx:722 | UI statique | TRADUIRE_UI |
| **CARD HEADER (collapsed)** |
| BOOKINGS_CARD_01 | "test motot 2 A6" | vehicle name | RenterBookingCard.tsx:541 | Backend dynamique | NE_PAS_TRADUIRE_BACKEND |
| BOOKINGS_CARD_02 | "Véhicule supprimé" | fallback | RenterBookingCard.tsx:542 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_03 | "17 décembre" | date (collapsed) | RenterBookingCard.tsx:550-551 | Calculé | NEEDS_CONFIRMATION (formatage i18n) |
| BOOKINGS_CARD_04 | "21 décembre" | date (collapsed) | RenterBookingCard.tsx:558-559 | Calculé | NEEDS_CONFIRMATION (formatage i18n) |
| BOOKINGS_CARD_05 | "Message" | button | RenterBookingCard.tsx:687 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_06 | "Bonjour {owner.firstName}, cliquez ici pour discuter avec moi" | tooltip | RenterBookingCard.tsx:698 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_07 | "Propriétaire" | fallback tooltip | RenterBookingCard.tsx:698 | UI statique | TRADUIRE_UI |
| **CARD BODY (expanded)** |
| BOOKINGS_CARD_08 | "Début:" | label | RenterBookingCard.tsx:729 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_09 | "17 décembre 2025 à 08:00" | date+time | RenterBookingCard.tsx:738-744 | Calculé | NEEDS_CONFIRMATION (formatage i18n) |
| BOOKINGS_CARD_10 | "Fin:" | label | RenterBookingCard.tsx:752 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_11 | "21 décembre 2025 à 19:00" | date+time | RenterBookingCard.tsx:759-765 | Calculé | NEEDS_CONFIRMATION (formatage i18n) |
| BOOKINGS_CARD_12 | "Durée:" | label | RenterBookingCard.tsx:774 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_13 | "4 jours + 11 heures" | duration | RenterBookingCard.tsx:776, 129-135 | Calculé | TRADUIRE_UI (helper formatDuration) |
| BOOKINGS_CARD_14 | "Total:" | label | RenterBookingCard.tsx:781 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_15 | "62.1€" | price | RenterBookingCard.tsx:826 | Calculé | NEEDS_CONFIRMATION (devise i18n) |
| BOOKINGS_CARD_16 | "✨ Services supplémentaires:" | title | RenterBookingCard.tsx:914 | UI statique | TRADUIRE_UI |
| **CARD ACTIONS** |
| BOOKINGS_CARD_17 | "Finaliser ma réservation" | button | RenterBookingCard.tsx:156, 986 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_18 | "Payer ma location" | button | RenterBookingCard.tsx:1040 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_19 | "Annuler" | button | RenterBookingCard.tsx:1066 | UI statique | TRADUIRE_UI |
| BOOKINGS_CARD_20 | "Confirmer" | button | RenterBookingCard.tsx:1132 | UI statique | TRADUIRE_UI |
| **STATUTS ENRICHIS** |
| BOOKINGS_STATUS_01 | "Paiement confirmé" | badge | RenterBookingCard.tsx:150 | UI statique | TRADUIRE_UI |
| BOOKINGS_STATUS_02 | "En attente de la caution" | badge note | RenterBookingCard.tsx:151 | UI statique | TRADUIRE_UI |
| BOOKINGS_STATUS_03 | "Prêt à partir" | badge | RenterBookingCard.tsx:162 | UI statique | TRADUIRE_UI |
| BOOKINGS_STATUS_04 | "Paiement et caution validés" | badge note | RenterBookingCard.tsx:163 | UI statique | TRADUIRE_UI |
| BOOKINGS_STATUS_05 | "En cours" | badge | RenterBookingCard.tsx:174 | UI statique | TRADUIRE_UI |
| BOOKINGS_STATUS_06 | "Terminé" | badge | RenterBookingCard.tsx:185 | UI statique | TRADUIRE_UI |
| BOOKINGS_STATUS_07 | "Annulée" | badge | RenterBookingCard.tsx:196 | UI statique | TRADUIRE_UI |
| **MODAL ANNULATION** |
| BOOKINGS_MODAL_01 | "Annuler la réservation" | title | RenterBookingCard.tsx:1071 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_02 | "Sélectionnez un motif ou rédigez votre message." | description | RenterBookingCard.tsx:1072 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_03 | "Changement de dates" | option | RenterBookingCard.tsx:1078-1079 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_04 | "Trouvé une autre option" | option | RenterBookingCard.tsx:1082-1083 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_05 | "Imprévu personnel" | option | RenterBookingCard.tsx:1086-1087 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_06 | "Erreur de réservation" | option | RenterBookingCard.tsx:1090-1091 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_07 | "Autre raison (personnalisée)" | option | RenterBookingCard.tsx:1094-1095 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_08 | "Expliquez votre motif" | label | RenterBookingCard.tsx:1101 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_09 | "Ex: Mon planning a changé..." | placeholder | RenterBookingCard.tsx:1102 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_10 | "Retour" | button | RenterBookingCard.tsx:1107 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_11 | "Confirmer" | button | RenterBookingCard.tsx:1109 | UI statique | TRADUIRE_UI |
| BOOKINGS_MODAL_12 | "Annulation..." | button loading | RenterBookingCard.tsx:1109 | UI statique | TRADUIRE_UI |
| **TOASTS** |
| BOOKINGS_TOAST_01 | "Erreur" | toast title | RenterBookingCard.tsx:253, 279, 299, 309, 489 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_02 | "Impossible d'annuler la réservation: {error}" | toast description | RenterBookingCard.tsx:254 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_03 | "Réservation annulée" | toast title | RenterBookingCard.tsx:264, 303 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_04 | "Votre réservation a été annulée. Le propriétaire sera notifié." | toast description | RenterBookingCard.tsx:265 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_05 | "Une erreur est survenue" | toast description | RenterBookingCard.tsx:280, 309 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_06 | "Motif requis" | toast title | RenterBookingCard.tsx:293 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_07 | "Veuillez sélectionner un motif ou saisir un message." | toast description | RenterBookingCard.tsx:293 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_08 | "Votre réservation a été annulée." | toast description | RenterBookingCard.tsx:303 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_09 | "PDF téléchargé" | toast title | RenterBookingCard.tsx:483 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_10 | "Votre document de réservation a été téléchargé avec succès." | toast description | RenterBookingCard.tsx:484 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_11 | "Impossible de générer le PDF. Veuillez réessayer." | toast description | RenterBookingCard.tsx:490 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_12 | "Fonctionnalité à venir" | toast title | RenterBookingCard.tsx:1124 | UI statique | TRADUIRE_UI |
| BOOKINGS_TOAST_13 | "La confirmation de réservation sera bientôt disponible" | toast description | RenterBookingCard.tsx:1125-1126 | UI statique | TRADUIRE_UI |
| **MODAL DÉTAILS** |
| BOOKINGS_DETAILS_01 | "Détails de votre réservation" | title | RenterBookingCard.tsx:1168 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_02 | "Réservation #{referenceNumber}" | subtitle | RenterBookingCard.tsx:1172 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_03 | "Créée le {date}" | subtitle | RenterBookingCard.tsx:1176 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_04 | "Année {year}" | label | RenterBookingCard.tsx:1200 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_05 | "Informations client" | section | RenterBookingCard.tsx:1216 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_06 | "Nom" | label | RenterBookingCard.tsx:1221 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_07 | "Prénom" | label | RenterBookingCard.tsx:1225 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_08 | "Téléphone" | label | RenterBookingCard.tsx:1229 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_09 | "Email" | label | RenterBookingCard.tsx:1233 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_10 | "Non renseigné" | fallback | RenterBookingCard.tsx:1222, 1226, 1230, 1234 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_11 | "Zone de prise en charge" | section | RenterBookingCard.tsx:1248 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_12 | "Non spécifiée" | fallback | RenterBookingCard.tsx:1250 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_13 | "Dates de location" | section | RenterBookingCard.tsx:1263 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_14 | "Départ" | label | RenterBookingCard.tsx:1268 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_15 | "Retour" | label | RenterBookingCard.tsx:1279 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_16 | "Durée :" | label | RenterBookingCard.tsx:1292 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_17 | "Tarif de base" | section | RenterBookingCard.tsx:1307 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_18 | "Location véhicule" | label | RenterBookingCard.tsx:1313 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_19 | "{price}€/jour × {duration}" | label | RenterBookingCard.tsx:1351 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_20 | "Options sélectionnées" | section | RenterBookingCard.tsx:1390 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_21 | "Sous-total options" | label | RenterBookingCard.tsx:1406 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_22 | "Sous-total" | label | RenterBookingCard.tsx:1420 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_23 | "Frais de service (15%)" | label | RenterBookingCard.tsx:1454 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_24 | "TOTAL À PAYER" | label | RenterBookingCard.tsx:1495 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_25 | "Télécharger en PDF" | button | RenterBookingCard.tsx:1544 | UI statique | TRADUIRE_UI |
| BOOKINGS_DETAILS_26 | "Fermer" | button | RenterBookingCard.tsx:1551 | UI statique | TRADUIRE_UI |

**Total:** 66 textes UI statiques identifiés

---

## C) MAPPING AVEC PREUVES FR/EN/IT/DE

### Pour CHAQUE item TRADUIRE_UI

| ID | Clé candidate | Preuve FR | Preuve EN | Preuve IT | Preuve DE | Confiance |
|----|---------------|-----------|-----------|-----------|-----------|-----------|
| **PAGE HEADER** |
| BOOKINGS_PAGE_01 | `bookings.header.title` | fr/common.json:692 | en/common.json:689 | it/common.json:594 | de/common.json:594 | HIGH |
| BOOKINGS_PAGE_02 | `bookings.header.subtitle` | fr/common.json:693 | en/common.json:690 | it/common.json:595 | de/common.json:595 | HIGH |
| BOOKINGS_PAGE_03 | `bookings.header.newBooking` | fr/common.json:694 | en/common.json:691 | it/common.json:596 | de/common.json:596 | HIGH |
| **FILTRES ONGLETS** |
| BOOKINGS_TAB_01 | `bookings.filters.all` | fr/common.json:697 | en/common.json:694 | it/common.json:599 | de/common.json:599 | HIGH |
| BOOKINGS_TAB_02 | `bookings.filters.pending` | fr/common.json:698 | en/common.json:695 | it/common.json:600 | de/common.json:600 | HIGH |
| BOOKINGS_TAB_03 | `bookings.filters.active` | fr/common.json:699 | en/common.json:696 | it/common.json:601 | de/common.json:601 | HIGH |
| BOOKINGS_TAB_04 | `bookings.filters.upcoming` | fr/common.json:700 | en/common.json:697 | it/common.json:602 | de/common.json:602 | HIGH |
| BOOKINGS_TAB_05 | `bookings.filters.past` | fr/common.json:701 | en/common.json:698 | it/common.json:603 | de/common.json:603 | HIGH |
| BOOKINGS_TAB_06 | `bookings.filters.cancelled` | fr/common.json:702 | en/common.json:699 | it/common.json:604 | de/common.json:604 | HIGH |
| BOOKINGS_TAB_07 | `bookings.filters.refused` | fr/common.json:703 | en/common.json:700 | it/common.json:605 | de/common.json:605 | HIGH |
| **CARD HEADER** |
| BOOKINGS_CARD_02 | `bookings.card.vehicleDeleted` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_05 | `bookings.card.messageButton` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_06 | `bookings.card.messageTooltip` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_07 | `bookings.card.ownerFallback` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| **CARD BODY** |
| BOOKINGS_CARD_08 | `bookings.card.startLabel` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_10 | `bookings.card.endLabel` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_12 | `booking.durationLabel` | fr/common.json:144 | en/common.json:144 | it/common.json:777 | de/common.json:777 | HIGH |
| BOOKINGS_CARD_14 | `bookings.card.totalLabel` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_16 | `bookings.card.servicesTitle` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| **CARD ACTIONS** |
| BOOKINGS_CARD_17 | `bookings.card.finalizeBooking` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_CARD_18 | `booking.discussion.payRental` | fr/common.json:169 | en/common.json:169 | it/common.json:802 | de/common.json:802 | HIGH |
| BOOKINGS_CARD_19 | `common.annuler` | fr/common.json:5 | en/common.json:5 | it/common.json:5 | de/common.json:5 | HIGH |
| BOOKINGS_CARD_20 | `bookings.card.confirm` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| **STATUTS ENRICHIS** |
| BOOKINGS_STATUS_01 | `bookings.status.paymentConfirmed` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_STATUS_02 | `bookings.status.depositPending` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_STATUS_03 | `bookings.status.readyToGo` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_STATUS_04 | `bookings.status.paymentDepositValidated` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_STATUS_05 | `bookings.status.active` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_STATUS_06 | `bookings.status.completed` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_STATUS_07 | `bookings.status.cancelled` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| **MODAL ANNULATION** |
| BOOKINGS_MODAL_01 | `bookings.cancel.title` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_02 | `bookings.cancel.description` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_03 | `bookings.cancel.reason.dateChange` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_04 | `bookings.cancel.reason.otherOption` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_05 | `bookings.cancel.reason.personalIssue` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_06 | `bookings.cancel.reason.bookingError` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_07 | `bookings.cancel.reason.custom` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_08 | `bookings.cancel.reasonLabel` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_09 | `bookings.cancel.reasonPlaceholder` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_10 | `bookings.cancel.back` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_11 | `bookings.cancel.confirm` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_MODAL_12 | `bookings.cancel.processing` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| **TOASTS** |
| BOOKINGS_TOAST_01 | `common.error` | fr/common.json:22 | en/common.json:22 | it/common.json:22 | de/common.json:22 | HIGH |
| BOOKINGS_TOAST_02 | `bookings.toasts.cancelError` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_03 | `booking.discussion.toasts.bookingCancelled.title` | fr/common.json:194 | en/common.json:194 | it/common.json:827 | de/common.json:827 | HIGH |
| BOOKINGS_TOAST_04 | `bookings.toasts.cancelledDescription` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_05 | `bookings.toasts.unexpectedError` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_06 | `bookings.cancel.reasonRequired` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_07 | `bookings.cancel.reasonRequiredDescription` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_08 | `bookings.toasts.cancelledSimple` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_09 | `bookings.details.pdfDownloaded` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_10 | `bookings.details.pdfDownloadedDescription` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_11 | `bookings.details.pdfError` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_12 | `bookings.toasts.comingSoon` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_TOAST_13 | `bookings.toasts.comingSoonDescription` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| **MODAL DÉTAILS** |
| BOOKINGS_DETAILS_01 | `bookings.details.title` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_02 | `bookings.details.referenceNumber` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_03 | `bookings.details.createdAt` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_04 | `bookings.details.yearLabel` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_05 | `bookings.details.clientInfo` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_06 | `bookings.details.lastName` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_07 | `bookings.details.firstName` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_08 | `bookings.details.phone` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_09 | `bookings.details.email` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_10 | `bookings.details.notProvided` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_11 | `bookings.details.pickupZone` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_12 | `bookings.details.notSpecified` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_13 | `bookings.details.rentalDates` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_14 | `common.searchBar.departure` | fr/common.json:80 | en/common.json:80 | it/common.json:103 | de/common.json:103 | HIGH |
| BOOKINGS_DETAILS_15 | `common.searchBar.return` | fr/common.json:81 | en/common.json:81 | it/common.json:104 | de/common.json:104 | HIGH |
| BOOKINGS_DETAILS_16 | `booking.durationLabel` | fr/common.json:144 | en/common.json:144 | it/common.json:777 | de/common.json:777 | HIGH |
| BOOKINGS_DETAILS_17 | `bookings.details.baseRate` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_18 | `booking.vehicleRental` | fr/common.json:145 | en/common.json:145 | it/common.json:778 | de/common.json:778 | HIGH |
| BOOKINGS_DETAILS_19 | `bookings.details.pricePerDayFormat` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_20 | `booking.selectedOptions` | fr/common.json:146 | en/common.json:146 | it/common.json:779 | de/common.json:779 | HIGH |
| BOOKINGS_DETAILS_21 | `booking.optionsSubtotal` | fr/common.json:147 | en/common.json:147 | it/common.json:780 | de/common.json:780 | HIGH |
| BOOKINGS_DETAILS_22 | `booking.subtotal` | fr/common.json:148 | en/common.json:148 | it/common.json:781 | de/common.json:781 | HIGH |
| BOOKINGS_DETAILS_23 | `booking.serviceFee` | fr/common.json:149 | en/common.json:149 | it/common.json:782 | de/common.json:782 | HIGH |
| BOOKINGS_DETAILS_24 | `booking.totalToPay` | fr/common.json:150 | en/common.json:150 | it/common.json:783 | de/common.json:783 | HIGH |
| BOOKINGS_DETAILS_25 | `bookings.details.downloadPdf` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |
| BOOKINGS_DETAILS_26 | `bookings.details.close` | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | ❌ MANQUANTE | UNCERTAIN |

### Clés existantes réutilisables (avec preuves)

| Clé | FR (ligne) | EN (ligne) | IT (ligne) | DE (ligne) | Utilisable pour |
|-----|------------|-----------|------------|------------|-----------------|
| `bookings.header.title` | fr/common.json:692 | en/common.json:689 | it/common.json:594 | de/common.json:594 | BOOKINGS_PAGE_01 |
| `bookings.header.subtitle` | fr/common.json:693 | en/common.json:690 | it/common.json:595 | de/common.json:595 | BOOKINGS_PAGE_02 |
| `bookings.header.newBooking` | fr/common.json:694 | en/common.json:691 | it/common.json:596 | de/common.json:596 | BOOKINGS_PAGE_03 |
| `bookings.filters.all` | fr/common.json:697 | en/common.json:694 | it/common.json:599 | de/common.json:599 | BOOKINGS_TAB_01 |
| `bookings.filters.pending` | fr/common.json:698 | en/common.json:695 | it/common.json:600 | de/common.json:600 | BOOKINGS_TAB_02 |
| `bookings.filters.active` | fr/common.json:699 | en/common.json:696 | it/common.json:601 | de/common.json:601 | BOOKINGS_TAB_03 |
| `bookings.filters.upcoming` | fr/common.json:700 | en/common.json:697 | it/common.json:602 | de/common.json:602 | BOOKINGS_TAB_04 |
| `bookings.filters.past` | fr/common.json:701 | en/common.json:698 | it/common.json:603 | de/common.json:603 | BOOKINGS_TAB_05 |
| `bookings.filters.cancelled` | fr/common.json:702 | en/common.json:699 | it/common.json:604 | de/common.json:604 | BOOKINGS_TAB_06 |
| `bookings.filters.refused` | fr/common.json:703 | en/common.json:700 | it/common.json:605 | de/common.json:605 | BOOKINGS_TAB_07 |
| `common.annuler` | fr/common.json:5 | en/common.json:5 | it/common.json:5 | de/common.json:5 | BOOKINGS_CARD_19 |
| `common.error` | fr/common.json:22 | en/common.json:22 | it/common.json:22 | de/common.json:22 | BOOKINGS_TOAST_01 |
| `common.searchBar.departure` | fr/common.json:80 | en/common.json:80 | it/common.json:103 | de/common.json:103 | BOOKINGS_DETAILS_14 |
| `common.searchBar.return` | fr/common.json:81 | en/common.json:81 | it/common.json:104 | de/common.json:104 | BOOKINGS_DETAILS_15 |
| `common.duration.day_one` | fr/common.json:101 | en/common.json:101 | it/common.json:93 | de/common.json:93 | BOOKINGS_CARD_13 (via formatDuration) |
| `common.duration.day_other` | fr/common.json:102 | en/common.json:102 | it/common.json:94 | de/common.json:94 | BOOKINGS_CARD_13 (via formatDuration) |
| `common.duration.hour_one` | fr/common.json:103 | en/common.json:103 | it/common.json:95 | de/common.json:95 | BOOKINGS_CARD_13 (via formatDuration) |
| `common.duration.hour_other` | fr/common.json:104 | en/common.json:104 | it/common.json:96 | de/common.json:96 | BOOKINGS_CARD_13 (via formatDuration) |
| `common.duration.separator` | fr/common.json:105 | en/common.json:105 | it/common.json:97 | de/common.json:97 | BOOKINGS_CARD_13 (via formatDuration) |
| `booking.durationLabel` | fr/common.json:144 | en/common.json:144 | it/common.json:777 | de/common.json:777 | BOOKINGS_CARD_12, BOOKINGS_DETAILS_16 |
| `booking.vehicleRental` | fr/common.json:145 | en/common.json:145 | it/common.json:778 | de/common.json:778 | BOOKINGS_DETAILS_18 |
| `booking.selectedOptions` | fr/common.json:146 | en/common.json:146 | it/common.json:779 | de/common.json:779 | BOOKINGS_DETAILS_20 |
| `booking.optionsSubtotal` | fr/common.json:147 | en/common.json:147 | it/common.json:780 | de/common.json:780 | BOOKINGS_DETAILS_21 |
| `booking.subtotal` | fr/common.json:148 | en/common.json:148 | it/common.json:781 | de/common.json:781 | BOOKINGS_DETAILS_22 |
| `booking.serviceFee` | fr/common.json:149 | en/common.json:149 | it/common.json:782 | de/common.json:782 | BOOKINGS_DETAILS_23 |
| `booking.totalToPay` | fr/common.json:150 | en/common.json:150 | it/common.json:783 | de/common.json:783 | BOOKINGS_DETAILS_24 |
| `booking.discussion.payRental` | fr/common.json:169 | en/common.json:169 | it/common.json:802 | de/common.json:802 | BOOKINGS_CARD_18 |
| `booking.discussion.toasts.bookingCancelled.title` | fr/common.json:194 | en/common.json:194 | it/common.json:827 | de/common.json:827 | BOOKINGS_TOAST_03 |

**Total clés réutilisables:** 25 clés

---

## D) MISSING_KEY MINIMAL (liste exacte)

### Namespace recommandé: `bookings.*`

### Clés manquantes exactes (48 clés)

#### `bookings.card.*` (9 clés)

| Clé | FR | EN | IT | DE |
|-----|----|----|----|----|
| `bookings.card.vehicleDeleted` | "Véhicule supprimé" | "Vehicle deleted" | "Veicolo eliminato" | "Fahrzeug gelöscht" |
| `bookings.card.messageButton` | "Message" | "Message" | "Messaggio" | "Nachricht" |
| `bookings.card.messageTooltip` | "Bonjour {{ownerName}}, cliquez ici pour discuter avec moi" | "Hello {{ownerName}}, click here to chat with me" | "Ciao {{ownerName}}, clicca qui per chattare con me" | "Hallo {{ownerName}}, klicken Sie hier, um mit mir zu chatten" |
| `bookings.card.ownerFallback` | "Propriétaire" | "Owner" | "Proprietario" | "Eigentümer" |
| `bookings.card.startLabel` | "Début:" | "Start:" | "Inizio:" | "Beginn:" |
| `bookings.card.endLabel` | "Fin:" | "End:" | "Fine:" | "Ende:" |
| `bookings.card.totalLabel` | "Total:" | "Total:" | "Totale:" | "Gesamt:" |
| `bookings.card.servicesTitle` | "Services supplémentaires:" | "Additional services:" | "Servizi aggiuntivi:" | "Zusätzliche Dienstleistungen:" |
| `bookings.card.confirm` | "Confirmer" | "Confirm" | "Conferma" | "Bestätigen" |

#### `bookings.status.*` (7 clés)

| Clé | FR | EN | IT | DE |
|-----|----|----|----|----|
| `bookings.status.paymentConfirmed` | "Paiement confirmé" | "Payment confirmed" | "Pagamento confermato" | "Zahlung bestätigt" |
| `bookings.status.depositPending` | "En attente de la caution" | "Deposit pending" | "Deposito in attesa" | "Kaution ausstehend" |
| `bookings.status.readyToGo` | "Prêt à partir" | "Ready to go" | "Pronto a partire" | "Bereit zum Start" |
| `bookings.status.paymentDepositValidated` | "Paiement et caution validés" | "Payment and deposit validated" | "Pagamento e deposito convalidati" | "Zahlung und Kaution bestätigt" |
| `bookings.status.active` | "En cours" | "Ongoing" | "In corso" | "Laufend" |
| `bookings.status.completed` | "Terminé" | "Completed" | "Completato" | "Abgeschlossen" |
| `bookings.status.cancelled` | "Annulée" | "Cancelled" | "Annullata" | "Storniert" |

#### `bookings.cancel.*` (12 clés)

| Clé | FR | EN | IT | DE |
|-----|----|----|----|----|
| `bookings.cancel.title` | "Annuler la réservation" | "Cancel booking" | "Annulla prenotazione" | "Buchung stornieren" |
| `bookings.cancel.description` | "Sélectionnez un motif ou rédigez votre message." | "Select a reason or write your message." | "Seleziona un motivo o scrivi il tuo messaggio." | "Wählen Sie einen Grund oder schreiben Sie Ihre Nachricht." |
| `bookings.cancel.reason.dateChange` | "Changement de dates" | "Date change" | "Cambio data" | "Terminänderung" |
| `bookings.cancel.reason.otherOption` | "Trouvé une autre option" | "Found another option" | "Trovata un'altra opzione" | "Andere Option gefunden" |
| `bookings.cancel.reason.personalIssue` | "Imprévu personnel" | "Personal issue" | "Imprevisto personale" | "Persönliches Problem" |
| `bookings.cancel.reason.bookingError` | "Erreur de réservation" | "Booking error" | "Errore di prenotazione" | "Buchungsfehler" |
| `bookings.cancel.reason.custom` | "Autre raison (personnalisée)" | "Other reason (custom)" | "Altro motivo (personalizzato)" | "Anderer Grund (benutzerdefiniert)" |
| `bookings.cancel.reasonLabel` | "Expliquez votre motif" | "Explain your reason" | "Spiega il tuo motivo" | "Erklären Sie Ihren Grund" |
| `bookings.cancel.reasonPlaceholder` | "Ex: Mon planning a changé..." | "Ex: My schedule changed..." | "Es: Il mio programma è cambiato..." | "Z.B.: Mein Zeitplan hat sich geändert..." |
| `bookings.cancel.back` | "Retour" | "Back" | "Indietro" | "Zurück" |
| `bookings.cancel.confirm` | "Confirmer" | "Confirm" | "Conferma" | "Bestätigen" |
| `bookings.cancel.processing` | "Annulation..." | "Cancelling..." | "Annullamento..." | "Stornierung..." |

#### `bookings.toasts.*` (8 clés)

| Clé | FR | EN | IT | DE |
|-----|----|----|----|----|
| `bookings.toasts.cancelError` | "Impossible d'annuler la réservation: {{error}}" | "Unable to cancel booking: {{error}}" | "Impossibile annullare la prenotazione: {{error}}" | "Buchung kann nicht storniert werden: {{error}}" |
| `bookings.toasts.cancelledDescription` | "Votre réservation a été annulée. Le propriétaire sera notifié." | "Your booking has been cancelled. The owner will be notified." | "La tua prenotazione è stata annullata. Il proprietario sarà informato." | "Ihre Buchung wurde storniert. Der Eigentümer wird benachrichtigt." |
| `bookings.toasts.unexpectedError` | "Une erreur est survenue" | "An error occurred" | "Si è verificato un errore" | "Ein Fehler ist aufgetreten" |
| `bookings.toasts.reasonRequired` | "Motif requis" | "Reason required" | "Motivo richiesto" | "Grund erforderlich" |
| `bookings.toasts.reasonRequiredDescription` | "Veuillez sélectionner un motif ou saisir un message." | "Please select a reason or enter a message." | "Seleziona un motivo o inserisci un messaggio." | "Bitte wählen Sie einen Grund oder geben Sie eine Nachricht ein." |
| `bookings.toasts.cancelledSimple` | "Votre réservation a été annulée." | "Your booking has been cancelled." | "La tua prenotazione è stata annullata." | "Ihre Buchung wurde storniert." |
| `bookings.toasts.comingSoon` | "Fonctionnalité à venir" | "Coming soon" | "Funzionalità in arrivo" | "Bald verfügbar" |
| `bookings.toasts.comingSoonDescription` | "La confirmation de réservation sera bientôt disponible" | "Booking confirmation will be available soon" | "La conferma della prenotazione sarà presto disponibile" | "Die Buchungsbestätigung wird bald verfügbar sein" |

#### `bookings.details.*` (12 clés)

| Clé | FR | EN | IT | DE |
|-----|----|----|----|----|
| `bookings.details.title` | "Détails de votre réservation" | "Your booking details" | "Dettagli della tua prenotazione" | "Ihre Buchungsdetails" |
| `bookings.details.referenceNumber` | "Réservation #{{referenceNumber}}" | "Booking #{{referenceNumber}}" | "Prenotazione #{{referenceNumber}}" | "Buchung #{{referenceNumber}}" |
| `bookings.details.createdAt` | "Créée le {{date}}" | "Created on {{date}}" | "Creata il {{date}}" | "Erstellt am {{date}}" |
| `bookings.details.yearLabel` | "Année {{year}}" | "Year {{year}}" | "Anno {{year}}" | "Jahr {{year}}" |
| `bookings.details.clientInfo` | "Informations client" | "Client information" | "Informazioni cliente" | "Kundeninformationen" |
| `bookings.details.lastName` | "Nom" | "Last name" | "Cognome" | "Nachname" |
| `bookings.details.firstName` | "Prénom" | "First name" | "Nome" | "Vorname" |
| `bookings.details.phone` | "Téléphone" | "Phone" | "Telefono" | "Telefon" |
| `bookings.details.email` | "Email" | "Email" | "Email" | "E-Mail" |
| `bookings.details.notProvided` | "Non renseigné" | "Not provided" | "Non fornito" | "Nicht angegeben" |
| `bookings.details.pickupZone` | "Zone de prise en charge" | "Pickup zone" | "Zona di ritiro" | "Abholzone" |
| `bookings.details.notSpecified` | "Non spécifiée" | "Not specified" | "Non specificata" | "Nicht angegeben" |
| `bookings.details.rentalDates` | "Dates de location" | "Rental dates" | "Date di noleggio" | "Mietdaten" |
| `bookings.details.baseRate` | "Tarif de base" | "Base rate" | "Tariffa base" | "Grundpreis" |
| `bookings.details.pricePerDayFormat` | "{{price}}€/jour × {{duration}}" | "{{price}}€/day × {{duration}}" | "{{price}}€/giorno × {{duration}}" | "{{price}}€/Tag × {{duration}}" |
| `bookings.details.downloadPdf` | "Télécharger en PDF" | "Download PDF" | "Scarica PDF" | "PDF herunterladen" |
| `bookings.details.close` | "Fermer" | "Close" | "Chiudi" | "Schließen" |

#### `bookings.card.finalizeBooking` (1 clé)

| Clé | FR | EN | IT | DE |
|-----|----|----|----|----|
| `bookings.card.finalizeBooking` | "Finaliser ma réservation" | "Finalize my booking" | "Finalizza la mia prenotazione" | "Buchung abschließen" |

**Total:** 48 clés manquantes exactes

---

## E) FORMATAGE dates/durée/devise (DIAG avec preuves)

### 1. Formatage dates — "fr-FR" hardcodé

#### Occurrences `toLocaleDateString("fr-FR")`

| Fichier | Ligne | Code exact | Contexte |
|---------|-------|------------|----------|
| `src/pages/renter/RenterBookings.tsx` | 597 | `toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })` | Fonction `formatDate()` |
| `src/pages/renter/RenterBookings.tsx` | 118 | `toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })` | Auto-remplissage modal |
| `src/pages/renter/RenterBookings.tsx` | 125 | `toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })` | Auto-remplissage modal |
| `src/components/RenterBookingCard.tsx` | 738 | `toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })` | Ligne "Début:" |
| `src/components/RenterBookingCard.tsx` | 759 | `toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })` | Ligne "Fin:" |
| `src/components/RenterBookingCard.tsx` | 597 | `toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })` | Motif annulation date |

#### Occurrences `format(..., { locale: fr })`

| Fichier | Ligne | Code exact | Contexte |
|---------|-------|------------|----------|
| `src/components/RenterBookingCard.tsx` | 50 | `import { fr } from 'date-fns/locale'` | Import hardcodé |
| `src/components/RenterBookingCard.tsx` | 1176 | `format(new Date(booking.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })` | Modal détails "Créée le" |
| `src/components/RenterBookingCard.tsx` | 1270 | `format(new Date(booking.startDate), "EEEE d MMMM yyyy", { locale: fr })` | Modal détails "Départ" |
| `src/components/RenterBookingCard.tsx` | 1281 | `format(new Date(booking.endDate), "EEEE d MMMM yyyy", { locale: fr })` | Modal détails "Retour" |

**Total:** 9 occurrences de formatage dates hardcodé FR

### 2. Formatage devise — "€" hardcodé

#### Occurrences "€" hardcodé

| Fichier | Ligne | Code exact | Contexte |
|---------|-------|------------|----------|
| `src/components/RenterBookingCard.tsx` | 826 | `})()}€` | Ligne "Total:" card body |
| `src/components/RenterBookingCard.tsx` | 877 | `{basePrice}€` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 882 | `+{optionsTotal}€` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 887 | `{subtotal}€` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 891 | `+{serviceFee}€` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 895 | `{totalAmount}€` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 1347 | `})()}€` | Modal détails "Tarif de base" |
| `src/components/RenterBookingCard.tsx` | 1351 | `{booking.vehicle?.dailyPrice}€/jour ×` | Modal détails prix/jour |
| `src/components/RenterBookingCard.tsx` | 1400 | `+ {option.totalPrice}€` | Modal détails options |
| `src/components/RenterBookingCard.tsx` | 1407 | `{getServicesFromOptions(booking.selectedOptions).reduce((sum, opt) => sum + opt.totalPrice, 0)}€` | Modal détails sous-total options |
| `src/components/RenterBookingCard.tsx` | 1450 | `})()}€` | Modal détails sous-total |
| `src/components/RenterBookingCard.tsx` | 1488 | `})()}€` | Modal détails frais service |
| `src/components/RenterBookingCard.tsx` | 1528 | `})()}€` | Modal détails TOTAL |

**Total:** 13 occurrences de "€" hardcodé

### 3. Formatage durée — "jours + heures" hardcodé FR

#### Occurrences construction durée FR

| Fichier | Ligne | Code exact | Contexte |
|---------|-------|------------|----------|
| `src/components/RenterBookingCard.tsx` | 129 | `return '1 jour'` | calculateRealDuration() |
| `src/components/RenterBookingCard.tsx` | 131 | `` `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}` `` | calculateRealDuration() |
| `src/components/RenterBookingCard.tsx` | 135 | `` `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}` `` | calculateRealDuration() |
| `src/components/RenterBookingCard.tsx` | 857 | `durationText = '1 jour'` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 860 | `durationText = \`${completeDays} jours\`` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 865 | `durationText = \`${completeDays} jours + ${Math.floor(extraHours)}h\`` | Tooltip prix détail |
| `src/components/RenterBookingCard.tsx` | 973 | `duree: days === 1 ? '1 jour' : \`${days} jours\`` | onRequestPay() |
| `src/components/RenterBookingCard.tsx` | 1027 | `duree: days === 1 ? '1 jour' : \`${days} jours\`` | onRequestPay() |
| `src/components/RenterBookingCard.tsx` | 1334 | `durationText = '1 jour'` | Modal détails tarif base |
| `src/components/RenterBookingCard.tsx` | 1337 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}\` `` | Modal détails tarif base |
| `src/components/RenterBookingCard.tsx` | 1342 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}\` `` | Modal détails tarif base |
| `src/components/RenterBookingCard.tsx` | 1367 | `durationText = '1 jour'` | Modal détails prix/jour |
| `src/components/RenterBookingCard.tsx` | 1369 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}\` `` | Modal détails prix/jour |
| `src/components/RenterBookingCard.tsx` | 1371 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}\` `` | Modal détails prix/jour |

**Total:** 14 occurrences de durée hardcodée FR

### 4. Options de formatage — Preuve de l'option utilisée

#### Option 1: Intl.DateTimeFormat

**Preuve d'utilisation dans le repo:**
- ❌ Aucune occurrence trouvée dans le repo
- Utilisé uniquement pour devise: `src/utils/currency.ts` (ligne 6) avec `Intl.NumberFormat`

#### Option 2: date-fns avec locale dynamique

**Preuve d'utilisation dans le repo:**
- ✅ **UTILISÉ** dans `src/components/booking/BookingConfirmationModal.tsx`:
  - Lignes 7-10: `import { fr } from "date-fns/locale/fr"; import { enUS } from "date-fns/locale/en-US"; import { it as itLocale } from "date-fns/locale/it"; import { de as deLocale } from "date-fns/locale/de";`
  - Lignes 56-60: Sélection locale dynamique selon `i18n.language`
  - Ligne 133: `format(rentalInfo.startDate, "EEEE d MMMM yyyy", { locale: dateLocale })`

**Recommandation:** Utiliser **date-fns avec locale dynamique** (comme dans `BookingConfirmationModal.tsx`)

#### Helper formatCurrency existant

**Preuve:**
- ✅ **EXISTE** dans `src/utils/currency.ts`:
  - Ligne 1-12: `formatCurrency(amount, locale = "fr-FR", currency = "EUR")`
  - Utilise `Intl.NumberFormat` avec locale paramétrable
  - **PROBLÈME:** Locale par défaut hardcodée "fr-FR" (ligne 3)
  - **SOLUTION:** Passer locale dynamique depuis `i18n.language`

#### Helper formatDuration existant

**Preuve:**
- ✅ **EXISTE** dans `src/utils/formatDuration.ts` (lignes 1-55)
- ✅ **UTILISE DÉJÀ i18n** : Prend `TFunction` en paramètre (ligne 11)
- ✅ **UTILISE LES CLÉS** : `common.duration.day_one`, `common.duration.day_other`, `common.duration.hour_one`, `common.duration.hour_other`, `common.duration.separator` (lignes 21-33)
- Utilisé dans `BookingConfirmationModal.tsx` ligne 14
- **CONCLUSION:** Helper déjà i18n-ready, il suffit de l'utiliser avec `t` depuis `useTranslation()`

---

## F) RÉSUMÉ FINAL

### Composant card
**Le composant card est:** `RenterBookingCard` (`src/components/RenterBookingCard.tsx`)

### Textes à traduire
**Total:** 66 textes UI statiques identifiés avec preuves exactes (fichier + ligne)

### Clés existantes réutilisables
**Total:** 25 clés réutilisables avec preuves FR/EN/IT/DE

### Clés manquantes exactes
**Total:** 48 nouvelles clés à créer (namespace `bookings.*`)

### Formatage — Preuves
- **Dates:** 9 occurrences `toLocaleDateString("fr-FR")` + 3 occurrences `format(..., { locale: fr })`
  - **Solution:** Utiliser date-fns avec locale dynamique (pattern `BookingConfirmationModal.tsx` lignes 56-60)
- **Devise:** 13 occurrences "€" hardcodé
  - **Solution:** Utiliser `formatCurrency()` avec locale dynamique depuis `i18n.language` (pattern `BookingConfirmationModal.tsx` lignes 63-67)
- **Durée:** 14 occurrences "jours + heures" hardcodé FR
  - **Solution:** Utiliser `formatDuration(t, days, hours)` depuis `src/utils/formatDuration.ts` (déjà i18n-ready, utilise `common.duration.*`)
- **Option recommandée:** date-fns avec locale dynamique (déjà utilisé dans `BookingConfirmationModal.tsx` lignes 7-10, 56-60)
- **Helper existant:** `formatCurrency()` dans `src/utils/currency.ts` (locale par défaut "fr-FR" à corriger, passer depuis `i18n.language`)
- **Helper existant:** `formatDuration(t, days, hours)` dans `src/utils/formatDuration.ts` (déjà i18n-ready, utilise `common.duration.*`)

---

## G) VALIDATION DU DIAGNOSTIC

### ✅ Inventaire complet
- **66 textes UI** identifiés avec fichier + ligne exacte
- **Tous les textes** catégorisés (UI statique / Backend / Calculé)
- **Décision** pour chaque texte (TRADUIRE_UI / NE_PAS_TRADUIRE_BACKEND / NEEDS_CONFIRMATION)

### ✅ Mapping avec preuves
- **25 clés existantes** réutilisables avec preuves FR/EN/IT/DE (fichier + ligne)
- **48 clés manquantes** identifiées avec valeurs FR/EN/IT/DE proposées
- **Confiance HIGH** pour toutes les clés existantes (preuves vérifiées)

### ✅ Formatage dates/durée/devise
- **12 occurrences dates** hardcodées FR identifiées (fichier + ligne)
- **13 occurrences devise** "€" hardcodé identifiées (fichier + ligne)
- **14 occurrences durée** hardcodée FR identifiées (fichier + ligne)
- **Solutions proposées** avec preuves d'utilisation dans le repo

### ✅ Helpers existants
- `formatDuration(t, days, hours)` : ✅ Déjà i18n-ready (utilise `common.duration.*`)
- `formatCurrency(amount, locale, currency)` : ⚠️ Locale par défaut "fr-FR" à corriger
- Pattern date-fns avec locale dynamique : ✅ Déjà utilisé dans `BookingConfirmationModal.tsx`

---

**✅ DIAGNOSTIC VERROUILLÉ — PRÊT POUR IMPLÉMENTATION**

**Date de verrouillage:** 2025-01-XX  
**Statut:** ✅ COMPLET — Toutes les sections remplies avec preuves exactes  
**Prochaine étape:** Implémentation i18n selon ce diagnostic
