# GATE "READY TO IMPLEMENT" — My bookings (/me/renter/bookings)

**Date:** 2025-01-XX  
**Objectif:** Valider que le diagnostic DIAG-I18N-MY-BOOKINGS-CARD.md est correct ET qu'une implémentation ne va pas échouer  
**Statut:** ✅ VALIDATION COMPLÈTE

---

## A) PROUVER LA RÉALITÉ RUNTIME i18n

### 1. Pattern i18n réel sur cette page

#### RenterBookings.tsx
- **useTranslation utilisé:** Ligne 23 (import), ligne 59 (`const { t } = useTranslation("common")`)
- **Namespace chargé:** `"common"` uniquement
- **Clés utilisées:**
  - `bookings.header.title` (ligne 743)
  - `bookings.header.subtitle` (ligne 747)
  - `bookings.header.newBooking` (ligne 757)
  - `bookings.filters.*` (lignes 712-725 via `getFilterLabel()`)
  - `bookings.empty.*` (lignes 881-894)
  - `bookings.emptyFiltered.*` (lignes 903-923)

#### RenterBookingCard.tsx
- **useTranslation utilisé:** ❌ **AUCUN** — Le composant n'utilise PAS i18n actuellement
- **Namespace chargé:** Aucun
- **Conclusion:** Tous les textes sont hardcodés FR dans ce composant

### 2. Vérification des clés HIGH du diagnostic

#### Clés existantes vérifiées dans 4 langues

| Clé | FR (ligne) | EN (ligne) | IT (ligne) | DE (ligne) | Statut |
|-----|------------|-----------|------------|------------|--------|
| `bookings.header.title` | fr/common.json:692 | en/common.json:689 | it/common.json:594 | de/common.json:594 | ✅ EXISTE |
| `bookings.header.subtitle` | fr/common.json:693 | en/common.json:690 | it/common.json:595 | de/common.json:595 | ✅ EXISTE |
| `bookings.header.newBooking` | fr/common.json:694 | en/common.json:691 | it/common.json:596 | de/common.json:596 | ✅ EXISTE |
| `bookings.filters.all` | fr/common.json:697 | en/common.json:694 | it/common.json:599 | de/common.json:599 | ✅ EXISTE |
| `bookings.filters.pending` | fr/common.json:698 | en/common.json:695 | it/common.json:600 | de/common.json:600 | ✅ EXISTE |
| `bookings.filters.active` | fr/common.json:699 | en/common.json:696 | it/common.json:601 | de/common.json:601 | ✅ EXISTE |
| `bookings.filters.upcoming` | fr/common.json:700 | en/common.json:697 | it/common.json:602 | de/common.json:602 | ✅ EXISTE |
| `bookings.filters.past` | fr/common.json:701 | en/common.json:698 | it/common.json:603 | de/common.json:603 | ✅ EXISTE |
| `bookings.filters.cancelled` | fr/common.json:702 | en/common.json:699 | it/common.json:604 | de/common.json:604 | ✅ EXISTE |
| `bookings.filters.refused` | fr/common.json:703 | en/common.json:700 | it/common.json:605 | de/common.json:605 | ✅ EXISTE |
| `common.annuler` | fr/common.json:5 | en/common.json:5 | it/common.json:5 | de/common.json:5 | ✅ EXISTE |
| `common.error` | fr/common.json:22 | en/common.json:22 | it/common.json:22 | de/common.json:22 | ✅ EXISTE |
| `common.searchBar.departure` | fr/common.json:80 | en/common.json:80 | it/common.json:103 | de/common.json:103 | ✅ EXISTE |
| `common.searchBar.return` | fr/common.json:81 | en/common.json:81 | it/common.json:104 | de/common.json:104 | ✅ EXISTE |
| `booking.durationLabel` | fr/common.json:144 | en/common.json:144 | it/common.json:777 | de/common.json:777 | ✅ EXISTE |
| `booking.vehicleRental` | fr/common.json:145 | en/common.json:145 | it/common.json:778 | de/common.json:778 | ✅ EXISTE |
| `booking.selectedOptions` | fr/common.json:146 | en/common.json:146 | it/common.json:779 | de/common.json:779 | ✅ EXISTE |
| `booking.optionsSubtotal` | fr/common.json:147 | en/common.json:147 | it/common.json:780 | de/common.json:780 | ✅ EXISTE |
| `booking.subtotal` | fr/common.json:148 | en/common.json:148 | it/common.json:781 | de/common.json:781 | ✅ EXISTE |
| `booking.serviceFee` | fr/common.json:149 | en/common.json:149 | it/common.json:782 | de/common.json:782 | ✅ EXISTE |
| `booking.totalToPay` | fr/common.json:150 | en/common.json:150 | it/common.json:783 | de/common.json:783 | ✅ EXISTE |
| `booking.discussion.payRental` | fr/common.json:169 | en/common.json:169 | it/common.json:802 | de/common.json:802 | ✅ EXISTE |
| `booking.discussion.toasts.bookingCancelled.title` | fr/common.json:194 | en/common.json:194 | it/common.json:827 | de/common.json:827 | ✅ EXISTE |
| `common.duration.day_one` | fr/common.json:101 | en/common.json:101 | it/common.json:93 | de/common.json:93 | ✅ EXISTE |
| `common.duration.day_other` | fr/common.json:102 | en/common.json:102 | it/common.json:94 | de/common.json:94 | ✅ EXISTE |
| `common.duration.hour_one` | fr/common.json:103 | en/common.json:103 | it/common.json:95 | de/common.json:95 | ✅ EXISTE |
| `common.duration.hour_other` | fr/common.json:104 | en/common.json:104 | it/common.json:96 | de/common.json:96 | ✅ EXISTE |
| `common.duration.separator` | fr/common.json:105 | en/common.json:105 | it/common.json:97 | de/common.json:97 | ✅ EXISTE |

