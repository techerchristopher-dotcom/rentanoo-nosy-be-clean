import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getCurrentLang } from "./language";

// Import des traductions initiales (fr + en uniquement pour réduire le bundle)
import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";

// Restructurer les ressources pour que le namespace "translation" contienne directement les clés
// en fusionnant "common" avec les autres clés racines (booking, duration, etc.)
const restructureResources = (json: typeof frCommon) => {
  const { common, ...otherKeys } = json;
  return {
    ...common, // Déballer les clés de "common" au niveau racine
    ...otherKeys, // Ajouter les autres clés racines (booking, duration, etc.)
  };
};

/** Charge it/de à la demande (lazy) */
const loadLanguage = (lng: string): Promise<void> => {
  if (lng === "it") {
    return import("./locales/it/common.json").then((m) => {
      i18n.addResourceBundle("it", "common", m.default);
      i18n.addResourceBundle("it", "translation", restructureResources(m.default));
    });
  }
  if (lng === "de") {
    return import("./locales/de/common.json").then((m) => {
      i18n.addResourceBundle("de", "common", m.default);
      i18n.addResourceBundle("de", "translation", restructureResources(m.default));
    });
  }
  return Promise.resolve();
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

// Charger it/de à la demande : au switch de langue ou si déjà sélectionné au boot
i18n.on("languageChanged", (lng) => {
  if ((lng === "it" || lng === "de") && !i18n.hasResourceBundle(lng, "common")) {
    loadLanguage(lng);
  }
});

const initialLng = getCurrentLang();
if (initialLng && (initialLng === "it" || initialLng === "de")) {
  loadLanguage(initialLng);
}

export default i18n;

