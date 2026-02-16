# DIAG ONLY — Phase 3.2.2 — Vérification anti-régression (NO CODE / NO PATCH)

**Date** : 2026-02-14  
**Objectif** : Valider la Phase 3.2.2 (SetupIntent + attach PaymentMethod → deposit_status='card_registered') sans régressions.  
**Mode** : Preuves et checklists uniquement — aucune modification de fichiers.

---

## 1) Git — périmètre réel des changements

### Commandes exécutées

**1) `git status --porcelain`**
```
 M package-lock.json
 M server/index.ts
 M src/components/OwnerBookingCard.tsx
 M src/components/RenterBookingCard.tsx
 M src/features/vehicle-management/hooks/useManageVehicle.ts
 M src/features/vehicle-management/types/vehicle-form.types.ts
 M src/i18n/locales/de/common.json
 M src/i18n/locales/en/common.json
 M src/i18n/locales/fr/common.json
 M src/i18n/locales/it/common.json
 M src/pages/auth/Callback.tsx
 M src/pages/owner/ManageVehicle.tsx
 M src/pages/owner/OwnerBookings.tsx
 M src/pages/renter/RenterBookings.tsx
 M src/services/supabase/bookings.ts
 M src/services/supabaseVehiclesService.ts
 M supabase/.temp/cli-latest
?? server/lib/depositAuth.ts
?? src/components/DepositFlowModal.tsx
?? src/lib/depositCaution.ts
?? supabase/migrations/20260214150000_add_vehicles_deposit_amount.sql
?? supabase/migrations/20260214170000_add_profiles_stripe_customer_id.sql
(et divers DIAG/PLAN non listés)
```

**2) `git diff --name-only`** (fichiers modifiés, hors untracked)
```
package-lock.json
server/index.ts
src/components/OwnerBookingCard.tsx
src/components/RenterBookingCard.tsx
src/features/vehicle-management/hooks/useManageVehicle.ts
src/features/vehicle-management/types/vehicle-form.types.ts
src/i18n/locales/de/common.json
src/i18n/locales/en/common.json
src/i18n/locales/fr/common.json
src/i18n/locales/it/common.json
src/pages/auth/Callback.tsx
src/pages/owner/ManageVehicle.tsx
src/pages/owner/OwnerBookings.tsx
src/pages/renter/RenterBookings.tsx
src/services/supabase/bookings.ts
src/services/supabaseVehiclesService.ts
supabase/.temp/cli-latest
```

**3) `git diff --stat`**
```
 package-lock.json                                  |   2 +-
 server/index.ts                                    | 160 +++++++++++++++++++++
 src/components/OwnerBookingCard.tsx                |  25 +++-
 src/components/RenterBookingCard.tsx               |  74 +++++-----
 .../vehicle-management/hooks/useManageVehicle.ts  |   1 +
 .../vehicle-management/types/vehicle-form.types.ts|   2 +
 src/i18n/locales/de/common.json                   |   7 +-
 src/i18n/locales/en/common.json                   |   7 +-
 src/i18n/locales/fr/common.json                   |   7 +-
 src/i18n/locales/it/common.json                   |   7 +-
 src/pages/auth/Callback.tsx                       |  52 ++++++-
 src/pages/owner/ManageVehicle.tsx                 |  34 ++++-
 src/pages/owner/OwnerBookings.tsx                 |   1 +
 src/pages/renter/RenterBookings.tsx               |  36 ++++-
 src/services/supabase/bookings.ts                 |  48 +++++++
 src/services/supabaseVehiclesService.ts            |   6 +-
 supabase/.temp/cli-latest                         |   2 +-
 17 files changed, 418 insertions(+), 53 deletions(-)
```

### Liste EXACTE des fichiers modifiés/créés

| Fichier | Type | Phase 3.2.2 ? |
|---------|------|---------------|
| `server/lib/depositAuth.ts` | **Créé** (untracked) | ✅ Oui |
| `src/components/DepositFlowModal.tsx` | **Créé** (untracked) | ✅ Oui |
| `src/lib/depositCaution.ts` | **Créé** (untracked) | ✅ Oui |
| `server/index.ts` | Modifié | ✅ Oui |
| `src/components/RenterBookingCard.tsx` | Modifié | ✅ Oui |
| `src/pages/renter/RenterBookings.tsx` | Modifié | ✅ Oui |
| `src/i18n/locales/fr/common.json` | Modifié | ✅ Oui |
| `src/i18n/locales/en/common.json` | Modifié | ✅ Oui |
| `src/i18n/locales/de/common.json` | Modifié | ✅ Oui |
| `src/i18n/locales/it/common.json` | Modifié | ✅ Oui |
| `src/components/OwnerBookingCard.tsx` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/features/vehicle-management/hooks/useManageVehicle.ts` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/features/vehicle-management/types/vehicle-form.types.ts` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/pages/auth/Callback.tsx` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/pages/owner/ManageVehicle.tsx` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/pages/owner/OwnerBookings.tsx` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/services/supabase/bookings.ts` | Modifié | ❌ Hors Phase 3.2.2 |
| `src/services/supabaseVehiclesService.ts` | Modifié | ❌ Hors Phase 3.2.2 |
| `package-lock.json` | Modifié | ❌ Probablement hors scope |
| `supabase/.temp/cli-latest` | Modifié | ❌ Hors scope |

