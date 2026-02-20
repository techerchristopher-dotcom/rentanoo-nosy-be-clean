# DIAG GOOGLE SEARCH CONSOLE — Actions post-SEO

**Date :** 20 février 2026  
**Contexte :** Mises à jour SEO récentes (sitemap, LocalBusiness, Product/Offer, images, canonical).  
**⚠️ AUCUNE MODIFICATION — rapport diagnostic et checklist d’actions.**

---

## 1) Vérification sitemap

### URL

- **Sitemap :** `https://rentanoo.com/sitemap.xml`
- **Référence robots.txt :** ✅ `Sitemap: https://rentanoo.com/sitemap.xml`

### Contenu actuel (`public/sitemap.xml`)

| # | URL | lastmod | changefreq | priority |
|---|-----|---------|------------|----------|
| 1 | https://rentanoo.com/ | 2026-01-15 | daily | 1.0 |
| 2 | https://rentanoo.com/legal | 2026-01-15 | monthly | 0.5 |
| 3 | https://rentanoo.com/contact | 2026-01-15 | monthly | 0.5 |
| 4 | https://rentanoo.com/rent-my-car | 2026-01-15 | weekly | 0.8 |
| 5 | https://rentanoo.com/sinistre-caution | 2026-02-20 | monthly | 0.6 |

**Total :** 5 URLs

### URLs non présentes dans le sitemap

| Page | Raison |
|------|--------|
| `/vehicle/:license` | Sitemap statique — véhicules non listés |
| `/moto/:license` | Idem — motos non listées |
| `/auth/login`, `/auth/register` | Volontairement exclues |

### À vérifier dans GSC

| Vérification | Où dans GSC | Action si problème |
|--------------|-------------|-------------------|
| Sitemap soumis ? | Pages > Sitemaps | Soumettre si absent |
| Statut « Réussi » ? | Pages > Sitemaps | Vérifier erreurs éventuelles |
| URLs découvertes | Pages > Sitemaps | Comparer au sitemap (5 URLs) |
| URLs indexées | Pages > Indexation | Voir couverture |

**Note :** Aucun accès aux données GSC depuis le projet. Ces vérifications sont à faire manuellement dans Search Console.

---

## 2) Couverture / indexation

### Éléments connus (côté projet)

| Élément | État |
|---------|------|
| **Meta robots** | Absent → indexation par défaut (index, follow) |
| **noindex** | Non utilisé sur les pages publiques |
| **Canonicals** | Home, Legal, Contact, RentMyCar, SinistreCaution, VehicleDetails, MotoVehicleDetails |
| **Redirections** | Véhicule non trouvé → `navigate("/")` (client-side) |
| **Soft 404** | Risque sur véhicule inexistant : page flash puis redirect |

### Pages pouvant poser problème

| Page | Risque |
|------|--------|
| `/vehicle/:license` (not found) | Redirect client → Google peut voir une page vide avant redirect |
| `/moto/:license` (not found) | Idem |
| Pages auth (`/auth/login`, etc.) | Non indexées volontairement (pas dans sitemap) |

### À vérifier dans GSC

| Rapport | Chemin GSC | Ce qu’il faut vérifier |
|---------|------------|------------------------|
| **Pages exclues** | Indexation > Pages | noindex, canonical, redirection, soft 404 |
| **Pages valides avec avertissements** | Indexation > Pages | Avertissements éventuels |
| **Erreurs** | Indexation > Pages | 404, 500, erreurs serveur |

### Erreurs probables

| Erreur | Cause potentielle | Priorité |
|--------|-------------------|----------|
| 500 sur sitemap | Déploiement / cache (rapport DIAG-SITEMAP : 200 en curl) | Vérifier si sporadique |
| Soft 404 sur /vehicle/xxx inexistant | Flash de page vide avant redirect | Optionnel |
| 404 sur URL inconnue | Trafic vers anciennes URLs | Optionnel |

---

## 3) Données structurées

### Schémas implémentés

| Page | Schema | @type | Statut |
|------|--------|-------|--------|
| **Home** (`/`) | JSON-LD | LocalBusiness | ✅ Implémenté |
| **VehicleDetails** (`/vehicle/:license`) | JSON-LD | Product + Offer | ✅ Implémenté |
| **MotoVehicleDetails** (`/moto/:license`) | JSON-LD | Product + Offer | ✅ Implémenté |

### Détail des schémas

**LocalBusiness (Home) :**
- name, url, image, description, areaServed (Nosy Be, Madagascar)

**Product + Offer (véhicules/motos) :**
- name, description, image, brand, sku (license)
- offers : url, price, priceCurrency (EUR), availability (InStock), itemCondition (UsedCondition), areaServed, priceSpecification (UnitPriceSpecification)

### Mode d’injection

- **SPA** : JSON-LD injecté côté client par `react-helmet-async` (Seo.tsx)
- Google exécute le JS → le schema est visible après rendu

### À vérifier dans GSC

| Rapport | Chemin GSC | Vérifications |
|---------|------------|----------------|
| **Données structurées** | Expérience > Données structurées | Erreurs / avertissements |
| **Product** | Expérience > Données structurées | Détection Product sur pages véhicule/moto |
| **LocalBusiness** | Expérience > Données structurées | Détection LocalBusiness sur Home |

### Outils complémentaires

