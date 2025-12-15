import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCurrentLang } from "@/i18n/language";
import type { LangCode } from "@/types/dictionary";
import { cn } from "@/lib/utils";

const LANGUAGES: Array<{ code: LangCode; flag: string; label: string }> = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  // Utiliser i18n.language au lieu de getCurrentLang() pour forcer le re-render
  const currentLang = (i18n.language as LangCode) || "fr";

  const handleLanguageChange = (lang: LangCode) => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang).catch((err) => {
      console.error("Erreur lors du changement de langue:", err);
    });
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          aria-label={`Changer la langue. Langue actuelle: ${currentLanguage.label}`}
        >
          <span className="text-lg" role="img" aria-hidden="true">
            {currentLanguage.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "cursor-pointer flex items-center gap-2",
              currentLang === lang.code && "bg-accent font-medium"
            )}
            aria-selected={currentLang === lang.code}
          >
            <span className="text-lg" role="img" aria-hidden="true">
              {lang.flag}
            </span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

