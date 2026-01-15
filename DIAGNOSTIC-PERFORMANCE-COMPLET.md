# 🔍 Diagnostic Performance - Rentanoo

**Date**: 2026-01-15  
**Stack**: Vite 5.4.19 + React 18.3.1 + TypeScript + Tailwind CSS 3.4.17  
**Mode**: Production build analysé

---

## 📊 A) PHOTO ACTUELLE

### 1. Top Assets (Bundle JS/CSS)

| Fichier | Taille brute | Gzip | Brotli | Où utilisé | Impact |
|---------|--------------|------|--------|------------|--------|
| `index-KtxRwkyZ.js` | **2.97 MB** | **764 KB** | ~550 KB (est.) | Bundle principal (tout chargé au démarrage) | ⚠️ **CRITIQUE** - Bloque parsing JS, LCP |
| `index-BDCCK6Rd.css` | 187 KB | 27.5 KB | ~20 KB (est.) | CSS global (Tailwind + custom) | ⚠️ Bloque rendu initial |
| `index.es-DK1xsKfU.js` | 147 KB | 51.5 KB | ~40 KB (est.) | Vendor chunks (React, etc.) | Modéré |
| `checkinDepartPdfService-Bu-g7toW.js` | 32 KB | 6.8 KB | ~5 KB (est.) | PDF génération (chargé dynamiquement ✅) | ✅ OK (dynamique) |
| `checkinReturnPdfService-JMNQayNk.js` | 28 KB | 6.0 KB | ~4.5 KB (est.) | PDF génération (chargé dynamiquement ✅) | ✅ OK (dynamique) |
| `purify.es-sOfw8HaZ.js` | 22.7 KB | 8.8 KB | ~7 KB (est.) | DOMPurify (sanitization) | Modéré |

**Total bundle initial**: ~**2.97 MB** (764 KB gzip)  
**CSS initial**: 187 KB (27.5 KB gzip)

---

### 2. Top Dépendances (par taille estimée dans bundle)

