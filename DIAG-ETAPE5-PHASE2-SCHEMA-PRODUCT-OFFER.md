# DIAG ÉTAPE 5 — Phase 2 : Schema Product + Offer (pages véhicule/moto)

**Date :** 20 février 2026  
**Objectif :** Préparer l’implémentation JSON-LD Product/Offer pour `/vehicle/:license` et `/moto/:license`.  
**⚠️ Aucune modification — rapport uniquement.**

---

## 1) Inventaire des données disponibles

### VehicleDetails.tsx (voitures)

| Champ | Variable / source | Type | Disponible au rendu success |
|-------|------------------|------|-----------------------------|
| brand | `vehicle.brand` | string | ✅ |
| model | `vehicle.model` | string | ✅ |
| year | `vehicle.year` | number | ✅ |
| description | `vehicle.description` | string \| undefined | ✅ (peut être vide) |
| prix/jour | `vehicle.dailyPrice` | number | ✅ |
| devise | `vehicle.currency` | "EUR" (hardcodé dans mapping) | ✅ |
| location | `vehicle.location` | string | ✅ (fallback "Nosy Be, Madagascar" si pas de pickup_zones) |
| availability | `vehicle.status` | "available" (hardcodé dans mapping) | ✅ (tous les véhicules listés sont disponibles) |
| images | `photos[].url` | string[] | ✅ |
| license | `license \|\| vehicle.license` | string | ✅ |
| canonical URL | `buildVehicleCanonical(license, false)` | string | ✅ |

**Source du prix :** `vehicle.dailyPrice` (mappé depuis `vehicle.price_per_day` Supabase).  
**Source de la devise :** `vehicle.currency` = `"EUR"` (dans le mapping voiture).

---

### MotoVehicleDetails.tsx (motos/scooters)

| Champ | Variable / source | Type | Disponible au rendu success |
|-------|------------------|------|-----------------------------|
| brand | `vehicle.brand` | string | ✅ |
| model | `vehicle.model` | string | ✅ |
| year | `vehicle.year` | number | ✅ |
| description | `vehicle.description` | string \| undefined | ✅ |
| prix/jour | `vehicle.dailyPrice` | number | ✅ |
| devise | `vehicle.currency` | "EUR" (mapToMotoVehicle) | ✅ |
| location | `vehicle.location` | string \| undefined | ⚠️ Peut être undefined si pas de pickup_zones |
| availability | `vehicle.status` | "available" | ✅ |
| images | `photos[].url` | string[] | ✅ |
| license | `license \|\| vehicle.license` | string | ✅ |
| canonical URL | `buildVehicleCanonical(license, true)` | string | ✅ |

**Source du prix :** `vehicle.dailyPrice` (depuis `price_per_day` Supabase via `mapToMotoVehicle`).  
**Source de la devise :** `vehicle.currency` = `"EUR"` dans `mapToMotoVehicle`.  
**Location moto :** Peut être `undefined` → fallback recommandé : `"Nosy Be, Madagascar"` pour `areaServed`.

---

### Source de vérité

| Donnée | Source | Note |
|--------|--------|------|
| Prix/jour | `vehicle.dailyPrice` (number) | Valeur de base par jour, indépendante des dates |
| Devise | `vehicle.currency` | Toujours `"EUR"` dans le mapping actuel |
| Disponibilité | `vehicle.status` ou logique métier | Les véhicules affichés viennent de `getAvailableVehicles()` (available=true). `status` = "available" dans le mapping. |
| URL canonique | `buildVehicleCanonical(license, isMoto)` | Retourne `https://rentanoo.com/vehicle/XXX` ou `/moto/XXX` |

**Devise :** Actuellement `EUR` uniquement. Pas de MGA ni autre devise. **Recommandation :** utiliser `"EUR"` pour le schema.

---

## 2) Cycle de rendu

### États

| État | Condition | Rendu |
|------|-----------|-------|
| **Loading** | `loading === true` | Spinner + `<Seo>` (loading title/description), pas de `structuredData` |
| **Not found** | `!vehicle && !loading` | Théorique : `<Seo>` (notFound). En pratique, `navigate("/")` est appelé → on ne reste pas sur la page. |
| **Erreur** | catch dans `loadVehicleData` | `navigate("/")` → redirection |
| **Success** | `vehicle` défini | `<Seo>` avec title, description, canonical. **C’est ici qu’il faut ajouter `structuredData`.** |

### Où injecter `structuredData`

| Fichier | Zone JSX | Ligne actuelle |
|---------|----------|----------------|
| **VehicleDetails.tsx** | Bloc `return` principal, après `if (loading \|\| !vehicle)` | ~896–900 |
| **MotoVehicleDetails.tsx** | Idem | ~831–835 |

**Condition :** Injecter **uniquement** quand `vehicle` est défini (donc dans le bloc `return` principal, pas dans le bloc loading/notFound).

**Seo actuel :**
```tsx
<Seo
  title={buildVehicleSeoTitle(seoInput)}
  description={buildVehicleSeoDescription(seoInput)}
  canonical={buildVehicleCanonical(seoInput.license, false)}
/>
```

**Ajout à prévoir :** `structuredData={...}` à ce même appel `<Seo>`.

---

## 3) Spécification du schema JSON-LD