### Commit "Phase 3.2.2 only" sans contamination

**NON** — Les modifications sont mélangées avec d’autres phases (Phase 1, 2, etc.) dans les mêmes fichiers. Pour un commit strictement Phase 3.2.2, il faudrait :

1. Stash ou revert les changements hors Phase 3.2.2  
2. Ou isoler via `git add -p` uniquement pour les fichiers concernés  
3. Fichiers à inclure pour commit Phase 3.2.2 pur :
   - `server/lib/depositAuth.ts` (nouveau)
   - `src/components/DepositFlowModal.tsx` (nouveau)
   - `src/lib/depositCaution.ts` (nouveau)
   - `server/index.ts` (seulement les blocs deposit)
   - `src/components/RenterBookingCard.tsx` (seulement les modifs CTA deposit)
   - `src/pages/renter/RenterBookings.tsx` (seulement les modifs deposit modal)
   - `src/i18n/locales/*/common.json` (seulement `activateDeposit` + `depositModal`)

---

## 2) server/index.ts — ordre des middlewares et routes

### Extraits (avec numéros de ligne)

**Création app** (L.29) :
```ts
const app = express();
```

**Route webhook avec express.raw** (L.64-67) :
```ts
// Route Webhook Stripe - DOIT être déclarée avant app.use(express.json())
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
```

**app.use(express.json())** (L.227-234) :
```ts
// Parser JSON / URL-encoded global après la route webhook
app.use(
  express.json({
    limit: "20mb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  })
);
```

**Routes deposit** (L.262-420) :
```ts
// === Routes deposit Phase 3.2.2 (SetupIntent + attach PM, NO HOLD) ===
app.post("/api/deposit/create-setup-intent", async (req, res) => {
  ...
});

app.post("/api/deposit/attach-payment-method", async (req, res) => {
  ...
});
```

### Réponses

| Question | Réponse | Preuve |
|----------|---------|--------|
| **A) `/api/stripe/webhook` utilise-t-il `express.raw({ type: "application/json" })` ?** | **OUI** | L.67 : `express.raw({ type: "application/json" })` |
| **B) `app.use(express.json())` est-il placé de façon à ne PAS impacter le webhook ?** | **OUI** | L.227 : `express.json()` est déclaré APRÈS la route webhook (L.65-226). Le webhook a son propre middleware raw sur sa route. |
| **C) Les routes `/api/deposit/*` sont-elles bien après `express.json()` ?** | **OUI** | L.264 et L.345 : les deux routes sont après `express.json()` (L.230). |
| **D) Existe-t-il un `app.use(express.raw(...))` global qui casserait les routes JSON ?** | **NON** | Aucun `app.use(express.raw(...))` global. Le raw est appliqué uniquement à la route `/api/stripe/webhook`. |

---

## 3) Auth JWT Supabase — robustesse

### Fichier : `server/lib/depositAuth.ts`

**Extrait complet** (L.1-40) :
```ts
/**
 * JWT auth helper for deposit routes ONLY.
 * Validates Supabase JWT from Authorization: Bearer header.
 */
import { createClient, User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface AuthResult {
  user: User;
} | null;

export async function getAuthUserFromRequest(req: { headers: { authorization?: string } }): Promise<AuthResult> {
  const authHeader = req.headers.authorization;                    // L.15
  if (!authHeader || !authHeader.startsWith("Bearer ")) {          // L.16-18
    return null;
  }

  const token = authHeader.slice(7);                               // L.20
  if (!token) return null;                                         // L.21

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {                       // L.23-26
    console.error("[depositAuth] SUPABASE_URL or SUPABASE_ANON_KEY missing");
    return null;
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {  // L.28
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);  // L.33
  if (error || !user) {                                            // L.34-36
    return null;
  }

  return { user };                                                 // L.38
}
```

**Récupération du token** : L.15-20 — `req.headers.authorization`, préfixe `"Bearer "`, puis `authHeader.slice(7)`.  
**Vérification** : L.33 — `supabaseAuth.auth.getUser(token)` (Supabase valide le JWT).  
**Clé utilisée** : L.28 — `SUPABASE_ANON_KEY` (client auth, pas SERVICE ROLE). Justification : validation du JWT utilisateur sans bypass RLS.  

