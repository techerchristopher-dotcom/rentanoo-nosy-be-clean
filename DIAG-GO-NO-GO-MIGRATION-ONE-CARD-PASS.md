# DIAG — GO/NO GO migration "1 passage carte"

**Date** : 2026-02-16  
**Mode** : DIAG ONLY — aucune modification de code.  
**Objectif** : Checklist production-safe avant migration vers le flow :

> Paiement location via Checkout → carte sauvegardée automatiquement (`setup_future_usage="off_session"`) → suppression implicite du flow SetupIntent pour les nouveaux bookings.

---

## 1️⃣ Webhook réellement actif en PROD

### URLs configurées (source : `DIAG-STRIPE-URLS-RENTANOO-YT-VS-COM.md`)

| Webhook | Fichier | URL complète |
|---------|---------|--------------|
| **Express** | `server/index.ts` L72-234 | `https://rentanoo.com/api/stripe/webhook` |
| **Edge** | `supabase/functions/stripe-webhook/index.ts` L48-276 | `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook` |

**Note** : Un seul endpoint peut être configuré par événement dans Stripe Dashboard. Lequel est actif en prod doit être vérifié manuellement (Stripe Dashboard → Developers → Webhooks → Endpoints).

### Tableau synthèse

| Webhook | Utilisé en prod ? | Status écrit | Champs DB modifiés | Risque si modifié |
|---------|-------------------|--------------|--------------------|-------------------|
| **Express** | À vérifier (Stripe Dashboard) | `"accepted"` | `status`, `paid_at`, `stripe_payment_intent_id`, `stripe_checkout_session_id`, `amount_total_paid`, `service_fee_renter`, `service_fee_owner`, `owner_payout_amount`, `platform_total_fee`, `currency` | Si webhook Express actif et qu'on change le status → incompatibilité possible avec contrainte DB `status IN ('pending','pending_payment','confirmed','accepted',...)` — `accepted` et `confirmed` sont tous deux valides |
| **Edge** | À vérifier (Stripe Dashboard) | `"confirmed"` | Idem | Idem — `confirmed` conforme à la contrainte DB |

**Champs non écrits actuellement par aucun webhook** (preuves) :
- `stripe_payment_method_id` — absent du payload Express L161-174, Edge L196-209
- `deposit_status` — idem

**Preuve** :
```161:174:server/index.ts
        const updatePayload = {
          status: "accepted",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId || null,
          stripe_checkout_session_id: checkoutSessionId,
          amount_total_paid: amountTotal || amountTotalPaid,
          service_fee_renter: serviceFeeRenter,
          service_fee_owner: serviceFeeOwner,
          owner_payout_amount: ownerPayoutAmount,
          platform_total_fee: platformTotalFee,
          currency,
          updated_at: new Date().toISOString(),
        };
```

```196:209:supabase/functions/stripe-webhook/index.ts
  const updatePayload = {
    status: newStatus,
    paid_at: now,
    stripe_payment_intent_id: paymentIntentId,
    stripe_checkout_session_id: checkoutSessionId,
    amount_total_paid: amountTotalPaid,
    service_fee_renter: serviceFeeRenter,
    service_fee_owner: serviceFeeOwner,
    owner_payout_amount: ownerPayoutAmount,
    platform_total_fee: platformTotalFee,
    currency,
    updated_at: now,
  };
```

---

## 2️⃣ Capacité à stocker le PaymentMethod

### Colonnes DB

| Champ | Table | Existe ? | Où écrit actuellement | Risque |
|-------|-------|----------|------------------------|--------|
| `stripe_payment_method_id` | `bookings` | **À confirmer en DB** | `server/index.ts` L411-412 (attach-payment-method uniquement) | Aucune migration dans le repo (`grep -r "stripe_payment_method_id" supabase/migrations/` → 0 résultat). Si absent en prod → crash attach-payment-method + webhook futur |
| `deposit_status` | `bookings` | **À confirmer en DB** | `server/index.ts` L411-412 (attach-payment-method uniquement) | Idem — DIAG-PHASE3.1 confirme : aucune migration dans le repo pour deposit_status/deposit_amount_snapshot. Phase 2 appliquée manuellement ou hors repo |
| `deposit_amount_snapshot` | `bookings` | **À confirmer en DB** | Phase 2 (acceptation owner) — code `bookings.ts` L285-286 (`updateBookingToPendingPaymentWithDepositSnapshot`) | Idem |
| `stripe_customer_id` | `profiles` | **Oui** | `supabase/migrations/20260214170000_add_profiles_stripe_customer_id.sql` L5 ; écrit par create-setup-intent L326-335 | Migration présente — pas de risque |

