import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileService } from "@/services/supabase/profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Clock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadBookingResumeIntent } from "@/lib/bookingResumeIntent";
import { buildAuthLink } from "@/lib/safeRedirectPath";

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
  const [completionFirst, setCompletionFirst] = useState("");
  const [completionLast, setCompletionLast] = useState("");
  const [completionPhone, setCompletionPhone] = useState("");
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const hasSession = Boolean(session?.user);
  const isKycVerified = profile?.kycStatus === "verified";
  const isProfileComplete = Boolean(
    profile?.firstName?.trim() && profile?.lastName?.trim() && profile?.phone?.trim()
  );

  let currentStep: 1 | 2 | 3 | 4 = 1;
  if (!hasSession) currentStep = 1;
  else if (profileLoading || !isKycVerified) currentStep = 2;
  else if (!isProfileComplete) currentStep = 3;
  else currentStep = 4;

  // Charger le profil (pour vérifier kyc_status et complétude)
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

  // Préremplir le formulaire de complétion (ex. noms issus de Google après backfill)
  useEffect(() => {
    if (!profile) return;
    setCompletionFirst((prev) => (prev === "" ? profile.firstName || "" : prev));
    setCompletionLast((prev) => (prev === "" ? profile.lastName || "" : prev));
    setCompletionPhone((prev) => (prev === "" ? profile.phone || "" : prev));
  }, [profile?.id, profile?.firstName, profile?.lastName, profile?.phone]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setProfileError(null);
    await refreshUser();
    // Refresh profile (inclut kyc_status)
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

    // Refetch le profil pour vérifier kyc_status
    const { data, error } = await ProfileService.getCurrentUserProfile();

    if (error || !data) {
      setCheckError("Impossible de vérifier votre statut.");
      setShowResend(true);
      setChecking(false);
      return;
    }

    setProfile({
      id: data.id,
      email: data.email ?? "",
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      phone: data.phone ?? "",
      kycStatus: data.kycStatus ?? "pending",
    });

    if (data.kycStatus !== "verified") {
      setCheckError("Votre compte n'est pas encore confirmé. Vérifiez votre email.");
      setShowResend(true);
    } else {
      setCheckError(null);
      setShowResend(false);
    }

    setChecking(false);
  };

  const handleCompleteProfile = async () => {
    setCompletionError(null);
    const first = completionFirst.trim();
    const last = completionLast.trim();
    const phone = completionPhone.trim();
    if (!first || !last || !phone) {
      setCompletionError("Le prénom, le nom et le numéro de téléphone sont obligatoires pour continuer.");
      return;
    }
    setSavingProfile(true);
    try {
      const { data, error } = await ProfileService.updateProfile({
        firstName: first,
        lastName: last,
        phone,
      });
      if (error || !data) {
        setCompletionError(error || "Enregistrement impossible. Réessayez.");
        return;
      }
      await refreshUser();
      const { data: fresh, error: freshErr } = await ProfileService.getCurrentUserProfile();
      if (freshErr || !fresh) {
        setProfileError(freshErr ?? "Profil introuvable après enregistrement.");
        return;
      }
      setProfile({
        id: fresh.id,
        email: fresh.email ?? "",
        firstName: fresh.firstName ?? "",
        lastName: fresh.lastName ?? "",
        phone: fresh.phone ?? "",
        kycStatus: fresh.kycStatus ?? "pending",
      });
      toast({
        title: "Profil enregistré",
        description: "Vous pouvez poursuivre votre inscription.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResendEmail = async () => {
    const userEmail = session?.user?.email;
    const userId = session?.user?.id;
    if (!userEmail || !userId) {
      toast({
        title: "Erreur",
        description: "Adresse email introuvable.",
        variant: "destructive",
      });
      return;
    }

    const webhookUrl = import.meta.env.VITE_N8N_PROFILES_CREATED_WEBHOOK_URL;
    if (!webhookUrl) {
      toast({
        title: "Erreur",
        description: "Configuration email manquante (webhook).",
        variant: "destructive",
      });
      return;
    }

    setResending(true);
    try {
      // Appel webhook n8n profiles-created (même workflow que l'inscription)
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: {
            record: {
              id: userId,
              email: userEmail,
              first_name: profile?.firstName || null,
              last_name: profile?.lastName || null,
              phone: profile?.phone || null,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Erreur réseau");
        console.error("[RESEND N8N] failed", { status: response.status, error: errorText });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log("[RESEND N8N] ok");
      toast({
        title: "Email renvoyé",
        description: "Vérifiez votre boîte mail.",
      });
    } catch (error) {
      console.error("[RESEND N8N] failed", error);
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

  const resumeIntent = loadBookingResumeIntent();

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
                onClick={() =>
                  navigate(
                    buildAuthLink("/auth/login", resumeIntent?.path ?? null)
                  )
                }
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
                  disabled={resending || !session?.user?.email}
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
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pour utiliser la plateforme, nous avons besoin de votre prénom, nom et téléphone. La connexion Google ne
                fournit pas toujours ces informations : complétez-les ci-dessous.
              </p>
              {profileError && (
                <p className="text-sm text-destructive">Impossible de charger le profil.</p>
              )}
              {completionError && (
                <p className="text-sm text-destructive">{completionError}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="onboarding-first">Prénom</Label>
                <Input
                  id="onboarding-first"
                  autoComplete="given-name"
                  value={completionFirst}
                  onChange={(e) => setCompletionFirst(e.target.value)}
                  disabled={savingProfile || profileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-last">Nom</Label>
                <Input
                  id="onboarding-last"
                  autoComplete="family-name"
                  value={completionLast}
                  onChange={(e) => setCompletionLast(e.target.value)}
                  disabled={savingProfile || profileLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-phone">Téléphone</Label>
                <Input
                  id="onboarding-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="Ex. +261 32 …"
                  value={completionPhone}
                  onChange={(e) => setCompletionPhone(e.target.value)}
                  disabled={savingProfile || profileLoading}
                />
              </div>
              <Button
                onClick={handleCompleteProfile}
                disabled={savingProfile || profileLoading}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer et continuer"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/profile")}
                disabled={savingProfile}
              >
                Plus de détails sur ma page profil
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleRefresh}
                disabled={refreshing || savingProfile}
              >
                {refreshing ? "Rafraîchissement..." : "Rafraîchir les données"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Votre inscription est terminée.</p>
              <Button
                onClick={() => navigate(resumeIntent?.path ?? "/")}
                className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
              >
                {resumeIntent
                  ? "Reprendre ma réservation"
                  : "Accéder à l\u2019accueil"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