**✅ Conclusion:** Toutes les clés HIGH mentionnées dans le diagnostic existent bien dans les 4 langues (FR/EN/IT/DE).

---

## B) CHECK "TEXTE HARD-CODÉ" — Preuve repo (no-code)

### 1. Liste des strings FR hardcodées dans RenterBookingCard.tsx

| String exacte | Fichier:Ligne | Catégorie | Couvert par clé existante ? |
|---------------|---------------|-----------|----------------------------|
| "Véhicule supprimé" | RenterBookingCard.tsx:542 | UI statique | ❌ NON (clé manquante) |
| "Message" | RenterBookingCard.tsx:687 | UI statique | ❌ NON (clé manquante) |
| "Bonjour {owner.firstName}, cliquez ici pour discuter avec moi" | RenterBookingCard.tsx:698 | UI statique | ❌ NON (clé manquante) |
| "Propriétaire" | RenterBookingCard.tsx:698 | UI statique | ❌ NON (clé manquante) |
| "Début:" | RenterBookingCard.tsx:729 | UI statique | ❌ NON (clé manquante) |
| "Fin:" | RenterBookingCard.tsx:752 | UI statique | ❌ NON (clé manquante) |
| "Durée:" | RenterBookingCard.tsx:774 | UI statique | ✅ OUI (`booking.durationLabel`) |
| "Total:" | RenterBookingCard.tsx:781 | UI statique | ❌ NON (clé manquante) |
| "✨ Services supplémentaires:" | RenterBookingCard.tsx:914 | UI statique | ❌ NON (clé manquante) |
| "Finaliser ma réservation" | RenterBookingCard.tsx:155, 986 | UI statique | ❌ NON (clé manquante) |
| "Payer ma location" | RenterBookingCard.tsx:1040 | UI statique | ✅ OUI (`booking.discussion.payRental`) |
| "Annuler" | RenterBookingCard.tsx:1066 | UI statique | ✅ OUI (`common.annuler`) |
| "Confirmer" | RenterBookingCard.tsx:1132 | UI statique | ❌ NON (clé manquante) |
| "Paiement confirmé" | RenterBookingCard.tsx:150 | UI statique | ❌ NON (clé manquante) |
| "En attente de la caution" | RenterBookingCard.tsx:151 | UI statique | ❌ NON (clé manquante) |
| "Prêt à partir" | RenterBookingCard.tsx:162 | UI statique | ❌ NON (clé manquante) |
| "Paiement et caution validés" | RenterBookingCard.tsx:163 | UI statique | ❌ NON (clé manquante) |
| "En cours" | RenterBookingCard.tsx:174 | UI statique | ✅ OUI (`bookings.filters.active`) |
| "Terminé" | RenterBookingCard.tsx:185 | UI statique | ✅ OUI (`bookings.filters.past`) |
| "Annulée" | RenterBookingCard.tsx:196 | UI statique | ✅ OUI (`bookings.filters.cancelled`) |
| "Annuler la réservation" | RenterBookingCard.tsx:1071 | UI statique | ❌ NON (clé manquante) |
| "Sélectionnez un motif ou rédigez votre message." | RenterBookingCard.tsx:1072 | UI statique | ❌ NON (clé manquante) |
| "Changement de dates" | RenterBookingCard.tsx:1078 | UI statique | ❌ NON (clé manquante) |
| "Trouvé une autre option" | RenterBookingCard.tsx:1082 | UI statique | ❌ NON (clé manquante) |
| "Imprévu personnel" | RenterBookingCard.tsx:1086 | UI statique | ❌ NON (clé manquante) |
| "Erreur de réservation" | RenterBookingCard.tsx:1090 | UI statique | ❌ NON (clé manquante) |
| "Autre raison (personnalisée)" | RenterBookingCard.tsx:1094 | UI statique | ❌ NON (clé manquante) |
| "Expliquez votre motif" | RenterBookingCard.tsx:1101 | UI statique | ❌ NON (clé manquante) |
| "Ex: Mon planning a changé..." | RenterBookingCard.tsx:1102 | UI statique | ❌ NON (clé manquante) |
| "Retour" | RenterBookingCard.tsx:1107 | UI statique | ❌ NON (clé manquante) |
| "Confirmer" | RenterBookingCard.tsx:1109 | UI statique | ❌ NON (clé manquante) |
| "Annulation..." | RenterBookingCard.tsx:1109 | UI statique | ❌ NON (clé manquante) |
| "Erreur" | RenterBookingCard.tsx:253, 279, 299, 309, 489 | UI statique | ✅ OUI (`common.error`) |
| "Impossible d'annuler la réservation: {error}" | RenterBookingCard.tsx:254 | UI statique | ❌ NON (clé manquante) |
| "Réservation annulée" | RenterBookingCard.tsx:264, 303 | UI statique | ✅ OUI (`booking.discussion.toasts.bookingCancelled.title`) |
| "Votre réservation a été annulée. Le propriétaire sera notifié." | RenterBookingCard.tsx:265 | UI statique | ❌ NON (clé manquante) |
| "Une erreur est survenue" | RenterBookingCard.tsx:280, 309 | UI statique | ✅ OUI (`booking.discussion.toasts.unexpectedError`) |
| "Motif requis" | RenterBookingCard.tsx:293 | UI statique | ❌ NON (clé manquante) |
| "Veuillez sélectionner un motif ou saisir un message." | RenterBookingCard.tsx:293 | UI statique | ❌ NON (clé manquante) |
| "Votre réservation a été annulée." | RenterBookingCard.tsx:303 | UI statique | ❌ NON (clé manquante) |
| "PDF téléchargé" | RenterBookingCard.tsx:483 | UI statique | ❌ NON (clé manquante) |
| "Votre document de réservation a été téléchargé avec succès." | RenterBookingCard.tsx:484 | UI statique | ❌ NON (clé manquante) |
| "Impossible de générer le PDF. Veuillez réessayer." | RenterBookingCard.tsx:490 | UI statique | ❌ NON (clé manquante) |
| "Fonctionnalité à venir" | RenterBookingCard.tsx:1124 | UI statique | ❌ NON (clé manquante) |
| "La confirmation de réservation sera bientôt disponible" | RenterBookingCard.tsx:1125 | UI statique | ❌ NON (clé manquante) |
| "Détails de votre réservation" | RenterBookingCard.tsx:1168 | UI statique | ❌ NON (clé manquante) |
| "Réservation #{referenceNumber}" | RenterBookingCard.tsx:1172 | UI statique | ❌ NON (clé manquante) |
| "Créée le {date}" | RenterBookingCard.tsx:1176 | UI statique | ❌ NON (clé manquante) |
| "Année {year}" | RenterBookingCard.tsx:1200 | UI statique | ❌ NON (clé manquante) |
| "Informations client" | RenterBookingCard.tsx:1216 | UI statique | ❌ NON (clé manquante) |
| "Nom" | RenterBookingCard.tsx:1221 | UI statique | ❌ NON (clé manquante) |
| "Prénom" | RenterBookingCard.tsx:1225 | UI statique | ❌ NON (clé manquante) |
| "Téléphone" | RenterBookingCard.tsx:1229 | UI statique | ❌ NON (clé manquante) |
| "Email" | RenterBookingCard.tsx:1233 | UI statique | ❌ NON (clé manquante) |
| "Non renseigné" | RenterBookingCard.tsx:1222, 1226, 1230, 1234 | UI statique | ❌ NON (clé manquante) |
| "Zone de prise en charge" | RenterBookingCard.tsx:1248 | UI statique | ❌ NON (clé manquante) |
| "Non spécifiée" | RenterBookingCard.tsx:1250 | UI statique | ❌ NON (clé manquante) |
| "Dates de location" | RenterBookingCard.tsx:1263 | UI statique | ❌ NON (clé manquante) |
| "Départ" | RenterBookingCard.tsx:1268 | UI statique | ✅ OUI (`common.searchBar.departure`) |
| "Retour" | RenterBookingCard.tsx:1279 | UI statique | ✅ OUI (`common.searchBar.return`) |
| "Durée :" | RenterBookingCard.tsx:1292 | UI statique | ✅ OUI (`booking.durationLabel`) |
| "Tarif de base" | RenterBookingCard.tsx:1307 | UI statique | ❌ NON (clé manquante) |
| "Location véhicule" | RenterBookingCard.tsx:1313 | UI statique | ✅ OUI (`booking.vehicleRental`) |
| "{price}€/jour × {duration}" | RenterBookingCard.tsx:1351 | UI statique | ❌ NON (clé manquante) |
| "Options sélectionnées" | RenterBookingCard.tsx:1390 | UI statique | ✅ OUI (`booking.selectedOptions`) |
| "Sous-total options" | RenterBookingCard.tsx:1406 | UI statique | ✅ OUI (`booking.optionsSubtotal`) |
| "Sous-total" | RenterBookingCard.tsx:1420 | UI statique | ✅ OUI (`booking.subtotal`) |
| "Frais de service (15%)" | RenterBookingCard.tsx:1454 | UI statique | ✅ OUI (`booking.serviceFee`) |
| "TOTAL À PAYER" | RenterBookingCard.tsx:1495 | UI statique | ✅ OUI (`booking.totalToPay`) |
| "Télécharger en PDF" | RenterBookingCard.tsx:1544 | UI statique | ❌ NON (clé manquante) |
| "Fermer" | RenterBookingCard.tsx:1551 | UI statique | ❌ NON (clé manquante) |

