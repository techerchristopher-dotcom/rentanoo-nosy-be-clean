import type { SupabaseClient } from "@supabase/supabase-js";

export const ALLOWED_SITE_ANALYTICS_EVENTS = [
  "whatsapp_fab_click",
  "whatsapp_bubble_shown",
  "whatsapp_fab_drag",
  "page_view",
] as const;

export type SiteAnalyticsEventName = (typeof ALLOWED_SITE_ANALYTICS_EVENTS)[number];

export function isAllowedSiteAnalyticsEvent(name: string): name is SiteAnalyticsEventName {
  return (ALLOWED_SITE_ANALYTICS_EVENTS as readonly string[]).includes(name);
}

export async function insertSiteAnalyticsEvent(
  supabaseAdmin: SupabaseClient,
  payload: {
    eventName: SiteAnalyticsEventName;
    pagePath?: string | null;
    metadata?: Record<string, string | number | boolean>;
  }
): Promise<void> {
  const { error } = await supabaseAdmin.from("site_analytics_events").insert({
    event_name: payload.eventName,
    page_path: payload.pagePath?.slice(0, 500) ?? null,
    metadata: payload.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

type EventRow = {
  event_name: string;
  page_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type SiteAnalyticsSummary = {
  days: number;
  totals: {
    whatsapp_fab_click: number;
    whatsapp_bubble_shown: number;
    whatsapp_fab_drag: number;
    page_view: number;
  };
  conversionRate: number | null;
  bubbleTriggers: Array<{ trigger: string; count: number }>;
  topClickPages: Array<{ pagePath: string; count: number }>;
  daily: Array<{ date: string; clicks: number; bubbles: number }>;
  firstEventAt: string | null;
  lastEventAt: string | null;
};

function startDateIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getSiteAnalyticsSummary(
  supabaseAdmin: SupabaseClient,
  days: number
): Promise<SiteAnalyticsSummary> {
  const since = startDateIso(days);

  const { data, error } = await supabaseAdmin
    .from("site_analytics_events")
    .select("event_name, page_path, metadata, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EventRow[];

  const totals = {
    whatsapp_fab_click: 0,
    whatsapp_bubble_shown: 0,
    whatsapp_fab_drag: 0,
    page_view: 0,
  };

  const triggerCounts = new Map<string, number>();
  const pageClickCounts = new Map<string, number>();
  const dailyMap = new Map<string, { clicks: number; bubbles: number }>();

  for (const row of rows) {
    if (row.event_name in totals) {
      totals[row.event_name as keyof typeof totals] += 1;
    }

    if (row.event_name === "whatsapp_bubble_shown") {
      const trigger = String(row.metadata?.trigger ?? "unknown");
      triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + 1);
    }

    if (row.event_name === "whatsapp_fab_click" && row.page_path) {
      pageClickCounts.set(row.page_path, (pageClickCounts.get(row.page_path) ?? 0) + 1);
    }

    const day = row.created_at.slice(0, 10);
    const daily = dailyMap.get(day) ?? { clicks: 0, bubbles: 0 };
    if (row.event_name === "whatsapp_fab_click") daily.clicks += 1;
    if (row.event_name === "whatsapp_bubble_shown") daily.bubbles += 1;
    dailyMap.set(day, daily);
  }

  const conversionRate =
    totals.whatsapp_bubble_shown > 0
      ? Math.round((totals.whatsapp_fab_click / totals.whatsapp_bubble_shown) * 1000) / 10
      : null;

  const bubbleTriggers = [...triggerCounts.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count);

  const topClickPages = [...pageClickCounts.entries()]
    .map(([pagePath, count]) => ({ pagePath, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const daily = [...dailyMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const timestamps = rows.map((r) => r.created_at).sort();

  return {
    days,
    totals,
    conversionRate,
    bubbleTriggers,
    topClickPages,
    daily,
    firstEventAt: timestamps[0] ?? null,
    lastEventAt: timestamps[timestamps.length - 1] ?? null,
  };
}
