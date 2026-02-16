# DIAG ONLY — PHASE 3.2.2 (Option A strict) — SetupIntent + Attach PM — AUCUNE IMPLEMENTATION

**Date** : 2026-02-14  
**Contexte** : Phase 1 OK, Phase 2 OK, Phase 3.1 OK, Phase 3.2.1 OK (profiles.stripe_customer_id).  
**Objectif** : Flow "Activer la caution" → SetupIntent → attach PaymentMethod → `bookings.stripe_payment_method_id` + `deposit_status='card_registered'`. Aucun hold, aucun PaymentIntent caution, aucun cron, aucun webhook deposit.  
**Mode** : Diagnostic uniquement — preuves vérifiables, chemins/lignes, aucun patch.

---

## 1) UI actuelle

### 1.1 CTA actuel côté renter

| Élément | Fichier | Lignes | Preuve |
|---------|---------|--------|--------|
| **Composant** | `src/components/RenterBookingCard.tsx` | L.1214-1273 | Zone "Actions supplémentaires" |
| **Bouton** | `RenterBookingCard.tsx` | L.1222-1268 | `<Button>` avec label `statusUI.depositCTALabel` (ex: "Finaliser ma réservation") |
| **Condition d’affichage** | `RenterBookingCard.tsx` | L.1218-1220 | `statusUI && statusUI.showDepositCTA` |

### 1.2 Condition exacte d’affichage aujourd’hui

**Fonction** : `getUserBookingStatusUI()` — `RenterBookingCard.tsx` L.391-456

**Cas qui affiche le CTA** (L.398-407) :
```
booking.status === 'confirmed' && depositStatus === 'pending'
```
- `depositStatus` = `(booking as any).depositStatus` (L.395)
- **Lacune** : pas de vérification `deposit_amount_snapshot > 0` (à ajouter en Phase 3.2.2 pour éviter CTA si snapshot = 0)

### 1.3 Action déclenchée aujourd’hui

| Étape | Fichier | Lignes | Détail |
|-------|---------|--------|--------|
| Clic bouton | `RenterBookingCard.tsx` | L.1224-1257 | `onClick` → appelle `onRequestPay?.({ id: booking.id, voiture, dateDebut, ... })` |
| Handler parent | `RenterBookings.tsx` | L.870-876 | `onRequestPay={(reservation) => { setReservationCourante(reservation); setModalMode("avantPaiement"); setStep1Complete(false); setIsModalOpen(true); }}` |
| Ouverture modale | `RenterBookings.tsx` | L.936-974 | `<PaymentFlowModal isOpen={isModalOpen} ... />` |
| Paiement si step 1 | `RenterBookings.tsx` | L.956-962 | `onPayNow={async (rsv) => { await payerLocation(rsv); }}` |
| `payerLocation` | `src/lib/payerLocation.ts` | L.51-53 | `supabase.functions.invoke("create-checkout-session", { body: { bookingId } })` → redirection Stripe Checkout |

**Conclusion** : Le CTA ouvre `PaymentFlowModal`, pas directement `payerLocation`.  
- Si `bookingPaid` (étape 1 déjà complète) : la modale affiche l’étape 2 "Bloquer ma caution" (L.229-237) avec un bouton qui fait `console.log("TODO caution")` (L.234).  
- Si étape 1 non complète : l’utilisateur clique "Payer ma location" dans la modale → `payerLocation` → Checkout.

### 1.4 Meilleur point d’injection

**Objectif** : modale caution indépendante, sans impacter le paiement location.

| Option | Emplacement | Avantage | Risque |
|--------|-------------|----------|--------|
| **A** | Remplacer l’appel `onRequestPay` par `onRequestDeposit(booking)` quand `showDepositCTA` | Découplage clair paiement / caution | Nécessite nouvelle prop + handler |
| **B** | Remplacer le `onClick` L.234 dans PaymentFlowModal étape 2 | Réutilise la modale existante | Mélange paiement + caution, UI confusante |

