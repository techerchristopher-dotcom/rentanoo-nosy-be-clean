/**
 * ⭐ Helpers pour Step4 - Intérieur
 * 
 * Utilitaires pour convertir base64 → File et uploader vers Supabase Storage
 */

import { CheckinPhotoService } from '@/services/supabase/checkinPhotos';
import type { InteriorPhoto } from '@/types/step4';

/**
 * Convertir une string base64 en File
 * (réutilisable pour toutes les étapes)
 */
export function base64ToFile(base64: string, filename: string): File {
  // Extraire le type MIME et les données
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}

/**
 * ⭐ Upload photo de sièges (Step4)
 */
export async function uploadInteriorSeatsPhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined
): Promise<InteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `sieges_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadInteriorSeatsPhoto(
      file,
      bookingId,
      bookingReferenceNumber
    );
    
    if (error || !data) {
      console.error('[Step4] ❌ Erreur upload sièges:', error);
      return null;
    }
    
    console.log('[Step4] ✅ Upload sièges réussi:', data.storagePath);
    
    return {
      ...data,
      section: 'sieges',
      kind: 'sieges',
    };
  } catch (err) {
    console.error('[Step4] ❌ Exception upload sièges:', err);
    return null;
  }
}

/**
 * ⭐ Upload photo de propreté intérieure (Step4)
 */
export async function uploadInteriorCleanlinessPhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined
): Promise<InteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `proprete_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadInteriorCleanlinessPhoto(
      file,
      bookingId,
      bookingReferenceNumber
    );
    
    if (error || !data) {
      console.error('[Step4] ❌ Erreur upload propreté:', error);
      return null;
    }
    
    console.log('[Step4] ✅ Upload propreté réussi:', data.storagePath);
    
    return {
      ...data,
      section: 'propreteGenerale',
      kind: 'proprete',
    };
  } catch (err) {
    console.error('[Step4] ❌ Exception upload propreté:', err);
    return null;
  }
}

/**
 * ⭐ Upload photo de dégât intérieur (Step4)
 */
export async function uploadInteriorDamagePhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  sectionKey: string  // "sieges"
): Promise<InteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `degat_${sectionKey}_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadInteriorDamagePhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      sectionKey
    );
    
    if (error || !data) {
      console.error(`[Step4] ❌ Erreur upload dégât ${sectionKey}:`, error);
      return null;
    }
    
    console.log(`[Step4] ✅ Upload dégât ${sectionKey} réussi:`, data.storagePath);
    
    return {
      ...data,
      section: sectionKey as any,
      kind: 'degat',
    };
  } catch (err) {
    console.error(`[Step4] ❌ Exception upload dégât ${sectionKey}:`, err);
    return null;
  }
}

