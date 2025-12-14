# 🔍 Diagnostic Complet du Schéma Supabase - Rentanoo

**Date** : 2025-01-27  
**Projet** : `zykwfjxurwmputxwlkxs` (Rentanoo)  
**URL** : `https://zykwfjxurwmputxwlkxs.supabase.co`  
**Mode** : ✅ **LECTURE SEULE** - Aucune modification effectuée

---

## ✅ 1. Vérification de la Connexion

- **Project ID** : `zykwfjxurwmputxwlkxs` ✅
- **URL** : `https://zykwfjxurwmputxwlkxs.supabase.co` ✅
- **Statut** : ACTIVE_HEALTHY ✅
- **Région** : eu-west-3
- **Mode Read-Only** : `false` (écriture autorisée, mais diagnostic en lecture seule)

---

## 📊 2. Tables du Schéma `public`

**Total** : 10 tables

### 2.1 Table `bookings`

**Type** : BASE TABLE  
**Lignes** : 6  
**Taille** : 8.0 KB  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `user_id` | `uuid` | ❌ | - | ❌ | 2 |
| `vehicle_id` | `uuid` | ❌ | - | ❌ | 3 |
| `start_date` | `date` | ❌ | - | ❌ | 4 |
| `end_date` | `date` | ❌ | - | ❌ | 5 |
| `total_price` | `numeric` | ❌ | - | ❌ | 6 |
| `status` | `character varying` | ✅ | `'pending'::character varying` | ❌ | 7 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 9 |
| `start_time` | `character varying` | ✅ | - | ❌ | 10 |
| `end_time` | `character varying` | ✅ | - | ❌ | 11 |
| `pickup_location` | `character varying` | ✅ | - | ❌ | 12 |
| `selected_options` | `jsonb` | ✅ | - | ❌ | 13 |
| `base_price` | `numeric` | ❌ | - | ❌ | 14 |
| `options_total` | `numeric` | ❌ | - | ❌ | 15 |
| `service_fee` | `numeric` | ❌ | - | ❌ | 16 |
| `subtotal` | `numeric` | ❌ | - | ❌ | 17 |
| `price_per_day` | `numeric` | ❌ | - | ❌ | 18 |
| `rental_days` | `integer` | ✅ | - | ❌ | 19 |
| `reference_number` | `integer` | ✅ | - | ❌ | 20 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `bookings_user_id_fkey` : `user_id` → `auth.users(id)` ON DELETE CASCADE
- `bookings_vehicle_id_fkey` : `vehicle_id` → `vehicles(id)` ON DELETE CASCADE

#### Contraintes CHECK

- `bookings_check` : `end_date > start_date`
- `bookings_status_check` : `status IN ('pending', 'pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'rejected', 'declined')`
- `bookings_total_price_check` : `total_price >= 0`
- `check_start_time_format` : `start_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'`
- `check_end_time_format` : `end_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'`

#### Indexes

- `bookings_pkey` : UNIQUE INDEX sur `id`
- `idx_bookings_dates` : INDEX sur `(start_date, end_date)`
- `idx_bookings_reference_number` : UNIQUE INDEX sur `reference_number`
- `idx_bookings_user` : INDEX sur `user_id`
- `idx_bookings_vehicle` : INDEX sur `vehicle_id`

---

### 2.2 Table `profiles`

**Type** : BASE TABLE  
**Lignes** : 5  
**Taille** : 8.0 KB  
**Commentaire** : "extension"  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | - | ✅ | 1 |
| `email` | `text` | ❌ | - | ❌ | 2 |
| `first_name` | `text` | ✅ | - | ❌ | 3 |
| `last_name` | `text` | ✅ | - | ❌ | 4 |
| `phone` | `text` | ✅ | - | ❌ | 5 |
| `avatar_url` | `text` | ✅ | - | ❌ | 6 |
| `bio` | `text` | ✅ | - | ❌ | 7 |
| `role` | `text` | ✅ | `'renter'::text` | ❌ | 8 |
| `kyc_status` | `text` | ✅ | `'pending'::text` | ❌ | 9 |
| `is_admin` | `boolean` | ✅ | `false` | ❌ | 10 |
| `admin_role` | `text` | ✅ | `'user'::text` | ❌ | 11 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 12 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 13 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `profiles_id_fkey` : `id` → `auth.users(id)` ON DELETE CASCADE

