/**
 * Utilitaires pour l'optimisation des images véhicules
 * 
 * Stratégie:
 * - Utilise les transformations Supabase Storage si disponibles
 * - Fallback vers URL originale si transformations non supportées
 * - Génère srcset pour responsive images
 */

/**
 * Génère une URL optimisée pour une image Supabase Storage
 * 
 * @param originalUrl - URL originale de l'image
 * @param width - Largeur cible en pixels
 * @param height - Hauteur cible en pixels (optionnel, calculée depuis width si ratio 4/3)
 * @param quality - Qualité (1-100, défaut: 80)
 * @returns URL optimisée ou URL originale en fallback
 * 
 * Note: Supabase Storage supporte les transformations via query params:
 * - ?width=400&height=300&resize=cover
 * - Si le bucket n'est pas configuré pour les transformations, retourne l'URL originale
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  width: number,
  height?: number,
  quality: number = 80
): string {
  // Si ce n'est pas une URL Supabase Storage, retourner l'originale
  if (!originalUrl || !originalUrl.includes('supabase.co/storage')) {
    return originalUrl;
  }

  // Calculer la hauteur si non fournie (ratio 4/3 par défaut pour les véhicules)
  const targetHeight = height || Math.round(width * 0.75);

  try {
    // Construire l'URL avec transformations Supabase
    // Format: ?width=400&height=300&resize=cover&quality=80
    const url = new URL(originalUrl);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('height', targetHeight.toString());
    url.searchParams.set('resize', 'cover'); // cover maintient le ratio et remplit
    url.searchParams.set('quality', quality.toString());

    return url.toString();
  } catch (error) {
    // Si erreur de parsing URL, retourner l'originale
    console.warn('[imageOptimization] Erreur parsing URL:', error);
    return originalUrl;
  }
}

/**
 * Génère un srcset pour images responsive
 * 
 * @param originalUrl - URL originale de l'image
 * @param widths - Tableau des largeurs (ex: [400, 800, 1200])
 * @returns String srcset (ex: "url?width=400 400w, url?width=800 800w")
 */
export function generateSrcSet(
  originalUrl: string,
  widths: number[]
): string {
  return widths
    .map((width) => `${getOptimizedImageUrl(originalUrl, width)} ${width}w`)
    .join(', ');
}

/**
 * Génère l'attribut sizes pour images responsive
 * 
 * @param breakpoints - Breakpoints en format CSS (ex: "(max-width: 768px) 100vw, 400px")
 * @returns String sizes
 */
export function generateSizes(breakpoints?: string): string {
  // Sizes par défaut pour cards véhicules
  if (!breakpoints) {
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }
  return breakpoints;
}

/**
 * Sizes prédéfinis pour différents contextes
 */
export const IMAGE_SIZES = {
  // Pour les cards dans une grille (home page)
  CARD_GRID: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  // Pour l'image principale dans VehicleDetails
  DETAIL_MAIN: '(max-width: 1024px) 100vw, 800px',
  // Pour les thumbnails
  THUMBNAIL: '150px',
} as const;

/**
 * Largeurs standard pour srcset
 */
export const IMAGE_WIDTHS = {
  // Pour les cards (petites images)
  CARD: [400, 800] as number[],
  // Pour les détails (images moyennes)
  DETAIL: [800, 1200] as number[],
  // Pour les thumbnails
  THUMBNAIL: [150, 300] as number[],
};

