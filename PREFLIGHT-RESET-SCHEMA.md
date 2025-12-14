# 🔍 Préflight Reset & Recréation Schéma Rentanoo

**Date** : 2025-01-27  
**Mode** : ✅ **LECTURE SEULE** - Aucune modification effectuée  
**Projet Source (Référence)** : `zykwfjxurwmputxwlkxs` (Rentanoo)  
**Projet Destination (Nouveau)** : `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)

---

## ✅ 1. Vérification Obligatoire

### Project ID Réel

- **Project ID attendu** : `tbsgzykqcksmqxpimwry` ✅
- **Project ID détecté** : `tbsgzykqcksmqxpimwry` ✅
- **Statut** : ✅ **CORRECT**

### URL Supabase

- **URL Supabase** : `https://tbsgzykqcksmqxpimwry.supabase.co` ✅
- **Région** : eu-west-1
- **Statut** : ACTIVE_HEALTHY ✅

### Mode Read-Only

- **Mode Read-Only** : `false` (écriture autorisée)
- **Override** : Non activé

---

## 📊 2. Préflight "RESET SAFE"

### 2.1 Tables du Schéma `public` (État Actuel)

**Total** : 8 tables (toutes vides - 0 lignes)

| Table | Lignes | Taille | RLS Status |
|-------|--------|--------|------------|
| `bookings` | 0 | 0.0 B | ✅ **ENABLED** |
| `checkin_depart` | 0 | 0.0 B | ✅ **ENABLED** |
| `checkin_return` | 0 | 0.0 B | ✅ **ENABLED** |
| `conversations` | 0 | 0.0 B | ✅ **ENABLED** |
| `messages` | 0 | 0.0 B | ✅ **ENABLED** |
| `profiles` | 0 | 0.0 B | ✅ **ENABLED** |
| `vehicle_photos` | 0 | 0.0 B | ✅ **ENABLED** |
| `vehicles` | 0 | 0.0 B | ✅ **ENABLED** |

