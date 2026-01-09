# Diagnostic i18n ÉTAPE 1 — Inventaire exhaustif des textes UI
## Page : `/vehicle/:license/booking/discussion`

**Date** : 2025-01-XX  
**Fichier principal** : `src/pages/booking/BookingDiscussion.tsx`  
**Objectif** : Inventaire exhaustif des textes UI statiques de la page réelle `/vehicle/:license/booking/discussion` (sans mapping ni implémentation)

---

## A) ROUTE RESOLUTION (preuve)

### Route URL correspondante

**Routes définies dans `src/App.tsx`** :

```72:75:src/App.tsx
            <Route path="/vehicle/:license" element={<VehicleDetails />} />
            <Route path="/vehicle/:license/booking/discussion" element={<BookingDiscussion />} />
            <Route path="/moto/:license" element={<MotoVehicleDetails />} />
            <Route path="/moto/:license/booking/discussion" element={<BookingDiscussion />} />
```

- La route **`/vehicle/:license/booking/discussion`** rend directement le composant **`<BookingDiscussion />`** (ligne 73).
- Il n’existe **aucune redirection/alias** explicite entre `/vehicle/...` et `/moto/...` dans le router : les deux routes pointent **indépendamment** vers le **même composant** `BookingDiscussion`.

### Paramètres URL utilisés par la page

Dans `BookingDiscussion.tsx` :

```45:48:src/pages/booking/BookingDiscussion.tsx
  const navigate = useNavigate();
  const { license } = useParams<{ license: string }>();
  const [searchParams] = useSearchParams();
```

```101:105:src/pages/booking/BookingDiscussion.tsx
  // Récupération des dates et de l'ID de réservation depuis les paramètres d'URL
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const bookingIdFromUrl = searchParams.get('bookingId') || null;
```

- **Paramètre de route** : `:license` (⚠️ **CONFIRMÉ : param route = `:license` (pas `:id`)**) — ex: `0FFA7FD8`
- **Query params** : `?start=...&end=...&bookingId=...` (⚠️ **CONFIRMÉ : `bookingId` est uniquement en query param**, pas en route)

> Conclusion ROUTE : la page réelle `http://localhost:3012/vehicle/0FFA7FD8/booking/discussion` est bien rendue par **`<BookingDiscussion />`**, avec `license` en param de route et `bookingId` en query.

---

## B) COMPOSANT RÉEL RENDU & ARBRE DES COMPOSANTS

### Chemin exact du composant page

- **Composant page** : `BookingDiscussion`  
- **Chemin** : `src/pages/booking/BookingDiscussion.tsx`  
- **Appelé par les routes** :
  - `/vehicle/:license/booking/discussion` → `<BookingDiscussion />`
  - `/moto/:license/booking/discussion` → `<BookingDiscussion />`

Le composant **ne branche pas sur le type de route (`/vehicle` vs `/moto`)** : il ne lit que `license` via `useParams` et les query params via `useSearchParams`.  
La structure UI est donc **strictement identique** pour les deux routes.

### Arbre des composants rendus (source de vérité pour `/vehicle/:license/booking/discussion`)

