# Diagnostic 100% vérifiable + Découpage en phases — Caution Stripe V1

**Date** : 14 février 2026  
**Objectif** : Diagnostic vérifiable + plan de phases (sans implémentation)  
**Mode** : Analyse, risques, décisions, checklist uniquement — aucun code

---

## A) Cartographie exacte de l'existant (avec preuves)

### A1. Paiement location

#### Flow end-to-end Checkout

| Étape | Fichier | Section / Lignes | Preuve |
|-------|---------|------------------|--------|
| Création session | `src/lib/payerLocation.ts` | L.51-54 | `supabase.functions.invoke("create-checkout-session", { body: { bookingId } })` — JWT passé automatiquement par le client Supabase |
| Edge Function | `supabase/functions/create-checkout-session/index.ts` | L.303-404 | Lit `bookingId` du body, charge `bookings.subtotal` depuis DB, calcule TTC, appelle `stripe.checkout.sessions.create({ mode: "payment", ... metadata: { bookingId } })` |
| Réponse | `supabase/functions/create-checkout-session/index.ts` | L.418-426 | Retourne `{ url: session.url }` |
| Redirection | `src/lib/payerLocation.ts` | L.91 | `window.location.href = data.url` — redirection navigateur vers Stripe Checkout |
| URLs Stripe | `create-checkout-session` | L.449-450 (env), L.522-523 (usage) | `success_url` et `cancel_url` depuis `STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL` |
| Page success | `src/pages/renter/PaymentSuccess.tsx` | L.31-41 | Attend 2s, puis `navigate("/me/renter/bookings?afterPayment=1")` — ne vérifie pas le paiement côté serveur |
| Webhook | `server/index.ts` | L.64-226 | Route `POST /api/stripe/webhook` — `express.raw()` pour body brut — écoute `checkout.session.completed` |
| Webhook alt. | `supabase/functions/stripe-webhook/index.ts` | L.48-108 | Même event `checkout.session.completed` — un seul des deux reçoit les événements selon config Stripe Dashboard |

#### Champs DB utilisés pour Stripe (bookings)

| Colonne | Source | Preuve |
|---------|--------|--------|
| `paid_at` | Webhook | `server/index.ts` L.156, `002_add_service_fee_columns.sql` L.26-28 |
| `stripe_payment_intent_id` | Webhook | `server/index.ts` L.157, migration L.32-40 |
| `stripe_checkout_session_id` | Webhook | `server/index.ts` L.158, migration L.43-51 |
| `amount_total_paid` | Webhook | L.159, migration L.55-65 |
| `service_fee_renter`, `service_fee_owner` | Webhook | L.160-161 |
| `owner_payout_amount`, `platform_total_fee` | Webhook | L.162-163 |
| `currency` | Webhook | L.164 |
| `status` | Webhook | L.155 — mis à `"accepted"` (Express) |

**Note** : `src/integrations/supabase/types.ts` ne déclare pas ces colonnes — le schéma TypeScript est en retard sur les migrations.

#### Table `payments`

| Élément | Preuve |
|---------|--------|
| Existence | `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` L.334-347 — table créée avec `booking_id`, `amount`, `status`, `stripe_payment_id`, `stripe_payment_intent_id` |
| Utilisation | Aucun `INSERT` ou `UPDATE` dans les webhooks — `DIAG-PAYMENT-STRIPE-OK-DB-PENDING.md` L.82-90 le confirme |
| Conclusion | Table **non utilisée** ; les webhooks mettent à jour uniquement `bookings` |

---

### A2. Réservations / dates

#### Colonnes dates

| Colonne | Fichier | Usage |
|---------|---------|-------|
| `start_date`, `end_date` | `src/integrations/supabase/types.ts` L.21-22 | Types bookings |
| `start_time`, `end_time` | `src/integrations/supabase/types.ts` L.28-29 | Optionnels |
| Création | `src/services/supabase/bookings.ts` L.72-78 | `start_date.split('T')[0]`, `end_date.split('T')[0]`, `start_time`, `end_time` dans `insertData` |
| Filtrage | `src/pages/renter/RenterBookings.tsx` L.789-826 | Filtres par `startDate`, `endDate`, `depositStatus` pour pending/active/upcoming |
| Affichage | `src/components/RenterBookingCard.tsx` | `booking.startDate`, `booking.endDate`, `(booking as any).startTime`, `(booking as any).endTime` |

