# DIAGNOSTIC — Création page catégorie SEO

**Date** : 2025-02-20  
**Objectif** : Analyse technique pour créer des pages SEO dédiées `/location-scooter-nosy-be` et `/location-quad-nosy-be`.  
**⚠️ AUCUNE implémentation — Analyse uniquement.**

---

## 1️⃣ Page d'accueil (Index.tsx)

### Récupération des véhicules

| Méthode | Appel | Filtres supportés |
|---------|-------|-------------------|
| Chargement initial | `SupabaseVehiclesService.getAvailableVehicles()` | Aucun (tous les véhicules disponibles) |
| Recherche manuelle | `SupabaseVehiclesService.searchAvailableVehicles(searchFilters)` | `location`, `startDate`, `endDate` |
| Filtrage client | `useEffect` sur `vehicles` + états | `selectedFuelTypes`, `selectedTransmissions`, `selectedCategories` |

- **getAvailableVehicles** accepte optionnellement : `vehicleCategories`, `fuel_type`, `transmission`.  
- **vehicle_type (car/moto/scooter)** n'est **pas** supporté actuellement.

### Filtrage actuel

| Filtre | Source | Champ DB |
|--------|--------|----------|
| Carburant | `selectedFuelTypes` | `fuel_type` |
| Transmission | `selectedTransmissions` | `transmission` |
| Catégorie | `selectedCategories` | `vehicle_category` (Berline, Citadine, SUV, etc. — types carrosserie voiture) |

- `vehicle_category` = types voiture (Citadine, Berline, SUV…).  
- `vehicle_type` = `car` \| `moto` \| `scooter` (non exposé dans les filtres Index).

### Filtrage scooter / quad

| Catégorie | Critère |
|-----------|---------|
| **Scooter** | `vehicle_type === 'scooter'` |
| **Quad** | `vehicle_type === 'moto'` **ET** `model` contient maxxer/quad/atv (logique `isQuadByModel` dans vehicleSeo.ts) |

- `getAvailableVehicles` ne filtre pas par `vehicle_type` → à ajouter ou à faire en client.
- Quad = détection par `model` (pas de colonne dédiée en DB).

### Composant listing réutilisable

- **HomeResults** : reçoit `filteredVehicles`, `loading`, filtres (carburant, transmission, catégorie), `rentalCalculation`, `getVehicleRentalInfo`, `onVehicleClick`.
- Réutilisable si on lui passe une liste déjà filtrée.
- Affiche soit `MotoVehicleCard` soit `VehicleCard` selon `isMoto(vehicle)`.
- Filtres intégrés : carburant, transmission, catégorie (voiture) — à adapter ou masquer pour les pages scooter/quad.

### Conclusion 1

- Filtrage scooter : simple (DB) — `vehicle_type === 'scooter'`.
- Filtrage quad : client ou service — `vehicle_type === 'moto'` + `isQuadByModel(model)`.
- HomeResults réutilisable avec préfiltrage et éventuellement filtres masqués ou simplifiés.

---

## 2️⃣ Router principal (App.tsx)

### Routes

- Routes dans `App.tsx`, sous `BrowserRouter` + `Routes`.
- Layout commun : `Navbar` fixe, `LanguageSwitcher` flottant. Pas de layout wrapper par page.
- Home : `<Route path="/" element={<Index />} />` (import direct).
- Autres pages : lazy avec `Suspense` + `PageLoader`.

### Ajout d'une route SEO

1. Importer le composant (lazy ou direct).
2. Ajouter une `Route` :

```tsx
<Route path="/location-scooter-nosy-be" element={<Suspense><LocationScooterPage /></Suspense>} />
<Route path="/location-quad-nosy-be" element={<Suspense><LocationQuadPage /></Suspense>} />
```

- Ordre : avant la route catch-all `*`.
- Même pattern que les pages existantes.

### Conclusion 2

- Ajout de nouvelles routes simple.
- Pas de layout commun dédié : chaque page construit sa structure (comme Index).

---

## 3️⃣ Seo.tsx

### Capacités actuelles

| Élément | Support |
|---------|---------|
| Title | ✅ `title` |
| Meta description | ✅ `description` |
| Canonical | ✅ `canonical` |
| OG / Twitter | ✅ `ogImage` + métadonnées dérivées |
| JSON-LD (1) | ✅ `structuredData` |
| JSON-LD (2) | ✅ `extraStructuredData` |

### Page catégorie statique

- Oui, adapté à une page catégorie statique.
- Exemple :

```tsx
<Seo
  title="Location scooter Nosy Be – Louer un scooter | Rentanoo"
  description="..."
  canonical="https://rentanoo.com/location-scooter-nosy-be"
  structuredData={itemListSchema}
  extraStructuredData={collectionPageSchema}  // optionnel
/>
```

### JSON-LD pour catégorie

- **ItemList** : liste des véhicules (URL, name, image…).
- **CollectionPage** : page dédiée à une collection.
- Les deux possibles via `structuredData` et `extraStructuredData`.

### Conclusion 3

- Aucune modification de Seo.tsx requise pour les pages catégorie.

---

## 4️⃣ Sitemap

### Génération actuelle

- Script : `scripts/generate-sitemap.js`.
- `STATIC_URLS` : `/`, `/legal`, `/contact`, `/rent-my-car`, `/sinistre-caution`.
- URLs dynamiques : véhicules depuis Supabase → `/moto/{license}` ou `/vehicle/{license}`.

### Ajout des pages catégorie

- Ajouter les URLs dans `STATIC_URLS` :

