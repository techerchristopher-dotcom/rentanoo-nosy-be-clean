/**
 * Diagnostic hors navigateur : vérifie que le client service role peut exécuter
 * les mêmes requêtes que POST /api/admin/clients/search (sans auth admin).
 * Usage : node scripts/diagnose-admin-clients-api.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sr = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL défini:", !!url);
console.log("SERVICE_ROLE_KEY défini:", !!sr);

if (!url || !sr) {
  console.error("Variables manquantes — impossible de tester PostgREST.");
  process.exit(1);
}

const supabase = createClient(url, sr, { auth: { persistSession: false } });

const sel = "id, email, first_name, last_name, phone, role";
const limit = 20;
const pattern = "%aa%";

const base = () =>
  supabase.from("profiles").select(sel).eq("role", "renter").order("created_at", { ascending: false }).limit(limit);

const labels = ["email", "phone", "first_name", "last_name"];
for (const col of labels) {
  const res = await base().ilike(col, pattern);
  const e = res.error;
  console.log(
    `\n[${col}]`,
    e
      ? JSON.stringify({ message: e.message, code: e.code, details: e.details, hint: e.hint }, null, 2)
      : `ok, ${res.data?.length ?? 0} ligne(s)`
  );
}
