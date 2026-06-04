/** Vols aéroport Nosy Be Fascène (IATA: NOS) via AeroDataBox / RapidAPI. */

const NOSY_BE_IATA = "NOS";
const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
/** 2 actualisations / jour max (~60 appels/mois). */
export const FLIGHTS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
/** Horizon de programmation affiché (jours calendaires à partir d'aujourd'hui). */
export const FLIGHTS_FORECAST_DAYS = 7;

export type NosyBeFlight = {
  type: "arrival" | "departure";
  flightNumber: string;
  airline: string;
  airportCode: string;
  airportName: string;
  scheduledDate: string;
  scheduledLocal: string;
  scheduledTime: string;
  status: string;
};

export type NosyBeFlightsSnapshot = {
  airportIata: string;
  airportName: string;
  forecastDays: number;
  availableDates: string[];
  arrivals: NosyBeFlight[];
  departures: NosyBeFlight[];
  nextArrival: NosyBeFlight | null;
  nextDeparture: NosyBeFlight | null;
  fetchedAt: string;
  nextRefreshHint: string;
  source: "aerodatabox";
};

let cache: { data: NosyBeFlightsSnapshot; expiresAt: number } | null = null;

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extractLocalParts(isoOrLocal: string): { date: string; time: string } {
  const isoMatch = isoOrLocal.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (isoMatch) {
    return { date: isoMatch[1], time: isoMatch[2] };
  }
  const timeMatch = isoOrLocal.match(/(\d{2}:\d{2})/);
  return {
    date: todayYmdNosyBe(),
    time: timeMatch ? timeMatch[1] : "—",
  };
}