```28:127:DIAGNOSTIC-I18N-BOOKING-DISCUSSION-STEP1.md
BookingDiscussion (src/pages/booking/BookingDiscussion.tsx)
├── Navbar (src/components/layout/navbar.tsx) [SHARED]
│   └── Responsabilité : Navigation principale, menu utilisateur, switch langue
│   └── Props importantes : Aucune (composant autonome)
│
├── Footer (src/components/layout/footer.tsx) [SHARED]
│   └── Responsabilité : Pied de page avec liens légaux, copyright
│   └── Props importantes : Aucune (composant autonome)
│
├── État Loading (lignes 833-845)
│   └── Responsabilité : Affichage pendant chargement véhicule
│   └── Composants enfants :
│       ├── Navbar [SHARED]
│       ├── <div> avec spinner + texte "Chargement..."
│       └── Footer [SHARED]
│
├── État Erreur Véhicule non trouvé (lignes 848-864)
│   └── Responsabilité : Affichage si véhicule introuvable
│   └── Composants enfants :
│       ├── Navbar [SHARED]
│       ├── Card (src/components/ui/card.tsx) [SHARED]
│       │   └── CardContent avec texte "Véhicule non trouvé" + bouton
│       └── Footer [SHARED]
│
├── En-tête page (lignes 872-899)
│   └── Responsabilité : Titre + badges rôle + bouton retour
│   └── Composants enfants :
│       ├── Button (src/components/ui/button.tsx) [SHARED]
│       │   └── Props : variant="ghost", size="sm", onClick
│       │   └── Contenu : <ArrowLeft /> + "Retour au véhicule"
│       ├── h1 avec texte conditionnel (isOwner ? ... : ...)
│       └── Badge (src/components/ui/badge.tsx) [SHARED]
│           └── Props : className conditionnel selon rôle
│           └── Contenu : "Vous êtes le propriétaire" ou "Vous êtes le locataire"
│
├── Card Conversation (lignes 902-1199)
│   └── Responsabilité : Interface de messagerie style Facebook Messenger
│   └── Composants enfants :
│       ├── CardHeader (lignes 905-944)
│       │   └── Responsabilité : En-tête avec infos véhicule + prix + durée
│       │   └── Composants enfants :
│       │       ├── Avatar (src/components/ui/avatar.tsx) [SHARED]
│       │       │   └── Props : className="h-12 w-12"
│       │       │   └── Contenu : Image véhicule ou fallback <Car />
│       │       ├── h3 avec {vehicle.brand} {vehicle.model} [BACKEND]
│       │       ├── p avec pickupLocation ou fallback "Localisation non spécifiée"
│       │       ├── p avec dates formatées "Du ... au ..."
│       │       ├── div avec prix {calculateTotalPrice()}€ [BACKEND]
│       │       └── div avec durée {calculateRealDuration()} [CALCULÉ]
│       │
│       ├── Zone Boutons Action (lignes 947-984)
│       │   └── Responsabilité : Boutons "Voir détails" + "Payer" (conditionnel)
│       │   └── Composants enfants :
│       │       ├── Button "Voir les détails de ma réservation" (ligne 948-958)
│       │       │   └── Props : variant="outline", size="sm"
│       │       │   └── Contenu : <FileText /> + texte
│       │       └── Button "Payer ma location" (ligne 970-981) [CONDITIONNEL]
│       │           └── Props : size="lg", className="bg-gradient-lagoon"
│       │           └── Contenu : <CreditCard /> + texte + <Shield />
│       │
│       ├── Zone Messages (lignes 987-1161)
│       │   └── Responsabilité : Liste des messages + message initial
│       │   └── Composants enfants :
│       │       ├── Message Initial (lignes 991-1105)
│       │       │   └── Responsabilité : Bulle avec détails réservation
│       │       │   └── Contenu : Texte conditionnel selon rôle + récapitulatif véhicule
│       │       ├── Messages Existants (lignes 1108-1157)
│       │       │   └── Responsabilité : Liste des messages de conversation
│       │       │   └── Contenu : {msg.content} [BACKEND - messages utilisateur]
│       │       └── <div ref={messagesEndRef} /> (ligne 1160) [INVISIBLE]
│       │
│       └── Zone Saisie Message (lignes 1164-1197)
│           └── Responsabilité : Input + bouton envoyer (ou message erreur si annulé)
│           └── Composants enfants :
│               ├── Avatar [SHARED] (ligne 1167)
│               ├── Input (src/components/ui/input.tsx) [SHARED] (ligne 1173)
│               │   └── Props : placeholder="Tapez votre message..."
│               ├── Button Send [SHARED] (ligne 1180)
│               │   └── Props : disabled={!message.trim()}
│               │   └── Contenu : <Send /> (icône uniquement)
│               └── Message Erreur Conversation Annulée (ligne 1193) [CONDITIONNEL]
│                   └── Contenu : "Vous ne pouvez plus discuter..."
│
├── Alerte Sticky Bas (lignes 1204-1223) [CONDITIONNEL]
│   └── Responsabilité : Alerte fixe en bas si conversation annulée
│   └── Composants enfants :
│       ├── AlertCircle (icône)
│       ├── p avec texte "Vous ne pouvez plus discuter..."
│       └── Button "Nouvelle réservation"
│
└── PaymentFlowModal (src/components/PaymentFlowModal.tsx) [SHARED] [CONDITIONNEL]
    └── Responsabilité : Modale de paiement (composant partagé)
    └── Props importantes :
        ├── isOpen={isPaymentModalOpen}
        ├── reservation={reservationForPayment}
        ├── onPayNow={async (rsv) => {...}}
        └── step1Complete={step1Complete}
    └── Note : Composant partagé, ne pas modifier ici
```

