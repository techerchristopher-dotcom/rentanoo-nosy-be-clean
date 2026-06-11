/**
 * A2 — Validation GA4 production (parcours réels).
 * Usage: node scripts/validate-a2-ga4-prod.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

dotenv.config({ path: ".env.local" });

const BASE = "https://rentanoo.com";
const TEST_EMAIL = "test123346@gmail.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";

if (!supabaseUrl || !serviceKey || !anonKey || !projectRef) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function decodeCollectUrl(url) {
  try {
    const q = url.split("?")[1] || "";
    const params = new URLSearchParams(q);
    const out = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  } catch {
    return { raw: url };
  }
}

const PAYMENT_EVENTS = [
  "payment_method_selected",
  "booking_created",
  "payment_flow_opened",
  "stripe_redirect",
  "payment_completed",
];

async function getSession() {
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });
  if (linkErr) throw new Error(`Magic link: ${linkErr.message}`);
  const { data: otpData, error: otpErr } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });
  if (otpErr || !otpData?.session) throw new Error(`OTP: ${otpErr?.message}`);
  return otpData.session;
}

function summarizeHits(ga4Hits) {
  const byEvent = {};
  for (const h of ga4Hits) {
    const en = h.decoded?.en;
    if (!en) continue;
    if (!byEvent[en]) byEvent[en] = [];
    byEvent[en].push({ ts: h.ts, decoded: h.decoded });
  }
  return byEvent;
}

async function runCashBookingFlow(page) {
  console.log("\n=== Parcours 2 — Cash (UI booking) ===");
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);

  const closeCat = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeCat.isVisible({ timeout: 3000 }).catch(() => false)) await closeCat.click();

  const depBtn = page.getByRole("button", { name: /DÉPART/i }).first();
  if (await depBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await depBtn.click();
    await page.waitForTimeout(400);
    await page.locator("button.rdp-day:not(.rdp-day_disabled)").first().click();
  }
  const retBtn = page.getByRole("button", { name: /RETOUR/i }).first();
  if (await retBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await retBtn.click();
    await page.waitForTimeout(400);
    await page.locator("button.rdp-day:not(.rdp-day_disabled)").nth(2).click();
  }
  await page.getByRole("button", { name: /recherche/i }).first().click();
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /Voir la fiche/i }).first().click();
  await page.waitForTimeout(2500);

  const reserveBtn = page.getByRole("button", { name: /^Réserver$/i }).first();
  console.log("Réserver visible:", await reserveBtn.isVisible().catch(() => false));
  await reserveBtn.click();
  await page.waitForTimeout(2000);

  const multiSend = page.getByRole("button", { name: /Envoyer ma demande maintenant/i });
  if (await multiSend.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Multi-vehicle modal detected");
    await multiSend.click();
    await page.waitForTimeout(2000);
  }

  const declineAgency = page.getByRole("button", {
    name: /Non merci, je viendrai à l'agence/i,
  });
  if (await declineAgency.isVisible({ timeout: 8000 }).catch(() => false)) {
    await declineAgency.click();
    await page.waitForTimeout(1500);
  }

  const sendNow = page.getByRole("button", { name: /Envoyer ma demande maintenant/i });
  if (await sendNow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sendNow.click();
    await page.waitForTimeout(1500);
  }

  const cashRadio = page.locator("#payment-cash-on-site");
  const cashVisible = await cashRadio.isVisible({ timeout: 12000 }).catch(() => false);
  console.log("payment-cash-on-site visible:", cashVisible);
  if (cashVisible) {
    await cashRadio.click({ force: true });
    await page.waitForTimeout(800);
    await page.locator("#payment-card-online").click({ force: true });
    await page.waitForTimeout(500);
    await cashRadio.click({ force: true });
    await page.waitForTimeout(800);
  }

  const confirmBtn = page.getByRole("button", { name: /Confirmer la réservation/i }).first();
  if (await confirmBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await confirmBtn.click();
    await page.waitForTimeout(8000);
  }
  console.log("URL after cash booking:", page.url());
}

async function runCardPaymentFlow(page) {
  console.log("\n=== Parcours 1 — Card (pay modal + stripe) ===");
  await page.goto(`${BASE}/me/renter/bookings`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(6000);

  const mainText = await page.locator("main").innerText().catch(() => "");
  console.log("Bookings snippet:", mainText.slice(0, 200).replace(/\s+/g, " "));

  const triggers = page.locator("main button[data-state]").filter({ hasText: /./ });
  const n = await triggers.count();
  for (let i = 0; i < n; i++) {
    const el = triggers.nth(i);
    const state = await el.getAttribute("data-state");
    if (state === "closed") await el.click({ force: true });
  }
  await page.waitForTimeout(1500);

  const payBtn = page.getByRole("button", { name: /^Payer ma location$/i }).first();
  console.log("Payer ma location visible:", await payBtn.isVisible({ timeout: 10000 }).catch(() => false));
  if (await payBtn.isVisible().catch(() => false)) {
    await payBtn.click();
    await page.waitForTimeout(2000);
    console.log("payment_flow_opened step done (modal open)");
  }

  const payStripe = page.getByRole("button", { name: /Payer.*via Stripe/i }).first();
  console.log("Payer via Stripe visible:", await payStripe.isVisible({ timeout: 8000 }).catch(() => false));
  if (await payStripe.isVisible().catch(() => false)) {
    await payStripe.click();
    await page.waitForTimeout(8000);
    console.log("URL after stripe click:", page.url());
  }

  // Parcours 2 guard: cash booking — pas de bouton Payer ma location
  const cashPayBtn = page.getByRole("button", { name: /^Payer ma location$/i });
  console.log("Cash booking pay buttons count:", await cashPayBtn.count());
}

async function main() {
  const session = await getSession();
  const sessionPayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  };
  const storageKey = `sb-${projectRef}-auth-token-tenant`;

  const ga4Hits = [];
  const gtagEvents = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(
    ({ key, payload }) => localStorage.setItem(key, JSON.stringify(payload)),
    { key: storageKey, payload: sessionPayload }
  );
  await context.addInitScript(() => {
    window.__A2_GTAG = [];
    const wrap = () => {
      const prev = window.gtag;
      window.gtag = function (...args) {
        try {
          window.__A2_GTAG.push({ ts: new Date().toISOString(), args: JSON.parse(JSON.stringify(args)) });
        } catch {
          /* ignore */
        }
        if (typeof prev === "function") return prev.apply(this, args);
      };
    };
    wrap();
    setInterval(wrap, 250);
  });

  const page = await context.newPage();
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("google-analytics.com/g/collect") || url.includes("google-analytics.com/mp/collect")) {
      ga4Hits.push({ ts: new Date().toISOString(), decoded: decodeCollectUrl(url) });
    }
  });

  await runCashBookingFlow(page);
  await runCardPaymentFlow(page);

  const captured = await page.evaluate(() => window.__A2_GTAG || []);
  gtagEvents.push(...captured);
  await browser.close();

  const customEvents = gtagEvents
    .filter((e) => e.args?.[0] === "event")
    .map((e) => ({ ts: e.ts, name: e.args[1], params: e.args[2] || {} }));

  const byEvent = summarizeHits(ga4Hits);

  console.log("\n=== GA4 gtag (client hook) ===");
  for (const e of customEvents) {
    if (PAYMENT_EVENTS.includes(e.name)) {
      console.log(JSON.stringify({ source: "gtag_hook", ...e }));
    }
  }

  console.log("\n=== GA4 network (google-analytics.com/g/collect) ===");
  for (const name of PAYMENT_EVENTS) {
    const hits = byEvent[name] || [];
    for (const h of hits) {
      const d = h.decoded;
      const params = {};
      for (const [k, v] of Object.entries(d)) {
        if (k.startsWith("ep.") || k.startsWith("epn.")) params[k] = v;
      }
      console.log(
        JSON.stringify({
          source: "network_collect",
          event: name,
          ts: h.ts,
          tid: d.tid,
          params,
        })
      );
    }
  }

  const found = new Set([
    ...customEvents.map((e) => e.name),
    ...Object.keys(byEvent),
  ]);
  const paymentFound = PAYMENT_EVENTS.filter((e) => found.has(e));
  const paymentMissing = PAYMENT_EVENTS.filter((e) => !found.has(e));

  console.log("\n=== Synthèse ===");
  console.log("Événements paiement détectés:", paymentFound);
  console.log("Événements paiement manquants:", paymentMissing);
  console.log("Total collect hits:", ga4Hits.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
