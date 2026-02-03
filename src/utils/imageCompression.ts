/**
 * ⭐ Utilitaire de compression et redimensionnement d'images (optimisé mobile)
 * 
 * Optimise les photos avant upload pour réduire drastiquement le temps de chargement
 * sur mobile. Utilise createImageBitmap (plus performant) avec fallback sur Image.
 * 
 * Configuration recommandée pour état des lieux :
 * - maxWidth: 1280px (suffisant pour voir les détails)
 * - maxHeight: 1280px
 * - quality: 0.72 (bon compromis qualité/taille)
 * - maxSizeMB: 0.3 (objectif 300KB max)
 * 
 * Gain attendu : 85-95% de réduction (3-8MB → 150-400KB)
 */

export type CompressOptions = {
  /** Largeur maximale en pixels (défaut: 1280) */
  maxWidth?: number;
  /** Hauteur maximale en pixels (défaut: 1280) */
  maxHeight?: number;
  /** Qualité JPEG 0-1 (défaut: 0.72) */
  quality?: number;
  /** Taille maximale cible en MB (défaut: 0.3) */
  maxSizeMB?: number;
  /** Type MIME de sortie (défaut: "image/jpeg") */
  mimeType?: "image/jpeg" | "image/webp";
  /** Nombre max de compressions en parallèle (défaut: 2) */
  concurrency?: number;
};

/**
 * Clamp un nombre entre min et max
 */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convertit un File en ImageBitmap (plus performant) ou HTMLImageElement (fallback)
 */
async function fileToImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap est souvent plus rapide / memory-friendly sur mobile
  if ("createImageBitmap" in window) {
    try {
      // imageOrientation: "from-image" → évite les photos pivotées (EXIF) sur mobile
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (error) {
      console.warn("[compressImage] createImageBitmap échoué, fallback Image:", error);
      // Continue avec le fallback
    }
  }

  // Fallback: HTMLImageElement via ObjectURL (évite un DataURL énorme en mémoire)
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = objectUrl;
    });

    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Calcule les dimensions cibles en conservant le ratio (jamais upscaler)
 */
function computeTargetSize(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1); // jamais upscaler
  return { tw: Math.round(w * ratio), th: Math.round(h * ratio) };
}