#### Contraintes CHECK

- `check_bio_length` : `bio IS NULL OR length(bio) <= 500`
- `profiles_admin_role_check` : `admin_role IN ('user', 'admin')`

#### Indexes

- `profiles_pkey` : UNIQUE INDEX sur `id`

---

### 2.3 Table `vehicles`

**Type** : BASE TABLE  
**Lignes** : 11  
**Taille** : 24.0 KB  
**RLS** : ❌ **DISABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `owner_id` | `uuid` | ❌ | - | ❌ | 2 |
| `brand` | `text` | ❌ | - | ❌ | 3 |
| `model` | `text` | ❌ | - | ❌ | 4 |
| `year` | `integer` | ❌ | - | ❌ | 5 |
| `color` | `text` | ✅ | - | ❌ | 6 |
| `license_plate` | `text` | ✅ | - | ❌ | 7 |
| `mileage` | `integer` | ❌ | - | ❌ | 8 |
| `fuel_type` | `text` | ❌ | - | ❌ | 9 |
| `transmission` | `text` | ❌ | - | ❌ | 10 |
| `seats` | `integer` | ❌ | - | ❌ | 11 |
| `price_per_day` | `numeric` | ❌ | - | ❌ | 12 |
| `available` | `boolean` | ❌ | `true` | ❌ | 13 |
| `vehicle_category` | `text` | ✅ | - | ❌ | 14 |
| `pickup_zones` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 15 |
| `description` | `text` | ✅ | - | ❌ | 16 |
| `rental_count` | `integer` | ✅ | `0` | ❌ | 17 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 18 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 19 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `vehicles_owner_id_fkey` : `owner_id` → `auth.users(id)` ON DELETE CASCADE

#### Contraintes CHECK

- `check_vehicle_category` : `vehicle_category IN ('Citadine', 'Berline', 'SUV', 'Break', 'Coupé', 'Cabriolet', 'Utilitaire', 'Camionnette', 'Minibus', 'Pick-up', 'Non spécifié') OR vehicle_category IS NULL`
- `vehicles_mileage_check` : `mileage >= 0`
- `vehicles_price_per_day_check` : `price_per_day > 0`
- `vehicles_rental_count_check` : `rental_count >= 0`
- `vehicles_seats_check` : `seats > 0 AND seats <= 20`
- `vehicles_year_check` : `year >= 1900 AND year <= 2100`

#### Indexes

- `vehicles_pkey` : UNIQUE INDEX sur `id`
- `idx_vehicles_available` : INDEX partiel sur `available` WHERE `available = true`
- `idx_vehicles_category` : INDEX sur `vehicle_category`
- `idx_vehicles_pickup_zones` : GIN INDEX sur `pickup_zones`
- `idx_vehicles_pickup_zones_gin` : GIN INDEX sur `pickup_zones` (doublon)

---

### 2.4 Table `conversations`

**Type** : BASE TABLE  
**Lignes** : 6  
**Taille** : 8.0 KB  
**Commentaire** : "Contient les conversations entre locataires et propriétaires pour chaque réservation"  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `vehicle_id` | `uuid` | ❌ | - | ❌ | 2 |
| `renter_id` | `uuid` | ❌ | - | ❌ | 3 |
| `owner_id` | `uuid` | ❌ | - | ❌ | 4 |
| `booking_id` | `uuid` | ✅ | - | ❌ | 5 |
| `status` | `text` | ❌ | `'active'::text` | ❌ | 6 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 7 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- Aucune clé étrangère définie (mais références logiques vers `vehicles`, `profiles`, `bookings`)

#### Contraintes CHECK

- `conversations_status_check` : `status IN ('active', 'closed', 'archived')`

#### Contraintes UNIQUE

- `unique_conversation_per_booking` : UNIQUE sur `booking_id`

#### Indexes

- `conversations_pkey` : UNIQUE INDEX sur `id`
- `idx_conversations_booking_id` : INDEX sur `booking_id`
- `idx_conversations_owner_id` : INDEX sur `owner_id`
- `idx_conversations_renter_id` : INDEX sur `renter_id`
- `idx_conversations_status` : INDEX sur `status`
- `idx_conversations_vehicle_id` : INDEX sur `vehicle_id`
- `unique_conversation_per_booking` : UNIQUE INDEX sur `booking_id`

