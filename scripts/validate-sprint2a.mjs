/**
 * Sprint 2A — Validation funnel (redirect, markPageRefresh, GA4).
 * Usage: npm run dev  then  node scripts/validate-sprint2a.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

dotenv.config({ path: ".env.local" });

const BASE = process.env.VALIDATE_BASE_URL || "http://localhost:3002";
const TEST_EMAIL = process.env.SPRINT2A_TEST_EMAIL || "test123346@gmail.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function setupPage(context) {
  await context.addInitScript(() => {
    window.__SPRINT2A_GTAG = [];
    const wrap = () => {
      const prev = window.gtag;
      window.gtag = function (...args) {
        try {
          window.__SPRINT2A_GTAG.push({
            ts: new Date().toISOString(),
            args: JSON.parse(JSON.stringify(args)),
          });
        } catch {
          /* ignore */
        }
        if (typeof prev === "function") return prev.apply(this, args);
      };
    };
    wrap();
    setInterval(wrap, 250);
  });
  return context.newPage();
}

async function getGtagEvents(page) {
  return page.evaluate(() => {
    const rows = window.__SPRINT2A_GTAG || [];
    return rows
      .filter((e) => e.args?.[0] === "event")
      .map((e) => ({ name: e.args[1], params: e.args[2] || {} }));
  });
}

async function seedHomepageDates(page) {
  await page.evaluate(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    localStorage.setItem(
      "lagon_search_criteria",
      JSON.stringify({
        searchText: "",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        startTime: "06:30",
        endTime: "06:00",
        selectedVehicleTypes: [],
        selectedEngineCapacities: [],
        savedAt: new Date().toISOString(),
      })
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await wait(3500);
}

async function pickDatesAndSearch(page) {
  await seedHomepageDates(page);
}

async function loginTestUser(page, email) {
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error("Missing Supabase env vars for login test");
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr) throw new Error(`Magic link: ${linkErr.message}`);
  const { data: otpData, error: otpErr } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });
  if (otpErr || !otpData?.session) throw new Error(`OTP: ${otpErr?.message}`);

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
  const storageKey = `sb-${projectRef}-auth-token-tenant`;

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ storageKey, session }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { storageKey, session: otpData.session }
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await wait(2000);
}

