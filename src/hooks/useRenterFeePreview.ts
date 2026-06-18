import { useEffect, useMemo, useState } from 'react';
import type { BookingPaymentMethod } from '@/services/supabase/bookings';
import {
  previewRenterFee,
  type RenterFeePreview,
} from '@/services/supabase/renterFeePreview';

export interface UseRenterFeePreviewResult {
  cardPreview: RenterFeePreview | null;
  cashPreview: RenterFeePreview | null;
  loading: boolean;
  error: boolean;
  /** Économie MGA si le client choisit CB vs espèces (frais cash − frais card). */
  savingsMga: number;
  previewFor: (method: BookingPaymentMethod) => RenterFeePreview | null;
}

/**
 * Charge en parallèle les previews card_online et cash_on_site pour un subtotal.
 * Tous les montants affichés doivent provenir de ces réponses RPC.
 */
export function useRenterFeePreview(
  subtotal: number,
  vehicleType?: string | null
): UseRenterFeePreviewResult {
  const [cardPreview, setCardPreview] = useState<RenterFeePreview | null>(null);
  const [cashPreview, setCashPreview] = useState<RenterFeePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      setCardPreview(null);
      setCashPreview(null);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      previewRenterFee(subtotal, 'card_online', vehicleType),
      previewRenterFee(subtotal, 'cash_on_site', vehicleType),
    ])
      .then(([card, cash]) => {
        if (cancelled) return;
        setCardPreview(card);
        setCashPreview(cash);
        setError(!card || !cash);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subtotal, vehicleType]);

  const savingsMga = useMemo(() => {
    if (!cardPreview || !cashPreview) return 0;
    return Math.max(0, cashPreview.service_fee_renter - cardPreview.service_fee_renter);
  }, [cardPreview, cashPreview]);

  const previewFor = (method: BookingPaymentMethod): RenterFeePreview | null =>
    method === 'cash_on_site' ? cashPreview : cardPreview;

  return {
    cardPreview,
    cashPreview,
    loading,
    error,
    savingsMga,
    previewFor,
  };
}
