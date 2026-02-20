# Audit SEO Phase 1 — Rentanoo Nosy Be

**Contexte** : Site de location de scooters pour touristes à Nosy Be (Madagascar).  
**Objectif** : Vérifier la conformité SEO "Phase 1" (compréhension par les moteurs de recherche) selon les critères : title unique/descriptif, contenu aligné sur les requêtes clients, images nommées + ALT, structure claire.

**Requêtes cibles** : "location scooter nosy be", "rent scooter nosy be", "scooter rental nosy be", "louer scooter nosy be", "location scooter madagascar".

**Date de l'audit** : 20 février 2026

---

## Pages auditées

| Page | URL | Statut |
|------|-----|--------|
| Accueil | `/` | Audité |
| Contact | `/contact` | Audité |
| Mentions légales / CGU | `/legal` | Audité |
| Propriétaires (Louez votre voiture) | `/rent-my-car` | Audité (erreur 404 CSS en prod) |
| Sinistre & caution | `/sinistre-caution` | Audité (code) |
| Page véhicule (car) | `/vehicle/:license` | Audité (code) |
| Page moto | `/moto/:license` | Audité (code) |

**Note** : Pas de page tarifs dédiée, pas de page FAQ dédiée. La page Sinistre & caution contient une FAQ partielle.

---

# 1. ACCUEIL — https://rentanoo.com/

## A. Indexation & accessibilité

| Critère | État |
|---------|------|
| URL | `https://rentanoo.com/` |
| Status code | **200** |
| Meta robots | Absent (implicite index) |
| Canonical | **Absent** — aucune balise `<link rel="canonical">` dans le HTML |
| Sitemap | Présent — `https://rentanoo.com/sitemap.xml` (200) |
| robots.txt | Présent — `https://rentanoo.com/robots.txt` (200), `Disallow:` vide (tout autorisé) |
| Noindex erroné | Non |

**Fichier** : `index.html` (head statique pour toute l’app SPA)

---

## B. Title

| Élément | Valeur |
|--------|--------|
| Title exact | `RENTANOO` |
| Longueur | 8 caractères |
| Diagnostic | **Trop vague** — Aucune intention locale, aucun mot-clé. Google affichera une proposition de snippet générique. Ne reflète pas "location scooter Nosy Be". |
| **Recommandation** | `Location scooter Nosy Be — Louer un scooter en ligne | Rentanoo` |

---

## C. Meta description

| Élément | Valeur |
|--------|--------|
| Meta description exacte | `location de voiture entre particulier & pros sur l'ile de Mayotte` |
| Diagnostic | **Erreur majeure** — Le site est pour Nosy Be (Madagascar), pas Mayotte. Vocabulaire "voiture" au lieu de "scooter". Peut nuire à la confiance et au positionnement. |
| **Recommandation** | `Louez votre scooter à Nosy Be en quelques clics. Réservation 100 % en ligne, livraison possible à l'aéroport ou à l'hôtel. Casques et assurance inclus.` |

---

## D. Contenu texte principal

| Élément | Valeur |
|--------|--------|
| H1 | `Louez votre scooter à Nosy Be en quelques clics` |
| H2 | `Véhicules disponibles` |
| H3 | Aucun (filtres : Carburant, Transmission, Catégorie) |
| Extrait above the fold | H1 + `RENTANOO, la première plateforme de location de scooters 100 % en ligne` + SearchBar (dates, heures) |

**Diagnostic** :
- H1 correct : contient "scooter" et "Nosy Be".
- Sous-titre pertinent.
- Manques : "livraison", "aéroport", "hôtel", "casque", "assurance", "permis", "Madagascar".

**Recommandations** :
1. Ajouter un bloc texte court sous le hero (2–3 phrases) : "Livraison possible à votre hôtel ou à l'aéroport de Fascène. Casque et assurance inclus. Pas de permis moto requis pour les 50 cm³."
2. Enrichir le footer avec des mots-clés (déjà présent : "Nosy Be, Madagascar").
3. Ajouter une section "Pourquoi nous choisir" avec mots : livraison, aéroport, assurance, casque.

---

## E. Images

| # | src / fichier | Nom fichier | alt |
|---|---------------|-------------|-----|
| 1–N | VehicleCard / Supabase ou Unsplash | Variable (ex. `photo-1549924231-f129b911e442`) | `{vehicle.brand} {vehicle.model}` |
| — | `/brand/rentanoo-logo.svg` | rentanoo-logo.svg | `Rentanoo` |

