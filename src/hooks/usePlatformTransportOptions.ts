import { useCallback, useEffect, useState } from "react";
import {
  PLATFORM_AIRPORT_OPTION_PRICE,
  PLATFORM_HOTEL_OPTION_PRICE,
  PLATFORM_TRANSPORT_OPTIONS,
  type PlatformBookingOptionDef,
} from "@/constants/platformBookingOptions";

export type PlatformTransportPrices = {
  airportFlatMga: number;
  hotelFlatMga: number;
};

const DEFAULT_PRICES: PlatformTransportPrices = {
  airportFlatMga: PLATFORM_AIRPORT_OPTION_PRICE,
  hotelFlatMga: PLATFORM_HOTEL_OPTION_PRICE,
};

function buildOptions(prices: PlatformTransportPrices): PlatformBookingOptionDef[] {
  return PLATFORM_TRANSPORT_OPTIONS.map((opt) => ({
    ...opt,
    totalPrice: opt.id.includes("hotel") ? prices.hotelFlatMga : prices.airportFlatMga,
  }));
}

export function usePlatformTransportOptions() {
  const [prices, setPrices] = useState<PlatformTransportPrices>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/booking-transport-options");
      if (!res.ok) return;
      const json = (await res.json()) as {
        ok?: boolean;
        airportFlatMga?: number;
        hotelFlatMga?: number;
      };
      if (json.ok && json.airportFlatMga && json.hotelFlatMga) {
        setPrices({
          airportFlatMga: Math.round(json.airportFlatMga),
          hotelFlatMga: Math.round(json.hotelFlatMga),
        });
      }
    } catch {
      // fallback constants
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    prices,
    options: buildOptions(prices),
    loading,
    refresh,
  };
}