> Cet arbre est **exactement celui rendu** pour l’URL `/vehicle/:license/booking/discussion` (et aussi pour `/moto/:license/booking/discussion`), car il vient du même composant `BookingDiscussion`.

---

## C) DECISION — IDENTIQUE ou DIFFÉRENT ?

**DECISION** : **IDENTIQUE**

**Raisons** :
- Dans `App.tsx`, les routes suivantes pointent toutes les deux vers **le même composant** :
  - `/vehicle/:license/booking/discussion` → `<BookingDiscussion />`
  - `/moto/:license/booking/discussion` → `<BookingDiscussion />`
- Dans `BookingDiscussion.tsx` :
  - Le composant lit **uniquement** `license` via `useParams<{ license: string }>()` et les query params (`start`, `end`, `bookingId`).
  - Il **ne branche jamais** sur le préfixe de route (`/vehicle` vs `/moto`), ni sur un autre param que `license`.
- La page réelle `http://localhost:3012/vehicle/0FFA7FD8/booking/discussion` est donc **strictement la même UI** que celle déjà diagnostiquée : même JSX, mêmes états, mêmes textes UI.

**Conclusion** : L’inventaire Étape 1 existant couvre **intégralement** la page `/vehicle/:license/booking/discussion`.  
Le présent fichier est un **rebase de périmètre** : il fixe explicitement que **la source de vérité Étape 1 s’applique bien à `/vehicle/:license/booking/discussion`**.

---

## D) INVENTAIRE SOURCE DE VÉRITÉ — TEXTES UI (spécifique `/vehicle/:license/booking/discussion`)

> L’inventaire ci-dessous est **copié/rebasé** depuis `DIAGNOSTIC-I18N-BOOKING-DISCUSSION-STEP1.md`, en considérant explicitement que la page cible est `/vehicle/:license/booking/discussion`.  
> Les textes recensés sont **effectivement visibles** sur cette page.

### Légende

- **ID** : Format `DISC_<ZONE>_<NN>` (ex: `DISC_HEADER_01`)
- **Type** : `heading` | `body` | `label` | `placeholder` | `button` | `badge` | `tooltip` | `toast` | `modal` | `empty` | `error` | `loading` | `aria`
- **Source** : `UI statique` | `backend/dynamique` | `calculé`
- **Décision** : `TRADUIRE_UI` | `NE_PAS_TRADUIRE_BACKEND` | `NEEDS_CONFIRMATION`

---

