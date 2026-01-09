# DIAGNOSTIC — Clés duration.* retournent des clés brutes

## Problème observé

Sur la page, on voit : `"duration.day_otherduration.separatorduration.hour_other"`  
Les clés `duration.*` ne se résolvent pas alors que `bookings.*` fonctionnent.

---

## 1. Structure des fichiers JSON

### Vérification des fichiers de locale

**Fichiers existants :**
- ✅ `src/i18n/locales/en/common.json` — existe
- ✅ `src/i18n/locales/fr/common.json` — existe
- ✅ `src/i18n/locales/it/common.json` — existe
- ✅ `src/i18n/locales/de/common.json` — existe
- ❌ `src/i18n/locales/en-GB/common.json` — **N'EXISTE PAS**

### Structure des clés dans `en/common.json`

```json
{
  "common": {
    "duration": {
      "day_one": "{{count}} day",
      "day_other": "{{count}} days",
      "hour_one": "{{count}} hour",
      "hour_other": "{{count}} hours",
      "separator": " + "
    }
  },
  "bookings": {
    "card": {
      "startLabel": "Start:",
      ...
    }
  }
}
```

**Observation importante :**
- `duration.*` est dans `common.duration.*` (nested dans `common`)
- `bookings.*` est au niveau racine (pas dans `common`)

---

## 2. Configuration i18n (`src/i18n/config.ts`)

### Configuration actuelle

```typescript
resources: {
  fr: {
    translation: restructureResources(frCommon), // common déplié au niveau racine
    common: frCommon, // original gardé
  },
  en: {
    translation: restructureResources(enCommon),
    common: enCommon,
  },
  // ... it, de
},
fallbackLng: "fr",
defaultNS: "translation",
ns: ["translation", "common"],
```

### Fonction `restructureResources`

```typescript
const restructureResources = (json: typeof frCommon) => {
  const { common, ...otherKeys } = json;
  return {
    ...common, // Déplie common.duration -> duration
    ...otherKeys, // Ajoute bookings, etc.
  };
};
```

**Résultat pour le namespace `translation` :**
- `duration.*` disponible directement (déplié depuis `common.duration`)
- `bookings.*` disponible directement (déjà au niveau racine)

**Résultat pour le namespace `common` :**
- `common.duration.*` disponible (structure originale)
- `bookings.*` disponible (au niveau racine du JSON)

---

## 3. Usage dans le composant

### Hook utilisé

```typescript
const { t, i18n } = useTranslation("common")
```

**Namespace utilisé :** `"common"`  
**Clés appelées :** `t('duration.day_one', { count: 1 })`

### Résolution attendue

Avec `useTranslation("common")` et `t('duration.day_one')`, i18next devrait chercher :
1. `common.duration.day_one` dans la langue active
2. Si non trouvé, fallback vers `fr` (fallbackLng)
3. Si toujours non trouvé, retourner la clé brute

---

## 4. Diagnostic DEV — Logs ajoutés

Un log DEV complet a été ajouté dans `calculateRealDuration()` pour capturer :

### Informations capturées

1. **État de la langue :**
   - `i18n.language` — langue active détectée
   - `i18n.resolvedLanguage` — langue résolue après fallback
   - `i18n.options.fallbackLng` — langue de fallback
   - `i18n.options.supportedLngs` — langues supportées
   - `i18n.options.load` — stratégie de chargement

2. **Configuration namespace :**
   - `i18n.options.ns` — namespaces chargés
   - `i18n.options.defaultNS` — namespace par défaut
   - Namespace courant utilisé (`"common"`)

3. **Résultats des traductions :**
   - `t('duration.day_other', { count: 2 })` — résultat réel
   - `t('duration.separator')` — résultat réel
   - `t('duration.hour_other', { count: 2 })` — résultat réel
   - `t('bookings.card.startLabel')` — comparaison avec clé qui fonctionne

4. **État du store i18n :**
   - Langues disponibles dans le store
   - Namespaces disponibles pour chaque langue
   - Clés disponibles dans `common` pour chaque langue
   - Clés disponibles dans `common.duration` pour chaque langue

5. **Vérification directe du store :**
   - Existence de `en.common.duration`
   - Existence de `en.translation.duration`
   - Existence pour la langue résolue

---

## 5. Hypothèses de cause racine

### Hypothèse 1 : Langue détectée = `en-GB` mais ressources seulement `en`

**Scénario :**
- Le navigateur détecte `en-GB` (via `LanguageDetector`)
- Les ressources sont chargées seulement pour `en`, `fr`, `it`, `de`
- i18next ne trouve pas `en-GB.common.duration` et ne fallback pas vers `en`

