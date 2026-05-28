/** Réservation créée par l'admin (hors parcours web 24h). */
export function isAdminCreatedBooking(booking: {
  pricingMode?: string | null;
  pricing_mode?: string | null;
  createdByAdminId?: string | null;
  created_by_admin_id?: string | null;
}): boolean {
  const pricingMode = booking.pricingMode ?? booking.pricing_mode;
  const createdByAdminId = booking.createdByAdminId ?? booking.created_by_admin_id;
  return pricingMode === "admin" || !!createdByAdminId;
}
