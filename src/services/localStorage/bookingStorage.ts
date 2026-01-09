/**
 * Service de gestion du localStorage pour les réservations
 * Permet de stocker et récupérer toutes les données de réservation localement
 */

import { RentalCalculation } from "@/types";
import { calcServiceFeeRenter, calcRenterTotal } from "@/utils/serviceFees";

// Clé du localStorage
const BOOKING_STORAGE_KEY = "lagon_booking_draft";

// Interface pour les options supplémentaires
export interface BookingOption {
  id: string;
  name: string;
  pricePerDay: number;
  totalPrice: number;
  selected: boolean;
}

// Interface pour les données de réservation stockées
export interface BookingDraft {
  // Informations de base
  vehicleId: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleImageUrl?: string;
  
  // Zone de prise en charge
  pickupLocation: string;
  
  // Dates et heures
  startDate: string; // ISO string
  endDate: string; // ISO string
  startTime: string;
  endTime: string;
  
  // Calculs
  rentalDays: number;
  pricePerDay: number;
  basePrice: number;
  
  // Options supplémentaires
  selectedOptions: BookingOption[];
  optionsTotal: number;
  
  // Totaux
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  
  // Métadonnées
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Sauvegarder un brouillon de réservation
 */
export function saveBookingDraft(draft: BookingDraft): void {
  try {
    const draftWithTimestamp = {
      ...draft,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(draftWithTimestamp));
    console.log('💾 [localStorage] Brouillon de réservation sauvegardé:', draftWithTimestamp);
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la sauvegarde:', error);
  }
}

/**
 * Récupérer le brouillon de réservation
 * Applique la même logique de persistance intelligente que searchStorage
 */
export function getBookingDraft(): BookingDraft | null {
  try {
    // Vérifier si un rafraîchissement a été marqué explicitement
    const refreshFlag = sessionStorage.getItem('lagon_page_refresh_flag');
    const isPageRefresh = refreshFlag === 'true';
    
    console.log('🔍 [bookingStorage] Détection du rafraîchissement:', { 
      refreshFlag,
      isPageRefresh,
      url: window.location.href
    });
    
    // Si c'est un rafraîchissement marqué, ne pas restaurer le brouillon
    if (isPageRefresh) {
      console.log('🔄 [bookingStorage] Rafraîchissement marqué détecté - brouillon non restauré');
      
      // Supprimer le flag après utilisation
      sessionStorage.removeItem('lagon_page_refresh_flag');
      
      return null;
    }
    
    const stored = localStorage.getItem(BOOKING_STORAGE_KEY);
    if (!stored) {
      console.log('ℹ️ [bookingStorage] Aucun brouillon trouvé');
      return null;
    }
    
    const draft = JSON.parse(stored) as BookingDraft;
    console.log('📖 [bookingStorage] Brouillon récupéré:', draft);
    return draft;
  } catch (error) {
    console.error('❌ [bookingStorage] Erreur lors de la récupération:', error);
    return null;
  }
}

/**
 * Mettre à jour les options sélectionnées
 */
export function updateBookingOptions(options: BookingOption[]): void {
  try {
    console.log('🔄 [localStorage] updateBookingOptions appelé avec:', {
      optionsCount: options.length,
      options: options.map(opt => ({ id: opt.id, name: opt.name, selected: opt.selected }))
    });
    
    let draft = getBookingDraft();
    if (!draft) {
      console.warn('⚠️ [localStorage] Pas de brouillon trouvé, création d\'un brouillon temporaire');
      // Créer un brouillon temporaire avec des valeurs par défaut
      draft = {
        vehicleId: 'temp',
        pickupLocation: 'Non spécifié',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        startTime: '06:30',
        endTime: '06:00',
        rentalDays: 1,
        pricePerDay: 0,
        basePrice: 0,
        selectedOptions: [],
        optionsTotal: 0,
        subtotal: 0,
        serviceFee: 0,
        totalAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      // ✅ AJOUTÉ : Sauvegarder le brouillon temporaire immédiatement
      saveBookingDraft(draft); 
    } else {
      console.log('📖 [localStorage] Brouillon existant trouvé:', {
        vehicleId: draft.vehicleId,
        selectedOptionsCount: draft.selectedOptions?.length || 0,
        existingSelectedOptions: draft.selectedOptions?.filter(opt => opt.selected).map(opt => opt.id) || []
      });
    }
    
    // Calculer le total des options
    const optionsTotal = options
      .filter(opt => opt.selected)
      .reduce((sum, opt) => sum + opt.totalPrice, 0);
    
    // Recalculer les totaux
    const subtotal = draft.basePrice + optionsTotal;
    const serviceFee = calcServiceFeeRenter(subtotal);
    const totalAmount = calcRenterTotal(subtotal);
    
    const updatedDraft: BookingDraft = {
      ...draft,
      selectedOptions: options,
      optionsTotal,
      subtotal,
      serviceFee,
      totalAmount,
      updatedAt: new Date().toISOString()
    };
    
    saveBookingDraft(updatedDraft);
    console.log('🔄 [localStorage] Options mises à jour:', {
      optionsCount: options.filter(opt => opt.selected).length,
      optionsTotal,
      totalAmount
    });
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la mise à jour des options:', error);
  }
}

/**
 * Créer un nouveau brouillon de réservation
 */
export function createBookingDraft(
  vehicleId: string,
  vehicleInfo: {
    brand?: string;
    model?: string;
    year?: number;
    imageUrl?: string;
  },
  pickupLocation: string,
  rentalCalculation: RentalCalculation,
  pricePerDay: number,
  basePrice: number
): BookingDraft {
  const subtotal = basePrice;
  const serviceFee = calcServiceFeeRenter(subtotal);
  const totalAmount = calcRenterTotal(subtotal);
  
  const draft: BookingDraft = {
    vehicleId,
    vehicleBrand: vehicleInfo.brand,
    vehicleModel: vehicleInfo.model,
    vehicleYear: vehicleInfo.year,
    vehicleImageUrl: vehicleInfo.imageUrl,
    pickupLocation,
    startDate: rentalCalculation.startDate.toISOString(),
    endDate: rentalCalculation.endDate.toISOString(),
    startTime: rentalCalculation.startTime,
    endTime: rentalCalculation.endTime,
    rentalDays: rentalCalculation.rentalDays,
    pricePerDay,
    basePrice,
    selectedOptions: [],
    optionsTotal: 0,
    subtotal,
    serviceFee,
    totalAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  saveBookingDraft(draft);
  return draft;
}

/**
 * Supprimer le brouillon de réservation
 */
export function clearBookingDraft(): void {
  try {
    localStorage.removeItem(BOOKING_STORAGE_KEY);
    console.log('🗑️ [localStorage] Brouillon supprimé');
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la suppression:', error);
  }
}

/**
 * Vérifier si un brouillon existe
 */
export function hasBookingDraft(): boolean {
  return localStorage.getItem(BOOKING_STORAGE_KEY) !== null;
}

/**
 * Obtenir l'âge du brouillon en minutes
 */
export function getBookingDraftAge(): number | null {
  const draft = getBookingDraft();
  if (!draft) return null;
  
  const updatedAt = new Date(draft.updatedAt);
  const now = new Date();
  const ageInMinutes = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60));
  
  return ageInMinutes;
}

/**
 * Vérifier si le brouillon est expiré (plus de 24h)
 */
export function isBookingDraftExpired(): boolean {
  const age = getBookingDraftAge();
  if (age === null) return false;
  
  return age > (24 * 60); // 24 heures en minutes
}