### Usage dans server/index.ts

**create-setup-intent** (L.266-268) :
```ts
const authResult = await getAuthUserFromRequest(req);
if (!authResult) {
  return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Token d'authentification requis ou invalide" });
}
```

**create-setup-intent ownership** (L.286-288) :
```ts
if (booking.user_id !== user.id) {
  return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cette réservation ne vous appartient pas" });
}
```

**attach-payment-method** : même pattern (L.346-348 et L.367-369).  

**401 vs 403** : 401 si pas de token ou token invalide ; 403 si token valide mais `booking.user_id !== user.id`.

---

## 4) Gating métier côté serveur

### Table récapitulative

| Condition | Fichier:Ligne | Code HTTP si KO | Message d'erreur |
|------------|---------------|-----------------|-------------------|
| Token absent/invalide | server/index.ts:266-268, 346-348 | 401 | "Token d'authentification requis ou invalide" |
| bookingId manquant | server/index.ts:272-274 | 400 | "bookingId requis" |
| booking introuvable | server/index.ts:281-284, 363-365 | 404 | "Réservation introuvable" |
| booking.user_id !== user.id | server/index.ts:286-288, 367-369 | 403 | "Cette réservation ne vous appartient pas" |
| deposit_amount_snapshot <= 0 | server/index.ts:290-293, 371-374 | 400 | "Caution non requise pour cette réservation" |
| status ∉ ['confirmed','accepted'] | server/index.ts:295-298 | 400 | "Statut de réservation incompatible" |
| deposit_status !== 'pending' | server/index.ts:300-302, 376-378 | 400 | "La caution a déjà été traitée" |
| stripe_payment_method_id non null | server/index.ts:304-306 | 400 | "Une carte est déjà enregistrée pour cette caution" |
| profile introuvable | server/index.ts:314-316, 386-388 | 500 | "Profil introuvable" |
| stripe_customer_id absent (attach) | server/index.ts:391-393 | 400 | "Erreur configuration Stripe. Veuillez réessayer." |
| bookingId/paymentMethodId manquants (attach) | server/index.ts:354-356 | 400 | "bookingId et paymentMethodId requis" |

---

## 5) Stripe SetupIntent — paramètres exacts

**Fichier** : `server/index.ts`  
**Bloc** : L.318-336

```ts
let stripeCustomerId = profile.stripe_customer_id;
if (!stripeCustomerId) {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: profile.email || user.email || undefined,
    metadata: { profileId: profile.id },
  });
  stripeCustomerId = customer.id;
  await supabaseAdmin.from("profiles").update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() }).eq("id", user.id);
}

const stripe = getStripe();
const setupIntent = await stripe.setupIntents.create({
  customer: stripeCustomerId,
  payment_method_types: ["card"],
  usage: "off_session",
  metadata: { bookingId },
});
```

| Paramètre | Valeur | Source |
|-----------|--------|--------|
| `customer` | `stripeCustomerId` (cus_xxx) | `profiles.stripe_customer_id` ou Stripe customer créé |
| `usage` | `'off_session'` | L.334 |
| `payment_method_types` | `['card']` | L.333 |
| `metadata` | `{ bookingId }` | L.335 |
| Création customer si absent | L.320-326 | `stripe.customers.create` + `profiles.update(stripe_customer_id)` |

---

## 6) Attach PaymentMethod — mise à jour DB

**Fichier** : `server/index.ts` L.395-407

**Attachement au customer** (L.395-398) :
```ts
const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
if (pm.customer !== profile.stripe_customer_id) {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: profile.stripe_customer_id });
}
```

**Mise à jour bookings** (L.401-407) :
```ts
const { error: updateErr } = await supabaseAdmin
  .from("bookings")
  .update({
    stripe_payment_method_id: paymentMethodId,
    deposit_status: "card_registered",
    updated_at: new Date().toISOString(),
  })
  .eq("id", bookingId);
```

| Colonne | Valeur |
|---------|--------|
| `stripe_payment_method_id` | `paymentMethodId` (pm_xxx) |
| `deposit_status` | `'card_registered'` |
| `updated_at` | `new Date().toISOString()` |

**Ciblage** : `.eq("id", bookingId)` — l’UPDATE cible bien le bon `bookingId`.

---

## 7) Frontend — wiring CTA et modale

### A) RenterBookingCard.tsx

**Condition d’affichage** (L.401-404) :
```ts
const isPaidStatus = booking.status === 'confirmed' || booking.status === 'accepted';
if (isPaidStatus && depositStatus === 'pending' && snapshot > 0) {
  return { ... showDepositCTA: true, depositCTALabel: t('bookings.card.activateDeposit', 'Activer la caution') };
}
```

**Handler au clic** (L.1230-1233) :
```ts
onClick={(e) => {
  e.stopPropagation()
  onRequestDeposit?.(booking)
}}
```

