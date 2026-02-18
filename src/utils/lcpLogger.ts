/**
 * Log l'élément LCP une fois en fin de chargement (PerformanceObserver).
 * Activable via ?debugLcp=1 ou localStorage.DEBUG_LCP="1".
 */
function isLcpLoggerEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debugLcp") === "1") return true;
    return localStorage.getItem("DEBUG_LCP") === "1";
  } catch {
    return false;
  }
}

let lastEntry: LargestContentfulPaint | null = null;
let logTimeout: ReturnType<typeof setTimeout> | null = null;

const LOG_DELAY_MS = 2500;

function logLcp(): void {
  if (!lastEntry) return;
  const e = lastEntry.element;
  const tag = e?.tagName ?? "?";
  const size = lastEntry.size;
  const rect = e?.getBoundingClientRect();
  const area = size > 0 ? size : rect ? Math.round(rect.width * rect.height) : 0;

  let info = "";
  if (e?.tagName === "IMG") {
    const img = e as HTMLImageElement;
    info = img.currentSrc || img.src || "";
  } else {
    const text = e?.textContent?.trim() ?? "";
    info = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }

  console.log("[LCP]", {
    tag: tag,
    info,
    area,
    startTime: Math.round(lastEntry.startTime),
  });
  lastEntry = null;
  logTimeout = null;
}

function scheduleLog(): void {
  if (logTimeout) clearTimeout(logTimeout);
  logTimeout = setTimeout(logLcp, LOG_DELAY_MS);
}

export function initLcpLogger(): void {
  if (!isLcpLoggerEnabled() || !("PerformanceObserver" in window)) return;
  try {
    const ob = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        lastEntry = entry as LargestContentfulPaint;
        scheduleLog();
      }
    });
    ob.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // ignore
  }
}