**Commande de vérification DB** :
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'bookings' 
AND column_name IN ('deposit_status','deposit_amount_snapshot','stripe_payment_method_id');
```

### Récupération du PaymentMethod depuis le PaymentIntent

| Élément | Utilisé actuellement ? | Fichier | Risque |
|---------|-------------------------|---------|--------|
| `stripe.paymentIntents.retrieve(piId)` | **Non** | Aucun usage dans le repo | Pas de conflit — à implémenter dans le webhook pour extraire `payment_method` et l'écrire en DB |

---

## 3️⃣ create-checkout-session

**Fichier** : `supabase/functions/create-checkout-session/index.ts` L507-526

| Élément | Ligne | Compatible ? | Risque |
|---------|-------|--------------|--------|
| `mode: "payment"` | L508 | ✅ Oui | `setup_future_usage` compatible avec mode payment |
| `payment_method_types: ["card"]` | L509 | ✅ Oui | Pas de conflit |
| `customer` | — | Absent | **À ajouter** : nécessaire pour `setup_future_usage` si customer existe déjà |
| `customer_email` | — | Absent | **À ajouter** si pas de `stripe_customer_id` (Checkout créera le customer) |
| `customer_creation` | — | Absent | **À ajouter** : `"always"` si on utilise `customer_email` |
| `payment_intent_data` | — | Absent | **Point d'injection** : `{ setup_future_usage: "off_session" }` |

**Extrait actuel** :
```507:526:supabase/functions/create-checkout-session/index.ts
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [...],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: String(bookingId),
      },
    });
```

**Lecture DB actuelle** : `booking` L307-310 — uniquement `subtotal, base_price, options_total, vehicle_id, start_date, end_date`. Pas de `user_id`, pas de jointure `profiles`. Pour ajouter `customer` ou `customer_email`, il faut :
1. Étendre le `select` : ajouter `user_id`
2. Joindre `profiles` pour `stripe_customer_id` et `email`
3. Si `stripe_customer_id` présent → `customer: stripe_customer_id`
4. Sinon → `customer_email: profile.email`, `customer_creation: "always"`

---

## 4️⃣ Dépendances FRONT — Bouton "Activer caution"

| Composant | Condition | Risque si PM déjà présent |
|-----------|-----------|---------------------------|
| **RenterBookingCard** | `getUserBookingStatusUI` L407-416 : `status in (confirmed, accepted)` ET `deposit_status === 'pending'` ET `snapshot > 0` ET `!stripePmId` | ✅ Bypass automatique — si `stripe_payment_method_id` présent, `showDepositCTA: false` |
| **canOpenDepositModal** | `RenterBookings.tsx` L63-76 : idem | ✅ Bypass automatique |

**Preuve** :
```407:417:src/components/RenterBookingCard.tsx
    // Cas A: confirmed/accepted + deposit_status pending + deposit_amount_snapshot > 0 + pas de PM déjà enregistrée
    const isPaidStatus = booking.status === 'confirmed' || booking.status === 'accepted';
    if (isPaidStatus && depositStatus === 'pending' && snapshot > 0 && !stripePmId) {
      return {
        ...
        showDepositCTA: true,
        depositCTALabel: t('bookings.card.activateDeposit', 'Activer la caution')
      }
    }