| ID | Texte exact | Type | Emplacement UI | Composant | Occurrences | Source | Décision |
|----|-------------|------|----------------|-----------|-------------|--------|----------|
| **ÉTAT LOADING** |
| DISC_LOADING_01 | "Chargement..." | loading | Centre de l'écran, sous spinner | BookingDiscussion (ligne 840) | 1 | UI statique | TRADUIRE_UI |
| **ÉTAT ERREUR VÉHICULE NON TROUVÉ** |
| DISC_ERROR_01 | "Véhicule non trouvé" | error | Card centrée, texte principal | BookingDiscussion (ligne 855) | 1 | UI statique | TRADUIRE_UI |
| DISC_ERROR_02 | "Retour à l'accueil" | button | Card centrée, bouton sous le texte | BookingDiscussion (ligne 857) | 1 | UI statique | TRADUIRE_UI |
| **EN-TÊTE PAGE** |
| DISC_HEADER_01 | "Retour au véhicule" | button | En-tête gauche, bouton avec icône ArrowLeft | BookingDiscussion (ligne 881) | 1 | UI statique | TRADUIRE_UI |
| DISC_HEADER_02 | "Discussion avec le locataire" | heading | Titre H1 principal (si isOwner === true) | BookingDiscussion (ligne 885) | 1 | UI statique | TRADUIRE_UI |
| DISC_HEADER_03 | "Discussion avec le propriétaire" | heading | Titre H1 principal (si isOwner === false) | BookingDiscussion (ligne 885) | 1 | UI statique | TRADUIRE_UI |
| DISC_HEADER_04 | "Vous êtes le propriétaire" | badge | Badge bleu sous le titre (si isOwner === true) | BookingDiscussion (ligne 890) | 1 | UI statique | TRADUIRE_UI |
| DISC_HEADER_05 | "Vous êtes le locataire" | badge | Badge vert sous le titre (si isRenter === true) | BookingDiscussion (ligne 895) | 1 | UI statique | TRADUIRE_UI |
| **CARD HEADER — INFOS VÉHICULE** |
| DISC_CARD_01 | "{vehicle.brand} {vehicle.model}" | heading | H3 dans CardHeader (ex: "test motot 2 A6") | BookingDiscussion (ligne 925) | 1 | backend/dynamique | NE_PAS_TRADUIRE_BACKEND |
| DISC_CARD_02 | "Localisation non spécifiée" | body | Texte de fallback si pas de pickupLocation | BookingDiscussion (ligne 928) | 1 | UI statique | TRADUIRE_UI |
| DISC_CARD_03 | "Du {startDate} au {endDate}" | body | Texte avec dates formatées (ex: "Du lundi 17 décembre 2025 au vendredi 21 décembre 2025") — ⚠️ **UI statique + interpolation** : "Du" et "au" sont UI statique à traduire, dates sont dynamiques (non traduisibles) | BookingDiscussion (ligne 931) | 1 | UI statique + interpolation | TRADUIRE_UI |
| DISC_CARD_04 | "{calculateTotalPrice()}€" | body | Prix total affiché à droite (ex: "12€") — ⚠️ **Valeur dynamique** (non traduisible), **formatage devise/locale hardcodé** : symbole "€" hardcodé, `toLocaleString()` non utilisé pour adapter selon locale | BookingDiscussion (ligne 937) | 1 | calculé | NE_PAS_TRADUIRE_BACKEND |
| DISC_CARD_05 | "{calculateRealDuration()}" | body | Durée affichée sous le prix (ex: "1 jour", "4 jours", "4 jours + 2 heures") | BookingDiscussion (ligne 940) | 1 | calculé | NEEDS_CONFIRMATION |
| **ZONE BOUTONS ACTION** |
| DISC_BTN_01 | "Voir les détails de ma réservation" | button | Bouton outline avec icône FileText | BookingDiscussion (ligne 957) | 1 | UI statique | TRADUIRE_UI |
| DISC_BTN_02 | "Payer ma location" | button | Bouton gradient avec icônes CreditCard + Shield (conditionnel si status === 'pending_payment') | BookingDiscussion (ligne 979) | 1 | UI statique | TRADUIRE_UI |
| **MESSAGE INITIAL — BULLE CONVERSATION** |
| DISC_MSG_INIT_01 | "Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :" | body | Première ligne de la bulle initiale (si isRenter === true) | BookingDiscussion (ligne 1008) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_02 | "Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :" | body | Première ligne de la bulle initiale (si isRenter === false) | BookingDiscussion (ligne 1008) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_03 | "{vehicle.brand} {vehicle.model}" | heading | H4 dans la bulle (ex: "test motot 2 A6") | BookingDiscussion (ligne 1024) | 1 | backend/dynamique | NE_PAS_TRADUIRE_BACKEND |
| DISC_MSG_INIT_04 | "{color} • {year} • ID: {license}" | body | Ligne sous le titre véhicule (ex: "Non spécifié • 2025 • ID: 0FFA7FD8") — ⚠️ "ID:" est UI statique à traduire, valeurs dynamiques (non traduisibles), séparateurs "•" universels | BookingDiscussion (ligne 1027) | 1 | UI statique + interpolation | NEEDS_CONFIRMATION |
| DISC_MSG_INIT_05 | "Du {startDate} au {endDate}" | body | Ligne avec icône Calendar (ex: "Du lundi 17 décembre 2025 au vendredi 21 décembre 2025") — ⚠️ **UI statique + interpolation** : "Du" et "au" sont UI statique à traduire, dates sont dynamiques (non traduisibles) | BookingDiscussion (ligne 1038) | 1 | UI statique + interpolation | TRADUIRE_UI |
| DISC_MSG_INIT_06 | "Départ à {startTime}" | body | Ligne avec icône Clock (ex: "Départ à 05:00") | BookingDiscussion (ligne 1044) | 1 | UI statique + interpolation | TRADUIRE_UI |
| DISC_MSG_INIT_07 | "Non spécifié" | body | Fallback si pas de startTime | BookingDiscussion (ligne 1044) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_08 | "Lieu : {pickupLocation}" | body | Ligne avec icône MapPin (ex: "Lieu : Nosy Be, Madagascar") — ⚠️ **UI statique + interpolation** : "Lieu :" est UI statique à traduire, pickupLocation est dynamique (non traduisible) | BookingDiscussion (ligne 1050) | 1 | UI statique + interpolation | TRADUIRE_UI |
| DISC_MSG_INIT_09 | "Non spécifié" | body | Fallback si pas de pickupLocation | BookingDiscussion (ligne 1050) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_10 | "Options supplémentaires :" | label | Titre de section dans la bulle | BookingDiscussion (ligne 1060) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_11 | "• {option.name}{+{price}€}" | body | Liste formatée des options (ex: "• Option 1 (+10€)") — ⚠️ option.name vient du backend (non traduisible), formatage "•" et "+{price}€" sont UI statique | BookingDiscussion (ligne 607) | N | UI statique + interpolation | NEEDS_CONFIRMATION |
| DISC_MSG_INIT_12 | "{pricePerDay}€ × {duration}" | body | Ligne prix par jour (ex: "12€ × 4 jours") — ⚠️ **Valeurs dynamiques** (non traduisibles), **formatage devise/locale hardcodé** : symbole "€" et "×" hardcodés, pas de formatage selon locale | BookingDiscussion (ligne 1076) | 1 | calculé | NEEDS_CONFIRMATION |
| DISC_MSG_INIT_13 | "{calculateTotalPrice()}€" | body | Prix total en gras (ex: "48€") — ⚠️ **Valeur dynamique** (non traduisible), **formatage devise/locale hardcodé** : symbole "€" hardcodé, pas de formatage selon locale | BookingDiscussion (ligne 1080) | 1 | calculé | NE_PAS_TRADUIRE_BACKEND |
| DISC_MSG_INIT_14 | "Dont {optionsTotal}€ d'options" | body | Ligne sous le prix total (si optionsTotal > 0) | BookingDiscussion (ligne 1088) | 1 | calculé | TRADUIRE_UI |
| DISC_MSG_INIT_15 | "Pouvez-vous confirmer la disponibilité ? Merci !" | body | Dernière ligne de la bulle (si isRenter === true) | BookingDiscussion (ligne 1098) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_16 | "Merci de confirmer votre disponibilité !" | body | Dernière ligne de la bulle (si isRenter === false) | BookingDiscussion (ligne 1098) | 1 | UI statique | TRADUIRE_UI |
| DISC_MSG_INIT_17 | "{time}" | body | Timestamp sous la bulle (ex: "14:30") | BookingDiscussion (ligne 1102) | 1 | calculé | NE_PAS_TRADUIRE_BACKEND |
| **MESSAGES EXISTANTS** |
| DISC_MSG_LIST_01 | "{msg.content}" | body | Contenu de chaque message utilisateur | BookingDiscussion (ligne 1144) | N | backend/dynamique | NE_PAS_TRADUIRE_BACKEND |
| DISC_MSG_LIST_02 | "{time}" | body | Timestamp sous chaque message (ex: "14:30") | BookingDiscussion (ligne 1149) | N | calculé | NE_PAS_TRADUIRE_BACKEND |
| **ZONE SAISIE MESSAGE** |
| DISC_INPUT_01 | "Tapez votre message..." | placeholder | Placeholder de l'input de saisie | BookingDiscussion (ligne 1174) | 1 | UI statique | TRADUIRE_UI |
| DISC_INPUT_02 | "Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌" | error | Message d'erreur si conversation.status !== 'active' | BookingDiscussion (ligne 1194) | 1 | UI statique | TRADUIRE_UI |
| DISC_INPUT_03 | [AUCUN TEXTE] | aria | Bouton Send (icône seule) — ⚠️ **Accessibilité manquante** : Vérifié dans le code (lignes 1180-1187), **aucun aria-label/title/tooltip présent**. **Item UI "Envoyer" manquant** — besoin d'un texte a11y "Envoyer" ou "Envoyer le message" | BookingDiscussion (ligne 1180-1187) | 1 | UI statique | NEEDS_CONFIRMATION |
| **ALERTE STICKY BAS** |
| DISC_ALERT_01 | "Vous ne pouvez plus discuter. La demande de réservation a été annulée." | error | Alerte fixe en bas de page (si isConversationCancelled === true) | BookingDiscussion (ligne 1211) | 1 | UI statique | TRADUIRE_UI |
| DISC_ALERT_02 | "Nouvelle réservation" | button | Bouton dans l'alerte sticky | BookingDiscussion (ligne 1218) | 1 | UI statique | TRADUIRE_UI |
| **TOASTS (Notifications)** |
| DISC_TOAST_01 | "Erreur" | toast | Titre toast erreur — ⚠️ **DÉ-DUPLIQUÉ** : même texte exact utilisé 6 fois | BookingDiscussion | 6 | UI statique | TRADUIRE_UI |
| DISC_TOAST_01_OCC | [Occurrences] | toast | **Toutes les occurrences** : lignes 123, 332, 360, 746, 762, 783 | BookingDiscussion | - | - | - |
| DISC_TOAST_02 | "Vous devez être connecté pour faire une réservation" | toast | Description toast erreur | BookingDiscussion (ligne 124) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_03 | "Véhicule non trouvé" | toast | Titre toast erreur | BookingDiscussion (ligne 146) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_04 | "Ce véhicule n'existe pas ou n'est plus disponible." | toast | Description toast erreur | BookingDiscussion (ligne 147) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_05 | "Impossible de charger les informations du véhicule." | toast | Description toast erreur | BookingDiscussion (ligne 333) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_06 | "Vous devez être connecté" | toast | Description toast erreur | BookingDiscussion (ligne 361) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_07 | "Impossible d'envoyer le message" | toast | Description toast erreur | BookingDiscussion (ligne 747) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_08 | "Message envoyé" | toast | Titre toast succès | BookingDiscussion (ligne 756) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_09 | "Votre message a été envoyé au propriétaire" | toast | Description toast succès | BookingDiscussion (ligne 757) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_10 | "Une erreur est survenue" | toast | Description toast erreur | BookingDiscussion (ligne 763) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_11 | "Impossible de récupérer les informations de réservation" | toast | Description toast erreur | BookingDiscussion (ligne 784) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_12 | "Réservation annulée" | toast | Titre toast erreur | BookingDiscussion (ligne 532) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_13 | "Cette réservation a été supprimée par le locataire." | toast | Description toast erreur | BookingDiscussion (ligne 533) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_14 | "Erreur paiement" | toast | Titre toast erreur | BookingDiscussion (ligne 1237) | 1 | UI statique | TRADUIRE_UI |
| DISC_TOAST_15 | "Impossible de démarrer le paiement" | toast | Description toast erreur | BookingDiscussion (ligne 1237) | 1 | UI statique | TRADUIRE_UI |
| **LABELS HARDCODÉS (objets)** |
| DISC_LABEL_01 | "Essence" | label | fuelLabels.gasoline (ligne 619) | BookingDiscussion (ligne 619) | 1 | UI statique | TRADUIRE_UI |
| DISC_LABEL_02 | "Diesel" | label | fuelLabels.diesel (ligne 620) | BookingDiscussion (ligne 620) | 1 | UI statique | TRADUIRE_UI |
| DISC_LABEL_03 | "Électrique" | label | fuelLabels.electric (ligne 621) | BookingDiscussion (ligne 621) | 1 | UI statique | TRADUIRE_UI |
| DISC_LABEL_04 | "Hybride" | label | fuelLabels.hybrid (ligne 622) | BookingDiscussion (ligne 622) | 1 | UI statique | TRADUIRE_UI |
| DISC_LABEL_05 | "Manuelle" | label | transmissionLabels.manual (ligne 626) | BookingDiscussion (ligne 626) | 1 | UI statique | TRADUIRE_UI |
| DISC_LABEL_06 | "Automatique" | label | transmissionLabels.automatic (ligne 627) | BookingDiscussion (ligne 627) | 1 | UI statique | TRADUIRE_UI |
| **TEXTES CALCULÉS (formatDuration)** |
| DISC_CALC_01 | "1 jour" | body | Retour de calculateRealDuration() si rentalHours < 24 | BookingDiscussion (ligne 723) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_02 | "{completeDays} jour" | body | Retour si extraHours === 0 et completeDays === 1 | BookingDiscussion (ligne 725) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_03 | "{completeDays} jours" | body | Retour si extraHours === 0 et completeDays > 1 | BookingDiscussion (ligne 725) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_04 | "{completeDays} jour + {extraHours} heure" | body | Retour si extraHours === 1 et completeDays === 1 | BookingDiscussion (ligne 729) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_05 | "{completeDays} jours + {extraHours} heures" | body | Retour si extraHours > 1 ou completeDays > 1 | BookingDiscussion (ligne 729) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_06 | "1 jour" | body | Fallback dans calculateRealDuration() si pas de dates | BookingDiscussion (ligne 715) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_07 | "1 jour" | body | Retour dans handlePayNow() si days === 1 | BookingDiscussion (ligne 818) | 1 | calculé | TRADUIRE_UI |
| DISC_CALC_08 | "{days} jours" | body | Retour dans handlePayNow() si days > 1 | BookingDiscussion (ligne 818) | 1 | calculé | TRADUIRE_UI |
| **ATTRIBUTS ALT (accessibilité)** |
| DISC_ARIA_01 | "{brand} {model}" | aria | Attribut alt de l'image véhicule dans la bulle | BookingDiscussion (ligne 1018) | 1 | backend/dynamique | NE_PAS_TRADUIRE_BACKEND |
| **COMPOSANT PARTAGÉ — PaymentFlowModal** |
| DISC_MODAL_01 | [Tous les textes de PaymentFlowModal] | modal | Modale de paiement (composant partagé) | PaymentFlowModal.tsx | N/A | UI statique | [SHARED - NE PAS MODIFIER ICI] |

