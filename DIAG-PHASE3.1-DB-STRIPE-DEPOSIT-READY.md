# DIAG ONLY — PHASE 3.1 (DB Stripe-ready pour caution) — AUCUNE IMPLEMENTATION

**Date** : 2026-02-14  
**Contexte** : React + Supabase + Node/Express + Stripe Checkout. Phase 1 OK (vehicles.deposit_amount). Phase 2 OK (deposit_amount_snapshot, deposit_status). OPTION A (paiement location séparé puis bouton "Activer/Payer ma caution").  
**Mode** : Diagnostic uniquement — aucun fichier modifié.

---

## Résumé

| Élément | État |
|---------|------|
| Colonnes deposit Phase 2 dans migrations | **Non trouvées** dans le repo — Phase 2 appliquée manuellement ou via autre canal |
| Colonnes Stripe deposit existantes | **Aucune** — `stripe_payment_intent_id` / `stripe_checkout_session_id` sont pour la **location**, pas la caution |
| Colonnes à ajouter Phase 3.1 | 7 colonnes minimales + 1 facultative |
| CHECK deposit_status (V3) | À mettre à jour : ajouter les nouveaux statuts tout en restant compatible Phase 2 |
| types.ts | Ne reflète pas les colonnes service_fee / deposit — **non vérifiable** comme source de vérité DB |

---

## 1) État exact de la table `public.bookings`

### 1.1 Colonnes liées à deposit/caution

