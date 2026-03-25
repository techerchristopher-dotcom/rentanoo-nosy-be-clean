/**
 * Prix de location de base (sans options), aligné sur VehicleDetails.handleConfirmBooking.
 */
export function computeBaseRentalPrice(
  pricePerDay: number,
  startDate: Date,
  endDate: Date
): { basePrice: number; rentalDays: number; rentalHours: number } {
  const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const completeDays = Math.floor(rentalHours / 24);
  const extraHours = rentalHours % 24;

  let totalPrice: number;
  if (rentalHours < 24) {
    totalPrice = pricePerDay;
  } else if (extraHours === 0) {
    totalPrice = completeDays * pricePerDay;
  } else {
    const hourPrice = pricePerDay / 24;
    const extraHoursPrice = extraHours * hourPrice;
    totalPrice = Math.ceil(completeDays * pricePerDay + extraHoursPrice);
  }

  const rentalDays = rentalHours < 24 ? 1 : completeDays + (extraHours > 0 ? 1 : 0);

  return { basePrice: totalPrice, rentalDays, rentalHours };
}