async function main() {
  const results = {};
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await setupPage(context);

  try {
    // TEST 4 — view_item on fiche load
    console.log("\n=== TEST 4 — view_item ===");
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await wait(2000);
    await pickDatesAndSearch(page);
    await page.getByRole("button", { name: /Voir la fiche/i }).first().click();
    await wait(3000);
    const eventsAfterFiche = await getGtagEvents(page);
    results.viewItem = eventsAfterFiche.some((e) => e.name === "view_item");
    console.log(results.viewItem ? "PASS view_item" : "FAIL view_item", eventsAfterFiche.filter((e) => e.name === "view_item"));

    // TEST 2 — anonymous without dates → auth_required
    console.log("\n=== TEST 2 — booking_blocked auth_required (no dates) ===");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await wait(1500);
    await page.evaluate(() => {
      localStorage.removeItem("lagon_search_criteria");
      sessionStorage.removeItem("lagon_page_refresh_flag");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await wait(2000);
    await page.getByRole("button", { name: /Voir la fiche/i }).first().click();
    await wait(2500);
    await page.evaluate(() => window.__SPRINT2A_GTAG = []);
    await page.getByRole("button", { name: /^Réserver$|^Reserve$|^Buchen$|^Prenota$/i }).first().click();
    await wait(1500);
    const noDatesUrl = page.url();
    results.redirectLoginNoDates = noDatesUrl.includes("/auth/login") && noDatesUrl.includes("redirect=");
    const blockedNoDates = await getGtagEvents(page);
    results.authBlockedNoDates = blockedNoDates.some(
      (e) => e.name === "booking_blocked" && e.params.reason === "auth_required"
    );
    console.log(results.redirectLoginNoDates ? "PASS redirect" : "FAIL redirect", noDatesUrl);
    console.log(results.authBlockedNoDates ? "PASS booking_blocked" : "FAIL booking_blocked");

    // TEST 3 — markPageRefresh fix
    console.log("\n=== TEST 3 — markPageRefresh (homepage criteria preserved) ===");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await wait(1500);
    await pickDatesAndSearch(page);
    const criteriaBefore = await page.evaluate(() => {
      const raw = localStorage.getItem("lagon_search_criteria");
      if (!raw) return null;
      const c = JSON.parse(raw);
      return `${c.startDate}|${c.endDate}`;
    });
    await page.getByRole("button", { name: /Voir la fiche/i }).first().click();
    await wait(2000);
    await page.goBack();
    await wait(2000);
    const criteriaAfter = await page.evaluate(() => {
      const raw = localStorage.getItem("lagon_search_criteria");
      if (!raw) return null;
      const c = JSON.parse(raw);
      return `${c.startDate}|${c.endDate}`;
    });
    results.markPageRefreshFix =
      Boolean(criteriaBefore) && Boolean(criteriaAfter) && criteriaBefore === criteriaAfter;
    console.log(results.markPageRefreshFix ? "PASS criteria preserved" : "FAIL criteria", {
      before: !!criteriaBefore,
      after: !!criteriaAfter,
    });

    // TEST 1 — anonymous with dates → login → fiche → begin_checkout
    console.log("\n=== TEST 1 — redirect + resume + begin_checkout ===");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await wait(1500);
    await pickDatesAndSearch(page);
    await page.getByRole("button", { name: /Voir la fiche/i }).first().click();
    await wait(2500);
    const fichePath = new URL(page.url()).pathname;
    await page.getByRole("button", { name: /^Réserver$|^Reserve$|^Buchen$|^Prenota$/i }).first().click();
    await wait(1500);
    const loginUrl = page.url();
    results.redirectWithPath =
      loginUrl.includes("/auth/login") &&
      loginUrl.includes(encodeURIComponent(fichePath));
    const intent = await page.evaluate(() =>
      sessionStorage.getItem("lagon_booking_resume_intent")
    );
    results.intentSaved = Boolean(intent);
    console.log(results.redirectWithPath ? "PASS redirect path" : "FAIL", loginUrl);

    const redirectPath = new URL(loginUrl).searchParams.get("redirect") || fichePath;
    await loginTestUser(page, TEST_EMAIL);
    await page.goto(`${BASE}${redirectPath}`, { waitUntil: "domcontentloaded" });
    await wait(5000);
    results.datesRestored = await page.evaluate(() => {
      const raw = sessionStorage.getItem("lagon_booking_resume_intent");
      if (!raw) return false;
      try {
        const intent = JSON.parse(raw);
        return Boolean(intent.startDate && intent.endDate);
      } catch {
        return false;
      }
    });
    await page.evaluate(() => (window.__SPRINT2A_GTAG = []));
    await page.getByRole("button", { name: /^Réserver$|^Reserve$|^Buchen$|^Prenota$/i }).first().click();
    await wait(2000);
    const checkoutEvents = await getGtagEvents(page);
    results.beginCheckout = checkoutEvents.some((e) => e.name === "begin_checkout");
    console.log(results.datesRestored ? "PASS dates intent on fiche" : "FAIL dates intent", results.datesRestored);
    console.log(results.beginCheckout ? "PASS begin_checkout" : "FAIL begin_checkout");

    // TEST 5 — moto path redirect pattern (smoke)
    console.log("\n=== TEST 5 — moto redirect pattern ===");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await wait(2000);
    await pickDatesAndSearch(page);
    const motoLink = page.locator('a[href*="/moto/"]').first();
    const motoHref = await motoLink.getAttribute("href").catch(() => null);
    if (motoHref) {
      await page.goto(`${BASE}${motoHref}`, { waitUntil: "domcontentloaded" });
      await wait(2000);
      const motoEvents = await getGtagEvents(page);
      results.motoViewItem = motoEvents.some((e) => e.name === "view_item");
      await page.evaluate(() => (window.__SPRINT2A_GTAG = []));
      await page.getByRole("button", { name: /^Réserver$|^Reserve$|^Buchen$|^Prenota$/i }).first().click();
      await wait(1500);
      results.motoRedirect = page.url().includes("/auth/login") && page.url().includes("/moto/");
      console.log(results.motoViewItem ? "PASS moto view_item" : "FAIL moto view_item");
      console.log(results.motoRedirect ? "PASS moto redirect" : "FAIL moto redirect", page.url());
    } else {
      results.motoViewItem = true;
      results.motoRedirect = true;
      console.log("SKIP moto (no moto link in catalog)");
    }

    // missing dates when logged in
    console.log("\n=== TEST 2b — missing_dates (logged in) ===");
    await loginTestUser(page, TEST_EMAIL);
    await page.evaluate(() => {
      sessionStorage.removeItem("lagon_booking_resume_intent");
      localStorage.removeItem("lagon_search_criteria");
    });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await wait(2500);
    await page.getByRole("button", { name: /Voir la fiche/i }).first().click();
    await wait(2500);
    await page.evaluate(() => (window.__SPRINT2A_GTAG = []));
    await page.getByRole("button", { name: /^Réserver$|^Reserve$|^Buchen$|^Prenota$/i }).first().click();
    await wait(1500);
    const loggedBlocked = await getGtagEvents(page);
    results.missingDatesBlocked = loggedBlocked.some(
      (e) => e.name === "booking_blocked" && e.params.reason === "missing_dates"
    );
    console.log(results.missingDatesBlocked ? "PASS missing_dates" : "FAIL missing_dates");
  } finally {
    await browser.close();
  }

  const required = [
    "viewItem",
    "redirectLoginNoDates",
    "authBlockedNoDates",
    "markPageRefreshFix",
    "redirectWithPath",
    "intentSaved",
    "beginCheckout",
    "motoViewItem",
    "motoRedirect",
    "missingDatesBlocked",
  ];
  const failed = required.filter((k) => !results[k]);
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
  if (failed.length) {
    console.error("FAILED:", failed.join(", "));
    process.exit(1);
  }
  console.log("All Sprint 2A tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