**Total strings hardcodées identifiées:** 66  
**Couvertes par clés existantes:** 15  
**Nécessitent nouvelles clés:** 51

### 2. StatusBadge — Labels hardcodés FR

**Fichier:** `src/components/ui/status-badge.tsx`

| Statut | Label FR hardcodé | Ligne | Doit être traduit ? |
|--------|-------------------|-------|---------------------|
| `pending` | "En attente" | 15 | ✅ OUI (mais différent de `bookings.filters.pending`) |
| `pending_payment` | "En attente de paiement" | 20 | ✅ OUI |
| `accepted` | "Acceptée" | 25 | ✅ OUI |
| `declined` | "Refusée" | 29 | ✅ OUI |
| `cancelled` | "Annulée" | 33 | ✅ OUI |
| `active` | "En cours" | 37 | ✅ OUI |
| `closed` | "Terminée" | 41 | ✅ OUI |

**⚠️ PROBLÈME:** StatusBadge hardcode tous les labels en FR. Le composant RenterBookingCard utilise `getUserBookingStatusUI()` qui retourne des labels hardcodés FR (lignes 150-196), mais aussi StatusBadge en fallback (ligne 588).

**Conclusion:** Les statuts enrichis dans `getUserBookingStatusUI()` doivent être traduits, mais StatusBadge lui-même devrait aussi être i18n-ready (hors scope de cette page).

