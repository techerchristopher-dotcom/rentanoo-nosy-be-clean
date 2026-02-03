-- ============================================================================
-- Migration : Ajout colonnes idempotence pour envoi EDL par email
-- ============================================================================
-- Date : 2025-01-XX
-- Description : Ajoute les colonnes nécessaires pour éviter les envois en double
--               et tracker le statut d'envoi des emails EDL
-- 
-- Usage : Appliquer cette migration via Supabase Dashboard ou CLI
-- ============================================================================

-- Colonne 1 : Timestamp du dernier envoi email EDL
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_sent_at TIMESTAMPTZ;

-- Colonne 2 : Statut de l'envoi email EDL
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_sent_status TEXT
  CHECK (edl_email_sent_status IS NULL OR edl_email_sent_status IN ('sent', 'failed', 'retrying', 'sending'));

-- Colonne 3 : Compteur de tentatives (pour retries)
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_retry_count INTEGER DEFAULT 0;

-- Colonne 4 : Dernière erreur (pour debugging)
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_last_error TEXT;

-- Index pour requêtes rapides (check-ins non envoyés)
CREATE INDEX IF NOT EXISTS idx_checkin_depart_edl_email_pending
ON public.checkin_depart(status, edl_email_sent_at)
WHERE status = 'completed' 
  AND legal_pdf_url IS NOT NULL 
  AND (edl_email_sent_at IS NULL OR edl_email_sent_status = 'failed');

-- Commentaires pour documentation
COMMENT ON COLUMN public.checkin_depart.edl_email_sent_at IS 'Timestamp du dernier envoi email EDL (locataire + propriétaire)';
COMMENT ON COLUMN public.checkin_depart.edl_email_sent_status IS 'Statut de l''envoi: sent (succès), failed (échec), retrying (en cours de retry), sending (en cours d''envoi - évite les doubles)';
COMMENT ON COLUMN public.checkin_depart.edl_email_retry_count IS 'Nombre de tentatives d''envoi (max 3)';
COMMENT ON COLUMN public.checkin_depart.edl_email_last_error IS 'Message d''erreur de la dernière tentative (pour debugging)';

