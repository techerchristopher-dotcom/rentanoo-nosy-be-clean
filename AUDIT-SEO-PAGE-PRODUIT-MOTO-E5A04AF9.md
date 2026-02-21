# Audit SEO complet — Page produit moto
## URL : https://rentanoo.com/moto/E5A04AF9

**Date :** 20 février 2026  
**Scope :** Audit technique, sémantique, structurel, UX, maillage interne.

---

## 1️⃣ Analyse technique

### Status HTTP & indexabilité

| Vérification | Résultat | Preuve / Détail |
|--------------|----------|-----------------|
| **Status HTTP** | ⚠️ Non vérifiable (fetch retourne 200) | Requête GET retourne du contenu |
| **Meta robots** | ✅ Aucune restriction | Pas de `noindex` dans `Seo.tsx` ni `index.html` |
| **Canonical** | ✅ Présent | `buildVehicleCanonical(license, true)` → `https://rentanoo.com/moto/E5A04AF9` |
| **Sitemap.xml** | ❌ **Erreur critique** | L’URL `/moto/E5A04AF9` **n’est pas** dans `public/sitemap.xml` |

**Extrait `public/sitemap.xml` :**
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://rentanoo.com/</loc>...</url>
  <url><loc>https://rentanoo.com/legal</loc>...</url>
  <url><loc>https://rentanoo.com/contact</loc>...</url>
  <url><loc>https://rentanoo.com/rent-my-car</loc>...</url>
  <url><loc>https://rentanoo.com/sinistre-caution</loc>...</url>
