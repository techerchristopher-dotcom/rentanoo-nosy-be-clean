-- Admin Auth Notify — triggers n8n (additif uniquement)
-- Cible : https://n8n.srv1285649.hstgr.cloud/webhook/admin-auth-notify
--
-- Rollback :
--   DROP TRIGGER IF EXISTS trg_admin_notify_login ON auth.users;
--   DROP TRIGGER IF EXISTS trg_admin_notify_signup ON public.profiles;
--   DROP FUNCTION IF EXISTS public.notify_admin_on_login();

CREATE OR REPLACE FUNCTION public.notify_admin_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
BEGIN
  IF OLD.last_sign_in_at IS NOT NULL
     AND NEW.last_sign_in_at IS NOT NULL
     AND NEW.last_sign_in_at > OLD.last_sign_in_at
  THEN
    PERFORM net.http_post(
      url     := 'https://n8n.srv1285649.hstgr.cloud/webhook/admin-auth-notify',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'type',       'UPDATE',
        'table',      'users',
        'schema',     'auth',
        'record',     jsonb_build_object(
          'id',                 NEW.id,
          'email',              NEW.email,
          'last_sign_in_at',    NEW.last_sign_in_at,
          'raw_user_meta_data', NEW.raw_user_meta_data
        ),
        'old_record', jsonb_build_object(
          'last_sign_in_at', OLD.last_sign_in_at
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_admin_on_login() IS
  'Notification admin n8n (LOGIN) : webhook admin-auth-notify si last_sign_in_at avance.';

DROP TRIGGER IF EXISTS trg_admin_notify_signup ON public.profiles;
CREATE TRIGGER trg_admin_notify_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://n8n.srv1285649.hstgr.cloud/webhook/admin-auth-notify',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '5000'
  );

COMMENT ON TRIGGER trg_admin_notify_signup ON public.profiles IS
  'Notification admin n8n (SIGNUP) : webhook admin-auth-notify à chaque nouveau profil.';

DROP TRIGGER IF EXISTS trg_admin_notify_login ON auth.users;
CREATE TRIGGER trg_admin_notify_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_login();

COMMENT ON TRIGGER trg_admin_notify_login ON auth.users IS
  'Notification admin n8n (LOGIN) : webhook admin-auth-notify sur connexion réelle.';
