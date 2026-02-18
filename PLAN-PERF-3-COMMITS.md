# Plan perf — 3 commits (PageSpeed Mobile Home)

**Objectif** : Réduire Unused JS (~449 KB), Unused CSS (~137 KB), Images (~362 KB), LCP < 4s.

---

## 1) UNUSED JS

### Imports dans le bundle initial, non nécessaires au premier écran

| Import | Fichier | Utilisé above-the-fold ? | Action |
|--------|---------|---------------------------|--------|
| **date-fns** + fr, enUS, it, de | search-bar-airbnb.tsx:4-8 | Non (locale pour DatePicker modal, lazy) | Dynamic import locale |
| **SingleLocationModal** | Index.tsx:21 | Non (SearchBarAirbnb a le sien en lazy) | Supprimer |
| **Search, Calendar, MapPin, X** | Index.tsx:4 | Non (uniquement Filter utilisé) | Supprimer |
| **itCommon, deCommon** | i18n/config.ts:9-10 | Non (fr/en suffisent pour 95% des users) | Lazy it/de |
| **Input** | Index.tsx:7 | Vérifier usage | Possiblement supprimer si inutilisé |
| **format** (date-fns) | Index.tsx:5 | Oui (performSearchWithCriteria, handleSearch) | Garder ; seul `format` nécessaire, pas les locales |
| **Car, LogOut, LayoutDashboard, MoreVertical** | navbar.tsx:3 | Menu user (below fold ou clic) | Lucide tree-shake OK ; import nommé déjà ciblé |

**Lucide / Radix above-the-fold** :
- Index : `Filter` uniquement (ligne 4) — les autres (Search, Calendar, MapPin, X) sont des imports morts.
- SearchBarAirbnb : Search, MapPin, Calendar, X, RotateCcw — tous utilisés dans la barre visible.
- Navbar : Car, User, LogOut, LayoutDashboard, MoreVertical — dans le menu déroulant (pas above-the-fold mais barre visible).

**Proposition icônes** : Lucide tree-shake déjà ; pas besoin de lazy. Supprimer les imports morts (Index) suffit.

---

### Patch a) Dynamic import des locales date-fns

**Fichier** : `src/components/ui/search-bar-airbnb.tsx`

**Avant** (lignes 4-8) :
```ts
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { it as itLocale } from "date-fns/locale/it";
import { de as deLocale } from "date-fns/locale/de";
```

**Après** :
```ts
import { format } from "date-fns";
import type { Locale } from "date-fns";

const getDateLocale = (lang: string): Promise<Locale> => {
  if (lang.startsWith("fr")) return import("date-fns/locale/fr").then((m) => m.fr);
  if (lang.startsWith("it")) return import("date-fns/locale/it").then((m) => m.it);
  if (lang.startsWith("de")) return import("date-fns/locale/de").then((m) => m.de);
  return import("date-fns/locale/en-US").then((m) => m.enUS);
};
```

Puis remplacer l’usage synchrone de `dateLocale` par un state + `useEffect` :
```ts
const [dateLocale, setDateLocale] = useState<Locale | null>(null);
useEffect(() => {
  getDateLocale(i18n.language || "fr").then(setDateLocale);
}, [i18n.language]);
// formatDateRange et autres : utiliser dateLocale ?? enUS par défaut temporaire, ou attendre le mount
```

**Gain** : ~15–25 KB gzip.

---

### Patch b) i18n : fr/en au boot, it/de en lazy

**Fichier** : `src/i18n/config.ts`

**Avant** :
```ts
import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";
import itCommon from "./locales/it/common.json";
import deCommon from "./locales/de/common.json";
```

