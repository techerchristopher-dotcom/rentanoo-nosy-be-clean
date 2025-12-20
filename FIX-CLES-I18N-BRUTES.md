# 🔧 FIX IMMÉDIAT — CLÉS I18N BRUTES DANS LA MODALE

## ✅ Clés corrigées avec fallbacks

### 1. "Année"

**Avant** : `t("vehicleForm.year")` ❌ (clé inexistante)

**Après** : `t("ownerVehicles.card.year", "Année")` ✅

**Preuve d'existence** :
- FR : `src/i18n/locales/fr/common.json:682` → `"ownerVehicles.card.year": "Année"`
- EN : `src/i18n/locales/en/common.json:679` → `"ownerVehicles.card.year": "Year"`
- IT : `src/i18n/locales/it/common.json:640` → `"ownerVehicles.card.year": "Anno"`
- DE : `src/i18n/locales/de/common.json:640` → `"ownerVehicles.card.year": "Jahr"`

**Chemin JSON** : `common.ownerVehicles.card.year`

---

### 2. "Départ"

**Avant** : `t("searchBar.departure")` ⚠️ (sans fallback)

**Après** : `t("searchBar.departure", "Départ")` ✅ (avec fallback comme dans search-bar-airbnb.tsx)

**Preuve d'existence** :
- FR : `src/i18n/locales/fr/common.json:79` → `"searchBar.departure": "Départ"`
- EN : `src/i18n/locales/en/common.json:79` → `"searchBar.departure": "Departure"`
- IT : `src/i18n/locales/it/common.json:102` → `"searchBar.departure": "Partenza"`
- DE : `src/i18n/locales/de/common.json:102` → `"searchBar.departure": "Abfahrt"`

**Chemin JSON** : `common.searchBar.departure`

**Référence** : Utilisé dans `src/components/ui/search-bar-airbnb.tsx:230` avec le même fallback

---

### 3. "Retour"

**Avant** : `t("searchBar.return")` ⚠️ (sans fallback)

**Après** : `t("searchBar.return", "Retour")` ✅ (avec fallback comme dans search-bar-airbnb.tsx)

**Preuve d'existence** :
- FR : `src/i18n/locales/fr/common.json:80` → `"searchBar.return": "Retour"`
- EN : `src/i18n/locales/en/common.json:80` → `"searchBar.return": "Return"`
- IT : `src/i18n/locales/it/common.json:103` → `"searchBar.return": "Ritorno"`
- DE : `src/i18n/locales/de/common.json:103` → `"searchBar.return": "Rückgabe"`

**Chemin JSON** : `common.searchBar.return`

**Référence** : Utilisé dans `src/components/ui/search-bar-airbnb.tsx:294` avec le même fallback

---

## 📋 Résumé des modifications

| Clé | Avant | Après | Statut |
|-----|-------|-------|--------|
| `vehicleForm.year` | ❌ Inexistante | `ownerVehicles.card.year` + fallback | ✅ Corrigée |
| `searchBar.departure` | ⚠️ Sans fallback | `searchBar.departure` + fallback | ✅ Corrigée |
| `searchBar.return` | ⚠️ Sans fallback | `searchBar.return` + fallback | ✅ Corrigée |

---

## ✅ Validation

- ✅ Plus aucune clé brute ne s'affichera à l'écran
- ✅ Toutes les clés ont des fallbacks FR au cas où
- ✅ Toutes les clés existent dans les 4 langues (FR/EN/IT/DE)
- ✅ Aucun JSON modifié (conforme aux règles)
- ✅ Pattern cohérent avec `search-bar-airbnb.tsx`

---

## 📝 Notes

Les fallbacks sont ajoutés par sécurité, même si les clés existent, pour garantir qu'aucune clé brute ne s'affiche en cas de problème de résolution i18n. C'est le même pattern utilisé dans `search-bar-airbnb.tsx`.