**Preuve à vérifier dans les logs :**
- `i18n.language === "en-GB"` ou `"en-US"` ou autre variante
- `i18n.resolvedLanguage` différent de `i18n.language`
- `storeData['en-GB']` existe mais `storeData['en-GB'].common.duration` manque

### Hypothèse 2 : Namespace `common` non résolu correctement

**Scénario :**
- La langue est correcte (`en`)
- Mais `useTranslation("common")` ne résout pas correctement les clés nested
- `t('duration.day_one')` cherche `common.duration.day_one` mais la structure dans le store est différente

**Preuve à vérifier dans les logs :**
- `storeData['en'].common.duration` existe
- Mais `t('duration.day_one')` ne le trouve pas
- Comparaison avec `t('bookings.card.startLabel')` qui fonctionne

### Hypothèse 3 : Problème de fallback de langue

**Scénario :**
- Langue détectée = `en-GB`
- Fallback configuré vers `fr` au lieu de `en`
- Les ressources `en` ne sont jamais utilisées

**Preuve à vérifier dans les logs :**
- `fallbackLng === "fr"`
- `resolvedLanguage === "fr"` alors que `language === "en-GB"`

---

## 6. Fix recommandés (sans implémenter)

### Fix 1 : Ajouter support pour variantes de langue

**Option A : Créer fichiers `en-GB`, `en-US`, etc.**
```typescript
// src/i18n/config.ts
import enGBCommon from "./locales/en-GB/common.json";
// ... ou utiliser alias
```

**Option B : Configurer i18next pour mapper `en-*` vers `en`**
```typescript
// src/i18n/config.ts
i18n.init({
  // ...
  load: 'languageOnly', // Charge seulement 'en' au lieu de 'en-GB'
  // ou
  nonExplicitSupportedLngs: true, // Permet fallback automatique
  // ou
  supportedLngs: ['en', 'fr', 'it', 'de'], // Force codes exacts
})
```

### Fix 2 : Normaliser la langue au chargement

```typescript
// src/i18n/language.ts
export function getCurrentLang(): LangCode {
  // ...
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored?.startsWith('en')) {
    return 'en'; // Normaliser en-GB, en-US -> en
  }
  // ...
}
```

### Fix 3 : Configurer fallback explicite pour variantes

```typescript
// src/i18n/config.ts
i18n.init({
  // ...
  fallbackLng: {
    'en-GB': ['en', 'fr'],
    'en-US': ['en', 'fr'],
    'default': ['fr'],
  },
})
```

### Fix 4 : Changer le namespace utilisé

**Si le problème vient du namespace `common` :**
- Utiliser `useTranslation("translation")` au lieu de `useTranslation("common")`
- Ou utiliser `t('common:duration.day_one')` pour forcer le namespace

---

## 7. Instructions pour exécuter le diagnostic

1. **Ouvrir la console du navigateur** (F12)
2. **Naviguer vers une page avec RenterBookingCard**
3. **Chercher le log `[duration-debug]`**
4. **Copier toutes les valeurs affichées**

### Valeurs à relever

```javascript
{
  language: "...",           // Langue détectée
  resolvedLanguage: "...",   // Langue résolue
  fallbackLng: "...",        // Fallback configuré
  supportedLngs: [...],      // Langues supportées
  translations: {
    'duration.day_other': "...",      // Résultat réel
    'bookings.card.startLabel': "...", // Comparaison
  },
  store: {
    availableLanguages: [...],
    currentLangData: [...],
    commonDurationKeys: [...],
  },
  directStoreCheck: {
    'en.common.duration': "...",      // EXISTS ou MISSING
  }
}
```

---

## 8. Conclusion attendue

Après analyse des logs, déterminer :

1. **Cause racine identifiée :**
   - [ ] Langue détectée = `en-GB` mais ressources seulement `en`
   - [ ] Namespace `common` non résolu correctement
   - [ ] Problème de fallback de langue
   - [ ] Autre (préciser)

2. **Fix minimal recommandé :**
   - [ ] Ajouter fichiers `en-GB` (ou alias)
   - [ ] Configurer `load: 'languageOnly'` ou `nonExplicitSupportedLngs`
   - [ ] Normaliser langue au chargement (`en-*` -> `en`)
   - [ ] Configurer fallback explicite pour variantes
   - [ ] Changer namespace utilisé (`translation` au lieu de `common`)

---

**STATUS :** Logs DEV ajoutés — En attente d'exécution pour diagnostic complet

