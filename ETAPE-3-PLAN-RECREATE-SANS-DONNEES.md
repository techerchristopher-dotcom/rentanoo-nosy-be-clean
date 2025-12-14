# 📋 Plan de Recréation du Schéma Rentanoo (Sans Données)

**Date** : 2025-01-27  
**Projet** : `zykwfjxurwmputxwlkxs`  
**Objectif** : Recréer le schéma complet de Rentanoo sans exporter/importer de données

---

## ⚠️ PRÉREQUIS BLOQUANTS

### ❌ Connexion au mauvais projet

**Problème détecté** :
- Le fichier `supabase/config.toml` pointe vers `zykwfjxurwmputxwlkxs` ✅
- Mais la connexion MCP Supabase est connectée à `slkgokhcaflhdfcqlucp` ❌

**Action requise AVANT d'exécuter ce plan** :
1. Vérifier que la connexion MCP Supabase pointe vers le projet `zykwfjxurwmputxwlkxs`
2. Vérifier que les variables d'environnement contiennent :
   ```
   VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
   ```
3. Refaire le diagnostic sur le **bon projet** pour confirmer l'état réel

---

## 📐 Plan d'Exécution Ordonné

### Étape 1 : Extensions PostgreSQL

**Ordre** : À exécuter en premier (dépendances pour les autres objets)

```sql
-- Vérifier que les extensions nécessaires sont installées
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**Extensions déjà installées** (d'après le diagnostic) :
- ✅ `uuid-ossp` (v1.1)
- ✅ `pgcrypto` (v1.3)

**Action** : Vérifier uniquement, pas besoin de créer.

---

### Étape 2 : Fonctions Custom

**Ordre** : À créer avant les triggers (les triggers dépendent des fonctions)

#### 2.1 Fonction de mise à jour automatique de `updated_at`

```sql
-- Fonction générique pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Utilisation** : Cette fonction sera utilisée par les triggers de toutes les tables avec `updated_at`.

---

### Étape 3 : Tables (Schéma Public)

**Ordre** : Créer les tables dans l'ordre des dépendances (tables référencées en premier)

#### 3.1 Table `profiles`

