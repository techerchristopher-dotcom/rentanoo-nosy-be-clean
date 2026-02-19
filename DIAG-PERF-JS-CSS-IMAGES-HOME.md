# DIAG perf — JS / CSS / Images (Home rentanoo.com/)

**Contexte** : Home `https://rentanoo.com/` — Mobile Lighthouse.  
**Objectif** : Réduire **Unused JS (~449KB)**, **Unused CSS (~137KB)**, **Images économisables (~362KB)**, améliorer LCP/FCP sans changer le design.

---

## 1) Unused JS (~449 KB)

### 1.1 Mesure

**Build** : `npm run build` (Vite 5.4)

| Chunk principal | Taille | gzip |
|-----------------|--------|------|
| `index-C1MPvWoi.js` (main) | **864.94 kB** | **260.65 kB** |

**Chargés sur la Home** (route `/`) :
- `index-C1MPvWoi.js` — bundle principal (tout ce qui n’est pas lazy)
- Index importé directement → tout son arbre de dépendances est dans le main bundle

**Chunks non chargés au premier paint** (lazy routes) : `Login`, `Profile`, `VehicleDetails`, `RenterBookings`, `Checking`, etc.

### 1.2 Sources

Les imports suivants gonflent le bundle initial (Index + App + main) :

| Module | Usage | Impact estimé |
|--------|-------|----------------|
| **i18next** + **react-i18next** + **i18next-browser-languagedetector** | main.tsx, Index, SearchBar, Footer, Navbar, Cards | ~40–60 KB |
| **4 locales i18n** (fr, en, it, de) | i18n/config.ts — chargées dès l’init | ~30–50 KB |
| **date-fns** + **4 locales** (fr, enUS, it, de) | Index, SearchBarAirbnb (ligne 4–8) | ~25–40 KB |
| **@tanstack/react-query** | App.tsx | ~15–25 KB |
| **react-router-dom** | App, Index, Navbar, Footer | ~15–20 KB |
| **@supabase/supabase-js** | SupabaseVehiclesService (Index) | ~50–70 KB |
| **lucide-react** (icônes) | Index, SearchBar, Footer, Cards | ~20–30 KB |
| **@radix-ui/** (Select, etc.) | Index filtres | ~30–50 KB |
| **zod** (si utilisé par formulaires) | Indirect | ~15–25 KB |

### 1.3 TOP 10 modules les plus coûteux

| Rang | Module | Où importé | Fichier:Ligne |
|------|--------|------------|---------------|
| 1 | **@supabase/supabase-js** | SupabaseVehiclesService | `Index.tsx:23` |
| 2 | **i18next** + ressources (fr, en, it, de) | i18n/config | `main.tsx:4` |
| 3 | **date-fns** + locales (fr, enUS, it, de) | SearchBarAirbnb | `search-bar-airbnb.tsx:4-8` |
| 4 | **react-i18next** | Index, SearchBar, Footer, Cards | `Index.tsx:2`, `search-bar-airbnb.tsx:2`, `footer.tsx:1`, `vehicle-card.tsx:2`, `moto-vehicle-card.tsx:2` |
| 5 | **@tanstack/react-query** | App | `App.tsx:5` |
| 6 | **react-router-dom** | App, Index, Navbar, Footer | `App.tsx:8`, `Index.tsx:3` |
| 7 | **@radix-ui/react-select** (+ Content, Item, etc.) | Index filtres | `Index.tsx:11-17` |
| 8 | **lucide-react** | Index, SearchBar, Cards | `Index.tsx:4`, `search-bar-airbnb.tsx:3` |
| 9 | **clsx** + **tailwind-merge** | lib/utils (cn) | `utils.ts` → Index, Cards |
| 10 | **format** (date-fns) | Index, SearchBar | `Index.tsx:5`, `search-bar-airbnb.tsx:4` |

### 1.4 Actions proposées (classées gain/risque)

| # | Action | Impact attendu | Fichiers | Risque |
|---|--------|----------------|----------|--------|
| 1 | **Supprimer import mort `SingleLocationModal`** dans Index | −3.7 KB gzip | `Index.tsx:21` | Nul |
| 2 | **Lazy-load du Footer** | −5 à −8 KB gzip | `App.tsx` : `Footer` en lazy + Suspense | Nul |
| 3 | **Dynamic import date-fns locales** dans SearchBarAirbnb | −15 à −25 KB gzip | `search-bar-airbnb.tsx:5-8` | Faible |
| 4 | **Retirer/si DEV les console.log** dans Index (21 occurrences) | −2 à −5 KB | `Index.tsx` (lignes 59–70, 124–136, 301–320, 385–401, 462) | Faible |
| 5 | **i18n : charger uniquement fr + en au init**, it/de en lazy | −20 à −35 KB gzip | `i18n/config.ts` | Moyen |
| 6 | **Lazy QueryClientProvider** (retarder React Query jusqu’à 1ère route qui en a besoin) | −15 à −25 KB | `App.tsx` | Moyen |

**Pseudo-diff pour action 1** :

```diff
// Index.tsx
- import { SingleLocationModal } from "@/components/ui/single-location-modal";
```

**Pseudo-diff pour action 2** :

```diff
// App.tsx
+ const Footer = lazy(() => import("@/components/layout/footer").then(m => ({ default: m.Footer })));
- import { Footer } from "@/components/layout/footer";
  ...
- <Footer />
+ <Suspense fallback={null}><Footer /></Suspense>
```

**Pseudo-diff pour action 3** (date-fns locales dynamiques) :

```ts
// search-bar-airbnb.tsx — remplacer imports statiques par :
const getDateLocale = async (lang: string) => {
  if (lang.startsWith("fr")) return (await import("date-fns/locale/fr")).fr;
  if (lang.startsWith("it")) return (await import("date-fns/locale/it")).it;
  if (lang.startsWith("de")) return (await import("date-fns/locale/de")).de;
  return (await import("date-fns/locale/en-US")).enUS;
};
// puis utiliser getDateLocale(i18n.language) dans le rendu du DatePicker (modal lazy)
```

---

## 2) Unused CSS (~137 KB)

### 2.1 Mesure

| Fichier CSS | Taille | gzip |
|-------------|--------|------|
| **index-DPFVQshp.css** (principal) | **154.72 kB** | **22.79 kB** |
| react-datepicker-CzXs93CS.css | 21.96 kB | 3.08 kB |
| datepicker-overrides-AmiksUWL.css | 8.22 kB | 1.49 kB |
| style-DpsRipQV.css | 3.23 kB | 0.73 kB |
| ManageVehicle-apIxJd6f.css | 2.22 kB | 0.51 kB |
| modal-animations-BZDTbw2D.css | 1.39 kB | 0.43 kB |
| PickerDemo-BKVSfD6P.css | 0.67 kB | 0.35 kB |

**Chargé initialement sur la Home** : uniquement `index-DPFVQshp.css` (154.72 kB).  
Les autres CSS sont dans des chunks associés à des composants lazy (datepicker, ManageVehicle, PickerDemo, etc.).

### 2.2 Origine du CSS principal

Le fichier `index-DPFVQshp.css` provient de :
- `index.css` → Tailwind base/components/utilities
- Animations custom (dropdownSlideIn, listItemSlideIn, mapPinPulse, shimmer, buttonBounce, glow)
- Variables CSS (thème lagoon, dark mode)
- Tous les composants shadcn/Radix utilisés sur Index (Select, Card, Button, Badge, etc.)

**Blocs potentiellement non critiques au premier écran** :
- Styles pour datepicker (si inclus via chaîne d’import)
- Animations modales (dropdown, etc.) — partiellement utilisées par SearchBar
- Styles sidebar (variables `--sidebar-*`) — non utilisés sur Home
- Styles accordion — non utilisés sur Home

### 2.3 Actions proposées

| # | Action | Fichiers / classes | Risque |
|---|--------|-------------------|--------|
| 1 | **Vérifier Tailwind `content`** — s’assurer que seuls les fichiers utilisés sont scannés | `tailwind.config.ts:5` — `content: ["./pages/**", "./components/**", "./app/**", "./src/**/*.{ts,tsx}"]` — les chemins `./pages/**` et `./components/**` à la racine peuvent être vides ; garder `./src/**/*.{ts,tsx}` | Nul |
| 2 | **Extraire modal-animations** en import dynamique (déjà fait pour Login, ManageVehicle, etc.) — éviter tout import dans la chaîne Index si possible | `src/index.css` — vérifier qu’aucun `@import` de modal-animations n’y figure (actuellement non) | Nul |
| 3 | **Audit des classes sidebar** — si non utilisées sur Home, envisager extraction en chunk CSS feature-specific | Variables `--sidebar-*` dans `index.css:71-84` ; utilisées par layout sidebar (pas sur Home) | Faible |

