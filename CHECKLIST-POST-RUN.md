# ✅ Checklist Post-Run - Validation du Schéma

**Date** : 2025-01-27  
**Projet** : `tbsgzykqcksmqxpimwry`  
**Script** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql`

---

## 📋 Requêtes de Validation

### 1. Vérification des Tables

```sql
-- Vérifier que toutes les 10 tables sont présentes
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'profiles', 'vehicles', 'bookings', 'conversations', 
        'messages', 'checkin_depart', 'checkin_return', 
        'vehicle_photos', 'payments', 'reviews'
    )
ORDER BY tablename;
```

**Résultat attendu** :
- 10 tables présentes
- RLS Status:
  - `ENABLED`: bookings, conversations, messages, payments, profiles, reviews, vehicle_photos
  - `DISABLED`: checkin_depart, checkin_return, vehicles

---

### 2. Vérification des Policies RLS

```sql
-- Vérifier que toutes les 29 policies sont présentes
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Résultat attendu** :
- **bookings**: 9 policies
  - Users can create bookings (INSERT, public)
  - Users can update their bookings (UPDATE, public)
  - Users can view their bookings (SELECT, public)
  - owners_can_update_vehicle_bookings_status (UPDATE, authenticated)
  - owners_can_view_vehicle_bookings (SELECT, authenticated)
  - renters_can_delete_own_bookings (DELETE, authenticated)
  - renters_can_insert_own_bookings (INSERT, authenticated)
  - renters_can_update_own_bookings (UPDATE, authenticated)
  - renters_can_view_own_bookings (SELECT, authenticated)

- **conversations**: 3 policies
  - Users can update their own conversations (UPDATE, public)
  - Users can view conversations they participate in (SELECT, public)
  - owners or renters can create conversations (INSERT, authenticated)

- **messages**: 3 policies
  - Users can send messages in their conversations (INSERT, public)
  - Users can update their own messages (UPDATE, public)
  - Users can view messages from their conversations (SELECT, public)

- **payments**: 1 policy
  - Users can view their payments (SELECT, public)

- **profiles**: 1 policy
  - profiles_all_access (ALL, public)

- **reviews**: 4 policies
  - Anyone can view reviews (SELECT, public)
  - Users can create reviews for their bookings (INSERT, public)
  - Users can delete their reviews (DELETE, public)
  - Users can update their reviews (UPDATE, public)

- **vehicle_photos**: 4 policies
  - Owners can delete vehicle photos (DELETE, public)
  - Owners can insert vehicle photos (INSERT, public)
  - Owners can update vehicle photos (UPDATE, public)
  - Photos are viewable by everyone (SELECT, public)

- **vehicles**: 4 policies
  - Anyone can view available vehicles (SELECT, public)
  - Authenticated users can insert vehicles (INSERT, public)
  - Owners can delete their vehicles (DELETE, public)
  - Owners can update their vehicles (UPDATE, public)

**Total attendu** : 29 policies

---

### 3. Vérification des Fonctions, Triggers et Extensions

```sql
-- Vérifier les extensions
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'unaccent')
ORDER BY extname;

-- Vérifier les fonctions custom
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.proname NOT LIKE 'pg_%'
    AND p.proname IN ('update_updated_at_column', 'handle_new_user', 'sync_profile_is_admin', 'normalize_text')
ORDER BY p.proname;

-- Vérifier les triggers
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Résultat attendu** :
- **Extensions**: uuid-ossp, pgcrypto, unaccent (3 extensions)
- **Fonctions**: 
  - update_updated_at_column()
  - handle_new_user()
  - sync_profile_is_admin()
  - normalize_text(input_text text)
- **Triggers**: 
  - update_conversations_updated_at (conversations, UPDATE)
  - update_profiles_updated_at (profiles, UPDATE)
  - trigger_sync_profile_is_admin (profiles, INSERT)
  - trigger_sync_profile_is_admin (profiles, UPDATE)

---

## ⚠️ Actions Manuelles Requises

### 1. Attacher le trigger `handle_new_user()` à `auth.users`

Le trigger doit être créé dans le schéma `auth` :

```sql
-- À exécuter avec les permissions appropriées (service_role)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

**Note** : Cette opération nécessite des permissions élevées (service_role). Elle peut être effectuée via :
- Le SQL Editor du dashboard Supabase (avec service_role)
- L'API Supabase Management
- La CLI Supabase

---

### 2. Créer les Storage Buckets

Les buckets doivent être créés via l'API Supabase Storage ou le dashboard. Configuration requise :

#### Bucket `avatars`
- **Public** : Oui
- **Limite de taille** : 5 MB (5,242,880 bytes)
- **Types MIME** : `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

#### Bucket `checkin-photos`
- **Public** : Oui
- **Limite de taille** : 100 MB (104,857,600 bytes)
- **Types MIME** : `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`

#### Bucket `driver-licenses`
- **Public** : Oui
- **Limite de taille** : 10 MB (10,485,760 bytes)
- **Types MIME** : `application/pdf`, `image/jpeg`, `image/jpg`, `image/png`

#### Bucket `vehicle-photos`
- **Public** : Oui
- **Limite de taille** : 10 MB (10,485,760 bytes)
- **Types MIME** : `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

---

## ✅ Validation Finale

Une fois toutes les vérifications effectuées et les actions manuelles complétées, le schéma devrait être **identique** au schéma de référence du projet Rentanoo (`zykwfjxurwmputxwlkxs`).

**Statut attendu** :
- ✅ 10 tables créées
- ✅ 29 policies RLS créées
- ✅ 4 triggers créés
- ✅ 4 fonctions custom créées
- ✅ 3 extensions installées
- ✅ RLS activé/désactivé selon la référence
- ⚠️  Trigger `handle_new_user()` sur `auth.users` (action manuelle)
- ⚠️  4 buckets storage (action manuelle)

---

**Date de génération** : 2025-01-27

