# DIAGNOSTIC — Breadcrumb dynamique SEO

**Date** : 2025-02-20  
**Objectif** : Analyse technique avant implémentation d’un breadcrumb visuel + schema.org BreadcrumbList dynamique sur les pages produit.  
**⚠️ AUCUNE implémentation — Analyse uniquement.**

---

## 1️⃣ Injection SEO actuelle

### Composant `Seo.tsx`
- **Emplacement** : `src/components/seo/Seo.tsx`
- **Dépendance** : `react-helmet-async` (Helmet)
- **Props** : `title`, `description`, `canonical`, `ogImage`, `structuredData`

### Mode d’injection

| Élément            | Injection                                                       |
|--------------------|-----------------------------------------------------------------|
| **title**          | `<title>{effectiveTitle}</title>`                               |
| **meta description** | `<meta name="description" content={...} />`                   |
| **canonical**      | `<link rel="canonical" href={canonical} />` (si fourni)        |
| **og/twitter**     | `og:title`, `og:description`, `og:image`, `twitter:card`, etc. |
| **JSON-LD**        | Un seul `<script type="application/ld+json">` avec `JSON.stringify(structuredData)` |

### Gestion de plusieurs JSON-LD

- **Actuellement** : `structuredData` est un objet unique.
- **Limitation** : Un seul script JSON-LD par page.
- **Solutions possibles** :
  1. **Prop `extraSchema`** : ajouter une seconde prop et rendre un 2ᵉ script si fournie.
  2. **Prop `structuredData`** acceptant `object | object[]` : un seul script avec tableau → valide en JSON-LD.
  3. **Utiliser `@graph`** : un objet `{ "@context": "...", "@graph": [Product, BreadcrumbList] }`.

**Conclusion** : L’architecture permet d’ajouter un BreadcrumbList sans conflit. Recommandation : ajouter une prop `extraStructuredData?: object` ou accepter `structuredData` en tableau.

---

## 2️⃣ Pages concernées

### `MotoVehicleDetails.tsx` (`/moto/:license`)

| Donnée            | Source                    | Disponibilité       |
|-------------------|---------------------------|---------------------|
| **brand**         | `vehicle.brand`           | ✅                  |
| **model**         | `vehicle.model`           | ✅                  |
| **engineCapacity**| `vehicle.engineCapacity`  | ✅ (mapper)         |
| **vehicleType**   | `vehicle.vehicleType`     | ✅ (mapper → moto/scooter) |
| **license**       | `vehicle.license` ou `useParams().license` | ✅ |

- **H1** : Lignes 711–718, via `buildVehicleH1Title({ brand, model, engineCapacity, vehicleType })`
- **getVehicleTypeLabel** : Importé depuis `vehicleSeo.ts` ✅
- **Logique quad** : Contenu dans `vehicleSeo.ts` (`isQuadByModel` → maxxer/quad/atv)
- **Mapper** : `mapToMotoVehicle` dans `vehicleMappers.ts` fournit `engineCapacity`, `vehicleType`

### `VehicleDetails.tsx` (`/vehicle/:license`)

| Donnée            | Source                    | Disponibilité       |
|-------------------|---------------------------|---------------------|
| **brand**         | `vehicle.brand`           | ✅                  |
| **model**         | `vehicle.model`           | ✅                  |
| **engineCapacity**| `vehicle.engineCapacity`  | ✅ (mapping inline) |
| **vehicleType**   | `vehicle.vehicleType`     | ✅ (mapping inline → car) |

- **H1** : Lignes 810–817, via `buildVehicleH1Title({ brand, model, engineCapacity, vehicleType })`
- **getVehicleTypeLabel** : Importé ✅ — retourne `voiture` pour les voitures
- **Mapping** : Inline (pas `mapToCarVehicle`) ; `engineCapacity`, `vehicleType` déjà présents

**Conclusion** : Toutes les données nécessaires existent pour construire un breadcrumb dynamique basé sur le type réel (quad/scooter/moto/voiture).

---

## 3️⃣ Schema Product actuel

### `vehicleSchema.ts`
- **Fonction** : `buildVehicleProductSchema(input)`
- **Type** : `Product` + `Offer`
- **Utilisation** : `MotoVehicleDetails` et `VehicleDetails` passent `structuredData={buildVehicleProductSchema(...)}` à `<Seo />`

### Architecture pour BreadcrumbList
- Product et BreadcrumbList peuvent coexister :
  - Deux scripts distincts dans le `<head>`, ou
  - Un script unique avec `@graph` / tableau
- Aucun conflit attendu entre Product et BreadcrumbList.

### Prop `extraSchema` dans `Seo`
- **Actuellement** : non supportée.
- **Modification nécessaire** : ajouter `extraStructuredData?: object` (ou équivalent) et rendre un second script si fourni.

---

## 4️⃣ Routes

### Routes produit

| Route                 | Composant         | Paramètre |
|-----------------------|-------------------|-----------|
| `/moto/:license`      | MotoVehicleDetails| `license` |
| `/vehicle/:license`   | VehicleDetails    | `license` |

### Détermination moto vs voiture
- `Index.tsx` : `isMoto(vehicle)` → `/moto/` ou `/vehicle/`
- Pas de route intermédiaire par type (ex. `/motos`, `/scooters`).

---

## 5️⃣ Pages catégorie SEO

### Recherche dans le projet
- Aucune route `/motos`, `/scooters`, `/voitures`, `/quads`
- La page d’accueil (`Index.tsx`) affiche la liste mixte avec filtres (carburant, transmission, catégorie véhicule)
- Pas de page liste SEO dédiée par type

