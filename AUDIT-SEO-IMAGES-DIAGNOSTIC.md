# Audit SEO technique — Images uniquement (diagnostic)

**Date :** 20 février 2026  
**Scope :** Pages publiques clés — aucune modification demandée  

---

## 1. Inventaire des images par page

### Home (/)
| Composant | Fichier | Ligne | Type | src / chemin | alt | Nom fichier/URL | Verdict |
|-----------|---------|-------|------|--------------|-----|-----------------|---------|
| **Navbar** | navbar.tsx | 142-147 | `<img>` | `/brand/rentanoo-logo.svg` | "Rentanoo" | OK, descriptif | OK |
| **Footer** | footer.tsx | 18-26 | `<img>` | `/brand/rentanoo-logo.svg` | "Rentanoo" | OK | OK |
| **VehicleCard** | vehicle-card.tsx | 188-200 | `<img>` | `primaryPhoto?.url \|\| PLACEHOLDER_URL` | `${vehicle.brand} ${vehicle.model}` | PLACEHOLDER générique (Unsplash) | À améliorer |
| **MotoVehicleCard** | moto-vehicle-card.tsx | 173-186 | `<img>` | `primaryPhoto?.url \|\| PLACEHOLDER_URL` | `${vehicle.brand} ${vehicle.model}` | PLACEHOLDER générique (Unsplash) | À améliorer |

**PLACEHOLDER_URL** (vehicle-card.tsx L.46-47, moto-vehicle-card.tsx L.39-40) :  
`https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop` — image générique voiture/route.

---

### /sinistre-caution
| Composant | Fichier | Ligne | Type | src / chemin | alt | Nom fichier/URL | Verdict |
|-----------|---------|-------|------|--------------|-----|-----------------|---------|
| SinistreCaution | SinistreCaution.tsx | 102-112 | `<img>` | Supabase: `couple-serain-.webp` | "Location Rentanoo — gestion sereine d'un sinistre" | Typo `serain` → serein ; tiret final inutile | Mauvais |
| SinistreCaution | SinistreCaution.tsx | 144-154 | `<img>` | Supabase: `timeline.webp` | "Étapes de gestion d'un sinistre Rentanoo" | Nom générique | À améliorer |
| SinistreCaution | SinistreCaution.tsx | 163-173 | `<img>` | Supabase: `justificatif.webp` | "La caution sert uniquement à couvrir les frais réellement justifiés" | OK | OK |
| SinistreCaution | SinistreCaution.tsx | 208-217 | `<img>` | Supabase: `asurance%20.webp` | "Protection par assurance carte bancaire Rentanoo" | **Espaces** (encodés %20) ; **typo** `asurance` → assurance | Mauvais |
| SinistreCaution | SinistreCaution.tsx | 227-236 | `<img>` | Supabase: `devis%20facture.webp` | "Documents de réparation – devis et facture mis à disposition par Rentanoo" | **Espaces** (encodés %20) | Mauvais |
| SinistreCaution | SinistreCaution.tsx | 280-290 | `<img>` | Supabase: `relax.webp` | "Client rassuré au téléphone avec le service Rentanoo" | Nom générique | À améliorer |

**Base Supabase** : `https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/sinistre%20caution%20page` — bucket avec espaces encodés.

---

### /legal
| Composant | Fichier | Type | Remarque |
|-----------|---------|------|----------|
| — | — | — | **Aucune image** sur la page Legal. Texte seul. |

---

### /rent-my-car
| Composant | Fichier | Ligne | Type | src / chemin | alt | Verdict |
|-----------|---------|-------|------|--------------|-----|---------|
| Navbar | navbar.tsx | 142 | `<img>` | `/brand/rentanoo-logo.svg` | "Rentanoo" | OK |
| Footer | footer.tsx | 18 | `<img>` | `/brand/rentanoo-logo.svg` | "Rentanoo" | OK |

**Pas d’image de contenu** sur la landing RentMyCarLanding — uniquement icônes Lucide (Car, Euro, Calendar, CheckCircle).

---

