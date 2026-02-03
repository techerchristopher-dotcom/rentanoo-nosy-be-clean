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
 * 
 * @overload
 * Accepte soit un File (recommandé, plus rapide) soit un base64 (rétrocompatibilité)
 */
export async function uploadZonePhoto(
  fileOrBase64: File | string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  zone: string
): Promise<ExteriorPhoto | null> {
  const t0 = performance.now();
  try {
    // ⭐ Instrumentation DEV
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
    const logDev = isDev ? console.log : () => {};
    
    let file: File;
    let tConvert = 0;
    
    if (fileOrBase64 instanceof File) {
      // ✅ Mode File direct (optimisé)
      file = fileOrBase64;
      logDev(`[STEP3_EXT] Upload zone ${zone} - File direct (${(file.size / 1024).toFixed(0)}KB)`);
    } else {
      // ⚠️ Mode base64 (rétrocompatibilité, plus lent)
      const tConvertStart = performance.now();
      file = base64ToFile(fileOrBase64, `${zone}_${Date.now()}.jpg`);
      tConvert = performance.now() - tConvertStart;
      logDev(`[STEP3_EXT] Upload zone ${zone} - base64→File conversion: ${tConvert.toFixed(0)}ms`);
    }
    
    const tUploadStart = performance.now();
    const { data, error } = await CheckinPhotoService.uploadExteriorZonePhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      zone
    );
    const tUpload = performance.now() - tUploadStart;
    
    if (error || !data) {
      console.error(`[Step3] ❌ Erreur upload zone ${zone}:`, error);
      return null;
    }
    
    const tTotal = performance.now() - t0;
    logDev(`[STEP3_EXT] ✅ Zone ${zone} - convert=${tConvert.toFixed(0)}ms upload=${tUpload.toFixed(0)}ms total=${tTotal.toFixed(0)}ms sizeBefore=${(file.size / 1024).toFixed(0)}KB`);
    
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
 * 
 * @overload
 * Accepte soit un File (recommandé, plus rapide) soit un base64 (rétrocompatibilité)
 */
export async function uploadWheelPhoto(
  fileOrBase64: File | string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  wheelKey: string  // "janteAvDroit", "janteArDroit", etc.
): Promise<ExteriorPhoto | null> {
  const t0 = performance.now();
  try {
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
    const logDev = isDev ? console.log : () => {};
    
    let file: File;
    let tConvert = 0;
    
    if (fileOrBase64 instanceof File) {
      file = fileOrBase64;
      logDev(`[STEP3_EXT] Upload jante ${wheelKey} - File direct (${(file.size / 1024).toFixed(0)}KB)`);
    } else {
      const tConvertStart = performance.now();
      file = base64ToFile(fileOrBase64, `${wheelKey}_${Date.now()}.jpg`);
      tConvert = performance.now() - tConvertStart;
      logDev(`[STEP3_EXT] Upload jante ${wheelKey} - base64→File conversion: ${tConvert.toFixed(0)}ms`);
    }
    
    const tUploadStart = performance.now();
    const { data, error } = await CheckinPhotoService.uploadWheelPhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      wheelKey
    );
    const tUpload = performance.now() - tUploadStart;
    
    if (error || !data) {
      console.error(`[Step3] ❌ Erreur upload jante ${wheelKey}:`, error);
      return null;
    }
    
    const tTotal = performance.now() - t0;
    logDev(`[STEP3_EXT] ✅ Jante ${wheelKey} - convert=${tConvert.toFixed(0)}ms upload=${tUpload.toFixed(0)}ms total=${tTotal.toFixed(0)}ms sizeBefore=${(file.size / 1024).toFixed(0)}KB`);
    
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
 * 
 * @overload
 * Accepte soit un File (recommandé, plus rapide) soit un base64 (rétrocompatibilité)
 */
export async function uploadTrunkPhoto(
  fileOrBase64: File | string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined
): Promise<ExteriorPhoto | null> {
  const t0 = performance.now();
  try {
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
    const logDev = isDev ? console.log : () => {};
    
    let file: File;
    let tConvert = 0;
    
    if (fileOrBase64 instanceof File) {
      file = fileOrBase64;
      logDev(`[STEP3_EXT] Upload coffre - File direct (${(file.size / 1024).toFixed(0)}KB)`);
    } else {
      const tConvertStart = performance.now();
      file = base64ToFile(fileOrBase64, `coffre_${Date.now()}.jpg`);
      tConvert = performance.now() - tConvertStart;
      logDev(`[STEP3_EXT] Upload coffre - base64→File conversion: ${tConvert.toFixed(0)}ms`);
    }
    
    const tUploadStart = performance.now();
    const { data, error } = await CheckinPhotoService.uploadTrunkPhoto(
      file,
      bookingId,
      bookingReferenceNumber
    );
    const tUpload = performance.now() - tUploadStart;
    
    if (error || !data) {
      console.error('[Step3] ❌ Erreur upload coffre:', error);
      return null;
    }
    
    const tTotal = performance.now() - t0;
    logDev(`[STEP3_EXT] ✅ Coffre - convert=${tConvert.toFixed(0)}ms upload=${tUpload.toFixed(0)}ms total=${tTotal.toFixed(0)}ms sizeBefore=${(file.size / 1024).toFixed(0)}KB`);
    
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
 * 
 * @overload
 * Accepte soit un File (recommandé, plus rapide) soit un base64 (rétrocompatibilité)
 */
export async function uploadDamagePhoto(
  fileOrBase64: File | string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  zone: string,
  damageIndex: number
): Promise<ExteriorPhoto | null> {
  const t0 = performance.now();
  try {
    const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
    const logDev = isDev ? console.log : () => {};
    
    let file: File;
    let tConvert = 0;
    
    if (fileOrBase64 instanceof File) {
      file = fileOrBase64;
      logDev(`[STEP3_EXT] Upload dégât ${zone}[${damageIndex}] - File direct (${(file.size / 1024).toFixed(0)}KB)`);
    } else {
      const tConvertStart = performance.now();
      file = base64ToFile(fileOrBase64, `degat_${zone}_${damageIndex}_${Date.now()}.jpg`);
      tConvert = performance.now() - tConvertStart;
      logDev(`[STEP3_EXT] Upload dégât ${zone}[${damageIndex}] - base64→File conversion: ${tConvert.toFixed(0)}ms`);
    }
    
    const tUploadStart = performance.now();
    const { data, error } = await CheckinPhotoService.uploadDamagePhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      zone,
      damageIndex
    );
    const tUpload = performance.now() - tUploadStart;
    
    if (error || !data) {
      console.error(`[Step3] ❌ Erreur upload dégât ${zone}:`, error);
      return null;
    }
    
    const tTotal = performance.now() - t0;
    logDev(`[STEP3_EXT] ✅ Dégât ${zone}[${damageIndex}] - convert=${tConvert.toFixed(0)}ms upload=${tUpload.toFixed(0)}ms total=${tTotal.toFixed(0)}ms sizeBefore=${(file.size / 1024).toFixed(0)}KB`);
    
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

