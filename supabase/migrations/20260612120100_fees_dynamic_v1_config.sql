-- =============================================================================
-- Fees Dynamic v1 — 2/4 : Configuration des taux
-- =============================================================================
-- Objectif (P1.2) :
--   - Stocker les taux côté DB dans public.platform_settings :
--       fee_card_online_percent  -> {"percent": 0.10}
--       fee_cash_on_site_percent -> {"percent": 0.15}
--   - Autoriser la lecture publique de ces 2 clés (anon + authenticated).
--   - Écriture réservée au service_role (panneau admin futur).
--
-- Dépendances :
--   - Table public.platform_settings (créée dans 20260604120000_platform_settings_exchange_rate.sql)
--   - RLS déjà activée sur cette table.
--
-- Rollback :
--   DROP POLICY IF EXISTS "platform_settings_public_read_fees" ON public.platform_settings;
--   DELETE FROM public.platform_settings WHERE key IN ('fee_card_online_percent', 'fee_cash_on_site_percent');
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Insertion idempotente des 2 clés de configuration
--    Format JSON aligné avec la convention existante ({"rate": 5000}) :
--    chaque clé porte un objet avec un champ "percent" en DÉCIMAL (0..1).
-- ---------------------------------------------------------------------------
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES
  ('fee_card_online_percent',  jsonb_build_object('percent', 0.10), now()),
  ('fee_cash_on_site_percent', jsonb_build_object('percent', 0.15), now())
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Policy RLS de lecture publique pour les frais
--    On ajoute une SECONDE policy distincte plutôt que d'étendre
--    "platform_settings_public_read_exchange" : permet un rollback isolé.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "platform_settings_public_read_fees"
  ON public.platform_settings;

CREATE POLICY "platform_settings_public_read_fees"
  ON public.platform_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('fee_card_online_percent', 'fee_cash_on_site_percent'));

-- ---------------------------------------------------------------------------
-- 3) Documentation des deux nouvelles clés
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.platform_settings IS
  'Paramètres globaux de la plateforme (taux EUR↔MGA, taux de frais de service, etc.). Lecture publique pour les clés non-sensibles ; écriture réservée au service_role.';

COMMIT;

-- ---------------------------------------------------------------------------
-- 4) Vérifications post-déploiement (à exécuter manuellement) :
--
--    SELECT key, value
--    FROM public.platform_settings
--    WHERE key IN ('fee_card_online_percent', 'fee_cash_on_site_percent');
--    -- attendu : 2 lignes avec value.percent = 0.10 et 0.15
--
--    -- Tester la policy en tant qu'anon (via PostgREST ou curl) :
--    -- GET /rest/v1/platform_settings?key=eq.fee_card_online_percent
--    -- doit retourner 1 ligne avec apikey=anon.
-- ---------------------------------------------------------------------------