### Conclusion
Les breadcrumbs ne peuvent pas pointer vers une page catégorie dédiée. Il faut utiliser une option de type « Accueil > Libellé optimisé > Nom du véhicule ».

---

## 6️⃣ Structure breadcrumb recommandée

### OPTION A — Page catégorie
❌ **Non applicable** : pas de page catégorie actuelle.

### OPTION B — Libellé optimisé (recommandée)
✅ **Structure proposée** :

```
Accueil > Location {typeLabel} à Nosy Be > {brand} {model}
```

Avec `typeLabel` = quad | scooter | moto | voiture via `getVehicleTypeLabel()`.

**Exemples** :
- KYMCO MAXXER 300 cc : `Accueil > Location quad à Nosy Be > KYMCO MAXXER 300 cc`
- SYM Symphony ST : `Accueil > Location scooter à Nosy Be > SYM Symphony ST`
- Voiture : `Accueil > Location voiture à Nosy Be > Toyota Rav4`

**Avantages** :
- Cohérent avec H1 et H2 existants
- Pas de nouvelle route à créer
- Aligné avec la stratégie SEO actuelle (Location X à Nosy Be)

---

## 7️⃣ Risques

| Risque                | Évaluation | Mitigation                                   |
|-----------------------|-----------|----------------------------------------------|
| Conflit JSON-LD       | Faible    | Product et BreadcrumbList sont compatibles   |
| Double canonical      | Nul       | Un seul canonical, inchangé                  |
| Re-render SEO         | Faible    | Même pattern que Product, pas de changement  |
| Problème hydration    | Nul       | Helmet gère le DOM head, pas le body         |
| SEO côté client       | Existant  | Comportement actuel, inchangé                |

### SEO côté client
- `react-helmet-async` injecte les balises côté client.
- Google indexe généralement correctement les SPAs avec contenu dynamique.
- Le breadcrumb JSON-LD sera injecté comme le Product actuel.

---

## 8️⃣ Cartographie des modifications

### Fichiers potentiellement modifiés

| Fichier                 | Modification prévue |
|-------------------------|---------------------|
| `src/components/seo/Seo.tsx` | Prop `extraStructuredData` (ou support tableau) pour 2ᵉ JSON-LD |
| `src/utils/vehicleSeo.ts`   | Nouvelle fonction `buildVehicleBreadcrumbSchema()` |
| `src/pages/vehicles/MotoVehicleDetails.tsx` | Appel breadcrumb schema + passage à Seo |
| `src/pages/vehicles/VehicleDetails.tsx`     | Idem |

### Fichiers à créer (optionnel)
- `src/utils/vehicleBreadcrumbSchema.ts` : si on veut isoler le schema breadcrumb

### Points techniques
1. **Seo.tsx** : accepter `extraStructuredData` ou `structuredData: object | object[]` et rendre un ou deux scripts.
2. **vehicleSeo.ts** (ou nouveau fichier) : `buildVehicleBreadcrumbSchema({ typeLabel, brand, model, canonical })` → BreadcrumbList.
3. **Pages produit** : calculer `typeLabel` via `getVehicleTypeLabel()`, construire le breadcrumb et le passer à Seo.
4. **Breadcrumb visuel** : composant UI (nav + liens) au-dessus du contenu, utilisant la même logique.

---

## 9️⃣ Validation et recommandation

### Le breadcrumb dynamique est faisable ?
Oui, sans impact majeur sur l’existant.

### Stratégie retenue
**OPTION B** — Accueil > Location {typeLabel} à Nosy Be > Nom du véhicule

### Étapes d’implémentation proposées
1. Ajouter `buildVehicleBreadcrumbSchema()` dans `vehicleSeo.ts` ou fichier dédié.
2. Étendre `Seo` pour gérer un second JSON-LD (BreadcrumbList).
3. Intégrer le schema dans `MotoVehicleDetails` et `VehicleDetails`.
4. Ajouter le breadcrumb visuel (optionnel, composant UI).

---

## 10️⃣ LIVRABLES (après implémentation ÉTAPE 4)

### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `src/components/seo/Seo.tsx` | Prop `extraStructuredData?: object` + second script JSON-LD |
| `src/utils/vehicleSeo.ts` | Fonction `buildVehicleBreadcrumbSchema()` |
| `src/pages/vehicles/MotoVehicleDetails.tsx` | Breadcrumb UI, schema, `extraStructuredData` |
| `src/pages/vehicles/VehicleDetails.tsx` | Breadcrumb UI, schema, `extraStructuredData` |

### Exemple JSON-LD BreadcrumbList généré

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://rentanoo.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Location quad à Nosy Be",
      "item": "https://rentanoo.com/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "KYMCO MAXXER 300 cc (2023)",
      "item": "https://rentanoo.com/moto/CAC6D5B5"
    }
  ]
}
```

### Exemples de breadcrumb rendu (UI)

**KYMCO MAXXER (quad)** — `/moto/CAC6D5B5` :
```
Accueil  >  Location quad à Nosy Be  >  KYMCO MAXXER 300 cc (2023)
   ↑                    ↑                              ↑
  lien /              lien /                    page courante
```

**SYM Symphony (scooter)** — `/moto/XXXXXXXX` :
```
Accueil  >  Location scooter à Nosy Be  >  SYM Symphony ST (125)
   ↑                       ↑                              ↑
  lien /                 lien /                    page courante
```

**Voiture** — `/vehicle/XXXXXXXX` :
```
Accueil  >  Location voiture à Nosy Be  >  Toyota Rav4 (2022)
   ↑                      ↑                             ↑
  lien /                lien /                   page courante
```

---

*Document mis à jour après implémentation ÉTAPE 4.*
