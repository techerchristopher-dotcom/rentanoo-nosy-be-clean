-- Welcome Email V1 — trigger additif sur profiles INSERT
-- Cible : https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client
--
-- Prérequis : secret partagé dans Supabase Vault (name = n8n_webhook_secret)
--   SELECT vault.create_secret('<secret>', 'n8n_webhook_secret', 'Shared n8n webhook secret');
-- Et variable n8n WEBHOOK_SECRET identique.
--
-- Rollback :
--   DROP TRIGGER IF EXISTS trg_welcome_signup ON public.profiles;
--   DROP FUNCTION IF EXISTS public.notify_welcome_email();

CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'n8n_webhook_secret'
  LIMIT 1;

  PERFORM net.http_post(
    url     := 'https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Webhook-Secret', COALESCE(v_secret, '')
    ),
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      'profiles',
      'schema',     'public',
      'record',     to_jsonb(NEW),
      'old_record', NULL
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_welcome_email() IS
  'Welcome Email V1 : webhook welcome-client à chaque nouveau profil (header X-Webhook-Secret).';

DROP TRIGGER IF EXISTS trg_welcome_signup ON public.profiles;
CREATE TRIGGER trg_welcome_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_welcome_email();

COMMENT ON TRIGGER trg_welcome_signup ON public.profiles IS
  'Welcome Email V1 : envoi email de bienvenue via n8n à la création du profil.';
