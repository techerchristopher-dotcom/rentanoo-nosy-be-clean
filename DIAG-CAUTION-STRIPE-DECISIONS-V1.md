# Diagnostic — 3 décisions bloquantes fermées (V1)

**Date** : 14 février 2026  
**Mode** : DIAG ONLY — aucun code, aucune implémentation, aucun pseudo-code  
**Référence** : `DIAG-CAUTION-STRIPE-PHASES-V1.md`

---

## Décision 1 — Flow métier "acceptation vs paiement"

### 1.1 Le propriétaire doit-il accepter avant que le locataire puisse payer ?

**Oui.** Le bouton "Payer" n’est affiché que quand le statut est `pending_payment`, et ce statut n’est atteint qu’après acceptation du propriétaire.

| Preuve | Fichier | Section |
|--------|---------|---------|
| Condition d’affichage du bouton paiement | `src/components/RenterBookingCard.tsx` | L.1251 : `{booking.status === 'pending_payment' && (...)` |
| Idem (discussion) | `src/pages/booking/BookingDiscussion.tsx` | L.1177 : `shouldShowPayButton = currentBooking?.status === 'pending_payment' \|\| bookingStatus === 'pending_payment'` |
| Passage à pending_payment | `src/components/OwnerBookingCard.tsx` | L.260 : `updateBookingStatus(booking.id, 'pending_payment')` au clic "Accepter" |
| Visibilité bouton Accepter | `OwnerBookingCard.tsx` | L.1094-1097 : visible si `status === 'pending'` (ou `pending_payment` selon version) — L.1096 `conditionAcceptCorrect = booking.status === 'pending'` |

**Flow** : `pending` (création) → propriétaire clique "Accepter" → `pending_payment` → locataire voit "Payer" → paiement → webhook → `accepted`/`confirmed`.

---

### 1.2 Le locataire peut-il payer immédiatement à la demande (sans acceptation) ?

**Non.** L’UI ne propose pas le paiement avant `pending_payment`. Le backend (`create-checkout-session`) ne contrôle pas le statut : il crée une session dès que le `bookingId` existe et que `subtotal > 0`. La restriction est purement côté UI.

| Preuve | Fichier | Section |
|--------|---------|---------|
| Pas de vérification de statut | `supabase/functions/create-checkout-session/index.ts` | L.303-331 : lit `bookingId`, charge booking, vérifie `subtotal > 0` — aucune condition sur `status` |
| Gate côté UI | `RenterBookingCard.tsx` | L.1251 : bouton conditionné par `status === 'pending_payment'` |

---

### 1.3 Écrans/fichiers qui prouvent le flow

| Rôle | Fichier | Rôle dans le flow |
|------|---------|-------------------|
| Propriétaire — liste | `src/pages/owner/OwnerBookings.tsx` | L.306-307 : `pendingRequests = status pending \|\| pending_payment` ; L.711 : `forceExpand` si pending/pending_payment |
| Propriétaire — carte | `src/components/OwnerBookingCard.tsx` | L.259-260 : bouton "Accepter" → `updateBookingStatus(id, 'pending_payment')` ; L.1154 : "Refuser" visible pour pending et pending_payment |
| Locataire — liste | `src/pages/renter/RenterBookings.tsx` | L.799-801 : filtre pending = `confirmed + deposit_status pending` ou `pending` ou `pending_payment` |
| Locataire — carte | `src/components/RenterBookingCard.tsx` | L.1251 : bouton "Payer" si `status === 'pending_payment'` ; L.1196 : "Finaliser" si `confirmed + deposit_status === 'pending'` |
| Service | `src/services/supabase/bookings.ts` | L.221-241 : `updateBookingStatus` — met à jour uniquement `status` et `updated_at`, rien d’autre |
| Discussion | `src/pages/booking/BookingDiscussion.tsx` | L.1177 : bouton paiement si `status === 'pending_payment'` |

---

### 1.4 Meilleur moment pour le snapshot `deposit_amount_snapshot`

| Option | Cohérence UX | Stabilité technique | Verdict |
|--------|--------------|----------------------|---------|
| À la création | Faible — le propriétaire peut modifier le montant avant acceptation | Moyenne | ❌ |
| À l’acceptation (pending → pending_payment) | Forte — "au moment où le propriétaire valide la réservation" | Forte — `updateBookingStatus` existe déjà, point d’extension simple | ✅ |
| Au webhook paiement | Moyenne — le paiement confirme tout, mais le montant peut avoir changé entre acceptation et paiement | Plus complexe — nécessite lecture vehicle_id, puis vehicles.deposit_amount, dans le webhook | ⚠️ |

