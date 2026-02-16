# DIAG ONLY — PHASE 3.2 (Option A strict) — AUCUNE IMPLEMENTATION

**Date** : 2026-02-14  
**Contexte** : Phase 1 OK (vehicles.deposit_amount). Phase 2 OK (deposit_amount_snapshot, deposit_status). Phase 3.1 OK (colonnes Stripe-ready sur bookings).  
**Option A strict** : Le locataire clique "Activer la caution" → SetupIntent pour enregistrer une carte → attach PaymentMethod au customer → mise à jour booking (`stripe_payment_method_id`, `deposit_status='card_registered'`). **Aucun hold** dans cette phase.  
**Mode** : Diagnostic uniquement — aucun fichier modifié, aucun patch, pas de code.

---

## 1) UI — Où brancher le bouton "Activer la caution"

### 1.1 Emplacement exact du CTA

| Élément | Fichier | Lignes | Description |
|---------|---------|--------|-------------|
| **Bouton CTA** | `src/components/RenterBookingCard.tsx` | L.1217-1272 | Zone "Actions supplémentaires" : bouton "Finaliser ma réservation" conditionné par `statusUI?.showDepositCTA` |
| **Rendu conditionnel** | `src/components/RenterBookingCard.tsx` | L.1219-1272 | `if (statusUI && statusUI.showDepositCTA)` → affiche le bouton |
| **Clic actuel** | `src/components/RenterBookingCard.tsx` | L.1224-1257 | **Problème** : appelle `onRequestPay?.({ id, voiture, ... })` → ouvre **PaymentFlowModal** et déclenche le flow **paiement location** |

### 1.2 Vérification : le CTA ne doit pas déclencher paiement location

**État actuel** : Le clic sur "Finaliser ma réservation" appelle `onRequestPay` (L.1246) avec les données de réservation (id, voiture, dates, montant location, etc.).

**Chaine d’appel** :
- `RenterBookings.tsx` L.870-876 : `onRequestPay={(reservation) => { setReservationCourante(reservation); setModalMode("avantPaiement"); setStep1Complete(false); setIsModalOpen(true); }}`
- Ouverture de `PaymentFlowModal` (L.936-974) avec `onPayNow={async (rsv) => { await payerLocation(rsv); }}`
- `payerLocation` redirige vers Stripe Checkout (Edge Function `create-checkout-session`)

**Conclusion** : ✅ Le CTA **ne déclenche pas** `payerLocation` directement au clic — il ouvre seulement la modale. Mais la modale affiche l’étape 1 (payer location) et l’étape 2 (Bloquer ma caution). Quand `bookingPaid` est true (status=confirmed), l’étape 1 est marquée "Terminé", et l’étape 2 affiche le bouton "Bloquer ma caution" (L.229-237) qui fait `console.log("TODO caution")`. Donc :
- **Cas pending_payment** : le CTA "Finaliser" n’apparaît pas (showDepositCTA=false) ; c’est le bouton "Payer ma location" (L.1274-1316) qui appelle onRequestPay.
- **Cas confirmed + deposit_status pending** : le CTA "Finaliser ma réservation" appelle onRequestPay → ouvre PaymentFlowModal avec étape 1 complète, étape 2 "Bloquer ma caution" visible mais **ne fait rien** (TODO).

**Risque identifié** : Le même `onRequestPay` est utilisé pour les deux contextes (paiement location vs caution). Pour Phase 3.2, il faut **découpler** : quand `showDepositCTA`, le bouton doit appeler un handler **caution** (`onRequestDeposit`) et ouvrir **DepositFlowModal**, pas PaymentFlowModal.

### 1.3 Critères de visibilité du bouton

**Fonction** : `getUserBookingStatusUI()` dans `RenterBookingCard.tsx` L.391-457

**Cas A actuel** (L.399-408) :
```
booking.status === 'confirmed' && depositStatus === 'pending'
→ showDepositCTA: true, depositCTALabel: t('bookings.card.finalizeBooking')
```

**Données utilisées** :
- `depositStatus` = `(booking as any).depositStatus` (mappé depuis `deposit_status` dans RenterBookings L.489, 536)
- `depositAmount` = `(booking as any).depositAmount` (mappé depuis `deposit_amount_snapshot` L.490, 537)

