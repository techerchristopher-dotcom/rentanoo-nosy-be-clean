import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { roundAriaryToThousand } from "@/utils/dualCurrency";
import { RentalCalculation, VehicleRentalInfo } from "@/types";
import {
  computeBaseRentalPrice,
  computeBillableRentalDays,
} from "@/utils/rentalPriceFromDates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calcule le nombre de jours facturables (jours calendaires + règle 9h/12h retour).
 */
export function calculateRentalDays(
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): number {
  if (!startDate || !endDate || !startTime || !endTime) {
    return 0;
  }
  return computeBillableRentalDays(startDate, endDate, startTime, endTime);
}

/**
 * Calcule le coût total de location à partir des jours facturables.
 */
export function calculateRentalCost(pricePerDayMga: number, days: number): number {
  return roundAriaryToThousand(Math.max(0, days) * Math.max(0, pricePerDayMga));
}

/**
 * Crée un objet RentalCalculation à partir des paramètres de location
 */
export function createRentalCalculation(
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): RentalCalculation {
  const rentalDays = calculateRentalDays(startDate, startTime, endDate, endTime);

  return {
    startDate,
    endDate,
    startTime,
    endTime,
    rentalDays,
    isCalculated: rentalDays > 0,
    calculatedAt: new Date(),
  };
}

/**
 * Crée un objet VehicleRentalInfo pour un véhicule spécifique
 */
export function createVehicleRentalInfo(
  vehicleId: string,
  pricePerDay: number,
  rentalCalculation: RentalCalculation
): VehicleRentalInfo {
  let totalCost = 0;
  let days = 0;

  if (rentalCalculation.isCalculated) {
    const { basePrice, rentalDays } = computeBaseRentalPrice(
      pricePerDay,
      rentalCalculation.startDate,
      rentalCalculation.endDate,
      rentalCalculation.startTime,
      rentalCalculation.endTime
    );
    totalCost = basePrice;
    days = rentalDays;
  }

  return {
    vehicleId,
    pricePerDay,
    totalCost,
    formattedPrice: "",
    days,
    hours: 0,
  };
}

/**
 * Valide si un objet RentalCalculation est valide
 */
export function isValidRentalCalculation(calculation: RentalCalculation): boolean {
  return (
    calculation.startDate instanceof Date &&
    calculation.endDate instanceof Date &&
    typeof calculation.startTime === "string" &&
    typeof calculation.endTime === "string" &&
    calculation.rentalDays >= 0 &&
    typeof calculation.isCalculated === "boolean" &&
    calculation.calculatedAt instanceof Date
  );
}