**Images principales (grille véhicules)** :
- VehicleCard : `alt={vehicle.brand} {vehicle.model}` — **pertinent**.
- MotoVehicleCard : idem.
- Placeholder Unsplash : URL `photo-1549924231-f129b911e442` — nom non descriptif.

**Score Images SEO** : **À améliorer** — ALT corrects pour les cards, mais noms de fichiers Supabase/Unsplash non contrôlés.

**Recommandations** :
1. Nommer les fichiers uploadés : `scooter-honda-pcx-nosy-be.jpg` au lieu de noms génériques.
2. Exemples ALT optimisés :
   - `Honda PCX 125 — Location scooter Nosy Be — Rentanoo`
   - `Scooter disponible à la location — Nosy Be, Madagascar`
   - `Scooter 50 cm³ — Livraison possible à l'hôtel — Rentanoo Nosy Be`

---

## F. Résumé conformité accueil

| Verdict | **Partiellement conforme** |
|---------|----------------------------|
| Corrections prioritaires | 1. Corriger meta description (Mayotte → Nosy Be, voiture → scooter) 2. Remplacer le title par un title descriptif avec "Nosy Be" et "location scooter" 3. Ajouter balise canonical |

---

# 2. CONTACT — https://rentanoo.com/contact

## A. Indexation & accessibilité

| Critère | État |
|---------|------|
| URL | `https://rentanoo.com/contact` |
| Status code | **200** (même HTML que /, SPA) |
| Meta robots | Absent |
| Canonical | Absent |
| Dans sitemap | Oui |
| Noindex erroné | Non |

---

## B. Title

| Élément | Valeur |
|--------|--------|
| Title exact | `RENTANOO` (identique à l’accueil) |
| Longueur | 8 caractères |
| Diagnostic | **Dupliqué** — Toutes les pages SPA partagent le même title (index.html). |
| **Recommandation** | `Contact — Location scooter Nosy Be | Rentanoo` |

---

## C. Meta description

| Élément | Valeur |
|--------|--------|
| Meta description exacte | `location de voiture entre particulier & pros sur l'ile de Mayotte` |
| Diagnostic | Identique à l’accueil, inadaptée à la page contact. |
| **Recommandation** | `Contactez Rentanoo pour louer un scooter à Nosy Be. Questions, réservation, livraison à l'aéroport ou à l'hôtel — nous répondons rapidement.` |

---

## D. Contenu texte principal

| Élément | Valeur |
|--------|--------|
| H1 | `Nous contacter` |
| H2 | Aucun |
| H3 | `Formulaire de contact` |
| Extrait above the fold | `Vous préférez nous écrire ? Remplissez le formulaire ci-dessous.` |

**Diagnostic** : H1 sobre. Pas de mention explicite "location scooter Nosy Be" dans le texte visible.

**Recommandations** :
1. H1 : `Contactez-nous pour votre location scooter Nosy Be`.
2. Sous-titre : inclure "Questions sur la réservation, livraison à l'aéroport ou à l'hôtel ?"
3. Ajouter un H2 : `Une question sur votre location ?`

---

## E. Images

| # | src / fichier | Nom fichier | alt |
|---|---------------|-------------|-----|
| 1 | Footer : `/brand/rentanoo-logo.svg` | rentanoo-logo.svg | `Rentanoo` |

**Score Images SEO** : **OK** — peu d’images, ALT correct.

---

## F. Résumé conformité contact

| Verdict | **Partiellement conforme** |
|---------|----------------------------|
| Corrections prioritaires | 1. Title et meta description dynamiques (Nosy Be, scooter) 2. H1 + sous-titre enrichis 3. Canonical |

---

# 3. MENTIONS LÉGALES / CGU — https://rentanoo.com/legal

## A. Indexation & accessibilité

| Critère | État |
|---------|------|
| URL | `https://rentanoo.com/legal` |
| Status code | **200** |
| Meta robots | Absent |
| Canonical | Absent |
| Dans sitemap | Oui |
| Noindex erroné | Non |

---

## B. Title

| Élément | Valeur |
|--------|--------|
| Title exact | `RENTANOO` |
| Diagnostic | Dupliqué. |
| **Recommandation** | `Mentions légales — Rentanoo Location scooter Nosy Be` |

---

## C. Meta description

