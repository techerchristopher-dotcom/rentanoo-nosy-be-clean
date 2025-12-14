import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RentalCalculation, VehicleRentalInfo } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calcule le nombre de jours de location en tenant compte des heures
 * NOUVELLE LOGIQUE: Calcul précis par blocs de 24h + heures supplémentaires
 * @param startDate Date de départ
 * @param startTime Heure de départ (format "HH:MM")
 * @param endDate Date de retour
 * @param endTime Heure de retour (format "HH:MM")
 * @returns Nombre de jours calculé selon la durée réelle (blocs 24h + heures sup arrondi supérieur)
 */
export function calculateRentalDays(
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): number {
  // Validation des paramètres
  if (!startDate || !endDate || !startTime || !endTime) {
    return 0;
  }

  // Créer les dates complètes avec heures
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  
  // Analyser les heures
  const startHour = parseInt(startTime.split(':')[0]);
  const startMinute = parseInt(startTime.split(':')[1]);
  const endHour = parseInt(endTime.split(':')[0]);
  const endMinute = parseInt(endTime.split(':')[1]);
  
  // Appliquer les heures aux dates
  startDateTime.setHours(startHour, startMinute, 0, 0);
  endDateTime.setHours(endHour, endMinute, 0, 0);
  
  // Calculer la durée en heures
  const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  
  // Calcul par blocs de 24h + heures supplémentaires
  const completeDays = Math.floor(rentalHours / 24);
  const extraHours = rentalHours % 24;
  
  // NOUVELLE LOGIQUE: Facturer heures supp SEULEMENT si dépassement
  // Si < 24h → minimum 1 jour
  if (rentalHours < 24) {
    return 1; // Minimum 1 jour
  } else {
    // Si extraHours > 0 → facturer le dépassement
    // Sinon → seulement les jours complets
    return completeDays + (extraHours > 0 ? 1 : 0);
  }
}

/**
 * Calcule le coût total de location
 * @param pricePerDay Prix par jour du véhicule
 * @param days Nombre de jours de location
 * @returns Coût total arrondi supérieur
 */
export function calculateRentalCost(pricePerDay: number, days: number): number {
  return Math.ceil(pricePerDay * days);
}

/**
 * Calcule le coût total de location avec la durée réelle (heures précises)
 * @param pricePerDay Prix par jour du véhicule
 * @param startDate Date de départ
 * @param startTime Heure de départ
 * @param endDate Date de retour
 * @param endTime Heure de retour
 * @returns Coût total arrondi supérieur (selon blocs 24h + heures sup)
 */
export function calculateRentalCostWithHours(
  pricePerDay: number,
  startDate: Date,
  startTime: string,
  endDate: Date,
  endTime: string
): number {
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  
  const startHour = parseInt(startTime.split(':')[0]);
  const startMinute = parseInt(startTime.split(':')[1]);
  const endHour = parseInt(endTime.split(':')[0]);
  const endMinute = parseInt(endTime.split(':')[1]);
  
  startDateTime.setHours(startHour, startMinute, 0, 0);
  endDateTime.setHours(endHour, endMinute, 0, 0);
  
  const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
  const completeDays = Math.floor(rentalHours / 24);
  const extraHours = rentalHours % 24;
  
  if (rentalHours < 24) {
    return Math.ceil(pricePerDay); // Minimum 1 jour
  } else if (extraHours === 0) {
    // Pas d'heures supplémentaires → facturer seulement les jours complets
    return completeDays * pricePerDay;
  } else {
    // Heures supplémentaires → facturer jours complets + 1 jour pour le dépassement
    return Math.ceil((completeDays + 1) * pricePerDay);
  }
}

/**
 * Crée un objet RentalCalculation à partir des paramètres de location
 * @param startDate Date de départ
 * @param startTime Heure de départ
 * @param endDate Date de retour
 * @param endTime Heure de retour
 * @returns Objet RentalCalculation
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
    calculatedAt: new Date()
  };
}

/**
 * Crée un objet VehicleRentalInfo pour un véhicule spécifique
 * @param vehicleId ID du véhicule
 * @param pricePerDay Prix par jour du véhicule
 * @param rentalCalculation Calcul de location
 * @returns Objet VehicleRentalInfo
 */
export function createVehicleRentalInfo(
  vehicleId: string,
  pricePerDay: number,
  rentalCalculation: RentalCalculation
): VehicleRentalInfo {
  // Calculer la durée en heures pour l'affichage détaillé et le coût
  let durationText = '';
  let totalCost = 0;
  
  if (rentalCalculation.isCalculated) {
    const startDateTime = new Date(rentalCalculation.startDate);
    const endDateTime = new Date(rentalCalculation.endDate);
    
    const startHour = parseInt(rentalCalculation.startTime.split(':')[0]);
    const startMinute = parseInt(rentalCalculation.startTime.split(':')[1]);
    const endHour = parseInt(rentalCalculation.endTime.split(':')[0]);
    const endMinute = parseInt(rentalCalculation.endTime.split(':')[1]);
    
    startDateTime.setHours(startHour, startMinute, 0, 0);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    const completeDays = Math.floor(rentalHours / 24);
    const extraHours = Math.floor(rentalHours % 24);
    
    // Calculer le coût total avec heures précises
    if (rentalHours < 24) {
      totalCost = Math.ceil(pricePerDay); // Minimum 1 jour
      durationText = '1 jour';
    } else if (extraHours === 0) {
      // Pas d'heures supplémentaires → facturer seulement les jours complets
      totalCost = completeDays * pricePerDay;
      durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`;
    } else {
      // Toujours facturer les heures supplémentaires au prorata
      // Peu importe si heure retour < heure départ
      const hourPrice = pricePerDay / 24;
      totalCost = Math.ceil((completeDays * pricePerDay) + (extraHours * hourPrice));
      
      // Pour l'affichage, montrer les jours + heures
      if (extraHours > 0) {
        durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}`;
      } else {
        durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`;
      }
    }
  }
  
  const formattedPrice = rentalCalculation.isCalculated
    ? `${pricePerDay}€ par jour, soit **${totalCost}€** (${durationText})`
    : `${pricePerDay}€ par jour`;
  
  return {
    vehicleId,
    pricePerDay,
    totalCost,
    formattedPrice
  };
}

/**
 * Valide si un objet RentalCalculation est valide
 * @param calculation Objet RentalCalculation à valider
 * @returns true si valide, false sinon
 */
export function isValidRentalCalculation(calculation: RentalCalculation): boolean {
  return (
    calculation.startDate instanceof Date &&
    calculation.endDate instanceof Date &&
    typeof calculation.startTime === 'string' &&
    typeof calculation.endTime === 'string' &&
    calculation.rentalDays >= 0 &&
    typeof calculation.isCalculated === 'boolean' &&
    calculation.calculatedAt instanceof Date
  );
}
