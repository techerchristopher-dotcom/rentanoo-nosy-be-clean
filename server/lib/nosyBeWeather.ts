/** Météo Nosy Be via Open-Meteo (gratuit, sans clé API). */

const NOSY_BE_LAT = -13.3128;
const NOSY_BE_LON = 48.2578;
const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${NOSY_BE_LAT}&longitude=${NOSY_BE_LON}&current=temperature_2m,weather_code&timezone=Indian%2FAntananarivo`;
const CACHE_TTL_MS = 30 * 60 * 1000;

export type NosyBeWeatherSnapshot = {
  tempC: number;
  weatherCode: number;
  fetchedAt: string;
};

let cache: { data: NosyBeWeatherSnapshot; expiresAt: number } | null = null;

export async function getNosyBeWeather(): Promise<NosyBeWeatherSnapshot> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const res = await fetch(OPEN_METEO_URL, {
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
