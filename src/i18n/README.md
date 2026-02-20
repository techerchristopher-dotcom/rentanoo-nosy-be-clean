# Guide i18n - Ajout de traductions

## 📁 Structure des fichiers de traduction

Les fichiers de traduction sont organisés par langue dans `src/i18n/locales/` :

```
src/i18n/locales/
├── fr/
│   └── common.json    # Traductions françaises
├── en/
│   └── common.json    # Traductions anglaises
├── it/
│   └── common.json    # Traductions italiennes
└── de/
    └── common.json    # Traductions allemandes
```

## ➕ Comment ajouter une nouvelle traduction

### 1. Ajouter une clé dans tous les fichiers de langue

**Exemple** : Ajouter une traduction pour "Bienvenue"

**`src/i18n/locales/fr/common.json`** :
```json
{
  "nav": { ... },
  "common": { ... },
  "welcome": {
    "title": "Bienvenue",
    "subtitle": "Sur notre plateforme"
  }
}
```

**`src/i18n/locales/en/common.json`** :
```json
{
  "nav": { ... },
  "common": { ... },
  "welcome": {
    "title": "Welcome",
    "subtitle": "To our platform"
  }
}
```

**`src/i18n/locales/it/common.json`** :
```json
{
  "nav": { ... },
  "common": { ... },
  "welcome": {
    "title": "Benvenuto",
    "subtitle": "Sulla nostra piattaforma"
  }
}
```

**`src/i18n/locales/de/common.json`** :
```json
{
  "nav": { ... },
  "common": { ... },
  "welcome": {
    "title": "Willkommen",
    "subtitle": "Auf unserer Plattform"
  }
}
```

### 2. Utiliser la traduction dans un composant

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("common");
  
  return (
    <div>
      <h1>{t("welcome.title")}</h1>
      <p>{t("welcome.subtitle")}</p>
    </div>
  );
}
```

## 🔑 Clés existantes

### Navigation (`nav.*`)
- `nav.home` - "Accueil" / "Home" / "Home" / "Startseite"
- `nav.dictionary` - "Dictionnaire" / "Dictionary" / "Dizionario" / "Wörterbuch"
- `nav.login` - "Connexion" / "Login" / "Accedi" / "Anmelden"
- `nav.dashboard` - "Tableau de bord" / "Dashboard" / "Dashboard" / "Dashboard"

### Commun (`common.*`)
- `common.search` - "Rechercher" / "Search" / "Cerca" / "Suchen"
- `common.loading` - "Chargement..." / "Loading..." / "Caricamento..." / "Laden..."
- `common.error` - "Erreur" / "Error" / "Errore" / "Fehler"

## 📝 Bonnes pratiques

1. **Toujours ajouter dans les 4 langues** : fr, en, it, de
2. **Utiliser des clés hiérarchiques** : `section.subsection.key` plutôt que `section_subsection_key`
3. **Garder les clés descriptives** : `nav.dictionary` plutôt que `nav.dict`
4. **Grouper par contexte** : `nav.*`, `common.*`, `booking.*`, `vehicle.*`, etc.
5. **Ne pas traduire les noms propres** : "Rentanoo", "Stripe", etc.

## 🎯 Où ajouter les traductions pour le dictionnaire

Quand vous créerez la page dictionnaire, ajoutez :

**`src/i18n/locales/{lang}/dictionary.json`** :
```json
{
  "title": "...",
  "searchPlaceholder": "...",
  "noResults": "...",
  "entry": {
    "word": "...",
    "definitions": "...",
    "etymology": "..."
  }
}
```

Puis dans `src/i18n/config.ts`, ajoutez le namespace :
```typescript
resources: {
  fr: {
    common: frCommon,
    dictionary: frDictionary, // Nouveau namespace
  },
  // ...
}
```

Et utilisez-le :
```tsx
const { t } = useTranslation("dictionary");
```

---

*Dernière mise à jour : 2025-01-27*