**Lacune** : La condition ne vérifie **pas** `deposit_amount_snapshot > 0`. En Phase 2, `deposit_status='pending'` implique normalement `deposit_amount_snapshot > 0` (snapshot à l’acceptation). Pour Phase 3.2, ajouter une vérification explicite :
- `(depositAmount == null || Number(depositAmount) > 0)` pour éviter d’afficher le bouton si snapshot = 0 (edge case).

**Checklist visibilité** :

| Condition | Fichier | Ligne approx. | Action future |
|-----------|---------|----------------|---------------|
| `deposit_amount_snapshot = 0` | `RenterBookingCard.tsx` | L.399 | → bouton **absent** (ajouter check `depositAmount > 0`) |
| `deposit_status !== 'pending'` | `RenterBookingCard.tsx` | L.399 | → bouton absent (déjà géré) |
| `deposit_status === 'card_registered'` | `RenterBookingCard.tsx` | L.411-418 | → showDepositCTA: false (badge "Paiement et caution validés") |
| `deposit_status === 'pending' && snapshot > 0` | `RenterBookingCard.tsx` | L.399-407 | → bouton **présent** |

### 1.4 Emplacement d’injection de la modale caution

**Option recommandée** : Créer un composant **DepositFlowModal** distinct et l’ouvrir :
1. Depuis **RenterBookingCard** : quand `showDepositCTA`, remplacer l’appel `onRequestPay` par `onRequestDeposit?.(booking)`.
2. Depuis **RenterBookings** : gérer `onRequestDeposit` → `setDepositModalBooking(booking); setIsDepositModalOpen(true)`.
3. Depuis **PaymentFlowModal** (étape 2) : remplacer `onClick={() => console.log("TODO caution")}` (L.234) par `onClick={() => onRequestDeposit?.(booking)}` — pour le cas où l’utilisateur arrive depuis PaymentSuccess et voit la modale avec étape 2 mise en avant.

**Fichiers à modifier (plus tard)** :
- `src/components/RenterBookingCard.tsx` : ajouter prop `onRequestDeposit`, changer le `onClick` du bouton showDepositCTA pour appeler `onRequestDeposit` au lieu de `onRequestPay`.
- `src/pages/renter/RenterBookings.tsx` : état `depositModalBooking`, `isDepositModalOpen`, passer `onRequestDeposit` à RenterBookingCard, rendre `<DepositFlowModal />`.
- `src/components/PaymentFlowModal.tsx` : prop `onRequestDeposit` + `depositBooking`, remplacer le `onClick` L.234.

**Fichier à créer** :
- `src/components/DepositFlowModal.tsx` : modale avec texte légal + Stripe Elements (SetupIntent).

---

## 2) Modale "Caution" — contenu légal + UX

### 2.1 Gestion des modales existantes

| Modale | Fichier | Usage |
|--------|---------|-------|
| **PaymentFlowModal** | `src/components/PaymentFlowModal.tsx` | Étape 1 : paiement location (Stripe Checkout redirect). Étape 2 : "Bloquer ma caution" (TODO). Utilise `Dialog` de shadcn (L.47) |
| **Autres modales** | Divers composants | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` depuis `@/components/ui/dialog` |

### 2.2 Placement proposé pour DepositFlowModal

**Création** : Nouveau fichier `src/components/DepositFlowModal.tsx` (à créer plus tard).

**Structure** : Même pattern que PaymentFlowModal — `Dialog` avec `DialogContent`, contenu :
- Titre : "Activer ma caution" (i18n)
- Bloc texte légal (voir 2.3)
- Zone Stripe Elements (PaymentElement ou CardElement pour SetupIntent)
- Bouton "Confirmer"
- Gestion loading + erreurs

**Props à prévoir** :
- `isOpen: boolean`
- `onClose: () => void`
- `bookingId: string`
- `depositAmount: number`
- `onSuccess?: () => void`

### 2.3 i18n

**Emplacement des clés** : `src/i18n/locales/{fr,en,de,it}/common.json`

**Clés existantes** :
- `bookings.card.finalizeBooking` : "Finaliser ma réservation" (fr) — peut être conservée ou dupliquée pour "Activer la caution"
- `bookings.status.depositPending` : "En attente de la caution"
- `bookings.status.paymentDepositValidated` : "Paiement et caution validés"
- `sinistreCaution.caution.*` : texte sur la caution (L.1022-1060 fr)

**Nouvelles clés à ajouter** (namespace suggéré `depositModal.*`) :
- `depositModal.title`
- `depositModal.legal.paragraph1` (empreinte, non débit)
- `depositModal.legal.paragraph2` (48h avant, libération 48h après)
- `depositModal.legal.paragraph3` (plafond carte, litiges)
- `depositModal.confirmButton`
- `depositModal.loading`
- `depositModal.error.*` (carte refusée, SCA, réseau)

### 2.4 Checklist contenu UI modale caution

| Élément | Obligatoire | Description |
|---------|-------------|-------------|
| Empreinte, non débit | ✅ | Expliquer que le montant n’est pas débité, seule une empreinte est enregistrée |
| 48h avant | ✅ | Hold 48h avant le départ (Phase 3+ ; Phase 3.2 = simple enregistrement) |
| Libération 48h après | ✅ | Libération automatique 48h après retour (Phase 3+) |
| Plafond carte | ✅ | Mentionner que la carte doit pouvoir accepter un blocage du montant |
| Litiges | ✅ | Référence à la page /sinistre-caution pour les procédures |
| Bouton "Confirmer" | ✅ | Déclenche la confirmation du SetupIntent |
| Loading | ✅ | Désactiver le bouton pendant `stripe.confirmSetup()` |
| Erreurs Stripe | ✅ | Afficher le message (carte refusée, SCA non complétée, etc.) |

---

## 3) Backend — endpoints requis (sans coder)

### 3.1 Emplacement des routes

**Fichier** : `server/index.ts`

**Position** : Après `app.use(express.json())` (L.230-234), avant ou après `/api/contact` (L.262). Recommandation : ajouter un bloc `// === Routes deposit Phase 3.2 ===` vers L.260.