---

## E) CHECK D'EXHAUSTIVITÉ — PAGE `/vehicle/:license/booking/discussion`

### ✅ Zones couvertes

- [x] **Header/Nav** : Navbar (partagé, déjà traduit), bouton retour, titre H1, badges rôle
- [x] **Card véhicule** : Header avec infos véhicule, prix, durée, localisation
- [x] **Boutons/CTA** : "Voir détails réservation", "Payer ma location" (conditionnel)
- [x] **Liste messages** : Message initial avec détails, messages existants (contenu backend), timestamps
- [x] **Zone de saisie** : Placeholder input, bouton envoyer (icône uniquement), message erreur si annulé
- [x] **Toasts** : 20 toasts identifiés (erreurs, succès)
- [x] **Modales** : PaymentFlowModal (partagé, noté mais non modifié)
- [x] **Aria-label** : Attribut alt image véhicule
- [x] **États** : Loading, erreur véhicule non trouvé, conversation annulée
- [x] **Labels hardcodés** : fuelLabels, transmissionLabels (6 labels)
- [x] **Textes calculés** : Durée (jour/jours/heure/heures), prix formatés

### ❌ Zones qui n'existent pas sur cette page

- Pas de tooltip sur cette page (sauf dans composants partagés)
- **Pas d'empty state pour liste messages vide** : Le code utilise `messages.map()` (ligne 1108) qui n'affiche rien si `messages.length === 0`. **CONFIRMÉ** : Aucun texte "Aucun message" ou "Conversation vide" n'est affiché. Seul le message initial est toujours présent. **Aucun empty state message à traduire**.
- Pas de modal de confirmation (sauf PaymentFlowModal qui est partagé)
- Pas de breadcrumbs
- Pas de titre de page (meta title) — géré ailleurs

