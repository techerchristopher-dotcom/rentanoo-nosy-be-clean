import { useCallback, useEffect, useState } from "react";

export interface CatalogOption {
  id: string;
  name: string;
  description: string | null;
  priceMga: number;
  pricingMode: "flat" | "per_day";
}

/**
 * Catalogue d'options de réservation géré depuis le panel admin
 * (/admin/settings/pricing), filtré par catégorie de bien (vehicle_type).
 */
export function useBookingOptionsCatalog(vehicleType?: string | null) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const qs = vehicleType ? `?vehicleType=${encodeURIComponent(vehicleType)}` : "";
      const res = await fetch(`/api/public/booking-options${qs}`);
      if (!res.ok) return;
      const json = (await res.json()) as { ok?: boolean; options?: CatalogOption[] };
      if (json.ok) setOptions(json.options ?? []);
    } catch {
      // Pas de fallback hardcodé : en cas d'erreur réseau, la liste reste vide
      // plutôt que d'afficher des prix obsolètes.
    } finally {
      setLoading(false);
    }
  }, [vehicleType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, loading, refresh };
}
