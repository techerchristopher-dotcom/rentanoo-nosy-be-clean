import { useCallback, useEffect, useState } from "react";

export type ExchangeRateHistoryPoint = {
  date: string;
  rate: number;
};

export function useExchangeRateHistory() {
  const [history, setHistory] = useState<ExchangeRateHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/public/exchange-rate/history");
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { ok?: boolean; history?: ExchangeRateHistoryPoint[] };
      if (!json.ok || !Array.isArray(json.history)) throw new Error("invalid");
      setHistory(json.history);
    } catch {
      setError(true);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { history, loading, error, refresh };
}