**Conclusion** : snapshot à l’acceptation (lors du passage à `pending_payment`).

**Justification** :
- Cohérence : le montant est figé quand le propriétaire valide la réservation.
- Stabilité : `SupabaseBookingsService.updateBookingStatus` est le seul point qui change le statut vers `pending_payment` ; on peut y ajouter le snapshot (ou une fonction appelée par ce chemin).
- Simplicité : pas besoin de modifier les webhooks Stripe pour la caution.

---

### 1.5 Critères de validation (Décision 1)

- [ ] Confirmation manuelle : bouton "Accepter" visible uniquement quand `status === 'pending'`.
- [ ] Après acceptation : `status === 'pending_payment'` en DB.
- [ ] Bouton "Payer" visible uniquement quand `status === 'pending_payment'`.
- [ ] `create-checkout-session` ne vérifie pas le statut (confirmé).
- [ ] Le snapshot sera ajouté dans le chemin `updateBookingStatus(..., 'pending_payment')` (ou équivalent).

---

## Décision 2 — Scope sécurité

### 2.1 Les routes Express existantes vérifient-elles l’identité utilisateur ?

**Non.** Aucune route Express ne vérifie de JWT ou d’identité.

| Route | Fichier | Lignes | Vérification auth |
|-------|---------|--------|--------------------|
| `POST /api/stripe/webhook` | `server/index.ts` | L.65-226 | Aucune — Stripe envoie sans JWT |
| `POST /api/contact` | `server/index.ts` | L.263+ | Aucune |
| `GET /api/health/email` | `server/index.ts` | L.464+ | Aucune |
| `GET /api/stripe-health` | `server/index.ts` | L.526+ | Aucune |
| `POST /api/checkin/start` | `server/index.ts` | L.541+ | Aucune |
| `POST /api/checkin/saveDraft` | `server/index.ts` | L.655+ | Aucune |

**Preuve** : grep `Authorization|Bearer|getUser|auth\.` dans `server/index.ts` → aucun résultat (diagnostic précédent).

---

### 2.2 Décision de scope réaliste

**Sécuriser uniquement les nouvelles routes caution** : deposit, admin, cron. Ne pas modifier les routes existantes.

| Routes à sécuriser | Méthode | Justification |
|--------------------|---------|---------------|
| `POST /api/deposit/create-setup-intent` (ou équivalent) | JWT Supabase (header Authorization) | Action initiée par le locataire connecté |
| `POST /api/deposit/attach` (ou équivalent) | JWT Supabase | Idem |
| `POST /api/admin/deposit/capture` | Header `X-Admin-Secret` | Action admin uniquement |
| `POST /api/cron/deposit-hold` | Header `X-Cron-Secret` | Appelé par n8n uniquement |
| `POST /api/cron/deposit-release` | Header `X-Cron-Secret` | Idem |

---

### 2.3 Risques résiduels et atténuation

| Risque | Atténuation (sans refactor global) |
|--------|-------------------------------------|
| Routes existantes non protégées | Documenter ; prévoir une phase ultérieure si besoin |
| Secret cron exposé | Variable d’env `CRON_SECRET` forte ; n8n le transmet en header ; pas de log du secret |
| Secret admin exposé | Idem `ADMIN_SECRET` ; usage limité aux admins internes |
| Abus de l’endpoint deposit sans JWT | Rejeter 401 si pas de JWT valide ; Stripe Customer lié au `auth.uid()` |
| Logs sensibles | Ne jamais logger les headers secrets ; logger uniquement `bookingId`, `status`, `timestamp` |

---

### 2.4 Critères de validation (Décision 2)

- [ ] Les routes deposit vérifient le JWT Supabase et rejettent 401 si absent/invalide.
- [ ] Les routes cron vérifient `X-Cron-Secret` et rejettent 401 si absent ou incorrect.
- [ ] Les routes admin vérifient `X-Admin-Secret` (ou équivalent) et rejettent 401 si absent ou incorrect.
- [ ] Aucune modification des routes existantes (`/api/contact`, `/api/checkin/*`, etc.) pour cette phase.
- [ ] Les secrets ne sont pas logués.

