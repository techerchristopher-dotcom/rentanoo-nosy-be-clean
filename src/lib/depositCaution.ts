import { supabase } from "@/integrations/supabase/client";

const API_BASE = "";

function safeParseResponse(raw: string): Record<string, unknown> | null {
  if (!raw || raw.trim() === "") return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createSetupIntentClientSecret(bookingId: string): Promise<{ clientSecret: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("Vous devez être connecté pour activer la caution.");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/deposit/create-setup-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookingId }),
    });
  } catch (err) {
    throw new Error("API indisponible. Vérifiez votre connexion et réessayez.");
  }

  const raw = await res.text();
  if (!raw || raw.trim() === "") {
    throw new Error("API indisponible (réponse vide)");
  }
  const json = safeParseResponse(raw);
  if (!res.ok) {
    const msg = (json?.message as string) || (json?.error as string);
    if (msg && typeof msg === "string") {
      throw new Error(msg);
    }
    if (json) {
      throw new Error(`Erreur (${res.status})`);
    }
    const fallback = raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
    throw new Error(fallback || `Erreur (${res.status})`);
  }
  if (!json?.clientSecret) {
    throw new Error(raw?.trim() ? "Réponse serveur invalide (format JSON attendu)" : "Réponse serveur vide");
  }
  return { clientSecret: String(json.clientSecret) };
}

export async function attachPaymentMethod(bookingId: string, paymentMethodId: string): Promise<{ ok: boolean }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("Vous devez être connecté.");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/deposit/attach-payment-method`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookingId, paymentMethodId }),
    });
  } catch (err) {
    throw new Error("API indisponible. Vérifiez votre connexion et réessayez.");
  }

  const raw = await res.text();
  if (!raw || raw.trim() === "") {
    throw new Error("API indisponible (réponse vide)");
  }
  const json = safeParseResponse(raw);
  if (!res.ok) {
    const msg = (json?.message as string) || (json?.error as string);
    if (msg && typeof msg === "string") {
      throw new Error(msg);
    }
    if (json) {
      throw new Error(`Erreur (${res.status})`);
    }
    const fallback = raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
    throw new Error(fallback || `Erreur (${res.status})`);
  }
  return { ok: json?.ok === true };
}

/**
 * Force la caution comme déposée (propriétaire uniquement).
 * Utilisé pour : paiement offline, tests, état des lieux sans carte.
 */
export async function forceDepositForOwner(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return { ok: false, error: "Vous devez être connecté." };
  }

  try {
    const res = await fetch(`${API_BASE}/api/bookings/${encodeURIComponent(bookingId)}/force-deposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const raw = await res.text();
    const json = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;

    if (!res.ok) {
      const msg = (json?.message as string) || (json?.error as string) || "Erreur lors de la mise à jour";
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "API indisponible. Vérifiez votre connexion." };
  }
}