### Structure proposée

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{{brand}} {{model}}{{year ? ' (' + year + ')' : ''}}",
  "description": "{{description || 'Location ... à Nosy Be. Réservation en ligne, livraison à l\'hôtel ou à l\'aéroport.'}}",
  "image": ["{{photo1.url}}", "{{photo2.url}}", ...],
  "brand": {
    "@type": "Brand",
    "name": "{{brand}}"
  },
  "sku": "{{license}}",
  "offers": {
    "@type": "Offer",
    "url": "{{canonical}}",
    "price": "{{dailyPrice}}",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "{{dailyPrice}}",
      "priceCurrency": "EUR",
      "unitText": "DAY"
    },
    "areaServed": {
      "@type": "Place",
      "name": "Nosy Be, Madagascar"
    }
  }
}
```

### Champs à préciser

| Champ | Valeur | Statut |
|-------|--------|--------|
| `priceCurrency` | `"EUR"` | ✅ Recommandé (tout le site est en EUR) |
| `availability` | `"https://schema.org/InStock"` | ✅ Valeur par défaut (véhicules de la liste = disponibles) |
| `itemCondition` | Non recommandé | Omis ou `"https://schema.org/UsedCondition"` pour véhicules d’occasion (à valider) |
| `description` | `vehicle.description` ou fallback | Si vide, utiliser un texte générique court |

### Exemple concret (Honda PCX 2024)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Honda PCX (2024)",
  "description": "Scooter Honda PCX, location à Nosy Be.",
  "image": ["https://xxx.supabase.co/..."],
  "brand": {
    "@type": "Brand",
    "name": "Honda"
  },
  "sku": "ABC12345",
  "offers": {
    "@type": "Offer",
    "url": "https://rentanoo.com/moto/ABC12345",
    "price": "35",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "35",
      "priceCurrency": "EUR",
      "unitText": "DAY"
    },
    "areaServed": {
      "@type": "Place",
      "name": "Nosy Be, Madagascar"
    }
  }
}
```

---

## 4) Risques et limites

### Product vs location

- Google accepte `Product` + `Offer` pour des services de location.
- Le prix dans l’`Offer` correspond au tarif journalier (prix de base), pas au total pour des dates.
- À ne pas mettre : un montant total variable selon les dates sélectionnées.

### Rendu client (SPA)

- Le JSON-LD est injecté côté client par React/Helmet.
- Google exécute du JavaScript et voit généralement ce schema.
- Pour maximiser la détection, éviter de l’injecter trop tard (pas de chargement asynchrone inutile sur la page de détail).

### Données incorrectes

- Ne pas afficher de prix si `dailyPrice <= 0` ou absent.
- Ne pas inventer de description : utiliser `vehicle.description` ou un fallback factuel.
- Pour les images : uniquement des URLs absolues accessibles publiquement.

---

## 5) Synthèse

### Tableau comparatif

| Champ | VehicleDetails | MotoVehicleDetails |
|-------|----------------|-------------------|
| brand | `vehicle.brand` | `vehicle.brand` |
| model | `vehicle.model` | `vehicle.model` |
| year | `vehicle.year` | `vehicle.year` |
| description | `vehicle.description` | `vehicle.description` |
| dailyPrice | `vehicle.dailyPrice` | `vehicle.dailyPrice` |
| currency | `"EUR"` | `"EUR"` |
| location | `vehicle.location` (fallback Nosy Be) | `vehicle.location` (fallback à prévoir) |
| availability | InStock (véhicules disponibles) | InStock |
| images | `photos.map(p => p.url)` | Idem |
| license | `license \|\| vehicle.license` | Idem |
| canonical | `buildVehicleCanonical(license, false)` | `buildVehicleCanonical(license, true)` |

### Recommandation finale

- **priceCurrency :** `"EUR"` — tout le site et les prix sont en euros.
- **Injection :** Dans le bloc de rendu “success”, à l’appel `<Seo>` existant, en ajoutant `structuredData`.

### Point d’injection

| Fichier | Ligne | Action |
|---------|-------|--------|
| `VehicleDetails.tsx` | ~896–900 | Ajouter `structuredData={productOfferSchema}` au `<Seo>` |
| `MotoVehicleDetails.tsx` | ~831–835 | Idem |

Le schema peut être construit à partir de `vehicle`, `photos`, `seoInput`, `buildVehicleCanonical`.

### Prêt à implémenter ?

**Oui.** Les données nécessaires sont présentes, et l’injection se fait au bon endroit (rendu success uniquement).

---

## 6) TODO d’implémentation

1. [ ] Créer une fonction utilitaire (ex. `buildProductOfferSchema`) dans `vehicleSeo.ts` ou un nouveau fichier.
2. [ ] Construire l’objet schema à partir de : `vehicle`, `photos`, `license`, `isMoto`.
3. [ ] Gérer le cas `description` vide (fallback texte générique).
4. [ ] Pour MotoVehicleDetails : fallback `"Nosy Be, Madagascar"` si `vehicle.location` est undefined.
5. [ ] Ne pas inclure `offers.price` si `dailyPrice <= 0`.
6. [ ] S’assurer que les URLs d’images sont absolues.
7. [ ] Passer `structuredData` au `<Seo>` dans VehicleDetails.tsx (après `seoInput`).
8. [ ] Passer `structuredData` au `<Seo>` dans MotoVehicleDetails.tsx.
9. [ ] Tester avec le validateur schema.org (Rich Results Test).
10. [ ] Vérifier l’affichage dans le DOM après chargement de la page.
