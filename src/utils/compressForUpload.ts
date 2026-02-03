/**
 * ⭐ Compression robuste en 2 passes avec garde-fou
 * 
 * Passe 1 : Compression standard (1280x1280, quality 0.72, max 300KB)
 * Passe 2 : Si > 350KB, compression agressive (1024x1024, quality 0.65, max 250KB)
 * Garde-fou : Si > 500KB après 2 passes, retourne null (ne pas uploader)
 * 
 * @param file - Fichier image à compresser
 * @param onError - Callback optionnel appelé si compression échoue (pour afficher toast)
 * @returns File compressé ou null si trop lourd (> 500KB)
 */
import { compressImage } from "./imageCompression";

const PHOTO_COMPRESSION = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.72,
  maxSizeMB: 0.3,
} as const;

const PHOTO_COMPRESSION_AGGRESSIVE = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.65,
  maxSizeMB: 0.25,
} as const;

export async function compressForUpload(
  file: File,
  onError?: (sizeKB: string) => void
): Promise<File | null> {
  // Passe 1 : Compression standard
  let compressed = await compressImage(file, PHOTO_COMPRESSION);
  const sizeAfterPass1 = compressed.size;
  
  // Si > 350KB après passe 1, relancer compression agressive
  if (sizeAfterPass1 > 350 * 1024) {
    compressed = await compressImage(compressed, PHOTO_COMPRESSION_AGGRESSIVE);
  }
  
  const sizeAfter = compressed.size;
  
  // Garde-fou : Si > 500KB après 2 passes, ne pas uploader
  if (sizeAfter > 500 * 1024) {
    const sizeKB = (sizeAfter / 1024).toFixed(0);
    if (onError) {
      onError(sizeKB);
    } else {
      // Si pas de callback, log seulement (le toast sera géré par l'appelant)
      console.warn(`[compressForUpload] Photo trop lourde (${sizeKB} KB). Réessayez.`);
    }
    return null;
  }
  
  return compressed;
}