**Recommandation** : **Option A**

**Emplacements précis** :
1. `RenterBookingCard.tsx` L.1246 : remplacer `onRequestPay?.({...})` par `onRequestDeposit?.(booking)` quand `showDepositCTA`.
2. Nouvelle prop `onRequestDeposit?: (booking: BookingWithDetails) => void` (L.79).
3. `RenterBookings.tsx` : nouvel état `depositModalBooking`, `isDepositModalOpen`, handler `onRequestDeposit` → ouvre `DepositFlowModal`.
4. `PaymentFlowModal.tsx` L.234 : brancher le bouton "Bloquer ma caution" sur le même handler (pour le cas arrivée depuis PaymentSuccess) → `onRequestDeposit?.(depositBooking)` avec une prop `depositBooking` passée quand `bookingPaid`.

**Point d’injection** :  
- Principal : `RenterBookingCard.tsx` L.1219-1258 (bloc `showDepositCTA`).  
- Secondaire : `PaymentFlowModal.tsx` L.229-237 (étape 2).

---

## 2) Données disponibles côté renter

### 2.1 Mapping dans RenterBookings.tsx

**Source** : `loadBookings()` → `SupabaseBookingsService.getRenterBookings(currentUser.id)` → `result.data` mappé.

**Colonnes deposit mappées** (L.488-491, 535-537) :
```ts
depositStatus: (booking as any).deposit_status || null,
depositAmount: (booking as any).deposit_amount_snapshot ?? null,
depositAmountSnapshot: (booking as any).deposit_amount_snapshot ?? null,
```

### 2.2 Requête Supabase (source des données)

**Fichier** : `src/services/supabase/bookings.ts` L.129-136

```ts
.select(`
  *,
  checkin_depart:checkin_depart(id, status, legal_pdf_url, booking_id)
`)
.eq('user_id', renterId)
```

**Preuve** : `*` retourne toutes les colonnes de `bookings`, donc `id`, `user_id`, `deposit_status`, `deposit_amount_snapshot`, `stripe_payment_method_id`, etc.

### 2.3 Objet mappé passé à RenterBookingCard (L.470-493)

| Champ | Source DB | Disponible au clic |
|-------|-----------|--------------------|
| `id` | `booking.id` | Oui (L.471, L.1247) |
| `renterId` | `booking.user_id` (L.367, 472) | Oui (équivalent `user_id`) |
| `depositStatus` | `booking.deposit_status` | Oui (L.489) |
| `depositAmount` / `depositAmountSnapshot` | `booking.deposit_amount_snapshot` | Oui (L.490-491) |
| `status` | `booking.status` | Oui (L.477) |

**Preuve clic** : L.1247 `id: booking.id` — l’objet `booking` dans le `onClick` est le props `booking` de la carte, qui contient `id`, `renterId`, `depositStatus`, `depositAmount`, `status`.

---

## 3) Backend Express

### 3.1 Emplacement des routes

**Fichier** : `server/index.ts`  
**Ordre** : après `app.use(express.json())` (L.230-234), après les routes existantes (ex. `/api/contact` L.262, `/api/checkin/start` L.541).

**Recommandation** : insérer un bloc `// === Routes deposit Phase 3.2.2 ===` vers L.260 (avant `/api/contact`) ou après `/api/health/email` (L.524), pour regrouper les routes deposit.

### 3.2 Auth Express aujourd’hui

**Preuve** : aucune route Express ne vérifie de JWT utilisateur.

| Route | Auth | Preuve |
|-------|------|--------|
| `/api/contact` | Aucune | L.263-264 : lecture directe de `req.body` |
| `/api/checkin/start` | Aucune | L.541-640 : pas de lecture de `Authorization`, pas de `getUser` |
| `/api/stripe/webhook` | Signature Stripe | L.67-98 : validation Stripe, pas d’utilisateur |

**`payerLocation`** : envoie le JWT via `supabase.functions.invoke()`, qui transmet les headers Supabase (dont `Authorization`). L’Edge Function `create-checkout-session` utilise ce JWT via Supabase, mais **Express ne reçoit jamais** ces appels — tout passe par l’Edge Function.