---

### 2.5 Table `messages`

**Type** : BASE TABLE  
**Lignes** : 6  
**Taille** : 8.0 KB  
**Commentaire** : "Contient les messages individuels dans chaque conversation"  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `conversation_id` | `uuid` | ❌ | - | ❌ | 2 |
| `sender_id` | `uuid` | ❌ | - | ❌ | 3 |
| `content` | `text` | ❌ | - | ❌ | 4 |
| `message_type` | `text` | ❌ | `'text'::text` | ❌ | 5 |
| `is_read` | `boolean` | ❌ | `false` | ❌ | 6 |
| `booking_id` | `uuid` | ✅ | - | ❌ | 7 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `messages_conversation_id_fkey` : `conversation_id` → `conversations(id)` ON DELETE CASCADE
- `messages_booking_id_fkey` : `booking_id` → `bookings(id)` ON DELETE SET NULL

#### Contraintes CHECK

- `messages_message_type_check` : `message_type IN ('text', 'image', 'file', 'system')`

#### Indexes

- `messages_pkey` : UNIQUE INDEX sur `id`
- `idx_messages_booking_id` : INDEX sur `booking_id`
- `idx_messages_conversation_id` : INDEX sur `conversation_id`
- `idx_messages_created_at` : INDEX sur `created_at`
- `idx_messages_is_read` : INDEX sur `is_read`
- `idx_messages_sender_id` : INDEX sur `sender_id`

---

### 2.6 Table `checkin_depart`

**Type** : BASE TABLE  
**Lignes** : 3  
**Taille** : 24.0 KB  
**RLS** : ❌ **DISABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `uuid_generate_v4()` | ✅ | 1 |
| `booking_id` | `uuid` | ✅ | - | ❌ | 2 |
| `owner_id` | `uuid` | ✅ | - | ❌ | 3 |
| `renter_id` | `uuid` | ✅ | - | ❌ | 4 |
| `data` | `jsonb` | ✅ | `'{}'::jsonb` | ❌ | 5 |
| `status` | `text` | ✅ | `'draft'::text` | ❌ | 6 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 7 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |
| `kilometrage_depart` | `numeric` | ✅ | - | ❌ | 10 |
| `niveau_carburant` | `numeric` | ✅ | - | ❌ | 11 |
| `photos_dashboard` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 12 |
| `photos_exterieur` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 13 |
| `photos_jantes` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 14 |
| `photos_coffre` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 15 |
| `photos_accessoires` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 16 |
| `degats` | `jsonb` | ✅ | `'[]'::jsonb` | ❌ | 17 |
| `remarques_owner` | `text` | ✅ | - | ❌ | 18 |
| `remarques_renter` | `text` | ✅ | - | ❌ | 19 |
| `signature_owner` | `text` | ✅ | - | ❌ | 20 |
| `signature_renter` | `text` | ✅ | - | ❌ | 21 |
| `validated_at` | `timestamp with time zone` | ✅ | - | ❌ | 22 |
| `photo_permis_recto` | `text` | ✅ | - | ❌ | 23 |
| `photo_permis_verso` | `text` | ✅ | - | ❌ | 24 |
| `snapshot_legal` | `jsonb` | ✅ | - | ❌ | 25 |
| `driver_email` | `text` | ✅ | - | ❌ | 26 |
| `driver_phone` | `text` | ✅ | - | ❌ | 27 |
| `owner_last_name` | `text` | ✅ | - | ❌ | 28 |
| `owner_first_name` | `text` | ✅ | - | ❌ | 29 |
| `owner_email` | `text` | ✅ | - | ❌ | 30 |
| `owner_phone` | `text` | ✅ | - | ❌ | 31 |
| `booking_reference_number` | `integer` | ✅ | - | ❌ | 32 |
| `booking_departure_datetime` | `timestamp with time zone` | ✅ | - | ❌ | 33 |
| `booking_return_datetime` | `timestamp with time zone` | ✅ | - | ❌ | 34 |
| `snapshot_version` | `text` | ✅ | - | ❌ | 35 |
| `booking_departure_location` | `text` | ✅ | - | ❌ | 36 |
| `booking_return_location` | `text` | ✅ | - | ❌ | 37 |
| `legal_pdf_url` | `text` | ✅ | - | ❌ | 38 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `checkin_depart_booking_id_fkey` : `booking_id` → `bookings(id)` ON DELETE CASCADE
- `checkin_depart_owner_id_fkey` : `owner_id` → `profiles(id)` ON DELETE NO ACTION
- `checkin_depart_renter_id_fkey` : `renter_id` → `profiles(id)` ON DELETE NO ACTION