| Package | Taille approx (dans bundle) | Importé où | Alternative/Solution |
|---------|----------------------------|------------|----------------------|
| **lucide-react** | ~400-500 KB | 120+ fichiers (imports individuels) | ✅ **Tree-shaking OK** mais trop d'icônes chargées |
| **@radix-ui/* (20+ packages)** | ~300-400 KB | Composants UI (Dialog, Select, Dropdown, etc.) | Code-splitting par route |
| **date-fns** | ~150-200 KB | 20+ fichiers (toutes locales chargées) | ✅ Déjà optimisé (tree-shaking) mais locales multiples |
| **react-datepicker** | ~100-150 KB | `search-bar-airbnb.tsx`, `date-range-picker.tsx` | Dynamic import sur pages non-critiques |
| **react-phone-number-input** | ~80-100 KB | `VehicleDetails.tsx`, `Profile.tsx` | Dynamic import |
| **recharts** | ~200-300 KB | `Dashboard.tsx` (owner) | ✅ Dynamic import recommandé |
| **embla-carousel-react** | ~50-80 KB | `carousel.tsx` | Dynamic import si pas sur home |
| **i18next + locales** | ~100-150 KB | Global (4 langues chargées) | ✅ Déjà optimisé |
| **html2canvas + jspdf** | ~150-200 KB | Services PDF (déjà dynamique ✅) | ✅ **Déjà optimisé** |
| **@stripe/stripe-js** | ~100-150 KB | Payment flows | Dynamic import sur page paiement uniquement |

**Problème principal**: Bundle monolithique de 2.97 MB chargé en entier au démarrage.

---

### 3. Top Images (analyse code)

| Source | Poids estimé | Dims réelles | Dims affichées | Action recommandée |
|--------|-------------|--------------|----------------|-------------------|
| **Supabase Storage** (`vehicle-photos`) | **Inconnu** (pas de transformation) | Probablement **1920px+** | **~400px** (cards) / **~800px** (details) | ⚠️ **CRITIQUE** - Ajouter transformations Supabase |
| Placeholder Unsplash | ~50-100 KB | 800x600 | 400x300 | ✅ OK mais utiliser placeholder local |
| SVG logos (brands/) | ~1-5 KB chacun | Vectoriel | Variable | ✅ OK |
| `rentanoo-logo.svg` | ~5-10 KB | Vectoriel | Variable | ✅ OK |

**Problème identifié**: 
- Images véhicules servies en taille originale depuis Supabase Storage
- Pas de `srcset` / `sizes` pour responsive
- Pas de lazy-loading sur images below-the-fold
- Pas de format WebP/AVIF

---

## 🔍 B) ANALYSES DÉTAILLÉES

### 1. Stack & Configuration

- **Framework**: React 18.3.1 (avec SWC compiler ✅)
- **Bundler**: Vite 5.4.19
- **CSS**: Tailwind CSS 3.4.17 (JIT mode ✅)
- **Build mode**: Production (minification activée ✅)

**Configuration actuelle**:
- ✅ SWC pour compilation rapide
- ✅ Tree-shaking activé (Vite)
- ❌ Pas de code-splitting manuel
- ❌ Pas de compression Brotli configurée (serveur)
- ❌ Pas de cache headers configurés (Vite)

---

### 2. Bundle JS - Problèmes identifiés

#### 2.1 Bundle monolithique (2.97 MB)
**Cause**: Tout le code est dans un seul chunk `index-KtxRwkyZ.js`

**Preuves**:
- Build output: `dist/assets/index-KtxRwkyZ.js` = 2.97 MB
- Warning Vite: "Some chunks are larger than 500 kB"
- Aucun `manualChunks` configuré

**Impact**:
- ⚠️ Parse time élevé (~500-800ms sur mobile)
- ⚠️ Bloque le thread principal
- ⚠️ LCP dégradé (JS blocking)

#### 2.2 Dépendances lourdes chargées globalement

**Lucide-react** (120+ imports):
- ✅ Tree-shaking fonctionne (imports individuels)
- ⚠️ Mais trop d'icônes importées (120 fichiers)
- **Solution**: Vérifier usage réel, supprimer icônes inutilisées

**Radix UI** (20+ packages):
- Tous chargés même si composant non utilisé
- **Solution**: Code-splitting par route

**date-fns locales**:
- 4 locales chargées (fr, en, it, de)
- ✅ Tree-shaking OK mais toutes présentes
- **Solution**: Charger locale dynamiquement selon langue détectée

**react-datepicker**:
- Chargé sur home page (`search-bar-airbnb.tsx`)
- **Solution**: Dynamic import (chargé seulement quand date picker ouvert)

**recharts**:
- Utilisé uniquement dans `Dashboard.tsx` (owner)
- **Solution**: Dynamic import (page owner uniquement)

#### 2.3 JS inutilisé potentiel

**Composants chargés mais non utilisés sur home**:
- `html2canvas` / `jspdf` → ✅ Déjà dynamique
- `recharts` → ⚠️ Chargé globalement (utilisé owner dashboard)
- `react-phone-number-input` → ⚠️ Chargé sur home (utilisé details/profile)
- `embla-carousel` → Vérifier usage sur home

---

### 3. CSS - Analyse

**Taille**: 187 KB (27.5 KB gzip)  
**Inutilisé estimé**: ~165 KB (selon Lighthouse)

#### 3.1 Sources de CSS

1. **Tailwind CSS** (via `@tailwind` dans `index.css`)
   - ✅ JIT mode activé
   - ⚠️ `content` config: `["./src/**/*.{ts,tsx}"]` (trop large ?)
   - **Vérification**: Tailwind scan tous les fichiers, peut générer du CSS inutilisé

2. **CSS custom** (`index.css`)
   - ~680 lignes de CSS custom (animations, datepicker styles, etc.)
   - ⚠️ Beaucoup de keyframes et animations non utilisées

3. **Libs UI CSS**:
   - `react-datepicker/dist/react-datepicker.css` → Chargé globalement
   - `react-phone-number-input/style.css` → Chargé globalement

#### 3.2 Problèmes identifiés

- **Tailwind content config**: Scanne tous les fichiers, peut inclure du CSS pour composants non utilisés
- **CSS global libs**: `react-datepicker.css` et `react-phone-number-input/style.css` chargés même si composant non utilisé
- **CSS custom**: Beaucoup d'animations/keyframes potentiellement inutilisées

