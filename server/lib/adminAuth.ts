import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUserFromRequest } from "./depositAuth";

export type AdminAuthFailure = { ok: false; status: number; body: Record<string, unknown> };
export type AdminAuthSuccess = { ok: true; userId: string };
export type AdminAuthResult = AdminAuthFailure | AdminAuthSuccess;

export async function requireAdmin(
  req: { headers: { authorization?: string } },
  supabaseAdmin: SupabaseClient
): Promise<AdminAuthResult> {
  const auth = await getAuthUserFromRequest(req);
  if (auth.ok === false) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, error: "UNAUTHORIZED", message: auth.message, reason: auth.reason },
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role, is_admin, admin_role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const isAdminUser =
    !!profile &&
    (profile.role === "admin" || profile.is_admin === true || profile.admin_role === "admin");

  if (error || !isAdminUser) {
    return {
      ok: false,
      status: 403,
      body: { ok: false, error: "FORBIDDEN", message: "Réservé aux administrateurs" },
    };
  }

  return { ok: true, userId: auth.user.id };
}