### 3.2 Endpoint `POST /api/deposit/create-setup-intent`

| Aspect | Détail |
|--------|--------|
| **Input** | `{ bookingId: string }` (JSON body) |
| **Validations** | `bookingId` requis, non vide, format UUID si applicable |
| **Auth** | JWT Supabase dans `Authorization: Bearer <token>` (voir 3.4) |
| **Lecture DB** | `bookings` : `id`, `user_id`, `deposit_status`, `deposit_amount_snapshot`, `status` ; `profiles` : `id`, `email`, `stripe_customer_id` |
| **Écriture DB** | Aucune pour cet endpoint (SetupIntent côté Stripe uniquement) |
| **Logique** | 1) Valider JWT → user_id ; 2) Vérifier booking.user_id === user_id ; 3) Vérifier booking.status === 'confirmed' ; 4) Vérifier deposit_status === 'pending' ; 5) Vérifier deposit_amount_snapshot > 0 ; 6) Refuser si deposit_status === 'card_registered' ; 7) Récupérer ou créer Stripe Customer (profiles.stripe_customer_id) ; 8) `stripe.setupIntents.create({ customer, usage: 'off_session', metadata: { bookingId, type: 'deposit' } })` ; 9) Retourner `{ clientSecret }` |
| **Metadata Stripe** | `bookingId`, `type: 'deposit'` |
| **Réponse** | `{ clientSecret: string }` |

### 3.3 Endpoint `POST /api/deposit/attach-payment-method`

| Aspect | Détail |
|--------|--------|
| **Input** | `{ bookingId: string, paymentMethodId: string }` (JSON body) |
| **Validations** | `bookingId` et `paymentMethodId` requis, non vides |
| **Auth** | JWT Supabase dans `Authorization: Bearer <token>` |
| **Lecture DB** | `bookings` : `id`, `user_id`, `deposit_status`, `stripe_payment_method_id` ; `profiles` : `stripe_customer_id` |
| **Écriture DB** | `bookings` : `stripe_payment_method_id`, `deposit_status = 'card_registered'`, `updated_at` |
| **Logique** | 1) Valider JWT → user_id ; 2) Vérifier booking.user_id === user_id ; 3) Vérifier deposit_status === 'pending' ; 4) Refuser si stripe_payment_method_id déjà défini ; 5) Récupérer PaymentMethod Stripe, vérifier customer ; 6) Si pm.customer !== profile.stripe_customer_id → `stripe.paymentMethods.attach(pm, { customer })` ; 7) Update bookings SET stripe_payment_method_id, deposit_status='card_registered' |
| **Metadata** | Aucune écriture metadata côté DB pour Phase 3.2 |
| **Réponse** | `{ ok: true }` |

### 3.4 Auth / sécurité