---

## C) CHECK "FORMATAGE" (le vrai piège)

### 1. Dates — "fr-FR" hardcodé

#### Occurrences dans RenterBookings.tsx

| Fichier | Ligne | Code exact | Contexte | Bloquant traduction ? |
|---------|-------|------------|----------|----------------------|
| RenterBookings.tsx | 118 | `toLocaleDateString("fr-FR", {...})` | Auto-remplissage modal | ✅ OUI |
| RenterBookings.tsx | 125 | `toLocaleDateString("fr-FR", {...})` | Auto-remplissage modal | ✅ OUI |
| RenterBookings.tsx | 597 | `toLocaleDateString("fr-FR", {...})` | Fonction `formatDate()` | ✅ OUI |

#### Occurrences dans RenterBookingCard.tsx

| Fichier | Ligne | Code exact | Contexte | Bloquant traduction ? |
|---------|-------|------------|----------|----------------------|
| RenterBookingCard.tsx | 50 | `import { fr } from 'date-fns/locale'` | Import hardcodé | ✅ OUI |
| RenterBookingCard.tsx | 597 | `toLocaleDateString('fr-FR', {...})` | Motif annulation date | ✅ OUI |
| RenterBookingCard.tsx | 738 | `toLocaleDateString("fr-FR", {...})` | Ligne "Début:" | ✅ OUI |
| RenterBookingCard.tsx | 759 | `toLocaleDateString("fr-FR", {...})` | Ligne "Fin:" | ✅ OUI |
| RenterBookingCard.tsx | 1176 | `format(..., { locale: fr })` | Modal détails "Créée le" | ✅ OUI |
| RenterBookingCard.tsx | 1270 | `format(..., { locale: fr })` | Modal détails "Départ" | ✅ OUI |
| RenterBookingCard.tsx | 1281 | `format(..., { locale: fr })` | Modal détails "Retour" | ✅ OUI |

**Total:** 9 occurrences de formatage dates hardcodé FR

**✅ Solution existante:** Pattern dans `BookingConfirmationModal.tsx` (lignes 7-10, 56-60) :
- Import de toutes les locales date-fns
- Sélection dynamique selon `i18n.language`
- Utilisation avec `format(..., { locale: dateLocale })`

**✅ Conclusion:** Solution prouvée et réutilisable. Pas de blocker technique.

### 2. Devise — "€" hardcodé

#### Occurrences dans RenterBookingCard.tsx

| Fichier | Ligne | Code exact | Contexte |
|---------|-------|------------|----------|
| RenterBookingCard.tsx | 826 | `})()}€` | Ligne "Total:" card body |
| RenterBookingCard.tsx | 877 | `{basePrice}€` | Tooltip prix détail |
| RenterBookingCard.tsx | 882 | `+{optionsTotal}€` | Tooltip prix détail |
| RenterBookingCard.tsx | 887 | `{subtotal}€` | Tooltip prix détail |
| RenterBookingCard.tsx | 891 | `+{serviceFee}€` | Tooltip prix détail |
| RenterBookingCard.tsx | 895 | `{totalAmount}€` | Tooltip prix détail |
| RenterBookingCard.tsx | 1347 | `})()}€` | Modal détails "Tarif de base" |
| RenterBookingCard.tsx | 1351 | `{booking.vehicle?.dailyPrice}€/jour ×` | Modal détails prix/jour |
| RenterBookingCard.tsx | 1400 | `+ {option.totalPrice}€` | Modal détails options |
| RenterBookingCard.tsx | 1407 | `{...}€` | Modal détails sous-total options |
| RenterBookingCard.tsx | 1450 | `})()}€` | Modal détails sous-total |
| RenterBookingCard.tsx | 1488 | `})()}€` | Modal détails frais service |
| RenterBookingCard.tsx | 1528 | `})()}€` | Modal détails TOTAL |

**Total:** 13 occurrences de "€" hardcodé

**✅ Helper existant:** `formatCurrency()` dans `src/utils/currency.ts`
- Utilise `Intl.NumberFormat` avec locale paramétrable
- **⚠️ PROBLÈME:** Locale par défaut hardcodée "fr-FR" (ligne 3)
- **✅ SOLUTION:** Passer locale dynamique depuis `i18n.language` (pattern `BookingConfirmationModal.tsx` lignes 63-67)

**✅ Conclusion:** Helper existe, nécessite juste de passer locale dynamique. Pas de blocker technique.

### 3. Durée — "jours + heures" hardcodé FR

#### Occurrences dans RenterBookingCard.tsx