| Élément | Valeur |
|--------|--------|
| Meta description exacte | (identique à l’accueil) |
| Diagnostic | Pas spécifique aux mentions légales. |
| **Recommandation** | `Mentions légales, CGU et politique de confidentialité de Rentanoo — Location de scooters à Nosy Be, Madagascar.` |

---

## D. Contenu texte principal

| Élément | Valeur |
|--------|--------|
| H1 | `Mentions légales` |
| H2 | `1. Objet`, `2. Utilisation`, etc. |
| H3 | `Conditions Générales d'Utilisation`, `Politique de Confidentialité`, `À propos de Mayotte` |

**Extrait** : "MayCar est une plateforme de démonstration d'autopartage entre particuliers spécialement conçue pour **Mayotte**..."

**Diagnostic** : **Erreur majeure** — Le contenu parle de Mayotte et MayCar, pas de Rentanoo / Nosy Be. Risque de confusion pour Google et les utilisateurs.

**Recommandations** :
1. Remplacer toute mention de "MayCar" par "Rentanoo".
2. Remplacer toute mention de "Mayotte" par "Nosy Be, Madagascar".
3. Supprimer la section "À propos de Mayotte" ou la remplacer par "À propos de Nosy Be".

**Fichier** : `src/pages/legal/Legal.tsx`

---

## E. Images

Aucune image principale.

**Score Images SEO** : **OK**

---

## F. Résumé conformité legal

| Verdict | **Non conforme** |
|---------|-------------------|
| Corrections prioritaires | 1. Réécrire le contenu (Mayotte/MayCar → Nosy Be/Rentanoo) 2. Title + meta description spécifiques 3. Supprimer ou adapter la section Mayotte |

---

# 4. RENT-MY-CAR (Propriétaires) — https://rentanoo.com/rent-my-car

## A. Indexation & accessibilité

| Critère | État |
|---------|------|
| URL | `https://rentanoo.com/rent-my-car` |
| Status code | **200** (mais erreur 404 sur `modal-animations-BZDTbw2D.css` → ErrorBoundary) |
| Meta robots | Absent |
| Canonical | Absent |
| Dans sitemap | Oui |
| Noindex erroné | Non |

**Problème technique** : La page affiche une erreur en production (ressource CSS 404). À corriger en priorité.

---

## B. Title

| Élément | Valeur |
|--------|--------|
| Title exact | `RENTANOO` |
| Diagnostic | Dupliqué. |
| **Recommandation** | `Devenir loueur — Louez votre scooter ou voiture à Nosy Be | Rentanoo` |

---

## C. Meta description

(identique aux autres pages)

**Recommandation** : `Mettez votre scooter ou voiture en location à Nosy Be. Processus simple en 3 étapes, assurance incluse. Gagnez de l'argent avec Rentanoo.`

---

## D. Contenu texte principal

| Élément | Valeur |
|--------|--------|
| H1 | `Louez votre voiture en toute simplicité` |
| H2 | `Comment ça marche ?`, `Pourquoi choisir MayCar ?`, `Prêt à commencer ?` |
| H3 | `Mon véhicule & mes infos`, `Mes conditions de location`, etc. |

**Diagnostic** :
- H1 parle de "voiture" alors que le cœur du business est le scooter.
- H2 "Pourquoi choisir **MayCar** ?" — mauvaise marque.
- Pas de mention de Nosy Be.

**Recommandations** :
1. Remplacer "MayCar" par "Rentanoo" (`RentMyCarLanding.tsx:140`).
2. H1 : `Louez votre scooter ou voiture à Nosy Be`.
3. Ajouter "Nosy Be" et "Madagascar" dans le texte.

**Fichier** : `src/pages/owner/RentMyCarLanding.tsx`

---

## E. Images

Peu d’images ; pas d’images principales problématiques.

**Score Images SEO** : **OK**

---

## F. Résumé conformité rent-my-car

| Verdict | **Non conforme** (erreur technique + contenu incorrect) |
|---------|--------------------------------------------------------|
| Corrections prioritaires | 1. Corriger l’import 404 de modal-animations.css 2. Remplacer "MayCar" par "Rentanoo" 3. Adapter H1 et texte (Nosy Be, scooter) |

---

# 5. SINISTRE & CAUTION — https://rentanoo.com/sinistre-caution

## A. Indexation & accessibilité

