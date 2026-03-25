import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileService } from "@/services/supabase/profile";
import { UserRoleUtils, type User } from "@/types";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";

type GateState = "loading" | "forbidden" | "allowed";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [gate, setGate] = useState<GateState>("loading");
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setGate("loading");
      return;
    }

    let cancelled = false;
    setGate("loading");

    (async () => {
      const { data, error } = await ProfileService.getCurrentUserProfile();
      if (cancelled) return;
      if (error || !data) {
        setProfile(null);
        setGate("forbidden");
        return;
      }
      setProfile(data);
      setGate(UserRoleUtils.isAdmin(data) ? "allowed" : "forbidden");
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  if (authLoading || (user && gate === "loading")) {
    return <PageLoader />;
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${redirect}`} replace />;
  }

  if (gate === "forbidden") {
    return (
      <div className="min-h-screen bg-background pt-24 px-4">
        <div className="mx-auto max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Accès refusé</h1>
          <p className="text-muted-foreground">
            Cette zone est réservée aux administrateurs. Si vous pensez qu’il s’agit d’une erreur,
            vérifiez le rôle associé à votre compte ({profile?.email ?? user.email ?? "—"}).
          </p>
          <Button asChild variant="default">
            <Link to="/">Retour à l’accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
