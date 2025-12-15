import type { LangCode } from "@/types/dictionary";

export const DEFAULT_LANG: LangCode = "fr";
const STORAGE_KEY = "lang";

function isValidLang(value: string | null): value is LangCode {
  return value === "fr" || value === "en" || value === "it" || value === "de";
}

export function getCurrentLang(): LangCode {
  if (typeof window === "undefined") {
    return DEFAULT_LANG;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidLang(stored)) {
      return stored;
    }
  } catch {
    // localStorage peut ne pas être disponible (SSR, Private mode strict, etc.)
  }

  return DEFAULT_LANG;
}

export function setCurrentLang(lang: LangCode): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignorer silencieusement les erreurs de stockage
  }
}


