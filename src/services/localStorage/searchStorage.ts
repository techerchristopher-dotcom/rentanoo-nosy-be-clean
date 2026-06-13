/**
 * Service de gestion du localStorage pour les critères de recherche
 * Permet de persister la recherche de l'utilisateur entre les navigations
 * MAIS réinitialise au rafraîchissement de la page (F5)
 */

import { debug } from "@/utils/logger";

// Clés du localStorage
const SEARCH_STORAGE_KEY = "lagon_search_criteria";
const PAGE_REFRESH_KEY = "lagon_page_refresh_flag";

// Interface pour les critères de recherche
export interface SearchCriteria {
  // Lieu de prise en charge
  searchText: string;
  
  // Dates
  startDate: string | null; // ISO string ou null
  endDate: string | null;   // ISO string ou null
  
  // Heures
  startTime: string;
  endTime: string;
  
  // Filtres Explorer
  selectedMainCategory?: string | null;
  selectedSubFilter?: string | null;
  /** Slug location_areas — filtre quartier (Phase 2b, voir LOCATION_AREA_HOME_FILTER) */
  locationAreaSlug?: string | null;
  /** @deprecated conservé pour restauration legacy */
  selectedVehicleTypes?: string[];
  selectedEngineCapacities?: string[];
  
  // Services supplémentaires sélectionnés
  selectedServices?: {
    airport?: boolean;
    bargePetiteTerre?: boolean;
    bargeGrandeTerre?: boolean;
    homeDelivery?: boolean;
    babySeat?: boolean;
    additionalDriver?: boolean;
  };
  
  // Métadonnées
  savedAt: string; // ISO string
}

/**
 * Marquer qu'un rafraîchissement va avoir lieu
 * Cette fonction doit être appelée avant un rafraîchissement
 */
export function markPageRefresh(): void {
  try {
    sessionStorage.setItem('lagon_page_refresh_flag', 'true');
    debug('🔄 [localStorage] Flag de rafraîchissement marqué dans sessionStorage');
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors du marquage du rafraîchissement:', error);
  }
}

/**
 * Vérifier si la page a été rafraîchie
 */
export function isPageRefreshed(): boolean {
  try {
    const isRefreshed = sessionStorage.getItem(PAGE_REFRESH_KEY) === 'true';
    debug('🔍 [localStorage] Vérification du rafraîchissement:', { isRefreshed, sessionStorageValue: sessionStorage.getItem(PAGE_REFRESH_KEY) });
    if (isRefreshed) {
      // Supprimer le flag après vérification
      sessionStorage.removeItem(PAGE_REFRESH_KEY);
      debug('🗑️ [localStorage] Flag de rafraîchissement supprimé');
    }
    return isRefreshed;
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la vérification du rafraîchissement:', error);
    return false;
  }
}

/**
 * Sauvegarder les critères de recherche
 */
export function saveSearchCriteria(criteria: Omit<SearchCriteria, 'savedAt'>): void {
  try {
    const criteriaWithTimestamp: SearchCriteria = {
      ...criteria,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(criteriaWithTimestamp));
    debug('💾 [localStorage] Critères de recherche sauvegardés:', criteriaWithTimestamp);
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la sauvegarde des critères:', error);
  }
}

/**
 * Récupérer les critères de recherche
 * APPROCHE SIMPLE : Toujours restaurer sauf si explicitement marqué comme rafraîchissement
 */
export function getSearchCriteria(): SearchCriteria | null {
  try {
    // Vérifier si un rafraîchissement a été marqué explicitement
    const refreshFlag = sessionStorage.getItem('lagon_page_refresh_flag');
    const isPageRefresh = refreshFlag === 'true';
    
    debug('🔍 [localStorage] Détection du rafraîchissement:', { 
      refreshFlag,
      isPageRefresh,
      url: window.location.href
    });
    
    // Si c'est un rafraîchissement marqué, ne pas restaurer les critères ET nettoyer les services
    if (isPageRefresh) {
      debug('🔄 [localStorage] Rafraîchissement marqué détecté - critères non restaurés');
      
      // Supprimer le flag après utilisation
      sessionStorage.removeItem('lagon_page_refresh_flag');
      
      // Nettoyer aussi les services lors du rafraîchissement
      try {
        import('./bookingStorage').then(({ clearBookingDraft }) => {
          clearBookingDraft();
          debug('🔄 [localStorage] Services supplémentaires nettoyés lors du rafraîchissement');
        });
      } catch (error) {
        console.warn('⚠️ [localStorage] Impossible de nettoyer les services lors du rafraîchissement:', error);
      }
      
      return null;
    }
    
    const stored = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (!stored) {
      debug('ℹ️ [localStorage] Aucun critère de recherche trouvé');
      return null;
    }
    
    const criteria = JSON.parse(stored) as SearchCriteria;
    debug('📖 [localStorage] Critères de recherche récupérés:', criteria);
    return criteria;
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la récupération des critères:', error);
    return null;
  }
}

/**
 * Supprimer les critères de recherche ET les services sélectionnés
 */
export function clearSearchCriteria(): void {
  try {
    localStorage.removeItem(SEARCH_STORAGE_KEY);
    debug('🗑️ [localStorage] Critères de recherche supprimés');
    
    // Nettoyer aussi les services dans bookingStorage
    try {
      // Import dynamique pour éviter les dépendances circulaires
      import('./bookingStorage').then(({ clearBookingDraft }) => {
        clearBookingDraft();
        debug('🗑️ [localStorage] Services supplémentaires supprimés');
      });
    } catch (error) {
      console.warn('⚠️ [localStorage] Impossible de nettoyer les services:', error);
    }
  } catch (error) {
    console.error('❌ [localStorage] Erreur lors de la suppression des critères:', error);
  }
}

/**
 * Vérifier si des critères existent
 */
export function hasSearchCriteria(): boolean {
  return localStorage.getItem(SEARCH_STORAGE_KEY) !== null;
}

/**
 * Obtenir l'âge des critères en minutes
 */
export function getSearchCriteriaAge(): number | null {
  const criteria = getSearchCriteria();
  if (!criteria) return null;
  
  const savedAt = new Date(criteria.savedAt);
  const now = new Date();
  const ageInMinutes = Math.floor((now.getTime() - savedAt.getTime()) / (1000 * 60));
  
  return ageInMinutes;
}

/**
 * Vérifier si les critères sont expirés (plus de 7 jours)
 */
export function isSearchCriteriaExpired(): boolean {
  const age = getSearchCriteriaAge();
  if (age === null) return false;
  
  return age > (7 * 24 * 60); // 7 jours en minutes
}

/**
 * Nettoyer les critères expirés automatiquement
 */
export function cleanupExpiredSearchCriteria(): void {
  if (isSearchCriteriaExpired()) {
    debug('🧹 [localStorage] Nettoyage des critères expirés');
    clearSearchCriteria();
  }
}

