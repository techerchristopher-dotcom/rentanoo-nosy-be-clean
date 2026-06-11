/**
 * Sprint 1 — 4 vérifications pré-commit (GA4, Coming Soon, non-régression, mobile).
 * Usage: node scripts/validate-sprint1-precommit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VALIDATE_BASE_URL || "http://localhost:3002";

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

function extractEventParams(decoded) {
  const params = {};
  for (const [k, v] of Object.entries(decoded)) {
    if (k.startsWith("ep.") || k.startsWith("epn.")) {
      params[k.replace(/^epn?\./, "")] = v;
    }
  }
  return params;
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function setupPage(context) {
  const ga4Hits = [];
  const gtagEvents = [];

  await context.addInitScript(() => {
    window.__SPRINT1_GTAG = [];
    const wrap = () => {
      const prev = window.gtag;
      window.gtag = function (...args) {
        try {
          window.__SPRINT1_GTAG.push({
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

  const page = await context.newPage();
  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("google-analytics.com/g/collect") ||
      url.includes("google-analytics.com/mp/collect")
    ) {
      ga4Hits.push({ ts: new Date().toISOString(), decoded: decodeCollectUrl(url) });
    }
  });

  page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

  return { page, ga4Hits, gtagEvents };
}

function getGtagCustomEvents(page) {
  return page.evaluate(() => {
    const rows = window.__SPRINT1_GTAG || [];
    return rows
      .filter((e) => e.args?.[0] === "event")
      .map((e) => ({ ts: e.ts, name: e.args[1], params: e.args[2] || {} }));
  });
}

function findCategorySelect(ga4Hits, gtagEvents, category) {
  const fromGtag = gtagEvents.filter(
    (e) => e.name === "category_select" && e.params?.category === category,
  );
  const fromNetwork = ga4Hits
    .filter((h) => h.decoded?.en === "category_select")
    .map((h) => ({
      ts: h.ts,
      params: extractEventParams(h.decoded),
      raw: h.decoded,
    }))
    .filter((h) => h.params.category === category);
  return { fromGtag, fromNetwork };
}

async function test1Ga4(page, ga4Hits) {
  console.log("\n=== TEST 1 — GA4 category_select ===");
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(2500);

  await page.evaluate(() => {
    try {
      localStorage.removeItem("rentanoo_search_criteria");
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await wait(2000);

  const results = {};

  for (const category of ["Scooter", "Moto"]) {
    await page.getByRole("button", { name: /^Explorer$/i }).click();
    await wait(500);
    await page
      .getByRole("button", {
        name: new RegExp(`^${category} — Disponible maintenant$`, "i"),
      })
      .click();
    await wait(1200);

    const gtagEvents = await getGtagCustomEvents(page);
    const key = category.toLowerCase();
    results[key] = findCategorySelect(ga4Hits, gtagEvents, key);

    const filterValue = await page
      .getByRole("combobox")
      .first()
      .innerText()
      .catch(() => "");
    results[key].filterApplied = filterValue.includes(category) ? category : filterValue;
    await wait(400);
  }

  return results;
}

async function test2ComingSoon(page) {
  console.log("\n=== TEST 2 — Coming Soon (Quad) ===");
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(2000);

  await page.getByRole("button", { name: /^Explorer$/i }).click();
  await wait(500);

  const modalTitle = page.getByRole("heading", {
    name: /Que souhaitez-vous louer/i,
  });
  await modalTitle.waitFor({ state: "visible", timeout: 5000 });

  const filterBefore = await page.getByRole("combobox").first().innerText().catch(() => "");

  let whatsappOpened = false;
  const popupPromise = page
    .waitForEvent("popup", { timeout: 8000 })
    .then((popup) => {
      whatsappOpened = popup.url().includes("wa.me") || popup.url().includes("whatsapp");
      return popup.url();
    })
    .catch(() => null);

  await page.getByRole("button", { name: /^Quad — Prochainement$/i }).click();
  const popupUrl = await popupPromise;
  await wait(800);

  const modalStillOpen = await modalTitle.isVisible().catch(() => false);
  const filterAfter = await page.getByRole("combobox").first().innerText().catch(() => "");

  return {
    whatsappOpened,
    popupUrl,
    modalStillOpen,
    filterBefore: filterBefore.trim(),
    filterAfter: filterAfter.trim(),
    filterUnchanged: filterBefore.trim() === filterAfter.trim(),
  };
}

async function test3BookingRegression(page) {
  console.log("\n=== TEST 3 — Non-régression réservation ===");
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(2500);

  await page.getByRole("button", { name: /catalogue de véhicules/i }).click();
  await wait(1500);

  await page.getByRole("button", { name: /^Voir la fiche$/i }).first().click();
  await wait(3000);

  const ficheUrl = page.url();
  const ficheOpened = /\/(vehicle|moto)\//.test(ficheUrl);

  const reserveBtn = page.getByRole("button", { name: /^Réserver$/i }).first();
  const reserveVisible = await reserveBtn.isVisible({ timeout: 8000 }).catch(() => false);

  let loginRedirect = false;
  let urlAfterReserve = ficheUrl;
  if (reserveVisible) {
    await reserveBtn.click();
    await wait(2500);
    urlAfterReserve = page.url();
    loginRedirect = /\/auth\/login/.test(urlAfterReserve);
  }

  const criticalErrors = consoleErrors.filter((e) => {
    if (e.includes("ResizeObserver")) return false;
    if (e.includes("google-analytics") || e.includes("gtag")) return false;
    // Dev/local : APIs météo/vols renvoient parfois 500 — préexistant hors Sprint 1
    if (e.includes("status of 500")) return false;
    // Attendu sur fiche sans session : tentative profil avant redirect login
    if (e.includes("Utilisateur non authentifié")) return false;
    return true;
  });

  return {
    ficheOpened,
    ficheUrl,
    reserveVisible,
    loginRedirect,
    urlAfterReserve,
    consoleErrors: criticalErrors,
  };
}

async function test4Mobile(page) {
  console.log("\n=== TEST 4 — Mobile viewport ===");
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(2500);

  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth > window.innerWidth + 2;
    const heroCta = document.querySelector('button[aria-label*="catalogue"]');
    const trustStrip = document.querySelector('[aria-label="Points forts Rentanoo"]');
    const rectsOverlap = (a, b) => {
      if (!a || !b) return false;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return !(
        ra.right < rb.left ||
        ra.left > rb.right ||
        ra.bottom < rb.top ||
        ra.top > rb.bottom
      );
    };
    const ctaRect = heroCta?.getBoundingClientRect();
    const ctaMinHeight = ctaRect ? ctaRect.height : 0;
    return {
      overflowX,
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      ctaVisible: !!heroCta && ctaRect && ctaRect.height >= 44 && ctaRect.width > 0,
      ctaMinHeight,
      trustStripVisible: !!trustStrip,
      ctaTrustOverlap: rectsOverlap(heroCta, trustStrip),
    };
  });

  await page.getByRole("button", { name: /catalogue de véhicules/i }).click();
  await wait(1200);
  const scrolledToCatalog = await page.evaluate(() => {
    const el = document.getElementById("search-results");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.top >= -80;
  });

  await page.getByRole("button", { name: /^Explorer$/i }).click();
  await wait(500);
  const modalOpen = await page
    .getByRole("heading", { name: /Que souhaitez-vous louer/i })
    .isVisible()
    .catch(() => false);

  const modalLayout = await page.evaluate(() => {
    const doc = document.documentElement;
    return { overflowX: doc.scrollWidth > window.innerWidth + 2 };
  });

  return {
    ...layout,
    scrolledToCatalog,
    modalOpen,
    modalOverflowX: modalLayout.overflowX,
  };
}

async function main() {
  const report = { passed: true, tests: {} };

  const browser = await chromium.launch({ headless: true });
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  const desktop = await setupPage(desktopContext);
  const mobile = await setupPage(mobileContext);

  try {
    report.tests.ga4 = await test1Ga4(desktop.page, desktop.ga4Hits);
    for (const cat of ["scooter", "moto"]) {
      const r = report.tests.ga4[cat];
      const ok =
        r.fromGtag.length > 0 && r.fromGtag[0].params.category === cat;
      if (!ok) report.passed = false;
    }

    report.tests.comingSoon = await test2ComingSoon(desktop.page);
    if (
      !report.tests.comingSoon.whatsappOpened ||
      !report.tests.comingSoon.modalStillOpen ||
      !report.tests.comingSoon.filterUnchanged
    ) {
      report.passed = false;
    }

    report.tests.booking = await test3BookingRegression(desktop.page);
    if (
      !report.tests.booking.ficheOpened ||
      !report.tests.booking.reserveVisible ||
      !report.tests.booking.loginRedirect ||
      report.tests.booking.consoleErrors.length > 0
    ) {
      report.passed = false;
    }

    report.tests.mobile = await test4Mobile(mobile.page);
    if (
      report.tests.mobile.overflowX ||
      report.tests.mobile.modalOverflowX ||
      !report.tests.mobile.ctaVisible ||
      report.tests.mobile.ctaTrustOverlap ||
      !report.tests.mobile.scrolledToCatalog ||
      !report.tests.mobile.modalOpen
    ) {
      report.passed = false;
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== RAPPORT JSON ===");
  console.log(JSON.stringify(report, null, 2));
  console.log("\n=== VERDICT ===");
  console.log(report.passed ? "ALL TESTS PASSED" : "TESTS FAILED");
  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