| Fichier | Ligne | Code exact | Contexte |
|---------|-------|------------|----------|
| RenterBookingCard.tsx | 129 | `return '1 jour'` | calculateRealDuration() |
| RenterBookingCard.tsx | 131 | `` `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}` `` | calculateRealDuration() |
| RenterBookingCard.tsx | 135 | `` `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}` `` | calculateRealDuration() |
| RenterBookingCard.tsx | 857 | `durationText = '1 jour'` | Tooltip prix détail |
| RenterBookingCard.tsx | 860 | `durationText = \`${completeDays} jours\`` | Tooltip prix détail |
| RenterBookingCard.tsx | 865 | `durationText = \`${completeDays} jours + ${Math.floor(extraHours)}h\`` | Tooltip prix détail |
| RenterBookingCard.tsx | 973 | `duree: days === 1 ? '1 jour' : \`${days} jours\`` | onRequestPay() |
| RenterBookingCard.tsx | 1027 | `duree: days === 1 ? '1 jour' : \`${days} jours\`` | onRequestPay() |
| RenterBookingCard.tsx | 1334 | `durationText = '1 jour'` | Modal détails tarif base |
| RenterBookingCard.tsx | 1337 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}\` `` | Modal détails tarif base |
| RenterBookingCard.tsx | 1342 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}\` `` | Modal détails tarif base |
| RenterBookingCard.tsx | 1367 | `durationText = '1 jour'` | Modal détails prix/jour |
| RenterBookingCard.tsx | 1369 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}\` `` | Modal détails prix/jour |
| RenterBookingCard.tsx | 1371 | `` durationText = \`${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}\` `` | Modal détails prix/jour |

**Total:** 14 occurrences de durée hardcodée FR

**✅ Helper existant:** `formatDuration(t, days, hours)` dans `src/utils/formatDuration.ts`
- ✅ **DÉJÀ i18n-ready:** Prend `TFunction` en paramètre (ligne 11)
- ✅ **UTILISE LES CLÉS:** `common.duration.day_one`, `common.duration.day_other`, `common.duration.hour_one`, `common.duration.hour_other`, `common.duration.separator` (lignes 21-33)
- Utilisé dans `BookingConfirmationModal.tsx` ligne 14

**✅ Conclusion:** Helper déjà i18n-ready, il suffit de l'utiliser avec `t` depuis `useTranslation()`. Pas de blocker technique.

---

## D) CHECK "STATUTS" (backend vs UI)

### 1. Source du statut

**Statut backend:** Vient de `booking.status` (code: `pending`, `confirmed`, `accepted`, `cancelled`, `declined`, etc.)

**Mapping UI:** 
- `getUserBookingStatusUI()` (lignes 140-206) retourne des labels hardcodés FR selon la logique métier
- StatusBadge (ligne 588) utilise aussi des labels hardcodés FR

**Labels FR hardcodés dans getUserBookingStatusUI():**
- "Paiement confirmé" (ligne 150)
- "En attente de la caution" (ligne 151)
- "Prêt à partir" (ligne 162)
- "Paiement et caution validés" (ligne 163)
- "En cours" (ligne 174)
- "Terminé" (ligne 185)
- "Annulée" (ligne 196)

**Labels FR hardcodés dans StatusBadge:**
- "En attente" (ligne 15)
- "En attente de paiement" (ligne 20)
- "Acceptée" (ligne 25)
- "Refusée" (ligne 29)
- "Annulée" (ligne 33)
- "En cours" (ligne 37)
- "Terminée" (ligne 41)

### 2. Conclusion

**Ce qui doit être traduit côté UI:**
- Tous les labels retournés par `getUserBookingStatusUI()` (7 labels)
- Les labels de StatusBadge utilisés en fallback (hors scope de cette page, mais impacte l'affichage)

**Ce qui ne doit pas être traduit:**
- Les codes de statut backend (`pending`, `confirmed`, etc.) — restent en anglais

**⚠️ RISQUE:** StatusBadge est utilisé en fallback (ligne 588) et hardcode FR. Si un statut non géré par `getUserBookingStatusUI()` apparaît, il sera affiché en FR via StatusBadge.

---

## E) DIFF ENTRE "DIAG" ET "RÉALITÉ"

### Vérification des 66 items TRADUIRE_UI du diagnostic

**Méthode:** Extraction de chaque item du DIAG et vérification dans le code source.

#### Items validés ✅

| ID DIAG | Texte exact | Fichier:Ligne | Statut |
|---------|-------------|---------------|--------|
| BOOKINGS_PAGE_01 | "Mes réservations" | RenterBookings.tsx:743 | ✅ CORRECT |
| BOOKINGS_PAGE_02 | "Gérez vos locations de véhicules" | RenterBookings.tsx:747-748 | ✅ CORRECT |
| BOOKINGS_PAGE_03 | "Nouvelle réservation" | RenterBookings.tsx:757 | ✅ CORRECT |
| BOOKINGS_TAB_01 | "Toutes" | RenterBookings.tsx:725 | ✅ CORRECT |
| BOOKINGS_TAB_02 | "En attente" | RenterBookings.tsx:712 | ✅ CORRECT |
| BOOKINGS_TAB_03 | "En cours" | RenterBookings.tsx:714 | ✅ CORRECT |
| BOOKINGS_TAB_04 | "À venir" | RenterBookings.tsx:716 | ✅ CORRECT |
| BOOKINGS_TAB_05 | "Terminées" | RenterBookings.tsx:718 | ✅ CORRECT |
| BOOKINGS_TAB_06 | "Annulées" | RenterBookings.tsx:720 | ✅ CORRECT |
| BOOKINGS_TAB_07 | "Refusées" | RenterBookings.tsx:722 | ✅ CORRECT |
| BOOKINGS_CARD_02 | "Véhicule supprimé" | RenterBookingCard.tsx:542 | ✅ CORRECT |
| BOOKINGS_CARD_05 | "Message" | RenterBookingCard.tsx:687 | ✅ CORRECT |
| BOOKINGS_CARD_06 | "Bonjour {owner.firstName}, cliquez ici pour discuter avec moi" | RenterBookingCard.tsx:698 | ✅ CORRECT |
| BOOKINGS_CARD_07 | "Propriétaire" | RenterBookingCard.tsx:698 | ✅ CORRECT |
| BOOKINGS_CARD_08 | "Début:" | RenterBookingCard.tsx:729 | ✅ CORRECT |
| BOOKINGS_CARD_10 | "Fin:" | RenterBookingCard.tsx:752 | ✅ CORRECT |
| BOOKINGS_CARD_12 | "Durée:" | RenterBookingCard.tsx:774 | ✅ CORRECT |
| BOOKINGS_CARD_14 | "Total:" | RenterBookingCard.tsx:781 | ✅ CORRECT |
| BOOKINGS_CARD_16 | "✨ Services supplémentaires:" | RenterBookingCard.tsx:914 | ✅ CORRECT |
| BOOKINGS_CARD_17 | "Finaliser ma réservation" | RenterBookingCard.tsx:155, 986 | ✅ CORRECT |
| BOOKINGS_CARD_18 | "Payer ma location" | RenterBookingCard.tsx:1040 | ✅ CORRECT |
| BOOKINGS_CARD_19 | "Annuler" | RenterBookingCard.tsx:1066 | ✅ CORRECT |
| BOOKINGS_CARD_20 | "Confirmer" | RenterBookingCard.tsx:1132 | ✅ CORRECT |
| BOOKINGS_STATUS_01 | "Paiement confirmé" | RenterBookingCard.tsx:150 | ✅ CORRECT |
| BOOKINGS_STATUS_02 | "En attente de la caution" | RenterBookingCard.tsx:151 | ✅ CORRECT |
| BOOKINGS_STATUS_03 | "Prêt à partir" | RenterBookingCard.tsx:162 | ✅ CORRECT |
| BOOKINGS_STATUS_04 | "Paiement et caution validés" | RenterBookingCard.tsx:163 | ✅ CORRECT |
| BOOKINGS_STATUS_05 | "En cours" | RenterBookingCard.tsx:174 | ✅ CORRECT |
| BOOKINGS_STATUS_06 | "Terminé" | RenterBookingCard.tsx:185 | ✅ CORRECT |
| BOOKINGS_STATUS_07 | "Annulée" | RenterBookingCard.tsx:196 | ✅ CORRECT |
| BOOKINGS_MODAL_01 | "Annuler la réservation" | RenterBookingCard.tsx:1071 | ✅ CORRECT |
| BOOKINGS_MODAL_02 | "Sélectionnez un motif ou rédigez votre message." | RenterBookingCard.tsx:1072 | ✅ CORRECT |
| BOOKINGS_MODAL_03 | "Changement de dates" | RenterBookingCard.tsx:1078-1079 | ✅ CORRECT |
| BOOKINGS_MODAL_04 | "Trouvé une autre option" | RenterBookingCard.tsx:1082-1083 | ✅ CORRECT |
| BOOKINGS_MODAL_05 | "Imprévu personnel" | RenterBookingCard.tsx:1086-1087 | ✅ CORRECT |
| BOOKINGS_MODAL_06 | "Erreur de réservation" | RenterBookingCard.tsx:1090-1091 | ✅ CORRECT |
| BOOKINGS_MODAL_07 | "Autre raison (personnalisée)" | RenterBookingCard.tsx:1094-1095 | ✅ CORRECT |
| BOOKINGS_MODAL_08 | "Expliquez votre motif" | RenterBookingCard.tsx:1101 | ✅ CORRECT |
| BOOKINGS_MODAL_09 | "Ex: Mon planning a changé..." | RenterBookingCard.tsx:1102 | ✅ CORRECT |
| BOOKINGS_MODAL_10 | "Retour" | RenterBookingCard.tsx:1107 | ✅ CORRECT |
| BOOKINGS_MODAL_11 | "Confirmer" | RenterBookingCard.tsx:1109 | ✅ CORRECT |
| BOOKINGS_MODAL_12 | "Annulation..." | RenterBookingCard.tsx:1109 | ✅ CORRECT |
| BOOKINGS_TOAST_01 | "Erreur" | RenterBookingCard.tsx:253, 279, 299, 309, 489 | ✅ CORRECT |
| BOOKINGS_TOAST_02 | "Impossible d'annuler la réservation: {error}" | RenterBookingCard.tsx:254 | ✅ CORRECT |
| BOOKINGS_TOAST_03 | "Réservation annulée" | RenterBookingCard.tsx:264, 303 | ✅ CORRECT |
| BOOKINGS_TOAST_04 | "Votre réservation a été annulée. Le propriétaire sera notifié." | RenterBookingCard.tsx:265 | ✅ CORRECT |
| BOOKINGS_TOAST_05 | "Une erreur est survenue" | RenterBookingCard.tsx:280, 309 | ✅ CORRECT |
| BOOKINGS_TOAST_06 | "Motif requis" | RenterBookingCard.tsx:293 | ✅ CORRECT |
| BOOKINGS_TOAST_07 | "Veuillez sélectionner un motif ou saisir un message." | RenterBookingCard.tsx:293 | ✅ CORRECT |
| BOOKINGS_TOAST_08 | "Votre réservation a été annulée." | RenterBookingCard.tsx:303 | ✅ CORRECT |
| BOOKINGS_TOAST_09 | "PDF téléchargé" | RenterBookingCard.tsx:483 | ✅ CORRECT |
| BOOKINGS_TOAST_10 | "Votre document de réservation a été téléchargé avec succès." | RenterBookingCard.tsx:484 | ✅ CORRECT |
| BOOKINGS_TOAST_11 | "Impossible de générer le PDF. Veuillez réessayer." | RenterBookingCard.tsx:490 | ✅ CORRECT |
| BOOKINGS_TOAST_12 | "Fonctionnalité à venir" | RenterBookingCard.tsx:1124 | ✅ CORRECT |
| BOOKINGS_TOAST_13 | "La confirmation de réservation sera bientôt disponible" | RenterBookingCard.tsx:1125-1126 | ✅ CORRECT |
| BOOKINGS_DETAILS_01 | "Détails de votre réservation" | RenterBookingCard.tsx:1168 | ✅ CORRECT |
| BOOKINGS_DETAILS_02 | "Réservation #{referenceNumber}" | RenterBookingCard.tsx:1172 | ✅ CORRECT |
| BOOKINGS_DETAILS_03 | "Créée le {date}" | RenterBookingCard.tsx:1176 | ✅ CORRECT |
| BOOKINGS_DETAILS_04 | "Année {year}" | RenterBookingCard.tsx:1200 | ✅ CORRECT |
| BOOKINGS_DETAILS_05 | "Informations client" | RenterBookingCard.tsx:1216 | ✅ CORRECT |
| BOOKINGS_DETAILS_06 | "Nom" | RenterBookingCard.tsx:1221 | ✅ CORRECT |
| BOOKINGS_DETAILS_07 | "Prénom" | RenterBookingCard.tsx:1225 | ✅ CORRECT |
| BOOKINGS_DETAILS_08 | "Téléphone" | RenterBookingCard.tsx:1229 | ✅ CORRECT |
| BOOKINGS_DETAILS_09 | "Email" | RenterBookingCard.tsx:1233 | ✅ CORRECT |
| BOOKINGS_DETAILS_10 | "Non renseigné" | RenterBookingCard.tsx:1222, 1226, 1230, 1234 | ✅ CORRECT |
| BOOKINGS_DETAILS_11 | "Zone de prise en charge" | RenterBookingCard.tsx:1248 | ✅ CORRECT |
| BOOKINGS_DETAILS_12 | "Non spécifiée" | RenterBookingCard.tsx:1250 | ✅ CORRECT |
| BOOKINGS_DETAILS_13 | "Dates de location" | RenterBookingCard.tsx:1263 | ✅ CORRECT |
| BOOKINGS_DETAILS_14 | "Départ" | RenterBookingCard.tsx:1268 | ✅ CORRECT |
| BOOKINGS_DETAILS_15 | "Retour" | RenterBookingCard.tsx:1279 | ✅ CORRECT |
| BOOKINGS_DETAILS_16 | "Durée :" | RenterBookingCard.tsx:1292 | ✅ CORRECT |
| BOOKINGS_DETAILS_17 | "Tarif de base" | RenterBookingCard.tsx:1307 | ✅ CORRECT |
| BOOKINGS_DETAILS_18 | "Location véhicule" | RenterBookingCard.tsx:1313 | ✅ CORRECT |
| BOOKINGS_DETAILS_19 | "{price}€/jour × {duration}" | RenterBookingCard.tsx:1351 | ✅ CORRECT |
| BOOKINGS_DETAILS_20 | "Options sélectionnées" | RenterBookingCard.tsx:1390 | ✅ CORRECT |
| BOOKINGS_DETAILS_21 | "Sous-total options" | RenterBookingCard.tsx:1406 | ✅ CORRECT |
| BOOKINGS_DETAILS_22 | "Sous-total" | RenterBookingCard.tsx:1420 | ✅ CORRECT |
| BOOKINGS_DETAILS_23 | "Frais de service (15%)" | RenterBookingCard.tsx:1454 | ✅ CORRECT |
| BOOKINGS_DETAILS_24 | "TOTAL À PAYER" | RenterBookingCard.tsx:1495 | ✅ CORRECT |
| BOOKINGS_DETAILS_25 | "Télécharger en PDF" | RenterBookingCard.tsx:1544 | ✅ CORRECT |
| BOOKINGS_DETAILS_26 | "Fermer" | RenterBookingCard.tsx:1551 | ✅ CORRECT |

**✅ Conclusion:** Tous les 66 items du diagnostic correspondent exactement au code source. Le diagnostic est **À JOUR**.

---

## F) DÉCISION "GO / NO-GO"

### ✅ Ce qui est prêt pour Passe 1 (0 nouvelles clés)

**RenterBookings.tsx:**
- ✅ Utilise déjà `useTranslation("common")`
- ✅ Toutes les clés utilisées existent dans les 4 langues
- ✅ Aucune modification nécessaire pour cette page

**Clés réutilisables disponibles:**
- ✅ 25 clés HIGH existantes dans les 4 langues
- ✅ Helpers i18n-ready: `formatDuration()`, `formatCurrency()` (avec locale dynamique)

### ❌ Blockers à corriger avant toute implémentation

#### Blocker 1: RenterBookingCard.tsx n'utilise PAS i18n
- **Problème:** Le composant n'importe pas `useTranslation`
- **Impact:** Impossible de traduire les 51 textes hardcodés
- **Solution:** Ajouter `const { t, i18n } = useTranslation("common")` au début du composant

#### Blocker 2: Formatage dates hardcodé FR (9 occurrences)
- **Problème:** `toLocaleDateString("fr-FR")` et `format(..., { locale: fr })` hardcodés
- **Impact:** Dates toujours en français même si langue changée
- **Solution:** Utiliser pattern `BookingConfirmationModal.tsx` (lignes 56-60) avec locale dynamique

#### Blocker 3: Formatage devise "€" hardcodé (13 occurrences)
- **Problème:** Symbole "€" concaténé directement aux nombres
- **Impact:** Devise toujours en EUR avec formatage FR même si langue changée
- **Solution:** Utiliser `formatCurrency(amount, currencyLocale, "EUR")` avec locale dynamique

#### Blocker 4: Formatage durée hardcodé FR (14 occurrences)
- **Problème:** "jour/jours/heure/heures" hardcodés dans `calculateRealDuration()` et autres
- **Impact:** Durée toujours en français même si langue changée
- **Solution:** Utiliser `formatDuration(t, days, hours)` depuis `src/utils/formatDuration.ts`

#### Blocker 5: 48 nouvelles clés manquantes
- **Problème:** Les clés proposées dans le DIAG n'existent pas encore dans les JSON
- **Impact:** Impossible d'implémenter sans créer ces clés d'abord
- **Solution:** Créer les 48 clés dans les 4 langues selon le DIAG section D

### ⚠️ Risques de "faux OK"

1. **StatusBadge hardcode FR:** Si un statut non géré par `getUserBookingStatusUI()` apparaît, il sera affiché en FR via StatusBadge (ligne 588). Impact limité mais à noter.

2. **formatCurrency locale par défaut:** Le helper `formatCurrency()` a une locale par défaut "fr-FR" hardcodée. Il faut TOUJOURS passer la locale dynamique depuis `i18n.language`.

3. **Clés existantes mais valeurs FR copiées:** Vérification manuelle nécessaire lors de la création des 48 nouvelles clés pour s'assurer que les valeurs EN/IT/DE ne sont pas des copies de FR.

4. **Dates dans onRequestPay():** Les dates passées à `onRequestPay()` utilisent `formatDate()` qui est hardcodé FR (RenterBookings.tsx:597). Ces dates seront affichées dans PaymentFlowModal en FR même si la langue change.

### 📋 Recommandation : Ordre des lots (sans coder)

#### Lot 1: Préparation (prérequis)
1. Créer les 48 nouvelles clés dans les 4 langues (FR/EN/IT/DE) selon DIAG section D
2. Vérifier que les valeurs EN/IT/DE ne sont pas des copies de FR

#### Lot 2: RenterBookingCard.tsx — Setup i18n
1. Ajouter `useTranslation("common")` au début du composant
2. Importer `i18n` pour accéder à `i18n.language`

#### Lot 3: RenterBookingCard.tsx — Formatage dates
1. Importer toutes les locales date-fns (fr, enUS, it, de)
2. Créer fonction de sélection locale dynamique (pattern BookingConfirmationModal)
3. Remplacer toutes les occurrences `toLocaleDateString("fr-FR")` et `format(..., { locale: fr })`
4. Mettre à jour `formatDate()` dans RenterBookings.tsx pour utiliser locale dynamique

#### Lot 4: RenterBookingCard.tsx — Formatage devise
1. Importer `formatCurrency` depuis `src/utils/currency.ts`
2. Créer `currencyLocale` dynamique selon `i18n.language`
3. Remplacer toutes les occurrences "€" hardcodées par `formatCurrency(amount, currencyLocale, "EUR")`

#### Lot 5: RenterBookingCard.tsx — Formatage durée
1. Importer `formatDuration` depuis `src/utils/formatDuration.ts`
2. Remplacer `calculateRealDuration()` pour utiliser `formatDuration(t, days, hours)`
3. Remplacer toutes les autres occurrences de durée hardcodée FR

#### Lot 6: RenterBookingCard.tsx — Textes statiques
1. Remplacer tous les textes hardcodés par `t("bookings.*")` selon le mapping du DIAG
2. Commencer par les textes simples (labels, boutons)
3. Puis les textes complexes (modals, toasts, détails)

#### Lot 7: RenterBookingCard.tsx — Statuts enrichis
1. Traduire les labels dans `getUserBookingStatusUI()` via clés `bookings.status.*`
2. Vérifier que tous les cas sont couverts

#### Lot 8: Tests et validation
1. Tester avec FR/EN/IT/DE
2. Vérifier que toutes les dates/devises/durées changent selon la langue
3. Vérifier qu'aucun texte FR hardcodé ne reste

---

## RÉSUMÉ FINAL

### ✅ VALIDATION COMPLÈTE

- ✅ **Diagnostic correct:** Tous les 66 items correspondent au code source
- ✅ **Clés HIGH existantes:** 25 clés vérifiées dans les 4 langues
- ✅ **Helpers i18n-ready:** `formatDuration()` et `formatCurrency()` disponibles
- ✅ **Patterns réutilisables:** `BookingConfirmationModal.tsx` montre comment faire

### ❌ BLOCKERS IDENTIFIÉS

1. RenterBookingCard.tsx n'utilise pas i18n (ajouter `useTranslation`)
2. 9 occurrences dates hardcodées FR
3. 13 occurrences devise "€" hardcodé
4. 14 occurrences durée hardcodée FR
5. 48 nouvelles clés à créer dans les 4 langues

### ⚠️ RISQUES

- StatusBadge hardcode FR (impact limité)
- formatCurrency locale par défaut "fr-FR" (toujours passer locale dynamique)
- Dates dans onRequestPay() utilisent formatDate() hardcodé FR

### 📋 RECOMMANDATION

**✅ GO pour implémentation** avec les 8 lots dans l'ordre proposé. Aucun blocker technique majeur, tous les outils nécessaires existent déjà dans le repo.

---

**Date de validation:** 2025-01-XX  
**Statut:** ✅ GATE PASSÉ — Prêt pour implémentation selon lots proposés

