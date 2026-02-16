# Phase 1.1 — Diagnostic de preuve : migration deposit_amount appliquée

**Date** : 14 février 2026  
**Mode** : Preuves et état des lieux uniquement — aucune exécution

---

## 1) SUR QUEL PROJET la migration a été exécutée

### Contenu de `supabase/config.toml`

```toml
project_id = "tbsgzykqcksmqxpimwry"

[functions.stripe-webhook]
verify_jwt = false
```

**Valeurs utilisées** :
- `project_id` : `tbsgzykqcksmqxpimwry`
- Pas de clés `api` ou `db` dans le fichier lu.

---

### Projet = staging ou production ?

| Source | Contenu |
|--------|---------|
| `.cursorrules` | Projet principal : `zykwfjxurwmputxwlkxs` (Rentanoo) ; projet alternatif : `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be) |
| `SWITCH-SUPABASE-PROJECT.md` | `zykwfjxurwmputxwlkxs` = Rentanoo (principal) ; `tbsgzykqcksmqxpimwry` = rentanoo-nosy-be (alternatif) |
| `STRIPE-GO-LIVE-CHECKLIST.md` | Référence à `zykwfjxurwmputxwlkxs` pour production (create-checkout-session, webhook) |

**Conclusion** : Non prouvable sans doc explicite. Les docs ne définissent pas clairement quel projet est “staging” et lequel est “production”. Le projet `tbsgzykqcksmqxpimwry` est désigné comme “alternatif” ; `zykwfjxurwmputxwlkxs` comme “principal”. Donc la migration a été exécutée sur **rentanoo-nosy-be** (alternatif), pas sur le projet principal Rentanoo.

---

## 2) Preuve QUE la migration a été appliquée

### a) Existence de la colonne `vehicles.deposit_amount`

```sql
SELECT column_name, data_type, numeric_precision, numeric_scale, 
       column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicles' 
  AND column_name = 'deposit_amount';
```

**Résultat attendu si migré** : 1 ligne avec :
- `column_name` = `deposit_amount`
- `data_type` = `numeric`
- `numeric_precision` = 10
- `numeric_scale` = 2
- `column_default` = `1000` (ou équivalent)
- `is_nullable` = `NO`

---

### b) Default, nullability, type (NUMERIC(10,2))

Même requête que ci-dessus ; les colonnes `data_type`, `numeric_precision`, `numeric_scale`, `column_default`, `is_nullable` fournissent la preuve.

---

### c) Historique des migrations

#### Option A : table `supabase_migrations.schema_migrations`

Supabase stocke l’historique via un schéma dédié. À tester :

```sql
SELECT * FROM supabase_migrations.schema_migrations
WHERE version LIKE '20260214150000%' OR version = '20260214150000'
ORDER BY version;
```

#### Option B : table `public.schema_migrations` (si utilisée)

```sql
SELECT * FROM public.schema_migrations
WHERE version::text LIKE '20260214150000%' OR version = '20260214150000';
```

#### Option C : recherche via `information_schema`

```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('schema_migrations', 'supabase_migrations')
   OR (table_schema = 'supabase_migrations' AND table_name LIKE '%migration%');
```

Puis inspection de la table trouvée.

#### Option D : schéma `supabase_migrations` et tables

```sql
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'supabase_migrations'
   OR tablename LIKE '%migration%';
```

#### Option E : table `golang-migrate` (standard)

Le CLI Supabase peut utiliser `golang-migrate` ; la table standard est souvent `schema_migrations` avec une colonne `version` :

```sql
SELECT * FROM schema_migrations
WHERE version >= '20260214150000' AND version < '20260214160000';
```

**Note** : Si la table est dans un schéma autre que `public`, tester : `supabase_migrations.schema_migrations`, `_migrations.schema_migrations`, ou chercher via `information_schema.tables` où `table_name = 'schema_migrations'`.

---

## 3) Ce qui a été réparé / aligné

### Migrations marquées "reverted"

| Commande exécutée | Migrations concernées |
|-------------------|------------------------|
| `supabase migration repair --status reverted 20251215193025 20251217094957 20260203113723 20260203191304` | `20251215193025`, `20251217094957`, `20260203113723`, `20260203191304` |

**Effet** : Ces versions distantes sans fichier local correspondant sont considérées comme annulées. Leur SQL a peut‑être été appliqué en base ; l’historique ne les comptabilise plus comme appliquées.

---

### Migrations marquées "applied"

| Commande exécutée | Migrations concernées |
|-------------------|------------------------|
| `supabase migration repair --status applied 001 002 20260203143617 20260206143000 20260211000000` | `001`, `002`, `20260203143617`, `20260206143000`, `20260211000000` |

**Effet** : Ces versions sont marquées comme déjà appliquées, sans exécuter leur SQL. `db push` ne les réapplique pas.

---

### Risque potentiel

| Risque | Détail |
|--------|--------|
| Divergence local / remote | Les versions reverted peuvent correspondre à du schéma déjà en base. L’historique local ne les reflète plus ; `supabase db pull` pourrait générer des migrations qui recréent des objets existants. |
| Réappliquées par erreur | Les versions marquées "applied" sans exécution pourraient ne pas correspondre exactement au schéma distant, selon la façon dont le schéma a été appliqué (Dashboard, SQL manuel, etc.). |
| Historique incohérent | L’historique des migrations ne reflète plus fidèlement les migrations réellement exécutées. |

---

## 4) Procédure SAFE pour appliquer une migration unique (sans repair auto)

### Option A : SQL Editor (recommandé pour une seule migration)

1. Ouvrir **Supabase Dashboard** → **SQL Editor**.
2. Ouvrir le fichier `supabase/migrations/20260214150000_add_vehicles_deposit_amount.sql`.
3. Copier tout le contenu (sans les commentaires de début si vous préférez).
4. Coller dans une nouvelle requête du SQL Editor.
5. Sélectionner le **bon projet** (vérifier l’URL du Dashboard).
6. Cliquer sur **Run**.
7. Vérifier qu’il n’y a pas d’erreur.

**Avantage** : Pas de modification de l’historique ; on exécute uniquement le SQL.

**Inconvénient** : La migration n’est pas enregistrée dans l’historique Supabase (si applicable).

---

### Option B : CLI, sans repair

1. Vérifier le projet lié : `supabase config` ou `cat supabase/config.toml`.
2. Lister l’état : `supabase migration list`.
3. Si des migrations en attente apparaissent :
   - Soit `supabase db push` (attention aux migrations non appliquées qui seront exécutées).
   - Soit ne pas utiliser la CLI et passer par le SQL Editor (Option A).
4. Ne pas exécuter `supabase migration repair` sans comprendre l’impact sur l’historique.

---

### Checklist de validation post-migration

- [ ] **Projet** : Vérifier l’URL du Dashboard (ex. `.../project/tbsgzykqcksmqxpimwry` ou `.../project/zykwfjxurwmputxwlkxs`).
- [ ] **Colonne** : Exécuter la requête `information_schema.columns` sur `vehicles.deposit_amount` et obtenir 1 ligne.
- [ ] **Type** : `data_type = 'numeric'`, `numeric_precision = 10`, `numeric_scale = 2`.
- [ ] **Default** : `column_default` contient `1000`.
- [ ] **Nullable** : `is_nullable = 'NO'`.
- [ ] **Données** : `SELECT id, deposit_amount FROM vehicles LIMIT 5` — valeurs cohérentes (ex. 1000 pour les véhicules existants).
- [ ] **Commentaire** : `\d+ public.vehicles` (psql) ou requête `pg_catalog` pour confirmer le commentaire sur `deposit_amount`.