### /rent-my-car/register
| Composant | Fichier | Ligne | Type | src / chemin | alt | Nom fichier | Verdict |
|-----------|---------|-------|------|--------------|-----|--------------|---------|
| RentMyCarRegister | RentMyCarRegister.tsx | 38 | import | `@/assets/photo-av-gauche-placeholder.png` | — | Nom descriptif | **Import mort** : fichier non utilisé dans le JSX, `src/assets` vide dans le repo. |

---

### /contact
| Composant | Fichier | Ligne | Type | Remarque |
|-----------|---------|-------|------|----------|
| Navbar | navbar.tsx | 142 | `<img>` | Logo Rentanoo — OK |
| Footer | footer.tsx | 18 | `<img>` | Logo Rentanoo — OK |

**Aucune image de contenu** sur la page Contact.

---

### /vehicle/:license (template véhicule)
| Composant | Fichier | Ligne | Type | src / chemin | alt | Verdict |
|-----------|---------|-------|------|--------------|-----|---------|
| VehicleDetails | VehicleDetails.tsx | 921-939 | `<img>` principal | `currentPhoto?.url \|\| Unsplash fallback` | `${vehicle.brand} ${vehicle.model}` | OK |
| VehicleDetails | VehicleDetails.tsx | 968-991 | `<img>` thumbnails | `photo.url` (Supabase) | `Vue ${photo.angle}` | OK |
| VehicleDetails | VehicleDetails.tsx | 1244, 1269 | AvatarImage | Unsplash (avatars reviews) | — | Images décoratives, non SEO |
| vehicleTemplate | vehicleTemplate.ts | 329-334 | `backgroundImage` | `url(${imageUrl})` — utilisé indirectement | — | Utilisé pour cartes fond flouté (AddVehicle, etc.) — pas sur page publique détail. |

**Fallback Unsplash** : `https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop`

---

### /moto/:license (template moto)
| Composant | Fichier | Ligne | Type | src / chemin | alt | Verdict |
|-----------|---------|-------|------|--------------|-----|---------|
| MotoVehicleDetails | MotoVehicleDetails.tsx | 851-859 | `<img>` principal | `photos[selectedPhotoIndex]?.url \|\| primaryPhoto?.url \|\| Unsplash` | `${vehicle.brand} ${vehicle.model}` | OK |
| MotoVehicleDetails | MotoVehicleDetails.tsx | 896-900 | `<img>` thumbnails | `photo.url` | `Vue ${photo.angle}` | OK (pas de srcSet/optimisation) |
| MotoVehicleDetails | MotoVehicleDetails.tsx | 1146, 1174 | AvatarImage | Unsplash | — | Décoratif |

**Note** : MotoVehicleDetails n’utilise pas `getOptimizedImageUrl` / `generateSrcSet` sur l’image principale ni les thumbnails (contrairement à VehicleDetails) — **à améliorer côté perf**, pas SEO alt.

---

## 2. Catégorisation

### A) Images statiques (repo : public/ ou imports)
| src / chemin | Page(s) | alt | Verdict |
|--------------|---------|-----|---------|
| `/brand/rentanoo-logo.svg` | Navbar, Footer (toutes) | "Rentanoo" | OK |
| `@/assets/photo-av-gauche-placeholder.png` | RentMyCarRegister (import mort) | — | **Fichier absent** ou non utilisé |
| `public/placeholder.svg` | — | — | Non référencé dans le code audité |
| `public/brands/*.svg` | — | — | Non référencés dans les pages auditées |

### B) Images dynamiques externes (Supabase / Unsplash)
| Source | Usage | Verdict |
|-------|-------|---------|
| Supabase `sinistre%20caution%20page` | 6 images SinistreCaution | Problèmes noms (espaces, typos) |
| Supabase `vehicle-photos` | VehicleCard, MotoVehicleCard, VehicleDetails, MotoVehicleDetails | OK si URLs propres |
| Unsplash fallback | VehicleCard, MotoVehicleCard, VehicleDetails, MotoVehicleDetails | Générique mais fonctionnel |
| Unsplash avatars | VehicleDetails, MotoVehicleDetails (avis) | Décoratif |