```js
{ loc: "/location-scooter-nosy-be", changefreq: "weekly", priority: "0.9" },
{ loc: "/location-quad-nosy-be", changefreq: "weekly", priority: "0.9" },
```

- Pas de logique dynamique nécessaire : URLs fixes.

### Conclusion 4

- Modification localisée dans `scripts/generate-sitemap.js`.
- Intégration au build via `prebuild` (déjà en place).

---

## 5️⃣ Impact UX et architecture

### Contenu attendu par page catégorie

| Élément | Index actuel | Page catégorie |
|--------|--------------|----------------|
| H1 | Hero générique | H1 ciblé (ex. "Location scooter à Nosy Be") |
| Bloc texte SEO | ~120–150 mots (`home.seoBlock`) | 400–600 mots |
| Liste véhicules | HomeResults | HomeResults (liste préfiltrée) |
| FAQ | Non | Possible (schema FAQPage) |
| SearchBar | Oui | Optionnel (recommandé pour cohérence UX) |

### Architecture actuelle

- Index : Hero (H1 + SearchBar) → bloc SEO → HomeResults (filtres + grille).
- Pas de composant « bloc SEO » réutilisable : texte dans `Index.tsx` + i18n.
- HomeResults : layout + filtres + grille. Réutilisable en changeant les données passées.

### Réutilisation possible

| Composant | Réutilisation |
|-----------|---------------|
| HomeResults | Oui — passer `filteredVehicles` préfiltrés |
| SearchBarAirbnb | Oui — optionnel |
| Bloc SEO | Non — à créer (nouveau composant ou section dédiée) |
| Filtres HomeResults | À adapter ou masquer pour scooter/quad |

### Évolution nécessaire

1. **Nouvelles pages** : `LocationScooterPage`, `LocationQuadPage` (ou une page générique avec paramètre).
2. **Nouveaux textes i18n** : ex. `categoryPages.scooter.h1`, `categoryPages.scooter.seoBlock`, `categoryPages.quad.*`.
3. **Logique de filtrage** : soit extension de `getAvailableVehicles` (ex. filtre `vehicle_type`), soit fetch global + filtre client (comme Index pour les catégories).
4. **Bloc texte 400–600 mots** : nouvelles clés i18n, section dédiée dans la page.

### Conclusion 5

- Architecture compatible avec des pages catégorie sans refonte majeure.
- Réutilisation de HomeResults et structure proche d’Index.
- Principal travail : nouvelles pages + contenu i18n + logique de filtrage.

---

## 6️⃣ Output synthétique

### Fichiers impactés

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | 2 nouvelles routes |
| `src/pages/category/LocationScooterPage.tsx` | **À créer** |
| `src/pages/category/LocationQuadPage.tsx` | **À créer** (ou page générique) |
| `src/services/supabaseVehiclesService.ts` | Optionnel : filtre `vehicle_type` dans `getAvailableVehicles` |
| `src/i18n/locales/*/common.json` | Nouvelles clés (H1, meta, bloc SEO 400–600 mots) |
| `scripts/generate-sitemap.js` | 2 entrées dans `STATIC_URLS` |
| `src/components/home/HomeResults.tsx` | Optionnel : prop pour masquer/limiter les filtres |

### Méthode recommandée

**Création de pages dédiées** (une par catégorie) plutôt que réutilisation d’Index avec filtre par URL :

| Critère | Nouvelle page | Index + filtre URL |
|---------|---------------|--------------------|
| SEO (URL, canonical, contenu) | URL dédiée claire | URL type `/?type=scooter` peu lisible |
| Contenu (H1, texte) | Contenu spécifique par type | Logique conditionnelle dans Index |
| Maintenance | Séparation claire | Index plus complexe |
| Réutilisabilité | HomeResults partagé | Même |

Recommandation : **nouvelles pages catégorie** avec réutilisation de HomeResults et structure proche d’Index.

### Points techniques à modifier

1. **Extension `getAvailableVehicles`** (optionnel) :
   - Ajouter `vehicleTypes?: ('car' | 'moto' | 'scooter')[]`.
   - Filtre quad : garder côté client (`vehicle_type === 'moto'` + `isQuadByModel(model)`).

2. **Fonction utilitaire quad** :
   - Exporter ou réutiliser `isQuadByModel` (ou équivalent) pour le filtrage liste.

3. **HomeResults** :
   - Prop `hideFilters` ou `filterMode="minimal"` pour masquer les filtres voiture.

4. **Breadcrumb** :
   - Mise à jour des breadcrumbs des pages produit pour pointer vers ces pages catégorie au lieu de `/`.

### Risques

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Duplication de code | Faible | Page générique ou composant partagé |
| Incohérence filtrage scooter/quad | Moyen | Centraliser la logique (ex. `vehicleSeo` ou service) |
| Contenu i18n lourd (400–600 mots) | Faible | Clés dédiées par langue |
| Page vide si aucun véhicule | Faible | Gérer le cas "0 résultat" avec message adapté |

### Complexité estimée

| Composant | Complexité |
|-----------|------------|
| Routes + structure page | **Faible** |
| Filtrage véhicules (scooter/quad) | **Faible** |
| Intégration HomeResults | **Faible** |
| Contenu SEO (texte 400–600 mots × 2 pages × 4 langues) | **Moyenne** |
| Sitemap | **Faible** |
| JSON-LD ItemList / CollectionPage | **Faible** |
| FAQ (si ajoutée) | **Moyenne** |

**Ensemble : complexité moyenne.**

---

*Document généré dans le cadre du diagnostic pré-implémentation — aucune modification du code.*