### 3.3 Pattern JWT Supabase à implémenter (routes deposit uniquement)

**Étapes** (inspiré de DIAG-BLUEPRINT) :
1. Lire `Authorization: Bearer <token>` dans `req.headers.authorization`.
2. Créer un client Supabase auth : `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })`.
3. Récupérer l’utilisateur : `const { data: { user }, error } = await supabaseAuth.auth.getUser(token ?? '')` (ou `getUser()` si le client gère le token).
4. Si `error` ou pas de `user` → `401 Unauthorized`.
5. Utiliser `user.id` pour les checks de sécurité.

**Variables** : `SUPABASE_URL`, `SUPABASE_ANON_KEY` (probablement déjà dans `.env` pour le front, à ajouter côté server pour auth).

### 3.4 Checks de sécurité obligatoires

| Check | Justification (preuve dans le code) |
|-------|-------------------------------------|
| **a) booking appartient au user** | `bookings.user_id == user.id` — `user_id` existe (bookings L.135, RenterBookings L.367, 472). Requête filtrée par `user_id` dans `getRenterBookings` L.135. |
| **b) booking.status compatible** | Voir ci-dessous. |
| **c) deposit_amount_snapshot > 0** | Colonne Phase 2, migration Phase 3.1. Snapshot à l’acceptation (bookings.ts L.285-286). Si 0 → `not_required`, pas de CTA. |
| **d) deposit_status === 'pending'** | Transition autorisée uniquement depuis `pending` vers `card_registered`. |
| **e) Refuser si déjà card_registered / held / etc.** | Vérifier `stripe_payment_method_id` null ET `deposit_status IN ('pending')` avant toute mise à jour. |

### 3.5 Liste exacte des status compatibles (point b)

**Code existant** :
- `RenterBookingCard.tsx` L.399 : CTA si `status === 'confirmed' && depositStatus === 'pending'`.
- `RenterBookings.tsx` L.45 : `isBookingPaid` si `status === "accepted" \|\| status === "confirmed"`.
- Webhook Express L.156 : `status: "accepted"` après paiement.
- Edge Function stripe-webhook L.193 : `status: "confirmed"` après paiement.

**Conclusion** : accepter **`confirmed`** et **`accepted`** pour la compatibilité (Express vs Edge Function).

**Liste retenue** : `['confirmed', 'accepted']`

**Justification** : le CTA s’affiche uniquement pour `confirmed` dans l’UI, mais en prod le webhook Express peut mettre `accepted`. Le backend doit accepter les deux pour éviter des refus incorrects.

---

## 4) Stripe

### 4.1 Stripe côté server

**Fichier** : `server/lib/stripe.ts`  
**Export** : `getStripe(): Stripe` (L.33-62)

**Preuve** : `server/index.ts` L.7 `import { getStripe, ... } from "./lib/stripe"` ; usage L.527 `getStripe()` pour `/api/stripe-health`.

**Conclusion** : Stripe est déjà initialisé côté server via `getStripe()`.

### 4.2 Frontend — packages Stripe

**Fichier** : `package.json` L.62-63

```
"@stripe/react-stripe-js": "^5.3.0",
"@stripe/stripe-js": "^8.2.0",
```

**Preuve** : packages installés.

### 4.3 Utilisation actuelle de Stripe côté front

| Emplacement | Usage |
|-------------|-------|
| `src/lib/payerLocation.ts` | Invocation Edge Function → redirection Checkout (pas de Stripe.js dans le front) |
| `src/lib/stripePublicKey.ts` | Export `STRIPE_PUBLISHABLE_KEY` (L.1) — clé disponible |
| `grep Elements\|PaymentElement\|loadStripe\|CardElement` | Aucun usage dans `src/` |

**Conclusion** : Stripe Elements n’est pas encore utilisé. Stripe Checkout (redirection) est utilisé pour le paiement location.

