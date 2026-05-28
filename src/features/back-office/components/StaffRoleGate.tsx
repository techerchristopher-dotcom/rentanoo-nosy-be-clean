import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffRole } from "@/integrations/supabase/types";

type Props = {
  allowedRoles: StaffRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Phase 2 UI gating by profiles.staff_role.
 * Admins (is_admin) always pass.
 */
export function StaffRoleGate({ allowedRoles, children, fallback = null }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, staff_role")
        .eq("id", user.id)
        .single();

      if (profile?.is_admin) {
        setAllowed(true);
        return;
      }
      const role = (profile?.staff_role ?? "none") as StaffRole;
      setAllowed(allowedRoles.includes(role) || role === "admin");
    })();
  }, [allowedRoles]);

  if (allowed === null) return null;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
