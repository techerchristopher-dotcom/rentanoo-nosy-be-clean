import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileService } from "@/services/supabase/profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Clock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, label: "Session active" },
  { id: 2, label: "Confirmer le compte" },
  { id: 3, label: "Profil complété" },
  { id: 4, label: "Terminé" },
] as const;

export default function ClientOnboarding() {
  const { session, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    kycStatus: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const hasSession = Boolean(session?.user);
  const isKycVerified = profile?.kycStatus === "verified";
  const isProfileComplete = Boolean(
    profile?.firstName?.trim() && profile?.lastName?.trim() && profile?.phone?.trim()
  );

  let currentStep: 1 | 2 | 3 | 4 = 1;
  if (!hasSession) currentStep = 1;
  else if (profileLoading || !profile || !isKycVerified) currentStep = 2;
  else if (!isProfileComplete) currentStep = 3;
  else currentStep = 4;

  useEffect(() => {
    if (!hasSession) {
      setProfileLoading(false);
      setProfile(null);
      setProfileError(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    ProfileService.getCurrentUserProfile()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setProfileError(error);
          setProfile(null);
        } else if (data) {
          setProfile({
            id: data.id,
            email: data.email ?? "",
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
            phone: data.phone ?? "",
            kycStatus: data.kycStatus ?? "pending",
          });
        } else {
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [hasSession]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setProfileError(null);
    await supabase.auth.getUser();
    await refreshUser();
    const { data, error } = await ProfileService.getCurrentUserProfile();
    setProfileError(error ?? null);
    if (data) {
      setProfile({
        id: data.id,
        email: data.email ?? "",
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
        kycStatus: data.kycStatus ?? "pending",
      });
    }
    setRefreshing(false);
  };

  const handleConfirmAccount = async () => {
    setChecking(true);
    setCheckError(null);
    setShowResend(false);
    const { data, error } = await ProfileService.getCurrentUserProfile();
    setChecking(false);
    if (error) {
      setCheckError("Impossible de vérifier. Réessayez.");
      setShowResend(true);
      return;
    }
    if (data) {
      setProfile({
        id: data.id,
        email: data.email ?? "",
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
        kycStatus: data.kycStatus ?? "pending",
      });
      if (data.kycStatus !== "verified") {
        setCheckError("Compte non vérifié. Vérifiez l'email et réessayez.");
        setShowResend(true);
      } else {
        setCheckError(null);
        setShowResend(false);
      }
    } else {
      setCheckError("Compte non vérifié. Vérifiez l'email et réessayez.");
      setShowResend(true);
    }
  };

  const N8N_WEBHOOK_PROFILES_CREATED =
    "https://n8n.srv1285649.hstgr.cloud/webhook/profiles-created";

  const handleResendEmail = async () => {
    console.debug("[RESEND_CLICK] clicked", { resending, profile });
    if (!profile?.id || !profile?.email) {
      console.debug("[RESEND_CLICK] early return - missing profile data", {
        profileId: profile?.id,
        profileEmail: profile?.email,
      });
      return;
    }
    setResending(true);
    const url = N8N_WEBHOOK_PROFILES_CREATED;
    const payload = {
      userId: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
    console.debug("[RESEND_FETCH] sending", { url, payload });
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.debug("[RESEND_FETCH] response", { status: response.status, ok: response.ok });
      if (response.ok) {
        toast({
          title: "Email renvoyé",
          description: "Vérifiez votre boîte mail.",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de renvoyer l'email. Réessayez.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.debug("[RESEND_FETCH] error", err);
      toast({
        title: "Erreur",
        description: "Impossible de renvoyer l'email. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const getStepStatus = (stepId: number): "done" | "current" | "locked" => {
    if (stepId < currentStep) return "done";
    if (stepId === currentStep) return "current";
    return "locked";
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">Onboarding</CardTitle>
          <CardDescription>Complétez votre inscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barre de progression */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s < currentStep ? "bg-primary" : s === currentStep ? "bg-primary/70" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Liste des étapes */}
          <ul className="space-y-3">
            {STEPS.map((step) => {
              const status = getStepStatus(step.id);
              const icon =
                status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : status === "current" ? (
                  <Clock className="h-5 w-5 text-primary" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                );
              return (
                <li key={step.id} className="flex items-center gap-3">
                  {icon}
                  <span
                    className={
                      status === "locked"
                        ? "text-muted-foreground"
                        : status === "done"
                        ? "text-green-600"
                        : "font-medium"
                    }
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Actions selon l'étape */}
          {authLoading || (hasSession && profileLoading) ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Chargement...</span>
            </div>
          ) : currentStep === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connectez-vous pour continuer votre onboarding.
              </p>
              <Button
                onClick={() => navigate("/auth/login")}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                Se connecter
              </Button>
            </div>
          ) : currentStep === 2 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Confirmez votre compte via l&apos;email reçu, puis revenez ici.
              </p>
              {checkError && (
                <p className="text-sm text-destructive">{checkError}</p>
              )}
              <Button
                onClick={handleConfirmAccount}
                disabled={checking}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  "J'ai confirmé mon compte"
                )}
              </Button>
              {showResend && (
                <Button
                  onClick={handleResendEmail}
                  disabled={resending || !profile?.email}
                  variant="outline"
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    "Renvoyer l&apos;email"
                  )}
                </Button>
              )}
              <Button
                onClick={handleRefresh}
                disabled={refreshing || checking}
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
              >
                {refreshing ? "Rafraîchissement..." : "Rafraîchir"}
              </Button>
            </div>
          ) : currentStep === 3 ? (
            <div className="space-y-3">
              {profileError && (
                <p className="text-sm text-destructive">Impossible de charger le profil</p>
              )}
              <Button
                onClick={() => navigate("/profile")}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                Compléter mon profil
              </Button>
              {profileError && (
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? "Rafraîchissement..." : "Rafraîchir"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Votre inscription est terminée.</p>
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                Accéder à l&apos;accueil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