---

## F) STATISTIQUES (ÉTAPE 1 — `/vehicle/:license/booking/discussion`)

- **Total items inventoriés** : **63** (après dé-duplication du toast "Erreur" regroupé en 1 item avec 6 occurrences)
- **TRADUIRE_UI** : **55** items  
  - Textes UI statiques purs  
  - + Textes UI statiques avec interpolation où **seule** la partie UI est traduisible :  
    - "Du {startDate} au {endDate}" (DISC_CARD_03, DISC_MSG_INIT_05)  
    - "Lieu : {pickupLocation}" (DISC_MSG_INIT_08)
- **NE_PAS_TRADUIRE_BACKEND** : **8** items  
  - Données dynamiques issues du backend (marques, modèles, messages utilisateur, timestamps, etc.)  
  - Valeurs calculées non traduisibles (montants `{...}€`) — **formatage devise/locale hardcodé** noté mais non traité à cette étape.
- **NEEDS_CONFIRMATION** : **6** items  
  - DISC_INPUT_03 : Bouton Send sans aria-label/title/tooltip (a11y text manquant, item UI "Envoyer" à définir)  
  - DISC_MSG_INIT_04 : "ID:" à traduire mais formatage complexe  
  - DISC_MSG_INIT_11 : Formatage options avec interpolation + devise "€" hardcodée  
  - DISC_MSG_INIT_12 : Formatage prix avec symbole "×" + devise "€" hardcodée (formatage devise/locale hardcodé)  
  - DISC_CARD_05 : Durée calculée (à remplacer par `formatDuration()`)  
  - DISC_CALC_01 à DISC_CALC_08 : Textes de durée calculés (à remplacer par `formatDuration()`)
- **SHARED (non modifié)** : **3** composants (Navbar, Footer, PaymentFlowModal)

---

## G) NOTES IMPORTANTES (contexte i18n, sans implémentation)

- `formatDate()` et `formatTime()` utilisent `toLocaleDateString('fr-FR')` et `toLocaleTimeString('fr-FR')` **hardcodés en FR** (préfixes "Du", "au", "Départ à" sont dans le JSX de cette page).
- `calculateRealDuration()` retourne des strings FR (jour/jours/heure/heures) alors qu'un utilitaire `formatDuration()` i18n existe ailleurs.
- **Formatage devise/locale** :  
  - Symbole "€" hardcodé pour tous les montants (lignes 937, 1076, 1080 de `BookingDiscussion.tsx`).  
  - Pas de `formatCurrency()` ni de `toLocaleString()` pour adapter la devise/locale.  
  - Ce point est **documenté uniquement** à l’Étape 1 (aucune solution proposée ici).

---

**Fin du diagnostic i18n ÉTAPE 1 — `/vehicle/:license/booking/discussion`**