**État actuel** :
- `server/index.ts` utilise `supabaseAdmin` (service role) pour toutes les opérations DB (L.57-61).
- Aucune route n’exige de JWT utilisateur. `/api/contact` : pas d’auth. `/api/checkin/start` : pas de vérification que l’appelant est le renter/owner. `/api/stripe/webhook` : vérification signature Stripe uniquement.

**Méthode proposée pour valider le JWT** :
1. Extraire `Authorization: Bearer <token>` de `req.headers.authorization`.
2. Créer un client Supabase avec la clé anon : `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })`.
3. Appeler `const { data: { user }, error } = await supabaseAuth.auth.getUser(token)` (ou `getUser()` si le client stocke le token).
4. Si `error` ou pas de `user` → `401 Unauthorized`.
5. Utiliser `user.id` pour vérifier `booking.user_id === user.id`.

**Variables d’environnement** : `SUPABASE_URL`, `SUPABASE_ANON_KEY` (déjà utilisées côté front ; à vérifier côté server pour auth).

**Risques actuels** :
- Service role utilisé partout → pas de restriction par utilisateur.
- Routes deposit sans auth → n’importe qui pourrait créer un SetupIntent ou attacher une carte pour un booking d’un autre.
- Pas de rate limiting sur les endpoints deposit.

**Checklist sécurité minimale Phase 3.2** :
- [ ] booking appartient au user (booking.user_id === user.id)
- [ ] booking.status compatible (confirmed)
- [ ] deposit_amount_snapshot > 0
- [ ] deposit_status === 'pending'
- [ ] Refuser si deposit_status === 'card_registered' ou stripe_payment_method_id déjà défini

---

## 4) Stripe — choix technique SetupIntent

### 4.1 Configuration Stripe backend

| Élément | Fichier | Détail |
|---------|---------|--------|
| **Clé secrète** | `server/lib/stripe.ts` | `getStripeSecretKey()` → `process.env.STRIPE_SECRET_KEY` |
| **Initialisation** | `server/lib/stripe.ts` L.55-58 | `new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" })` |
| **Usage** | `server/index.ts` L.7 | `import { getStripe } from "./lib/stripe"` |

### 4.2 Stripe côté frontend

| Élément | État |
|---------|------|
| **Clé publique** | `src/lib/stripePublicKey.ts` : `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` |
| **Stripe Elements** | **Non utilisé** : pas de `@stripe/react-stripe-js` ni `loadStripe` dans le repo. Le paiement location passe par **Stripe Checkout** (redirection). |
| **Packages** | `package.json` : `@stripe/react-stripe-js`, `@stripe/stripe-js` déjà installés |

**Pour SetupIntent** :
- Utiliser `loadStripe(publishableKey)` depuis `@stripe/stripe-js`.
- Envelopper le formulaire avec `Elements` + `PaymentElement` (ou `CardElement` si PaymentElement trop lourd) et `clientSecret` du SetupIntent.
- Appeler `stripe.confirmSetup({ elements, clientSecret, confirmParams: { return_url } })` ou équivalent.

### 4.3 Cas d’échec et affichage UI

| Cas | Comportement Stripe | Affichage UI à prévoir |
|-----|----------------------|-------------------------|
| Carte refusée | `confirmSetup` rejette, erreur type `card_declined` | Message "Votre carte a été refusée. Veuillez essayer une autre carte." |
| SCA / 3DS | `SetupIntent.status === 'requires_action'` | Redirection vers l’URL 3DS ou modal 3DS selon Stripe. Gérer `return_url` ou `next_action`. |
| `requires_action` non complété | Erreur après redirection | Message "L’authentification a échoué. Veuillez réessayer." |
| Erreur réseau | `fetch` ou Stripe SDK échoue | Message "Erreur de connexion. Vérifiez votre réseau et réessayez." |
| SetupIntent expiré | clientSecret invalide | Message "Session expirée. Veuillez rouvrir la modale." |

---

## 5) DB — profils Stripe Customer

### 5.1 Vérification `profiles.stripe_customer_id`