---

### 4. Images & LCP

#### 4.1 LCP Element (probable)

**Sur home page**:
- Probablement: **Image véhicule** (première card) ou **Hero image** (si présente)
- **Blocage potentiel**: 
  - JS bundle (2.97 MB) bloque parsing
  - CSS (187 KB) bloque rendu
  - Image véhicule non optimisée (taille originale)

#### 4.2 Images véhicules

**Problèmes**:
1. **Pas de transformation Supabase**: Images servies en taille originale
2. **Pas de `srcset`**: Une seule taille servie
3. **Pas de lazy-loading**: Toutes les images chargées immédiatement
4. **Format**: Probablement JPEG/PNG (pas WebP/AVIF)

**Code actuel** (`vehicle-card.tsx`):
```tsx
<img
  src={primaryPhoto?.url || PLACEHOLDER_URL}
  alt={`${vehicle.brand} ${vehicle.model}`}
  className="w-full h-full object-cover"
  onError={handleImageError}
/>
```

**Manque**:
- `loading="lazy"` (sauf première image)
- `srcset` pour responsive
- Transformation Supabase pour redimensionnement

---

### 5. Third Parties & Network

**Scripts tiers détectés**: **AUCUN** ✅

- ❌ Pas de Google Analytics
- ❌ Pas de Facebook Pixel
- ❌ Pas de chat widgets
- ❌ Pas de maps (Google Maps, etc.)

**Services externes**:
- **Supabase** (API + Storage) → ✅ Nécessaire
- **Stripe** (paiement) → ✅ Chargé dynamiquement (bon)

**Conclusion**: Pas de third parties bloquants ✅

---

### 6. Serveur & Cache

**Configuration actuelle**: Non vérifiée (nécessite accès serveur)

**Recommandations** (à vérifier côté hébergeur):
- ✅ **Cache-Control** sur assets statiques: `max-age=31536000, immutable`
- ✅ **Compression**: Gzip activé (confirmé par build), Brotli à activer
- ✅ **CDN**: Si disponible, activer pour assets statiques

**Vite build output**:
- Assets hashés (`index-KtxRwkyZ.js`) → Cache-friendly ✅
- Mais pas de headers configurés dans Vite (à faire côté serveur)

---

## 🎯 C) PLAN D'ACTION SMART (Priorisé)

### P0 - TRÈS SAFE, GROS IMPACT (Quick Wins)

#### P0.1 - Images véhicules: Redimensionnement + Lazy-loading
**Impact**: ⭐⭐⭐⭐⭐ (LCP, bandwidth)  
**Effort**: ⭐⭐ (2-3h)  
**Risque**: Très faible

**Actions**:
1. Ajouter transformations Supabase Storage pour images véhicules
   - Thumbnail: 400x300 (cards)
   - Medium: 800x600 (details)
   - Large: 1200x900 (lightbox)
2. Implémenter `srcset` dans `VehicleCard` et `VehicleDetails`
3. Ajouter `loading="lazy"` sur images below-the-fold (sauf première 3-4)
4. Utiliser format WebP si supporté (fallback JPEG)

**Fichiers à modifier**:
- `src/components/vehicles/vehicle-card.tsx`
- `src/pages/vehicles/VehicleDetails.tsx`
- `src/services/supabase/photos.ts` (ajouter transformations)

**Gain estimé**: 
- LCP: -1.5s à -2s
- Bandwidth: -60% à -80%

---

#### P0.2 - Code-splitting: Routes non-critiques
**Impact**: ⭐⭐⭐⭐⭐ (Bundle initial)  
**Effort**: ⭐⭐⭐ (4-6h)  
**Risque**: Faible (React.lazy standard)

**Actions**:
1. Lazy-load routes owner (`/me/owner/*`)
2. Lazy-load routes renter (`/me/renter/*`)
3. Lazy-load routes admin (`/admin`)
4. Lazy-load `VehicleDetails` (page lourde)

**Fichiers à modifier**:
- `src/App.tsx` (convertir imports en `React.lazy`)

**Gain estimé**:
- Bundle initial: -40% à -60% (1.2-1.8 MB → 600-900 KB gzip)
- Parse time: -300-500ms

