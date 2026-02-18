# Phase 1 — Diagnostic Images : Performance FCP/LCP Mobile

**Objectif** : Réduire ~5–6 MB via optimisations images pour améliorer FCP (~8.2s) et LCP (~9.5s).

---

## 1) Inventaire du projet

| Élément | Valeur |
|---------|--------|
| **Stack** | Vite 5.4 + React 18 + TypeScript |
| **Framework image** | Aucun (pas de next/image) — `<img>` natif + utilitaire custom |
| **Build** | `vite build` → `dist/` |
| **Hébergement** | Railway (SPA statique) |

### Sources d’images

| Source | Usage | Format typique |
|--------|-------|----------------|
| **Supabase Storage** | Photos véhicules, sinistre-caution, favicon, email-assets | JPG, PNG, WebP |
| **Unsplash** | Placeholder véhicules, avatars | JPG (avec params `?w=...`) |
| **`/public/`** | Logos (rentanoo, marques), placeholder.svg | SVG |
| **Lovable** | og:image, twitter:image | PNG |

### Types d’images par page

| Page | Hero / LCP | Logos | Cards / Thumbs | Background CSS | Galerie |
|------|------------|-------|----------------|---------------|---------|
| **Index (home)** | ❌ (gradient) | Navbar + Footer | VehicleCard × N (LCP) | — | — |
| **VehicleDetails** | Galerie principale | — | 6 thumbnails | — | Oui |
| **SinistreCaution** | `couple-serain-.webp` | — | 5 images sémantiques | — | — |
| **OwnerVehicles** | — | — | Cards véhicules | `backgroundImage` | — |
| **Owner / Profile** | — | — | Avatars, photos | — | Oui |

---

## 2) Audit des images utilisées

### Page Index (principale — LCP)

| Fichier / URL | Format | Poids estimé | Dimensions | Où utilisé | Above fold? | Candidat LCP? |
|---------------|--------|--------------|------------|------------|------------|---------------|
| Supabase `vehicle-photos/*.jpg` | JPG | **~500KB–2MB** (original) | Probablement 2000–4000px | VehicleCard | Oui (3 premières) | **Oui (image 0)** |
| `rentanoo-logo.svg` | SVG | ~2–5 KB | Scalable | Navbar | Oui | Non |
| `rentanoo-logo.svg` | SVG | ~2–5 KB | Scalable | Footer | Non | Non |
| Unsplash placeholder | JPG | ~50–150 KB | 800×600 | Fallback VehicleCard | Oui si pas de photo | Possible |

### Page VehicleDetails

| Fichier | Format | Dimensions | Candidat LCP? |
|---------|--------|------------|---------------|
| Galerie principale | JPG/PNG | 800–1200px demandé, original possible 4000px | **Oui** |
| Thumbnails × 6 | JPG | 150×150 demandé | Non (lazy) |

### Page SinistreCaution

| URL | Format | Above fold? | width/height? |
|-----|--------|--------------|---------------|
| `couple-serain-.webp` | WebP | **Oui (hero)** | ❌ Non |
| `timeline.webp` | WebP | Non | ❌ Non |
| `justificatif.webp` | WebP | Non | ❌ Non |
| `asurance .webp` | WebP | Non | ❌ Non |
| `devis facture.webp` | WebP | Non | ❌ Non |
| `relax.webp` | WebP | Non | ❌ Non |

### OwnerVehicles

| Usage | Type | Problème |
|-------|------|----------|
| `vehicle.imageUrl` | `background-image` | Pas de lazy, pas de srcset, chargement complet |

### Assets statiques

| Fichier | Source | Poids |
|---------|--------|-------|
| Favicon | Supabase `email-asset/R rentanoo favison .png` | ? |
| og:image | `lovable.dev/opengraph-image-p98pqg.png` | Externe |
| 26 marques | `/brands/*.svg` | Légers |

---

## 3) Problèmes identifiés

### A) Supabase : mauvais endpoint (critique)

L’utilitaire `imageOptimization.ts` ajoute des query params (`?width=400&height=300...`) à des URLs du type :

```
/storage/v1/object/public/vehicle-photos/...
```

Or Supabase Image Transformations utilise le path :

```
/storage/v1/render/image/public/vehicle-photos/...
```

Résultat : les query params sont ignorés, l’image originale complète (possiblement 2–4 MB) est servie.

### B) Images servies trop grandes

- Cards : affichage ~400×300px, possible chargement 2000×1500px ou plus.
- Galerie principale : 100vw mobile (~400px), possible chargement 1200px+.
- SinistreCaution : hero max-w-xl (~576px), images servies en pleine résolution.

### C) Pas de format moderne

- Pas de conversion WebP/AVIF (hors images déjà en WebP sur SinistreCaution).
- Supabase Image Transformations peut servir du WebP automatiquement si on passe par `render/image/public`.

### D) Lazy loading partiel

