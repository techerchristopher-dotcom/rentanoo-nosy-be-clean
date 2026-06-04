/** Catégories WMO (Open-Meteo) pour libellés i18n. */
export type WeatherCategory = "clear" | "cloudy" | "fog" | "rain" | "storm" | "snow";

export function weatherCodeCategory(code: number): WeatherCategory {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "cloudy";
  if (code >= 45 && code <= 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 77) return "snow";
  return "cloudy";
}
