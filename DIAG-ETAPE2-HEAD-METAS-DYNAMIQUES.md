# Diagnostic Étape 2 — Gestion du head (title / meta / og / twitter / canonical)

**Objectif** : Comprendre l’architecture actuelle pour choisir la stratégie des metas dynamiques par route.

**Date** : 2025-02-20  
**Projet** : Rentanoo Nosy Be — location scooters Madagascar

---

## Résumé (TL;DR)

| Point | État |
|-------|------|
| **Framework** | Vite 5 + React 18 — SPA 100 % client-side |
| **Routing** | react-router-dom v6 — routes dans `App.tsx` |
| **Head actuel** | Statique dans `index.html` ; seule `/sinistre-caution` met à jour `document.title` et `meta description` via `useEffect` |
| **Libs head** | Aucune (pas de react-helmet, react-helmet-async) |
| **i18n** | react-i18next — langue via localStorage + navigator ; SEO strings uniquement pour sinistre-caution |
| **Canonical** | Absent dans le HTML ; redirection www→non-www côté serveur (301) |
| **Service Worker / PWA** | Aucun |
| **Recommandation** | **Option A (react-helmet-async)** — standard, déclaratif, gère og/twitter ; effort moyen |

---

## 1. Framework et mode de rendu

| Élément | Valeur |
|---------|--------|
| Framework | Vite 5.4 + React 18.3 |
| Build | `vite build` → sortie dans `dist/` |
| Mode de rendu | 100 % client-side (CSR) — pas de SSR/SSG |
| Point d’entrée | `src/main.tsx` → `createRoot` → `<App />` |
| HTML de base | `index.html` (à la racine du projet) |