</urlset>
```
→ **Aucune URL `/vehicle/*` ni `/moto/*`.**

### robots.txt

```
User-agent: *
Disallow:

Sitemap: https://rentanoo.com/sitemap.xml
```
✅ OK — Pas de blocage. Référence au sitemap.

### SPA & indexation JS

| Risque | État | Détail |
|--------|------|--------|
| **Contenu initial HTML** | ⚠️ Minimal | Le fetch retourne : `<title>Location scooter Nosy Be – Louer un scooter en ligne \| Rentanoo</title>` + "Chargement...". Le contenu réel (H1, description, prix) est injecté par React après chargement JS. |
| **Googlebot** | ⚠️ Exécute JS | Google indexe le JS ; le contenu final sera visible. Risque de délai ou d’indexation partielle pour d’autres crawlers. |
| **Pre-rendering / SSR** | ❌ Aucun | Vite SPA classique, pas de prerender ou SSR. |

### Performance & mobile

- **Core Web Vitals** : Non mesuré ici (nécessite Lighthouse / PageSpeed en conditions réelles).
- **Viewport** : `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` ✅
- **Structure responsive** : Tailwind `lg:grid`, `md:`, breakpoints utilisés ✅

---

## 2️⃣ Analyse des balises SEO

### Title (`vehicleSeo.ts` → `buildVehicleSeoTitle`)

**Format :** `{Brand} {Model} ({Year}) – Location scooter Nosy Be | Rentanoo`

**Exemple (E5A04AF9)** : Si données véhicule chargées → `Piaggio Liberty 2018 – Location scooter Nosy Be | Rentanoo`  
**Longueur estimée :** ~55–65 caractères → ✅ Plage idéale (50–60).

**Mots-clés :** "Location scooter Nosy Be" présent. ✅

### Meta description (`buildVehicleSeoDescription`)

**Format :** `Louez ce {brand} {model} à Nosy Be. À partir de {X}€/jour. Réservation en ligne, livraison possible à l'hôtel ou à l'aéroport. Rentanoo.`

**Longueur :** ~120–150 caractères selon modèle. ✅  
**Mots-clés :** Nosy Be, livraison hôtel/aéroport. ✅

### H1

**Code (MotoVehicleDetails.tsx L.695) :**
```tsx
<h1 className="text-3xl md:text-4xl font-bold mb-3">
  {vehicle.brand} {vehicle.model} {vehicle.year}
</h1>
```
→ **H1 unique** ✅ — Ex : "Piaggio Liberty 2018"  
→ **Pas de mention explicite "location scooter Nosy Be"** dans le H1 (uniquement dans le title). ⚠️

### H2 / H3

- H2 : `home.seoBlockTitle` sur la home, pas sur la page produit.
- Sections en `CardTitle` (Caractéristiques techniques, Évaluations, Assurance, Avantages, Informations précontractuelles) — **pas de balises H2/H3 explicites** dans les cards. ⚠️ Structure hiérarchique faible.

### Alt des images

| Image | Alt | Statut |
|-------|-----|--------|
| Photo principale | `{vehicle.brand} {vehicle.model}` | ✅ |
| Miniatures | `Vue {photo.angle}` | ⚠️ Générique ("Vue front", "Vue side") |
| Footer logo | `Rentanoo` | ✅ |

**Manque :** Alt plus descriptifs type "Scooter Piaggio Liberty — location Nosy Be, vue face".

### Balises strong / emphasis

- `font-bold` sur titre, prix, noms — usage cohérent.
- Pas de `<strong>` ou `<em>` sémantiques visibles pour mettre en avant des mots-clés.

---

## 3️⃣ Données structurées

### Schema.org Product + Offer

**Fichier :** `src/utils/vehicleSchema.ts` — `buildVehicleProductSchema`

**Contenu généré :**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{Brand} {Model} ({Year}) - Location à Nosy Be",
  "description": "...",
  "image": [...],
  "brand": { "@type": "Brand", "name": "..." },
  "sku": "E5A04AF9",
  "offers": {
    "@type": "Offer",
    "url": "https://rentanoo.com/moto/E5A04AF9",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/UsedCondition",
    "areaServed": { "@type": "Place", "name": "Nosy Be, Madagascar" },
    "price": 35,
    "priceCurrency": "EUR",
    "priceSpecification": { "unitText": "DAY", ... }
  }
}
```

| Élément | Présent | Remarque |
|---------|---------|----------|
| Product | ✅ | |
| Offer + price | ✅ | |
| availability | ✅ | InStock |
| areaServed | ✅ | Nosy Be, Madagascar |
| BreadcrumbList | ❌ | Absent |
| Review / AggregateRating | ❌ | Pas de schema Review (avis 5.0 affichés en UI mais non structurés) |

### Validation JSON-LD

- Structure conforme schema.org Product/Offer.  
- À valider avec [Google Rich Results Test](https://search.google.com/test/rich-results) et [Schema.org Validator](https://validator.schema.org/).

---

## 4️⃣ Analyse sémantique

### Mot-clé principal

**Cible :** "Location scooter Nosy Be" (et variantes : louer scooter, location moto, etc.)

### Présence des mots-clés

| Mot-clé | Title | Meta | H1 | Corps | Schema |
|---------|-------|------|-----|-------|--------|
| location scooter Nosy Be | ✅ | ❌ (générique) | ❌ | ❌* | ❌ |
| louer scooter Nosy Be | ❌ | ❌ | ❌ | ❌ | ❌ |
| location moto Nosy Be | ❌ | ❌ | ❌ | ❌ | ❌ |
| scooter aéroport Nosy Be | ❌ | ✅ (livraison aéroport) | ❌ | ❌ | ❌ |
| location deux roues Madagascar | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Corps = contenu chargé en JS (description véhicule, reviews, assurance). La description peut contenir des termes pertinents si remplie côté BDD.

### Longueur du contenu

- **Description véhicule** : `vehicle.description` — longueur variable (souvent courte).
- **Bloc SEO riche** : La page produit **n’a pas** de bloc texte type `home.seoBlock` (120–150 mots). ⚠️

### Intention commerciale

- Prix visible ✅  
- CTA "Réserver" ✅  
- Infos assurance, livraison, avis ✅  
- Pas de paragraphe orienté "louer / location Nosy Be" dédié aux mots-clés. ⚠️

---

## 5️⃣ UX & conversion

| Élément | Présent | Commentaire |
|---------|---------|------------|
| CTA Réserver | ✅ | Bouton fixe mobile + carte desktop |
| Assurance AXA | ✅ | Section dédiée |
| Livraison hôtel/aéroport | ✅ | Badge "Livraison gratuite à votre hôtel" |
| Casque | ⚠️ | Mentionné sur la home, pas explicite sur la page produit |
| Avis clients (5.0, 24 avis) | ✅ | Section Évaluations avec exemples |
| Prix mis en avant | ✅ | Carte sticky, affichage quotidien/total |
| Annulation gratuite | ✅ | Badge |
| Structure claire | ✅ | Cards repliables, sections logiques |
| Contenu au-dessus de la ligne de flottaison | ✅ | H1, prix, CTA visibles rapidement |

---

## 6️⃣ Maillage interne

| Type | État | Détail |
|------|------|--------|
| Lien accueil | ✅ | Bouton "Retour", Footer "Rechercher un véhicule" → `/` |
| Breadcrumb | ❌ | Pas de fil d’Ariane (ex : Accueil > Motos > Piaggio Liberty) |
| Liens catégories | ❌ | Pas de liens "Voir d’autres scooters", "Tous les modèles" |
| Blog | ❌ | Pas de section blog dans le projet |
| Footer | ✅ | Legal, Sinistre & caution, Contact, etc. |
| Liens sortants utiles | ⚠️ | Liens CGU/mentions légales ; pas de liens contextuels (ex. tourisme Nosy Be) |

---

## 7️⃣ Analyse concurrentielle (rapide)

- Recherche "location scooter Nosy Be" : Rentanoo peut apparaître selon indexation.
- **Problème majeur** : Pages véhicules absentes du sitemap → découverte limitée à l’exploration des liens depuis la home.
- **Profondeur** : La page produit a moins de contenu éditorial que la home (pas de bloc SEO dédié).
- **Structure** : Product schema + prix + CTA conformes aux attentes e-commerce.

---

## Synthèse

### Score SEO global : **58/100**

| Catégorie | Score | Poids |
|-----------|-------|-------|
| Technique | 45/100 | 25 % |
| Balises SEO | 70/100 | 20 % |
| Données structurées | 75/100 | 15 % |
| Sémantique | 50/100 | 20 % |
| UX & conversion | 80/100 | 10 % |
| Maillage interne | 45/100 | 10 % |

---

### Erreurs critiques

1. **Pages produit absentes du sitemap** — `/moto/E5A04AF9` et toutes les pages véhicule/moto ne sont pas listées. Impact fort sur la découverte par les moteurs.
2. **SPA sans pré-rendu** — Le HTML initial ne contient que "Chargement...". Tout le contenu utile dépend du JS (risque pour certains crawlers et délais d’indexation).
3. **Sitemap production 500** — Lors du test, `https://rentanoo.com/sitemap.xml` a renvoyé 500 (possible erreur temporaire ; cf. DIAG-SITEMAP-PRODUCTION).

---

### Optimisations prioritaires

1. **Sitemap dynamique** — Générer et inclure les URLs `/vehicle/:license` et `/moto/:license` dans le sitemap (build ou API).
2. **Bloc texte SEO** — Ajouter un paragraphe 100–150 mots avec "location scooter Nosy Be", "livraison aéroport", "louer scooter", etc., sous la section description ou dans une section dédiée.
3. **H1 enrichi** — Intégrer le mot-clé : ex. "Piaggio Liberty 2018 — Location scooter Nosy Be".
4. **Breadcrumb + schema BreadcrumbList** — Fil d’Ariane : Accueil > Motos > {Brand} {Model}.
5. **og:url** — Ajouter `<meta property="og:url" content={canonical} />` dans `Seo.tsx` pour un partage correct.
6. **Review schema** — Si les avis sont fiables, ajouter `AggregateRating` / `Review` en JSON-LD.

---

### Optimisations secondaires

1. Alt images plus descriptifs : "Scooter {brand} {model} — location Nosy Be, vue de face".
2. Liens "Autres scooters" / "Voir tous les modèles" vers la home ou une page liste.
3. Liens contextuels (ex. "Explorer Nosy Be", "Conseils circulation") si contenu disponible.
4. Pre-rendering ou SSR pour les pages produit (Nuxt/Next, ou Prerender.io) pour améliorer le HTML initial.

---

### Opportunités de croissance SEO

1. **Page catégorie** — "/motos" ou "/scooters-nosy-be" avec liste et texte thématique.
2. **Contenu éditorial** — Blog ou guides : "Comment louer un scooter à Nosy Be", "Sécurité à moto".
3. **FAQ schema** — Section FAQ sur la page produit + `FAQPage` en JSON-LD.
4. **LocalBusiness enrichi** — Coordonnées, horaires, avis globaux sur les pages produit (ou page À propos).
5. **Multilingue (hreflang)** — Si versions FR/EN/IT, balises `hreflang` pour éviter le contenu dupliqué.

---

## Extraits HTML / structure (données issues du code)

### HTML initial (fetch sans exécution JS)

```html
<title>Location scooter Nosy Be – Louer un scooter en ligne | Rentanoo</title>
...
Chargement...
```

→ Titre par défaut de l’index ; le titre dynamique est injecté après chargement du véhicule.

### Structure Hn (après rendu React)

```
h1: {brand} {model} {year}   (ex. Piaggio Liberty 2018)
— Pas de h2/h3 explicites sur les sections (CardTitle sans balise sémantique)
```

### Schema Product (exemple)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Piaggio Liberty 2018 - Location à Nosy Be",
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "price": 35,
    "priceCurrency": "EUR"
  }
}
```

---

## Checklist de validation post-correction

- [ ] Sitemap contient au moins une URL `/moto/*`
- [ ] Google Search Console : soumission sitemap, vérification indexation
- [ ] Rich Results Test : Product valide
- [ ] Mobile-Friendly Test : page conforme
- [ ] Lighthouse SEO : score > 90
- [ ] Inspection d’URL dans GSC : contenu visible pour Googlebot
