# DIAG ÉTAPE 5 — SEO avancé (Schema.org + Sitemap + Robots)

**Date :** 20 février 2026  
**Projet :** Rentanoo — Location scooter Nosy Be  
**Objectif :** Analyser l'état actuel sur données structurées, sitemap, robots.txt et potentiel Product/Offer.  
**⚠️ Aucune modification effectuée — rapport diagnostique uniquement.**

---

## 1️⃣ DONNÉES STRUCTURÉES (Schema.org)

### A) Recherche dans le projet

| Chaîne recherchée      | Résultat |
|------------------------|----------|
| `application/ld+json`  | **0 occurrence** |
| `@context`             | **0 occurrence** (en dehors de JSON génériques) |
| `schema.org`           | **0 occurrence** |

**Fichiers parcourus :** `src/`, `index.html`, `public/`, `dist/` (après build)

### État actuel

| Question | Réponse |
|----------|---------|
| **JSON-LD existant ?** | **Non** |
| **Pages avec Schema.org ?** | **Aucune** |
| **Type de schema (@type) ?** | N/A |
| **Contenu structuré ?** | Aucun |

### B) Composant Seo.tsx

**Fichier :** `src/components/seo/Seo.tsx`

**Fonctionnalités actuelles :**
- `react-helmet-async` pour injecter les meta
- Props : `title`, `description`, `canonical`, `ogImage`
- Meta gérés : `title`, `meta description`, `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `link rel="canonical"`
- **Structured data (JSON-LD) :** **Non géré**

---

## 2️⃣ SITEMAP

### A) Fichiers et génération

| Élément | État |
|---------|------|
| **`public/sitemap.xml`** | ✅ Existe (fichier statique) |
| **Génération dynamique côté serveur** | ❌ Absente |
| **Package de génération (vite-plugin-sitemap, etc.)** | ❌ Aucun dans `package.json` |

### B) Contenu du sitemap

**Fichier :** `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://rentanoo.com/</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://rentanoo.com/legal</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://rentanoo.com/contact</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://rentanoo.com/rent-my-car</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### URLs présentes vs absentes

| Page | Dans sitemap ? |
|------|----------------|
| `/` (Home) | ✅ |
| `/legal` | ✅ |
| `/contact` | ✅ |
| `/rent-my-car` | ✅ |
| `/sinistre-caution` | ❌ **Absente** |
| `/vehicle/:license` | ❌ **Absente** |
| `/moto/:license` | ❌ **Absente** |
| `/auth/login`, `/auth/register` | ❌ (intentionnel — pages auth) |

### Attributs

| Attribut | Présent |
|----------|---------|
| `loc` | ✅ |
| `lastmod` | ✅ |
| `changefreq` | ✅ |
| `priority` | ✅ |

### C) Production

- **robots.txt** : référence `Sitemap: https://rentanoo.com/sitemap.xml` ✅
- **Contrôle en prod** : `https://rentanoo.com/sitemap.xml` a renvoyé 500 lors du test (erreur temporaire possible) — le fichier est servi par `express.static(distPath)` depuis `dist/sitemap.xml` (copié depuis `public/` par Vite)
- **Cache-Control** : `max-age=86400` (24 h) pour `sitemap.xml` dans `server/index.ts`

---

## 3️⃣ ROBOTS.TXT

### A) Existence

**Fichier :** `public/robots.txt` ✅

### B) Contenu

```
User-agent: *
Disallow:

Sitemap: https://rentanoo.com/sitemap.xml
```

- `Disallow:` vide → tout autorisé
- Référence au sitemap présente

### C) Production

- Accessible en prod (`https://rentanoo.com/robots.txt` — 200)
- Servi par `express.static` depuis `dist/`
- Cache-Control : `max-age=86400`

---

## 4️⃣ PAGES VÉHICULE — POTENTIEL PRODUCT / OFFER

### A) Composants analysés

- `src/pages/vehicles/VehicleDetails.tsx` (voitures)
- `src/pages/vehicles/MotoVehicleDetails.tsx` (motos/scooters)

### B) Données disponibles (Supabase / mappers)

| Champ | Source | Type | Utilisable pour Schema.org |
|-------|--------|------|----------------------------|
| **brand** | `vehicle.brand` | string | ✅ Product.brand / name |
| **model** | `vehicle.model` | string | ✅ Product.name |
| **year** | `vehicle.year` | number | ✅ Product.additionalProperty |
| **price_per_day** | `vehicle.price_per_day` / `vehicle.dailyPrice` | number | ✅ Offer.price |
| **location** | `vehicle.pickup_zones` ou fallback | string | ✅ Offer.areaServed |
| **available** | `vehicle.available` | boolean | ✅ Offer.availability |
| **description** | `vehicle.description` | string | ✅ Product.description |
| **primaryPhotoUrl** | `vehicle.primaryPhotoUrl` | string | ✅ Product.image |
| **license** | `vehicle.id.substring(0,8)` ou `vehicle.license` | string | ✅ Product.sku / identifier pour URL |

