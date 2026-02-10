import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Car } from "lucide-react";

export default function Callback() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let handled = false;

    const hasAuthTokensInUrl = () => {
      if (typeof window === "undefined") return false;
      const href = window.location.href.toLowerCase();

      // Indices typiques d'un callback Supabase (OAuth + email/magic link)
      const hasAccessTokens =
        href.includes("access_token=") || href.includes("refresh_token=");
      const hasEmailCallbackType =
        href.includes("type=signup") ||
        href.includes("type=recovery") ||
        href.includes("type=invite") ||
        href.includes("type=magiclink");
      const hasCodeParam = href.includes("code=");
      const hasTokenHash = href.includes("token_hash=");

      return hasAccessTokens || hasEmailCallbackType || hasCodeParam || hasTokenHash;
    };

    const completeSuccess = () => {
      if (!isMounted || handled) return;
      handled = true;
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur Rentanoo !",
      });
      navigate("/onboarding/client");
      setLoading(false);
    };

    const completeFailureToLogin = (description: string) => {
      if (!isMounted || handled) return;
      handled = true;
      toast({
        title: "Erreur de connexion",
        description,
        variant: "destructive",
      });
      navigate("/auth/login");
      setLoading(false);
    };

    const completeFailureStayHere = (description: string) => {
      if (!isMounted || handled) return;
      handled = true;
      toast({
        title: "Erreur",
        description,
        variant: "destructive",
      });
      // On reste sur la page callback, sans rediriger vers /auth/login
      setLoading(false);
    };

    const maxAttempts = hasAuthTokensInUrl() ? 10 : 3;
    const retryDelayMs = 300;
    let attempts = 0;

    const tryGetSession = async () => {
      if (!isMounted || handled) return;

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (session?.user) {
          completeSuccess();
          return;
        }

        if (error) {
          console.error("[AuthCallback] Erreur getSession():", error);
        }

        attempts += 1;

        if (attempts >= maxAttempts) {
          const hasTokens = hasAuthTokensInUrl();

          if (hasTokens) {
            console.error(
              "[AuthCallback] Impossible de finaliser la connexion malgré les tokens dans l'URL"
            );
            completeFailureStayHere(
              "Impossible de finaliser la connexion depuis ce lien. Veuillez réessayer à partir de l'application ou demander un nouveau lien."
            );
          } else {
            console.debug(
              "[AuthCallback] Aucune session après tentatives et aucun indice de callback, redirection vers login"
            );
            completeFailureToLogin(
              "Une erreur s'est produite lors de la connexion"
            );
          }
        } else {
          setTimeout(tryGetSession, retryDelayMs);
        }
      } catch (error) {
        console.error("[AuthCallback] Erreur inattendue:", error);
        const hasTokens = hasAuthTokensInUrl();
        if (hasTokens) {
          completeFailureStayHere(
            "Une erreur inattendue s'est produite lors de la finalisation de la connexion. Veuillez réessayer plus tard."
          );
        } else {
          completeFailureToLogin(
            "Une erreur inattendue s'est produite lors de la connexion"
          );
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted || handled) return;
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        completeSuccess();
      }
    });

    // Démarre immédiatement une première tentative de récupération de session
    tryGetSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-lagoon rounded-2xl shadow-lagoon mb-4 animate-pulse">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connexion en cours...
          </h2>
          <p className="text-muted-foreground">
            Veuillez patienter pendant que nous finalisons votre connexion
          </p>
        </div>
      </div>
    );
  }

  return null;
}