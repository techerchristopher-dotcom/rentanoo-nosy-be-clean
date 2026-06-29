/**
 * Utilitaires YouTube — source de vérité unique pour le parsing et la construction d'URLs.
 *
 * Formats d'entrée acceptés par extractYouTubeId :
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ
 *   https://youtube.com/shorts/dQw4w9WgXcQ
 *   dQw4w9WgXcQ  (ID brut)
 *
 * Format de stockage en DB : URL canonique https://www.youtube.com/watch?v={ID}
 */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Extrait l'ID YouTube (11 chars) depuis n'importe quel format d'URL ou ID brut. */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();

  // ID brut
  if (YOUTUBE_ID_REGEX.test(s)) return s;

  try {
    const url = new URL(s);

    // youtu.be/{ID}
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    // youtube.com/watch?v={ID}
    const v = url.searchParams.get("v");
    if (v && YOUTUBE_ID_REGEX.test(v)) return v;

    // youtube.com/embed/{ID} ou youtube.com/shorts/{ID} ou youtube-nocookie.com/embed/{ID}
    const pathParts = url.pathname.split("/").filter(Boolean);
    const embedIdx = pathParts.findIndex((p) => p === "embed" || p === "shorts");
    if (embedIdx !== -1) {
      const id = pathParts[embedIdx + 1];
      return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
    }
  } catch {
    // URL invalide
  }

  return null;
}

/** Convertit n'importe quel format d'entrée en URL canonique pour stockage DB. */
export function toCanonicalYouTubeUrl(input: string): string | null {
  const id = extractYouTubeId(input);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

/** Construit l'URL d'embed privacy-enhanced (youtube-nocookie). */
export function toEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/** Construit l'URL de vignette haute qualité. */
export function toThumbnailUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
