import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, ExternalLink, ChevronDown } from "lucide-react";
import { extractYouTubeId, toEmbedUrl } from "@/utils/youtube";

interface YouTubePlayerProps {
  youtubeUrl?: string | null;
}

/**
 * Lecteur YouTube dépliable dans une carte blanche.
 * État fermé : carte sobre avec bouton play teal + chevron.
 * État ouvert : iframe youtube-nocookie 16:9 dépliée en place, montée lazily.
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
    <div className="my-4 bg-white/95 backdrop-blur-sm border border-primary-soft/20 shadow-soft rounded-lg overflow-hidden">
      {/* Trigger — rangée cliquable */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="group w-full flex items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
      >
        {/* Bouton play rond teal */}
        <span
          className="
            flex items-center justify-center shrink-0
            w-[44px] h-[44px] rounded-full
            bg-teal-600 text-white shadow-md
            group-hover:bg-teal-700 group-hover:scale-105
            transition-all duration-200
          "
          aria-hidden="true"
        >
          <Play className="h-5 w-5 fill-white ml-0.5" />
        </span>

        {/* Titre */}
        <span className="flex-1 text-sm font-medium text-foreground group-hover:text-teal-700 transition-colors">
          {t("youtube.showVideo", "Voir la vidéo de présentation")}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Séparateur visible uniquement quand ouvert */}
      {open && <div className="border-t border-primary-soft/10" />}

      {/* Lecteur dépliable */}
      <div
        className={`
          grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          motion-reduce:transition-none
          ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
        `}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-4 space-y-3">
            {/* Lecteur 16:9 */}
            <div className="rounded-lg overflow-hidden aspect-video bg-black">
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
            <div className="flex items-center justify-between">
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
    </div>
  );
}
