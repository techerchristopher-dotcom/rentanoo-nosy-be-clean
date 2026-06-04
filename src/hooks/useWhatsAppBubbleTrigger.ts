import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export const SS_BUBBLE_DISMISSED = "rentanoo_whatsapp_bubble_dismissed";
const SS_SESSION_START = "rentanoo_whatsapp_session_start";
const SS_UNIQUE_PATHS = "rentanoo_whatsapp_unique_paths";

const DEFAULT_MIN_TIME_MS = 15_000;
const HIGH_INTENT_MIN_TIME_MS = 8_000;
const HIGH_INTENT_FALLBACK_MS = 12_000;
const DEFAULT_MIN_SCROLL = 0.25;
const HIGH_INTENT_MIN_SCROLL = 0.2;
const MIN_PAGE_VIEWS = 2;

function isHighIntentPath(pathname: string): boolean {
  return /^\/(vehicle|moto)\//.test(pathname);
}

function getSessionStart(): number {
  let start = sessionStorage.getItem(SS_SESSION_START);
  if (!start) {
    start = String(Date.now());
    sessionStorage.setItem(SS_SESSION_START, start);
  }
  return Number(start);
}

export function useWhatsAppBubbleTrigger(): {
  shouldShowBubble: boolean;
  triggerReason: string | null;
} {
  const location = useLocation();
  const [pageViews, setPageViews] = useState(1);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [triggerReason, setTriggerReason] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SS_BUBBLE_DISMISSED)) return;

    try {
      const raw = sessionStorage.getItem(SS_UNIQUE_PATHS);
      const paths = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      paths.add(location.pathname);
      sessionStorage.setItem(SS_UNIQUE_PATHS, JSON.stringify([...paths]));
      setPageViews(paths.size);
    } catch {
      setPageViews(1);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? window.scrollY / docHeight : 0;
      setScrollRatio((prev) => Math.max(prev, ratio));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(SS_BUBBLE_DISMISSED)) return;

    const evaluate = () => {
      const highIntent = isHighIntentPath(location.pathname);
      const elapsed = Date.now() - getSessionStart();
      const minTime = highIntent ? HIGH_INTENT_MIN_TIME_MS : DEFAULT_MIN_TIME_MS;
      const minScroll = highIntent ? HIGH_INTENT_MIN_SCROLL : DEFAULT_MIN_SCROLL;

      if (elapsed < minTime) return;

      let reason: string | null = null;
      if (scrollRatio >= minScroll) reason = "scroll";
      else if (pageViews >= MIN_PAGE_VIEWS) reason = "page_views";
      else if (highIntent && elapsed >= HIGH_INTENT_FALLBACK_MS) reason = "vehicle_page";

      if (reason) {
        setShouldShow(true);
        setTriggerReason(reason);
      }
    };

    evaluate();
    const interval = window.setInterval(evaluate, 800);
    return () => window.clearInterval(interval);
  }, [location.pathname, pageViews, scrollRatio]);

  return { shouldShowBubble: shouldShow, triggerReason };
}