| Source | Colonne | Présence | Preuve |
|--------|---------|----------|--------|
| **supabase/migrations/** | `deposit_amount_snapshot` | ❌ Aucune migration | `grep -r "deposit_amount_snapshot\|deposit_status" supabase/migrations/` → 0 résultat |
| **supabase/migrations/** | `deposit_status` | ❌ Aucune migration | Idem |
| **SCRIPT-RECREATE-SCHEMA-RENTANOO.sql** | `deposit_amount_snapshot` | ❌ Absent | L.198-226 : CREATE TABLE bookings sans ces colonnes |
| **SCRIPT-RECREATE-SCHEMA-RENTANOO.sql** | `deposit_status` | ❌ Absent | Idem |
| **src/integrations/supabase/types.ts** | `deposit_amount_snapshot` | ❌ Absent | L.18-39 : `bookings.Row` ne les contient pas |
| **src/integrations/supabase/types.ts** | `deposit_status` | ❌ Absent | Idem |

**Conclusion** : Dans le repo, aucune preuve de colonnes `deposit_amount_snapshot` ni `deposit_status`. Si Phase 2 est "OK" en prod, elles ont été ajoutées manuellement ou via une migration hors repo.

### 1.2 Colonnes Stripe existantes (pour la **location**, pas la caution)

| Colonne | Fichier | Ligne | Usage |
|---------|---------|-------|-------|
| `stripe_payment_intent_id` | `supabase/migrations/002_add_service_fee_columns.sql` | L.31-40 | PaymentIntent du **paiement location** |
| `stripe_checkout_session_id` | `supabase/migrations/002_add_service_fee_columns.sql` | L.43-52 | Session Checkout du **paiement location** |

**Preuve** : `002_add_service_fee_columns.sql` L.136-138 :

```sql
COMMENT ON COLUMN public.bookings.stripe_payment_intent_id IS 'ID du PaymentIntent Stripe (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.stripe_checkout_session_id IS 'ID de la session Checkout Stripe (rempli par le webhook Stripe)';
```

### 1.3 Colonnes Stripe deposit (Phase 3) — existantes ?

| Colonne | Présence dans repo |
|---------|--------------------|
| `deposit_payment_intent_id` | ❌ Aucune migration |
| `stripe_payment_method_id` (contexte deposit) | ❌ Pas de colonne dédiée deposit — `payments` a `stripe_payment_id` mais pas `bookings` |
| `deposit_hold_created_at` | ❌ |
| `deposit_capture_before` | ❌ |
| `deposit_capture_amount` | ❌ |
| `deposit_reason` | ❌ |

**Conclusion** : **Colonnes manquantes** = toutes les colonnes Stripe deposit (Phase 3).  
+ `deposit_amount_snapshot` et `deposit_status` si Phase 2 n’a pas été migrée dans le repo.

---

## 2) Liste MINIMALE de colonnes à ajouter (Phase 3.1, OPTION A)

| Colonne | Type SQL | Nullable | Default | Justification | Quand écrite (phase future) |
|---------|----------|----------|---------|---------------|-----------------------------|
| `deposit_amount_snapshot` | `NUMERIC(10, 2)` | OUI | NULL | Snapshot du montant caution à la réservation | Phase 2 (acceptation) — **si pas encore en DB** |
| `deposit_status` | `TEXT` | OUI | NULL | État de l’empreinte (pending, held, released, etc.) | Phase 2 + Phase 3+ |
| `deposit_payment_intent_id` | `TEXT` | OUI | NULL | ID du PaymentIntent **caution** (pi_xxx), distinct du PI location | Phase 3 : création du hold |
| `stripe_payment_method_id` | `TEXT` | OUI | NULL | ID PaymentMethod (pm_xxx) pour le hold off_session (caution uniquement) | Phase 3 : après SetupIntent + attach |
| `deposit_hold_created_at` | `TIMESTAMPTZ` | OUI | NULL | Date/heure de création du hold | Phase 3 : webhook `payment_intent.succeeded` |
| `deposit_capture_before` | `TIMESTAMPTZ` | OUI | NULL | Date limite de capture Stripe | Phase 3 : création PI `capture_method=manual` |
| `deposit_capture_amount` | `NUMERIC(10, 2)` | OUI | NULL | Montant effectivement capturé en cas de sinistre | Phase 3+ : admin capture |
| `deposit_reason` | `TEXT` | OUI | NULL | (Facultatif) Notes/raison admin en cas de capture | Phase 3+ : admin capture |

**Note** : `stripe_payment_method_id` stocke la carte utilisée pour la caution. Le paiement location passe par Checkout ; la carte location n’est pas persistée sur `bookings`, donc pas de conflit.

---

## 3) CHECK `deposit_status` (V3) forward-compatible

### 3.1 Phase 2 (actuel si migration appliquée)

- Valeurs : `'pending'`, `'not_required'` (et NULL pour legacy)

### 3.2 Phase 3+ (états Stripe)

- `'card_registered'`, `'held'`, `'released'`, `'captured_partial'`, `'captured_full'`, `'failed'`, `'requires_action'`, `'expired'`

### 3.3 CHECK proposé

```sql
CHECK (
  deposit_status IS NULL 
  OR deposit_status IN (
    'pending',
    'not_required',
    'card_registered',
    'held',
    'released',
    'captured_partial',
    'captured_full',
    'failed',
    'requires_action',
    'expired'
  )
)
```

**Contrainte nommée** : `bookings_deposit_status_check`

**Compatibilité** : 
- Rows avec `deposit_status = NULL` → OK  
- Rows avec `deposit_status = 'pending'` ou `'not_required'` (Phase 2) → OK  
- Nouvelles valeurs Phase 3+ → OK

---

## 4) Migration Supabase proposée (1 fichier)

**Fichier** : `supabase/migrations/20260214180000_add_bookings_deposit_stripe_columns.sql`

```sql
-- Migration: Phase 3.1 — Colonnes DB Stripe-ready pour caution
-- Date: 2026-02-14
-- Description: Ajoute les colonnes minimales pour gérer la caution Stripe (OPTION A)
--              sans implémenter Stripe. Compatible Phase 2 (deposit_amount_snapshot, deposit_status).
-- Mode: Idempotent (IF NOT EXISTS)

DO $$ 
BEGIN
  -- deposit_amount_snapshot (Phase 2 — si pas encore appliquée)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_amount_snapshot'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_amount_snapshot NUMERIC(10, 2);
    RAISE NOTICE 'Colonne deposit_amount_snapshot ajoutée';
  END IF;

  -- deposit_status (Phase 2 — si pas encore appliquée)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_status'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_status TEXT;
    RAISE NOTICE 'Colonne deposit_status ajoutée';
  END IF;

  -- deposit_payment_intent_id (Phase 3)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_payment_intent_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_payment_intent_id TEXT;
    RAISE NOTICE 'Colonne deposit_payment_intent_id ajoutée';
  END IF;

  -- stripe_payment_method_id (Phase 3 — carte caution pour hold off_session)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN stripe_payment_method_id TEXT;
    RAISE NOTICE 'Colonne stripe_payment_method_id ajoutée';
  END IF;

  -- deposit_hold_created_at (Phase 3)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_hold_created_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_hold_created_at TIMESTAMPTZ;
    RAISE NOTICE 'Colonne deposit_hold_created_at ajoutée';
  END IF;

  -- deposit_capture_before (Phase 3)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_capture_before'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_capture_before TIMESTAMPTZ;
    RAISE NOTICE 'Colonne deposit_capture_before ajoutée';
  END IF;

  -- deposit_capture_amount (Phase 3)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_capture_amount'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_capture_amount NUMERIC(10, 2);
    RAISE NOTICE 'Colonne deposit_capture_amount ajoutée';
  END IF;

  -- deposit_reason (Phase 3 — facultatif)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'deposit_reason'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deposit_reason TEXT;
    RAISE NOTICE 'Colonne deposit_reason ajoutée';
  END IF;

END $$;

-- CHECK deposit_status (V3) — drop existant si présent, puis recréer
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_deposit_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_deposit_status_check
CHECK (
  deposit_status IS NULL 
  OR deposit_status IN (
    'pending',
    'not_required',
    'card_registered',
    'held',
    'released',
    'captured_partial',
    'captured_full',
    'failed',
    'requires_action',
    'expired'
  )
);

-- Commentaires
COMMENT ON COLUMN public.bookings.deposit_amount_snapshot IS 'Snapshot du montant caution du véhicule au moment de l''acceptation (Phase 2)';
COMMENT ON COLUMN public.bookings.deposit_status IS 'Statut caution: pending, not_required, card_registered, held, released, captured_*, failed, requires_action, expired';
COMMENT ON COLUMN public.bookings.deposit_payment_intent_id IS 'ID PaymentIntent Stripe caution (pi_xxx) — distinct du PaymentIntent location';
COMMENT ON COLUMN public.bookings.stripe_payment_method_id IS 'ID PaymentMethod Stripe (pm_xxx) pour hold caution off_session';
COMMENT ON COLUMN public.bookings.deposit_hold_created_at IS 'Date/heure création du hold (Phase 3)';
COMMENT ON COLUMN public.bookings.deposit_capture_before IS 'Date limite capture Stripe (Phase 3)';
COMMENT ON COLUMN public.bookings.deposit_capture_amount IS 'Montant capturé en cas de sinistre (Phase 3+)';
COMMENT ON COLUMN public.bookings.deposit_reason IS 'Notes/raison admin en cas de capture (Phase 3+)';
```

---

## 5) Checklist de validation manuelle (SQL)

### 5.1 Colonnes (information_schema)

```sql
SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
  AND column_name IN (
    'deposit_amount_snapshot',
    'deposit_status',
    'deposit_payment_intent_id',
    'stripe_payment_method_id',
    'deposit_hold_created_at',
    'deposit_capture_before',
    'deposit_capture_amount',
    'deposit_reason'
  )
ORDER BY column_name;
```

**Attendu** : 8 lignes ; `is_nullable = 'YES'`, `column_default` NULL pour toutes.

### 5.2 Contrainte CHECK

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.bookings'::regclass 
  AND conname = 'bookings_deposit_status_check';
```

**Attendu** : 1 ligne avec la définition complète de la CHECK.

### 5.3 Bookings récents (valeurs NULL)

```sql
SELECT id, status, deposit_amount_snapshot, deposit_status, deposit_payment_intent_id, deposit_hold_created_at, deposit_capture_before
FROM public.bookings
ORDER BY created_at DESC
LIMIT 5;
```

**Attendu** : Colonnes deposit à NULL pour les anciens bookings, pas d’erreur SQL.

---

## 6) Vérifications hors repo

Si une info ne peut pas être prouvée depuis le code :

| Vérification | Commande / Méthode |
|--------------|--------------------|
| Colonnes actuelles en DB | `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' ORDER BY ordinal_position;` |
| CHECK existantes sur bookings | `SELECT conname FROM pg_constraint WHERE conrelid = 'public.bookings'::regclass AND contype = 'c';` |
| Valeurs deposit sur un booking | `SELECT id, deposit_status, deposit_amount_snapshot FROM public.bookings LIMIT 1;` |

---

## 7) Résumé des preuves (paths / grep)

| Élément | Path / Commande | Résultat |
|---------|-----------------|----------|
| Migrations deposit | `grep -r "deposit_amount_snapshot\|deposit_status" supabase/migrations/` | 0 résultat |
| Colonnes Stripe location | `002_add_service_fee_columns.sql` | `stripe_payment_intent_id`, `stripe_checkout_session_id` |
| bookings dans schema recréé | `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` L.198-226 | Pas de colonnes deposit |
| types.ts bookings | `src/integrations/supabase/types.ts` L.18-39 | Pas de deposit_* |
| Pattern migration | `20260214150000_add_vehicles_deposit_amount.sql` | `DO $$` + `IF NOT EXISTS` + `COMMENT ON COLUMN` |

---

FIN (DIAG ONLY — aucun fichier créé ou modifié).