#### Statuts booking (énumération implicite)

| Source | Statuts |
|--------|---------|
| `src/services/supabase/bookings.ts` L.155, 223 | `pending`, `accepted`, `rejected`, `cancelled`, `completed`, `active`, `closed`, `declined`, `confirmed`, `pending_payment`, `terminated` |
| `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` L.221 | Contrainte `bookings_status_check` : pending, pending_payment, confirmed, active, completed, cancelled, rejected, declined, terminated |
| Webhook Express | Met à jour vers `accepted` (L.155) |
| Edge stripe-webhook | Met à jour vers `confirmed` (L.191-194 : mapping `accepted` → `confirmed` pour conformité contrainte DB) |

---

### A3. UI

#### Onglet pricing (ManageVehicle)

| Élément | Fichier | Section |
|---------|---------|---------|
| Tabs | `src/pages/owner/ManageVehicle.tsx` | L.1616-1660 — `TabsList` avec `vehicle-info`, `listing`, `pricing`, `photos`, `preview` |
| Contenu pricing | `src/pages/owner/ManageVehicle.tsx` | L.2033-3199 — `TabsContent value="pricing"` : Prix journalier, remises, conditions, services |
| Exemple input | L.2095-2115 | Input `pricePerDay` avec `handleInputChange("pricePerDay", e.target.value)` |
| Sauvegarde | L.1153-1490 | `handleSave()` — plusieurs blocs `SupabaseVehiclesService.updateVehicle(vehicle.id, xxxUpdateData)` : baseUpdateData, optionalUpdateData, pricingUpdateData, equipmentUpdateData, etc. |
| Hook | `src/features/vehicle-management/hooks/useManageVehicle.ts` | `loadVehicle` mappe les données véhicule → `formData` ; `updateField` / `setFormData` pour les changements |

#### Bouton CTA côté renter

| Élément | Fichier | Section |
|---------|---------|---------|
| Carte | `src/components/RenterBookingCard.tsx` | Reçoit `onRequestPay` en prop (L.78-89) |
| Condition affichage | L.1193-1246 | `getUserBookingStatusUI()` renvoie `showDepositCTA: true` si `confirmed + deposit_status === 'pending'` |
| Label | L.1240 | `statusUI.depositCTALabel` = `t('bookings.card.finalizeBooking')` — "Finaliser ma réservation" (fr) |
| onClick | L.1201-1234 | Appelle `onRequestPay?.({ id, voiture, dateDebut, ... })` avec les données de réservation |
| Parent | `src/pages/renter/RenterBookings.tsx` | L.868-872 : `onRequestPay` → `setReservationCourante(reservation)`, `setModalMode("avantPaiement")`, `setStep1Complete(false)` |
| Modale ouverte | L.934-971 | `PaymentFlowModal` avec `onPayNow={payerLocation}` — c'est la modale de **paiement location**, pas de caution |

**Problème** : Le bouton "Finaliser ma réservation" (destiné à la caution) ouvre la même modale et déclenche `payerLocation` (paiement location). Le flux caution n'existe pas.

#### deposit_status / deposit_amount — existence DB

| Élément | Preuve |
|---------|--------|
| Usage UI | `RenterBookings.tsx` L.489-490, 535-536 : `depositStatus: (booking as any).deposit_status`, `depositAmount: (booking as any).deposit_amount` |
| Usage UI | `RenterBookingCard.tsx` L.395-396 : `depositStatus`, `depositAmount` depuis `(booking as any)` |
| Usage UI | `OwnerBookings.tsx` L.214, 322-324 : `depositStatus`, filtre sur `depositStatus === 'pending'` ou `'paid'` |
| Migrations | Aucun fichier dans `supabase/migrations/` ne crée `deposit_status` ni `deposit_amount` |
| types.ts | Pas de mention de `deposit_status` ou `deposit_amount` |
| Conclusion | Les colonnes **n'existent probablement pas** en DB ; l'UI lit des valeurs qui sont `null` ou indéfinies. Le flux actuel repose sur une base non implémentée. |

