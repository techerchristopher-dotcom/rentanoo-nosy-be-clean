/** Vols aéroport Nosy Be Fascène (IATA: NOS) via AeroDataBox / RapidAPI. */

const NOSY_BE_IATA = "NOS";
const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
/** Créneaux horaires (max 12 h chacun) pour couvrir la journée complète. */
const DAY_TIME_WINDOWS = [
  ["T00:00", "T11:59"],
  ["T12:00", "T23:59"],
] as const;

/** AeroDataBox : fenêtre max 12 h par requête. */
const MAX_WINDOW_MINUTES = 720;
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
  selectedDate: string | null;
  arrivals: NosyBeFlight[];
  departures: NosyBeFlight[];
  nextArrival: NosyBeFlight | null;
  nextDeparture: NosyBeFlight | null;
  fetchedAt: string;
  nextRefreshHint: string;
  source: "aerodatabox";
};

type CacheEntry = { data: NosyBeFlightsSnapshot; expiresAt: number };

let liveCache: CacheEntry | null = null;
const dayCache = new Map<string, CacheEntry>();
let lastAeroDataBoxFetchAt = 0;

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function extractLocalParts(isoOrLocal: string): { date: string; time: string } {
  const m = isoOrLocal.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
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

function buildAvailableDates(): string[] {
  const today = todayYmdNosyBe();
  return Array.from({ length: FLIGHTS_FORECAST_DAYS }, (_, i) => addDaysYmd(today, i));
}

function parseScheduled(
  record: Record<string, unknown>,
  leg: "arrival" | "departure",
  options?: { preferScheduled?: boolean }
): {
  scheduledDate: string;
  scheduledLocal: string;
  scheduledTime: string;
} {
  const legObj = (record[leg] ?? record) as Record<string, unknown>;
  const scheduled = legObj.scheduledTime as Record<string, unknown> | undefined;
  const revised = legObj.revisedTime as Record<string, unknown> | undefined;
  const predicted = legObj.predictedTime as Record<string, unknown> | undefined;
  const local = options?.preferScheduled
    ? pickString(scheduled?.local, legObj.scheduledTimeLocal, legObj.scheduled, revised?.local, predicted?.local)
    : pickString(revised?.local, predicted?.local, scheduled?.local, legObj.scheduledTimeLocal, legObj.scheduled);
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

function normalizeStatus(raw: string): string {
  const s = raw.trim();
  if (!s || s.toLowerCase() === "unknown") return "Scheduled";
  if (s.toLowerCase() === "expected") return "Scheduled";
  return s;
}

/** Parse un vol FIDS (endpoint aéroport — pas de filtre NOS, déjà scoping). */
function parseFidsFlight(
  record: unknown,
  type: "arrival" | "departure",
  options?: { preferScheduled?: boolean }
): NosyBeFlight | null {
  if (!record || typeof record !== "object") return null;
  const r = record as Record<string, unknown>;
  const airline = (r.airline ?? {}) as Record<string, unknown>;
  const { scheduledDate, scheduledLocal, scheduledTime } = parseScheduled(r, type, options);
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
    status: normalizeStatus(pickString(r.status, "Scheduled") || "Scheduled"),
  };
}

function sortFlights(a: NosyBeFlight, b: NosyBeFlight): number {
  const byDate = a.scheduledDate.localeCompare(b.scheduledDate);
  if (byDate !== 0) return byDate;
  return a.scheduledTime.localeCompare(b.scheduledTime);
}

function flightKey(f: NosyBeFlight): string {
  return `${f.type}|${f.flightNumber}|${f.scheduledDate}|${f.scheduledTime}`;
}

function dedupeFlights(flights: NosyBeFlight[]): NosyBeFlight[] {
  const seen = new Set<string>();
  const out: NosyBeFlight[] = [];
  for (const f of flights.sort(sortFlights)) {
    const key = flightKey(f);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function flightMinutes(f: NosyBeFlight): number | null {
  const [h, m] = f.scheduledTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function pickNextOnDate(flights: NosyBeFlight[], date: string, nowMinutes: number): NosyBeFlight | null {
  const dayFlights = flights.filter((f) => f.scheduledDate === date);
  const isToday = date === todayYmdNosyBe();
  const upcoming = dayFlights
    .map((f) => {
      const minutes = flightMinutes(f);
      if (minutes == null) return null;
      return { flight: f, minutes };
    })
    .filter((x): x is { flight: NosyBeFlight; minutes: number } => x != null)
    .filter((x) => !isToday || x.minutes >= nowMinutes - 30)
    .sort((a, b) => a.minutes - b.minutes);
  return upcoming[0]?.flight ?? (isToday ? null : dayFlights[0] ?? null);
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

function buildSnapshot(
  arrivals: NosyBeFlight[],
  departures: NosyBeFlight[],
  selectedDate: string | null,
  nextArrival: NosyBeFlight | null,
  nextDeparture: NosyBeFlight | null
): NosyBeFlightsSnapshot {
  const fetchedAt = new Date().toISOString();
  return {
    airportIata: NOSY_BE_IATA,
    airportName: "Aéroport de Nosy Be (Fascène)",
    forecastDays: FLIGHTS_FORECAST_DAYS,
    availableDates: buildAvailableDates(),
    selectedDate,
    arrivals,
    departures,
    nextArrival,
    nextDeparture,
    fetchedAt,
    nextRefreshHint: new Date(Date.now() + FLIGHTS_CACHE_TTL_MS).toISOString(),
    source: "aerodatabox",
  };
}

async function fetchAeroDataBox(path: string): Promise<Record<string, unknown>> {
  const data = await fetchAeroDataBoxRaw(path);
  if (Array.isArray(data)) {
    return { arrivals: [], departures: [], flights: data };
  }
  return data as Record<string, unknown>;
}

async function fetchAeroDataBoxRaw(path: string, attempt = 0): Promise<unknown> {
  const apiKey = process.env.AERODATABOX_RAPIDAPI_KEY?.trim();
  if (!apiKey) throw new Error("AERODATABOX_RAPIDAPI_KEY non configurée");

  const wait = Math.max(0, 1_100 - (Date.now() - lastAeroDataBoxFetchAt));
  if (wait) await sleep(wait);

  const url = `https://${AERODATABOX_HOST}${path}`;
  lastAeroDataBoxFetchAt = Date.now();
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": AERODATABOX_HOST,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 204) {
    return { arrivals: [], departures: [] };
  }

  if (res.status === 429 && attempt < 2) {
    await sleep(2_000);
    return fetchAeroDataBoxRaw(path, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AeroDataBox indisponible (${res.status})${body ? `: ${body.slice(0, 120)}` : ""}`);
  }

  return (await res.json()) as unknown;
}

const FIDS_QUERY =
  "withLeg=true&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRelativeWindow(offsetMinutes: number, durationMinutes = MAX_WINDOW_MINUTES) {
  const path = `/flights/airports/iata/${NOSY_BE_IATA}?offsetMinutes=${offsetMinutes}&durationMinutes=${durationMinutes}&${FIDS_QUERY}`;
  return fetchAeroDataBox(path);
}

async function fetchAbsoluteWindow(fromLocal: string, toLocal: string) {
  const path = `/flights/airports/iata/${NOSY_BE_IATA}/${fromLocal}/${toLocal}?${FIDS_QUERY}`;
  return fetchAeroDataBox(path);
}

function parseFidsResponse(
  json: Record<string, unknown>,
  options?: { preferScheduled?: boolean }
): { arrivals: NosyBeFlight[]; departures: NosyBeFlight[] } {
  const arrivalsRaw = (json.arrivals ?? []) as unknown[];
  const departuresRaw = (json.departures ?? []) as unknown[];
  return {
    arrivals: dedupeFlights(
      arrivalsRaw
        .map((r) => parseFidsFlight(r, "arrival", options))
        .filter((f): f is NosyBeFlight => f != null)
    ),
    departures: dedupeFlights(
      departuresRaw
        .map((r) => parseFidsFlight(r, "departure", options))
        .filter((f): f is NosyBeFlight => f != null)
    ),
  };
}

async function getLiveNextFlights(): Promise<{
  nextArrival: NosyBeFlight | null;
  nextDeparture: NosyBeFlight | null;
}> {
  if (liveCache && Date.now() < liveCache.expiresAt) {
    return {
      nextArrival: liveCache.data.nextArrival,
      nextDeparture: liveCache.data.nextDeparture,
    };
  }

  const json = await fetchRelativeWindow(-120, MAX_WINDOW_MINUTES);
  const { arrivals, departures } = parseFidsResponse(json);
  const next = await resolveNextFlights(arrivals, departures);
  const data = buildSnapshot(arrivals, departures, null, next.nextArrival, next.nextDeparture);
  liveCache = { data, expiresAt: Date.now() + FLIGHTS_CACHE_TTL_MS };
  return next;
}

async function fetchDaySchedule(date: string): Promise<{ arrivals: NosyBeFlight[]; departures: NosyBeFlight[] }> {
  const cached = dayCache.get(date);
  if (cached && Date.now() < cached.expiresAt) {
    return { arrivals: cached.data.arrivals, departures: cached.data.departures };
  }

  let arrivals: NosyBeFlight[] = [];
  let departures: NosyBeFlight[] = [];

  for (const [fromSuffix, toSuffix] of DAY_TIME_WINDOWS) {
    const json = await fetchAbsoluteWindow(`${date}${fromSuffix}`, `${date}${toSuffix}`);
    const parsed = parseFidsResponse(json, { preferScheduled: true });
    arrivals = dedupeFlights([...arrivals, ...parsed.arrivals]);
    departures = dedupeFlights([...departures, ...parsed.departures]);
  }

  arrivals = arrivals.filter((f) => f.scheduledDate === date);
  departures = departures.filter((f) => f.scheduledDate === date);

  const minExpected = 2;
  const total = arrivals.length + departures.length;
  const cacheTtl = total >= minExpected ? FLIGHTS_CACHE_TTL_MS : 30 * 60 * 1000;

  const today = todayYmdNosyBe();
  const nowMin = nowMinutesNosyBe();
  const snapshot = buildSnapshot(
    arrivals,
    departures,
    date,
    pickNextOnDate(arrivals, date, nowMin),
    pickNextOnDate(departures, date, nowMin)
  );

  dayCache.set(date, { data: snapshot, expiresAt: Date.now() + cacheTtl });
  return { arrivals, departures };
}

async function resolveNextFlights(
  arrivals: NosyBeFlight[],
  departures: NosyBeFlight[]
): Promise<{ nextArrival: NosyBeFlight | null; nextDeparture: NosyBeFlight | null }> {
  const today = todayYmdNosyBe();
  const nowMin = nowMinutesNosyBe();
  let nextArrival = pickNextOnDate(arrivals, today, nowMin);
  let nextDeparture = pickNextOnDate(departures, today, nowMin);

  if (nextArrival && nextDeparture) {
    return { nextArrival, nextDeparture };
  }

  const tomorrow = addDaysYmd(today, 1);
  const day = await fetchDaySchedule(tomorrow);
  if (!nextArrival) nextArrival = day.arrivals[0] ?? null;
  if (!nextDeparture) nextDeparture = day.departures[0] ?? null;

  return { nextArrival, nextDeparture };
}

export function isNosyBeFlightsConfigured(): boolean {
  return Boolean(process.env.AERODATABOX_RAPIDAPI_KEY?.trim());
}

export async function getNosyBeFlights(date?: string): Promise<NosyBeFlightsSnapshot> {
  const normalizedDate = date?.trim();
  const availableDates = buildAvailableDates();

  if (normalizedDate) {
    if (!availableDates.includes(normalizedDate)) {
      throw new Error("Date hors horizon de programmation");
    }
    const cached = dayCache.get(normalizedDate);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    const { arrivals, departures } = await fetchDaySchedule(normalizedDate);
    const liveNext = await getLiveNextFlights();
    const snapshot = buildSnapshot(
      arrivals,
      departures,
      normalizedDate,
      liveNext.nextArrival,
      liveNext.nextDeparture
    );
    const prevEntry = dayCache.get(normalizedDate);
    dayCache.set(normalizedDate, {
      data: snapshot,
      expiresAt: prevEntry?.expiresAt ?? Date.now() + FLIGHTS_CACHE_TTL_MS,
    });
    return snapshot;
  }

  if (liveCache && Date.now() < liveCache.expiresAt) {
    return liveCache.data;
  }

  const json = await fetchRelativeWindow(-120, MAX_WINDOW_MINUTES);
  const { arrivals, departures } = parseFidsResponse(json);
  const { nextArrival, nextDeparture } = await resolveNextFlights(arrivals, departures);

  const data = buildSnapshot(arrivals, departures, null, nextArrival, nextDeparture);
  liveCache = { data, expiresAt: Date.now() + FLIGHTS_CACHE_TTL_MS };
  return data;
}
