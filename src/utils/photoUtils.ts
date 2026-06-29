/**
 * Utilitaires centralisés pour la sélection de photo principale.
 * Remplace les copies dupliquées de pickPrimaryPhotoUrl.
 */

export type PhotoRow = {
  photo_url: string;
  is_primary: boolean | null;
  display_order: number | null;
};

/**
 * Sélectionne l'URL de photo principale valide depuis un tableau de photos.
 * Règles :
 *  1. Ignore les URLs .heic (non affichables navigateur)
 *  2. Ignore les URLs dans failedUrls (déjà connues comme mortes)
 *  3. Privilégie is_primary = true
 *  4. Sinon, prend la plus petite display_order
 */
export function getValidPrimaryPhoto(
  photos: Array<{ photo_url?: string | null; is_primary?: boolean | null; display_order?: number | null }> | null | undefined,
  failedUrls?: Set<string>
): string | null {
  if (!photos?.length) return null;
  const valid = photos.filter(
    (p) =>
      p.photo_url &&
      !isHeicUrl(p.photo_url) &&
      !(failedUrls?.has(p.photo_url))
  ) as Array<{ photo_url: string; is_primary?: boolean | null; display_order?: number | null }>;
  if (!valid.length) return null;
  const primary = valid.find((p) => p.is_primary);
  if (primary) return primary.photo_url;
  const sorted = [...valid].sort(
    (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
  );
  return sorted[0]?.photo_url ?? null;
}

export function isHeicUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.heic') || lower.includes('.heic?');
}

/** URL placeholder Unsplash utilisée comme fallback d'affichage */
export const PHOTO_PLACEHOLDER_URL =
  'https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop';
