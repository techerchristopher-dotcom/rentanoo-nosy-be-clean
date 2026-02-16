# DIAG Phase 2.1 — Migration deposit dans bookings (DIAG ONLY)

**Date** : 2026-02-14  
**Objectif** : Préparer une migration Supabase pour ajouter `deposit_amount_snapshot` et `deposit_status` dans `public.bookings`.  
**Aucun code, aucun patch** : preuves et décisions uniquement.

---

## 1) Contraintes existantes sur `bookings`

### 1.1 Liste des contraintes CHECK (noms exacts)

| Constrainte | Table | Fichier / Ligne | Description |
|-------------|-------|-----------------|-------------|
| `bookings_check` | bookings | SCRIPT-RECREATE-SCHEMA-RENTANOO.sql L.220 | `end_date > start_date` |
| `bookings_status_check` | bookings | SCRIPT-RECREATE-SCHEMA-RENTANOO.sql L.221 ; migration 20260203143617 | `status` IN (pending, pending_payment, confirmed, active, completed, cancelled, rejected, declined, terminated) |
| `bookings_total_price_check` | bookings | SCRIPT-RECREATE-SCHEMA-RENTANOO.sql L.222 | `total_price >= 0` |
| `check_start_time_format` | bookings | SCRIPT-RECREATE-SCHEMA-RENTANOO.sql L.223 | Regex `^([01]?[0-9]|2[0-3]):[0-5][0-9]$` |
| `check_end_time_format` | bookings | SCRIPT-RECREATE-SCHEMA-RENTANOO.sql L.224 | Regex `^([01]?[0-9]|2[0-3]):[0-5][0-5][0-9]$` |

**Preuve** : `supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql` L.6-7 : `DROP CONSTRAINT IF EXISTS bookings_status_check` — ce nom est utilisé et peut être recréé.

### 1.2 Impact d’une nouvelle contrainte CHECK sur `deposit_status`

- `deposit_status` est une **nouvelle colonne**, non utilisée par les contraintes existantes.
- Une contrainte `CHECK (deposit_status IN ('pending', 'not_required'))` ne modifie pas `bookings_status_check` ni les autres CHECK.
- **Compatibilité avec les rows existants** : l’ajout d’une colonne nullable sans DEFAULT donne `NULL` aux lignes existantes. En PostgreSQL, un CHECK est satisfait si l’expression n’est **pas FALSE** ; `NULL IN (...)` → `NULL` → accepté. Pour plus de clarté et d’évolutivité, préférer :  
  `CHECK (deposit_status IS NULL OR deposit_status IN ('pending', 'not_required'))`.

**Conclusion** : ajouter une CHECK sur `deposit_status` est sûr et n’impacte pas les contraintes actuelles.

---

## 2) Recommandation DB minimale pour Phase 2

### 2.1 Types et nullabilité

| Colonne | Type | Nullable | Justification |
|---------|------|----------|---------------|
| `deposit_amount_snapshot` | `NUMERIC(10, 2)` | OUI | Cohérent avec `total_price`, `base_price`, `amount_total_paid`, `vehicles.deposit_amount`. NULL pour les bookings sans snapshot. |
| `deposit_status` | `TEXT` | OUI | Aligné sur les autres colonnes TEXT (status, etc.). NULL pour les anciens bookings. |

### 2.2 Enum minimal `deposit_status` (Phase 2)

| Valeur | Usage |
|--------|--------|
| `pending` | Caution prévue (montant > 0), en attente d’activation Stripe |
| `not_required` | Pas de caution (montant = 0) |

**Rien d’autre** pour Phase 2. Les états Stripe (held, released, etc.) seront ajoutés plus tard.

### 2.3 DEFAULT vs NULL par défaut

**Recommandation** : **pas de DEFAULT**. Les deux colonnes restent **NULL** par défaut.

| Colonne | Choix | Raison |
|--------|-------|--------|
| `deposit_amount_snapshot` | NULL | Bookings existants : pas de snapshot. Nouveaux bookings : snapshot uniquement à l’acceptation (pending → pending_payment). |
| `deposit_status` | NULL | Idem. Mettre un DEFAULT impliquerait un choix arbitraire ; NULL signifie clairement "pas encore snapshot". |

**Impact bookings existants** : `ADD COLUMN ... ` sans DEFAULT → toutes les lignes existantes reçoivent NULL. Comportement souhaité.

---

## 3) Stratégie de migration

### 3.1 Pattern du repo

| Migration | Pattern | Preuve |
|-----------|---------|--------|
| `002_add_service_fee_columns.sql` | `DO $$ BEGIN ... IF NOT EXISTS (information_schema) THEN ALTER TABLE ... ADD COLUMN ... RAISE NOTICE ... END IF; END $$;` puis `COMMENT ON COLUMN ...` | L.17-135 |
| `20260214150000_add_vehicles_deposit_amount.sql` | Même pattern (IF NOT EXISTS + ADD COLUMN + COMMENT) | L.6-20 |
| `20260203143617_add_terminated_status_to_bookings.sql` | `DROP CONSTRAINT` + `ADD CONSTRAINT` (sans DO $$) | L.6-25 |

**Pattern retenu** : `DO $$` + `IF NOT EXISTS` (information_schema) + `ADD COLUMN` + `RAISE NOTICE` + `COMMENT ON COLUMN`.

### 3.2 Une ou deux migrations ?

**Recommandation** : **1 migration**.

- Les deux colonnes correspondent à une seule feature (Phase 2 snapshot).
- Elles sont créées ensemble et utilisées ensemble à l’acceptation owner.
- Une seule migration permet un rollback atomique et un historique clair.

---

## 4) SQL de vérification post-migration

### 4.1 Vérification des colonnes (`information_schema`)

```sql
SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
  AND column_name IN ('deposit_amount_snapshot', 'deposit_status')
ORDER BY column_name;
```

**Résultat attendu** : 2 lignes ; `is_nullable = 'YES'`, `column_default = NULL` pour les deux.

### 4.2 Échantillon de bookings

```sql
SELECT id, status, deposit_amount_snapshot, deposit_status, created_at
FROM public.bookings
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu** : `deposit_amount_snapshot` et `deposit_status` à NULL pour les anciens bookings.

---

## 5) Checklist de validation Phase 2.1

- [ ] Migration créée (nom type `YYYYMMDDHHMMSS_add_bookings_deposit_snapshot.sql`).
- [ ] `deposit_amount_snapshot NUMERIC(10, 2)` ajoutée, nullable, sans DEFAULT.
- [ ] `deposit_status TEXT` ajoutée, nullable, sans DEFAULT.
- [ ] CHECK sur `deposit_status` : `(deposit_status IS NULL OR deposit_status IN ('pending', 'not_required'))`.
- [ ] Nom de contrainte explicite (ex. `bookings_deposit_status_check`).
- [ ] Pattern `DO $$` + `IF NOT EXISTS` + `COMMENT ON COLUMN`.
- [ ] Requête `information_schema` exécutée après migration → 2 colonnes visibles.
- [ ] Requête `SELECT` sur 5 bookings → valeurs NULL pour les anciens enregistrements.

---

FIN.