**Fichiers clés** : `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

---

## 2. Routes & fichiers

### Router

- **Librairie** : `react-router-dom` v6.30
- **Configuration** : `BrowserRouter` dans `App.tsx` — toutes les routes dans `<Routes>`

### Routes principales et composants

| Route | Composant | Fichier | Note |
|-------|-----------|---------|------|
| `/` | Index | `src/pages/Index.tsx` | Import direct (pas lazy) |
| `/contact` | Contact | `src/pages/Contact.tsx` | Lazy |
| `/legal` | Legal | `src/pages/legal/Legal.tsx` | Lazy |
| `/rent-my-car` | RentMyCarLanding | `src/pages/owner/RentMyCarLanding.tsx` | Lazy |
| `/rent-my-car/register` | RentMyCarRegister | `src/pages/owner/RentMyCarRegister.tsx` | Lazy |
| `/sinistre-caution` | SinistreCaution | `src/pages/sinistre-caution/SinistreCaution.tsx` | Lazy — **seule page avec metas dynamiques** |
| `/vehicle/:license` | VehicleDetails | `src/pages/vehicles/VehicleDetails.tsx` | Lazy |
| `/moto/:license` | MotoVehicleDetails | `src/pages/vehicles/MotoVehicleDetails.tsx` | Lazy |
| `/auth/login` | Login | `src/pages/auth/Login.tsx` | Lazy |
| `/auth/register` | Register | `src/pages/auth/Register.tsx` | Lazy |
| `*` (404) | NotFound | `src/pages/NotFound.tsx` | Import direct |

### Paramètres dynamiques (routes véhicules)

- **Param** : `license` via `useParams<{ license: string }>()`
- **Données** : récupérées dans `loadVehicleData()` — appels `SupabaseVehiclesService.getAvailableVehicles()` puis filtre par licence
- **Fichiers** : `VehicleDetails.tsx` (véhicules/citadines), `MotoVehicleDetails.tsx` (motos)

---

## 3. État actuel du head

### a) Métas statiques dans `index.html`

| Balise | Valeur actuelle |
|--------|-----------------|
| `<title>` | Location scooter Nosy Be – Louer un scooter en ligne \| Rentanoo |
| `meta name="description"` | Louez votre scooter à Nosy Be en quelques clics. Livraison à l'aéroport ou à l'hôtel. Casques et assurance inclus. Réservation 100 % en ligne. |
| `og:title` | Idem title |
| `og:description` | Idem description |
| `og:type` | website |
| `og:image` | https://lovable.dev/opengraph-image-p98pqg.png (placeholder) |
| `twitter:card` | summary_large_image |
| `twitter:site` | @lovable_dev |
| `twitter:title` | Idem title |
| `twitter:description` | Idem description |
| `twitter:image` | lovable.dev (placeholder) |
| `canonical` | **Absent** |

### b) Page `/sinistre-caution` — SEO dynamique existant

La seule page qui adapte le head :

**Fichier** : `src/pages/sinistre-caution/SinistreCaution.tsx` (l.57–73)

```tsx
useEffect(() => {
  const metaTitle = t("sinistreCaution.metaTitle");
  const metaDescription = t("sinistreCaution.metaDescription");
  document.title = metaTitle;
  const metaDescEl = document.querySelector('meta[name="description"]');
  if (metaDescEl) {
    const prevContent = metaDescEl.getAttribute("content");
    metaDescEl.setAttribute("content", metaDescription);
    return () => { /* cleanup */ };
  }
  return () => { document.title = DEFAULT_TITLE; };
}, [t]);
```

**i18n (ex. fr)** :
- `sinistreCaution.metaTitle` : "Sinistre & caution | RENTANOO - Location Nosy Be"
- `sinistreCaution.metaDescription` : "En cas d'incident pendant votre location : procédure sinistre et caution, assurance CB, documents à fournir. Rentanoo vous accompagne."

**Limite** :  
- Pas de mise à jour des balises og:*/twitter:* (elles restent globales).  
- Pas de `link rel="canonical"`.  
- Cleanup au démontage du composant pour restaurer le titre/description par défaut.

### c) Autres pages

- **Index, Contact, Legal, RentMyCarLanding, VehicleDetails, MotoVehicleDetails, etc.** : aucune modification du head. Elles gardent les valeurs de `index.html`.

---

## 4. Internationalisation et contenu SEO

### i18n

| Élément | Détail |
|--------|--------|
| Lib | `react-i18next` + `i18next` + `i18next-browser-languagedetector` |
| Config | `src/i18n/config.ts` |
| Langues | FR (défaut), EN — IT et DE chargés à la demande |
| Détection | 1) localStorage `lang` 2) navigator |
| Fallback | FR |

### Strings SEO en i18n

- Seule la page **sinistre-caution** a des clés dédiées : `sinistreCaution.metaTitle`, `sinistreCaution.metaDescription` (fr, en, de, it).
- **Aucune** clé pour : legal, contact, rent-my-car, home, vehicle, moto.

### Choix de langue et SEO

- La langue est choisie côté client (localStorage + détection navigateur).
- Le crawler Google reçoit toujours le même HTML initial (index.html) et exécute le JS pour le contenu.
- Aucune URL spécifique par langue (`/fr/`, `/en/`, etc.) — les metas devront être adaptées à la langue active côté client au moment du rendu.

---

## 5. Contraintes "Google voit quoi ?"

| Aspect | Constat |
|--------|---------|
| HTML initial | `<body>` contient uniquement `<div id="root"></div>` — pas de H1 ni texte de contenu. Tout est injecté après exécution du JS. |
| Indexation | Google exécute le JS et indexe le contenu rendu (comportement classique des SPA). |
| Service Worker / PWA | Aucun fichier `sw.js`, `workbox`, ni `registerServiceWorker` — pas de cache SW. |
| Redirections | `www.rentanoo.com` → `rentanoo.com` (301) dans `server/index.ts` (l.46–60). |
| Trailing slash | Pas de redirection configurée — `/contact` et `/contact/` peuvent coexister (risque de contenu dupliqué si les deux répondent). |
| Cache HTML | En prod, `index.html` sert avec `Cache-Control: public, max-age=0, must-revalidate` — pas de cache longue durée pour le HTML. |

---

## 6. Fichiers à modifier pour les metas par page

| Fichier | Rôle |
|---------|------|
| `package.json` | Ajouter `react-helmet-async` (si Option A) |
| `index.html` | Garder les metas par défaut ; éventuellement ajouter `<HelmetProvider>` si Option A |
| `src/main.tsx` ou `App.tsx` | Envelopper l’app dans `HelmetProvider` (Option A) |
| `src/App.tsx` | Point central du routing — possiblement un composant `<PageHead>` basé sur la route |
| `src/pages/Index.tsx` | Ajouter Helmet / hook SEO pour la home |
| `src/pages/Contact.tsx` | Idem |
| `src/pages/legal/Legal.tsx` | Idem |
| `src/pages/owner/RentMyCarLanding.tsx` | Idem |
| `src/pages/sinistre-caution/SinistreCaution.tsx` | **Remplacer** le `useEffect` manuel par Helmet (éviter doublon) |
| `src/pages/vehicles/VehicleDetails.tsx` | Helmet dynamique avec données véhicule (licence, modèle, etc.) |
| `src/pages/vehicles/MotoVehicleDetails.tsx` | Idem |
| `src/pages/NotFound.tsx` | Title 404 |
| `src/i18n/locales/{fr,en,de,it}/common.json` | Ajouter clés meta pour chaque page (legal, contact, rent-my-car, home, vehicle, moto, 404) |

**Option B (gestion maison)** : créer un utilitaire `src/utils/seo.ts` ou `src/hooks/usePageMeta.ts` et l’utiliser dans chaque page ; `index.html` reste inchangé pour les valeurs par défaut.

---

## 7. Options recommandées

### Option A : react-helmet-async (recommandée)

**Principe** : librairie dédiée pour gérer le head de façon déclarative dans chaque page.

| Critère | Détail |
|---------|--------|
| Avantages | Déclaratif, gère title + meta + og + twitter + canonical ; API React standard ; nettoyage automatique au démontage ; bien maintenu. |
| Inconvénients | Dépendance supplémentaire ; un peu de surcoût à l’exécution (faible). |
| Effort | Moyen — 1 jour pour les pages principales + i18n. |
| Risques | Faible — comportement prévisible, bonne compatibilité avec les SPA. |

**Cas d’usage** : métas par page (title, description, og, twitter), canonical par URL.

---

### Option B : Gestion maison (document.title + util meta)

**Principe** : hook `usePageMeta(title, description)` qui met à jour `document.title` et la balise `meta[name="description"]` ; og/twitter mis à jour manuellement via `querySelector` / `setAttribute`.

| Critère | Détail |
|---------|--------|
| Avantages | Pas de dépendance ; contrôle total ; code minimal. |
| Inconvénients | og/twitter et canonical plus pénibles à gérer ; duplication de logique ; risque d’oubli de cleanup ou de meta. |
| Effort | Moyen — plus de code que l’Option A pour un résultat équivalent. |
| Risques | Moyen — bugs possibles (meta non mises à jour, doublons, oublis). |

**Cas d’usage** : si on souhaite éviter toute dépendance supplémentaire, ou si seuls title + description comptent.

---

### Option C : Passage à Next.js ou autre framework SSR/SSG

**Principe** : migrer vers un framework avec rendu côté serveur pour des metas par page générées dans le HTML initial.

| Critère | Détail |
|---------|--------|
| Avantages | HTML initial riche ; meilleur SEO ; prerender possible. |
| Inconvénients | Refactor important ; changement d’architecture ; risque de régression. |
| Effort | Élevé — plusieurs jours/semaines. |
| Risques | Élevés — migrations, routing, API, déploiement. |

**Cas d’usage** : projet à long terme avec forte priorité SEO ; actuellement non pertinent pour l’étape 2.

---

## Synthèse pour l’étape 2

| Priorité | Action |
|----------|--------|
| 1 | Adopter **react-helmet-async** (Option A) |
| 2 | Ajouter les clés SEO dans i18n pour chaque page concernée |
| 3 | Créer un composant ou hook réutilisable pour les pages statiques |
| 4 | Adapter VehicleDetails et MotoVehicleDetails pour des metas dynamiques (données véhicule) |
| 5 | Remplacer le `useEffect` manuel dans SinistreCaution par Helmet |
| 6 | Ajouter `link rel="canonical"` (au minimum sur les pages principales) |

**À ne pas faire dans cette étape** : migration SSR/SSG, optimisations SEO avancées non demandées.