### C) Prix affichés

- **Oui** — prix par jour affiché dans une `PricingCard`
- `dailyRate` = `vehicle.dailyPrice` ou `vehicle.price_per_day`
- Prix base visible même sans dates de location

### D) URLs des véhicules

| Aspect | Valeur |
|--------|--------|
| **Format** | `/vehicle/:license` ou `/moto/:license` |
| **license** | 8 premiers caractères de l’ID en majuscules (ex. `vehicle.id.substring(0, 8).toUpperCase()`) |
| **Stabilité** | Stable tant que l’ID du véhicule ne change pas |
| **SEO** | URL lisible mais non sémantique (pas de slug type `scooter-honda-2024`) |
| **Canonical** | Géré via `buildVehicleCanonical(license, isMoto)` → `https://rentanoo.com/vehicle/ABC12345` |

### E) Potentiel Schema Product / Offer

| Question | Réponse |
|----------|---------|
| **Données suffisantes ?** | **Oui** — brand, model, price, location, availability, image, description |
| **Implémentation possible ?** | Oui, via composant Seo ou Helmet avec `<script type="application/ld+json">` |
| **Type recommandé** | `Product` + `Offer` imbriqué (schema.org/Product, schema.org/Offer) |
| **Exemple de champs** | `name`, `description`, `image`, `brand`, `offers.price`, `offers.availability`, `offers.url` |

---

## 5️⃣ SYNTHÈSE ET RECOMMANDATIONS

### État actuel

| Composant | État |
|-----------|------|
| **Données structurées (JSON-LD)** | ❌ Absent |
| **Sitemap** | ✅ Statique, 4 URLs, incomplet |
| **robots.txt** | ✅ Correct, référence sitemap |
| **Product/Offer sur véhicules** | ❌ Non implémenté (données disponibles) |

### Manques identifiés

1. **Schema.org**  
   - Aucun JSON-LD (LocalBusiness, Organization, Product, etc.)
2. **Sitemap**  
   - Manque : `/sinistre-caution`, pages véhicules (`/vehicle/*`, `/moto/*`)
3. **Product/Offer**  
   - Pas de schema sur les pages véhicules malgré données disponibles

### Complexité estimée

| Tâche | Complexité |
|-------|-------------|
| LocalBusiness / Organization (Home) | **Faible** — JSON statique dans Seo ou index.html |
| Product/Offer (véhicules) | **Faible** — Données déjà en place, JSON-LD à injecter dans Seo ou composant dédié |
| Sitemap statique enrichi | **Faible** — Ajout manuel de `/sinistre-caution` |
| Sitemap dynamique (véhicules) | **Moyenne** — Route API ou script build pour lister véhicules et générer le XML |

### Priorité recommandée

| Élément | Priorité | Justification |
|---------|----------|---------------|
| Sitemap : ajouter `/sinistre-caution` | **Utile** | Page importante, déjà mentionnée comme manquante dans l’audit |
| LocalBusiness / Organization (Home) | **Utile** | Renforce l’autorité et le contexte local (Nosy Be) |
| Product/Offer (véhicules) | **Utile** | Potentiel pour rich snippets prix / produits |
| Sitemap dynamique (véhicules) | **Optionnel** | Beaucoup de véhicules → sitemap index possible ; Google indexe déjà via liens internes |
| Schema FAQ (sinistre-caution) | **Optionnel** | Amélioration possible de l’affichage en SERP |

### Ordre d’implémentation proposé

1. **Sitemap** — Ajouter `/sinistre-caution` (modification manuelle de `public/sitemap.xml`)
2. **LocalBusiness** — Ajouter JSON-LD sur la Home (Seo ou index.html)
3. **Product/Offer** — JSON-LD dans VehicleDetails et MotoVehicleDetails (ou composant partagé)
4. **Sitemap dynamique** — Route API ou script build pour générer les URLs véhicules (si besoin)

---

## Annexes

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/components/seo/Seo.tsx` | Meta SEO (title, description, canonical, og) |
| `src/utils/vehicleSeo.ts` | Helpers title/description/canonical véhicules |
| `public/sitemap.xml` | Sitemap statique |
| `public/robots.txt` | Robots |
| `server/index.ts` | Cache-Control robots/sitemap, express.static |

### Références Schema.org

- [Product](https://schema.org/Product)
- [Offer](https://schema.org/Offer)
- [LocalBusiness](https://schema.org/LocalBusiness)
