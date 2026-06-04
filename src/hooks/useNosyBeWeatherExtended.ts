import { useCallback, useEffect, useState } from "react";
import type { NosyBeWeather } from "@/hooks/useNosyBeWeather";

export type NosyBeForecastDay = {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  weatherCode: number;
  precipitationMm: number;
  precipitationProbMax: number;
};

export type NosyBeWeatherExtended = NosyBeWeather & {
  forecast: NosyBeForecastDay[];
};

export function useNosyBeWeatherExtended() {
  const [weather, setWeather] = useState<NosyBeWeatherExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/public/weather-nosy-be?extended=1");
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as NosyBeWeatherExtended & { ok?: boolean };
      if (!json.ok || json.tempC == null || json.weatherCode == null) {
        throw new Error("invalid");
      }
      setWeather({
        tempC: json.tempC,
        weatherCode: json.weatherCode,
        fetchedAt: json.fetchedAt ?? new Date().toISOString(),
        forecast: Array.isArray(json.forecast)
          ? json.forecast.map((d) => ({
              date: d.date,
              tempMaxC: d.tempMaxC,
              tempMinC: d.tempMinC,
              weatherCode: d.weatherCode,
              precipitationMm: Number(d.precipitationMm ?? 0),
              precipitationProbMax: Number(d.precipitationProbMax ?? 0),
            }))
          : [],
      });
    } catch {
      setError(true);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weather, loading, error, refresh };
}
