# 🔍 Diagnostic Étape 3 — Schéma Supabase (Re-diagnostic)

**Date** : 2025-01-27  
**Projet attendu** : `zykwfjxurwmputxwlkxs`

---

## ⚠️ PROBLÈME BLOQUANT DÉTECTÉ

### ❌ Connexion au mauvais projet Supabase

**Vérifications effectuées** :

1. ✅ **`supabase/config.toml`** :
   ```toml
   project_id = "zykwfjxurwmputxwlkxs"
   ```
   ✅ **CORRECT** — Le fichier de configuration pointe bien vers le projet attendu.

2. ❌ **URL du projet Supabase (via MCP)** :
   ```
   https://slkgokhcaflhdfcqlucp.supabase.co
   ```
   ❌ **INCORRECT** — La connexion MCP Supabase est connectée à un autre projet (`slkgokhcaflhdfcqlucp` au lieu de `zykwfjxurwmputxwlkxs`).

3. ⚠️ **Variables d'environnement** :
   - Aucun fichier `.env` trouvé dans le workspace
   - Le code utilise `import.meta.env.VITE_SUPABASE_URL` (variable d'environnement runtime)
   - Impossible de vérifier la valeur sans exécuter l'application

**Conclusion** : Le diagnostic suivant a été effectué sur le **mauvais projet Supabase**. Les données ci-dessous ne correspondent **PAS** au projet Rentanoo attendu.

---

## 📊 Inventaire de la Base de Données (Projet actuellement connecté)

### 🗂️ Tables du schéma `public`

**Tables existantes** (11 tables) :

1. **`salaries`** (5 lignes)
   - Table de gestion des salariés (non liée à Rentanoo)
   - Colonnes : `id`, `email`, `nom`, `prenom`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`, `last_login`
   - RLS : ❌ Désactivé

2. **`conversations`** (32 lignes)
   - ⚠️ **ATTENTION** : Cette table existe mais avec un schéma différent de celui attendu par Rentanoo
   - Colonnes actuelles : `id`, `user_id`, `timestamp`, `question`, `response`, `sources`, `total_sources`, `has_more`, `created_at`, `updated_at`, `is_favorite`, `folder_id`
   - Colonnes attendues (Rentanoo) : `id`, `vehicle_id`, `renter_id`, `owner_id`, `booking_id`, `status`, `created_at`, `updated_at`
   - RLS : ❌ Désactivé

3. **`companies_stats`** (1 ligne)
   - Table de statistiques d'entreprises (non liée à Rentanoo)
   - RLS : ❌ Désactivé

4. **`n8n_company`** (1,613,635 lignes)
   - Table de données d'entreprises (non liée à Rentanoo)
   - RLS : ❌ Désactivé

5. **`upload_jobs`** (7 lignes)
   - Table de gestion des jobs d'upload (non liée à Rentanoo)
   - RLS : ❌ Désactivé

6. **`dim_country`** (9 lignes)
   - Table de dimension pays (non liée à Rentanoo)
   - RLS : ❌ Désactivé

7. **`n8n_company_normalized`** (1,582,327 lignes)
   - Table normalisée d'entreprises (non liée à Rentanoo)
   - RLS : ❌ Désactivé

8. **`position_categories`** (24 lignes)
   - Table de catégories de positions (non liée à Rentanoo)
   - RLS : ❌ Désactivé

9. **`position_normalization_log`** (6,742 lignes)
   - Table de log de normalisation (non liée à Rentanoo)
   - RLS : ❌ Désactivé

10. **`sector_categories`** (52 lignes)
    - Table de catégories de secteurs (non liée à Rentanoo)
    - RLS : ❌ Désactivé

11. **`country_reference`** (229 lignes)
    - Table de référence des pays (non liée à Rentanoo)
    - RLS : ❌ Désactivé

**Tables attendues par le code Rentanoo** (d'après `src/integrations/supabase/types.ts`) :

1. ❌ **`bookings`** — **MANQUANTE**
2. ❌ **`profiles`** — **MANQUANTE**
3. ⚠️ **`conversations`** — **EXISTE MAIS SCHÉMA DIFFÉRENT**
4. ❌ **`messages`** — **MANQUANTE**
5. ❌ **`vehicles`** — **MANQUANTE** (référencée dans `supabaseVehiclesService.ts`)
6. ❌ **`checkin_depart`** — **MANQUANTE** (référencée dans `supabaseCheckinService.ts`)
7. ❌ **`checkin_return`** — **MANQUANTE** (probable, basé sur `checkinReturnService.ts`)
8. ❌ **`vehicle_photos`** — **MANQUANTE** (probable, basé sur les références aux photos)

---

### 🔒 Policies RLS (Row Level Security)

**Résultat** : Aucune policy RLS trouvée dans le schéma `public`.

**Policies attendues** (à définir selon les besoins de sécurité) :
- `profiles` : Les utilisateurs peuvent lire/mettre à jour leur propre profil
- `vehicles` : Les propriétaires peuvent gérer leurs véhicules
- `bookings` : Les utilisateurs peuvent voir leurs propres réservations
- `conversations` : Les participants peuvent voir leurs conversations
- `messages` : Les participants peuvent voir les messages de leurs conversations

---

### ⚙️ Triggers

**Triggers existants** (6 triggers) :

1. `companies_stats_updated_at` → `update_companies_stats_updated_at()`
2. `update_conversations_updated_at` → `update_updated_at_column()`
3. `trigger_update_country_reference_timestamp` → `update_country_reference_updated_at()`
4. `trg_n8n_company_updated_at` → `set_n8n_company_updated_at()`
5. `trigger_update_position_categories_timestamp` → `update_position_categories_updated_at()`
6. `trigger_update_sector_categories_timestamp` → `update_sector_categories_updated_at()`

**Triggers attendus pour Rentanoo** :
- Triggers `updated_at` pour toutes les tables principales (`bookings`, `profiles`, `vehicles`, `conversations`, `messages`, `checkin_depart`, `checkin_return`)
- Trigger pour générer `reference_number` dans `bookings` (si nécessaire)

---

### 🔧 Fonctions Custom

**Fonctions existantes** : ~200+ fonctions (principalement liées aux extensions `vector`, `halfvec`, `sparsevec` et à la normalisation de données d'entreprises).

**Fonctions attendues pour Rentanoo** :
- Fonctions de mise à jour automatique de `updated_at` (ex: `update_updated_at_column()`)
- Fonctions de calcul de prix (si nécessaire)
- Fonctions de validation (si nécessaire)

---

### 📦 Extensions Installées

**Extensions installées** (3) :

1. ✅ `uuid-ossp` (v1.1) — Génération d'UUID
2. ✅ `pg_stat_statements` (v1.11) — Statistiques de requêtes
3. ✅ `pgcrypto` (v1.3) — Fonctions cryptographiques
4. ✅ `vector` (v0.8.0) — Support des vecteurs (non nécessaire pour Rentanoo)
5. ✅ `supabase_vault` (v0.3.1) — Vault Supabase
6. ✅ `pg_graphql` (v1.5.11) — Support GraphQL

**Extensions attendues pour Rentanoo** :
- ✅ `uuid-ossp` — **DÉJÀ INSTALLÉE**
- ✅ `pgcrypto` — **DÉJÀ INSTALLÉE** (pour le hachage si nécessaire)

---

### 🗄️ Storage Buckets

**Buckets existants** (1) :

1. **`companies-imports`**
   - Public : ✅ Oui
   - File size limit : Aucune
   - Allowed MIME types : Tous

**Buckets attendus pour Rentanoo** :
- ❌ **`vehicle-photos`** — **MANQUANT** (pour les photos de véhicules)
- ❌ **`driver-licenses`** — **MANQUANT** (pour les photos de permis de conduire)
- ❌ **`checkin-photos`** — **MANQUANT** (pour les photos d'état des lieux)
- ❌ **`avatars`** — **MANQUANT** (pour les avatars des utilisateurs)

**Policies Storage** :
- Impossible de récupérer les policies (table `storage.policies` n'existe pas ou non accessible)

---

## 📋 Comparaison : Attendu vs Existant

### Tables

| Table | Attendu | Existant | Statut |
|-------|---------|----------|--------|
| `bookings` | ✅ | ❌ | **MANQUANTE** |
| `profiles` | ✅ | ❌ | **MANQUANTE** |
| `conversations` | ✅ | ⚠️ | **EXISTE MAIS SCHÉMA DIFFÉRENT** |
| `messages` | ✅ | ❌ | **MANQUANTE** |
| `vehicles` | ✅ | ❌ | **MANQUANTE** |
| `checkin_depart` | ✅ | ❌ | **MANQUANTE** |
| `checkin_return` | ✅ | ❌ | **MANQUANTE** |
| `vehicle_photos` | ✅ | ❌ | **MANQUANTE** |

### RLS

| Table | Attendu | Existant | Statut |
|-------|---------|----------|--------|
| `profiles` | ✅ | ❌ | **MANQUANTE** |
| `vehicles` | ✅ | ❌ | **MANQUANTE** |
| `bookings` | ✅ | ❌ | **MANQUANTE** |
| `conversations` | ✅ | ❌ | **MANQUANTE** |
| `messages` | ✅ | ❌ | **MANQUANTE** |

### Storage

| Bucket | Attendu | Existant | Statut |
|--------|---------|----------|--------|
| `vehicle-photos` | ✅ | ❌ | **MANQUANTE** |
| `driver-licenses` | ✅ | ❌ | **MANQUANTE** |
| `checkin-photos` | ✅ | ❌ | **MANQUANTE** |
| `avatars` | ✅ | ❌ | **MANQUANTE** |

---

## 🎯 Conclusion

### ✅ Points Positifs
- Le fichier `supabase/config.toml` pointe vers le bon projet (`zykwfjxurwmputxwlkxs`)
- Les extensions nécessaires (`uuid-ossp`, `pgcrypto`) sont installées

### ❌ Points Bloquants
1. **Connexion au mauvais projet** : La connexion MCP Supabase est connectée à `slkgokhcaflhdfcqlucp` au lieu de `zykwfjxurwmputxwlkxs`
2. **Aucune table Rentanoo** : Toutes les tables attendues sont manquantes
3. **Aucune RLS** : Aucune policy de sécurité n'est configurée
4. **Aucun bucket storage** : Aucun bucket pour les photos et fichiers Rentanoo

### 📝 Actions Requises

1. **URGENT** : Vérifier et corriger la connexion MCP Supabase pour pointer vers le projet `zykwfjxurwmputxwlkxs`
2. **URGENT** : Vérifier que le fichier `.env` (ou variables d'environnement) contient bien :
   ```
   VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
   ```
3. Une fois la connexion corrigée, refaire ce diagnostic sur le **bon projet**
4. Créer toutes les tables manquantes selon le schéma attendu
5. Configurer les RLS policies
6. Créer les buckets storage nécessaires

---

**⚠️ IMPORTANT** : Ce diagnostic a été effectué sur le **mauvais projet Supabase**. Il est **NÉCESSAIRE** de corriger la connexion avant de procéder à la création du schéma.