- [Test des résultats enrichis](https://search.google.com/test/rich-results) : tester une URL véhicule et la Home
- [Validateur schema.org](https://validator.schema.org/) : valider le JSON-LD

---

## 4) Performance (Core Web Vitals)

### Contexte (DIAG-PERF-JS-CSS-IMAGES-HOME)

| Métrique | Constat | Cible |
|----------|---------|-------|
| **JS initial** | ~864 KB (260 KB gzip) | Réduire |
| **CSS initial** | ~154 KB (23 KB gzip) | Stable |
| **Images** | Potentiellement lourdes (object/public) | Optimiser si possible |
| **LCP** | H1 plutôt qu’image sur Home | < 4 s (mobile 4G) |

### LCP

- **Home :** LCP probable = H1 (le titre de la page)
- **Pages véhicules :** LCP probable = image principale ou H1

### À vérifier dans GSC

| Rapport | Chemin GSC | Vérifications |
|---------|------------|----------------|
| **Core Web Vitals** | Expérience > Core Web Vitals | LCP, FID, CLS mobile |
| **URL avec problèmes** | Expérience > Core Web Vitals | Pages sous le seuil « Bon » |

### Pages prioritaires

1. **Home** : entrée principale
2. **/vehicle/:license** : pages produit
3. **/moto/:license** : pages produit

---

## 5) Canonical

### Implémentation

| Page | Canonical | Source |
|------|-----------|--------|
| Home | `https://rentanoo.com` | Index.tsx |
| Legal | `https://rentanoo.com/legal` | Legal.tsx |
| Contact | `https://rentanoo.com/contact` | Contact.tsx |
| RentMyCar | `https://rentanoo.com/rent-my-car` | RentMyCarLanding.tsx |
| RentMyCar Register | `https://rentanoo.com/rent-my-car/register` | RentMyCarRegister.tsx |
| SinistreCaution | `https://rentanoo.com/sinistre-caution` | SinistreCaution.tsx |
| Vehicle | `https://rentanoo.com/vehicle/:license` | `buildVehicleCanonical(license, false)` |
| Moto | `https://rentanoo.com/moto/:license` | `buildVehicleCanonical(license, true)` |

### Duplication vehicle vs moto

- Chaque véhicule est soit voiture (`/vehicle/`) soit moto (`/moto/`), pas les deux
- Pas de duplication vehicle/moto pour une même license
- Canonicals correctement différenciés

### À vérifier dans GSC

- Pas de pages en double (canonical vs non-canonical)
- Canonical = URL affichée dans l’interface (pas de variante inattendue)

---

## 6) Tableau des problèmes

| Problème | Priorité | Où vérifier | Action |
|----------|----------|--------------|--------|
| Sitemap non soumis ou en erreur | **Critique** | Pages > Sitemaps | Soumettre / corriger |
| Erreurs 404/500 nombreuses | **Critique** | Indexation > Pages | Corriger URLs, pages, serveur |
| Données structurées : erreurs Product / LocalBusiness | **Important** | Expérience > Données structurées | Corriger le JSON-LD |
| Pages véhicule/moto non indexées | **Important** | Indexation > Pages | Sitemap dynamique ou Inspection URL |
| Core Web Vitals mobiles « À améliorer » ou « Mauvaise » | **Important** | Expérience > Core Web Vitals | Optimiser LCP, JS, images |
| Sitemap sans pages véhicule/moto | **Optionnel** | Pages > Sitemaps | Envisager sitemap dynamique |
| Soft 404 sur véhicule inexistant | **Optionnel** | Indexation > Pages | Suivre si volume significatif |

---

## 7) Checklist d’actions dans GSC

### Immédiat (première connexion)

- [ ] **Soumettre le sitemap**  
  Pages > Sitemaps > Ajouter un sitemap > `https://rentanoo.com/sitemap.xml`
- [ ] **Vérifier robots.txt**  
  Paramètres > robots.txt > confirmer `Sitemap: https://rentanoo.com/sitemap.xml`
- [ ] **Contrôler couverture**  
  Indexation > Pages > Vue d’ensemble (exclues, valides, erreurs)
- [ ] **Inspection URL Home**  
  Inspection d’URL > `https://rentanoo.com` > Demander une indexation
- [ ] **Vérifier les données structurées**  
  Expérience > Données structurées > Erreurs et avertissements

### Court terme (après 1–2 semaines)

- [ ] **Inspection d’URL véhicule**  
  Tester 1–2 URLs `/vehicle/:license` et `/moto/:license` en direct
- [ ] **Demande d’indexation**  
  Pour les pages véhicule/moto les plus stratégiques
- [ ] **Core Web Vitals**  
  Expérience > Core Web Vitals > identifier et traiter les pages problématiques

### Moyen terme (si besoin)

- [ ] **Sitemap dynamique**  
  Si les pages véhicule/moto ne sont pas bien découvertes
- [ ] **Validation des correctifs**  
  Après modifications, utiliser « Démarrer la validation » dans GSC
- [ ] **Suivi des performances**  
  Performance > Pages, Requêtes, Pays, Appareils

---

## 8) Résumé

| Thème | État projet | À faire dans GSC |
|------|-------------|------------------|
| Sitemap | 5 URLs, robots OK | Soumission + contrôle du statut |
| Indexation | Pas de noindex | Vérifier couverture, exclusions, erreurs |
| Données structurées | LocalBusiness + Product/Offer | Vérifier détection et absence d’erreurs |
| Canonical | Implémenté | Vérifier absence de doublons |
| Performance | LCP potentiel sur H1 | Suivre Core Web Vitals mobile |

**Verdict :** Les bases SEO sont en place. Les actions à mener dans GSC consistent surtout à valider la soumission du sitemap, la couverture et les données structurées.
