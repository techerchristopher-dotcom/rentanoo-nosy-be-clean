# DIAG FINAL — Phase 3.2.2 Option A Strict (NO IMPLEMENTATION)

**Date** : 2026-02-14  
**Mode** : DIAG ONLY — Aucun patch, aucune modif, uniquement preuves + GO/NO GO.

---

## 1) Périmètre exact : "Phase 3.2.2 only" (preuves git)

### Commandes exécutées

```
git status --porcelain
git diff --name-only
git diff --stat
```

### Table

| Fichier | Modifié/Créé | Phase 3.2.2 | Risque régression |
|---------|--------------|-------------|--------------------|
| `server/lib/depositAuth.ts` | Créé (??) | ✅ Auth JWT deposit | Faible |
| `src/components/DepositFlowModal.tsx` | Créé (??) | ✅ Modale SetupIntent | Faible |
| `src/lib/depositCaution.ts` | Créé (??) | ✅ API create/attach | Faible |
| `server/index.ts` | Modifié | ✅ Routes deposit L.263-421 | Moyen (webhook avant json) |
| `src/components/RenterBookingCard.tsx` | Modifié | ✅ CTA onRequestDeposit | Moyen |
| `src/pages/renter/RenterBookings.tsx` | Modifié | ✅ Modal + onRequestDeposit | Moyen |
| `src/i18n/locales/fr/common.json` | Modifié | ✅ activateDeposit, depositModal | Faible |
| `src/i18n/locales/en/common.json` | Modifié | ✅ idem | Faible |
| `src/i18n/locales/de/common.json` | Modifié | ✅ idem | Faible |
| `src/i18n/locales/it/common.json` | Modifié | ✅ idem | Faible |
| `src/components/OwnerBookingCard.tsx` | Modifié | ❌ Hors scope | Moyen |
| `src/features/vehicle-management/hooks/useManageVehicle.ts` | Modifié | ❌ Hors scope | Faible |
| `src/features/vehicle-management/types/vehicle-form.types.ts` | Modifié | ❌ Hors scope | Faible |
| `src/pages/auth/Callback.tsx` | Modifié | ❌ Hors scope | Moyen |
| `src/pages/owner/ManageVehicle.tsx` | Modifié | ❌ Hors scope | Moyen |
| `src/pages/owner/OwnerBookings.tsx` | Modifié | ❌ Hors scope | Faible |
| `src/services/supabase/bookings.ts` | Modifié | ❌ Phase 2 snapshot | Fort |
| `src/services/supabaseVehiclesService.ts` | Modifié | ❌ Hors scope | Faible |
| `package-lock.json` | Modifié | ❌ Dépendances | Faible |
| `supabase/.temp/cli-latest` | Modifié | ❌ Tooling | Nul |

### Conclusion

- **Peut-on isoler un commit strict Phase 3.2.2 ?** — **NON**
- **Fichiers pollués hors scope** : `OwnerBookingCard`, `ManageVehicle`, `useManageVehicle`, `vehicle-form.types`, `Callback`, `OwnerBookings`, `bookings.ts`, `supabaseVehiclesService`, `package-lock.json`

✅ Périmètre clair. Phase 3.2.2 = 10 fichiers (3 nouveaux + 7 modifiés avec hunks deposit).

---

## 2) Auth côté serveur : compilation et type AuthResult

### Source `server/lib/depositAuth.ts`

**Définition AuthResult** (L.10-12) :
```ts
export interface AuthResult {
  user: User;
} | null;
```

**Signature getAuthUserFromRequest** (L.14) :
```ts
export async function getAuthUserFromRequest(req: { headers: { authorization?: string } }): Promise<AuthResult> {
```

**Import et usage dans server/index.ts** :
- L.8 : `import { getAuthUserFromRequest } from "./lib/depositAuth";`
- L.266 : `const authResult = await getAuthUserFromRequest(req);`
- L.347 : idem pour attach-payment-method

### Vérifications

| Question | Réponse | Preuve |
|----------|---------|--------|
| `type` ou `interface` ? | **interface** | L.10 : `export interface AuthResult` |
| `interface` + union `\| null` = TS invalide ? | **OUI** | Voir ci-dessous |
| Erreur tsc ? | **OUI** | `npx tsc --noEmit server/index.ts` |

**Commande :**
```bash
npx tsc --noEmit server/index.ts
```

**Sortie :**
```
server/lib/depositAuth.ts(12,3): error TS1109: Expression expected.
```

Ligne 12, colonne 3 = le `| null` après la fermeture de l’interface. Une union n’est pas autorisée avec `interface` en TypeScript.