---

### A4. Backend / Auth

#### Authentification Express

| Route | Fichier | Auth |
|-------|---------|------|
| `/api/stripe/webhook` | `server/index.ts` L.65 | Aucune — Stripe envoie sans JWT |
| `/api/contact` | L.263 | Aucune |
| `/api/checkin/start` | L.541 | Aucune — accepte tout `bookingId` |
| `/api/checkin/saveDraft` | L.655 | Aucune |
| `/api/health/email` | L.464 | Aucune |
| `/api/stripe-health` | L.526 | Aucune |

**Conclusion** : Aucun endpoint Express ne vérifie de JWT utilisateur. `supabaseAdmin` (service role) est utilisé pour toutes les opérations DB — pas de vérification `auth.uid()`.

#### JWT côté client

| Contexte | Fichier | Preuve |
|----------|---------|--------|
| paiement | `payerLocation.ts` L.16-17 | `supabase.auth.getSession()` — le token est passé à l'Edge Function via `supabase.functions.invoke` (header auto) |
| create-checkout-session | Edge Function | Reçoit le JWT et vérifie l'utilisateur via Supabase ; pas d'endpoint Express équivalent |

#### Webhook Stripe — signature

| Élément | Fichier | Lignes |
|---------|---------|--------|
| Express | `server/index.ts` | L.74-98 : si `STRIPE_WEBHOOK_SECRET` présent → `stripe.webhooks.constructEvent(body, sig, secret)` ; sinon `JSON.parse(body)` (mode dev) |
| Edge | `supabase/functions/stripe-webhook/index.ts` | L.63-93 : même logique |
| Risque | L.90-92 (Express), L.88-91 (Edge) | Sans `STRIPE_WEBHOOK_SECRET` : **aucune vérification** — n'importe qui peut envoyer un JSON forgé et déclencher une mise à jour `bookings` |

---

### A5. Automatisation

#### Scheduler interne

| Source | Preuve |
|--------|--------|
| `DEPLOY_DIAG_REPORT.md` | L.38 : "Pas de cron jobs / tâches planifiées" |
| Recherche | Aucun `cron`, `schedule`, `bull`, `queue`, `worker`, `agenda` dans le code applicatif (hors docs) |

**Conclusion** : Aucun scheduler interne.

#### n8n

| Document | Contenu |
|----------|---------|
| `WORKFLOW-N8N-EDL-AUTO-EMAIL.md` | L.94-122 : Option B "Cron week-end" — `*/10 * * * 0,6` — requête Supabase pour check-ins `completed` — HTTP Request vers endpoint ou webhook |
| `.env.local.example` | `VITE_N8N_PROFILES_CREATED_WEBHOOK_URL`, `VITE_N8N_WELCOME_WEBHOOK_URL` — appels sortants depuis le front |
| Autres | `FIX-WEBHOOK-EDL-RETOUR-ALIGN-DEPART.md`, `DIAG-EMAIL-EDL-6-FOIS.md` — workflows n8n pour EDL |

**Conclusion** : n8n est utilisé (Cron + HTTP / webhooks) ; pas de doc décrivant un cron appelant l'API Express.

---

## B) Contraintes Stripe à valider (sans implémenter)

### B1. Extended Authorization

| Point | Référence | Détail |
|-------|-----------|--------|
| Applicabilité | Doc Stripe "Place an extended hold on an online card payment" | Catégorie "vehicle rental" éligible (Visa, Amex, Discover) |
| Conditions | Doc Stripe | `capture_method: 'manual'` + `payment_method_options.card.request_extended_authorization: 'if_available'` |
| Fenêtre | Doc | Jusqu’à ~30 jours selon réseau (Visa ~29j18h) ; Amex : capture avant fin du séjour/location |
| Lecture | Doc | `charge.payment_method_details.card.capture_before` (Unix) et `extended_authorization.status` (enabled/disabled) |
| Tarification | Doc | IC+ ou contact Stripe si blended |
| Limites | Doc | Pas garanti pour toutes les cartes ; `capture_before` peut varier ; Amex : contrainte de capture avant fin location |

