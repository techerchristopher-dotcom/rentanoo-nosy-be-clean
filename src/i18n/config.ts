import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getCurrentLang } from "./language";

// Import des traductions
import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";
import itCommon from "./locales/it/common.json";
import deCommon from "./locales/de/common.json";

// Restructurer les ressources pour que le namespace "translation" contienne directement les clés
// en fusionnant "common" avec les autres clés racines (booking, duration, etc.)
const restructureResources = (json: typeof frCommon) => {
  const { common, ...otherKeys } = json;
  return {
    ...common, // Déballer les clés de "common" au niveau racine
    ...otherKeys, // Ajouter les autres clés racines (booking, duration, etc.)
  };
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        translation: restructureResources(frCommon),
        common: frCommon, // Garder l'original pour compatibilité avec composants existants
      },
      en: {
        translation: restructureResources(enCommon),
        common: enCommon,
      },
      it: {
        translation: restructureResources(itCommon),
        common: itCommon,
      },
      de: {
        translation: restructureResources(deCommon),
        common: deCommon,
      },
    },
    fallbackLng: "fr",
    defaultNS: "translation",
    ns: ["translation", "common"], // Charger les deux namespaces pour compatibilité
    lng: getCurrentLang(),
    
    // Forcer le chargement immédiat des ressources
    initImmediate: true,
    
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