**Note** : `npm run build` et `npx tsc --noEmit` (sans fichier) passent car le tsconfig principal ne contient que `tsconfig.app` (include: `src`) et `tsconfig.node` (include: `vite.config.ts`). Le dossier `server/` n’est pas inclus. Le serveur est exécuté par `tsx` (esbuild), sans typage.

### Conclusion

**Statut : BLOQUANT compilation** — confirmé lorsque le serveur est typechecké explicitement.

---

## 3) Gating métier serveur : Option A strict

### Ordre des middlewares

- **Webhook** (L.65-69) : `app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), ...)` — déclaré avant `express.json()`
- **express.json()** (L.230) : `app.use(express.json({ limit: "20mb" }))`
- **Routes deposit** (L.264, L.345) : après `express.json()` → reçoivent du JSON

### Table conditions / comportement

| Condition | Route(s) | Code HTTP | Message |
|-----------|----------|-----------|---------|
| JWT absent ou invalide | create / attach | 401 | "Token d'authentification requis ou invalide" |
| booking absent (404) | create / attach | 404 | "Réservation introuvable" |
| user mismatch (ownership) | create / attach | 403 | "Cette réservation ne vous appartient pas" |
| snapshot <= 0 | create / attach | 400 | "Caution non requise pour cette réservation" |
| status incompatible (∉ confirmed/accepted) | create | 400 | "Statut de réservation incompatible" |
| deposit_status != pending | create / attach | 400 | "La caution a déjà été traitée" |
| stripe_payment_method_id déjà défini | create | 400 | "Une carte est déjà enregistrée pour cette caution" |
| bookingId/paymentMethodId manquants | attach | 400 | "bookingId et paymentMethodId requis" |
| profile.stripe_customer_id absent (attach) | attach | 400 | "Erreur configuration Stripe. Veuillez réessayer." |

**Références** : `server/index.ts` L.266-307 (create), L.347-394 (attach).

✅ Le serveur applique bien l’Option A strict sans déclencher de hold.

---

## 4) Stripe : SetupIntent only (NO HOLD)

### Recherche dans le serveur

| Pattern | Occurrence |
|---------|------------|
| `setupIntents.create` | ✅ L.331 |
| `paymentIntents.create` | ❌ Aucune |
| `capture_method` | ❌ Aucune |
| `request_extended_authorization` | ❌ Aucune |
| `off_session` dans PaymentIntent | ❌ Aucune |

### Preuves

1. **SetupIntent** (L.330-336) :
```ts
const setupIntent = await stripe.setupIntents.create({
  customer: stripeCustomerId,
  payment_method_types: ["card"],
  usage: "off_session",
  metadata: { bookingId },
});
```

2. **Aucun PaymentIntent deposit** : aucune création de PaymentIntent liée à la caution dans le serveur.

3. **Actions Stripe deposit** :
   - `stripe.customers.create` si `stripe_customer_id` absent (L.322-326)
   - `stripe.setupIntents.create` (L.330-336)
   - `stripe.paymentMethods.retrieve` + `stripe.paymentMethods.attach` (L.396-398)

✅ Aucun hold, aucun PaymentIntent deposit.

---

## 5) Écritures DB : colonnes modifiées

### profiles.stripe_customer_id

- **Écrit uniquement si NULL** : L.319-327 — `if (!stripeCustomerId)` → create customer → `profiles.update({ stripe_customer_id: stripeCustomerId, updated_at })`
- **Colonnes mises à jour** : `stripe_customer_id`, `updated_at`

### bookings (attach-payment-method)

**Update** (L.402-408) :
```ts
.update({
  stripe_payment_method_id: paymentMethodId,
  deposit_status: "card_registered",
  updated_at: new Date().toISOString(),
})
.eq("id", bookingId);
```

| Colonne | Valeur |
|---------|--------|
| `stripe_payment_method_id` | paymentMethodId (pm_xxx) |
| `deposit_status` | `'card_registered'` |
| `updated_at` | ISO string |

**`deposit_payment_intent_id`** : aucune écriture dans les routes deposit → reste NULL en Phase 3.2.2.

✅ Seules les colonnes attendues sont modifiées.

---

## 6) Front : wiring CTA / modale sans régression paiement

### A) RenterBookingCard.tsx

**CTA "Activer la caution"** (L.1222-1233) :
- Condition : `statusUI.showDepositCTA` (L.1223) → `getUserBookingStatusUI()` (L.401-411) : `isPaidStatus && depositStatus === 'pending' && snapshot > 0`
- Clic : `onRequestDeposit?.(booking)` (L.1231)
- **Preuve** : pas d’appel à `onRequestPay` pour ce bouton.

