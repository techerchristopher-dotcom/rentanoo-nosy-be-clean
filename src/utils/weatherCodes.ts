/** Catégories WMO (Open-Meteo) pour libellés i18n. */
export type WeatherCategory = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "storm" | "snow";

export type WeatherDisplayInput = {
  weatherCode: number;
  /** Cumul pluie journalier (mm) — Open-Meteo daily.precipitation_sum */
  precipitationMm?: number | null;
  /** Probabilité max de précipitations (%) — Open-Meteo daily.precipitation_probability_max */
  precipitationProbMax?: number | null;
};

function rawWmoCategory(code: number): WeatherCategory {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 77) return "snow";
  return "cloudy";
}

/**
 * Catégorie affichée en tenant compte du code WMO et du contexte pluie.
 * Open-Meteo classe souvent la bruine (51–55) comme « condition la plus sévère »
 * de la journée, alors que les bulletins locaux parlent d'éclaircies.
 */
export function resolveWeatherCategory(input: WeatherDisplayInput): WeatherCategory {
  const { weatherCode: code, precipitationMm, precipitationProbMax } = input;
  const raw = rawWmoCategory(code);
  const precip = precipitationMm ?? null;
  const prob = precipitationProbMax ?? null;

  if (raw === "drizzle") {
    if (precip != null && precip < 2.5) return "cloudy";
    if (prob != null && prob < 45) return "cloudy";
    if (precip == null && prob == null) return "cloudy";
    return "drizzle";
  }

  if (raw === "rain") {
    if (code === 61 && precip != null && precip < 4) return "drizzle";
    if (code === 61 && precip != null && precip < 6 && prob != null && prob < 55) return "cloudy";
    if (precip != null && precip < 1.5 && prob != null && prob < 40) return "cloudy";
  }

  return raw;
}

/** Compat — sans contexte pluie, la bruine est affichée nuageux. */
export function weatherCodeCategory(code: number): WeatherCategory {
  return resolveWeatherCategory({ weatherCode: code });
}