| Critère | État |
|---------|------|
| URL | `https://rentanoo.com/sinistre-caution` |
| Status code | **200** |
| Meta robots | Absent |
| Canonical | Absent |
| Dans sitemap | **Non** — page absente du sitemap |
| Noindex erroné | Non |

---

## B. Title

| Élément | Valeur |
|--------|--------|
| Title exact | Dynamique via JS : `Sinistre & caution | RENTANOO - Location Nosy Be` (i18n) |
| Longueur | ~40 caractères |
| Diagnostic | **Bien** — Unique, descriptif, contient "Nosy Be" et "Location". |

---

## C. Meta description

| Élément | Valeur |
|--------|--------|
| Meta description exacte | Dynamique : `En cas d'incident pendant votre location : procédure sinistre et caution, assurance CB, documents à fournir. Rentanoo vous accompagne.` |
| Diagnostic | Cohérente, utile, contient "location" et "Rentanoo". Manque "Nosy Be" ou "scooter". |
| **Recommandation** | `En cas de sinistre pendant votre location scooter Nosy Be : procédure, caution, assurance CB. Rentanoo vous accompagne.` |

---

## D. Contenu texte principal

| Élément | Valeur |
|--------|--------|
| H1 | `Pas de panique : on reste zen, et on avance étape par étape.` |
| H2 | `Comment ça se passe, très concrètement`, `La caution : à quoi elle sert`, `Paiement par carte bancaire`, `Les documents`, etc. |
| H3 | (dans accordions FAQ) |

**Diagnostic** : Contenu riche, bien structuré. H1 un peu long mais engageant. Mentions "assurance", "caution", "documents" utiles.

**Recommandations** :
1. H1 : conserver ou raccourcir : `Sinistre & caution : on gère ça zen` + sous-titre avec "location scooter Nosy Be".
2. Ajouter au sitemap.
3. Inclure "Nosy Be" ou "scooter" dans les 2–3 premières phrases.

---

## E. Images

| # | src | Nom fichier | alt |
|---|-----|-------------|-----|
| 1 | Supabase `couple-serain-.webp` | couple-serain-.webp | `Location Rentanoo — gestion sereine d'un sinistre` |
| 2 | `timeline.webp` | timeline.webp | `Étapes de gestion d'un sinistre Rentanoo` |
| 3 | `justificatif.webp` | justificatif.webp | `La caution sert uniquement à couvrir les frais réellement justifiés` |
| 4 | `asurance .webp` | asurance .webp (espace) | `Protection par assurance carte bancaire Rentanoo` |
| 5 | `devis facture.webp` | devis facture.webp | `Documents de réparation – devis et facture mis à disposition par Rentanoo` |

**Score Images SEO** : **Bien** — ALT pertinents. Fichiers : `couple-serain-.webp` peu descriptif ; `asurance .webp` (typo + espace).

**Recommandations** :
1. Renommer : `sinistre-couple-zen-nosy-be.webp`, `etapes-sinistre-rentanoo.webp`.
2. Corriger : `assurance-carte-bancaire-rentanoo.webp`.
3. ALT : `Couple zen après location scooter — gestion sinistre Rentanoo Nosy Be`.

---

## F. Résumé conformité sinistre-caution

| Verdict | **Conforme** (avec améliorations mineures) |
|---------|-------------------------------------------|
| Corrections prioritaires | 1. Ajouter au sitemap 2. Inclure "Nosy Be" dans meta description 3. Renommer `asurance .webp` |

---

# 6. PAGE VÉHICULE / MOTO (template dynamique)

## A. Indexation & accessibilité

- **URL** : `/vehicle/:license` ou `/moto/:license`
- **Status** : 200 (SPA)
- **Canonical** : Absent — risque de duplication si URLs multiples.
- **Sitemap** : Pages véhicules absentes — Google doit les découvrir via liens internes.

---

## B. Title & meta

- **Title** : `RENTANOO` (statique, non dynamique).
- **Meta** : Identiques à l’accueil.

**Problème** : Aucune personnalisation (marque, modèle, Nosy Be).

**Recommandation** :  
Title : `{vehicle.brand} {vehicle.model} — Location scooter Nosy Be | Rentanoo`  
Meta : `Louez ce {brand} {model} à Nosy Be. À partir de {price}€/jour. Livraison possible. Réservez en ligne.`

---

## C. Contenu

