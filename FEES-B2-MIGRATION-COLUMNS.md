# FEES-B2 — Migration: Ajout des colonnes manquantes dans bookings

**Date**: 2025-01-27  
**Objectif**: Ajouter les colonnes manquantes pour que les webhooks Stripe puissent mettre à jour les bookings

---

## ✅ VÉRIFICATION DE LA CONVENTION DE TYPES

### Preuve de la convention existante

**Fichier**: `ETAPE-3-PLAN-RECREATE-SANS-DONNEES.md` (lignes 215-220)

```sql
total_price NUMERIC(10, 2) NOT NULL,
base_price NUMERIC(10, 2),
options_total NUMERIC(10, 2),
service_fee NUMERIC(10, 2),
subtotal NUMERIC(10, 2),
price_per_day NUMERIC(10, 2),
```

**Conclusion**: ✅ La convention utilisée est **`NUMERIC(10, 2)`** pour tous les montants.

**Fichier**: `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 213-216)

```sql
base_price numeric NOT NULL,
options_total numeric NOT NULL,
service_fee numeric NOT NULL,
subtotal numeric NOT NULL,
```

**Note**: Le script de recréation utilise `numeric` sans précision, mais le plan officiel utilise `NUMERIC(10, 2)`. On suit le plan officiel.

---

## ✅ MIGRATION CRÉÉE

### Fichier de migration

**Fichier**: `supabase/migrations/002_add_service_fee_columns.sql`

### Colonnes ajoutées (9 colonnes)

| Colonne | Type | Nullable | Default | Justification |
|---------|------|----------|---------|---------------|
| `paid_at` | `TIMESTAMPTZ` | ✅ Oui | - | Timestamp du paiement |
| `stripe_payment_intent_id` | `TEXT` | ✅ Oui | - | ID PaymentIntent Stripe |
| `stripe_checkout_session_id` | `TEXT` | ✅ Oui | - | ID Checkout Session Stripe |
| `amount_total_paid` | `NUMERIC(10, 2)` | ✅ Oui | - | Montant total payé (cohérent avec `total_price`) |
| `service_fee_renter` | `NUMERIC(10, 2)` | ✅ Oui | - | Frais renter (cohérent avec `service_fee`) |
| `service_fee_owner` | `NUMERIC(10, 2)` | ✅ Oui | - | Frais owner (cohérent avec `service_fee`) |
| `owner_payout_amount` | `NUMERIC(10, 2)` | ✅ Oui | - | Revenu owner (cohérent avec les montants) |
| `platform_total_fee` | `NUMERIC(10, 2)` | ✅ Oui | - | Commission totale (cohérent avec les montants) |
| `currency` | `TEXT` | ✅ Oui | `'EUR'` | Devise (default EUR car usage actuel) |

### Caractéristiques de la migration

1. ✅ **Idempotente**: Utilise `IF NOT EXISTS` pour chaque colonne
2. ✅ **Cohérente**: Suit la convention `NUMERIC(10, 2)` pour les montants
3. ✅ **Nullable**: Toutes les colonnes sont nullable (sauf `currency` qui a un default)
4. ✅ **Documentée**: Commentaires SQL pour chaque colonne
5. ✅ **Minimale**: Ajoute uniquement les colonnes nécessaires (pas de colonnes bonus)

### Index

**Aucun index ajouté**:
- `stripe_checkout_session_id`: Pas d'index unique car on peut avoir plusieurs tentatives de paiement
- `stripe_payment_intent_id`: Pas d'index unique car peut être null
- Les autres colonnes n'ont pas besoin d'index pour l'usage actuel

---

## 📋 SNIPPET SQL FINAL

```sql
-- Migration: Ajouter les colonnes de frais de service et Stripe à la table bookings
-- Fichier: supabase/migrations/002_add_service_fee_columns.sql

