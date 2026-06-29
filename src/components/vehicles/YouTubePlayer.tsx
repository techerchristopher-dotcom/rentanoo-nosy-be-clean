import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, ExternalLink } from "lucide-react";
import { extractYouTubeId, toEmbedUrl, toThumbnailUrl } from "@/utils/youtube";

interface YouTubePlayerProps {
  youtubeUrl?: string | null;
}

/**
 * Lecteur YouTube responsive avec vignette cliquable.
 * Retourne null si aucune URL valide n'est fournie.
 * Utilise youtube-nocookie.com (privacy-enhanced mode).
 * L'iframe ne monte que lorsque l'utilisateur clique sur la vignette (lazy).
 */
export function YouTubePlayer({ youtubeUrl }: YouTubePlayerProps) {
  const { t } = useTranslation("common");
  const [playing, setPlaying] = useState(false);

  const id = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;

  if (!id) return null;

  const embedUrl = toEmbedUrl(id) + "&autoplay=1";
  const thumbnailUrl = toThumbnailUrl(id);
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;

  return (
    <div className="space-y-2 my-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("youtube.sectionTitle", "Vidéo de présentation")}
        </h3>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label={t("youtube.watchOnYouTube", "Voir sur YouTube")}
        >
          <ExternalLink className="h-3 w-3" />
          {t("youtube.watchOnYouTube", "Voir sur YouTube")}
        </a>
      </div>

      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        {playing ? (
          <iframe
            src={embedUrl}
            title={t("youtube.iframeTitle", "Vidéo de présentation du véhicule")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group"
            aria-label={t("youtube.playVideo", "Lire la vidéo de présentation")}
          >
            <img
              src={thumbnailUrl}
              alt={t("youtube.thumbnailAlt", "Vignette de la vidéo de présentation")}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Overlay play button */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 transition-colors shadow-lg">
                <Play className="h-7 w-7 text-white fill-white ml-1" />
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