---

## 3. Problèmes critiques

| Problème | Emplacement | Gravité |
|----------|-------------|---------|
| Espaces dans noms de fichiers Supabase | `asurance%20.webp`, `devis%20facture.webp`, bucket `sinistre%20caution%20page` | Critique |
| Typo dans nom fichier | `asurance` → `assurance` | Critique |
| Typo + tiret inutile | `couple-serain-.webp` → `couple-serein.webp` | Moyen |
| ALT manquant | OwnerVehicles.tsx L.392 : `alt=""` sur images véhicules | Moyen (page propriétaire) |
| OG image générique Lovable | index.html L.19, 22 ; Seo.tsx L.6 : `lovable.dev/opengraph-image-p98pqg.png` | Critique |
| Favicon avec typo URL | index.html L.14 : `R%20rentanoo%20favison%20.png` (typo `favison` → favicon) | Moyen |
| Import mort / fichier absent | `photo-av-gauche-placeholder.png` (RentMyCarRegister) | Moyen |

---

## 4. Renommages recommandés (images statiques / Supabase)

### Supabase — bucket `sinistre caution page`
| Ancien nom | Nouveau nom recommandé |
|------------|-------------------------|
| `couple-serain-.webp` | `couple-serein.webp` |
| `asurance%20.webp` (ou `asurance .webp`) | `assurance.webp` |
| `devis%20facture.webp` (ou `devis facture.webp`) | `devis-facture.webp` |
| `timeline.webp` | `sinistre-timeline-etapes.webp` (optionnel) |
| `relax.webp` | `client-rassure-telephone.webp` (optionnel) |

### Bucket
| Ancien | Nouveau |
|--------|---------|
| `sinistre%20caution%20page` | `sinistre-caution-page` |

---

## 5. Composants à modifier après renommage

| Composant | Fichier | Lignes | Modifications |
|----------|---------|--------|---------------|
| SinistreCaution | SinistreCaution.tsx | 18-19, 103-104, 145-146, 164-165, 209-210, 227-229, 281-282 | Mettre à jour `SUPABASE_BASE` et chemins des 6 images |
| index.html | index.html | 14 | Corriger favicon : `favison` → `favicon`, supprimer espaces |
| Seo.tsx | Seo.tsx | 6 | Remplacer `DEFAULT_OG_IMAGE` par une OG image Rentanoo (ex. Supabase ou public/) |
| index.html | index.html | 19, 22 | Remplacer og:image et twitter:image par URL Rentanoo |

---

## 6. Score Images SEO

| Critère | Note | Commentaire |
|---------|------|-------------|
| ALT présents et pertinents | 8/10 | Alt corrects sur la plupart des images. OwnerVehicles avec `alt=""`. |
| Noms de fichiers propres | 4/10 | Espaces, typos, noms génériques sur Supabase Sinistre. |
| Pas d’images cassées | 7/10 | Import `photo-av-gauche-placeholder` potentiellement cassé. |
| OG / Social | 3/10 | OG Lovable, favicon avec typo. |
| Format (WebP, optim) | 8/10 | WebP sur Sinistre, srcSet sur VehicleDetails/Sinistre. |
| **Score global Images SEO** | **6/10** | Problèmes sur Sinistre + OG/Favicon à corriger en priorité. |

---

## 7. Synthèse exécutive

- **Points positifs** : Alt globalement bien renseignés sur les images de contenu ; usage de WebP et srcSet sur Sinistre et VehicleDetails ; logos statiques OK.
- **Actions prioritaires** :
  1. Corriger les noms de fichiers Supabase (espaces, typos).
  2. Remplacer l’OG image Lovable par une image Rentanoo.
  3. Corriger le favicon (typo + espaces).
  4. Supprimer l’import mort `photo-av-gauche-placeholder.png` ou ajouter le fichier et l’utiliser si pertinent.

---

*Document généré dans le cadre d’un audit SEO technique — aucune modification du code.*
