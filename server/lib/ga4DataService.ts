import { BetaAnalyticsDataClient } from "@google-analytics/data";

export type Ga4Overview = {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  avgSessionDurationSec: number;
};

export type Ga4TopPage = {
  pagePath: string;
  pageViews: number;
  activeUsers: number;
};

export type Ga4TrafficSource = {
  source: string;
  medium: string;
  sessions: number;
};

export type Ga4Country = {
  country: string;
  activeUsers: number;
};

export type Ga4Device = {
  device: string;
  activeUsers: number;
};

export type Ga4DailyUsers = {
  date: string;
  activeUsers: number;
  sessions: number;
};

export type Ga4Report = {
  configured: boolean;
  days: number;
  overview: Ga4Overview | null;
  topPages: Ga4TopPage[];
  trafficSources: Ga4TrafficSource[];
  countries: Ga4Country[];
  devices: Ga4Device[];
  daily: Ga4DailyUsers[];
  setupHint?: string;
};

function parseIntMetric(value: string | undefined | null): number {
  const n = parseInt(String(value ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatMetric(value: string | undefined | null): number {
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

let cachedClient: BetaAnalyticsDataClient | null | undefined;

function getGa4Client(): BetaAnalyticsDataClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const jsonRaw = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (!jsonRaw) {
    cachedClient = null;
    return null;
  }

  try {
    const credentials = JSON.parse(jsonRaw) as {
      client_email?: string;
      private_key?: string;
    };
    if (!credentials.client_email || !credentials.private_key) {
      cachedClient = null;
      return null;
    }
    cachedClient = new BetaAnalyticsDataClient({ credentials });
    return cachedClient;
  } catch {
    cachedClient = null;
    return null;
  }
}

function getPropertyId(): string | null {
  const id = process.env.GA4_PROPERTY_ID?.trim();
  return id && /^\d+$/.test(id) ? id : null;
}

export function isGa4Configured(): boolean {
  return Boolean(getGa4Client() && getPropertyId());
}

export async function fetchGa4Report(days: number): Promise<Ga4Report> {
  const propertyId = getPropertyId();
  const client = getGa4Client();

  if (!client || !propertyId) {
    return {
      configured: false,
      days,
      overview: null,
      topPages: [],
      trafficSources: [],
      countries: [],
      devices: [],
      daily: [],
      setupHint:
        "Configurez GA4_PROPERTY_ID et GA4_SERVICE_ACCOUNT_JSON sur le serveur Express (Railway). Voir la documentation dans .env.local.example.",
    };
  }

  const property = `properties/${propertyId}`;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  const [overviewRes, pagesRes, sourcesRes, countriesRes, devicesRes, dailyRes] =
    await Promise.all([
      client.runReport({
        property,
        dateRanges,
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
        ],
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 15,
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    ]);

  const overviewRow = overviewRes[0]?.rows?.[0]?.metricValues ?? [];
  const overview: Ga4Overview = {
    activeUsers: parseIntMetric(overviewRow[0]?.value),
    sessions: parseIntMetric(overviewRow[1]?.value),
    pageViews: parseIntMetric(overviewRow[2]?.value),
    avgSessionDurationSec: Math.round(parseFloatMetric(overviewRow[3]?.value)),
  };

  const topPages: Ga4TopPage[] = (pagesRes[0]?.rows ?? []).map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value ?? "—",
    pageViews: parseIntMetric(row.metricValues?.[0]?.value),
    activeUsers: parseIntMetric(row.metricValues?.[1]?.value),
  }));

  const trafficSources: Ga4TrafficSource[] = (sourcesRes[0]?.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? "(direct)",
    medium: row.dimensionValues?.[1]?.value ?? "(none)",
    sessions: parseIntMetric(row.metricValues?.[0]?.value),
  }));

  const countries: Ga4Country[] = (countriesRes[0]?.rows ?? []).map((row) => ({
    country: row.dimensionValues?.[0]?.value ?? "—",
    activeUsers: parseIntMetric(row.metricValues?.[0]?.value),
  }));

  const devices: Ga4Device[] = (devicesRes[0]?.rows ?? []).map((row) => ({
    device: row.dimensionValues?.[0]?.value ?? "—",
    activeUsers: parseIntMetric(row.metricValues?.[0]?.value),
  }));

  const daily: Ga4DailyUsers[] = (dailyRes[0]?.rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value ?? "";
    const isoDate =
      raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
    return {
      date: isoDate,
      activeUsers: parseIntMetric(row.metricValues?.[0]?.value),
      sessions: parseIntMetric(row.metricValues?.[1]?.value),
    };
  });

  return {
    configured: true,
    days,
    overview,
    topPages,
    trafficSources,
    countries,
    devices,
    daily,
  };
}
