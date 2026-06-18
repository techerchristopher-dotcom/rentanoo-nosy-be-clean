import { supabase } from '@/integrations/supabase/client';
import type { BookingPaymentMethod } from '@/services/supabase/bookings';

/** Réponse JSON de la RPC Postgres `preview_renter_fee`. */
export interface RenterFeePreview {
  subtotal: number;
  fee_percent: number;
  payment_method: BookingPaymentMethod;
  service_fee_renter: number;
  amount_total_expected: number;
}

function parsePreviewRow(raw: unknown): RenterFeePreview | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const subtotal = Number(row.subtotal);
  const feePercent = Number(row.fee_percent);
  const serviceFee = Number(row.service_fee_renter);
  const total = Number(row.amount_total_expected);
  const paymentMethod = row.payment_method;

  if (
    !Number.isFinite(subtotal) ||
    subtotal <= 0 ||
    !Number.isFinite(feePercent) ||
    !Number.isFinite(serviceFee) ||
    !Number.isFinite(total) ||
    paymentMethod !== 'card_online' &&
    paymentMethod !== 'cash_on_site'
  ) {
    return null;
  }

  return {
    subtotal,
    fee_percent: feePercent,
    payment_method: paymentMethod as BookingPaymentMethod,
    service_fee_renter: serviceFee,
    amount_total_expected: total,
  };
}

/**
 * Prévisualise les frais locataire via la source de vérité Postgres (P1/P2).
 * Ne calcule rien côté client — affichage uniquement.
 */
export async function previewRenterFee(
  subtotal: number,
  paymentMethod: BookingPaymentMethod,
  vehicleType?: string | null,
): Promise<RenterFeePreview | null> {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return null;

  const { data, error } = await supabase.rpc('preview_renter_fee', {
    p_subtotal: subtotal,
    p_payment_method: paymentMethod,
    ...(vehicleType ? { p_vehicle_type: vehicleType } : {}),
  });

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[previewRenterFee] RPC error:', error.message);
    }
    return null;
  }

  return parsePreviewRow(data);
}

/** Pourcentage entier affiché (ex. 0.1 → 10), issu de la RPC. */
export function feePercentLabel(feePercent: number): number {
  return Math.round(feePercent * 100);
}
