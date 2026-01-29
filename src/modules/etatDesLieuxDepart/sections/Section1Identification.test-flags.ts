/**
 * Flags de test pour isoler les composants qui causent removeChild
 * 
 * UTILISATION :
 * 1. Importer dans Section1Identification.tsx
 * 2. Utiliser les flags pour désactiver temporairement des composants
 * 3. Tester progressivement pour identifier le coupable
 * 
 * EXEMPLE :
 * import { TEST_FLAGS } from './Section1Identification.test-flags';
 * 
 * {!TEST_FLAGS.DISABLE_SELECT_PAYS && <Select ... />}
 */

export const TEST_FLAGS = {
  // Désactiver les Select (Pays d'émission + Catégorie)
  DISABLE_SELECT_PAYS: false,
  DISABLE_SELECT_CATEGORIE: false,
  
  // Désactiver PhotoCaptureField (permis recto/verso)
  DISABLE_PHOTO_RECTO: false,
  DISABLE_PHOTO_VERSO: false,
  
  // Désactiver les date pickers (date délivrance/expiration)
  DISABLE_DATE_DELIVRANCE: false,
  DISABLE_DATE_EXPIRATION: false,
  
  // Désactiver tous les toasts (validation onChange)
  DISABLE_TOASTS: false,
  
  // Mode debug : log toutes les interactions
  DEBUG_MODE: import.meta.env.DEV,
};