#### Indexes

- `checkin_depart_pkey` : UNIQUE INDEX sur `id`
- `checkin_depart_booking_id_idx` : INDEX sur `booking_id`
- `idx_checkin_depart_booking_reference_number` : INDEX sur `booking_reference_number`
- `idx_checkin_depart_driver_email` : INDEX sur `driver_email`
- `idx_checkin_depart_legal_pdf_url` : INDEX partiel sur `legal_pdf_url` WHERE `legal_pdf_url IS NOT NULL`
- `idx_checkin_depart_snapshot_legal_gin` : GIN INDEX sur `snapshot_legal`
- `idx_checkin_depart_validated_at` : INDEX sur `validated_at`
- `idx_checkin_depart_owner_email` : INDEX sur `owner_email`

---

### 2.7 Table `checkin_return`

**Type** : BASE TABLE  
**Lignes** : 1  
**Taille** : 24.0 KB  
**RLS** : ❌ **DISABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `booking_id` | `uuid` | ❌ | - | ❌ | 2 |
| `checkin_depart_id` | `uuid` | ❌ | - | ❌ | 3 |
| `owner_id` | `uuid` | ❌ | - | ❌ | 4 |
| `renter_id` | `uuid` | ❌ | - | ❌ | 5 |
| `status` | `text` | ❌ | `'draft'::text` | ❌ | 6 |
| `data` | `jsonb` | ❌ | `'{}'::jsonb` | ❌ | 7 |
| `snapshot_legal` | `jsonb` | ✅ | - | ❌ | 8 |
| `legal_pdf_url` | `text` | ✅ | - | ❌ | 9 |
| `created_at` | `timestamp with time zone` | ❌ | `now()` | ❌ | 10 |
| `updated_at` | `timestamp with time zone` | ❌ | `now()` | ❌ | 11 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `checkin_return_booking_id_fkey` : `booking_id` → `bookings(id)` ON DELETE RESTRICT
- `checkin_return_checkin_depart_id_fkey` : `checkin_depart_id` → `checkin_depart(id)` ON DELETE RESTRICT
- `checkin_return_owner_id_fkey` : `owner_id` → `profiles(id)` ON DELETE RESTRICT
- `checkin_return_renter_id_fkey` : `renter_id` → `profiles(id)` ON DELETE RESTRICT

#### Indexes

- `checkin_return_pkey` : UNIQUE INDEX sur `id`
- `idx_checkin_return_booking_id` : INDEX sur `booking_id`
- `idx_checkin_return_checkin_depart_id` : INDEX sur `checkin_depart_id`
- `idx_checkin_return_booking_draft` : UNIQUE INDEX partiel sur `booking_id` WHERE `status = 'draft'`

---

### 2.8 Table `vehicle_photos`

**Type** : BASE TABLE  
**Lignes** : 0  
**Taille** : 0.0 B  
**Commentaire** : "Stores multiple photos for each vehicle with ordering and primary photo designation"  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `vehicle_id` | `uuid` | ❌ | - | ❌ | 2 |
| `photo_url` | `text` | ❌ | - | ❌ | 3 |
| `storage_path` | `text` | ❌ | - | ❌ | 4 |
| `is_primary` | `boolean` | ✅ | `false` | ❌ | 5 |
| `display_order` | `integer` | ✅ | `0` | ❌ | 6 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 7 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `vehicle_photos_vehicle_id_fkey` : `vehicle_id` → `vehicles(id)` ON DELETE CASCADE

#### Indexes

- `vehicle_photos_pkey` : UNIQUE INDEX sur `id`
- `idx_vehicle_photos_vehicle_id` : INDEX sur `vehicle_id`
- `idx_vehicle_photos_is_primary` : INDEX sur `(vehicle_id, is_primary)`

---

### 2.9 Table `payments`

