import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckCircle2, AlertCircle } from "lucide-react";
import {
  buildAuthLink,
  getRedirectFromSearch,
  resolvePostAuthRedirect,
} from "@/lib/safeRedirectPath";

type CallbackStatus = "loading" | "success" | "invalid";

/**
 * Send welcome email via n8n webhook (non-blocking)
 */
async function sendWelcomeEmail(
  userId: string,
  profile: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    welcome_email_sent_at: string | null;
  }
): Promise<boolean> {
  const webhookUrl = import.meta.env.VITE_N8N_WELCOME_WEBHOOK_URL;

  // Skip if webhook not configured
  if (!webhookUrl) {
    console.log("[Welcome] skipped (reason=missing_webhook)");
    return false;
  }

  // Skip if email already sent
  if (profile.welcome_email_sent_at) {
    console.log("[Welcome] skipped (reason=already_sent)");
    return false;
  }

  // Skip if no email
  if (!profile.email) {
    console.log("[Welcome] skipped (reason=missing_email)");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: {
          record: {
            id: userId,
            email: profile.email,
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("[Welcome] failed", { status: response.status });
      return false;
    }

    console.log("[Welcome] sent");

    // Mark email as sent in DB
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      console.error("[Welcome] failed to mark as sent", updateError);
    }

    return true;
  } catch (error) {
    console.error("[Welcome] failed", error);
    return false;
  }
}

export default function Callback() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [countdown, setCountdown] = useState(4);
  const navigate = useNavigate();
  const hasRunRef = useRef(false);

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

    /**
     * Handle verified user: update kyc_status + send welcome email
     * Anti-doublon: only runs once per page load via hasRunRef
     */
    const handleVerifiedUser = async (userId: string) => {
      console.log("[AuthCallback] handleVerifiedUser called", { userId, locked: hasRunRef.current });

      // Anti-doublon: prevent double execution
      if (hasRunRef.current) {
        console.log("[AuthCallback] Already processed, skipping");
        return;
      }

      try {
        // DIAG: Verify authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log("[AuthCallback] DIAG auth user:", {
          id: authUser?.id,
          email: authUser?.email,
          email_confirmed_at: authUser?.email_confirmed_at,
        });

        // 1. Fetch profile to check current state
        console.log("[AuthCallback] DIAG before SELECT profiles, userId:", userId);
        
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("kyc_status, welcome_email_sent_at, email, first_name, last_name")
          .eq("id", userId)
          .single();

        console.log("[AuthCallback] DIAG after SELECT profiles:", {
          profile: profile ? {
            kyc_status: profile.kyc_status,
            email: profile.email,
            first_name: profile.first_name,
            welcome_email_sent_at: profile.welcome_email_sent_at,
          } : null,
          fetchError: fetchError ? {
            code: fetchError.code,
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
          } : null,
        });

        if (fetchError || !profile) {
          console.error("[AuthCallback] Failed to fetch profile:", {
            fetchError,
            profileIsNull: !profile,
            errorCode: fetchError?.code,
            errorMessage: fetchError?.message,
            errorDetails: fetchError?.details,
          });
          return; // Don't lock, allow retry
        }

        // Lock after successful profile fetch
        console.log("[AuthCallback] handleVerifiedUser lock set");
        hasRunRef.current = true;

        // 2. If already verified, skip update but check welcome email
        if (profile.kyc_status === "verified") {
          console.log("[AuthCallback] Already verified, checking welcome email");
          
          // Send welcome email if not sent yet (non-blocking)
          sendWelcomeEmail(userId, profile).catch((err) =>
            console.error("[AuthCallback] Welcome email error", err)
          );
          
          return;
        }

        // 3. Update kyc_status to verified
        console.log("[AuthCallback] DIAG before UPDATE profiles: updating kyc_status to verified");
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ kyc_status: "verified" })
          .eq("id", userId);

        console.log("[AuthCallback] DIAG after UPDATE profiles:", {
          updateError: updateError ? {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
          } : null,
        });

        if (updateError) {
          console.error("[AuthCallback] UPDATE kyc_status FAILED:", {
            updateError,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
            errorHint: updateError.hint,
          });
          return;
        }

        console.log("[AuthCallback] kyc_status updated to verified");

        // 4. Send welcome email (non-blocking)
        sendWelcomeEmail(userId, profile).catch((err) =>
          console.error("[AuthCallback] Welcome email error", err)
        );
      } catch (error) {
        console.error("[AuthCallback] handleVerifiedUser error:", error);
      }
    };

    const completeSuccess = async () => {
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
          // Handle verification + welcome email
          await handleVerifiedUser(session.user.id);
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || handled) return;
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        // Handle verification + welcome email
        await handleVerifiedUser(session.user.id);
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
    const target = resolvePostAuthRedirect();
    const timer = setTimeout(() => navigate(target), 4000);
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
              Rentanoo
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
                    const target = resolvePostAuthRedirect();
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
                onClick={() =>
                  navigate(
                    buildAuthLink(
                      "/auth/login",
                      getRedirectFromSearch(
                        new URLSearchParams(window.location.search)
                      )
                    )
                  )
                }
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
