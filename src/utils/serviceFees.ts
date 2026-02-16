/**
 * Service Fees - Source of Truth
 * 
 * Règle métier:
 * - Renter service fee = 15% du SUBTOTAL
 * - Owner service fee = 15% du SUBTOTAL (retenu du payout)
 * - Commission plateforme totale = 30% du SUBTOTAL
 * - SUBTOTAL = base rental + options (EXCLUT le fee renter)
 */

export const SERVICE_FEE_PERCENT_RENTER = 0.15;
export const SERVICE_FEE_PERCENT_OWNER = 0.15;

/**
 * Calcule les frais de service pour le locataire (renter)
 * @param subtotal - Montant du sous-total (basePrice + optionsTotal) en euros
 * @returns Frais de service arrondi à 2 décimales
 */
export function calcServiceFeeRenter(subtotal: number): number {
  return Math.round(subtotal * SERVICE_FEE_PERCENT_RENTER * 100) / 100;
}

/**
 * Calcule les frais de service pour le propriétaire (owner)
 * @param subtotal - Montant du sous-total (basePrice + optionsTotal) en euros
 * @returns Frais de service arrondi à 2 décimales
 */
export function calcServiceFeeOwner(subtotal: number): number {
  return Math.round(subtotal * SERVICE_FEE_PERCENT_OWNER * 100) / 100;
}

/**
 * Calcule le total à payer par le locataire
 * @param subtotal - Montant du sous-total (basePrice + optionsTotal) en euros
 * @returns Total arrondi à 2 décimales
 */
export function calcRenterTotal(subtotal: number): number {
  const serviceFee = calcServiceFeeRenter(subtotal);
  return Math.round((subtotal + serviceFee) * 100) / 100;
}

/**
 * Calcule le revenu du propriétaire (après commission)
 * @param subtotal - Montant du sous-total (basePrice + optionsTotal) en euros
 * @returns Revenu arrondi à 2 décimales
 */
export function calcOwnerPayout(subtotal: number): number {
  const serviceFee = calcServiceFeeOwner(subtotal);
  return Math.round((subtotal - serviceFee) * 100) / 100;
}

/**
 * Calcule la commission totale de la plateforme
 * @param subtotal - Montant du sous-total (basePrice + optionsTotal) en euros
 * @returns Commission totale arrondie à 2 décimales
 */
export function calcPlatformTotalFee(subtotal: number): number {
  const renterFee = calcServiceFeeRenter(subtotal);
  const ownerFee = calcServiceFeeOwner(subtotal);
  return Math.round((renterFee + ownerFee) * 100) / 100;
}

/**
 * Self-check DEV-only: Vérifie la cohérence des calculs
 * @param subtotal - Montant du sous-total
 * @param renterFee - Frais renter calculés
 * @param ownerFee - Frais owner calculés
 * @param platformFee - Commission totale calculée
 */
export function validateFeeCalculations(
  subtotal: number,
  renterFee: number,
  ownerFee: number,
  platformFee: number
): void {
  if (process.env.NODE_ENV !== "production") {
    const expectedRenterFee = calcServiceFeeRenter(subtotal);
    const expectedOwnerFee = calcServiceFeeOwner(subtotal);
    const expectedPlatformFee = calcPlatformTotalFee(subtotal);

    const tolerance = 0.01; // Tolérance d'arrondi

    if (Math.abs(renterFee - expectedRenterFee) > tolerance) {
      console.warn(
        `⚠️ [serviceFees] Incohérence renterFee: attendu ${expectedRenterFee}, reçu ${renterFee} (subtotal: ${subtotal})`
      );
    }

    if (Math.abs(ownerFee - expectedOwnerFee) > tolerance) {
      console.warn(
        `⚠️ [serviceFees] Incohérence ownerFee: attendu ${expectedOwnerFee}, reçu ${ownerFee} (subtotal: ${subtotal})`
      );
    }

    if (Math.abs(platformFee - expectedPlatformFee) > tolerance) {
      console.warn(
        `⚠️ [serviceFees] Incohérence platformFee: attendu ${expectedPlatformFee}, reçu ${platformFee} (subtotal: ${subtotal})`
      );
    }

    // Vérifier que renterFee + ownerFee ≈ platformFee (avec tolérance d'arrondi)
    const sumFees = Math.round((renterFee + ownerFee) * 100) / 100;
    if (Math.abs(sumFees - platformFee) > tolerance) {
      console.warn(
        `⚠️ [serviceFees] Incohérence somme fees: renterFee (${renterFee}) + ownerFee (${ownerFee}) = ${sumFees}, mais platformFee = ${platformFee}`
      );
    }
  }
}
