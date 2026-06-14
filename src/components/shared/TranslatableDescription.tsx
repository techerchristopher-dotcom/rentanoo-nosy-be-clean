import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages, Loader2, RotateCcw } from "lucide-react";

interface Props {
  /** Description originale (FR) */
  descriptionFr?: string | null;
  /** Traductions pré-stockées en DB */
  descriptionEn?: string | null;
  descriptionDe?: string | null;
  descriptionIt?: string | null;
  /** Optionnel : renderer custom (ex: ListingDescriptionContent) */
  renderContent?: (text: string) => React.ReactNode;
}

const LANG_LABELS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
  it: "Italiano",
};

export function TranslatableDescription({
  descriptionFr,
  descriptionEn,
  descriptionDe,
  descriptionIt,
  renderContent,
}: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] ?? "fr";

  // Traduction pré-stockée pour la langue active
  const storedTranslation =
    lang === "en" ? descriptionEn :
    lang === "de" ? descriptionDe :
    lang === "it" ? descriptionIt :
    null;

  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  if (!descriptionFr) return null;

  // Langue FR ou traduction stockée dispo → pas de bouton
  const activeText = showOriginal
    ? descriptionFr
    : storedTranslation || translated || descriptionFr;

  const needsButton = lang !== "fr" && !storedTranslation;
  const canTranslate = needsButton && !translated && !showOriginal;
  const canRestore = needsButton && (translated || showOriginal);

  const handleTranslate = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: descriptionFr, targetLang: lang }),
      });
      const data = await res.json();
      if (data.translatedText) {
        setTranslated(data.translatedText);
        setShowOriginal(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOriginal = () => {
    setShowOriginal((prev) => !prev);
  };

  return (
    <div className="space-y-3">
      {/* Boutons EN HAUT */}
      {needsButton && (
        <div className="flex items-center gap-2 flex-wrap">
          {canTranslate && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5 text-muted-foreground border-dashed hover:border-solid hover:text-foreground"
              onClick={handleTranslate}
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Languages className="h-3 w-3" />
              }
              {loading ? "Traduction…" : `Traduire en ${LANG_LABELS[lang] ?? lang}`}
            </Button>
          )}

          {canRestore && (
            <>
              {translated && !showOriginal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5 text-muted-foreground"
                  onClick={handleToggleOriginal}
                >
                  <RotateCcw className="h-3 w-3" />
                  Voir l'original
                </Button>
              )}
              {showOriginal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1.5 text-muted-foreground"
                  onClick={handleToggleOriginal}
                >
                  <Languages className="h-3 w-3" />
                  {`Voir en ${LANG_LABELS[lang] ?? lang}`}
                </Button>
              )}
            </>
          )}

          {error && (
            <span className="text-xs text-destructive">
              Traduction indisponible
            </span>
          )}
        </div>
      )}

      {/* Contenu */}
      <div>
        {renderContent
          ? renderContent(activeText)
          : <p className="text-gray-700 leading-relaxed text-sm">{activeText}</p>
        }
      </div>
    </div>
  );
}