| Source | Résultat |
|--------|----------|
| **supabase/migrations/** | `grep stripe_customer_id` → **0 résultat** |
| **src/integrations/supabase/types.ts** | Table `profiles` : **aucune colonne `stripe_customer_id`** dans les types générés |
| **DIAG-BLUEPRINT**, **AUDIT**, **PLAN** | Tous confirment : colonne **absente**, migration recommandée |

**Conclusion** : `profiles.stripe_customer_id` **n’existe pas** dans le repo. Une migration Phase 3.2.1 est nécessaire avant d’implémenter les endpoints deposit.

### 5.2 Migration Phase 3.2.1 (recommandée, non écrite)

```
Fichier : supabase/migrations/YYYYMMDDHHMMSS_add_profiles_stripe_customer_id.sql

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'ID Stripe Customer (cus_xxx) pour paiements off_session.';
```

### 5.3 Logique create-or-reuse Customer

| Cas | Action |
|-----|--------|
| `profile.stripe_customer_id` absent ou null | `stripe.customers.create({ email: profile.email, metadata: { profileId } })` → sauvegarder `stripe_customer_id` dans `profiles` |
| `profile.stripe_customer_id` présent | Réutiliser pour le SetupIntent |

---

## 6) Checklist de validation Phase 3.2 (100% testable)

| # | Test | Méthode de vérification |
|---|------|--------------------------|
| 1 | `deposit_amount_snapshot = 0` | Créer/forcer un booking avec snapshot=0 et deposit_status=not_required → bouton "Activer la caution" **absent** |
| 2 | `deposit_status = pending` + `snapshot > 0` | Booking confirmed, deposit_status pending, snapshot > 0 → bouton **présent** |
| 3 | Clic → SetupIntent créé | Clic sur le bouton → ouverture DepositFlowModal → appel POST create-setup-intent → réponse `{ clientSecret }` |
| 4 | Confirmation → booking mis à jour | Après saisie carte valide et confirmSetup : appel POST attach-payment-method → vérifier en DB : `stripe_payment_method_id` défini, `deposit_status = 'card_registered'` |
| 5 | Refresh UI → badge "Caution activée" | Après succès, fermeture modale et refresh : badge ou note indique caution activée (read-only), pas de CTA |
| 6 | Aucune création PaymentIntent caution | Vérifier dans Stripe Dashboard : aucun PaymentIntent créé pour ce booking ; uniquement SetupIntent |

---

## 7) Liste finale des fichiers à modifier/créer (sans les toucher)

| Fichier | Action |
|---------|--------|
| `src/components/RenterBookingCard.tsx` | Modifier : ajouter prop `onRequestDeposit`, condition `deposit_amount_snapshot > 0` dans getUserBookingStatusUI, remplacer onClick du bouton showDepositCTA pour appeler onRequestDeposit au lieu de onRequestPay |
| `src/pages/renter/RenterBookings.tsx` | Modifier : état depositModalBooking, isDepositModalOpen, prop onRequestDeposit, rendre DepositFlowModal |
| `src/components/PaymentFlowModal.tsx` | Modifier : prop onRequestDeposit + depositBooking, remplacer onClick "Bloquer ma caution" L.234 |
| `src/components/DepositFlowModal.tsx` | **Créer** : modale avec texte légal, Stripe Elements, bouton Confirmer, gestion loading/erreurs |
| `src/lib/depositCaution.ts` | **Créer** : fonctions `createSetupIntentClientSecret(bookingId)`, `attachPaymentMethod(bookingId, paymentMethodId)` — fetch vers /api/deposit/* |
| `server/index.ts` | Modifier : ajouter middleware/helper auth JWT, routes POST /api/deposit/create-setup-intent, POST /api/deposit/attach-payment-method |
| `supabase/migrations/YYYYMMDDHHMMSS_add_profiles_stripe_customer_id.sql` | **Créer** : colonne profiles.stripe_customer_id |
| `src/i18n/locales/fr/common.json` | Modifier : ajouter clés `depositModal.*` |
| `src/i18n/locales/en/common.json` | Modifier : idem |
| `src/i18n/locales/de/common.json` | Modifier : idem |
| `src/i18n/locales/it/common.json` | Modifier : idem |
| `src/pages/booking/BookingDiscussion.tsx` | Modifier (si BookingDiscussion affiche des RenterBookingCard avec caution) : passer onRequestDeposit si applicable |
| `src/types/index.ts` ou équivalent | Modifier : ajouter types pour les réponses API deposit si nécessaire |

---

**Contraintes respectées** : Aucune implémentation, aucun patch, pas de code (structures JSON/DB et noms d’endpoints uniquement).

---

✅ **DIAG Phase 3.2 terminé — prêt pour validation avant micro-implémentation.**