**Content paths Tailwind** (actuel) :

```ts
content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"]
```

→ Les dossiers `./pages` et `./components` à la racine n’existent pas ; tout le code est sous `./src/`. Optimiser en :

```ts
content: ["./index.html", "./src/**/*.{ts,tsx}"]
```

---

## 3) Images économisables (~362 KB)

### 3.1 Inventaire des images sur la Home

| Élément | Format | Où | Above fold ? |
|---------|--------|-----|--------------|
| VehicleCard × N | JPG (Supabase) ou Unsplash placeholder | `vehicle-card.tsx`, `moto-vehicle-card.tsx` | 3 premières (grille) |
| rentanoo-logo.svg | SVG | Footer (`footer.tsx:19`) | Non (below fold) |
| Navbar logo | SVG | Navbar | Oui |

### 3.2 Vérification

| Problème | Détail | Fichier:Ligne |
|----------|--------|---------------|
| **object/public sans transformation** | `getOptimizedImageUrl` retourne l’URL telle quelle pour `object/public` (pas de width/height) → Supabase sert l’original (500KB–2MB possible) | `imageOptimization.ts:39-41` |
| **srcset généré mais URL inchangée** | `generateSrcSet` appelle `getOptimizedImageUrl` qui pour object/public ne modifie pas l’URL → srcset = plusieurs fois la même grosse image | `imageOptimization.ts:70-76` |
| **sizes** | `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw` — correct pour grille 3 col | `imageOptimization.ts:99`, `vehicle-card.tsx:179` |
| **loading / fetchPriority** | index &lt; 3 → eager, index === 0 → fetchPriority high — cohérent avec LCP | `vehicle-card.tsx:181-184`, `moto-vehicle-card.tsx:166-167` |