### 4.4 Composant minimal pour SetupIntent

**Option recommandée** : `PaymentElement` dans `Elements` (plus moderne que `CardElement`).

**Étapes** :
1. `loadStripe(publishableKey)` depuis `@stripe/stripe-js`.
2. Envelopper le formulaire avec `<Elements stripe={stripePromise} options={{ clientSecret, appearance }}>`.
3. Afficher `<PaymentElement />`.
4. Appeler `stripe.confirmSetup({ elements, clientSecret, confirmParams: { return_url } })` après soumission.

**Alternative** : `CardElement` si besoin de garder un bundle plus léger (card uniquement).

---

## 5) DB writes attendues

### 5.1 profiles.stripe_customer_id

| Quand | Condition | Action |
|-------|-----------|--------|
| Endpoint `create-setup-intent` | Profile lu : `stripe_customer_id` NULL | Créer `stripe.customers.create({ email })` → `UPDATE profiles SET stripe_customer_id = cus_xxx WHERE id = user.id` |
| Endpoint `create-setup-intent` | Profile : `stripe_customer_id` déjà renseigné | Ne pas écrire, réutiliser la valeur existante |

### 5.2 bookings.stripe_payment_method_id + deposit_status

| Quand | Endpoint | Action |
|-------|----------|--------|
| Après confirmation SetupIntent côté client | `attach-payment-method` | `UPDATE bookings SET stripe_payment_method_id = pm_xxx, deposit_status = 'card_registered', updated_at = NOW() WHERE id = bookingId` |

### 5.3 Champs à ne pas modifier en Phase 3.2.2

- `deposit_payment_intent_id` — non utilisé (aucun PaymentIntent caution)
- `deposit_hold_created_at`, `deposit_capture_before`, `deposit_capture_amount`, `deposit_reason` — phases ultérieures
- Aucune autre table que `profiles` et `bookings` pour ce flow

---

## 6) Liste des fichiers à modifier + checklist de tests

### 6.1 Fichiers à toucher (Phase 3.2.2)

| Fichier | Action |
|---------|--------|
| `src/components/RenterBookingCard.tsx` | Ajouter `onRequestDeposit`, condition `deposit_amount_snapshot > 0`, remplacer onClick CTA |
| `src/pages/renter/RenterBookings.tsx` | État deposit modale, `onRequestDeposit`, rendre `DepositFlowModal` |
| `src/components/DepositFlowModal.tsx` | Créer : modale + Stripe Elements + SetupIntent flow |
| `src/lib/depositCaution.ts` | Créer : `createSetupIntentClientSecret()`, `attachPaymentMethod()` |
| `src/components/PaymentFlowModal.tsx` | Prop `onRequestDeposit` + `depositBooking`, brancher bouton étape 2 |
| `server/index.ts` | Routes `POST /api/deposit/create-setup-intent`, `POST /api/deposit/attach-payment-method` + helper auth JWT |
| `src/i18n/locales/*/common.json` | Clés `depositModal.*` (optionnel pour v1) |

### 6.2 Checklist de tests manuels (6 cas)

| # | Cas | Vérification |
|---|-----|--------------|
| 1 | `deposit_amount_snapshot = 0` | CTA "Activer la caution" absent |
| 2 | `deposit_status = 'pending'` + `snapshot > 0` + `status in (confirmed, accepted)` | CTA visible |
| 3 | Clic CTA → modale caution | Modale s’ouvre, pas PaymentFlowModal (ou modale dédiée caution) |
| 4 | Saisie carte valide → confirmation | `create-setup-intent` puis `attach-payment-method` appelés, booking mis à jour |
| 5 | Après succès → refresh | Badge "Caution activée" ou équivalent, pas de CTA |
| 6 | Aucun PaymentIntent caution | Dashboard Stripe : uniquement SetupIntent, pas de PaymentIntent pour le booking |

---

**DIAG Phase 3.2.2 terminé — preuves vérifiables, prêt pour implémentation.**