- VehicleCard : `loading=eager` pour index < 3, `lazy` au-delà — correct.
- SinistreCaution : hero `couple-serain` sans `loading` (donc eager) — OK pour LCP, mais manque `fetchpriority="high"`.
- Footer logo : `loading="lazy"` — correct.

### E) Layout instable

- Nombreux `<img>` sans `width`/`height` ni `aspect-ratio` (SinistreCaution, certaines galeries).
- CLS = 0 actuellement, mais risque de régression si images lentes.

### F) Background-image OwnerVehicles

- Pas de lazy, pas de dimensionnement, pas de srcset — image pleine résolution chargée pour chaque carte.

### G) Cache

- Supabase Storage : headers gérés par Supabase.
- Fichiers statiques `/public/` : dépend de Railway.
- Pas de stratégie explicite côté app (Cache-Control long pour immuables).

---

## 4) Plan d’action (ordre d’impact)

| Priorité | Action | Impact estimé | Fichiers |
|----------|--------|---------------|----------|
| **P0** | Corriger `imageOptimization.ts` : utiliser `render/image/public` | **–60 à 80 %** sur les images Supabase | `src/utils/imageOptimization.ts` |
| **P1** | Ajouter `fetchpriority="high"` sur LCP (VehicleCard index 0, VehicleDetails hero) | Amélioration LCP | `vehicle-card`, `moto-vehicle-card`, `VehicleDetails` |
| **P2** | Preload de l’image LCP sur Index | FCP/LCP plus rapides | `index.html` ou `Index.tsx` |
| **P3** | Remplacer `background-image` par `<img>` sur OwnerVehicles | Cohérence + lazy | `OwnerVehicles.tsx` |
| **P4** | SinistreCaution : srcset/sizes, width/height, lazy pour images non-hero | –30–50 % sur cette page | `SinistreCaution.tsx` |
| **P5** | Cache headers (Railway / CDN) | Répétitions de visites | Config serveur / CDN |
| **P6** | Script Sharp pour variantes build (si Supabase Pro indisponible) | Alternative si pas de transforms | `scripts/` |

---

## 5) Modifications de code

### 5.1) Correction `imageOptimization.ts` (P0)

Supabase Image Transformations nécessite le path `render/image/public` :

```ts
// Avant (ignoré par Supabase)
https://xxx.supabase.co/storage/v1/object/public/bucket/path.jpg?width=400

// Après (utilise les transformations)
https://xxx.supabase.co/storage/v1/render/image/public/bucket/path.jpg?width=400&height=300&resize=cover&quality=80
```

Fichier : `src/utils/imageOptimization.ts`

### 5.2) `fetchpriority="high"` (P1)

- VehicleCard : `fetchpriority={index === 0 ? "high" : undefined}`
- MotoVehicleCard : idem
- VehicleDetails : image principale garde `loading="eager"` + ajouter `fetchPriority="high"`

### 5.3) OwnerVehicles : `<img>` au lieu de `background-image` (P3)

Remplacer le bloc avec `backgroundImage` par une `<img>` optimisée avec lazy et srcset.

### 5.4) SinistreCaution : hero + autres images (P4)

- Hero : `fetchpriority="high"`, `width`/`height` ou `aspect-ratio`, pas de lazy.
- Autres : `loading="lazy"`, `decoding="async"`, `width`/`height`, srcset si Supabase.

---

## 6) Checklist de validation

- [ ] Lighthouse mobile : FCP < 2.5s, LCP < 4s
- [ ] DevTools Performance : LCP element = première image VehicleCard ou hero SinistreCaution
- [ ] Network : requêtes images avec `?width=` vers `render/image/public`
- [ ] View source : `AW-17959989720` présent (hors scope images)
- [ ] WebPageTest : waterfalls images sans téléchargements inutiles

---

## 7) Prérequis Supabase

Les Image Transformations sont disponibles sur **Pro Plan et au-dessus**. Si le projet est en Free :

- Vérifier le plan Supabase.
- Les URLs `render/image/public` peuvent renvoyer 404 si transformations non activées.
- Sinon : utiliser un CDN/proxy (Cloudflare Images, Imgix) ou un script build Sharp pour pré-générer des variantes.

---

## 8) Modifications appliquées (résumé)

| Fichier | Modification |
|---------|--------------|
| `src/utils/imageOptimization.ts` | Conversion `object/public` → `render/image/public` pour activer les transformations Supabase |
| `src/components/vehicles/vehicle-card.tsx` | `fetchPriority="high"` sur la première image (index 0) |
| `src/components/vehicles/moto-vehicle-card.tsx` | Idem |
| `src/pages/vehicles/VehicleDetails.tsx` | `fetchPriority="high"` sur l’image principale |
| `src/pages/owner/OwnerVehicles.tsx` | Remplacement `background-image` par `<img>` optimisé + lazy |
| `src/pages/sinistre-caution/SinistreCaution.tsx` | srcset, width/height, lazy, fetchpriority hero, getOptimizedImageUrl |