**Note** : `render/image` n’est pas utilisé (403 sur ce projet). Seul `object/public` est disponible.

### 3.3 Actions proposées

| # | Action | Patch minimal | Risque |
|---|--------|----------------|--------|
| 1 | **Servir des images redimensionnées** — si Supabase Storage peut générer des variants (résolution plus basse au moment de l’upload), ou via un service proxy (Cloudflare, etc.) | Nécessite changement côté stockage ou CDN ; pas de patch purement front | Moyen |
| 2 | **Preload uniquement si LCP = image** — avec le defer de la grille (showResults), le LCP est le H1. Pas de preload image nécessaire sur Home. | Ne pas ajouter `<link rel="preload">` pour les images cards | Nul |
| 3 | **Réduire IMAGE_WIDTHS.CARD** — si des URLs avec params fonctionnent un jour, utiliser [320, 400, 600] au lieu de [400, 800] pour limiter le choix du navigateur | `imageOptimization.ts:115` | Faible |

---

## 4) Résultat attendu (checklist)

- [ ] **JS initial** ↓ d’au moins 50–80 KB gzip (actions 1–4)
- [ ] **CSS initial** stable ou légèrement réduit (vérif Tailwind content)
- [ ] **Images téléchargées** ↓ si possible (dépend infra Supabase / CDN)
- [ ] **LCP cible** : &lt; 4s (mobile 4G lente)
- [ ] **Aucun impact visuel** — design inchangé

---

## 5) Quick wins 30 minutes

1. **Supprimer `SingleLocationModal` inutilisé** (Index.tsx:21) — 2 min  
2. **Lazy-load Footer** (App.tsx) — 5 min  
3. **Vérifier / corriger Tailwind `content`** dans `tailwind.config.ts` — 2 min  

---

## 6) High impact mais plus risqué

1. **i18n : locales fr+en au démarrage, it/de en lazy** — nécessite `i18n.loadLanguages()` ou backend split, tests multilingues.  
2. **Lazy QueryClientProvider** — peut impacter toute app si des composants supposent le provider présent immédiatement ; tester soigneusement.

---

## Annexes

### Fichiers modifiés par les patches recommandés

| Patch | Fichier(s) |
|-------|------------|
| Import mort | `src/pages/Index.tsx` |
| Footer lazy | `src/App.tsx` |
| date-fns locales dynamiques | `src/components/ui/search-bar-airbnb.tsx` |
| console.log prod | `src/pages/Index.tsx` (ou build strip) |
| Tailwind content | `tailwind.config.ts` |

### Références

- `DIAG-PHASE1-IMAGES-PERF.md` — audit images existant  
- `DIAG-ETAPE1-SYSTEME-REDUCTION-IMAGES-EDL.md` — flux EDL  