**Bouton "Payer ma location"** (L.1249-1298) :
- Condition : `booking.status === 'pending_payment'` (L.1249)
- Clic : `onRequestPay?.({ ... })` (L.1275)

✅ CTA caution → `onRequestDeposit` ; paiement location → `onRequestPay`.

### B) RenterBookings.tsx

**État** (L.79-80) : `depositModalBooking`, `isDepositModalOpen`

**Handler onRequestDeposit** (L.882-885) :
```ts
onRequestDeposit={(booking) => {
  setDepositModalBooking(booking);
  setIsDepositModalOpen(true);
}}
```

**DepositFlowModal** (L.984-998) :
- `bookingId={depositModalBooking.id}` (L.991)
- `depositAmount={Number(depositModalBooking.depositAmount ?? depositModalBooking.depositAmountSnapshot ?? 0)}` (L.992)
- `onSuccess={() => { loadBookings(); toast(...); }}` (L.993-995)

✅ `bookingId` correct, `loadBookings()` appelé après succès.

### C) DepositFlowModal.tsx

**Flow** :
1. Fetch clientSecret (L.106-116) : `createSetupIntentClientSecret(bookingId).then(({ clientSecret: secret }) => setClientSecret(secret))`
2. Stripe `confirmSetup` (L.40-46) : `stripe.confirmSetup({ elements, confirmParams: { return_url }, redirect: "if_required" })`
3. `paymentMethodId` (L.54-56) : `setupIntent?.payment_method` (string ou `.id`)
4. `attachPaymentMethod` (L.64) : `await attachPaymentMethod(bookingId, pmId)`

✅ Chaîne complète : clientSecret → confirmSetup → attach.

---

## 7) Snapshot numeric : traitement côté runtime

### Où `depositAmount` / `deposit_amount_snapshot` est utilisé

| Fichier:Ligne | Expression | Type côté JS |
|---------------|------------|--------------|
| `server/index.ts:291` | `Number(booking.deposit_amount_snapshot ?? 0)` | number |
| `server/index.ts:372` | `Number(booking.deposit_amount_snapshot ?? 0)` | number |
| `RenterBookingCard.tsx:402` | `Number(depositAmount ?? 0)` | number |
| `RenterBookings.tsx:992` | `Number(depositModalBooking.depositAmount ?? depositModalBooking.depositAmountSnapshot ?? 0)` | number |
| `RenterBookings.tsx:496, 543` | `(booking as any).deposit_amount_snapshot ?? null` | source DB (PostgREST peut renvoyer string) |

### Vérification

- Côté serveur : `Number(...)` systématique → comparaison `depositSnapshot > 0` (L.292, 373) en number.
- Côté front : `Number(...)` dans `RenterBookingCard` (L.402) et `RenterBookings` (L.992).
- Source : PostgREST peut renvoyer des numeric en string ; le `Number()` évite les bugs de comparaison.

✅ Les comparaisons snapshot > 0 se font bien en number, avec conversion explicite.

---

## 8) Conclusion GO / NO GO + Liste d’ajustements

### Décision : NO GO

**Blocant** : définition invalide de `AuthResult` dans `server/lib/depositAuth.ts` (L.10-12) → erreur TypeScript quand le serveur est typechecké.

### Liste fermée d’ajustements (max 3)

| # | Fichier:Lignes | Problème | Test après correction |
|---|----------------|----------|------------------------|
| 1 | `server/lib/depositAuth.ts:10-12` | `interface AuthResult { } \| null` invalide en TS. Il faut un `type` avec union. | `npx tsc --noEmit server/index.ts` doit passer sans erreur. |
| 2 | — | — | — |
| 3 | — | — | — |

### Checklist finale "100% validé"

| # | Critère | Statut |
|---|---------|--------|
| 1 | Périmètre Phase 3.2.2 clair | ✅ |
| 2 | Auth JWT : définition TS valide | ❌ (bloquant) |
| 3 | Auth JWT : usage correct dans index | ✅ |
| 4 | Gating métier strict (ownership, status, snapshot, deposit_status, PM) | ✅ |
| 5 | Stripe SetupIntent only, pas de hold | ✅ |
| 6 | DB : colonnes attendues uniquement | ✅ |
| 7 | Front CTA caution vs paiement location corrects | ✅ |
| 8 | Snapshot traité comme number | ✅ |
| 9 | Pas de régression webhook (raw avant json) | ✅ |

---

**DIAG Phase 3.2.2 Option A strict terminé. Statut : NO GO — 1 ajustement bloquant (AuthResult).**
