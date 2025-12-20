# Rollback vers Stratégie A : Namespace `common` uniquement

## Configuration de rollback

Si la restructuration actuelle ne fonctionne pas ou casse des composants, utiliser cette configuration :

```typescript
// src/i18n/config.ts
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
    ns: ["common"],
    lng: getCurrentLang(),
    
    // Détection de langue : priorité à localStorage("lang")
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
```

## Modification dans BookingConfirmationModal.tsx

Changer :
```typescript
const { t, i18n } = useTranslation();
```

En :
```typescript
const { t, i18n } = useTranslation("common");
```

Et utiliser les clés avec le préfixe `common.` :
- `t("common.searchBar.departure")` au lieu de `t("searchBar.departure")`
- `t("common.booking.confirmation.title")` au lieu de `t("booking.confirmation.title")`

## Avantages de cette stratégie

- ✅ Pas de restructuration artificielle
- ✅ Compatible avec tous les composants existants (18 composants utilisent déjà `useTranslation("common")`)
- ✅ Structure JSON inchangée
- ✅ Pas de risque de casser l'existant

## Inconvénients

- ⚠️ Nécessite d'ajouter le préfixe `common.` dans la modale
- ⚠️ Incohérence avec le `defaultNS: "translation"` actuel