### B2. Off-session + SCA (requires_action)

| Point | Détail |
|-------|--------|
| Risque | PaymentIntent en `off_session` peut renvoyer `requires_action` (3DS, etc.) — impossible à finaliser sans intervention du porteur |
| Impact | Le hold échoue côté Stripe ; le client doit ré-authentifier sa carte |
| UX minimum | 1) Détecter `requires_action` ; 2) Obtenir `client_secret` ou URL de complétion ; 3) Rediriger ou afficher une page dédiée pour que le client finalise ; 4) Mettre à jour le statut après succès |
| Sans cela | Le statut reste "en attente" ; le client ne peut pas terminer le flux ; la location peut être bloquée |

---

## C) Décisions techniques à prendre AVANT de coder

### C1. Où stocker le montant caution

| Option | Décision | Justification |
|--------|----------|---------------|
| `vehicles.deposit_amount` | Oui | Montant défini par véhicule, modifiable par le propriétaire |
| Snapshot dans `bookings` | Oui | Garde le montant au moment de la réservation si le propriétaire le modifie ensuite |

### C2. Où faire le snapshot

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| À la création booking | Déjà un moment métier | Le propriétaire peut changer le montant avant acceptation |
| À l'acceptation (pending_payment) | Montant figé au moment où la résa devient payante | Nécessite d’adapter `OwnerBookingCard` / `updateBookingStatus` |
| Au paiement (webhook checkout) | Cohérent avec l’update existant | Le webhook ne reçoit pas `vehicle_id` ; il faudrait le lire depuis le booking |

**Recommandation** : À l’acceptation. Le propriétaire valide la réservation et le montant caution à ce moment-là. L’endpoint/méthode qui passe le statut à `pending_payment` est le point naturel pour ajouter le snapshot.

### C3. Où gérer les webhooks

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| Express uniquement | Une seule implémentation, plus simple à maintenir | Dépend de la disponibilité du serveur Express |
| Edge Function uniquement | Déjà utilisée pour create-checkout-session | Historique 401 (DIAG-STRIPE-WEBHOOK-401) — config `verify_jwt` à faire |
| Les deux | Redondance | Double maintenance, risque de divergence |

**Recommandation** : Une seule source de vérité. Express si l’API est l’élément central du backend ; Edge si on privilégie Supabase. Le Dashboard Stripe ne permet qu’une URL par event — choisir une et désactiver l’autre.

### C4. Scheduler

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| n8n Cron | Déjà en place, pas de nouveau service | Dépendance externe, latence selon fréquence |
| pg_cron (Supabase) | Natif DB | Activation/configuration Supabase à valider |
| Autre (BullMQ, etc.) | Plus flexible | Nouvelle stack, hébergement |

**Recommandation** : n8n Cron. Déjà documenté (`WORKFLOW-N8N-EDL-AUTO-EMAIL`), pas de nouveau composant. Fréquence à définir (ex. 2×/jour pour hold/release).

### C5. Modèle de sécurité

| Élément | Recommandation |
|---------|----------------|
| Endpoints cron | Header `X-Cron-Secret` comparé à une variable d’env ; 401 si absent ou incorrect |
| Endpoints admin | Header `X-Admin-Secret` ou JWT avec rôle admin ; 401 si invalide |
| Endpoints deposit (create-setup-intent, attach) | JWT Supabase ; création d’un client avec le token pour valider l’utilisateur |

---

## D) Découpage en phases

### Phase 1 : DB + UI véhicule pour montant caution

**Objectif** : Permettre au propriétaire de renseigner et sauvegarder le montant de caution par véhicule.

**Fichiers concernés** :
- `supabase/migrations/` (nouvelle migration)
- `src/features/vehicle-management/types/vehicle-form.types.ts`
- `src/features/vehicle-management/hooks/useManageVehicle.ts`
- `src/pages/owner/ManageVehicle.tsx`
- `src/services/supabaseVehiclesService.ts` (si besoin)
- `src/integrations/supabase/types.ts` (si régénération)

**Prérequis** : Accès Supabase pour appliquer la migration.

**Risques** : Colonne non présente sur un projet déjà en prod — migration à tester en staging.

