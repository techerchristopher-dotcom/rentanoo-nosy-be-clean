export interface NormalizedBookingOption {
  name: string;
  totalPrice: number;
  price?: number;
  pricePerDay?: number;
  // Conserver l'objet d'origine pour un éventuel usage aval (icônes, etc.)
  raw?: any;
}

/**
 * Normalise la structure des options sélectionnées en provenance de Supabase.
 * Priorise totalPrice, puis price, puis 0 si rien n'est renseigné.
 */
export const normalizeBookingOptions = (selectedOptions: any): NormalizedBookingOption[] => {
  if (!selectedOptions) return [];

  const mapOption = (opt: any): NormalizedBookingOption => {
    const totalPrice = Number(opt?.totalPrice ?? opt?.price ?? 0) || 0;
    return {
      name: opt?.name || opt?.label || "Service",
      totalPrice,
      price: opt?.price,
      pricePerDay: opt?.pricePerDay,
      raw: opt,
    };
  };

  if (Array.isArray(selectedOptions)) {
    return selectedOptions.map(mapOption);
  }

  if (typeof selectedOptions === "object" && Array.isArray((selectedOptions as any).services)) {
    return (selectedOptions as any).services.map(mapOption);
  }

  return [];
};