/**
 * Convertit un canvas en Blob avec promesse
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("canvas.toBlob() a retourné null"));
      resolve(blob);
    }, type, quality);
  });
}

/**
 * Compresse et redimensionne une image avant upload
 * 
 * @param file - Fichier image original
 * @param opts - Options de compression
 * @returns File compressé (JPEG ou WebP)
 * 
 * @example
 * ```typescript
 * const compressed = await compressImage(file, {
 *   maxWidth: 1280,
 *   maxHeight: 1280,
 *   quality: 0.72,
 *   maxSizeMB: 0.3,
 * });
 * ```
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    maxSizeMB = 0.3,
    mimeType = "image/jpeg",
  } = opts;

  // ⭐ Log DEV (désactivé en prod via NODE_ENV)
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
  const logDev = isDev ? console.log : () => {};

  // Si le fichier est déjà petit, ne pas compresser
  if (file.size <= maxSizeMB * 1024 * 1024) {
    logDev(
      `[compressImage] Fichier déjà petit (${(file.size / 1024).toFixed(0)}KB), pas de compression`
    );
    return file;
  }

  let bitmapOrImg: ImageBitmap | HTMLImageElement | null = null;
  try {
    bitmapOrImg = await fileToImageBitmap(file);

    // Extraire dimensions (ImageBitmap a width/height directement, Image a naturalWidth/naturalHeight)
    const srcW =
      "width" in bitmapOrImg
        ? bitmapOrImg.width
        : (bitmapOrImg as HTMLImageElement).naturalWidth;
    const srcH =
      "height" in bitmapOrImg
        ? bitmapOrImg.height
        : (bitmapOrImg as HTMLImageElement).naturalHeight;

    const maxBytes = maxSizeMB * 1024 * 1024;
    let targetMaxW = maxWidth;
    let targetMaxH = maxHeight;
    let finalQuality = clamp(quality, 0.4, 0.92);
    let blob: Blob | null = null;
    let downsizes = 0;
    const MAX_DOWNSIZES = 3;
    let finalTw = 0;
    let finalTh = 0;

    // ⭐ Boucle principale : réduire dimensions de sortie si nécessaire après épuisement qualité
    while (downsizes <= MAX_DOWNSIZES) {
      const { tw, th } = computeTargetSize(srcW, srcH, targetMaxW, targetMaxH);
      finalTw = tw;
      finalTh = th;

      logDev(
        `[compressImage] Redimensionnement: ${srcW}x${srcH} → ${tw}x${th} (targetMax: ${targetMaxW}x${targetMaxH})`
      );

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Impossible d'obtenir un contexte 2D");

      // Améliorer la qualité du downscale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Dessiner depuis la source originale (toujours depuis bitmapOrImg)
      ctx.drawImage(bitmapOrImg as any, 0, 0, tw, th);

      // Compression itérative jusqu'à atteindre la taille cible
      let q = finalQuality;
      blob = await canvasToBlob(canvas, mimeType, q);

      // Réduction itérative de qualité si encore trop gros
      let guard = 0;
      while (blob.size > maxBytes && guard < 5) {
        q = clamp(q - 0.12, 0.4, 0.92);
        blob = await canvasToBlob(canvas, mimeType, q);
        guard++;
      }

      finalQuality = q;

      // Si taille OK, sortir
      if (blob.size <= maxBytes) {
        break;
      }

      // Si encore trop gros après épuisement qualité, réduire dimensions cibles (x0.85)
      if (blob.size > maxBytes && downsizes < MAX_DOWNSIZES) {
        targetMaxW = Math.round(targetMaxW * 0.85);
        targetMaxH = Math.round(targetMaxH * 0.85);
        downsizes++;
        logDev(`[compressImage] Taille encore trop grande (${(blob.size / 1024).toFixed(0)}KB), réduction targetMax: ${targetMaxW}x${targetMaxH}`);
        // Réinitialiser qualité pour le prochain cycle
        finalQuality = clamp(quality, 0.4, 0.92);
      } else {
        // Dernière tentative ou max downsizes atteint
        break;
      }
    }

    if (!blob) {
      throw new Error("Échec de la compression");
    }

    // Nom de fichier cohérent
    const ext = mimeType === "image/webp" ? "webp" : "jpg";
    const safeName = file.name.replace(/\.[^/.]+$/, `.${ext}`);

    const compressedFile = new File([blob], safeName, {
      type: mimeType,
      lastModified: Date.now(),
    });

    // ⭐ Logs DEV
    logDev(`[compressImage] Compression réussie:`);
    logDev(`  - Dimensions: ${srcW}x${srcH} → ${finalTw}x${finalTh}`);
    logDev(`  - Taille: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
    logDev(`  - Qualité finale: ${finalQuality.toFixed(2)}`);
    logDev(`  - Réduction: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);

    return compressedFile;
  } catch (error) {
    console.error("[compressImage] Erreur lors de la compression:", error);
    // Fallback : retourner le fichier original
    return file;
  } finally {
    // Libérer la mémoire si ImageBitmap (toujours appelé, même en cas d'erreur)
    if (bitmapOrImg && "close" in (bitmapOrImg as any) && typeof (bitmapOrImg as any).close === "function") {
      try {
        (bitmapOrImg as any).close();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Compresse plusieurs images en parallèle
 * 
 * @param files - Tableau de fichiers images
 * @param options - Options de compression
 * @returns Tableau de fichiers compressés
 * 
 * @example
 * ```typescript
 * const compressedFiles = await compressImages(files, {
 *   maxWidth: 1280,
 *   quality: 0.72,
 *   maxSizeMB: 0.3,
 * });
 * ```
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<File[]> {
  const { concurrency = 2, ...rest } = options;
  const limit = Math.max(1, Math.min(concurrency, files.length || 1));

  const results: File[] = new Array(files.length);
  let nextIndex = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= files.length) break;
      results[i] = await compressImage(files[i], rest);
    }
  });

  await Promise.all(workers);
  return results;
}