**Critères de validation** :
- [ ] Migration exécutée sans erreur
- [ ] Colonne `vehicles.deposit_amount` visible en DB (ex. Supabase Table Editor)
- [ ] Input visible dans l’onglet pricing de ManageVehicle
- [ ] Valeur sauvegardée correctement après Save
- [ ] Valeur rechargée correctement à l’ouverture de ManageVehicle

**Hors scope** : Snapshot, caution, hold, release.

---

### Phase 2 : Snapshot caution dans booking + affichage read-only côté renter

**Objectif** : Copier le montant caution du véhicule vers le booking au moment pertinent, et l’afficher en lecture seule pour le locataire.

**Fichiers concernés** :
- `supabase/migrations/` (colonnes booking si pas encore créées)
- `src/services/supabase/bookings.ts` (méthode `updateBookingStatus` — snapshot au passage à `pending_payment`)
- `src/components/OwnerBookingCard.tsx` L.260 — appelle `updateBookingStatus(booking.id, 'pending_payment')` à l'acceptation
- `src/pages/renter/RenterBookings.tsx` (enrichissement des données)
- `src/components/RenterBookingCard.tsx` (affichage)

**Prérequis** : Phase 1 terminée et validée.

**Risques** : Choix du moment du snapshot (voir C2) ; anciens bookings sans snapshot.

**Critères de validation** :
- [ ] Colonnes `deposit_amount_snapshot` et `deposit_status` créées (ou confirmées) en DB
- [ ] Snapshot renseigné à l’acceptation (ou au moment retenu)
- [ ] Montant caution affiché en read-only sur les cartes renter
- [ ] Aucun CTA "Activer la caution" pour l’instant (ou désactivé)

**Hors scope** : SetupIntent, hold, modale caution.

---

### Phase 3 : Modale info + SetupIntent (enregistrer carte) uniquement

**Objectif** : Bouton "Activer la caution" ouvrant une modale explicative et permettant d’enregistrer la carte via SetupIntent, sans créer de hold.

**Fichiers concernés** :
- `server/index.ts` (nouveaux endpoints deposit)
- `src/lib/depositCaution.ts` (ou équivalent)
- `src/components/DepositFlowModal.tsx`
- `src/pages/renter/RenterBookings.tsx`
- `src/components/RenterBookingCard.tsx`
- `src/i18n/locales/*/common.json` (wording)
- `supabase/migrations/` si `profiles.stripe_customer_id` et colonnes booking nécessaires

**Prérequis** : Phases 1 et 2 validées ; JWT côté Express opérationnel (à mettre en place dans cette phase si besoin).

**Risques** : Auth Express non testée ; Stripe en mode test obligatoire.

**Critères de validation** :
- [ ] Bouton "Activer la caution" visible quand `deposit_status === 'pending'` et `deposit_amount_snapshot > 0`
- [ ] Clic ouvre DepositFlowModal (pas PaymentFlowModal)
- [ ] Modale affiche le texte explicatif validé (voir docs)
- [ ] Enregistrement carte réussi → `deposit_status = 'card_registered'`, `stripe_payment_method_id` renseigné
- [ ] Pas de hold Stripe dans cette phase

**Hors scope** : Hold J-2, release J+2, webhooks deposit.

---

### Phase 4 : Scheduler + endpoint cron (dry-run) + sélection bookings

**Objectif** : Endpoint cron protégé qui sélectionne les bookings éligibles au hold/release, sans appeler Stripe.

**Fichiers concernés** :
- `server/index.ts` (routes `/api/cron/deposit-hold`, `/api/cron/deposit-release`)
- n8n (workflows Cron)
- `.env.local.example` (CRON_SECRET)

**Prérequis** : Phase 3 validée.

**Risques** : n8n doit pouvoir joindre l’API (URL publique, CORS si nécessaire).

**Critères de validation** :
- [ ] `POST /api/cron/deposit-hold` avec `X-Cron-Secret` valide retourne la liste des bookings éligibles (sans appel Stripe)
- [ ] `POST /api/cron/deposit-release` idem
- [ ] Sans secret ou avec secret invalide → 401
- [ ] Workflow n8n Cron configuré et testé (dry-run)