---

## Décision 3 — Webhooks Stripe : source de vérité

### 3.1 Quelle URL webhook est configurée actuellement dans le Dashboard Stripe ?

**Non vérifiable à partir du code.** Le dépôt ne contient pas la configuration Stripe. Il faut consulter manuellement le Dashboard Stripe.

| Endpoint possible | URL typique | Source |
|-------------------|-------------|--------|
| Express (Railway) | `https://rentanoo.com/api/stripe/webhook` | `STRIPE-GO-LIVE-CHECKLIST.md` L.31-32 |
| Edge (Supabase) | `https://zykwfjxurwmputxwlkxs.supabase.co/functions/v1/stripe-webhook` | `STRIPE-GO-LIVE-CHECKLIST.md` L.41-42 |

**Action requise** : aller sur https://dashboard.stripe.com/test/webhooks (ou /webhooks en LIVE), lister les endpoints, et noter pour chaque endpoint : URL, événements, statut (actif/désactivé).

---

### 3.2 Recommandation — Une seule source de vérité

**Recommandation : Express (`/api/stripe/webhook` sur Railway).**

| Critère | Express | Edge |
|---------|---------|------|
| Simplicité | Une seule stack backend pour paiement + caution | Création checkout déjà en Edge ; webhooks en Edge = mix |
| Disponibilité | Même serveur que checkin, contact — déjà déployé | Dépend de Supabase ; historique 401 (DIAG-STRIPE-WEBHOOK-401) si `verify_jwt` mal configuré |
| Cohérence avec create-checkout-session | create-checkout-session reste en Edge ; webhooks centralisés côté app | Tout Stripe dans Supabase |
| Validation signature | Déjà gérée L.74-98 si `STRIPE_WEBHOOK_SECRET` défini | Idem |
| Événements caution | Extensible facilement (`payment_intent.succeeded`, etc.) | Idem |

**Choix Express** : le serveur Express est déjà la brique principale (checkin, contact). Centraliser les webhooks Stripe dessus limite les points de configuration (Railway vs Supabase) et évite les soucis Edge (`verify_jwt`, 401).

---

### 3.3 Actions à faire dans le Dashboard Stripe (sans les faire)

| Action | Détail |
|--------|--------|
| Vérifier l’endpoint actif | Lister les webhooks ; noter lequel reçoit `checkout.session.completed` (logs Railway vs Supabase). |
| Garder / créer l’endpoint Express | URL : `https://rentanoo.com/api/stripe/webhook` (ou l’URL Railway réelle). |
| Désactiver l’endpoint Edge (si actif) | Si l’Edge `stripe-webhook` est configuré : le désactiver pour éviter doublons et divergence. |
| Activer les événements caution | Pour le webhook Express : ajouter `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` (en plus de `checkout.session.completed` si pas déjà présent). |
| Vérifier le signing secret | S’assurer que `STRIPE_WEBHOOK_SECRET` (whsec_…) est défini dans Railway et que le webhook valide la signature. |

---

### 3.4 Checklist Dashboard (à exécuter manuellement)

- [ ] Ouvrir https://dashboard.stripe.com/test/webhooks (ou /webhooks pour LIVE).
- [ ] Noter l’URL de l’endpoint actif pour `checkout.session.completed`.
- [ ] Si deux endpoints existent : désactiver celui qui ne sera pas utilisé.
- [ ] Pour l’endpoint conservé (recommandé : Express) : ajouter `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.
- [ ] Copier le Signing secret et le mettre dans `STRIPE_WEBHOOK_SECRET` (Railway ou Supabase selon l’endpoint).
- [ ] Tester avec `stripe trigger checkout.session.completed` (ou équivalent) pour confirmer la réception.

---

### 3.5 Critères de validation (Décision 3)

- [ ] Un seul endpoint webhook Stripe est actif pour les événements paiement et caution.
- [ ] L’URL de l’endpoint actif est documentée (ex. dans un fichier ENV ou README).
- [ ] Les événements `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` sont associés à cet endpoint.
- [ ] `STRIPE_WEBHOOK_SECRET` est défini et la signature est vérifiée (pas de mode dev sans secret en prod).
- [ ] Test manuel : un événement test déclenche bien le handler côté serveur.
