import { useCallback, useEffect, useState } from "react";

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

export type NosyBeFlightsData = {
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
  nextRefreshHint: string | null;
};

export function useNosyBeFlights(date?: string) {
  const [data, setData] = useState<NosyBeFlightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [configured, setConfigured] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const qs = date ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/public/flights-nosy-be${qs}`);
      const json = (await res.json()) as {
        ok?: boolean;
        configured?: boolean;
        message?: string;
        airportIata?: string;
        airportName?: string;
        forecastDays?: number;
        availableDates?: string[];
        selectedDate?: string | null;
        arrivals?: NosyBeFlight[];
        departures?: NosyBeFlight[];
        nextArrival?: NosyBeFlight | null;
        nextDeparture?: NosyBeFlight | null;
        fetchedAt?: string;
        nextRefreshHint?: string;
      };
      if (json.configured === false) {
        setConfigured(false);
        setData(null);
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.message ?? String(res.status));
      setConfigured(true);
      setData({
        airportIata: json.airportIata ?? "NOS",
        airportName: json.airportName ?? "Nosy Be",
        forecastDays: json.forecastDays ?? 7,
        availableDates: json.availableDates ?? [],
        selectedDate: json.selectedDate ?? date ?? null,
        arrivals: json.arrivals ?? [],
        departures: json.departures ?? [],
        nextArrival: json.nextArrival ?? null,
        nextDeparture: json.nextDeparture ?? null,
        fetchedAt: json.fetchedAt ?? new Date().toISOString(),
        nextRefreshHint: json.nextRefreshHint ?? null,
      });
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, configured, refresh };
}