**Après** :
```ts
import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";

const loadLanguage = (lng: string) => {
  if (lng === "fr") return Promise.resolve({ common: frCommon, translation: restructureResources(frCommon) });
  if (lng === "en") return Promise.resolve({ common: enCommon, translation: restructureResources(enCommon) });
  if (lng === "it") return import("./locales/it/common.json").then((m) => ({ common: m.default, translation: restructureResources(m.default) }));
  if (lng === "de") return import("./locales/de/common.json").then((m) => ({ common: m.default, translation: restructureResources(m.default) }));
  return Promise.resolve({ common: enCommon, translation: restructureResources(enCommon) });
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    fr: { translation: restructureResources(frCommon), common: frCommon },
    en: { translation: restructureResources(enCommon), common: enCommon },
  },
  fallbackLng: "fr",
  // ...
});

i18n.on("languageChanged", (lng) => {
  if (!i18n.hasResourceBundle(lng, "common")) {
    loadLanguage(lng).then(({ common, translation }) => {
      i18n.addResourceBundle(lng, "common", common);
      i18n.addResourceBundle(lng, "translation", translation);
    });
  }
});

const initialLang = getCurrentLang();
if (initialLang && !["fr", "en"].includes(initialLang)) {
  loadLanguage(initialLang).then(({ common, translation }) => {
    i18n.addResourceBundle(initialLang, "common", common);
    i18n.addResourceBundle(initialLang, "translation", translation);
  });
}
```

**Gain** : ~20–35 KB gzip.

---

### Patch c) Icônes Lucide / Radix inutiles above-the-fold

**Fichier** : `src/pages/Index.tsx`

Supprimer les imports morts :
```diff
- import { Search, Filter, Calendar, MapPin, X } from "lucide-react";
+ import { Filter } from "lucide-react";
```

Supprimer import mort SingleLocationModal :
```diff
- import { SingleLocationModal } from "@/components/ui/single-location-modal";
```

**Gain** : ~2–5 KB gzip (tree-shake).

---

## 2) UNUSED CSS

### Vérification Tailwind `content`

**Fichier** : `tailwind.config.ts` ligne 5

**Actuel** :
```ts
content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"]
```

**Problème** : `./pages`, `./components`, `./app` n’existent pas à la racine. Tout est sous `src/`.

**Patch** :
```ts
content: ["./index.html", "./src/**/*.{ts,tsx}"]
```

**Effet** : purge plus précise, CSS légèrement réduit (quelques KB).

---

### Vérification index.css

**Contenu** : variables (thème, sidebar), animations (dropdown, listItem, mapPin, shimmer, buttonBounce, glow).

- **Variables sidebar** : utilisées par pages avec sidebar, pas par la Home. On peut les garder (impact faible).
- **Animations** : `dropdownSlideIn`, `listItemSlideIn`, `mapPinPulse` — utilisées par SingleLocationModal (lazy). Ces classes ne sont pas nécessaires au premier paint de la Home.
- **buttonBounce**, **glow** : utilisés ailleurs.

**Patch minimal** : rien à retirer sans audit plus fin. Le principal gain vient du `content` Tailwind.

---

## 3) IMAGES

### Images chargées sur la Home (Network)

| Ressource | Origine | Above fold |
|-----------|---------|------------|
| `index-*.js` | Bundle principal | Oui |
| `index-*.css` | CSS principal | Oui |
| Photos véhicules | Supabase `object/public/vehicle-photos/...` | 3 premières cards (après showResults) |
| `rentanoo-logo.svg` | `/brand/` | Non (Footer) |
| Navbar logo | Idem ou autre | Oui |
| Placeholder Unsplash | `images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600` | Si 403 ou pas de photo |

### Vérifications

- **HEIC** : déjà ignoré dans `supabaseVehiclesService.ts` (lignes 97–114) et `photos.ts` (182–184, 264–266).
- **Fallback** : `handleImageError` → PhotoService.getVehiclePhotos → placeholder Unsplash. OK.
- **URL valide** : Pas de check explicite. Si 403, `onError` déclenche le fallback.

### Mécanismes à renforcer (safe)

1. **Ignorer HEIC** : déjà fait.
2. **Fallback placeholder** : déjà fait dans VehicleCard/MotoVehicleCard.
3. **Vérification URL** : optionnel. Un `new Image().src = url` en background n’est pas indispensable ; `onError` suffit.

### Stratégie sans resize Supabase