**Dépendances** : Aucune (référence `auth.users` qui existe déjà)

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('renter', 'owner', 'admin')),
    kyc_status TEXT CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    avatar_url TEXT,
    birthdate DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    place_of_birth TEXT,
    address_line1 TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT,
    driver_license_number TEXT,
    driver_license_issue_date DATE,
    driver_license_country TEXT,
    driver_license_file_path TEXT,
    full_name TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
            THEN first_name || ' ' || last_name
            ELSE NULL
        END
    ) STORED
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
```

#### 3.2 Table `vehicles`

**Dépendances** : `profiles` (via `owner_id`)

```sql
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT,
    year INTEGER NOT NULL,
    mileage INTEGER,
    price_per_day NUMERIC(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT,
    location TEXT,
    pickup_zones TEXT[],
    seats INTEGER,
    doors INTEGER,
    transmission TEXT,
    fuel_type TEXT,
    engine_capacity TEXT,
    rental_count INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    status TEXT CHECK (status IN ('active', 'inactive', 'review')) DEFAULT 'active',
    has_ac BOOLEAN,
    has_gps BOOLEAN,
    has_cruise_control BOOLEAN,
    has_bluetooth BOOLEAN,
    has_carplay BOOLEAN,
    has_audio_input BOOLEAN,
    vehicle_category TEXT,
    -- Remises
    low_season_discount NUMERIC(5, 2),
    high_season_surcharge NUMERIC(5, 2),
    long_duration_discount_14 NUMERIC(5, 2),
    long_duration_discount_60 NUMERIC(5, 2),
    -- Services Aéroport
    airport_pickup_service BOOLEAN,
    airport_pickup_retrieval BOOLEAN,
    airport_pickup_retrieval_free BOOLEAN,
    airport_pickup_retrieval_price NUMERIC(10, 2),
    airport_pickup_return BOOLEAN,
    airport_pickup_return_free BOOLEAN,
    airport_pickup_return_price NUMERIC(10, 2),
    -- Services Barge Petite Terre
    barge_petite_terre_service BOOLEAN,
    barge_petite_terre_retrieval BOOLEAN,
    barge_petite_terre_retrieval_free BOOLEAN,
    barge_petite_terre_retrieval_price NUMERIC(10, 2),
    barge_petite_terre_return BOOLEAN,
    barge_petite_terre_return_free BOOLEAN,
    barge_petite_terre_return_price NUMERIC(10, 2),
    -- Services Barge Grande Terre
    barge_grande_terre_service BOOLEAN,
    barge_grande_terre_retrieval BOOLEAN,
    barge_grande_terre_retrieval_free BOOLEAN,
    barge_grande_terre_retrieval_price NUMERIC(10, 2),
    barge_grande_terre_return BOOLEAN,
    barge_grande_terre_return_free BOOLEAN,
    barge_grande_terre_return_price NUMERIC(10, 2),
    -- Services Livraison à domicile
    home_delivery_service BOOLEAN,
    home_delivery_pickup BOOLEAN,
    home_delivery_pickup_free BOOLEAN,
    home_delivery_pickup_price NUMERIC(10, 2),
    home_delivery_return BOOLEAN,
    home_delivery_return_free BOOLEAN,
    home_delivery_return_price NUMERIC(10, 2),
    -- Services Siège bébé
    baby_seat_service BOOLEAN,
    baby_seat_free BOOLEAN,
    baby_seat_price NUMERIC(10, 2),
    -- Services Conducteur additionnel
    additional_driver_service BOOLEAN,
    additional_driver_free BOOLEAN,
    additional_driver_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_available ON public.vehicles(available);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON public.vehicles(location);
```

#### 3.3 Table `bookings`

**Dépendances** : `profiles` (via `user_id`), `vehicles` (via `vehicle_id`)

```sql
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    pickup_location TEXT,
    total_price NUMERIC(10, 2) NOT NULL,
    base_price NUMERIC(10, 2),
    options_total NUMERIC(10, 2),
    service_fee NUMERIC(10, 2),
    subtotal NUMERIC(10, 2),
    price_per_day NUMERIC(10, 2),
    rental_days INTEGER,
    reference_number INTEGER,
    status TEXT,
    selected_options JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_number ON public.bookings(reference_number);
```

#### 3.4 Table `conversations`

**Dépendances** : `profiles` (via `renter_id`, `owner_id`), `vehicles` (via `vehicle_id`), `bookings` (via `booking_id`, optionnel)

```sql
-- Supprimer l'ancienne table si elle existe (avec le mauvais schéma)
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('active', 'closed', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_conversations_vehicle_id ON public.conversations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_conversations_renter_id ON public.conversations(renter_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
```

#### 3.5 Table `messages`

**Dépendances** : `conversations` (via `conversation_id`), `profiles` (via `sender_id`)

```sql
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
```

#### 3.6 Table `checkin_depart`

**Dépendances** : `bookings` (via `booking_id`), `profiles` (via `owner_id`, `renter_id`)

```sql
CREATE TABLE IF NOT EXISTS public.checkin_depart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    renter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT,
    data JSONB,
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
    driver_email TEXT,
    driver_first_name TEXT,
    driver_last_name TEXT,
    driver_phone TEXT,
    driver_birthdate DATE,
    driver_license_number TEXT,
    driver_license_issue_date DATE,
    driver_license_country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_checkin_depart_booking_id ON public.checkin_depart(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkin_depart_owner_id ON public.checkin_depart(owner_id);
CREATE INDEX IF NOT EXISTS idx_checkin_depart_renter_id ON public.checkin_depart(renter_id);
```

#### 3.7 Table `checkin_return`

**Dépendances** : `bookings` (via `booking_id`), `profiles` (via `owner_id`, `renter_id`)

```sql
CREATE TABLE IF NOT EXISTS public.checkin_return (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    renter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT,
    data JSONB,
    kilometrage_retour INTEGER,
    niveau_carburant_retour INTEGER,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_checkin_return_booking_id ON public.checkin_return(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkin_return_owner_id ON public.checkin_return(owner_id);
CREATE INDEX IF NOT EXISTS idx_checkin_return_renter_id ON public.checkin_return(renter_id);
```

#### 3.8 Table `vehicle_photos` (si nécessaire)

**Dépendances** : `vehicles` (via `vehicle_id`)

```sql
CREATE TABLE IF NOT EXISTS public.vehicle_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT CHECK (photo_type IN ('exterior', 'interior', 'dashboard', 'engine', 'other')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id ON public.vehicle_photos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_display_order ON public.vehicle_photos(vehicle_id, display_order);
```

---

### Étape 4 : Triggers

**Ordre** : À créer après les tables et les fonctions

```sql
-- Trigger pour profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour vehicles
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour bookings
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour conversations
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour checkin_depart
CREATE TRIGGER update_checkin_depart_updated_at
    BEFORE UPDATE ON public.checkin_depart
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour checkin_return
CREATE TRIGGER update_checkin_return_updated_at
    BEFORE UPDATE ON public.checkin_return
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### Étape 5 : RLS (Row Level Security)

**Ordre** : À configurer après la création des tables

#### 5.1 Activer RLS sur les tables

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_depart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_return ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;
```

#### 5.2 Policies pour `profiles`

```sql
-- Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
```

#### 5.3 Policies pour `vehicles`

```sql
-- Tout le monde peut lire les véhicules disponibles
CREATE POLICY "Anyone can read available vehicles"
    ON public.vehicles
    FOR SELECT
    USING (available = true AND status = 'active');

-- Les propriétaires peuvent lire leurs propres véhicules
CREATE POLICY "Owners can read own vehicles"
    ON public.vehicles
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Les propriétaires peuvent créer leurs propres véhicules
CREATE POLICY "Owners can insert own vehicles"
    ON public.vehicles
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Les propriétaires peuvent mettre à jour leurs propres véhicules
CREATE POLICY "Owners can update own vehicles"
    ON public.vehicles
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Les propriétaires peuvent supprimer leurs propres véhicules
CREATE POLICY "Owners can delete own vehicles"
    ON public.vehicles
    FOR DELETE
    USING (auth.uid() = owner_id);
```

#### 5.4 Policies pour `bookings`

```sql
-- Les utilisateurs peuvent lire leurs propres réservations
CREATE POLICY "Users can read own bookings"
    ON public.bookings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Les propriétaires peuvent lire les réservations de leurs véhicules
CREATE POLICY "Owners can read bookings for their vehicles"
    ON public.bookings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vehicles
            WHERE vehicles.id = bookings.vehicle_id
            AND vehicles.owner_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent créer leurs propres réservations
CREATE POLICY "Users can insert own bookings"
    ON public.bookings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent mettre à jour leurs propres réservations
CREATE POLICY "Users can update own bookings"
    ON public.bookings
    FOR UPDATE
    USING (auth.uid() = user_id);
```

#### 5.5 Policies pour `conversations`

```sql
-- Les participants peuvent lire leurs conversations
CREATE POLICY "Participants can read own conversations"
    ON public.conversations
    FOR SELECT
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Les participants peuvent créer des conversations
CREATE POLICY "Participants can insert conversations"
    ON public.conversations
    FOR INSERT
    WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Les participants peuvent mettre à jour leurs conversations
CREATE POLICY "Participants can update own conversations"
    ON public.conversations
    FOR UPDATE
    USING (auth.uid() = renter_id OR auth.uid() = owner_id);
```

#### 5.6 Policies pour `messages`

```sql
-- Les participants peuvent lire les messages de leurs conversations
CREATE POLICY "Participants can read messages"
    ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
        )
    );

-- Les participants peuvent envoyer des messages
CREATE POLICY "Participants can insert messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())
        )
    );
```

#### 5.7 Policies pour `checkin_depart` et `checkin_return`

```sql
-- Les participants peuvent lire leurs états des lieux
CREATE POLICY "Participants can read checkin_depart"
    ON public.checkin_depart
    FOR SELECT
    USING (auth.uid() = owner_id OR auth.uid() = renter_id);

CREATE POLICY "Participants can read checkin_return"
    ON public.checkin_return
    FOR SELECT
    USING (auth.uid() = owner_id OR auth.uid() = renter_id);

-- Les participants peuvent créer leurs états des lieux
CREATE POLICY "Participants can insert checkin_depart"
    ON public.checkin_depart
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id OR auth.uid() = renter_id);

CREATE POLICY "Participants can insert checkin_return"
    ON public.checkin_return
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id OR auth.uid() = renter_id);

-- Les participants peuvent mettre à jour leurs états des lieux
CREATE POLICY "Participants can update checkin_depart"
    ON public.checkin_depart
    FOR UPDATE
    USING (auth.uid() = owner_id OR auth.uid() = renter_id);

CREATE POLICY "Participants can update checkin_return"
    ON public.checkin_return
    FOR UPDATE
    USING (auth.uid() = owner_id OR auth.uid() = renter_id);
```

#### 5.8 Policies pour `vehicle_photos`

```sql
-- Tout le monde peut lire les photos des véhicules disponibles
CREATE POLICY "Anyone can read vehicle photos"
    ON public.vehicle_photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vehicles
            WHERE vehicles.id = vehicle_photos.vehicle_id
            AND vehicles.available = true
            AND vehicles.status = 'active'
        )
    );

