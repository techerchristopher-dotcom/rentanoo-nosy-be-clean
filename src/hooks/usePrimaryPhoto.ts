/**
 * Hook centralisé pour la résolution de photo principale avec fallback.
 * Gère les erreurs d'image et récupère un remplacement depuis la DB si nécessaire.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getValidPrimaryPhoto, PHOTO_PLACEHOLDER_URL } from '@/utils/photoUtils';

interface UsePrimaryPhotoResult {
  resolvedUrl: string;
  handleImageError: (src: string) => void;
}

export function usePrimaryPhoto(
  primaryPhotoUrl: string | null | undefined,
  vehicleId: string
): UsePrimaryPhotoResult {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const handleImageError = useCallback(
    (src: string) => {
      setFailedUrls((prev) => {
        if (prev.has(src)) return prev;
        const next = new Set(prev);
        next.add(src);
        return next;
      });

      if (isFetching || fallbackUrl) return;
      setIsFetching(true);

      supabase
        .from('vehicle_photos')
        .select('photo_url, is_primary, display_order')
        .eq('vehicle_id', vehicleId)
        .order('display_order', { ascending: true })
        .then(({ data }) => {
          const url = getValidPrimaryPhoto(
            data as Array<{ photo_url: string; is_primary: boolean | null; display_order: number | null }> | null,
            new Set([src, ...(primaryPhotoUrl ? [primaryPhotoUrl] : [])])
          );
          setFallbackUrl(url ?? PHOTO_PLACEHOLDER_URL);
        })
        .catch(() => {
          setFallbackUrl(PHOTO_PLACEHOLDER_URL);
        })
        .finally(() => {
          setIsFetching(false);
        });
    },
    [vehicleId, isFetching, fallbackUrl, primaryPhotoUrl]
  );

  // Résolution de l'URL :
  // 1. Si primaryPhotoUrl n'est pas échouée → l'utiliser
  // 2. Si un fallback a été récupéré → l'utiliser
  // 3. Sinon placeholder
  let resolvedUrl: string;
  if (primaryPhotoUrl && !failedUrls.has(primaryPhotoUrl)) {
    resolvedUrl = primaryPhotoUrl;
  } else if (fallbackUrl) {
    resolvedUrl = fallbackUrl;
  } else {
    resolvedUrl = PHOTO_PLACEHOLDER_URL;
  }

  return { resolvedUrl, handleImageError };
}