**⚠️ Observations** :
- ✅ Toutes les tables principales sont présentes
- ❌ **Tables manquantes** : `payments`, `reviews` (présentes dans le schéma de référence)
- ✅ Toutes les tables sont vides (0 lignes) - **SAFE TO RESET**
- ✅ Toutes les tables ont RLS activé (contrairement au projet source où certaines n'avaient pas RLS)

### 2.2 Policies RLS (État Actuel)

**Total** : 28 policies

#### Table `bookings` (4 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `bookings_delete_admin` | DELETE | `authenticated` |
| `bookings_insert_own` | INSERT | `authenticated` |
| `bookings_select_own_or_admin` | SELECT | `authenticated` |
| `bookings_update_own_or_admin` | UPDATE | `authenticated` |

#### Table `checkin_depart` (3 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `checkin_depart_insert_admin` | INSERT | `authenticated` |
| `checkin_depart_select_own_or_admin` | SELECT | `authenticated` |
| `checkin_depart_update_admin` | UPDATE | `authenticated` |

#### Table `checkin_return` (3 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `checkin_return_insert_admin` | INSERT | `authenticated` |
| `checkin_return_select_own_or_admin` | SELECT | `authenticated` |
| `checkin_return_update_admin` | UPDATE | `authenticated` |

#### Table `conversations` (3 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `conversations_insert_customer_or_admin` | INSERT | `authenticated` |
| `conversations_select_participant_or_admin` | SELECT | `authenticated` |
| `conversations_update_participant_or_admin` | UPDATE | `authenticated` |

#### Table `messages` (4 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `messages_delete_admin` | DELETE | `authenticated` |
| `messages_insert_participant_or_admin` | INSERT | `authenticated` |
| `messages_select_participant_or_admin` | SELECT | `authenticated` |
| `messages_update_sender_or_admin` | UPDATE | `authenticated` |

#### Table `profiles` (4 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `profiles_insert_own` | INSERT | `authenticated` |
| `profiles_select_own_or_admin` | SELECT | `authenticated` |
| `profiles_temp_self_promote_admin` | UPDATE | `authenticated` |
| `profiles_update_own_or_admin` | UPDATE | `authenticated` |

#### Table `vehicle_photos` (4 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `vehicle_photos_delete_admin` | DELETE | `authenticated` |
| `vehicle_photos_insert_admin` | INSERT | `authenticated` |
| `vehicle_photos_select_public` | SELECT | `public` |
| `vehicle_photos_update_admin` | UPDATE | `authenticated` |

#### Table `vehicles` (4 policies)

| Policy Name | CMD | Roles |
|-------------|-----|-------|
| `vehicles_delete_admin` | DELETE | `authenticated` |
| `vehicles_insert_admin` | INSERT | `authenticated` |
| `vehicles_select_public` | SELECT | `public` |
| `vehicles_update_admin` | UPDATE | `authenticated` |

**⚠️ Observations** :
- Les policies actuelles sont **orientées admin** (différentes du schéma de référence qui est orienté owner/renter)
- Les policies de référence sont plus granulaires (9 policies pour `bookings` vs 4 actuellement)
- Les policies de référence utilisent `public` et `authenticated` de manière différente

### 2.3 Triggers (État Actuel)

**Total** : 7 triggers

| Trigger Name | Table | Événement | Fonction |
|--------------|-------|-----------|----------|
| `trg_bookings_updated_at` | `bookings` | UPDATE | `set_updated_at()` |
| `trg_checkin_depart_updated_at` | `checkin_depart` | UPDATE | `set_updated_at()` |
| `trg_checkin_return_updated_at` | `checkin_return` | UPDATE | `set_updated_at()` |
| `trg_conversations_updated_at` | `conversations` | UPDATE | `set_updated_at()` |
| `trg_messages_updated_at` | `messages` | UPDATE | `set_updated_at()` |
| `trg_profiles_updated_at` | `profiles` | UPDATE | `set_updated_at()` |
| `trg_vehicles_updated_at` | `vehicles` | UPDATE | `set_updated_at()` |

**⚠️ Observations** :
- Fonction utilisée : `set_updated_at()` (différente de la référence qui utilise `update_updated_at_column()`)
- Toutes les tables ont un trigger `updated_at` (bon point)
- **Manque** : le trigger `sync_profile_is_admin()` sur `profiles` (présent dans la référence)

### 2.4 Fonctions Custom (État Actuel)

**Total** : 1 fonction

| Fonction Name | Arguments |
|---------------|-----------|
| `set_updated_at` | (aucun) |

**⚠️ Observations** :
- **Fonction différente** de la référence qui utilise `update_updated_at_column()`
- **Manquent** : 
  - `handle_new_user()` (création automatique de profil)
  - `sync_profile_is_admin()` (synchronisation admin)
  - `normalize_text(input_text text)` (normalisation de texte)
  - Fonctions `unaccent` (extension unaccent)

### 2.5 Storage Buckets (État Actuel)

**Total** : 0 buckets

**⚠️ Observations** :
- **Aucun bucket storage** n'est présent
- **Manquent** (selon la référence) :
  - `avatars`
  - `checkin-photos`
  - `driver-licenses`
  - `vehicle-photos`

---

## 📋 3. Plan de Reset (Sans Exécuter)

### Étape 1 : Sauvegarde/Exports Nécessaires

**✅ Aucune sauvegarde nécessaire** car :
- Toutes les tables sont **vides** (0 lignes)
- Aucune donnée à préserver
- Le projet est un nouveau projet sans données de production

**Actions** :
- ✅ Vérification confirmée : toutes les tables sont vides
- ✅ Aucun export de données nécessaire

### Étape 2 : Drop/Clean du Schéma `public`

**Approche recommandée** : Drop complet et recréation propre

**Ordre d'exécution** (à inverser pour le drop) :

1. **Drop des triggers** (dépendent des tables)
   ```sql
   -- Drop tous les triggers existants
   DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
   DROP TRIGGER IF EXISTS trg_checkin_depart_updated_at ON checkin_depart;
   DROP TRIGGER IF EXISTS trg_checkin_return_updated_at ON checkin_return;
   DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
   DROP TRIGGER IF EXISTS trg_messages_updated_at ON messages;
   DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
   DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
   ```

2. **Drop des fonctions custom**
   ```sql
   -- Drop la fonction existante
   DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
   ```

3. **Drop des tables** (dans l'ordre inverse des dépendances)
   ```sql
   -- Drop dans l'ordre inverse des clés étrangères
   DROP TABLE IF EXISTS checkin_return CASCADE;
   DROP TABLE IF EXISTS checkin_depart CASCADE;
   DROP TABLE IF EXISTS vehicle_photos CASCADE;
   DROP TABLE IF EXISTS messages CASCADE;
   DROP TABLE IF EXISTS conversations CASCADE;
   DROP TABLE IF EXISTS bookings CASCADE;
   DROP TABLE IF EXISTS vehicles CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   -- Note: payments et reviews n'existent pas encore
   ```

4. **Drop des extensions** (si nécessaire, mais généralement on les garde)
   ```sql
   -- Les extensions (uuid-ossp, pgcrypto) sont généralement conservées
   -- Pas de drop nécessaire
   ```

**⚠️ Alternative** : Utiliser `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` pour un reset complet, mais cela nécessite de recréer les permissions.

### Étape 3 : Recréation Exacte selon le Diagnostic Rentanoo

**Ordre d'exécution** (selon le diagnostic de référence) :

1. **Extensions PostgreSQL**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   -- Note: unaccent nécessite l'extension unaccent (à vérifier)
   ```

2. **Fonctions Custom** (avant les triggers)
   ```sql
   -- Créer update_updated_at_column()
   -- Créer handle_new_user()
   -- Créer sync_profile_is_admin()
   -- Créer normalize_text(input_text text)
   -- (Les fonctions unaccent sont fournies par l'extension)
   ```

3. **Tables** (dans l'ordre des dépendances)
   ```sql
   -- 1. profiles (base, référencée par d'autres)
   -- 2. vehicles (base, référencée par bookings)
   -- 3. bookings (dépend de profiles et vehicles)
   -- 4. conversations (dépend de bookings, vehicles, profiles)
   -- 5. messages (dépend de conversations, bookings)
   -- 6. checkin_depart (dépend de bookings, profiles)
   -- 7. checkin_return (dépend de bookings, checkin_depart, profiles)
   -- 8. vehicle_photos (dépend de vehicles)
   -- 9. payments (dépend de bookings) - À CRÉER
   -- 10. reviews (dépend de bookings, vehicles, auth.users) - À CRÉER
   ```

4. **Contraintes** (clés primaires, étrangères, CHECK, UNIQUE)
   - Définies lors de la création des tables

5. **Indexes**
   - Créés après les tables

6. **Triggers**
   ```sql
   -- Créer les triggers update_updated_at_column sur les tables concernées
   -- Créer le trigger sync_profile_is_admin sur profiles
   ```

7. **RLS Policies** (29 policies selon la référence)
   - Activer RLS sur les tables concernées
   - Créer toutes les policies selon le diagnostic de référence

8. **Storage Buckets** (4 buckets)
   ```sql
   -- Créer les buckets via l'API Storage ou SQL
   -- avatars, checkin-photos, driver-licenses, vehicle-photos
   ```

---

## ⚠️ Différences Identifiées entre État Actuel et Référence

### Tables

| Élément | État Actuel | Référence | Action |
|---------|-------------|-----------|--------|
| `payments` | ❌ Absente | ✅ Présente | **À CRÉER** |
| `reviews` | ❌ Absente | ✅ Présente | **À CRÉER** |

### RLS

| Table | État Actuel | Référence | Action |
|-------|-------------|-----------|--------|
| `checkin_depart` | ✅ ENABLED | ❌ DISABLED | **Désactiver RLS** (selon référence) |
| `checkin_return` | ✅ ENABLED | ❌ DISABLED | **Désactiver RLS** (selon référence) |
| `vehicles` | ✅ ENABLED | ❌ DISABLED | **Désactiver RLS** (selon référence) |

### Policies

- **État actuel** : 28 policies (orientées admin)
- **Référence** : 29 policies (orientées owner/renter)
- **Action** : **Remplacer toutes les policies** par celles de la référence

### Triggers

| Élément | État Actuel | Référence | Action |
|---------|-------------|-----------|--------|
| Fonction | `set_updated_at()` | `update_updated_at_column()` | **Remplacer** |
| Trigger `sync_profile_is_admin` | ❌ Absent | ✅ Présent | **Créer** |

### Fonctions

| Fonction | État Actuel | Référence | Action |
|----------|-------------|-----------|--------|
| `set_updated_at()` | ✅ Présente | ❌ Absente | **Remplacer par `update_updated_at_column()`** |
| `handle_new_user()` | ❌ Absente | ✅ Présente | **Créer** |
| `sync_profile_is_admin()` | ❌ Absente | ✅ Présente | **Créer** |
| `normalize_text()` | ❌ Absente | ✅ Présente | **Créer** |

### Storage

- **État actuel** : 0 buckets
- **Référence** : 4 buckets
- **Action** : **Créer les 4 buckets**

---

## ✅ OK POUR PASSER À L'ÉTAPE 2

**Statut** : ✅ **TOUT EST BON**

**Raisons** :
1. ✅ Connexion au bon projet confirmée (`tbsgzykqcksmqxpimwry`)
2. ✅ Toutes les tables sont vides (0 lignes) - **SAFE TO RESET**
3. ✅ Aucune donnée à préserver
4. ✅ Plan de reset défini et sécurisé
5. ✅ Différences identifiées et documentées

**Prêt pour** : Génération du script SQL complet "recreate exact" (PROMPT #2)

---

**Date de génération** : 2025-01-27  
**Mode** : LECTURE SEULE ✅  
**Aucune modification effectuée** ✅

