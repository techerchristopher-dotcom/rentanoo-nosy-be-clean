/**
 * ⭐ Helpers pour Step3 - Extérieur & Coffre
 * 
 * Utilitaires pour convertir base64 → File et uploader vers Supabase Storage
 */

import { CheckinPhotoService } from '@/services/supabase/checkinPhotos';
import type { ExteriorPhoto } from '@/types/step3';

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
 * ⭐ Upload photo de zone extérieure (avant, droit, arriere, gauche)
 */
export async function uploadZonePhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  zone: string
): Promise<ExteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `${zone}_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadExteriorZonePhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      zone
    );
    
    if (error || !data) {
      console.error(`[Step3] ❌ Erreur upload zone ${zone}:`, error);
      return null;
    }
    
    console.log(`[Step3] ✅ Upload zone ${zone} réussi:`, data.storagePath);
    
    return {
      ...data,
      zone: zone as any,
      kind: 'overview',
    };
  } catch (err) {
    console.error(`[Step3] ❌ Exception upload zone ${zone}:`, err);
    return null;
  }
}

/**
 * ⭐ Upload photo de jante
 */
export async function uploadWheelPhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  wheelKey: string  // "janteAvDroit", "janteArDroit", etc.
): Promise<ExteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `${wheelKey}_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadWheelPhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      wheelKey
    );
    
    if (error || !data) {
      console.error(`[Step3] ❌ Erreur upload jante ${wheelKey}:`, error);
      return null;
    }
    
    console.log(`[Step3] ✅ Upload jante ${wheelKey} réussi:`, data.storagePath);
    
    return {
      ...data,
      zone: wheelKey.includes('Droit') ? 'droit' : 'gauche',
      kind: 'jante',
    };
  } catch (err) {
    console.error(`[Step3] ❌ Exception upload jante ${wheelKey}:`, err);
    return null;
  }
}

/**
 * ⭐ Upload photo de coffre
 */
export async function uploadTrunkPhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined
): Promise<ExteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `coffre_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadTrunkPhoto(
      file,
      bookingId,
      bookingReferenceNumber
    );
    
    if (error || !data) {
      console.error('[Step3] ❌ Erreur upload coffre:', error);
      return null;
    }
    
    console.log('[Step3] ✅ Upload coffre réussi:', data.storagePath);
    
    return {
      ...data,
      zone: 'coffre',
      kind: 'coffre',
    };
  } catch (err) {
    console.error('[Step3] ❌ Exception upload coffre:', err);
    return null;
  }
}

/**
 * ⭐ Upload photo de dégât
 */
export async function uploadDamagePhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  zone: string,
  damageIndex: number
): Promise<ExteriorPhoto | null> {
  try {
    const file = base64ToFile(base64, `degat_${zone}_${damageIndex}_${Date.now()}.jpg`);
    
    const { data, error } = await CheckinPhotoService.uploadDamagePhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      zone,
      damageIndex
    );
    
    if (error || !data) {
      console.error(`[Step3] ❌ Erreur upload dégât ${zone}:`, error);
      return null;
    }
    
    console.log(`[Step3] ✅ Upload dégât ${zone}[${damageIndex}] réussi:`, data.storagePath);
    
    return {
      ...data,
      zone: zone as any,
      kind: 'degat',
      damageIndex,
    };
  } catch (err) {
    console.error(`[Step3] ❌ Exception upload dégât ${zone}:`, err);
    return null;
  }
}