| Action | Où | Description |
|--------|-----|-------------|
| **Compression à l’upload** | AddVehicle, ManageVehicle | Redimensionner (ex. 1200×900 max) + qualité 0.8 avant upload. |
| **Nettoyage anciens fichiers** | Script manuel / admin | Lister `vehicle-photos`, repérer JPG > 500 KB, proposer remplacement. |
| **CDN / proxy** | Infra | Cloudflare Images, imgix, ou proxy custom pour resize à la volée. |
| **Preload LCP** | index.html | Ne pas ajouter : LCP = H1 (showResults defer). |

**Patch minimal** : Documenter la stratégie + s’assurer que le flux d’upload compresse. Pas de changement dans VehicleCard pour l’instant.

---

## 4) PLAN EN 3 COMMITS

### Commit 1 — Quick wins (≈ 30 min)

| Item | Fichiers | Risque | Gain | Vérification |
|------|----------|--------|------|---------------|
| Supprimer imports morts Index | `Index.tsx` | Nul | ~3–5 KB | `npm run build` ; taille `index-*.js` |
| Supprimer SingleLocationModal | `Index.tsx` | Nul | ~3–4 KB | Idem |
| Lazy Footer | `Index.tsx` | Nul | ~5–8 KB | Idem |
| Tailwind content | `tailwind.config.ts` | Nul | ~2–5 KB CSS | `npm run build` ; taille `index-*.css` |

**Fichiers touchés** : `src/pages/Index.tsx`, `tailwind.config.ts`

**Vérification** : Lighthouse Mobile, Network (taille JS/CSS init) ; aucun changement visuel.

---

### Commit 2 — Medium (date-fns + icônes)

| Item | Fichiers | Risque | Gain | Vérification |
|------|----------|--------|------|---------------|
| Dynamic import locales date-fns | `search-bar-airbnb.tsx` | Faible | ~15–25 KB | Test ouverture modal dates ; format FR/EN |
| (Déjà fait en C1) imports lucide | `Index.tsx` | — | — | — |

**Fichiers touchés** : `src/components/ui/search-bar-airbnb.tsx`

**Risque** : flash de format EN avant chargement de la locale (si `dateLocale` null au premier render). Mitiger avec `format(..., { locale: dateLocale ?? enUS })` en fallback temporaire.

**Vérification** : Changer langue FR/EN/IT/DE ; ouvrir modal dates ; vérifier format.

---

### Commit 3 — Risky (i18n lazy it/de)

| Item | Fichiers | Risque | Gain | Vérification |
|------|----------|--------|------|---------------|
| i18n : fr/en au boot, it/de lazy | `i18n/config.ts` | Moyen | ~20–35 KB | Changement IT/DE ; pas de clé manquante |

**Fichiers touchés** : `src/i18n/config.ts`

**Risque** : Premier switch vers IT/DE : délai de chargement des traductions ; clés manquantes si `addResourceBundle` mal synchronisé. Tester tous les écrans en IT et DE.

**Vérification** : PageSpeed avant/après ; Network (chunk it/de chargé uniquement au switch).

---

## 5) CHECKLIST VÉRIFICATION

### Après chaque commit

- [ ] `npm run build` OK
- [ ] Aucune régression visuelle
- [ ] PageSpeed Mobile : Performance, LCP, TBT

### Lighthouse + Network

1. **Lighthouse** : Mode Mobile, throttling 4G ; noter Performance, LCP, Unused JS/CSS.
2. **Network** : Filtrer par JS ; noter `index-*.js` (init). Filtrer par Img ; noter tailles photos véhicules.
3. **Comparaison** : Avant C1 vs après C1 vs après C2 vs après C3.

---

## 6) GAINS ATTENDUS (ordre de grandeur)

| Métrique | Avant | Après C1 | Après C2 | Après C3 |
|----------|-------|----------|----------|----------|
| JS main (gzip) | ~260 KB | ~248 KB | ~225 KB | ~195 KB |
| CSS main (gzip) | ~23 KB | ~20 KB | ~20 KB | ~20 KB |
| LCP | Variable | Idem ou mieux | Idem ou mieux | Idem ou mieux |

*Les valeurs exactes dépendent du build et des données.*