**Hors scope** : Création de PaymentIntent, cancel, capture.

---

### Phase 5 : Hold Stripe J-2 (sandbox) + stockage capture_before

**Objectif** : Endpoint hold qui crée un PaymentIntent deposit (manual capture, off_session, extended auth si dispo) et enregistre `capture_before` et `extended_authorization.status`.

**Fichiers concernés** :
- `server/index.ts` (logique hold dans l’endpoint cron)
- `server/index.ts` (webhooks `payment_intent.succeeded`, etc.) pour mise à jour booking

**Prérequis** : Phases 1 à 4 validées ; Stripe en mode test.

**Risques** : `requires_action`, `payment_failed` ; carte de test à utiliser.

**Critères de validation** :
- [ ] Pour un booking éligible à J-2, le PaymentIntent est créé et confirmé
- [ ] `deposit_status = 'held'` (ou `requires_action` / `failed` selon cas)
- [ ] `deposit_capture_before` et `deposit_extended_auth_status` stockés quand disponibles
- [ ] Test avec carte 4242… → held
- [ ] Test avec carte refusée → failed
- [ ] Test SCA si possible → requires_action

**Hors scope** : Release J+2, capture partielle admin, fallback capture_before.

---

### Phase 6 : Release J+2 + admin capture + webhooks + monitoring minimal

**Objectif** : Libération automatique, capture partielle admin, webhooks deposit, et surveillance basique.

**Fichiers concernés** :
- `server/index.ts` (release, admin capture, webhooks deposit)
- n8n (workflow release)
- Dashboard / logs (optionnel)

**Prérequis** : Phase 5 validée.

**Risques** : Gestion de `capture_before` < end+48h (fallback à définir).

**Critères de validation** :
- [ ] Release à J+2 : cancel du PaymentIntent, `deposit_status = 'released'`
- [ ] Endpoint admin capture : capture partielle, mise à jour statut et montant
- [ ] Webhooks : `payment_intent.succeeded`, `payment_failed`, `canceled` traités correctement
- [ ] Monitoring : logs ou tableau de bord minimal pour les cas nécessitant une action manuelle

**Hors scope** : Refonte UX, notifications email/SMS.

---

## E) Questions bloquantes (si preuve manquante)

| # | Question | Pourquoi bloquant | Comment vérifier |
|---|----------|-------------------|------------------|
| 1 | Les colonnes `deposit_status` et `deposit_amount` existent-elles réellement en DB ? | L’UI les utilise ; si absentes, les requêtes peuvent échouer | Requête SQL `SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name IN ('deposit_status','deposit_amount','deposit_amount_snapshot')` |
| 2 | Quelle URL webhook est configurée dans le Dashboard Stripe (Express ou Edge) ? | Une seule reçoit les events ; l’autre ne sera pas déclenchée | Dashboard Stripe → Developers → Webhooks |
| 3 | Le projet Stripe est-il en tarification IC+ ou blended ? | Extended Authorization nécessite IC+ ou accord Stripe | Dashboard Stripe → Settings → Billing ou contact support |
| 4 | n8n peut-il appeler l’URL de l’API Express en production ? | Les crons deposit en dépendent | Test manuel depuis n8n vers l’URL prévue (ex. `https://.../api/cron/deposit-hold`) |

---

## F) Synthèse

- **Existant** : Paiement location via Stripe Checkout (Edge Function) + webhooks Express/Edge mettant à jour `bookings`. Aucune auth JWT sur Express, pas de scheduler interne, table `payments` non utilisée. `deposit_status` / `deposit_amount` utilisés en UI mais probablement absents en DB.
- **Décisions** : vehicles.deposit_amount + snapshot dans bookings ; snapshot à l’acceptation ; une seule source de vérité pour les webhooks ; n8n Cron ; protection par `X-Cron-Secret` et `X-Admin-Secret` / JWT.
- **Phases** : 1) DB + UI véhicule ; 2) Snapshot + affichage read-only ; 3) Modale + SetupIntent ; 4) Cron dry-run ; 5) Hold J-2 ; 6) Release + admin capture + webhooks.

Chaque phase est validable indépendamment avant de passer à la suivante.