-- Les propriétaires peuvent gérer les photos de leurs véhicules
CREATE POLICY "Owners can manage own vehicle photos"
    ON public.vehicle_photos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.vehicles
            WHERE vehicles.id = vehicle_photos.vehicle_id
            AND vehicles.owner_id = auth.uid()
        )
    );
```

---

### Étape 6 : Storage Buckets

**Ordre** : À créer après la configuration de RLS

#### 6.1 Créer les buckets

```sql
-- Bucket pour les photos de véhicules
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicle-photos',
    'vehicle-photos',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les permis de conduire
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'driver-licenses',
    'driver-licenses',
    false, -- Privé (données sensibles)
    2097152, -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les photos d'état des lieux
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'checkin-photos',
    'checkin-photos',
    false, -- Privé (données sensibles)
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

#### 6.2 Policies Storage (à configurer via l'interface Supabase ou SQL)

**Note** : Les policies storage sont généralement configurées via l'interface Supabase Dashboard ou via des migrations. Voici des exemples de policies :

```sql
-- Policy pour vehicle-photos (public, lecture pour tous)
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'vehicle-photos');

-- Policy pour driver-licenses (privé, accès propriétaire uniquement)
CREATE POLICY "Users can upload own driver license"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'driver-licenses'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can read own driver license"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'driver-licenses'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy pour checkin-photos (privé, accès participants)
CREATE POLICY "Participants can upload checkin photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'checkin-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Participants can read checkin photos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'checkin-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy pour avatars (public, lecture pour tous, upload propriétaire)
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
```