---

#### P0.3 - Dynamic imports: Composants lourds
**Impact**: ⭐⭐⭐⭐ (Bundle initial)  
**Effort**: ⭐⭐ (2-3h)  
**Risque**: Très faible

**Actions**:
1. Dynamic import `recharts` (Dashboard owner uniquement)
2. Dynamic import `react-datepicker` (chargé quand picker ouvert)
3. Dynamic import `react-phone-number-input` (pages details/profile uniquement)

**Fichiers à modifier**:
- `src/pages/owner/Dashboard.tsx`
- `src/components/ui/search-bar-airbnb.tsx`
- `src/pages/vehicles/VehicleDetails.tsx`
- `src/pages/Profile.tsx`

**Gain estimé**:
- Bundle initial: -100-150 KB gzip

---

#### P0.4 - CSS: Déplacer libs CSS vers dynamic imports
**Impact**: ⭐⭐⭐ (CSS initial)  
**Effort**: ⭐⭐ (1-2h)  
**Risque**: Très faible

**Actions**:
1. Déplacer `react-datepicker.css` vers import dynamique
2. Déplacer `react-phone-number-input/style.css` vers import dynamique

**Fichiers à modifier**:
- `src/components/ui/search-bar-airbnb.tsx`
- `src/pages/vehicles/VehicleDetails.tsx`
- `src/pages/Profile.tsx`

**Gain estimé**:
- CSS initial: -10-15 KB gzip

---

#### P0.5 - Cache headers (serveur)
**Impact**: ⭐⭐⭐⭐ (Repeat visits)  
**Effort**: ⭐ (30min - config serveur)  
**Risque**: Aucun

**Actions**:
1. Configurer `Cache-Control: max-age=31536000, immutable` sur `/assets/*`
2. Activer Brotli compression (si disponible)
3. Configurer CDN si disponible

**Gain estimé**:
- Repeat visits: -80% à -90% bandwidth
- TTFB: -100-200ms (cache hit)

---

### P1 - SAFE/MODÉRÉ (Optimisations moyennes)

#### P1.1 - Tailwind: Optimiser content config
**Impact**: ⭐⭐⭐ (CSS unused)  
**Effort**: ⭐⭐ (2-3h)  
**Risque**: Faible

**Actions**:
1. Vérifier `tailwind.config.ts` content paths
2. Exclure fichiers non utilisés (backups, etc.)
3. Purge CSS inutilisé (Vite fait déjà, mais vérifier)

**Fichiers à modifier**:
- `tailwind.config.ts`

**Gain estimé**:
- CSS: -20-30 KB (si CSS vraiment inutilisé)

---

#### P1.2 - Lucide-react: Audit icônes
**Impact**: ⭐⭐ (Bundle)  
**Effort**: ⭐⭐⭐ (3-4h)  
**Risque**: Faible

**Actions**:
1. Lister toutes les icônes importées
2. Identifier icônes inutilisées
3. Supprimer imports inutilisés

