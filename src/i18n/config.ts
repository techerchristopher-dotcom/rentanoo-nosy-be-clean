import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getCurrentLang } from "./language";

// Import des traductions
import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";
import itCommon from "./locales/it/common.json";
import deCommon from "./locales/de/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
      },
      en: {
        common: enCommon,
      },
      it: {
        common: itCommon,
      },
      de: {
        common: deCommon,
      },
    },
    fallbackLng: "fr",
    defaultNS: "common",
    lng: getCurrentLang(),
    
    // Détection de langue : priorité à localStorage("lang")
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
    
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    
    react: {
      useSuspense: false, // Évite les problèmes de suspense en développement
    },
  });

export default i18n;

