import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckCircle2, AlertCircle } from "lucide-react";

type CallbackStatus = "loading" | "success" | "invalid";

export default function Callback() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [countdown, setCountdown] = useState(4);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let handled = false;

    const hasAuthTokensInUrl = () => {
      if (typeof window === "undefined") return false;
      const href = window.location.href.toLowerCase();
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
      setStatus("success");
    };

    const completeInvalid = () => {
      if (!isMounted || handled) return;
      handled = true;
      setStatus("invalid");
    };

    const maxAttempts = hasAuthTokensInUrl() ? 10 : 2;
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
          completeInvalid();
        } else {
          setTimeout(tryGetSession, retryDelayMs);
        }
      } catch (error) {
        console.error("[AuthCallback] Erreur inattendue:", error);
        completeInvalid();
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

    tryGetSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auto-redirect après succès (success uniquement)
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => navigate("/onboarding/client"), 4000);
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [status, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
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

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 group">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-lagoon rounded-2xl shadow-lagoon group-hover:shadow-soft transition-shadow">
              <Car className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-lagoon bg-clip-text text-transparent">
              MayCar
            </span>
          </Link>
        </div>

        <Card className="shadow-card">
          <CardHeader className="text-center">
            {isSuccess ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">Compte confirmé</CardTitle>
                <CardDescription className="text-base">
                  Votre compte a bien été confirmé.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">Lien invalide ou expiré</CardTitle>
                <CardDescription className="text-base">
                  Ce lien n&apos;est plus valide ou a déjà été utilisé.
                  <br />
                  Connectez-vous ou demandez un nouveau lien.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {isSuccess ? (
              <>
                <Button
                  onClick={() => {
                    const target = "/onboarding/client";
                    try {
                      window.open("", "_self");
                      window.close();
                    } catch {
                      /* window.close() bloqué si onglet ouvert par l'utilisateur */
                    }
                    window.location.assign(target);
                  }}
                  className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
                >
                  Retourner sur Rentanoo
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Cette page peut être fermée.
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Redirection automatique dans {countdown} s…
                </p>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="w-full"
                >
                  Aller à l&apos;accueil
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/auth/login")}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                Retour connexion
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