DO $$ 
BEGIN
  -- paid_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;

  -- stripe_payment_intent_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;

  -- stripe_checkout_session_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN stripe_checkout_session_id TEXT;
  END IF;

  -- amount_total_paid
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'amount_total_paid'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN amount_total_paid NUMERIC(10, 2);
  END IF;

  -- service_fee_renter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'service_fee_renter'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN service_fee_renter NUMERIC(10, 2);
  END IF;

  -- service_fee_owner
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'service_fee_owner'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN service_fee_owner NUMERIC(10, 2);
  END IF;

  -- owner_payout_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'owner_payout_amount'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN owner_payout_amount NUMERIC(10, 2);
  END IF;

  -- platform_total_fee
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'platform_total_fee'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN platform_total_fee NUMERIC(10, 2);
  END IF;

  -- currency
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN currency TEXT DEFAULT 'EUR';
  END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN public.bookings.paid_at IS 'Timestamp du paiement (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.stripe_payment_intent_id IS 'ID du PaymentIntent Stripe (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.stripe_checkout_session_id IS 'ID de la session Checkout Stripe (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.amount_total_paid IS 'Montant total payé par le locataire (subtotal + service_fee_renter)';
COMMENT ON COLUMN public.bookings.service_fee_renter IS 'Frais de service côté locataire (15% du subtotal)';
COMMENT ON COLUMN public.bookings.service_fee_owner IS 'Frais de service côté propriétaire (15% du subtotal, retenu du payout)';
COMMENT ON COLUMN public.bookings.owner_payout_amount IS 'Revenu du propriétaire après commission (subtotal - service_fee_owner)';
COMMENT ON COLUMN public.bookings.platform_total_fee IS 'Commission totale de la plateforme (service_fee_renter + service_fee_owner)';
COMMENT ON COLUMN public.bookings.currency IS 'Devise du paiement (par défaut EUR)';
```

---

## ⚠️ ACTION REQUISE: EXÉCUTER LA MIGRATION

### Méthode 1: Via Supabase CLI (recommandé)

```bash
# Depuis le répertoire du projet
supabase db push
```

Cette commande appliquera automatiquement toutes les migrations dans `supabase/migrations/` qui n'ont pas encore été exécutées.

### Méthode 2: Via Supabase Dashboard

1. Aller dans **Supabase Dashboard** → **SQL Editor**
2. Ouvrir le fichier `supabase/migrations/002_add_service_fee_columns.sql`
3. Copier tout le contenu
4. Coller dans l'éditeur SQL
5. Cliquer sur **Run**

### Méthode 3: Via MCP Supabase

Si vous utilisez MCP Supabase, exécutez le contenu du fichier de migration.

---

## ✅ VÉRIFICATION POST-MIGRATION

### Vérifier que les colonnes existent

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
  AND column_name IN (
    'paid_at',
    'stripe_payment_intent_id',
    'stripe_checkout_session_id',
    'amount_total_paid',
    'service_fee_renter',
    'service_fee_owner',
    'owner_payout_amount',
    'platform_total_fee',
    'currency'
  )
ORDER BY column_name;
```

**Résultat attendu**: 9 lignes avec les colonnes créées.

### Vérifier que les webhooks peuvent maintenant écrire

Après la migration, les webhooks Stripe pourront mettre à jour toutes les colonnes nécessaires sans erreur.

---

## 📊 RÉSUMÉ

### Fichier créé

- ✅ `supabase/migrations/002_add_service_fee_columns.sql`

### Colonnes ajoutées

- ✅ 9 colonnes ajoutées (exactement celles nécessaires)
- ✅ Types cohérents avec le schéma existant (`NUMERIC(10, 2)` pour les montants)
- ✅ Migration idempotente (safe à réexécuter)

### Prochaines étapes

1. ⚠️ **EXÉCUTER LA MIGRATION** dans Supabase (voir section "Action requise")
2. Vérifier que les colonnes existent (voir section "Vérification post-migration")
3. Les webhooks Stripe pourront maintenant fonctionner correctement

---

**FIN DE FEES-B2**