**Gain estimé**:
- Bundle: -50-100 KB (si beaucoup d'icônes inutilisées)

---

#### P1.3 - date-fns: Charger locale dynamiquement
**Impact**: ⭐⭐ (Bundle)  
**Effort**: ⭐⭐ (2-3h)  
**Risque**: Faible

**Actions**:
1. Charger locale date-fns selon langue détectée (i18n)
2. Ne pas importer toutes les locales au démarrage

**Fichiers à modifier**:
- Fichiers utilisant `date-fns/locale/*`

**Gain estimé**:
- Bundle: -30-50 KB (3 locales non chargées)

---

### P2 - PLUS RISQUÉ (À valider)

#### P2.1 - Manual chunks: Séparer vendors
**Impact**: ⭐⭐⭐⭐ (Cache, parallel loading)  
**Effort**: ⭐⭐⭐⭐ (6-8h)  
**Risque**: Modéré (peut casser si mal configuré)

**Actions**:
1. Configurer `manualChunks` dans Vite
2. Séparer: React, Radix UI, date-fns, etc.
3. Tester cache invalidation

**Fichiers à modifier**:
- `vite.config.ts`

**Gain estimé**:
- Cache: Meilleur (vendors changent moins souvent)
- Parallel loading: +20-30% (si HTTP/2)

---

#### P2.2 - CSS: Scoper composants lourds
**Impact**: ⭐⭐⭐ (CSS unused)  
**Effort**: ⭐⭐⭐⭐ (8-10h)  
**Risque**: Modéré (refacto CSS)

**Actions**:
1. Scoper CSS datepicker (CSS Modules ou styled-components)
2. Scoper CSS phone input
3. Supprimer CSS custom inutilisé

**Gain estimé**:
- CSS: -30-50 KB

---

## 📋 D) COMMANDES/ÉTAPES POUR REPRODUIRE

### 1. Build & Analyse

```bash
# Build production
npm run build

# Vérifier taille bundle
ls -lh dist/assets/*.js
ls -lh dist/assets/*.css

# Analyser avec bundle analyzer (si configuré)
# Ouvrir dist/stats.html dans navigateur
```

### 2. Bundle Analyzer (optionnel)

Le rapport `dist/stats.html` a été généré lors du build avec `rollup-plugin-visualizer`.

**Pour réactiver** (temporairement):
1. Ajouter dans `vite.config.ts`:
```ts
import { visualizer } from "rollup-plugin-visualizer";
// Dans plugins:
visualizer({ filename: "./dist/stats.html", open: false, gzipSize: true })
```
2. Rebuild: `npm run build`
3. Ouvrir `dist/stats.html` dans navigateur

### 3. Mesures Lighthouse

```bash
# En local (après build)
npm run preview

# Puis ouvrir Chrome DevTools > Lighthouse > Desktop
# Ou utiliser PageSpeed Insights: https://pagespeed.web.dev/
```

---

## ✅ E) CHECKLIST "READY TO IMPLEMENT"

### Prérequis
- [ ] Backup du code actuel (commit Git)
- [ ] Tester build actuel: `npm run build` (vérifier qu'il fonctionne)
- [ ] Mesurer métriques actuelles (Lighthouse baseline)

### P0 - Quick Wins (à faire en premier)
- [ ] **P0.1**: Images véhicules (redimensionnement + lazy-loading)
- [ ] **P0.2**: Code-splitting routes non-critiques
- [ ] **P0.3**: Dynamic imports composants lourds
- [ ] **P0.4**: CSS libs vers dynamic imports
- [ ] **P0.5**: Cache headers (serveur)

### P1 - Optimisations moyennes (après P0)
- [ ] **P1.1**: Tailwind content config
- [ ] **P1.2**: Audit Lucide-react icônes
- [ ] **P1.3**: date-fns locales dynamiques

### P2 - Optimisations avancées (à valider)
- [ ] **P2.1**: Manual chunks vendors
- [ ] **P2.2**: CSS scoping

### Tests post-implémentation
- [ ] Build fonctionne: `npm run build`
- [ ] Pas de régressions visuelles
- [ ] Lighthouse: Vérifier amélioration LCP, FCP, TTI
- [ ] Tester sur mobile (réseau lent)
- [ ] Vérifier cache headers (DevTools > Network)

---

## 📊 RÉSUMÉ EXÉCUTIF

### Problèmes principaux
1. **Bundle JS monolithique**: 2.97 MB (764 KB gzip) chargé en entier
2. **Images non optimisées**: Servies en taille originale, pas de lazy-loading
3. **CSS inutilisé**: ~165 KB sur 187 KB (selon Lighthouse)
4. **Composants lourds chargés globalement**: recharts, react-datepicker, etc.

### Gains estimés (P0 uniquement)
- **Bundle initial**: -40% à -60% (764 KB → 300-450 KB gzip)
- **LCP**: -1.5s à -2s
- **Bandwidth images**: -60% à -80%
- **Parse time**: -300-500ms

### Priorité recommandée
**Commencer par P0.1 (images)** → Impact immédiat sur LCP  
**Puis P0.2 (code-splitting)** → Réduction majeure bundle  
**Puis P0.3-P0.5** → Optimisations complémentaires

---

**Rapport généré le**: 2026-01-15  
**Fichier stats.html disponible**: `dist/stats.html` (1.2 MB, visualisation interactive)

