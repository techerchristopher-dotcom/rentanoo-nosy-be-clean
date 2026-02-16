/**
 * JWT auth helper for deposit routes ONLY.
 * Validates Supabase JWT from Authorization: Bearer header.
 * ⚠️ Ne jamais logger le JWT en clair.
 */
import { createClient, User } from "@supabase/supabase-js";

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; reason: "MISSING_HEADER" | "BAD_FORMAT" | "MISSING_ENV" | "GETUSER_FAILED"; message: string };

export async function getAuthUserFromRequest(req: { headers: { authorization?: string } }): Promise<AuthResult> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn("[depositAuth] missing Authorization header");
    return { ok: false, reason: "MISSING_HEADER", message: "En-tête Authorization absent" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.warn("[depositAuth] invalid Authorization format");
    return { ok: false, reason: "BAD_FORMAT", message: "Format Authorization invalide (attendu: Bearer <token>)" };
  }

  const token = authHeader.slice(7);
  if (!token) {
    console.warn("[depositAuth] invalid Authorization format");
    return { ok: false, reason: "BAD_FORMAT", message: "Token absent" };
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("SUPABASE_URL ou VITE_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY ou VITE_SUPABASE_ANON_KEY");
    console.error("[depositAuth] Missing env:", { hasUrl: !!supabaseUrl, hasAnon: !!supabaseAnonKey });
    return {
      ok: false,
      reason: "MISSING_ENV",
      message: `Variables manquantes: ${missing.join(", ")}`,
    };
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    const errMsg = error?.message ?? "Utilisateur introuvable";
    const status = error?.status;
    console.warn(`[depositAuth] getUser failed: ${errMsg}${status != null ? ` (status: ${status})` : ""}`);
    return {
      ok: false,
      reason: "GETUSER_FAILED",
      message: "Token invalide ou expiré",
    };
  }

  return { ok: true, user };
}
