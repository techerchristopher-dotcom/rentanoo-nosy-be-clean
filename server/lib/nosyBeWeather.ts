/** Météo Nosy Be via Open-Meteo (gratuit, sans clé API). */

const NOSY_BE_LAT = -13.3128;
const NOSY_BE_LON = 48.2578;
const OPEN_METEO_CURRENT_URL = `https://api.open-meteo.com/v1/forecast?latitude=${NOSY_BE_LAT}&longitude=${NOSY_BE_LON}&current=temperature_2m,weather_code&timezone=Indian%2FAntananarivo`;
const OPEN_METEO_EXTENDED_URL = `https://api.open-meteo.com/v1/forecast?latitude=${NOSY_BE_LAT}&longitude=${NOSY_BE_LON}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=Indian%2FAntananarivo`;
const CACHE_TTL_MS = 30 * 60 * 1000;

export type NosyBeWeatherSnapshot = {
  tempC: number;
  weatherCode: number;
  fetchedAt: string;
};

export type NosyBeForecastDay = {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  weatherCode: number;
  precipitationMm: number;
  precipitationProbMax: number;
};

export type NosyBeWeatherExtended = NosyBeWeatherSnapshot & {
  forecast: NosyBeForecastDay[];
};

let cache: { data: NosyBeWeatherSnapshot; expiresAt: number } | null = null;
let extendedCache: { data: NosyBeWeatherExtended; expiresAt: number } | null = null;

export async function getNosyBeWeather(): Promise<NosyBeWeatherSnapshot> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const res = await fetch(OPEN_METEO_CURRENT_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo indisponible (${res.status})`);
  }

  const json = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const tempC = Number(json.current?.temperature_2m);
  const weatherCode = Number(json.current?.weather_code);

  if (!Number.isFinite(tempC) || !Number.isFinite(weatherCode)) {
    throw new Error("Réponse Open-Meteo invalide");
  }

  const data: NosyBeWeatherSnapshot = {
    tempC: Math.round(tempC),
    weatherCode,
    fetchedAt: new Date().toISOString(),
  };

  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export async function getNosyBeWeatherExtended(): Promise<NosyBeWeatherExtended> {
  if (extendedCache && Date.now() < extendedCache.expiresAt) {
    return extendedCache.data;
  }

  const res = await fetch(OPEN_METEO_EXTENDED_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo indisponible (${res.status})`);
  }

  const json = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_sum?: number[];
      precipitation_probability_max?: number[];
    };
  };

  const tempC = Number(json.current?.temperature_2m);
  const weatherCode = Number(json.current?.weather_code);
  if (!Number.isFinite(tempC) || !Number.isFinite(weatherCode)) {
    throw new Error("Réponse Open-Meteo invalide");
  }

  const times = json.daily?.time ?? [];
  const forecast: NosyBeForecastDay[] = times.map((date, i) => ({
    date,
    tempMaxC: Math.round(Number(json.daily?.temperature_2m_max?.[i] ?? 0)),
    tempMinC: Math.round(Number(json.daily?.temperature_2m_min?.[i] ?? 0)),
    weatherCode: Number(json.daily?.weather_code?.[i] ?? 0),
    precipitationMm: Math.round(Number(json.daily?.precipitation_sum?.[i] ?? 0) * 10) / 10,
    precipitationProbMax: Math.round(Number(json.daily?.precipitation_probability_max?.[i] ?? 0)),
  }));

  const data: NosyBeWeatherExtended = {
    tempC: Math.round(tempC),
    weatherCode,
    fetchedAt: new Date().toISOString(),
    forecast,
  };

  extendedCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