```

**Conclusion** : Aucune modification front nécessaire pour bypass. Si le webhook écrit correctement `stripe_payment_method_id` et `deposit_status = 'card_registered'` après paiement Checkout, le bouton "Activer caution" ne s'affichera pas.

---

## 5️⃣ Cas edge à sécuriser

| Cas | Comportement actuel | Comportement cible | Risque | Action sécurisation |
|-----|---------------------|--------------------|--------|----------------------|
| **A) Booking payé AVANT migration** | `deposit_status = 'pending'`, `stripe_payment_method_id = null` | Inchangé | Si webhook modifié pour ne jamais écrire PM → aucun impact (pas de PM à écrire). Si webhook modifié pour toujours appeler `paymentIntents.retrieve` et écrire PM → risque d'écrire PM pour des anciens paiements (PI sans setup_future_usage) | Webhook : ne mettre à jour `stripe_payment_method_id` et `deposit_status` que si `deposit_amount_snapshot > 0` ET que le PI provient d'un Checkout créé après migration (ou : toujours essayer si snapshot > 0 — PI legacy n'aura pas de PM réutilisable off_session, mais l'écrire ne casse rien) |
| **B) Booking payé APRÈS migration** | PM non stocké | PM stocké automatiquement, `deposit_status = 'card_registered'` | — | Webhook : `paymentIntents.retrieve` → `payment_method` → update booking |
| **C) User sans stripe_customer_id** | create-setup-intent crée le customer | Checkout doit pouvoir créer le customer | Si Checkout crée un customer sans le lier au profile → perte de cohérence | create-checkout-session : passer `customer_email` + `customer_creation: "always"` ; webhook : après paiement, récupérer `session.customer` du Checkout et écrire `profiles.stripe_customer_id` |
| **D) Mixed TEST/LIVE** | Clés sk_ / pk_ par environnement | Cohérence requise | Si webhook prod reçoit événement TEST (ou inversement) → signature invalide ou données incohérentes | Vérifier Dashboard Stripe : webhook LIVE pointe vers URL prod avec `STRIPE_WEBHOOK_SECRET` correspondant à la clé LIVE |
| **E) Double écriture webhook** | Express et Edge peuvent être configurés tous deux | Un seul actif recommandé | Si les deux actifs → double update, status potentiellement écrasé (accepted vs confirmed) | Ne configurer qu'un seul endpoint dans Stripe. Supprimer ou désactiver l'autre |

---

## 6️⃣ Checklist GO / NO GO PRODUCTION

### Avant déploiement

- [ ] **Webhook prod identifié** : Stripe Dashboard → Developers → Webhooks → quel endpoint reçoit `checkout.session.completed` ?
- [ ] **Clés Stripe alignées** : `sk_live_` / `pk_live_` en prod, `STRIPE_WEBHOOK_SECRET` correspondant au webhook LIVE
- [ ] **Colonnes DB vérifiées** : exécuter la requête `information_schema` ; confirmer `deposit_status`, `deposit_amount_snapshot`, `stripe_payment_method_id` sur `bookings`
- [ ] **create-checkout-session modifiable sans conflit** : pas d’option incompatible avec `setup_future_usage` ; ajout de `payment_intent_data`, `customer`/`customer_email` possible

### Après déploiement (tests réels)

- [ ] **Nouveau booking** → paiement Checkout → `stripe_payment_method_id` et `deposit_status = 'card_registered'` en DB
- [ ] **Booking ancien** (payé avant migration) → flow SetupIntent toujours OK, bouton "Activer caution" affiché
- [ ] **deposit_status** correct pour nouveaux paiements
- [ ] **stripe_payment_method_id** rempli pour nouveaux paiements
- [ ] **Aucun bouton "Activer caution"** pour les bookings payés après migration (car PM déjà présent)

---

## 7️⃣ Risque global

| Zone | Risque | Impact | Complexité |
|------|--------|--------|------------|
| Colonnes DB manquantes | Élevé | Crash webhook/attach si colonnes absentes | Faible — migration à appliquer si besoin |
| Webhook : lequel est actif ? | Moyen | Changement de status (accepted vs confirmed) si on modifie le mauvais | Faible — vérification manuelle |
| create-checkout-session : customer | Moyen | Sans customer/customer_email, setup_future_usage ne sauvegarde pas la carte | Moyenne — ajout select user_id, jointure profiles |
| Webhook : extraction PM | Moyen | Sans `paymentIntents.retrieve`, PM non stocké | Moyenne — ajout logique webhook |
| Webhook : écriture profiles.stripe_customer_id | Moyen | User sans customer en profile après Checkout | Moyenne — webhook doit mettre à jour profiles |
| Cas A (booking ancien) | Faible | Flow SetupIntent inchangé si conditions webhook correctes | Faible |
| Double webhook | Faible | Écritures conflictuelles | Faible — 1 seul endpoint actif |

---

## 8️⃣ Conclusion

| Note | Critère |
|------|---------|
| 🔵 **Risque faible** | Colonnes DB confirmées en prod ; un seul webhook actif ; tests après déploiement OK |
| 🟠 **Risque modéré** | Colonnes à créer/migrer ; incertitude sur le webhook actif ; modifications create-checkout-session + webhook non triviales |
| 🔴 **Risque élevé** | Colonnes absentes en prod ; double webhook actif ; clés TEST/LIVE mélangées |

### Recommandation

**NO GO** tant que :
1. Les colonnes `deposit_status`, `deposit_amount_snapshot`, `stripe_payment_method_id` ne sont pas confirmées présentes en prod (ou migrées).
2. Le webhook réellement utilisé en production n’est pas identifié (Express vs Edge).

**GO** possible une fois :
- Vérification DB effectuée (colonnes présentes ou migration appliquée).
- Webhook prod identifié.
- Implémentation : create-checkout-session (customer + payment_intent_data) + webhook (paymentIntents.retrieve, mise à jour booking + profiles.stripe_customer_id).

---

**Rappel** : DIAG ONLY — aucune modification de code dans ce document.
