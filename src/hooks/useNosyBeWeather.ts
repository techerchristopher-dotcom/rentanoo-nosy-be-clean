import { useCallback, useEffect, useState } from "react";

export type NosyBeWeather = {
  tempC: number;
  weatherCode: number;
  fetchedAt: string;
};

export function useNosyBeWeather() {
  const [weather, setWeather] = useState<NosyBeWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/public/weather-nosy-be");
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        ok?: boolean;
        tempC?: number;
        weatherCode?: number;
        fetchedAt?: string;
      };
      if (!json.ok || json.tempC == null || json.weatherCode == null) {
        throw new Error("invalid");
      }
      setWeather({
        tempC: json.tempC,
        weatherCode: json.weatherCode,
        fetchedAt: json.fetchedAt ?? new Date().toISOString(),
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
