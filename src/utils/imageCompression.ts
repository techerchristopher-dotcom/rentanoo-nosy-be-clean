/**
 * ⭐ Utilitaire de compression et redimensionnement d'images (optimisé mobile)
 * 
 * Optimise les photos avant upload pour réduire drastiquement le temps de chargement
 * sur mobile. Utilise createImageBitmap (plus performant) avec fallback sur Image.
 * 
 * Configuration recommandée pour état des lieux :
 * - maxWidth: 1920px (suffisant pour voir les détails)
 * - maxHeight: 1920px
 * - quality: 0.82 (bon compromis qualité/taille)
 * - maxSizeMB: 0.5 (objectif 500KB max)
 * 
 * Gain attendu : 85-95% de réduction (3-8MB → 200-500KB)
 */

export type CompressOptions = {
  /** Largeur maximale en pixels (défaut: 1920) */
  maxWidth?: number;
  /** Hauteur maximale en pixels (défaut: 1920) */
  maxHeight?: number;
  /** Qualité JPEG 0-1 (défaut: 0.82) */
  quality?: number;
  /** Taille maximale cible en MB (défaut: 0.5) */
  maxSizeMB?: number;
  /** Type MIME de sortie (défaut: "image/jpeg") */
  mimeType?: "image/jpeg" | "image/webp";
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
      return await createImageBitmap(file);
    } catch (error) {
      console.warn("[compressImage] createImageBitmap échoué, fallback Image:", error);
      // Continue avec le fallback
    }
  }

  // Fallback: HTMLImageElement via FileReader
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  return img;
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
 *   maxWidth: 1920,
 *   maxHeight: 1920,
 *   quality: 0.82,
 *   maxSizeMB: 0.5,
 * });
 * ```
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    maxSizeMB = 0.5,
    mimeType = "image/jpeg",
  } = opts;

  // Si le fichier est déjà petit, ne pas compresser
  if (file.size <= maxSizeMB * 1024 * 1024) {
    console.log(
      `[compressImage] Fichier déjà petit (${(file.size / 1024).toFixed(0)}KB), pas de compression`
    );
    return file;
  }

  try {
    const bitmapOrImg = await fileToImageBitmap(file);

    // Extraire dimensions (ImageBitmap a width/height directement, Image a naturalWidth/naturalHeight)
    const srcW =
      "width" in bitmapOrImg
        ? bitmapOrImg.width
        : (bitmapOrImg as HTMLImageElement).naturalWidth;
    const srcH =
      "height" in bitmapOrImg
        ? bitmapOrImg.height
        : (bitmapOrImg as HTMLImageElement).naturalHeight;

    const { tw, th } = computeTargetSize(srcW, srcH, maxWidth, maxHeight);

    console.log(
      `[compressImage] Redimensionnement: ${srcW}x${srcH} → ${tw}x${th} (ratio: ${(tw / srcW).toFixed(2)})`
    );

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible d'obtenir un contexte 2D");

    // Améliorer la qualité du downscale
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Dessiner l'image redimensionnée
    ctx.drawImage(bitmapOrImg as any, 0, 0, tw, th);

    // Compression itérative jusqu'à atteindre la taille cible
    const maxBytes = maxSizeMB * 1024 * 1024;
    let q = clamp(quality, 0.4, 0.92);
    let blob = await canvasToBlob(canvas, mimeType, q);

    // Réduction itérative si encore trop gros
    let guard = 0;
    while (blob.size > maxBytes && guard < 5) {
      q = clamp(q - 0.12, 0.4, 0.92);
      blob = await canvasToBlob(canvas, mimeType, q);
      guard++;
    }

    // Nom de fichier cohérent
    const ext = mimeType === "image/webp" ? "webp" : "jpg";
    const safeName = file.name.replace(/\.[^/.]+$/, `.${ext}`);

    const compressedFile = new File([blob], safeName, {
      type: mimeType,
      lastModified: Date.now(),
    });

    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    console.log(
      `[compressImage] Compression réussie: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${reduction}% de réduction)`
    );

    return compressedFile;
  } catch (error) {
    console.error("[compressImage] Erreur lors de la compression:", error);
    // Fallback : retourner le fichier original
    return file;
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
 *   maxWidth: 1920,
 *   quality: 0.82,
 * });
 * ```
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<File[]> {
  const promises = files.map((file) => compressImage(file, options));
  return Promise.all(promises);
}

