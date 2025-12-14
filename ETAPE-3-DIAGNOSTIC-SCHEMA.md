# ÉTAPE 3.0 — DIAGNOSTIC COMPLET DU SCHÉMA SUPABASE

**Date du diagnostic** : Généré automatiquement  
**Projet** : rentanoo-nosy-be  
**Objectif** : Recréer le schéma Supabase (tables, RLS, fonctions, triggers, extensions) SANS AUCUNE DONNÉE

---

## 📋 SOMMAIRE

1. [TABLES](#1-tables)
2. [ROW LEVEL SECURITY (RLS)](#2-row-level-security-rls)
3. [FUNCTIONS PostgreSQL](#3-functions-postgresql)
4. [TRIGGERS](#4-triggers)
5. [EXTENSIONS](#5-extensions)
6. [STORAGE (SUPABASE)](#6-storage-supabase)
7. [CHECKLIST PRÊT POUR RECONSTRUCTION](#7-checklist-prêt-pour-reconstruction)

---

## 1. TABLES

### ⚠️ IMPORTANT : ÉTAT ACTUEL

**Les tables actuellement présentes dans la base Supabase connectée ne correspondent PAS aux tables attendues par le projet rentanoo.**

**Tables présentes actuellement** (projet différent) :
- `companies_stats`
- `conversations` (table différente de celle attendue par rentanoo)
- `country_reference`
- `dim_country`
- `n8n_company`
- `n8n_company_normalized`
- `position_categories`
- `position_normalization_log`
- `salaries`
- `sector_categories`
- `upload_jobs`

**Tables ATTENDUES par le code rentanoo** (identifiées dans le code TypeScript) :
- `bookings`
- `profiles`
- `vehicles`
- `checkin_depart`
- `checkin_return`
- `conversations` (table rentanoo)
- `messages`
- `vehicle_photos` (probablement)

---

### 1.1. TABLES ATTENDUES PAR RENTANOO (basées sur le code)

#### 📊 Table `bookings`

**Références dans le code** : `src/integrations/supabase/types.ts`, `src/services/supabase/bookings.ts`

**Structure attendue** (d'après `types.ts`) :
```sql
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    vehicle_id UUID NOT NULL, -- Référence vers vehicles
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price NUMERIC NOT NULL,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    start_time TEXT,
    end_time TEXT,
    pickup_location TEXT,
    selected_options JSONB,
    base_price NUMERIC,
    options_total NUMERIC,
    service_fee NUMERIC,
    subtotal NUMERIC,
    price_per_day NUMERIC,
    rental_days INTEGER,
    reference_number INTEGER
);
```

**Clés étrangères attendues** :
- `user_id` → `auth.users(id)`
- `vehicle_id` → `vehicles(id)` (à confirmer)

**Contraintes attendues** :
- `id` : PRIMARY KEY
- `user_id` : NOT NULL
- `vehicle_id` : NOT NULL
- `start_date` : NOT NULL
- `end_date` : NOT NULL
- `total_price` : NOT NULL

---

#### 👤 Table `profiles`

**Références dans le code** : `src/integrations/supabase/types.ts`, `src/services/supabase/profile.ts`

**Structure attendue** (d'après `types.ts`) :
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('renter', 'owner', 'admin')),
    kyc_status TEXT CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    avatar_url TEXT,
    birthdate DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    place_of_birth TEXT,
    address_line1 TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT,
    driver_license_number TEXT,
    driver_license_issue_date DATE,
    driver_license_country TEXT,
    driver_license_file_path TEXT,
    full_name TEXT
);
```

**Clés étrangères attendues** :
- `id` → `auth.users(id)` (PRIMARY KEY + FOREIGN KEY)

**Contraintes attendues** :
- `id` : PRIMARY KEY, NOT NULL
- `created_at` : NOT NULL
- `role` : CHECK constraint (renter, owner, admin)
- `kyc_status` : CHECK constraint (pending, verified, rejected)

---

#### 🚗 Table `vehicles`

**Références dans le code** : `src/services/supabase/vehicles.ts`, `src/services/supabaseVehiclesService.ts`

**Structure attendue** (d'après le code) :
```sql
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    -- Colonnes attendues (à compléter selon le code)
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ,
    -- Autres colonnes à identifier depuis le code
    -- (marque, modèle, immatriculation, etc.)
);
```

**Clés étrangères attendues** :
- `owner_id` → `auth.users(id)`

**Relations attendues** :
- Relation avec `vehicle_photos` (table probable)
- Relation avec `bookings` (via `vehicle_id`)

---

#### 📝 Table `checkin_depart`

**Références dans le code** : `src/services/supabaseCheckinService.ts`

**Structure attendue** (d'après `CheckinDepart` interface) :
```sql
CREATE TABLE public.checkin_depart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    owner_id UUID REFERENCES auth.users(id),
    renter_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'draft',
    data JSONB NOT NULL,
    kilometrage_depart INTEGER,
    niveau_carburant INTEGER,
    photos_dashboard JSONB,
    photos_exterieur JSONB,
    photos_jantes JSONB,
    photos_coffre JSONB,
    photos_accessoires JSONB,
    degats JSONB,
    remarques_owner TEXT,
    remarques_renter TEXT,
    signature_owner TEXT,
    signature_renter TEXT,
    validated_at TIMESTAMPTZ,
    photo_permis_recto TEXT,
    photo_permis_verso TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Colonnes snapshot légal
    driver_email TEXT,
    driver_phone TEXT,
    owner_last_name TEXT,
    owner_first_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    booking_reference_number INTEGER,
    booking_departure_datetime TIMESTAMPTZ,
    booking_return_datetime TIMESTAMPTZ,
    booking_departure_location TEXT,
    booking_return_location TEXT,
    snapshot_version TEXT,
    snapshot_legal JSONB,
    legal_pdf_url TEXT
);
```

**Clés étrangères attendues** :
- `booking_id` → `bookings(id)`
- `owner_id` → `auth.users(id)`
- `renter_id` → `auth.users(id)`

**Contraintes attendues** :
- `id` : PRIMARY KEY
- `booking_id` : NOT NULL
- `status` : NOT NULL, probablement CHECK constraint (draft, completed, cancelled)
- `data` : NOT NULL (JSONB)
- `created_at` : NOT NULL
- `updated_at` : NOT NULL

---

#### 📝 Table `checkin_return`

**Références dans le code** : `src/services/supabaseCheckinReturnService.ts`

**Structure attendue** (d'après `CheckinReturn` interface) :
```sql
CREATE TABLE public.checkin_return (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    checkin_depart_id UUID NOT NULL REFERENCES checkin_depart(id),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    renter_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
    data JSONB NOT NULL,
    snapshot_legal JSONB,
    legal_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Clés étrangères attendues** :
- `booking_id` → `bookings(id)`
- `checkin_depart_id` → `checkin_depart(id)`
- `owner_id` → `auth.users(id)`
- `renter_id` → `auth.users(id)`

**Contraintes attendues** :
- `id` : PRIMARY KEY
- `booking_id` : NOT NULL
- `checkin_depart_id` : NOT NULL
- `owner_id` : NOT NULL
- `renter_id` : NOT NULL
- `status` : NOT NULL, CHECK constraint
- `data` : NOT NULL (JSONB)
- `created_at` : NOT NULL
- `updated_at` : NOT NULL

---

#### 💬 Table `conversations` (rentanoo)

**Références dans le code** : `src/integrations/supabase/types.ts`, `src/services/supabase/conversations.ts`

**Structure attendue** (d'après `types.ts`) :
```sql
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL, -- Référence vers vehicles
    renter_id UUID NOT NULL REFERENCES auth.users(id),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    booking_id UUID REFERENCES bookings(id),
    status TEXT CHECK (status IN ('active', 'closed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Clés étrangères attendues** :
- `renter_id` → `auth.users(id)`
- `owner_id` → `auth.users(id)`
- `booking_id` → `bookings(id)`
- `vehicle_id` → `vehicles(id)` (à confirmer)

**Contraintes attendues** :
- `id` : PRIMARY KEY
- `vehicle_id` : NOT NULL
- `renter_id` : NOT NULL
- `owner_id` : NOT NULL
- `status` : CHECK constraint (active, closed, archived)

---

#### 📨 Table `messages`

**Références dans le code** : `src/integrations/supabase/types.ts`, `src/services/supabase/messages.ts`

**Structure attendue** (d'après `types.ts`) :
```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Clés étrangères attendues** :
- `conversation_id` → `conversations(id)`
- `sender_id` → `auth.users(id)`

**Contraintes attendues** :
- `id` : PRIMARY KEY
- `conversation_id` : NOT NULL
- `sender_id` : NOT NULL
- `content` : NOT NULL
- `message_type` : CHECK constraint (text, image, file, system)

---

#### 📸 Table `vehicle_photos` (probable)

**Références dans le code** : `src/services/supabase/vehicles.ts` (relation `vehicle_photos`)

**Structure attendue** (d'après le code) :
```sql
CREATE TABLE public.vehicle_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    photo_url TEXT NOT NULL,
    storage_path TEXT,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Clés étrangères attendues** :
- `vehicle_id` → `vehicles(id)`

**Contraintes attendues** :
- `id` : PRIMARY KEY
- `vehicle_id` : NOT NULL
- `photo_url` : NOT NULL

---

### 1.2. TABLES ACTUELLEMENT PRÉSENTES (non rentanoo)

⚠️ **Ces tables sont présentes dans la base mais ne font PAS partie du projet rentanoo.**

#### Table `salaries`
- **RLS** : ❌ Désactivé
- **Colonnes** : id (bigint PK), email (unique), nom, prenom, password_hash, role, is_active, created_at, updated_at, last_login
- **FK** : `conversations.user_id` → `salaries.id`

#### Table `conversations` (non rentanoo)
- **RLS** : ❌ Désactivé
- **Colonnes** : id (uuid PK), user_id (bigint FK → salaries), timestamp, question, response, sources (jsonb), total_sources, has_more, created_at, updated_at, is_favorite, folder_id
- **FK** : `user_id` → `salaries.id`

#### Table `companies_stats`
- **RLS** : ❌ Désactivé
- **42 colonnes** de statistiques
- **Trigger** : `companies_stats_updated_at` (BEFORE UPDATE)

#### Table `n8n_company`
- **RLS** : ❌ Désactivé
- **76 colonnes** (données d'entreprises)
- **FK** : `n8n_company_normalized.id` → `n8n_company.id`
- **Trigger** : `trg_n8n_company_updated_at` (BEFORE UPDATE)

#### Table `n8n_company_normalized`
- **RLS** : ❌ Désactivé
- **48 colonnes** (version normalisée)
- **FK** : `id` → `n8n_company.id`

#### Table `country_reference`
- **RLS** : ❌ Désactivé
- **Colonnes** : iso2 (PK), iso3 (unique), country_name, country_name_fr, continent, region, other_names, is_active, sort_order, created_at, updated_at
- **CHECK** : iso2/iso3 uppercase
- **Trigger** : `trigger_update_country_reference_timestamp` (BEFORE UPDATE)

#### Table `dim_country`
- **RLS** : ❌ Désactivé
- **Colonnes** : country_code (PK), country_name, region_code, continent

#### Table `position_categories`
- **RLS** : ❌ Désactivé
- **Colonnes** : code (PK), label_fr, label_en, description, category_group, sort_order, is_active, created_at, updated_at
- **Trigger** : `trigger_update_position_categories_timestamp` (BEFORE UPDATE)

#### Table `position_normalization_log`
- **RLS** : ❌ Désactivé
- **Colonnes** : id (bigint PK), contact_id, position_raw, position_normalized_old, position_normalized_new, migrated_at, migration_batch

#### Table `sector_categories`
- **RLS** : ❌ Désactivé
- **Colonnes** : code (PK, CHECK uppercase), label_en, label_fr, description, macro_category, sort_order, is_active, created_at, updated_at
- **Trigger** : `trigger_update_sector_categories_timestamp` (BEFORE UPDATE)

#### Table `upload_jobs`
- **RLS** : ❌ Désactivé
- **Colonnes** : id (uuid PK), source_file, file_hash, status (CHECK), created_at, started_at, finished_at, total_rows, inserted_rows, error_message, file_signature, error_details (jsonb), enrich_mode

---

## 2. ROW LEVEL SECURITY (RLS)

### 2.1. ÉTAT ACTUEL

**Aucune table n'a RLS activé dans la base actuelle.**

Toutes les tables listées ont `rls_enabled = false` :
- `companies_stats` : ❌ RLS désactivé
- `conversations` : ❌ RLS désactivé
- `country_reference` : ❌ RLS désactivé
- `dim_country` : ❌ RLS désactivé
- `n8n_company` : ❌ RLS désactivé
- `n8n_company_normalized` : ❌ RLS désactivé
- `position_categories` : ❌ RLS désactivé
- `position_normalization_log` : ❌ RLS désactivé
- `salaries` : ❌ RLS désactivé
- `sector_categories` : ❌ RLS désactivé
- `upload_jobs` : ❌ RLS désactivé

**Aucune policy RLS n'est présente dans le schéma public.**

---

### 2.2. POLICIES ATTENDUES POUR RENTANOO

⚠️ **Les policies suivantes sont attendues par le code mais ne sont PAS présentes dans la base actuelle.**

#### Table `profiles`
**Policies attendues** :
- **SELECT** : Les utilisateurs peuvent lire leur propre profil + les profils publics (selon le rôle)
- **INSERT** : Création automatique via trigger lors de l'inscription (auth.users)
- **UPDATE** : Les utilisateurs peuvent modifier leur propre profil
- **DELETE** : Restriction (probablement admin uniquement)

#### Table `bookings`
**Policies attendues** :
- **SELECT** : Les utilisateurs peuvent voir leurs propres réservations (renter) + les réservations de leurs véhicules (owner)
- **INSERT** : Les utilisateurs authentifiés peuvent créer des réservations
- **UPDATE** : Les utilisateurs peuvent modifier leurs propres réservations (selon le statut)
- **DELETE** : Restriction (probablement admin uniquement)

#### Table `vehicles`
**Policies attendues** :
- **SELECT** : Lecture publique des véhicules disponibles
- **INSERT** : Les propriétaires peuvent créer des véhicules
- **UPDATE** : Les propriétaires peuvent modifier leurs propres véhicules
- **DELETE** : Les propriétaires peuvent supprimer leurs propres véhicules

#### Table `checkin_depart`
**Policies attendues** :
- **SELECT** : Owner et renter peuvent voir les check-ins de leurs réservations
- **INSERT** : Owner et renter peuvent créer des check-ins
- **UPDATE** : Owner et renter peuvent modifier les check-ins en statut "draft"
- **DELETE** : Restriction (probablement admin uniquement)

#### Table `checkin_return`
**Policies attendues** :
- **SELECT** : Owner et renter peuvent voir les check-ins retour de leurs réservations
- **INSERT** : Owner et renter peuvent créer des check-ins retour
- **UPDATE** : Owner et renter peuvent modifier les check-ins retour en statut "draft"
- **DELETE** : Restriction (probablement admin uniquement)

#### Table `conversations` (rentanoo)
**Policies attendues** :
- **SELECT** : Les participants (owner, renter) peuvent voir leurs conversations
- **INSERT** : Les utilisateurs authentifiés peuvent créer des conversations
- **UPDATE** : Les participants peuvent modifier leurs conversations
- **DELETE** : Les participants peuvent supprimer leurs conversations

#### Table `messages`
**Policies attendues** :
- **SELECT** : Les participants à la conversation peuvent voir les messages
- **INSERT** : Les participants peuvent envoyer des messages
- **UPDATE** : Les participants peuvent modifier leurs propres messages
- **DELETE** : Les participants peuvent supprimer leurs propres messages

---

## 3. FUNCTIONS PostgreSQL

### 3.1. FONCTIONS ACTUELLEMENT PRÉSENTES

**Aucune fonction custom n'est présente dans le schéma public.**

Les fonctions suivantes sont utilisées par les triggers mais ne sont pas listées comme fonctions custom (probablement dans un autre schéma ou générées automatiquement) :
- `update_companies_stats_updated_at`
- `update_updated_at_column`
- `update_country_reference_updated_at`
- `set_n8n_company_updated_at`
- `update_position_categories_updated_at`
- `update_sector_categories_updated_at`

---

### 3.2. FONCTIONS ATTENDUES POUR RENTANOO

⚠️ **Les fonctions suivantes sont probablement attendues mais ne sont PAS présentes dans la base actuelle.**

#### Fonction de création automatique de profil
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Déclencheur attendu** : Trigger sur `auth.users` (INSERT)

---

## 4. TRIGGERS

### 4.1. TRIGGERS ACTUELLEMENT PRÉSENTS

#### Table `companies_stats`
- **Trigger** : `companies_stats_updated_at`
- **Timing** : BEFORE
- **Événement** : UPDATE
- **Niveau** : ROW
- **Fonction** : `update_companies_stats_updated_at`
- **État** : Activé (O)

#### Table `conversations`
- **Trigger** : `update_conversations_updated_at`
- **Timing** : BEFORE
- **Événement** : UPDATE
- **Niveau** : ROW
- **Fonction** : `update_updated_at_column`
- **État** : Activé (O)

#### Table `country_reference`
- **Trigger** : `trigger_update_country_reference_timestamp`
- **Timing** : BEFORE
- **Événement** : UPDATE
- **Niveau** : ROW
- **Fonction** : `update_country_reference_updated_at`
- **État** : Activé (O)

#### Table `n8n_company`
- **Trigger** : `trg_n8n_company_updated_at`
- **Timing** : BEFORE
- **Événement** : UPDATE
- **Niveau** : ROW
- **Fonction** : `set_n8n_company_updated_at`
- **État** : Activé (O)

#### Table `position_categories`
- **Trigger** : `trigger_update_position_categories_timestamp`
- **Timing** : BEFORE
- **Événement** : UPDATE
- **Niveau** : ROW
- **Fonction** : `update_position_categories_updated_at`
- **État** : Activé (O)

#### Table `sector_categories`
- **Trigger** : `trigger_update_sector_categories_timestamp`
- **Timing** : BEFORE
- **Événement** : UPDATE
- **Niveau** : ROW
- **Fonction** : `update_sector_categories_updated_at`
- **État** : Activé (O)

**Tous les triggers présents sont des triggers de mise à jour automatique de `updated_at`.**

---

### 4.2. TRIGGERS ATTENDUS POUR RENTANOO

⚠️ **Les triggers suivants sont attendus mais ne sont PAS présents dans la base actuelle.**

#### Trigger de création automatique de profil
- **Table** : `auth.users`
- **Timing** : AFTER
- **Événement** : INSERT
- **Fonction** : `handle_new_user()` (à créer)
- **Rôle** : Créer automatiquement un profil dans `profiles` lors de l'inscription

#### Triggers de mise à jour automatique de `updated_at`
**Tables concernées** :
- `bookings`
- `profiles`
- `vehicles`
- `checkin_depart`
- `checkin_return`
- `conversations`
- `messages`
- `vehicle_photos`

**Pattern attendu** :
```sql
CREATE TRIGGER update_<table>_updated_at
BEFORE UPDATE ON public.<table>
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. EXTENSIONS

### 5.1. EXTENSIONS INSTALLÉES

#### Extensions activées (installed_version non null) :

1. **uuid-ossp** (schema: extensions)
   - Version : 1.1
   - Description : generate universally unique identifiers (UUIDs)
   - ✅ **CRITIQUE pour rentanoo** (génération d'UUIDs)

2. **pg_graphql** (schema: graphql)
   - Version : 1.5.11
   - Description : GraphQL support
   - ⚠️ Optionnel pour rentanoo

3. **pg_stat_statements** (schema: extensions)
   - Version : 1.11
   - Description : track planning and execution statistics
   - ⚠️ Optionnel (monitoring)

4. **supabase_vault** (schema: vault)
   - Version : 0.3.1
   - Description : Supabase Vault Extension
   - ⚠️ Optionnel

5. **pgcrypto** (schema: extensions)
   - Version : 1.3
   - Description : cryptographic functions
   - ✅ **CRITIQUE pour rentanoo** (hachage, cryptographie)

6. **vector** (schema: public)
   - Version : 0.8.0
   - Description : vector data type and ivfflat and hnsw access methods
   - ⚠️ Optionnel (recherche vectorielle)

7. **plpgsql** (schema: pg_catalog)
   - Version : 1.0
   - Description : PL/pgSQL procedural language
   - ✅ **CRITIQUE** (langage pour fonctions et triggers)

---

### 5.2. EXTENSIONS RECOMMANDÉES POUR RENTANOO

Les extensions suivantes sont disponibles mais non installées. À évaluer selon les besoins :

- **citext** : Case-insensitive text (utile pour emails)
- **moddatetime** : Tracking automatique de `updated_at` (alternative aux triggers custom)

---

## 6. STORAGE (SUPABASE)

### 6.1. BUCKETS ATTENDUS (identifiés dans le code)

⚠️ **Ces buckets sont référencés dans le code mais ne sont PAS présents dans la base actuelle.**

#### Bucket `avatars`
**Références** : `scripts/duplicate-storage-buckets.sql`

**Configuration attendue** :
- **ID** : `avatars`
- **Public** : `true`
- **Taille max** : 5MB (5242880 bytes)
- **MIME types autorisés** : `['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`

**Policies attendues** :
- **INSERT** : `auth.role() = 'authenticated'`
- **SELECT** : Public (tous)
- **UPDATE** : Propriétaire uniquement (`auth.uid()::text = (storage.foldername(name))[1]`)
- **DELETE** : Propriétaire uniquement

---

#### Bucket `driver-licenses`
**Références** : `scripts/duplicate-storage-buckets.sql`

**Configuration attendue** :
- **ID** : `driver-licenses`
- **Public** : `true`
- **Taille max** : 10MB (10485760 bytes)
- **MIME types autorisés** : `['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']`

**Policies attendues** :
- **INSERT** : `auth.role() = 'authenticated'`
- **SELECT** : Public (tous)
- **UPDATE** : Propriétaire uniquement
- **DELETE** : Propriétaire uniquement

---

#### Bucket `checkin-photos`
**Références** : `src/services/supabase/checkinPhotos.ts`, `scripts/duplicate-storage-buckets.sql`

**Configuration attendue** :
- **ID** : `checkin-photos`
- **Public** : `true` (à vérifier selon la config)
- **Taille max** : 10MB (10485760 bytes)
- **MIME types autorisés** : `['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`

**Structure de dossiers attendue** :
```
resa_<bookingReferenceNumber>/
  ├── depart/
  │   ├── photos_dashboard_<ref>_<timestamp>_<uuid>.jpg
  │   ├── photos_exterieur_<ref>_<timestamp>_<uuid>.jpg
  │   └── ...
  ├── retour/
  │   └── ...
  └── documents/
      ├── photo_permis_recto_<ref>_<timestamp>_<uuid>.jpg
      └── photo_permis_verso_<ref>_<timestamp>_<uuid>.jpg
```

**Policies attendues** :
- **INSERT** : `auth.role() = 'authenticated'`
- **SELECT** : Public (tous) - à adapter si restriction nécessaire
- **UPDATE** : Propriétaire uniquement
- **DELETE** : Propriétaire uniquement

---

#### Bucket `vehicle-photos`
**Références** : `src/services/supabase/photos.ts`

**Configuration attendue** :
- **ID** : `vehicle-photos`
- **Public** : `true` (probablement)
- **Taille max** : 10MB (10485760 bytes)
- **MIME types autorisés** : `['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`

**Structure de dossiers attendue** :
```
<vehicleId>/
  ├── frontLeft_<timestamp>_<random>.jpg
  ├── frontRight_<timestamp>_<random>.jpg
  └── ...
```

**Policies attendues** :
- **INSERT** : Propriétaires de véhicules uniquement
- **SELECT** : Public (tous)
- **UPDATE** : Propriétaires de véhicules uniquement
- **DELETE** : Propriétaires de véhicules uniquement

---

### 6.2. POLICIES STORAGE ATTENDUES

**Format général des policies** :
```sql
-- Exemple pour avatars
CREATE POLICY "avatars_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "avatars_select_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Voir le fichier** : `scripts/duplicate-storage-buckets.sql` pour les policies complètes.

---

## 7. CHECKLIST PRÊT POUR RECONSTRUCTION

### ✅ Éléments documentés

- [x] Tables attendues par rentanoo (structure complète)
- [x] Tables actuellement présentes (non rentanoo)
- [x] Clés primaires et étrangères attendues
- [x] Contraintes (NOT NULL, UNIQUE, CHECK) attendues
- [x] RLS policies attendues (description)
- [x] Functions attendues (description)
- [x] Triggers attendus (description)
- [x] Extensions installées et critiques
- [x] Buckets storage attendus (configuration complète)
- [x] Policies storage attendues (description)

---

### ❌ Éléments bloquants / manquants

#### 1. Tables rentanoo absentes
**Problème** : Les tables attendues par rentanoo (`bookings`, `profiles`, `vehicles`, `checkin_depart`, `checkin_return`, `conversations`, `messages`, `vehicle_photos`) ne sont **PAS présentes** dans la base actuelle.

**Action requise** : 
- Créer toutes les tables rentanoo selon les structures documentées ci-dessus
- Vérifier les structures exactes depuis le code source TypeScript si nécessaire

#### 2. Structures de tables incomplètes
**Problème** : Certaines structures de tables (notamment `vehicles`) sont incomplètes dans ce document.

**Action requise** :
- Analyser le code TypeScript pour compléter les structures
- Vérifier les migrations Supabase si disponibles
- Examiner les types TypeScript dans `src/integrations/supabase/types.ts`

#### 3. RLS non configuré
**Problème** : Aucune table n'a RLS activé, aucune policy n'est présente.

**Action requise** :
- Activer RLS sur toutes les tables rentanoo
- Créer les policies selon les besoins de sécurité identifiés

#### 4. Functions manquantes
**Problème** : La fonction `handle_new_user()` pour la création automatique de profil n'est pas présente.

**Action requise** :
- Créer la fonction `handle_new_user()`
- Créer le trigger associé sur `auth.users`

#### 5. Triggers manquants
**Problème** : Les triggers de mise à jour automatique de `updated_at` pour les tables rentanoo ne sont pas présents.

**Action requise** :
- Créer la fonction générique `update_updated_at_column()` (ou utiliser `moddatetime`)
- Créer les triggers sur toutes les tables rentanoo

#### 6. Buckets storage absents
**Problème** : Les buckets `avatars`, `driver-licenses`, `checkin-photos`, `vehicle-photos` ne sont pas présents.

**Action requise** :
- Créer tous les buckets selon les configurations documentées
- Créer les policies storage associées

---

### 📝 Notes importantes

1. **Base actuelle différente** : La base Supabase connectée contient des tables d'un autre projet. Il faudra créer toutes les tables rentanoo depuis zéro.

2. **Dépendances auth.users** : Plusieurs tables dépendent de `auth.users` (Supabase Auth). Ces dépendances seront automatiquement gérées par Supabase.

3. **Ordre de création recommandé** :
   - Extensions
   - Functions
   - Tables (dans l'ordre des dépendances)
   - Triggers
   - RLS (activation + policies)
   - Storage buckets + policies

4. **Validation** : Après reconstruction, valider que :
   - Toutes les tables sont créées
   - Toutes les FK sont fonctionnelles
   - RLS est activé et fonctionne
   - Les triggers fonctionnent
   - Les buckets sont accessibles

---

## 📄 FICHIERS DE RÉFÉRENCE

- `src/integrations/supabase/types.ts` : Types TypeScript (structure des tables)
- `scripts/duplicate-storage-buckets.sql` : Script de création des buckets
- `src/services/supabaseCheckinService.ts` : Structure `checkin_depart`
- `src/services/supabaseCheckinReturnService.ts` : Structure `checkin_return`
- `src/services/supabase/vehicles.ts` : Relations `vehicles` et `vehicle_photos`

---

**FIN DU DIAGNOSTIC**