function todayYmdNosyBe(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Antananarivo" }).format(new Date());
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseScheduled(record: Record<string, unknown>, leg: "arrival" | "departure"): {
  scheduledDate: string;
  scheduledLocal: string;
  scheduledTime: string;
} {
  const legObj = (record[leg] ?? record) as Record<string, unknown>;
  const scheduled = legObj.scheduledTime as Record<string, unknown> | undefined;
  const local = pickString(scheduled?.local, legObj.scheduledTimeLocal, legObj.scheduled);
  const { date, time } = local ? extractLocalParts(local) : { date: "—", time: "—" };
  return { scheduledDate: date, scheduledLocal: local || "—", scheduledTime: time };
}

function parseCounterpart(
  record: Record<string, unknown>,
  type: "arrival" | "departure"
): { airportCode: string; airportName: string } {
  const otherLeg = type === "arrival" ? "departure" : "arrival";
  const legObj = (record[otherLeg] ?? {}) as Record<string, unknown>;
  const airport = (legObj.airport ?? {}) as Record<string, unknown>;
  return {
    airportCode: pickString(airport.iata, airport.icao),
    airportName: pickString(airport.name, airport.municipalityName),
  };
}

function parseFlight(record: unknown, type: "arrival" | "departure"): NosyBeFlight | null {
  if (!record || typeof record !== "object") return null;
  const r = record as Record<string, unknown>;
  const airline = (r.airline ?? {}) as Record<string, unknown>;
  const { scheduledDate, scheduledLocal, scheduledTime } = parseScheduled(r, type);
  const { airportCode, airportName } = parseCounterpart(r, type);

  const flightNumber = pickString(r.number, r.callSign, r.flightNumber);
  if (!flightNumber && scheduledTime === "—") return null;

  return {
    type,
    flightNumber: flightNumber || "—",
    airline: pickString(airline.name, airline.iata, airline.icao) || "—",
    airportCode: airportCode || "—",
    airportName: airportName || airportCode || "—",
    scheduledDate,
    scheduledLocal,
    scheduledTime,
    status: pickString(r.status, "Scheduled") || "Scheduled",
  };
}

function sortFlights(a: NosyBeFlight, b: NosyBeFlight): number {
  const byDate = a.scheduledDate.localeCompare(b.scheduledDate);
  if (byDate !== 0) return byDate;
  return a.scheduledTime.localeCompare(b.scheduledTime);
}

function flightMinutes(f: NosyBeFlight): number | null {
  const [h, m] = f.scheduledTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function pickNextToday(flights: NosyBeFlight[], nowMinutes: number): NosyBeFlight | null {
  const today = todayYmdNosyBe();
  const todayFlights = flights.filter((f) => f.scheduledDate === today);
  const upcoming = todayFlights
    .map((f) => {
      const minutes = flightMinutes(f);
      if (minutes == null) return null;
      return { flight: f, minutes };
    })
    .filter((x): x is { flight: NosyBeFlight; minutes: number } => x != null)
    .filter((x) => x.minutes >= nowMinutes - 30)
    .sort((a, b) => a.minutes - b.minutes);
  return upcoming[0]?.flight ?? todayFlights[0] ?? null;
}

function nowMinutesNosyBe(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Antananarivo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function buildAvailableDates(): string[] {
  const today = todayYmdNosyBe();
  return Array.from({ length: FLIGHTS_FORECAST_DAYS }, (_, i) => addDaysYmd(today, i));
}

function isWithinHorizon(f: NosyBeFlight, dates: Set<string>): boolean {
  return dates.has(f.scheduledDate);
}

export function isNosyBeFlightsConfigured(): boolean {
  return Boolean(process.env.AERODATABOX_RAPIDAPI_KEY?.trim());
}

export async function getNosyBeFlights(): Promise<NosyBeFlightsSnapshot> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const apiKey = process.env.AERODATABOX_RAPIDAPI_KEY?.trim();
  if (!apiKey) {
    throw new Error("AERODATABOX_RAPIDAPI_KEY non configurée");
  }

  const durationMinutes = FLIGHTS_FORECAST_DAYS * 24 * 60;
  const url = new URL(`https://${AERODATABOX_HOST}/flights/airports/iata/${NOSY_BE_IATA}`);
  url.searchParams.set("offsetMinutes", "0");
  url.searchParams.set("durationMinutes", String(durationMinutes));
  url.searchParams.set("withLeg", "true");
  url.searchParams.set("withCancelled", "false");
  url.searchParams.set("withCodeshared", "true");
  url.searchParams.set("withCargo", "false");
  url.searchParams.set("withPrivate", "false");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": AERODATABOX_HOST,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`AeroDataBox indisponible (${res.status})`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const arrivalsRaw = (json.arrivals ?? []) as unknown[];
  const departuresRaw = (json.departures ?? []) as unknown[];
  const availableDates = buildAvailableDates();
  const dateSet = new Set(availableDates);

  const arrivals = arrivalsRaw
    .map((r) => parseFlight(r, "arrival"))
    .filter((f): f is NosyBeFlight => f != null)
    .filter((f) => isWithinHorizon(f, dateSet))
    .sort(sortFlights);

  const departures = departuresRaw
    .map((r) => parseFlight(r, "departure"))
    .filter((f): f is NosyBeFlight => f != null)
    .filter((f) => isWithinHorizon(f, dateSet))
    .sort(sortFlights);

  const nowMin = nowMinutesNosyBe();
  const fetchedAt = new Date().toISOString();
  const data: NosyBeFlightsSnapshot = {
    airportIata: NOSY_BE_IATA,
    airportName: "Aéroport de Nosy Be (Fascène)",
    forecastDays: FLIGHTS_FORECAST_DAYS,
    availableDates,
    arrivals,
    departures,
    nextArrival: pickNextToday(arrivals, nowMin),
    nextDeparture: pickNextToday(departures, nowMin),
    fetchedAt,
    nextRefreshHint: new Date(Date.now() + FLIGHTS_CACHE_TTL_MS).toISOString(),
    source: "aerodatabox",
  };

  cache = { data, expiresAt: Date.now() + FLIGHTS_CACHE_TTL_MS };
  return data;
}
