/**
 * Utilitaires pour l'optimisation des images véhicules
 *
 * Stratégie:
 * - object/public : retour URL telle quelle (pas de params) — render/image renvoie 403 sur ce projet
 * - render/image/public : conserve les params width/height/quality si déjà utilisés
 * - non-Supabase : retour URL telle quelle
 *
 * IMPORTANT: Les transformations Supabase (render/image) renvoient 403 sur ce projet.
 * Les params ?width=&height= sur object/public sont IGNORÉS par Supabase et causaient des erreurs.
 */

const OBJECT_PUBLIC = '/storage/v1/object/public/';
const RENDER_IMAGE_PUBLIC = '/storage/v1/render/image/public/';

/**
 * Génère une URL optimisée pour une image Supabase Storage
 *
 * @param originalUrl - URL originale de l'image
 * @param width - Largeur cible en pixels
 * @param height - Hauteur cible en pixels (optionnel, calculée depuis width si ratio 4/3)
 * @param quality - Qualité (1-100, défaut: 80)
 * @returns URL optimisée ou URL originale en fallback
 *
 * - object/public : URL telle quelle (évite erreurs 403)
 * - render/image/public : ajoute width/height/quality si pas déjà présents
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  width: number,
  height?: number,
  quality: number = 80
): string {
  if (!originalUrl || !originalUrl.includes('supabase.co/storage')) {
    return originalUrl;
  }

  // object/public : ne jamais ajouter de query params (transformations non dispo → 403)
  if (originalUrl.includes(OBJECT_PUBLIC)) {
    return originalUrl;
  }

  // render/image/public : OK pour ajouter les params
  if (originalUrl.includes(RENDER_IMAGE_PUBLIC)) {
    const targetHeight = height ?? Math.round(width * 0.75);
    try {
      const url = new URL(originalUrl);
      // Ne pas écraser des params existants (éviter duplication)
      if (!url.searchParams.has('width')) url.searchParams.set('width', width.toString());
      if (!url.searchParams.has('height')) url.searchParams.set('height', targetHeight.toString());
      if (!url.searchParams.has('resize')) url.searchParams.set('resize', 'cover');
      if (!url.searchParams.has('quality')) url.searchParams.set('quality', quality.toString());
      return url.toString();
    } catch (error) {
      console.warn('[imageOptimization] Erreur parsing URL:', error);
      return originalUrl;
    }
  }

  // Autre path Supabase (fallback)
  return originalUrl;
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

