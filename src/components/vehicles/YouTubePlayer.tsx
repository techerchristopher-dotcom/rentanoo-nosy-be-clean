import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, ExternalLink } from "lucide-react";
import { extractYouTubeId, toEmbedUrl } from "@/utils/youtube";

interface YouTubePlayerProps {
  youtubeUrl?: string | null;
}

/**
 * Lecteur YouTube dépliable en place — design discret.
 * État fermé : lien minimal (bouton play teal + texte).
 * État ouvert : iframe youtube-nocookie 16:9 montée lazily au premier clic.
 * Retourne null si aucune URL valide.
 */
export function YouTubePlayer({ youtubeUrl }: YouTubePlayerProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const id = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
  if (!id) return null;

  const embedUrl = toEmbedUrl(id) + "&autoplay=1";
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;

  const handleToggle = () => {
    if (!open && !iframeReady) setIframeReady(true);
    setOpen((prev) => !prev);
  };

  const handleClose = () => setOpen(false);

  return (
    <div className="my-4">
      {/* Trigger — lien minimal */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="group flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-full"
      >
        {/* Bouton play rond teal */}
        <span
          className="
            flex items-center justify-center
            w-[34px] h-[34px] rounded-full shrink-0
            bg-teal-600 text-white shadow-sm
            group-hover:bg-teal-500 group-hover:scale-105
            transition-all duration-200
          "
          aria-hidden="true"
        >
          <Play className="h-4 w-4 fill-white ml-0.5" />
        </span>

        {/* Texte */}
        <span className="text-sm text-foreground group-hover:text-teal-600 transition-colors">
          {t("youtube.showVideo", "Voir la vidéo de présentation")}
        </span>
      </button>

      {/* Lecteur dépliable */}
      <div
        className={`
          grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          motion-reduce:transition-none
          ${open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"}
        `}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl overflow-hidden aspect-video bg-black">
            {iframeReady && (
              <iframe
                src={embedUrl}
                title={t("youtube.iframeTitle", "Vidéo de présentation du véhicule")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                className="w-full h-full border-0"
              />
            )}
          </div>

          {/* Actions sous le lecteur */}
          <div className="flex items-center justify-between mt-2 px-0.5">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("youtube.hideVideo", "Masquer la vidéo")}
            </button>

            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center gap-1.5 text-xs font-medium
                px-3 py-1 rounded-full
                bg-teal-50 text-teal-700 border border-teal-200
                hover:bg-teal-100 transition-colors
              "
              aria-label={t("youtube.watchOnYouTube", "Voir sur YouTube")}
            >
              <ExternalLink className="h-3 w-3" />
              {t("youtube.watchOnYouTube", "Voir sur YouTube")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