**Type** : BASE TABLE  
**Lignes** : 0  
**Taille** : 0.0 B  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `booking_id` | `uuid` | ❌ | - | ❌ | 2 |
| `amount` | `numeric(10,2)` | ❌ | - | ❌ | 3 |
| `status` | `character varying(50)` | ✅ | `'pending'::character varying` | ❌ | 4 |
| `stripe_payment_id` | `character varying(255)` | ✅ | - | ❌ | 5 |
| `stripe_payment_intent_id` | `character varying(255)` | ✅ | - | ❌ | 6 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 7 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `payments_booking_id_fkey` : `booking_id` → `bookings(id)` ON DELETE CASCADE

#### Contraintes CHECK

- `payments_amount_check` : `amount >= 0`
- `payments_status_check` : `status IN ('pending', 'completed', 'failed', 'refunded')`

#### Indexes

- `payments_pkey` : UNIQUE INDEX sur `id`
- `idx_payments_booking` : INDEX sur `booking_id`

---

### 2.10 Table `reviews`

**Type** : BASE TABLE  
**Lignes** : 0  
**Taille** : 0.0 B  
**RLS** : ✅ **ENABLED**

#### Colonnes

| Nom | Type | Nullable | Default | Primary Key | Position |
|-----|------|----------|---------|-------------|----------|
| `id` | `uuid` | ❌ | `gen_random_uuid()` | ✅ | 1 |
| `booking_id` | `uuid` | ❌ | - | ❌ | 2 |
| `user_id` | `uuid` | ❌ | - | ❌ | 3 |
| `vehicle_id` | `uuid` | ❌ | - | ❌ | 4 |
| `rating` | `integer` | ❌ | - | ❌ | 5 |
| `comment` | `text` | ✅ | - | ❌ | 6 |
| `created_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 7 |
| `updated_at` | `timestamp with time zone` | ✅ | `now()` | ❌ | 8 |

#### Clés Primaires

- `id` (uuid)

#### Clés Étrangères

- `reviews_booking_id_fkey` : `booking_id` → `bookings(id)` ON DELETE CASCADE
- `reviews_user_id_fkey` : `user_id` → `auth.users(id)` ON DELETE CASCADE
- `reviews_vehicle_id_fkey` : `vehicle_id` → `vehicles(id)` ON DELETE CASCADE

#### Contraintes CHECK

- `reviews_rating_check` : `rating >= 1 AND rating <= 5`

#### Indexes

- `reviews_pkey` : UNIQUE INDEX sur `id`
- `idx_reviews_vehicle` : INDEX sur `vehicle_id`

---

## 🔒 3. RLS (Row Level Security) & Policies

### 3.1 Statut RLS par Table

| Table | RLS Status |
|-------|------------|
| `bookings` | ✅ **ENABLED** |
| `checkin_depart` | ❌ **DISABLED** |
| `checkin_return` | ❌ **DISABLED** |
| `conversations` | ✅ **ENABLED** |
| `messages` | ✅ **ENABLED** |
| `payments` | ✅ **ENABLED** |
| `profiles` | ✅ **ENABLED** |
| `reviews` | ✅ **ENABLED** |
| `vehicle_photos` | ✅ **ENABLED** |
| `vehicles` | ❌ **DISABLED** |

### 3.2 Policies Détaillées

#### Table `bookings` (9 policies)

1. **`Users can create bookings`**
   - **Type** : INSERT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `auth.uid() = user_id`

2. **`Users can update their bookings`**
   - **Type** : UPDATE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

3. **`Users can view their bookings`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

4. **`owners_can_update_vehicle_bookings_status`**
   - **Type** : UPDATE
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **USING** : `EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid())`
   - **WITH CHECK** : `EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid())`

5. **`owners_can_view_vehicle_bookings`**
   - **Type** : SELECT
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **USING** : `EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid())`

6. **`renters_can_delete_own_bookings`**
   - **Type** : DELETE
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

7. **`renters_can_insert_own_bookings`**
   - **Type** : INSERT
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `auth.uid() = user_id`

8. **`renters_can_update_own_bookings`**
   - **Type** : UPDATE
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

9. **`renters_can_view_own_bookings`**
   - **Type** : SELECT
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

#### Table `conversations` (3 policies)

1. **`Users can update their own conversations`**
   - **Type** : UPDATE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `(renter_id = auth.uid()) OR (owner_id = auth.uid())`

2. **`Users can view conversations they participate in`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `(renter_id = auth.uid()) OR (owner_id = auth.uid())`

3. **`owners or renters can create conversations`**
   - **Type** : INSERT
   - **Rôles** : `authenticated`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `(auth.uid() = owner_id) OR (auth.uid() = renter_id)`

#### Table `messages` (3 policies)

1. **`Users can send messages in their conversations`**
   - **Type** : INSERT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `(sender_id = auth.uid()) AND (conversation_id IN (SELECT conversations.id FROM conversations WHERE conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid()))`

2. **`Users can update their own messages`**
   - **Type** : UPDATE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `sender_id = auth.uid()`

3. **`Users can view messages from their conversations`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `conversation_id IN (SELECT conversations.id FROM conversations WHERE conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())`

#### Table `payments` (1 policy)

1. **`Users can view their payments`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())`

