import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  intentMatchesPath,
  loadBookingResumeIntent,
} from "@/lib/bookingResumeIntent";
import { ProfileService } from "@/services/supabase/profile";

/** Aligné avec ClientOnboarding : prénom + nom + téléphone requis. */
function isProfileCompleteMinimal(profile: {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}): boolean {
  return Boolean(
    profile.firstName?.trim() && profile.lastName?.trim() && profile.phone?.trim()
  );
}

/**
 * Routes où le garde ne s’applique pas :
 * - auth & callback OAuth
 * - complétion onboarding
 * - /profile (formulaire détaillé + lien depuis l’étape 3)
 * - espace owner / loueur (dashboard, véhicules, flux rent-my-car)
 * - admin plateforme
 */
function isPathExemptFromClientProfileGuard(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/onboarding/client" || pathname.startsWith("/onboarding/client/")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/me/owner")) return true;
  if (pathname === "/me/dashboard" || pathname.startsWith("/me/dashboard/")) return true;
  if (pathname === "/rent-my-car" || pathname.startsWith("/rent-my-car/")) return true;
  if (pathname === "/panier/soumettre" || pathname.startsWith("/panier/soumettre/")) return true;
  if (pathname === "/panier/confirmation" || pathname.startsWith("/panier/confirmation/")) return true;
  return false;
}

/** Fiche véhicule ou hébergement avec intent de réservation actif. */
function isActiveBookingFichePath(pathname: string): boolean {
  const intent = loadBookingResumeIntent();
  if (!intent) return false;
  if (
    !pathname.startsWith("/moto/") &&
    !pathname.startsWith("/vehicle/") &&
    !pathname.startsWith("/hebergement/")
  ) {
    return false;
  }
  return intentMatchesPath(intent, pathname);
}

/**
 * Redirige les utilisateurs connectés dont le profil est incomplet vers `/onboarding/client`.
 * Ne s’applique pas aux admins, aux chemins exemptés, ni en cas d’erreur de chargement du profil (fail-open).
 */
export function ClientProfileCompletionGuard() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fetchSeq = useRef(0);

  useEffect(() => {
    if (authLoading || !user) return;

    const pathname = location.pathname;
    if (isPathExemptFromClientProfileGuard(pathname)) return;
    if (isActiveBookingFichePath(pathname)) return;

    const seq = ++fetchSeq.current;
    void (async () => {
      const { data, error } = await ProfileService.getCurrentUserProfile();
      if (fetchSeq.current !== seq) return;
      if (error || !data) return;
      if (data.roles?.includes("admin")) return;
      if (isProfileCompleteMinimal(data)) return;

      navigate("/onboarding/client", { replace: true });
    })();
  }, [user?.id, authLoading, location.pathname, navigate]);

  return null;
}