- **H1** : `{vehicle.brand} {vehicle.model} {vehicle.year}` — correct.
- **H2** : `Récupération du véhicule`, `Caractéristiques techniques`, etc.
- **Fallback location** : "Mamoudzou, Mayotte" dans `VehicleDetails.tsx:1048` — à remplacer par "Nosy Be" ou zone par défaut.

---

## D. Images

- Photos Supabase : ALT `{vehicle.brand} {vehicle.model}` — correct mais minimal.
- Thumbnails : ALT `Vue ${photo.angle}` — peu descriptif.

**Recommandations** :
- ALT principal : `{brand} {model} — Location scooter Nosy Be — Rentanoo`
- Thumbnails : `{brand} {model} — vue {angle}`

---

# 7. RAPPORT GLOBAL

## Pages les plus faibles

1. **/legal** — Contenu Mayotte/MayCar, incohérent avec le business.
2. **/rent-my-car** — Erreur 404 CSS + MayCar dans le texte.
3. **index.html** — Meta description Mayotte/voiture sur tout le site.

## Pages les plus fortes

1. **/sinistre-caution** — Title/meta dynamiques, structure claire, bon contenu.
2. **/** — H1 correct "scooter Nosy Be", structure OK ; à améliorer sur title/meta.

## Problèmes récurrents

| Problème | Occurrences |
|----------|-------------|
| Title dupliqué "RENTANOO" | Toutes les pages |
| Meta description Mayotte/voiture | index.html (toutes les pages sauf Sinistre) |
| Absence de canonical | Toutes |
| Mentions MayCar / Mayotte | Legal, RentMyCarLanding, VehicleDetails fallback, Navbar (toast "MayCar") |
| Sitemap incomplet | Pas de /sinistre-caution ni des pages véhicules |
| Pas de title/meta dynamiques par page | SPA sans react-helmet ou équivalent |

---

# 8. TOP 10 ACTIONS (checklist)

| # | Action | Impact | Effort | Fichier(s) |
|---|--------|--------|--------|------------|
| 1 | Corriger meta description index.html (Mayotte → Nosy Be, voiture → scooter) | **Élevé** | Faible | `index.html` |
| 2 | Remplacer le title index.html par un title descriptif | **Élevé** | Faible | `index.html` |
| 3 | Réécrire le contenu Legal : MayCar → Rentanoo, Mayotte → Nosy Be | **Élevé** | Moyen | `src/pages/legal/Legal.tsx` |
| 4 | Remplacer "MayCar" par "Rentanoo" dans RentMyCarLanding | **Moyen** | Faible | `src/pages/owner/RentMyCarLanding.tsx:140` |
| 5 | Corriger l’erreur 404 modal-animations.css sur /rent-my-car | **Élevé** | Moyen | Import `RentMyCarLanding.tsx` |
| 6 | Ajouter title + meta dynamiques par route (react-helmet-async ou document.title) | **Élevé** | Moyen | `App.tsx` + chaque page |
| 7 | Ajouter `<link rel="canonical">` (au moins pour l’accueil) | Moyen | Faible | `index.html` ou composant SEO |
| 8 | Enrichir le sitemap : /sinistre-caution | Moyen | Faible | `public/sitemap.xml` |
| 9 | Remplacer "Mamoudzou, Mayotte" par "Nosy Be" dans VehicleDetails | Moyen | Faible | `VehicleDetails.tsx:1048` |
| 10 | Remplacer le toast "À bientôt sur MayCar !" dans Navbar | Faible | Faible | `navbar.tsx:69` |

---

# Annexes

## Fichiers modifiables principaux

| Fichier | Rôle |
|---------|------|
| `index.html` | Title, meta description, OG, Twitter cards (valeurs par défaut) |
| `src/pages/legal/Legal.tsx` | Contenu CGU, politique confidentialité (Mayotte/MayCar) |
| `src/pages/owner/RentMyCarLanding.tsx` | H1, "MayCar", import modal-animations |
| `src/pages/sinistre-caution/SinistreCaution.tsx` | Exemple de title/meta dynamiques |
| `src/components/layout/navbar.tsx` | Toast "MayCar" |
| `src/pages/vehicles/VehicleDetails.tsx` | Fallback "Mamoudzou, Mayotte" |
| `public/sitemap.xml` | Liste des URLs |
| `public/robots.txt` | Référence sitemap (déjà OK) |

## Références

- `DIAG-PERF-JS-CSS-IMAGES-HOME.md` — Performances
- `DIAG-PHASE1-IMAGES-PERF.md` — Audit images