#### Table `profiles` (1 policy)

1. **`profiles_all_access`**
   - **Type** : ALL (SELECT, INSERT, UPDATE, DELETE)
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `true`
   - **WITH CHECK** : `true`

#### Table `reviews` (4 policies)

1. **`Anyone can view reviews`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `true`

2. **`Users can create reviews for their bookings`**
   - **Type** : INSERT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `(auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id AND bookings.user_id = auth.uid() AND bookings.status = 'completed'))`

3. **`Users can delete their reviews`**
   - **Type** : DELETE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

4. **`Users can update their reviews`**
   - **Type** : UPDATE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = user_id`

#### Table `vehicle_photos` (4 policies)

1. **`Owners can delete vehicle photos`**
   - **Type** : DELETE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid())`

2. **`Owners can insert vehicle photos`**
   - **Type** : INSERT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid())`

3. **`Owners can update vehicle photos`**
   - **Type** : UPDATE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid())`

4. **`Photos are viewable by everyone`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `true`

#### Table `vehicles` (4 policies)

1. **`Anyone can view available vehicles`**
   - **Type** : SELECT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `available = true`

2. **`Authenticated users can insert vehicles`**
   - **Type** : INSERT
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **WITH CHECK** : `auth.uid() = owner_id`

3. **`Owners can delete their vehicles`**
   - **Type** : DELETE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = owner_id`

4. **`Owners can update their vehicles`**
   - **Type** : UPDATE
   - **Rôles** : `public`
   - **Permissive** : PERMISSIVE
   - **USING** : `auth.uid() = owner_id`

**Note** : La table `vehicles` a des policies mais RLS est **DISABLED**, donc les policies ne sont pas actives.

---

## ⚙️ 4. Triggers

**Total** : 4 triggers

### 4.1 Trigger `update_conversations_updated_at`

- **Table** : `conversations`
- **Événement** : UPDATE
- **Timing** : BEFORE
- **Orientation** : ROW
- **Fonction** : `update_updated_at_column()`

### 4.2 Trigger `trigger_sync_profile_is_admin` (INSERT)

- **Table** : `profiles`
- **Événement** : INSERT
- **Timing** : AFTER
- **Orientation** : ROW
- **Fonction** : `sync_profile_is_admin()`

### 4.3 Trigger `trigger_sync_profile_is_admin` (UPDATE)

- **Table** : `profiles`
- **Événement** : UPDATE
- **Timing** : AFTER
- **Orientation** : ROW
- **Fonction** : `sync_profile_is_admin()`

### 4.4 Trigger `update_profiles_updated_at`

- **Table** : `profiles`
- **Événement** : UPDATE
- **Timing** : BEFORE
- **Orientation** : ROW
- **Fonction** : `update_updated_at_column()`

---

## 🔧 5. Fonctions Custom

**Total** : 8 fonctions

### 5.1 `handle_new_user()`

**Signature** : `handle_new_user() RETURNS trigger`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier si l'utilisateur existe déjà dans profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id, 
      email, 
      first_name, 
      last_name, 
      phone, 
      role, 
      kyc_status,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
      COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
      'renter',
      'pending',
      NOW()
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne pas faire échouer l'inscription
    RAISE WARNING 'Erreur lors de la création du profil pour l''utilisateur %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$
```

**Description** : Crée automatiquement un profil dans `profiles` lors de la création d'un nouvel utilisateur dans `auth.users`.

### 5.2 `normalize_text(input_text text)`

