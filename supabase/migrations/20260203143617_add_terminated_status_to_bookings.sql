-- Migration: Ajouter le statut 'terminated' à la contrainte CHECK de la table bookings
-- Date: 2026-02-03
-- Description: Permet d'utiliser le statut 'terminated' pour les réservations dont l'état des lieux de retour est complété

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Recréer la contrainte CHECK avec le nouveau statut 'terminated'
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (
  (status)::text = ANY (
    ARRAY[
      'pending'::character varying,
      'pending_payment'::character varying,
      'confirmed'::character varying,
      'active'::character varying,
      'completed'::character varying,
      'cancelled'::character varying,
      'rejected'::character varying,
      'declined'::character varying,
      'terminated'::character varying
    ]::text[]
  )
);