---

## 📝 Script SQL Complet (Schema Only)

Un script SQL complet sera généré dans un fichier séparé une fois la connexion au bon projet confirmée.

**Structure du script** :
1. Extensions (vérification uniquement)
2. Fonctions custom
3. Tables (dans l'ordre des dépendances)
4. Index
5. Triggers
6. RLS (activation + policies)
7. Storage buckets + policies

---

## ✅ Checklist d'Exécution

- [ ] **URGENT** : Vérifier la connexion au projet `zykwfjxurwmputxwlkxs`
- [ ] **URGENT** : Vérifier les variables d'environnement
- [ ] Refaire le diagnostic sur le bon projet
- [ ] Exécuter le script d'extensions
- [ ] Exécuter le script de fonctions
- [ ] Exécuter le script de tables (dans l'ordre)
- [ ] Exécuter le script de triggers
- [ ] Exécuter le script de RLS
- [ ] Exécuter le script de storage
- [ ] Tester les accès (lecture/écriture)
- [ ] Vérifier les performances (index)

---

## ⚠️ Notes Importantes

1. **Aucune donnée ne sera exportée/importée** : Ce plan crée uniquement le schéma vide
2. **Les données existantes seront perdues** si des tables avec le même nom existent déjà (DROP TABLE)
3. **Les RLS policies doivent être testées** après création pour s'assurer qu'elles fonctionnent correctement
4. **Les storage policies** peuvent nécessiter des ajustements selon les besoins spécifiques
5. **Les triggers** mettront automatiquement à jour `updated_at` sur toutes les tables concernées

---

**⚠️ ATTENTION** : Ce plan ne doit être exécuté qu'après avoir confirmé la connexion au **bon projet Supabase** (`zykwfjxurwmputxwlkxs`).