**Signature** : `normalize_text(input_text text) RETURNS text`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.normalize_text(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN LOWER(UNACCENT(input_text));
END;
$function$
```

**Description** : Normalise un texte en le convertissant en minuscules et en supprimant les accents.

### 5.3 `sync_profile_is_admin()`

**Signature** : `sync_profile_is_admin() RETURNS trigger`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.sync_profile_is_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{is_admin}',
    to_jsonb(new.is_admin)
  )
  where id = new.id;

  return new;
end;
$function$
```

**Description** : Synchronise le champ `is_admin` de `profiles` vers `auth.users.raw_app_meta_data.is_admin`.

### 5.4 `unaccent(text)`

**Signature** : `unaccent(text) RETURNS text`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
```

**Description** : Fonction C de l'extension `unaccent` pour supprimer les accents.

### 5.5 `unaccent(regdictionary, text)`

**Signature** : `unaccent(regdictionary, text) RETURNS text`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
```

**Description** : Variante de `unaccent` avec dictionnaire personnalisé.

### 5.6 `unaccent_init(internal)`

**Signature** : `unaccent_init(internal) RETURNS internal`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$
```

**Description** : Fonction d'initialisation de l'extension `unaccent`.

### 5.7 `unaccent_lexize(internal, internal, internal, internal)`

**Signature** : `unaccent_lexize(internal, internal, internal, internal) RETURNS internal`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$
```

**Description** : Fonction de lexique de l'extension `unaccent`.

### 5.8 `update_updated_at_column()`

**Signature** : `update_updated_at_column() RETURNS trigger`

**Code SQL** :
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
```

**Description** : Met à jour automatiquement le champ `updated_at` lors d'une modification.

---

## 📦 6. Types Enum Custom

**Total** : 0 types enum custom

Aucun type enum custom n'est défini dans le schéma `public`. Les valeurs énumérées sont gérées via des contraintes CHECK.

---

## 🗄️ 7. Storage Buckets

**Total** : 4 buckets

### 7.1 Bucket `avatars`

- **ID** : `avatars`
- **Nom** : `avatars`
- **Public** : ✅ Oui
- **Limite de taille** : 5 MB (5,242,880 bytes)
- **Types MIME autorisés** : `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### 7.2 Bucket `checkin-photos`

- **ID** : `checkin-photos`
- **Nom** : `checkin-photos`
- **Public** : ✅ Oui
- **Limite de taille** : 100 MB (104,857,600 bytes)
- **Types MIME autorisés** : `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`

### 7.3 Bucket `driver-licenses`

- **ID** : `driver-licenses`
- **Nom** : `driver-licenses`
- **Public** : ✅ Oui
- **Limite de taille** : 10 MB (10,485,760 bytes)
- **Types MIME autorisés** : `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`

### 7.4 Bucket `vehicle-photos`

- **ID** : `vehicle-photos`
- **Nom** : `vehicle-photos`
- **Public** : ✅ Oui
- **Limite de taille** : 10 MB (10,485,760 bytes)
- **Types MIME autorisés** : `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### 7.5 Policies Storage

**Note** : Les policies storage ne sont pas accessibles via la table `storage.policies` (relation n'existe pas). Les policies storage sont gérées via l'API Supabase Storage.

---

## 📊 8. Résumé Statistique

- **Tables** : 10
- **Lignes de données** : 38 (bookings: 6, checkin_depart: 3, checkin_return: 1, conversations: 6, messages: 6, profiles: 5, vehicles: 11)
- **Taille totale** : 104.0 KB
- **RLS Policies** : 29
- **Tables avec RLS activé** : 7/10
- **Tables sans RLS** : 3/10 (checkin_depart, checkin_return, vehicles)
- **Triggers** : 4
- **Fonctions custom** : 8
- **Indexes** : 42
- **Contraintes** : 50+ (PK, FK, CHECK, UNIQUE)
- **Storage Buckets** : 4
- **Types Enum** : 0

---

## ✅ 9. Conclusion

Ce diagnostic complet du schéma Supabase du projet Rentanoo (`zykwfjxurwmputxwlkxs`) a été effectué en **lecture seule** sans aucune modification.

**Toutes les informations nécessaires pour recréer le schéma sont documentées ci-dessus.**

---

**Date de génération** : 2025-01-27  
**Méthode** : Outils MCP Supabase via Rube/Composio  
**Statut** : ✅ Diagnostic complet terminé