**Preuve** : on n’appelle plus `onRequestPay` pour ce CTA. Le bloc CTA deposit (L.1225-1245) appelle uniquement `onRequestDeposit?.(booking)`. Le bloc "Payer ma location" (L.1251-1286) appelle `onRequestPay` et est conditionné par `booking.status === 'pending_payment'`.

### B) RenterBookings.tsx

**État** (L.79-80) :
```ts
const [depositModalBooking, setDepositModalBooking] = useState<BookingWithDetails | null>(null);
const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
```

**Handler onRequestDeposit** (L.882-885) :
```ts
onRequestDeposit={(booking) => {
  setDepositModalBooking(booking);
  setIsDepositModalOpen(true);
}}
```

**Rendu DepositFlowModal** (L.984-998) :
```tsx
{depositModalBooking && (
  <DepositFlowModal
    isOpen={isDepositModalOpen}
    onClose={() => {
      setIsDepositModalOpen(false);
      setDepositModalBooking(null);
    }}
    bookingId={depositModalBooking.id}
    depositAmount={Number(depositModalBooking.depositAmount ?? depositModalBooking.depositAmountSnapshot ?? 0)}
    onSuccess={() => {
      loadBookings();
      toast({ title: "Caution activée", description: "Votre carte a été enregistrée avec succès.", variant: "default" });
    }}
  />
)}
```

### C) DepositFlowModal.tsx

**Stripe** (L.6, 10) :
```ts
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripePublicKey";
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
```

**clientSecret** (L.106-116) :
```ts
createSetupIntentClientSecret(bookingId)
  .then(({ clientSecret: secret }) => {
    setClientSecret(secret);
  })
```

**confirmSetup** (L.40-46) :
```ts
const { error, setupIntent } = await stripe.confirmSetup({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/me/renter/bookings`,
  },
  redirect: "if_required",
});
```

**attach-payment-method** (L.64) :
```ts
await attachPaymentMethod(bookingId, pmId);
```

---

## 8) i18n — clés ajoutées/modifiées

| Clé | fr | en | de | it |
|-----|----|----|----|-----|
| `bookings.card.activateDeposit` | ✅ L.727 | ✅ L.724 | ✅ L.629 | ✅ L.629 |
| `depositModal.title` | ✅ L.988 | ✅ L.984 | ✅ L.962 | ✅ L.962 |
| `depositModal.legal` | ✅ L.989 | ✅ L.985 | ✅ L.963 | ✅ L.963 |

**Usage** :
- `RenterBookingCard` : `t('bookings.card.activateDeposit', 'Activer la caution')` — fallback si clé absente
- `DepositFlowModal` : `t("depositModal.title", "Activer la caution")` et `t("depositModal.legal", "...", { amount })` — fallbacks fournis

Aucune clé utilisée n’est manquante dans les 4 locales.

---

## 9) Conclusion — GO / NO GO

### Décision : **GO**

Les éléments vérifiés sont conformes à la spec Phase 3.2.2.

### Risques restants (max 5) et tests rapides

| # | Risque | Test rapide |
|---|--------|-------------|
| 1 | `SUPABASE_ANON_KEY` absent côté serveur | Vérifier `.env` / Railway : `SUPABASE_ANON_KEY` présent |
| 2 | `VITE_STRIPE_PUBLISHABLE_KEY` absent | Vérifier que Stripe Elements charge (modale s’ouvre sans erreur Stripe) |
| 3 | Réseau / CORS sur `/api/deposit/*` | Appel depuis le front en prod (même origine ou CORS correct) |
| 4 | Colonnes `deposit_status`, `deposit_amount_snapshot`, `stripe_payment_method_id` absentes en DB | Migration Phase 3.1 appliquée : `SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name IN ('deposit_status','deposit_amount_snapshot','stripe_payment_method_id');` |
| 5 | `profiles.stripe_customer_id` absent | Migration Phase 3.2.1 appliquée |

### Fichiers pour commit "Phase 3.2.2 only"

```
server/lib/depositAuth.ts          (nouveau)
src/components/DepositFlowModal.tsx (nouveau)
src/lib/depositCaution.ts         (nouveau)
server/index.ts                   (blocs deposit uniquement)
src/components/RenterBookingCard.tsx
src/pages/renter/RenterBookings.tsx
src/i18n/locales/fr/common.json
src/i18n/locales/en/common.json
src/i18n/locales/de/common.json
src/i18n/locales/it/common.json
```

**Note** : Les modifications dans `RenterBookingCard.tsx` et `RenterBookings.tsx` incluent aussi des changements Phase 3.2.2. Il faudra `git add -p` pour isoler uniquement les hunks deposit si d’autres changements coexistent.

---

**DIAG Phase 3.2.2 vérification anti-régression terminé.**
