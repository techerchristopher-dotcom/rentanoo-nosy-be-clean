-- ============================================================================
-- SCRIPT D'ALIGNEMENT RLS + POLICIES
-- Projet DESTINATION: tbsgzykqcksmqxpimwry
-- Alignement sur projet SOURCE: zykwfjxurwmputxwlkxs
-- Date: 2025-01-27
-- ============================================================================
-- MODE: NON-DESTRUCTIF - Aucune suppression de données
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: ALIGNEMENT RLS (STRUCTURE SEULE)
-- ============================================================================

-- Désactiver RLS sur les tables qui doivent l'avoir OFF (SOURCE)
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_depart DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_return DISABLE ROW LEVEL SECURITY;

-- Activer RLS sur les tables qui doivent l'avoir ON (SOURCE)
-- Note: Ces tables ont déjà RLS activé, mais on les réactive pour être sûr
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 2: SUPPRESSION DES POLICIES EXISTANTES (DESTINATION)
-- ============================================================================

-- Table: bookings
DROP POLICY IF EXISTS "bookings_delete_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;

-- Table: checkin_depart
DROP POLICY IF EXISTS "checkin_depart_insert_admin" ON public.checkin_depart;
DROP POLICY IF EXISTS "checkin_depart_select_own_or_admin" ON public.checkin_depart;
DROP POLICY IF EXISTS "checkin_depart_update_admin" ON public.checkin_depart;

-- Table: checkin_return
DROP POLICY IF EXISTS "checkin_return_insert_admin" ON public.checkin_return;
DROP POLICY IF EXISTS "checkin_return_select_own_or_admin" ON public.checkin_return;
DROP POLICY IF EXISTS "checkin_return_update_admin" ON public.checkin_return;

-- Table: conversations
DROP POLICY IF EXISTS "conversations_insert_customer_or_admin" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participant_or_admin" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant_or_admin" ON public.conversations;

-- Table: messages
DROP POLICY IF EXISTS "messages_delete_admin" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant_or_admin" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participant_or_admin" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender_or_admin" ON public.messages;

-- Table: profiles
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_temp_self_promote_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;

-- Table: vehicle_photos
DROP POLICY IF EXISTS "vehicle_photos_delete_admin" ON public.vehicle_photos;
DROP POLICY IF EXISTS "vehicle_photos_insert_admin" ON public.vehicle_photos;
DROP POLICY IF EXISTS "vehicle_photos_select_public" ON public.vehicle_photos;
DROP POLICY IF EXISTS "vehicle_photos_update_admin" ON public.vehicle_photos;

-- Table: vehicles
DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select_public" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;

-- Table: payments (si policies existent)
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;

-- Table: reviews (si policies existent)
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews for their bookings" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their reviews" ON public.reviews;

-- ============================================================================
-- ÉTAPE 3: CRÉATION DES POLICIES (ALIGNÉES SUR SOURCE)
-- ============================================================================

-- ============================================================================
-- TABLE: bookings (9 policies)
-- ============================================================================

CREATE POLICY "Users can create bookings"
ON public.bookings FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their bookings"
ON public.bookings FOR UPDATE
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their bookings"
ON public.bookings FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "owners_can_update_vehicle_bookings_status"
ON public.bookings FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "owners_can_view_vehicle_bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "renters_can_delete_own_bookings"
ON public.bookings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "renters_can_insert_own_bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "renters_can_update_own_bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "renters_can_view_own_bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: conversations (3 policies)
-- NOTE: Adaptation customer_id/admin_id (DEST) vs renter_id/owner_id (SOURCE)
-- ============================================================================

CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
TO public
USING ((customer_id = auth.uid()) OR (admin_id = auth.uid()));

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
TO public
USING ((customer_id = auth.uid()) OR (admin_id = auth.uid()));

CREATE POLICY "owners or renters can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = admin_id) OR (auth.uid() = customer_id));

-- ============================================================================
-- TABLE: messages (3 policies)
-- ============================================================================

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
TO public
WITH CHECK ((sender_id = auth.uid()) AND (conversation_id IN (SELECT conversations.id FROM conversations WHERE conversations.customer_id = auth.uid() OR conversations.admin_id = auth.uid())));

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
TO public
USING (sender_id = auth.uid());

CREATE POLICY "Users can view messages from their conversations"
ON public.messages FOR SELECT
TO public
USING (conversation_id IN (SELECT conversations.id FROM conversations WHERE conversations.customer_id = auth.uid() OR conversations.admin_id = auth.uid()));

-- ============================================================================
-- TABLE: payments (1 policy)
-- ============================================================================

CREATE POLICY "Users can view their payments"
ON public.payments FOR SELECT
TO public
USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));

-- ============================================================================
-- TABLE: profiles (1 policy)
-- ============================================================================

CREATE POLICY "profiles_all_access"
ON public.profiles FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TABLE: reviews (4 policies)
-- ============================================================================

CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can create reviews for their bookings"
ON public.reviews FOR INSERT
TO public
WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id AND bookings.user_id = auth.uid() AND bookings.status = 'completed')));

CREATE POLICY "Users can delete their reviews"
ON public.reviews FOR DELETE
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their reviews"
ON public.reviews FOR UPDATE
TO public
USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE: vehicle_photos (4 policies)
-- ============================================================================

CREATE POLICY "Owners can delete vehicle photos"
ON public.vehicle_photos FOR DELETE
TO public
USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Owners can insert vehicle photos"
ON public.vehicle_photos FOR INSERT
TO public
WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Owners can update vehicle photos"
ON public.vehicle_photos FOR UPDATE
TO public
USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid()));

CREATE POLICY "Photos are viewable by everyone"
ON public.vehicle_photos FOR SELECT
TO public
USING (true);

-- ============================================================================
-- TABLE: vehicles (4 policies)
-- NOTE: RLS est DISABLED sur cette table, mais les policies sont créées
-- ============================================================================

CREATE POLICY "Anyone can view available vehicles"
ON public.vehicles FOR SELECT
TO public
USING (is_available = true);

CREATE POLICY "Authenticated users can insert vehicles"
ON public.vehicles FOR INSERT
TO public
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their vehicles"
ON public.vehicles FOR DELETE
TO public
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their vehicles"
ON public.vehicles FOR UPDATE
TO public
USING (auth.uid() = owner_id);

