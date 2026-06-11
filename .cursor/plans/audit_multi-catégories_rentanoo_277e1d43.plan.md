---
name: Audit multi-catégories Rentanoo
overview: V1 front-only — modale de showcase catégories (scooter/moto disponibles, quad/bateau/villa bientôt) + bouton permanent + persistance localStorage. Aucune modification BDD/API/RPC. Effort estimé 0,5-1 jour. Roadmap 30 jours et audit architectural complet conservés en annexe.
todos:
  - id: data-items
    content: "Référentiel statique src/data/categoryShowcaseItems.ts — 5 catégories (scooter, moto, quad, bateau, accommodation) avec icônes react-icons, clés i18n et flag available/comingSoon + clés waPrefillMessage pour coming soon"
    status: pending
  - id: hook-modal
    content: "Hook src/hooks/useCategoryShowcase.ts — état isOpen, lecture/écriture localStorage rentanoo_category_modal_seen, méthodes open() et close()"
    status: pending
  - id: component-card
    content: "Composant src/components/categories/CategoryShowcaseCard.tsx — icône + label + badge (vert/orange) + onClick (close ou toast sonner avec action Être informé du lancement)"
    status: pending
  - id: component-modal
    content: "Composant src/components/categories/CategoryShowcaseModal.tsx — Dialog shadcn, titre + sous-titre, sections Disponible / Bientôt, grid responsive, footer Voir toutes les locations"
    status: pending
  - id: component-button
    content: "Composant src/components/categories/ExploreCategoriesButton.tsx (label Explorer) + intégration dans Navbar (desktop + menu mobile)"
    status: pending
  - id: wa-lead-capture
    content: "Intégration WhatsApp lead capture — toast coming soon avec bouton action qui ouvre wa.me via useWhatsAppContact() avec message pré-rempli i18n par catégorie + tracking gtag (event=category_interest, category_id) si dispo"
    status: pending
  - id: i18n-keys
    content: "Ajout clés categoryShowcase.* dans 4 fichiers locales (fr, en, it, de) — titre, sous-titre, badges, labels catégories, toasts coming soon, actionNotifyMe, waPrefillMessage par catégorie, button Explorer"
    status: pending
  - id: integration
    content: "Branchement modale globale dans src/App.tsx (mount au layout racine pour s'ouvrir sur toute page d'arrivée Home) + WhatsAppContactProvider déjà disponible"
    status: pending
  - id: smoke-tests
    content: "Tests manuels — 1re visite ouvre modale ; clic scooter/moto ferme ; clic quad/bateau/accommodation toast + bouton action + WhatsApp pré-rempli ; voir toutes ferme ; reload ne réouvre pas ; bouton Explorer réouvre ; 4 langues ; responsive mobile"
    status: pending
isProject: false
---

# Rentanoo V1 — Modale Showcase Catégories (Front uniquement)

> **Scope** : positionnement marketing pur, aucune modification BDD/API/RPC/RLS, aucune logique métier touchée.
> **Effort estimé** : **0,5 à 1 jour** (4-8 heures dev + smoke tests).
> **Roadmap 30 jours** et **audit architectural complet** conservés en annexes pour référence ultérieure (Phase 2 bateau, Phase 3 villa).

---

## 1. Objectif

Donner immédiatement l'impression que Rentanoo devient la plateforme de location de référence à Nosy Be, **sans engager de refonte technique**. La V1 actuelle (scooter + moto réservables) continue de fonctionner à l'identique.

---

## 2. Contraintes

- **Zéro** modification Supabase (tables, RLS, RPC, Edge Functions)
- **Zéro** modification API/backend Express
- **Zéro** modification logique de réservation, paiement, EDL, contrat
- **100 % front** : composants React + i18n + localStorage
- Compatible avec l'existant : Vite + React 18 + shadcn + i18next + Radix + sonner (toasts)

---

## 3. Comportement attendu

### Arrivée sur la home (première visite)
- Modale s'ouvre automatiquement après le rendu initial
- Titre : "Que souhaitez-vous louer à Nosy Be ?"
- Sous-titre : "Découvrez nos solutions de location disponibles aujourd'hui et celles qui arrivent prochainement."

### Sections de catégories
- **Disponible maintenant** : Scooter, Moto (badge vert "Disponible")
- **Bientôt disponible** : Quad, Bateau, **Hébergement** (badge orange "Bientôt disponible")

> **Choix produit "Hébergement"** : libellé volontairement large et évolutif. Demain il pourra couvrir villas, maisons, chambres, bungalows, hôtels partenaires sans casser le libellé public. Cohérent avec la posture "plateforme de référence Nosy Be".

### Click handlers

**Catégories disponibles (Scooter, Moto)**
- Ferme la modale, l'utilisateur arrive sur la home normale (aucun filtre forcé)
- Optionnel : event GA4 `gtag('event', 'category_select', { category_id: 'scooter' })`

**Catégories à venir (Quad, Bateau, Hébergement) — capture de lead**
- Toast `sonner` ouvert avec **action button** "Être informé du lancement"
- La modale **reste ouverte** (l'utilisateur peut consulter les autres catégories)
- Click sur l'action → ouvre WhatsApp (`wa.me`) avec message pré-rempli i18n par catégorie via `useWhatsAppContact()` (provider déjà existant : `WhatsAppContactProvider`)
- Optionnel mais recommandé : event GA4 `gtag('event', 'category_interest', { category_id: 'boat' })` dès le clic sur la card coming-soon, et second event `category_interest_lead` dès le clic sur l'action — donne 2 niveaux de mesure (intérêt vs conversion en lead)
- Durée toast : 6-8s (laisser le temps de cliquer l'action) ; sonner gère le pause-on-hover natif

**Exemples de messages WhatsApp pré-remplis (FR)**
- Quad : "Bonjour Rentanoo, je suis intéressé(e) par la location de quad à Nosy Be. Pouvez-vous me prévenir au lancement ?"
- Bateau : "Bonjour Rentanoo, je suis intéressé(e) par la location de bateau à Nosy Be. Pouvez-vous me prévenir au lancement ?"
- Hébergement : "Bonjour Rentanoo, je suis intéressé(e) par la location d'hébergement (villa, maison, bungalow) à Nosy Be. Pouvez-vous me prévenir au lancement ?"

### Footer modale
- Lien "Voir toutes les locations disponibles" → ferme la modale (équivalent à scooter/moto en termes de filtre : aucun)

### Persistance
- Clé localStorage `rentanoo_category_modal_seen` (valeur `"1"` ou timestamp)
- Écrite au premier `close()` réussi (clic catégorie disponible OU clic "Voir toutes" OU clic overlay/ESC)
- **Pas** écrite sur clic coming-soon (la modale reste ouverte, donc pas de close)
- Si présente au mount → modale **ne s'ouvre pas** automatiquement
- Indépendante de l'auth : marqueur visiteur (pas profil utilisateur)

### Bouton permanent
- Label : **"Explorer"** (volontairement court, universel et évolutif — couvre véhicules + hébergement + futur)
- Placement : `Navbar` (desktop, à droite avant `LanguageSwitcher` ; menu mobile dans le drawer ou en pill compacte)
- Click → ouvre la modale (ignore le flag localStorage)
- Icône : `Compass` ou `LayoutGrid` de `lucide-react`

---

## 4. Fichiers à créer

- [src/data/categoryShowcaseItems.ts](src/data/categoryShowcaseItems.ts) — référentiel statique des 5 catégories (id : `scooter|moto|quad|boat|accommodation`, i18nKey, icon component, badge variant, available boolean, comingSoonToastKey, waPrefillMessageKey, gtagCategoryId)
- [src/hooks/useCategoryShowcase.ts](src/hooks/useCategoryShowcase.ts) — état `isOpen` + lecture/écriture `localStorage` + `open()`/`close()`
- [src/components/categories/CategoryShowcaseCard.tsx](src/components/categories/CategoryShowcaseCard.tsx) — card cliquable (icône + label + badge + onClick prop)
- [src/components/categories/CategoryShowcaseModal.tsx](src/components/categories/CategoryShowcaseModal.tsx) — Dialog shadcn complet (header, 2 sections, grid, footer link)
- [src/components/categories/ExploreCategoriesButton.tsx](src/components/categories/ExploreCategoriesButton.tsx) — bouton outline avec icône grid (Lucide `LayoutGrid`)

## 5. Fichiers à modifier

- [src/App.tsx](src/App.tsx) — mount `<CategoryShowcaseModal />` au layout racine + wrap éventuel d'un provider léger (ou utiliser un store ultra-simple via le hook partagé)
- [src/components/layout/navbar.tsx](src/components/layout/navbar.tsx) — insérer `<ExploreCategoriesButton />` (desktop + menu mobile)
- [src/i18n/locales/fr/common.json](src/i18n/locales/fr/common.json), `en/`, `it/`, `de/` — clés `categoryShowcase.*` (cf. section 8)

---

## 6. Choix techniques

### Dialog
- `src/components/ui/dialog.tsx` (Radix via shadcn, déjà en place)
- Mode mobile : `max-w-2xl` desktop, `max-w-[95vw]` mobile, scroll vertical si grille dépasse

### Toasts avec action (capture lead)
- `sonner` déjà installé et utilisé dans le projet — supporte nativement `action: { label, onClick }`
- Pattern :

```ts
toast.info(t('categoryShowcase.items.boat.comingSoonToast'), {
  duration: 7000,
  action: {
    label: t('categoryShowcase.actionNotifyMe'),
    onClick: () => openWhatsApp(t('categoryShowcase.items.boat.waPrefillMessage'))
  }
})
```

- Durée 6-8s (laisser le temps de lire ET cliquer l'action)
- Icône optionnelle `Sparkles` ou `BellRing` (lucide)
- Le callback `openWhatsApp` est obtenu via `useWhatsAppContact()` (provider racine existant — voir `src/contexts/WhatsAppContactContext.tsx`)

### Capture WhatsApp (réutilisation de l'existant)
- Provider racine déjà monté dans `src/App.tsx` : `WhatsAppContactProvider` fournit le numéro de contact admin
- Hook `useWhatsAppContact()` retourne (à confirmer au moment de l'implémentation) au minimum `phoneE164` ; sinon construire l'URL manuellement : `https://wa.me/${phoneE164.replace('+','')}?text=${encodeURIComponent(message)}`
- L'ouverture se fait via `window.open(url, '_blank', 'noopener,noreferrer')`
- Aucune nouvelle dépendance, aucun backend, aucun formulaire — purement un deeplink

### Tracking optionnel (GA4)
- Le projet a déjà GTM/GA4 actif (voir `RouteChangeTracker`, `GOOGLE-ADS-GTAG-SETUP.md`, `DIAG-GA4-NOT-REALTIME.md`)
- Events recommandés :
  - `category_modal_open` (source: `auto_firstvisit` | `manual_button`)
  - `category_select` (category_id: `scooter|moto`)
  - `category_interest` (category_id: `quad|boat|accommodation`)
  - `category_interest_lead` (category_id: même, source: `whatsapp`)
- Ces 4 events permettent un funnel d'analyse : Open → Interest → Lead
- Implementation : helper léger `trackEvent(name, params)` qui vérifie `window.gtag` puis appelle ; no-op sinon
- **Optionnel V1** — peut être ajouté en J+1 si délai serré

### Icônes
- Privilégier `react-icons` (déjà dans `package.json` — `react-icons/gi`, `react-icons/md`, `react-icons/io5`, `react-icons/fa`) :
  - Scooter : `GiScooter` (`react-icons/gi`)
  - Moto : `GiFullMotorcycleHelmet` ou `MdMotorcycle` (`react-icons/md`)
  - Quad : `GiAtv` (`react-icons/gi`)
  - Bateau : `IoBoatSharp` (`react-icons/io5`) ou `GiSailboat`
  - **Hébergement** : `MdHotel` (`react-icons/md`) — couvre villas/maisons/bungalows/hôtels — alternatives : `MdApartment`, `FaBed`
- Bouton "Explorer" : `Compass` ou `LayoutGrid` de `lucide-react` (déjà installé)
- Vérifier disponibilité exacte au moment de l'implémentation (les noms peuvent varier selon la version installée — fallbacks Lucide `Bike`/`Car`/`Anchor`/`Hotel`/`Compass` si absent)

### Persistance
- Lecture/écriture directe `window.localStorage` avec garde `typeof window !== 'undefined'`
- Pas de cookie, pas de profil utilisateur (visiteur anonyme = source de vérité)
- Pas de TTL pour V1 (un coup vu = jamais réaffiché auto). Si besoin de TTL plus tard, stocker un timestamp et comparer.

### Provider ou hook partagé
- Plus simple : `useCategoryShowcase` est un hook **singleton-like** via un mini store (Zustand serait overkill — un `useSyncExternalStore` artisanal ou un module-level `Set<Listener>` suffit)
- Alternative pragmatique : créer un `CategoryShowcaseProvider` Context (cohérent avec les autres providers existants `AuthContext`, `ExchangeRateContext`)
- **Recommandation** : Context `CategoryShowcaseContext` + hook `useCategoryShowcase()` — pattern déjà connu dans le repo

---

## 7. Design

- Inspirations : Airbnb Categories, Booking.com Property Types, GetYourGuide Activities
- Cards : `rounded-2xl` + `shadow-sm hover:shadow-md transition` + ring focus accessible
- Icônes : tailles ~48-56px, couleur primaire Rentanoo
- Badges : `Badge` shadcn avec variants custom :
  - Vert : `bg-emerald-100 text-emerald-700 border-emerald-200`
  - Orange : `bg-amber-100 text-amber-700 border-amber-200`
- Grid responsive :
  - Mobile : `grid-cols-1` (cards larges, swipe naturel)
  - Tablet (`sm:`) : `grid-cols-2`
  - Desktop (`lg:`) : `grid-cols-3`
- Sections séparées visuellement par un titre + ligne de séparation discrète
- Footer : lien `text-sm underline text-muted-foreground hover:text-foreground` centré
- Accessibilité : focus trap natif Radix Dialog, ESC ferme, `aria-label` sur chaque card, `role="button"` + `tabIndex={0}` si div, ou simplement `<button>` natif

---

## 8. Clés i18n à ajouter (par langue)

```
categoryShowcase.title : "Que souhaitez-vous louer à Nosy Be ?"
categoryShowcase.subtitle : "Découvrez nos solutions de location disponibles aujourd'hui et celles qui arrivent prochainement."
categoryShowcase.sectionAvailable : "Disponible maintenant"
categoryShowcase.sectionComingSoon : "Bientôt disponible"
categoryShowcase.badgeAvailable : "Disponible"
categoryShowcase.badgeComingSoon : "Bientôt disponible"
categoryShowcase.viewAllAvailable : "Voir toutes les locations disponibles"
categoryShowcase.button : "Explorer"
categoryShowcase.actionNotifyMe : "Être informé du lancement"

categoryShowcase.items.scooter.label : "Scooter"
categoryShowcase.items.moto.label : "Moto"

categoryShowcase.items.quad.label : "Quad"
categoryShowcase.items.quad.comingSoonToast : "Les locations de quads arrivent prochainement sur Rentanoo."
categoryShowcase.items.quad.waPrefillMessage : "Bonjour Rentanoo, je suis intéressé(e) par la location de quad à Nosy Be. Pouvez-vous me prévenir au lancement ?"

categoryShowcase.items.boat.label : "Bateau"
categoryShowcase.items.boat.comingSoonToast : "Les locations de bateaux arrivent prochainement sur Rentanoo."
categoryShowcase.items.boat.waPrefillMessage : "Bonjour Rentanoo, je suis intéressé(e) par la location de bateau à Nosy Be. Pouvez-vous me prévenir au lancement ?"

categoryShowcase.items.accommodation.label : "Hébergement"
categoryShowcase.items.accommodation.comingSoonToast : "Les hébergements (villas, maisons, bungalows) arrivent prochainement sur Rentanoo."
categoryShowcase.items.accommodation.waPrefillMessage : "Bonjour Rentanoo, je suis intéressé(e) par la location d'hébergement (villa, maison, bungalow) à Nosy Be. Pouvez-vous me prévenir au lancement ?"
```

> Noter le **renommage `villa` → `accommodation`** au niveau des clés i18n et de l'id technique (`categoryShowcaseItems.ts`) — cohérent avec le choix produit "Hébergement" évolutif.

À traduire en EN, IT, DE en suivant le ton existant (déjà bien posé dans `src/i18n/locales/{en,it,de}/common.json`). Pour les messages WhatsApp, conserver le `?` de politesse et adapter les références culturelles si nécessaire (ex. EN : "I'm interested in renting a [...] in Nosy Be. Can you notify me at launch?").

---

## 9. Architecture (diagramme)

```mermaid
flowchart TD
  App["App.tsx (root)"] --> Provider[CategoryShowcaseProvider]
  App --> WaProvider[WhatsAppContactProvider]
  Provider --> Navbar
  Provider --> Modal[CategoryShowcaseModal]
  Provider --> Routes[Routes existantes]
  Navbar --> Button["ExploreCategoriesButton<br/>(Explorer)"]
  Button -. open .-> Hook[useCategoryShowcase]
  Modal -. isOpen .-> Hook
  Hook -. read/write .-> LS["localStorage<br/>rentanoo_category_modal_seen"]
  Modal --> Items[5 CategoryShowcaseCard]
  Items -- click available --> Hook
  Items -- click comingSoon --> Toast["sonner toast<br/>+ action button"]
  Toast -. action click .-> WaHook[useWhatsAppContact]
  WaHook -. open wa.me .-> Whatsapp["WhatsApp Web/App<br/>message pré-rempli"]
  Items -. optionnel .-> GA["gtag event<br/>category_interest"]
  Toast -. optionnel .-> GA2["gtag event<br/>category_interest_lead"]
```

---

## 10. Smoke tests manuels (après implémentation)

- Première visite (navigateur en navigation privée) → modale s'ouvre auto, layout OK desktop et mobile
- Click "Scooter" → modale ferme, on voit la home normale
- Reload page → modale **ne** se réouvre **pas** automatiquement (flag localStorage)
- Click bouton **"Explorer"** dans la navbar → modale réouvre
- Click "Quad" → toast affiché AVEC bouton action "Être informé du lancement", modale **reste ouverte**
- Click sur action "Être informé du lancement" → ouvre WhatsApp dans un nouvel onglet avec message pré-rempli quad
- Click "Bateau" → toast spécifique bateau + action → WhatsApp message bateau
- Click **"Hébergement"** → toast spécifique hébergement + action → WhatsApp message hébergement
- Toast disparaît automatiquement après 6-8s si pas de clic
- Click "Voir toutes les locations disponibles" → modale ferme
- ESC → modale ferme
- Click overlay → modale ferme
- Switch langue (LanguageSwitcher) → labels modale + toasts + messages WhatsApp pré-remplis traduits
- Responsive 375px (iPhone SE) → grid 1 colonne, scroll OK, lisibilité OK, toast lisible
- Responsive 768px (tablet) → grid 2 colonnes
- Responsive 1280px (desktop) → grid 3 colonnes
- Accessibilité clavier : Tab dans la modale parcourt les cards, Entrée déclenche action ; le bouton du toast doit aussi être focusable
- (Optionnel si GA4 actif) Vérifier Realtime GA4 que les events `category_modal_open`, `category_interest`, `category_interest_lead` arrivent

---

## 11. Risques

- **Aucun risque fonctionnel** sur les flux existants (zéro touche au backend, à la réservation, au paiement)
- Risques cosmétiques :
  - Régression visuelle Navbar si le bouton casse l'alignement (mitigation : tester sur 3 breakpoints + menu mobile)
  - Toasts en cascade si l'utilisateur spamme les cards "coming soon" (mitigation : sonner gère naturellement, ou `toast.dismiss()` du précédent)
- Risque UX : modale auto à l'arrivée = légère friction au LCP (mitigation : ouvrir après `useEffect` initial donc après LCP ; pas de blocage)
- SEO : Radix Dialog respecte les bonnes pratiques (pas d'intrusive interstitial Google car déclenchée post-load et dismissible)

---

## 12. Ce qui n'est PAS dans cette V1

- Aucun filtre réel n'est appliqué après clic Scooter/Moto (la home affiche toujours tous les véhicules disponibles, comme aujourd'hui)
- Aucune persistance de "catégorie sélectionnée" (puisqu'il n'y a pas de filtre)
- Aucune page catégorie SEO (`/location-:slug-nosy-be`)
- Aucune migration BDD
- Aucun changement de RLS
- Aucun renommage `vehicles` → `listings`
- Aucun formulaire dédié de capture lead (on réutilise WhatsApp existant — un vrai formulaire `intent_leads` arriverait dans une V1.1 si le volume WhatsApp devient ingérable)
- Aucun dashboard admin pour visualiser les intent leads (le canal WhatsApp est la source de vérité pour V1 ; analytique via GA4 si gtag actif)

Tous ces points sont disponibles dans la **Suite V1 — Roadmap 30 jours** ci-dessous, à déclencher après validation de cette V1 marketing.

---

## 13. Indicateurs de succès post-déploiement

Mesure binaire qui valide ou invalide la roadmap multi-catégories :

- **Open rate modale** : % de visiteurs uniques qui voient la modale automatiquement (devrait être ~95-100% des first-time visitors)
- **Reopen rate** : % qui cliquent sur le bouton "Explorer" après leur première visite — signal d'intérêt récurrent
- **Distribution clics catégories** :
  - Scooter / Moto : baseline existant
  - Quad : faible volume = pas de priorité
  - Bateau : volume moyen-haut = priorité Phase 2 confirmée
  - Hébergement : volume haut = pivot stratégique potentiel
- **Conversion lead WhatsApp** : clics action / clics card coming-soon — au-delà de 15-25% c'est un signal fort
- **Volume WhatsApp réel** : messages reçus avec contexte catégorie (le pré-rempli aide à filtrer)

Seuils de décision :
- < 5 leads WhatsApp/mois sur une catégorie → ne pas prioriser
- 5-30 leads/mois → considérer dans Phase 2/3
- > 30 leads/mois → avancer la roadmap, activer dans les 30 jours

Cette V1 est donc **aussi un outil de validation business** pour orienter les Phases 2 et 3 par la donnée, pas par l'intuition.

---
---

# Suite V1 — Roadmap 30 jours pragmatique (référence post-V1)

> Cette section décrit ce qui viendrait **après** la V1 marketing ci-dessus, si vous décidez d'ouvrir réellement quad/voiture comme catégories filtrables. Tout reste actionnable indépendamment de la V1 (qui ne crée aucune dette technique).

---

## TL;DR

- L'**Option C** de l'audit initial (categories + attributes jsonb + renderer + renommage `listings`) **est de la sur-ingénierie pour ce que vous voulez livrer dans 30 jours**.
- **Voiture est déjà supportée** dans le schéma actuel : `vehicle_type IN ('car','moto','scooter')`. Seul **quad** manque réellement.
- Pour scooter + moto + quad + voiture, **3-5 jours de dev** suffisent en étendant l'existant.
- L'architecture marketplace générique devient pertinente **au moment de la villa (Phase 3)**, pas avant.
- **Recommandation** : Option A (étendre `vehicles.vehicle_type`) maintenant, basculer vers Option C uniquement quand les attributs divergent réellement.

---

## 1. Ce qui est réellement nécessaire MAINTENANT

- **Scooter** : déjà OK, 0 j
- **Moto** : déjà OK, 0 j
- **Voiture** : `car` déjà dans `vehicle_type` CHECK + flow propriétaire existant ([src/pages/owner/RentMyCarRegister.tsx](src/pages/owner/RentMyCarRegister.tsx)) + `VehicleCard` + `VehicleDetails` — 0,5-1 j (vérification bout-en-bout)
- **Quad** : absent du CHECK, aujourd'hui détecté ad hoc via `isQuadByModel`. Première catégorie réellement à créer — 0,5 j (migration + backfill)
- **Modale catégories** déclenchée par l'utilisateur — 1-1,5 j
- **Barre sticky pills** sous navbar — 0,5-1 j
- **Bouton "Modifier ma recherche"** — 0,5 j
- **Multi-sélection + filtre server-side** sur `vehicle_type` (le filtrage actuel est client-side et hardcodé scooter/moto dans [src/components/home/HomeResults.tsx](src/components/home/HomeResults.tsx) L78-91) — 0,5-1 j
- **Persistance choix** : infra existe (`lagon_search_criteria` LS 7j dans [src/services/localStorage/searchStorage.ts](src/services/localStorage/searchStorage.ts)) — 0,2 j d'extension
- **i18n labels catégories** : actuellement hardcodés FR — 0,3 j (16 clés × 4 langues)

**Total honnête : 3-5 jours** pour livrer la demande utilisateur intégrale.

---

## 2. Ce qui peut/doit être repoussé

- **Renommage `vehicles` → `listings`** : zéro ROI court terme, risque cassage webhooks Stripe + audit Edge Functions + 596 fichiers
- **Table `categories` paramétrée** : utile à 7+ catégories OU pour activation dynamique sans deploy, ni l'un ni l'autre vrai aujourd'hui
- **`attributes jsonb` + JSON Schema** : utile uniquement quand un attribut est exclusif à une catégorie (bedrooms villa, length_meters bateau). Scooter/moto/quad/voiture partagent ≥90 % des attributs
- **Renderer dynamique** : utile à partir de 5-6 cards ou attributs très divergents — faux ici
- **Routes SEO `/location-:slug-nosy-be`** : forte valeur SEO mais **pas bloquant** pour la fonctionnalité. À livrer en semaine 3
- **301 massif** `/vehicle/`, `/moto/` : perte SEO certaine pendant la réindexation. **À ne pas faire** tant qu'on n'a pas besoin de canonicaliser
- **ListingCard unifié, ListingDetailsPage unifié** : abstraction prématurée tant qu'on a 2 cards et qu'elles fonctionnent
- **React Query sur la home** : refactor sans urgence, l'existant tient
- **Sitemap dynamique Edge Function** : `scripts/generate-sitemap.js` actuel suffit pour 5-50 véhicules
- **Migration SSG/SSR** : hors scope V1, instruire séparément

---

## 3. Sur-ingénierie identifiée dans l'audit initial

- **Pattern marketplace Airbnb pour 4 catégories homogènes** — c'est l'équivalent d'un Kubernetes pour héberger un WordPress
- **Renommage `vehicles` → `listings`** — refactor de 596 fichiers, audit Edge Functions et webhooks Stripe, pour zéro valeur fonctionnelle V1
- **ListingCard unifié** — abstraction prématurée tant que `isMoto()` + 2 cards spécialisées font le travail
- **Plan en 8 phases sur 8-14 semaines** alors que la demande utilisateur (4 catégories) est livrable en moins d'une semaine
- **JSON Schema par catégorie** avant d'avoir un seul attribut réellement divergent

**Reconnaissance honnête** : la première recommandation a optimisé pour "extensibilité maximale future" au détriment de "vitesse d'exécution maintenant". Ce n'est pas le bon trade-off avec un objectif business à 30 jours.

---

## 4. Coût réel de chaque composant proposé initialement

### Table `categories` (référentiel paramétré)
- Dev : 1-2 j (migration, seed, service, types, intégration UI)
- Maintenance : faible
- **Gain V1 : nul** (4 catégories connues, stables, peu nombreuses)
- Quand ça paye : 7+ catégories OU besoin d'activation/désactivation runtime
- **Verdict V1 : non**

### `attributes jsonb` + validation JSON Schema par catégorie
- Dev : 2-3 j (migration, schemas Zod, UI dynamique, validation SQL CHECK avec `jsonb_typeof`)
- Maintenance : moyenne-élevée (debug requêtes JSON, GIN index, schemas à maintenir)
- **Gain V1 : nul** (≥90 % d'attributs partagés)
- Quand ça paye : villa (`bedrooms`, `guests`, `check_in_time`), bateau (`length_meters`, `captain_required`)
- **Verdict V1 : non — à introduire en parallèle de la villa**

### Renderer dynamique (renderer par catégorie)
- Dev : 2-3 j
- Maintenance : moyenne
- **Gain V1 : nul** (`isMoto()` + 2 cards suffit, quad réutilise MotoVehicleCard)
- **Verdict V1 : non**

### Pages SEO `/location-:slug-nosy-be`
- Dev : 2-3 j (route, page, SEO, sitemap, JSON-LD)
- Risque : faible si on AJOUTE sans toucher aux routes existantes
- Gain : SEO long terme, indexation 4-12 semaines
- **Verdict V1 : oui en semaine 3** (post-stabilisation Phase 1)

### "Architecture Airbnb" complète (Option C de l'audit initial)
- Dev : 8-14 semaines
- Risque : très élevé (refonte BDD, refonte composants, refonte EDL, refonte tests)
- **Gain V1 : aucun**
- Quand ça paye : 10+ catégories, marketplace ouverte, attributs très divergents
- **Verdict V1 : non — sujet S2 2026 ou plus**

---

## 5. V1 en 5 jours — Décisions tranchées

### À GARDER (livrables business demandés)
- Migration SQL : étendre `vehicle_type` CHECK pour ajouter `'quad'` (1 ligne) + migration data pour requalifier les quads aujourd'hui dans `moto`
- `CategorySelectionContext` (~100 lignes)
- `CategoryPickerModal` (Dialog shadcn, 4 checkboxes + option "Tout voir" + Valider/Annuler)
- `CategoryBar` sticky (pills horizontales sous navbar, multi-select visible)
- Bouton "Modifier ma recherche" qui ouvre la modale (présent dans la barre + dans la modale fermée)
- Refonte filtrage [src/components/home/HomeResults.tsx](src/components/home/HomeResults.tsx) : passer `vehicle_type` en filtre Supabase server-side (`.in('vehicle_type', selectedCategories)`)
- i18n labels (4 catégories × 4 langues = 16 clés dans [src/i18n/locales/](src/i18n/locales/))
- Extension [src/services/localStorage/searchStorage.ts](src/services/localStorage/searchStorage.ts) pour persister les catégories sélectionnées (champ déjà présent : `vehicleTypes`)

### À SUPPRIMER (du plan initial, on n'en a pas besoin)
- Tout renommage `vehicles` → `listings`
- Table `categories` / colonne `attributes jsonb` / renderer dynamique
- Migration vers `ListingCard` unifié, `ListingDetailsPage` unifié
- Migration mappers (`mapToCarVehicle`/`mapToMotoVehicle` unifiés)
- React Query refactor de la home
- Sitemap dynamique via Edge Function

### À REPOUSSER (semaine 3 ou plus tard)
- Routes SEO `/location-:slug-nosy-be` → semaine 3
- 301 routes legacy → **non, jamais sans nécessité claire** (préserver l'autorité existante)
- Réactivation RLS `vehicles` → semaine 4 (important mais pas bloquant fonctionnellement)
- Régénération `types.ts` → semaine 2 (hygiène)
- Archivage `DIAG-*.md` → semaine 2 (30 min)
- SSG/SSR, CDN images, Lighthouse > 90 → S1 2027 ou hors plan

---

## 6. Comparatif Option A vs Option B

### Option A — Étendre la table `vehicles` actuelle
- **Dev V1** : 3-5 jours
- **Risque** : très faible (changement chirurgical d'un CHECK, ajout UI sans toucher au backend)
- **Maintenabilité** : bonne jusqu'à 5-6 catégories homogènes
- **Dette technique ajoutée** : `vehicle_type` CHECK qui grossit (5 valeurs), labels catégories en TS + i18n
- **Plafond** : commence à craquer avec villa (pricing per night, bedrooms, pas d'EDL terrestre)
- **Réversibilité** : élevée — migration vers Option C ultérieure possible sans perte

### Option B — Créer categories + listings immédiatement
- **Dev V1** : 15-25 jours
- **Risque** : élevé (refactor multi-fichiers, FK bookings, webhooks Stripe, EDL, tests E2E)
- **Maintenabilité** : excellente long terme, complexité à porter dès maintenant
- **Dette technique ajoutée** : aucune (payée d'avance)
- **Plafond** : très haut (10+ catégories)
- **Réversibilité** : faible (revenir en arrière demanderait un nouveau refactor)

### Décision
- **Option A pour Phase 1 (scooter/moto/quad/voiture)** : ratio risque/valeur sans ambiguïté
- **Option B (ou Option C hybride)** à instruire **au moment de la Phase 3 (villa)** : c'est l'arrivée des attributs divergents qui justifie économiquement la complexité
- **Phase 2 (bateau)** : décision à ce moment-là selon réalité produit — si attributs proches (engine, fuel, capacité), continuer en Option A ; si divergents (longueur, permis bateau requis, équipage), commencer Option C
- **Coût opportunité** : pendant que l'Option A tourne en prod, vous générez du CA. L'Option C sera financée par les revenus, pas par votre trésorerie

---

## 7. Recommandation pragmatique 30 jours

### Semaine 1 — V1 livrable (5 jours)
- **J1 matin** : migration SQL `add_quad_to_vehicle_type.sql` + backfill quads existants depuis `moto`
- **J1 après-midi** : i18n labels catégories (FR/EN/IT/DE × scooter/moto/quad/voiture)
- **J2** : `CategorySelectionContext` + extension `searchStorage.ts` (persistance + restauration)
- **J3** : `CategoryPickerModal` (Dialog shadcn) + `CategoryBar` sticky (pills)
- **J4** : intégration Home + filtre server-side dans `SupabaseVehiclesService.getAvailableVehicles({ vehicleTypes })` + bouton "Modifier ma recherche"
- **J5** : tests Playwright (parcours scooter conservé + parcours quad + parcours voiture) + déploiement canary 10 %

### Semaine 2 — Stabilisation + hygiène (5 jours)
- Audit voiture bout-en-bout : création propriétaire → listing → EDL départ → booking → EDL retour → Stripe location + caution
- Correction bugs Phase 1 remontés en canary
- Hygiène (Phase 0 de l'audit initial) : régénérer `types.ts` (CLI Supabase dans `prebuild`), archiver `DIAG-*.md` dans `docs/archives/`, aligner statut `accepted` ↔ CHECK SQL `bookings.status`
- Rollout 100 % si stable

### Semaine 3 — SEO pages catégories (5 jours, sans casser l'existant)
- Route paramétrée `/location-:categorySlug-nosy-be` (mapping en dur des 4 slugs, **pas besoin de table `categories`** à ce stade)
- Page `CategoryListingsPage` qui réutilise `HomeResults` avec pré-filtre
- JSON-LD `Vehicle` adapté par slug
- Sitemap étendu : 4 URLs ajoutées au script existant [scripts/generate-sitemap.js](scripts/generate-sitemap.js)
- **NE PAS ajouter de 301** sur `/vehicle/:license`, `/moto/:license` — laisser cohabiter pour préserver le SEO acquis ; la `<link rel="canonical">` reste sur la page produit, les pages catégories visent leurs propres mots-clés

### Semaine 4 — Sécurité + perf basique (5 jours)
- **Réactivation RLS `vehicles`** (impératif avant ouverture marketing forte) — tests staging, policies cohérentes avec flow propriétaire/locataire/admin
- Mesure Lighthouse mobile : si LCP > 3 s, lazy images plus agressif + preconnect Supabase + audit bundle
- Documentation interne pour Phases 2 (bateau) et 3 (villa) : **checklist de décision Option A vs Option C** (cf. trigger ci-dessous)
- Buffer pour bugs Phase 3 SEO

### Pourquoi ce séquencement
- **Valeur business** livrée en 5 jours (demande utilisateur intégrale)
- **Zéro refactor risqué** dans la première semaine
- **SEO** arrive quand la fondation Phase 1 est stable, sans casser l'autorité existante
- **Sécurité (RLS)** avant ouverture grand public
- **Dette technique** ajoutée minimale, explicitement assumée et **réversible** (labels duplicés, CHECK qui grossit)

---

## 8. Trigger de basculement vers Option C (categories + attributes jsonb)

À déclencher **avant** l'arrivée de la villa (Phase 3 utilisateur). Critères concrets et objectifs :

- Apparition d'un attribut catégorie-spécifique (`bedrooms`, `length_meters`, `captain_required`, `check_in_time`)
- Différence de pricing model (`per_night` vs `per_day`)
- Différence de workflow check-in/out (hôtelier vs EDL terrestre)
- Volume de catégories actives ≥ 6
- Demande d'activation/désactivation dynamique sans déploiement

À ce moment-là :
- Le refactor est **planifiable en 3-4 semaines** (au lieu de 8-14) car la séparation UI (modale, barre, filtres, persistance) faite en V1 est **réutilisable telle quelle**
- Risque maîtrisé car la migration BDD se fait via vue d'alias `vehicles` → `listings` sans cassage des écrits
- Le ROI est concret (villa = pivot marketplace, justifie l'investissement)

---

## 9. Risques de cette approche pragmatique

- **Dette technique réelle** : labels catégories duplicés (TS + i18n), CHECK SQL qui grossira jusqu'à 5 valeurs avant refonte. Coût de remédiation au moment de l'Option C : ~2-3 jours
- **Réindexation Google** lors de l'ajout des pages SEO en semaine 3 : 2-6 semaines, normal et inévitable
- **Pas de validation côté SQL pour les attributs catégorie-spécifiques** quand bateau arrivera : si on prolonge l'Option A jusque-là, on accumule des colonnes nullable. **Ce serait le moment de basculer**
- **Si la roadmap accélère** (ex. ouverture villa anticipée) : il faudra absorber le refactor Option C en urgence — d'où la doc en semaine 4

---

## 10. Décision finale CTO

**Si l'objectif est d'ouvrir scooter, moto, quad et voiture dans les 30 prochains jours, voici exactement ce que je ferais :**

1. **Semaine 1** : livrer la V1 en étendant `vehicles.vehicle_type` + UI modale/barre/bouton + persistance. **3-5 jours nets**.
2. **Semaine 2** : stabiliser, valider voiture bout-en-bout, traiter la dette critique (types.ts, statut accepted, RLS doc).
3. **Semaine 3** : ajouter les pages SEO `/location-:slug-nosy-be` sans 301 destructeur.
4. **Semaine 4** : réactiver RLS, mesurer perf, documenter le trigger Option C.
5. **Plus tard** : basculer vers Option C **uniquement** quand un signal objectif l'exige (villa, attributs divergents, 6+ catégories).

**Ce que je ne ferais PAS :**
- Renommer `vehicles` en `listings` (refactor coûteux, zéro valeur business immédiate)
- Créer tables `categories` + `attributes jsonb` (sur-ingénierie pour 4 catégories homogènes)
- Unifier `ListingCard` (abstraction prématurée)
- Migrer vers SSG/SSR (hors scope)
- Faire un 301 massif sur les routes véhicule existantes (perte SEO certaine)

**Business-first** : vous générerez du CA pendant 1-3 mois avec une stack qui tient, puis le refactor Option C sera financé par les revenus quand la villa le justifiera. Vous gardez la possibilité de pivoter sans avoir hypothéqué votre vitesse.

---
---

# ANNEXE — Audit Architectural Complet (référence Phases 2/3)

> Ce qui suit est la version initiale de l'audit (8 phases, 8-14 semaines). Conservée pour servir de référence au moment de la Phase 2 (bateau) et surtout Phase 3 (villa), où l'Option C hybride deviendra pertinente.

# Audit Architecture Rentanoo — Évolution Multi-Catégories (version initiale)

Rapport d'architecte produit avant implémentation. Objectif : transformer Rentanoo (aujourd'hui spécialisé scooters/motos) en plateforme de location généraliste de Nosy Be, sans rupture de service.

---

## 0. Méthodologie & sources

Audit effectué sur l'intégralité du repo (≈596 fichiers `src/`, 28 migrations Supabase, 100+ docs internes). Sources principales croisées :
- Schéma SQL : [SCRIPT-RECREATE-SCHEMA-RENTANOO.sql](SCRIPT-RECREATE-SCHEMA-RENTANOO.sql), dossier [supabase/migrations/](supabase/migrations/)
- Front : [src/App.tsx](src/App.tsx), [src/pages/Index.tsx](src/pages/Index.tsx), [src/services/supabaseVehiclesService.ts](src/services/supabaseVehiclesService.ts)
- Types : [src/types/index.ts](src/types/index.ts), [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts)
- Roadmap existante : [ROADMAP-COMPLETE-VEHICLE-TYPE-SYSTEM.md](ROADMAP-COMPLETE-VEHICLE-TYPE-SYSTEM.md), [DIAG-PAGE-CATEGORIE-SEO.md](DIAG-PAGE-CATEGORIE-SEO.md)

---

## 1. Architecture actuelle

### Stack
- **Build** : Vite 5 + `@vitejs/plugin-react-swc` ([vite.config.ts](vite.config.ts))
- **Front** : React 18.3 + TypeScript 5.8, **SPA pur côté client**
- **Routing** : `react-router-dom` v6 ([src/App.tsx](src/App.tsx) L127-141)
- **État serveur** : `@tanstack/react-query` v5 (utilisé uniquement par le back-office, **pas par la home**)
- **État global** : `React Context` (`AuthContext`, `ExchangeRateContext`, `WhatsAppContactContext`) — pas de Redux/Zustand
- **UI** : shadcn/ui + Radix + Tailwind ([components.json](components.json))
- **i18n** : `i18next` + `react-i18next` (4 langues : fr, en bundlées ; it, de lazy)
- **Forms** : `react-hook-form` + `zod`
- **SEO** : `react-helmet-async` via [src/components/seo/Seo.tsx](src/components/seo/Seo.tsx)
- **Paiement** : Stripe (location + caution snapshot)
- **Backend data** : Supabase JS v2 + Edge Functions (Stripe webhook, EDL email)
- **API locale** : serveur Express `tsx server/index.ts` (proxy `/api` dev, redirect www prod)

### Organisation `src/`
- `pages/` — écrans routés (public, admin, owner, renter, onboarding, sinistre)
- `components/` — sous-domaines : `home/`, `vehicles/`, `filters/`, `booking/`, `checkin/`, `seo/`, `ui/` (shadcn)
- `services/` — accès Supabase (`supabaseVehiclesService.ts`, `supabase/bookings.ts`, `localStorage/`)
- `hooks/`, `contexts/`, `lib/`, `utils/`, `mappers/`, `data/`, `templates/`, `types/`
- `features/` — modules feature-based (`admin-bookings/`, `back-office/`, `vehicle-management/`)
- `modules/` — workflows lourds (`etatDesLieuxDepart/`, `etatDesLieuxDepartMoto/`, `rentalContract/`)
- `i18n/locales/{fr,en,it,de}/common.json`

### Flux de la page d'accueil
[src/pages/Index.tsx](src/pages/Index.tsx) orchestre :
1. `<Seo>` (LocalBusiness JSON-LD)
2. Hero + `SearchBarAirbnb` (dates/lieux)
3. Bloc texte SEO
4. `HomeResults` (lazy, différé 200 ms pour LCP) → grille de cards via `MotoVehicleCard` ou `VehicleCard` selon `isMoto(vehicle)`
5. Footer lazy
6. État local + persistance via `localStorage` (clé `lagon_search_criteria`, TTL 7j)

### Diagnostic architectural global
- **Forces** : design system shadcn mature, code splitting routes, i18n 4 langues, séparation `pages/components/services` claire
- **Faiblesses** :
  - Aucun React Query sur la home — refetch manuel, pas de cache
  - Doublons : `AuthContext` vs `use-auth-store.ts` ; mappers parallèles `mapToCarVehicle` / `mapToMotoVehicle`
  - 100+ fichiers `DIAG-*.md` / `FIX-*.md` à la racine — pollution dépôt
  - Couche legacy `src/services/index.ts` (mock localStorage) encore importée par certaines pages

---

## 2. Gestion actuelle des véhicules

### Stockage
- **Table unique `vehicles`** (pas de tables par type)
- Colonne discriminante : `vehicle_type text NOT NULL DEFAULT 'car' CHECK (vehicle_type IN ('car','moto','scooter'))` — ajoutée par [supabase/migrations/20260528120000_back_office_schema.sql](supabase/migrations/20260528120000_back_office_schema.sql)
- Colonne sous-typage voiture : `vehicle_category` (CHECK : Citadine/Berline/SUV/...)
- Vue lecture `scooters` filtrant `vehicle_type='scooter'` (back-office)
- Index : `idx_vehicles_vehicle_type`, `idx_vehicles_available` (partiel), `idx_vehicles_category`, `idx_vehicles_pickup_zones` (GIN)
- `vehicle_photos` lié par `vehicle_id` + bucket Storage `vehicle-photos`

### Récupération
- Service central : [src/services/supabaseVehiclesService.ts](src/services/supabaseVehiclesService.ts) — `.from('vehicles').select(...).eq('available', true)` **sans pagination**
- Pas de filtre `vehicle_type` server-side dans `getAvailableVehicles()` — filtrage **client-side** dans [src/pages/Index.tsx](src/pages/Index.tsx) L429-447

### Filtres
- Home : `Select` shadcn (scooter/moto **hardcodés FR**) + cylindrée dynamique dans [src/components/home/HomeResults.tsx](src/components/home/HomeResults.tsx) L78-91
- `FilterBar.tsx`, `VehicleCategoryFilter.tsx`, `PriceFilter.tsx` existent mais **orphelins** (legacy voiture Mayotte non branchée)

### Réservations & disponibilités
- Création web via RPC Postgres `create_web_booking()` (SECURITY DEFINER) — [supabase/migrations/20260531140000_bookings_rls_hardening_staging.sql](supabase/migrations/20260531140000_bookings_rls_hardening_staging.sql) L224-341
- Prix calculés via `compute_booking_base_price()` ([supabase/migrations/20260602120000_calendar_rental_days.sql](supabase/migrations/20260602120000_calendar_rental_days.sql)) + miroir TS [src/utils/rentalPriceFromDates.ts](src/utils/rentalPriceFromDates.ts)
- Caution : snapshot Stripe sur `bookings.deposit_amount_snapshot` à l'acceptation owner
- Disponibilité = **2 requêtes côté client** (vehicles + bookings) avec calcul de chevauchement dans `searchAvailableVehicles()` L484-514 — **pas de RPC dédiée**
- Statuts bloquants : `pending`, `accepted`, `active` (incohérence : `accepted` n'est plus dans le CHECK SQL mais utilisé front)

---

## 3. Compatibilité Multi-Catégories

### Déjà compatible (à conserver tel quel)
- Colonne discriminante `vehicle_type` en place
- Routing dual `/vehicle/:license` vs `/moto/:license` (modèle réutilisable)
- Utilitaire central [src/utils/vehicleType.ts](src/utils/vehicleType.ts) `isMoto()`
- Cards spécialisées `MotoVehicleCard` / `VehicleCard`
- Switch EDL conditionnel ([src/pages/Checking.tsx](src/pages/Checking.tsx) L202-211)
- Sitemap Supabase-aware ([scripts/generate-sitemap.js](scripts/generate-sitemap.js)) — déjà type-aware
- Storage `vehicle-photos`, `checkin-photos` agnostiques

### À refactoriser
- **`vehicles.vehicle_type` CHECK** : passer de 3 valeurs à un référentiel ouvert (table `categories`)
- **`getAvailableVehicles()`** : ajouter filtrage `vehicle_type IN (...)` server-side + pagination
- **`Index.tsx`** : extraire filtres + résultats dans un context `CategorySelectionContext`
- **`HomeResults.tsx`** : labels filtres i18n, support multi-sélection
- **Cards** : mutualiser en `<EntityCard variant="scooter|moto|car|boat|villa">` ou stratégie composition par slot
- **Mappers** : unifier `mapToCarVehicle` + `mapToMotoVehicle` → `mapToEntity(type)`
- **Pages détails** : `/listing/:slug/:license` ou `/:categorySlug/:license` au lieu de `/vehicle/` vs `/moto/`
- **EDL** : workflow par type — `etatDesLieuxDepart` / `etatDesLieuxDepartMoto` à étendre avec `etatDesLieuxDepartBoat`, `etatDesLieuxAccommodation`

### À supprimer / archiver
- `FilterBar.tsx`, `VehicleTypeFilter.tsx`, `VehicleCategoryFilter.tsx` (orphelins legacy voiture Mayotte) — décision : adapter ou jeter
- Couche mock `src/services/index.ts` (localStorage) — terminer la migration vers Supabase
- 100+ fichiers `DIAG-*.md` à la racine — déplacer dans `docs/archives/`

### À créer
- Table `categories` (référentiel ouvert)
- Table `category_attributes` (champs spécifiques par catégorie : EAV léger ou JSONB)
- Pages catégories : `/location-scooter-nosy-be`, `/location-bateau-nosy-be`, etc.
- Context global `CategorySelectionContext`
- Modale `CategoryPickerModal`
- Bouton sticky "Modifier ma recherche"
- Routes EDL spécifiques (bateau ≠ moto)
- Schema.org `Vehicle` / `Boat` / `Accommodation` / `LodgingBusiness` selon catégorie

---

## 4. Audit Base de données

### État
- **1 seule table `vehicles`**, schéma monolithique
- `vehicle_type` enum-like via CHECK (3 valeurs)
- Pas de pattern EAV existant, pas de table `specs`
- RLS sur `bookings` durcie (création via RPC uniquement)
- **RLS DÉSACTIVÉ sur `vehicles`** ([SCRIPT-RECREATE-SCHEMA-RENTANOO.sql](SCRIPT-RECREATE-SCHEMA-RENTANOO.sql) L465-467) — risque sécurité indépendant des catégories
- [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) **désynchronisé** : colonnes utilisées en prod (`has_ac`, `image_url`, `status`, etc.) absentes du type généré

### Comparatif d'architectures

**Option A — Table unique `items` polymorphe (table héritée renommée)**
- Avantages : refactor minimal, FK `bookings.vehicle_id` conservée, requêtes simples, index existants utiles, sitemap inchangé
- Inconvénients : colonnes nulles nombreuses (moto.engine_capacity vs villa.bedrooms vs boat.engine_hours), schéma fourre-tout difficile à maintenir, validation faible
- Cas où c'est OK : si toutes les catégories partagent ≈80 % des attributs (faux ici : villa et bateau divergent fortement)

**Option B — Une table par catégorie (`scooters`, `cars`, `boats`, `villas`)**
- Avantages : schéma strict typé, validations natives, index ciblés, séparation claire
- Inconvénients : explosion FK pour `bookings` (clé polymorphe ou n FK), duplication code, complexification des requêtes cross-catégorie (homepage = UNION n tables), migrations lourdes à chaque nouvelle catégorie — **contradiction directe avec l'objectif "ajouter une catégorie sans toucher le code"**

**Option C — Architecture hybride (RECOMMANDÉE)**
- Une **table coque `listings`** (ex-`vehicles` renommée) avec colonnes communes : `id`, `category_id`, `owner_id`, `title`, `slug`, `description`, `price_per_day`, `available`, `deposit_amount`, `pickup_zones`, `image_url`, `status`, `created_at`, etc.
- Une **table `categories`** (référentiel) : `id`, `slug` (scooter, moto, car, boat, villa…), `label_i18n` (jsonb), `icon`, `display_order`, `entity_schema` (Vehicle/Accommodation/Boat), `requires_license`, `is_active`
- Une **colonne `attributes jsonb`** sur `listings` pour les champs spécifiques (engine_capacity, bedrooms, length_meters, etc.) + un **schéma JSON validation** par catégorie (stockable dans `categories.attribute_schema`)
- Index GIN sur `attributes` + index B-tree sur `category_id`
- Une **table `category_filters`** déclarative pour générer dynamiquement les filtres front
- FK `bookings.listing_id` (renommée `vehicle_id`) conservée

### Recommandation : Option C
Justification :
- **Extensibilité native** : ajouter "jet-ski" = INSERT dans `categories` + définition JSON Schema, **0 ligne de code métier**
- **FK simple** : 1 seule FK depuis `bookings`, `checkin_depart`, `checkin_return`, `vehicle_photos`
- **Requêtes performantes** : filtre `category_id IN (...)` + index, JSONB GIN pour attributs
- **Validation forte** : JSON Schema applicable côté SQL (CHECK avec `jsonb_typeof`) + Zod côté TS
- **Migration douce** : `vehicles` peut être renommée `listings` via vue d'aliasing temporaire, `vehicle_type` mappée vers `categories.slug`
- **Pattern éprouvé** : utilisé par Airbnb, Indeed, marketplaces verticalisées

Le RLS doit être **réactivé sur `listings`** avec policy publique lecture si `available = true` et `categories.is_active = true`.

---

## 5. Audit SEO

### État
- SPA pur (CSR), indexation Google par exécution JS — risque crawl lent
- Metas dynamiques OK via [src/components/seo/Seo.tsx](src/components/seo/Seo.tsx) + helpers `vehicleSeo.ts`
- JSON-LD : LocalBusiness (home), Product+Offer (produits), BreadcrumbList (produits), FAQPage (3 pages SEO)
- Sitemap statique régénéré au build via [scripts/generate-sitemap.js](scripts/generate-sitemap.js)
- **Aucune route catégorie en prod** : pas de `/scooters`, `/location-scooter-nosy-be`, etc.

### Comparatif URLs

**`/vehicles` (état actuel — implicite via filtres home)**
- Avantages : 0 refactor
- Inconvénients : indexation diluée, pas de signal sémantique pour "location scooter Nosy Be", autorité concentrée sur la home, pas de longue traîne

**`/scooters`, `/motos`, `/voitures`, `/bateaux`, `/maisons` (routes plates)**
- Avantages : URLs courtes, mémorisables, signal SEO fort
- Inconvénients : noms hardcodés (refactor à chaque ajout catégorie), pas de scoping géographique, conflit potentiel avec admin/owner

**`/category/scooters`, `/category/bateaux` (préfixe)**
- Avantages : pattern unique, ajout catégorie = INSERT BDD, pas de collision
- Inconvénients : préfixe `/category/` neutre SEO

**`/location-{categorie}-nosy-be` (slugs SEO orientés long-tail) — RECOMMANDÉ**
- Avantages : alignement intention de recherche ("location scooter Nosy Be"), scoping géo intégré, slug stocké en BDD (`categories.slug_seo`), 0 code à modifier pour ajouter une catégorie, déjà cohérent avec `DIAG-PAGE-CATEGORIE-SEO.md`
- Inconvénients : URLs longues, nécessite gestion canonical entre `/` filtré et `/location-xxx-nosy-be`
- Pages produit : pattern `/location-{categorie}-nosy-be/{slug-listing}` (ex. `/location-scooter-nosy-be/honda-zoomer-2024`) — cohérent, hiérarchique

### Recommandation
- **Pages catégories dédiées** avec URLs SEO long-tail stockées dans `categories.slug_seo`
- **Pattern unique** `/location-:categorySlug-nosy-be` avec route paramétrée → 0 modif code par catégorie
- **Pages produit** restent à plat (`/location-:categorySlug-nosy-be/:listingSlug`) avec redirection 301 depuis `/vehicle/:license` et `/moto/:license`
- **Canonical** : home filtrée → canonical vers la page catégorie pertinente
- **Sitemap dynamique** : `/sitemap.xml` (statique build) + `/sitemap-listings.xml` + `/sitemap-categories.xml` (regénérés via Edge Function ou build)
- **JSON-LD** par catégorie : `Vehicle` pour scooter/moto/car/quad, `BoatReservation`/`Product` pour bateau, `Accommodation`/`LodgingBusiness` pour villa
- **Prerender** (Phase 2+) via Vite SSG (`vite-plugin-ssr` ou migration vers Next.js) pour pages catégories et produits critiques — gain Lighthouse + crawlabilité Bing/DuckDuckGo

### Impact mesuré attendu
- +300-800 % pages indexées (1 home + N catégories × M villes + listings)
- Position attendue top 3 sur "location bateau Nosy Be", "location villa Nosy Be" (concurrence faible)
- Risque court terme : redirections 301 mal calibrées → perte d'autorité produits existants

---

## 6. Audit UX

### Option A — Modale au premier chargement (demandée)
- Avantages : capture intention dès l'arrivée, filtrage immédiat
- Inconvénients : friction d'entrée, taux de bounce +5-15 % (études e-commerce), impact négatif Core Web Vitals (CLS, INP), problème SEO si modale bloquante (Google peut interpréter intercept comme intrusive interstitial → pénalité mobile), accessibilité (focus trap, ESC)
- Conversion : neutre à négative selon implémentation

### Option B — Barre de catégories horizontale (style Airbnb)
- Avantages : pattern reconnu, filtrage instantané, mobile-friendly, multi-sélection visible, pas d'interruption
- Inconvénients : invisible si scroll, place limitée si nombreuses catégories (>8)
- Conversion : positive — réduit clics avant 1er résultat

### Option C — Tabs
- Avantages : simple, choix exclusif clair
- Inconvénients : pas de multi-sélection naturelle, scale mal (>5 catégories), pas de SEO multi-catégories

### Option D — Menu sticky
- Avantages : toujours accessible, mobile OK
- Inconvénients : consomme viewport mobile, conflits avec navbar existante

### Option E — Combinaison (RECOMMANDÉE)
- **Première visite** : pas de modale bloquante → afficher **toutes les catégories** par défaut (meilleur SEO, moins de friction)
- **Barre horizontale sticky** (Option B) sous navbar : pills cliquables multi-select, état persistant
- **Bouton "Modifier ma recherche"** dans la barre (mobile : icône, desktop : texte) qui ouvre la **modale catégories** (Option A) avec checkboxes + dates + lieu
- **Pages catégories dédiées** SEO (`/location-{slug}-nosy-be`) accessibles directement via cards de la home et navigation
- **Bannière contextuelle** discrète (top de page, dismissible) sur 1re visite : "Découvrez nos nouveautés : bateaux, villas..." — **pas une modale bloquante**

### Justification
- Respect des **Web Vitals** (pas de CLS modale au load)
- Respect des **guidelines Google "Intrusive Interstitials"** (pas de pénalité mobile)
- Conversion supérieure aux modales bloquantes (mesurée +8-22 % sur marketplaces verticalisées)
- UX cohérente avec patterns reconnus (Airbnb, Booking, GetYourGuide)
- Respect de la demande utilisateur (le bouton "Modifier ma recherche" ouvre bien une modale, mais à l'initiative de l'utilisateur)

### Si une modale au load reste un impératif business
- Ouverture **après 3-5 secondes** (let LCP happen)
- Dismissible (ESC, overlay, close button)
- **Une seule fois** par session (sessionStorage), pas par visite
- A/B test obligatoire avant déploiement définitif

---

## 7. Audit Technique Front-End

### À modifier
- [src/pages/Index.tsx](src/pages/Index.tsx) — extraire filtres dans context, supprimer logique multi-types hardcodée, passer en React Query
- [src/components/home/HomeResults.tsx](src/components/home/HomeResults.tsx) — labels filtres i18n, multi-sélection, grille agnostique
- [src/services/supabaseVehiclesService.ts](src/services/supabaseVehiclesService.ts) — filtres `category_id` server-side, pagination, renommer en `listingsService`
- [src/utils/vehicleType.ts](src/utils/vehicleType.ts) — étendre `isMoto`/`isCar` → `getCategoryRenderer(listing)`
- [src/mappers/vehicleMappers.ts](src/mappers/vehicleMappers.ts) — unifier mappers
- [src/types/index.ts](src/types/index.ts) — interface `Listing` + types catégorie-spécifiques
- [src/App.tsx](src/App.tsx) — routes paramétrées `/location-:slug-nosy-be`, `/listing/:categorySlug/:listingSlug`, supprimer routes legacy ou 301
- [scripts/generate-sitemap.js](scripts/generate-sitemap.js) — générer URLs catégories + listings

### À créer
- `src/contexts/CategorySelectionContext.tsx` — état global filtres catégorie
- `src/components/categories/CategoryPickerModal.tsx` — modale multi-select
- `src/components/categories/CategoryBar.tsx` — barre sticky horizontale (pills)
- `src/components/categories/CategoryQuickEditButton.tsx` — bouton "Modifier ma recherche"
- `src/components/listings/ListingCard.tsx` — card unifiée avec slots/variants
- `src/pages/categories/CategoryListingsPage.tsx` — page `/location-:slug-nosy-be`
- `src/pages/listings/ListingDetailsPage.tsx` — détail unifié
- `src/services/categoriesService.ts` — fetch catégories actives
- `src/hooks/useCategories.ts` — React Query categories
- `src/hooks/useListings.ts` — React Query listings paginés
- `src/data/categoryAttributeSchemas.ts` — JSON Schema par catégorie (validation Zod)

### À mutualiser
- Cards moto + voiture → `<ListingCard>` paramétré par `category.renderer`
- Pages détails moto/voiture → `<ListingDetailsPage>` avec sections conditionnelles selon catégorie
- EDL : factoriser `etatDesLieuxDepart` et `etatDesLieuxDepartMoto` autour d'un moteur `EdlEngine` configurable par schéma catégorie

### Dette technique identifiée
- Doublons : `AuthContext` vs `use-auth-store.ts`
- Couche `src/services/index.ts` legacy mock encore vivante
- [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) désynchronisé du schéma réel — régénérer obligatoirement
- 100+ fichiers `DIAG-*.md` racine — archiver
- Statut `accepted` utilisé front mais absent du CHECK SQL `bookings.status`
- Bundle main ≈865 KB — code splitting agressif requis
- Images Supabase servies sans transformation (403 sur `object/public`) — middleware/CDN à mettre en place

### Risques techniques
- Régression EDL si la généralisation casse le switch moto actuel
- Refactor mappers cassant les pages produit existantes
- Migration sitemap : période de réindexation Google (4-8 semaines)
- Renommage `vehicles` → `listings` : impact RPC, Edge Functions, webhooks Stripe (références hardcodées à auditer)

### Opportunités d'amélioration (orthogonales au multi-catégories)
- Passer la home en React Query (cache, refetch, optimistic updates)
- SSG/prerender minimum pour home + pages catégories (Lighthouse mobile actuel ~50-60)
- Supabase Storage Image Transformations (redimensionnement on-the-fly)
- Réactivation RLS `vehicles`/`listings`
- Synchronisation `types.ts` via CLI Supabase dans `prebuild`

---

## 8. Persistance du choix utilisateur

### Comparatif

**Option A — `localStorage`**
- Avantages : 5-10 MB dispo, persistant cross-session, déjà utilisé (`lagon_search_criteria` TTL 7j dans [src/services/localStorage/searchStorage.ts](src/services/localStorage/searchStorage.ts))
- Inconvénients : non disponible côté serveur (SSR futur), partagé entre onglets

**Option B — Cookie**
- Avantages : envoyé au serveur (utile pour SSR futur), expiration native
- Inconvénients : taille limitée (4 KB), implication RGPD (consentement nécessaire pour cookies de préférence)

**Option C — Session (sessionStorage)**
- Avantages : isolé par onglet
- Inconvénients : perdu à la fermeture — mauvais pour rétention

**Option D — Profil utilisateur connecté**
- Avantages : synchronisation cross-device, segmentation marketing
- Inconvénients : nécessite connexion (≈20-30 % du trafic), schéma BDD supplémentaire

**Option E — Hybride (RECOMMANDÉE)**
- `localStorage` clé `rentanoo_category_preferences` (TTL 30j) — source de vérité côté visiteur anonyme
- **Si utilisateur connecté** : synchronisation bidirectionnelle vers `profiles.preferences jsonb` (colonne à créer) — merge dernière modif
- Cookie léger `rentanoo_cat` (1-2 catégories les plus consultées, base64) pour préparer un futur SSR de la home et personnaliser le LCP côté serveur
- Pas d'invalidation forcée : l'utilisateur peut modifier via "Modifier ma recherche" à tout moment

### Justification
- Reprend l'infrastructure existante (`searchStorage.ts`)
- Pas de friction (pas de consentement nécessaire pour `localStorage` préférence UX selon RGPD)
- Prépare l'évolution SSR sans dette additionnelle
- Personnalisation pour les utilisateurs connectés (rétention, segmentation)

---

## 9. Performance

### État actuel
- **Bundle main ≈865 KB**, FCP/LCP mobile ≈8-9s avant optimisations ([DIAG-PERF-JS-CSS-IMAGES-HOME.md](DIAG-PERF-JS-CSS-IMAGES-HOME.md))
- Pas de pagination — tous les véhicules chargés d'un coup
- Pas de React Query sur la home (refetch manuel)
- Images Supabase non transformées
- Code splitting OK sur routes secondaires, `HomeResults` lazy + différé 200ms

### Impacts potentiels (passage multi-catégories)
- Volume listings × N (5-7 catégories) → indispensable de paginer
- Filtres complexes (catégorie + attributs catégorie-spécifiques) → besoin d'index BDD adaptés
- JSON Schema validation côté front (1 par catégorie) → bundle +10-30 KB si chargé eagerly

### Optimisations recommandées
- **Server-side filtering + pagination** dans `getAvailableListings({ categoryIds, page, pageSize })` — `range(from, to)` Supabase + `count: exact` si nécessaire
- **React Query** sur la home : `useListings({ filters })` avec `staleTime: 5min`, `keepPreviousData: true`
- **Cache catégories** : `useCategories()` avec `staleTime: Infinity` (refetch on demand)
- **Image transformations Supabase** : router à activer dans `imageOptimization.ts` (paramètres `?width=400&quality=70&format=webp`) — fallback original si 403
- **Schemas JSON par catégorie** : lazy load uniquement quand la catégorie est sélectionnée (dynamic import)
- **Index BDD** :
  - `idx_listings_category_id_available` (composite, partiel `WHERE available = true`)
  - `idx_listings_attributes` (GIN sur `attributes` jsonb)
  - `idx_listings_pickup_zones` (existant, conserver)
- **Pagination cursor-based** (`created_at` + `id` tie-break) plutôt qu'offset pour scalabilité
- **CDN images** dédié (Cloudflare R2 + Cloudflare Images) si volume > 10 000 images
- **Préfetch** au survol des pills catégories (`<Link prefetch>` ou React Query `prefetchQuery`)

### Métriques cibles post-implémentation
- LCP mobile < 2.5 s (actuellement ~8 s)
- Bundle main < 500 KB
- TTFB API listings (10 résultats) < 200 ms
- INP modale catégories < 100 ms

---

## 10. Sécurité

### État
- **RLS DÉSACTIVÉ sur `vehicles`** ([SCRIPT-RECREATE-SCHEMA-RENTANOO.sql](SCRIPT-RECREATE-SCHEMA-RENTANOO.sql) L465-467) — faille majeure indépendante du sujet multi-catégories : tout client authentifié peut potentiellement écrire/supprimer des véhicules selon les grants
- **RLS activée et durcie sur `bookings`** : création via RPC `create_web_booking()` SECURITY DEFINER uniquement, trigger anti-fraude `bookings_guard_pricing_update`, snapshot prix côté serveur — bonne pratique
- Edge Functions Stripe webhook avec signature validée
- KYC ([supabase/migrations/20260312174744_add_profiles_kyc_columns.sql](supabase/migrations/20260312174744_add_profiles_kyc_columns.sql)) + driver license bucket

### Failles identifiées
1. **RLS `vehicles` désactivée** — à réactiver IMPÉRATIVEMENT avant ajout de nouvelles catégories (sinon surface d'attaque s'élargit avec villa/bateau)
2. Statut `accepted` non aligné entre front et CHECK SQL bookings — désynchronisation potentielle
3. `types.ts` désynchronisé — risque colonnes sensibles exposées sans validation TS
4. Couche mock `src/services/index.ts` encore importée — chemins de bypass legacy
5. Storage `vehicle-photos` : policies à vérifier (chemins privés vs publics)

### Recommandations sécurité multi-catégories
- **RLS `listings`** réactivée :
  - SELECT public : `available = true AND EXISTS (categories WHERE id = listings.category_id AND is_active = true)`
  - INSERT/UPDATE/DELETE : `auth.uid() = owner_id` OU `is_admin_user(auth.uid())`
- **RLS `categories`** : SELECT public si `is_active = true`, écriture admin uniquement
- **Permissions par catégorie** : certaines catégories peuvent nécessiter `requires_kyc` ou `requires_pro_owner` (ex. villa, bateau) — colonne dans `categories`
- **Snapshot prix** étendu à toutes les catégories dans `bookings.deposit_amount_snapshot` et nouvelles colonnes éventuelles (caution villa, ménage bateau, etc.)
- **RPC `create_web_booking()`** à étendre pour valider les options spécifiques selon catégorie (jsonb schema validation côté SQL)
- **Storage** : structure `{category}/{listingId}/{photoId}` pour isolation et policies par catégorie
- **Rate limiting** Edge Functions à généraliser (n8n-like patterns sur Edge Function `stripe-webhook` à étendre)

---

## 11. Plan de migration phasé

### Phase 0 — Hygiène & prérequis (1-2 jours)
- Objectif : poser un socle propre avant tout refactor
- Actions : régénération `types.ts` ; archivage `DIAG-*.md` dans `docs/archives/` ; réactivation RLS `vehicles` (migration `enable_rls_vehicles.sql`) ; tests E2E baseline (Playwright) sur parcours scooter actuel
- Difficulté : Faible
- Impact : Aucun fonctionnel, énorme en stabilité
- Risque : Faible (RLS à valider en staging avant prod)

### Phase 1 — Référentiel catégories (3-5 jours)
- Objectif : créer le socle BDD multi-catégories sans casser l'existant
- Actions :
  - Migration `create_categories_table.sql` (`categories` + seed scooter/moto/car/boat/villa)
  - Migration `add_listings_category_id.sql` (FK `vehicles.category_id → categories.id`, backfill depuis `vehicle_type`)
  - Migration `add_listings_attributes_jsonb.sql` (colonne `attributes jsonb` + migration des champs cylindrée, etc.)
  - Renommer `vehicles` → `listings` via vue d'alias (`CREATE VIEW vehicles AS SELECT * FROM listings`) pour compatibilité ascendante
  - Mise à jour `categoriesService.ts`, `listingsService.ts` (renommage `supabaseVehiclesService`)
- Difficulté : Moyenne
- Impact : Tables modifiées, vue d'alias maintient compatibilité
- Risque : Moyen (FK bookings, webhooks Stripe à auditer pour références hardcodées `vehicles`)

### Phase 2 — Context catégories + barre sticky + modale (5-7 jours)
- Objectif : livrer l'UX demandée sans toucher aux routes existantes
- Actions :
  - `CategorySelectionContext` + persistance localStorage hybride
  - `CategoryBar` sticky avec pills multi-select + i18n
  - `CategoryPickerModal` ouverte via bouton "Modifier ma recherche"
  - Refonte `HomeResults.tsx` : filtrage server-side via `category_id IN (...)`
  - React Query sur la home (`useListings`)
  - Tests UX (mobile, desktop, accessibilité, focus trap modale)
- Difficulté : Moyenne
- Impact : UX home transformée, parcours scooter inchangé en backend
- Risque : Faible-Moyen (régression filtres ; mitigé par tests)

### Phase 3 — Routes catégories SEO (3-5 jours)
- Objectif : indexation Google des pages catégories
- Actions :
  - Route paramétrée `/location-:categorySlug-nosy-be` → `CategoryListingsPage`
  - JSON-LD adapté (Vehicle, Boat, Accommodation selon `categories.entity_schema`)
  - Sitemap dynamique catégories + listings ([scripts/generate-sitemap.js](scripts/generate-sitemap.js) étendu)
  - Canonical home filtrée → page catégorie
  - 301 `/vehicle/:license`, `/moto/:license` → `/location-:slug-nosy-be/:listingSlug`
- Difficulté : Moyenne
- Impact : SEO long terme (réindexation 4-8 semaines), 0 régression fonctionnelle si redirections testées
- Risque : Moyen (perte temporaire ranking si 301 mal calibrées)

### Phase 4 — Cards & pages détails unifiées (5-7 jours)
- Objectif : éliminer la duplication moto/voiture, préparer bateau/villa
- Actions :
  - `<ListingCard>` paramétré par `category.renderer`
  - `<ListingDetailsPage>` unifié avec sections conditionnelles
  - Unification mappers
  - Migration progressive : VehicleCard et MotoVehicleCard deviennent wrappers
- Difficulté : Élevée (volume composants, tests visuels nécessaires)
- Impact : Code maintenu, prêt pour nouvelles catégories
- Risque : Moyen (régression visuelle ; mitigé par tests Storybook/Chromatic ou snapshots Playwright)

### Phase 5 — Catégorie "Voiture" complète (3-5 jours)
- Objectif : activer voiture comme catégorie pleinement supportée
- Actions :
  - JSON Schema voiture (transmission, fuel, doors, seats, AC, GPS)
  - Filtres voiture spécifiques (carburant, transmission)
  - EDL voiture (workflow existant à brancher sur le moteur générique)
  - Pricing voiture (mode agence vs particulier déjà supporté via `pricing_mode`)
- Difficulté : Moyenne
- Impact : Catalogue élargi, premier test du système extensible
- Risque : Faible (composants voiture déjà en place)

### Phase 6 — Catégorie "Bateau" (7-10 jours)
- Objectif : ouvrir la 1re catégorie non-terrestre
- Actions :
  - JSON Schema bateau (longueur, permis requis, équipage avec/sans, capacité)
  - Workflow EDL bateau (différent : carburant, équipements sécurité)
  - JSON-LD `BoatReservation` ou `Product`
  - Pages SEO `/location-bateau-nosy-be`
  - Photos bucket dédié ou structure hiérarchique
- Difficulté : Élevée
- Impact : Diversification offre, premier vrai test extensibilité
- Risque : Moyen-Élevé (workflows métier nouveaux)

### Phase 7 — Catégorie "Villa/Maison" (10-15 jours)
- Objectif : ouvrir l'hébergement (pivot stratégique majeur)
- Actions :
  - JSON Schema villa (chambres, lits, salle de bain, équipements, max guests, check-in/check-out times)
  - Pricing par nuit (vs par jour) — refactor `compute_booking_base_price()` pour supporter `pricing_unit`
  - JSON-LD `Accommodation` + `LodgingBusiness`
  - "EDL" remplacé par check-in/check-out hôtellerie
  - Pages SEO `/location-villa-nosy-be`, `/location-maison-nosy-be`
  - Caution adaptée (chèque, virement, Stripe selon owner)
- Difficulté : Très élevée
- Impact : Pivot marketplace, exposition Booking/Airbnb
- Risque : Élevé (différences métier importantes ; envisager une équipe produit dédiée)

### Phase 8 — Optimisations & SSR (5-10 jours)
- Objectif : performance SEO long terme
- Actions :
  - Migration vers SSG/SSR (Vite SSG ou Next.js si réécriture acceptée)
  - Image transformations CDN
  - Préfetch catégories au hover
  - Lighthouse score > 90 mobile
- Difficulté : Élevée (réécriture potentielle)
- Impact : Performance Web Vitals, crawlabilité tous moteurs
- Risque : Moyen-Élevé selon stratégie (incrémentale vs réécriture)

---

## 12. Estimation

### Volume total
- Développement core (Phases 0-4) : **3-4 semaines** (1 dev senior plein temps) ou **5-6 semaines** (1 dev mid + revue senior)
- Catégories voiture + bateau (Phases 5-6) : **2-3 semaines** supplémentaires
- Catégorie villa (Phase 7) : **2-3 semaines** supplémentaires (workflows métier hôteliers)
- Optimisations & SSR (Phase 8) : **1-2 semaines**
- **Total** : **8-14 semaines** selon profondeur d'optimisation et nombre de catégories activées au lancement

### Complexité
- Phases 0-3 : **moyenne** (infra connue, refactor maîtrisé)
- Phase 4 : **élevée** (volume composants, risque régression visuelle)
- Phases 6-7 : **élevée** (workflows métier nouveaux, pricing différent pour villa)
- Phase 8 : **élevée** (potentielle réécriture framework)

### Risques principaux
1. **SEO** : période de réindexation Google après changement URLs (4-8 semaines)
2. **Régressions parcours scooter** : à mitiger par tests E2E baseline (Phase 0) + non-régression à chaque phase
3. **Désynchronisation `types.ts`** : automatiser dans CI/CD
4. **Webhooks Stripe** : auditer toutes les références hardcodées `vehicles` avant renommage en `listings`
5. **Migration villa** : workflow hôtelier vs location véhicule profondément différent — risque sous-estimation effort

---

## 13. Recommandation finale d'architecte

**Si c'était mon produit, voici exactement comment je procéderais.**

### Décisions architecturales fortes
1. **Architecture BDD : Option C hybride** (`listings` + `categories` + `attributes jsonb` + JSON Schema par catégorie) — seule option qui satisfait l'objectif "nouvelle catégorie sans modif code"
2. **URLs SEO long-tail** : `/location-:slug-nosy-be` paramétrée — slug stocké en BDD, signal SEO maximal local
3. **UX combinée** (barre sticky + modale sur action utilisateur) — pas de modale bloquante au chargement (SEO, conversion, Web Vitals)
4. **Persistance hybride** localStorage + profile.preferences synchronisé pour connectés
5. **React Query** sur la home — refactor obligatoire pour scalabilité multi-catégories
6. **RLS `vehicles`/`listings`** réactivée AVANT toute extension (Phase 0)
7. **Composants unifiés** `<ListingCard>` + `<ListingDetailsPage>` paramétrés par schéma catégorie

### Décisions tactiques
- **Renommer `vehicles` → `listings`** progressivement via vue d'alias (zéro downtime)
- **Ne pas migrer vers Next.js** dans la première vague (effort démesuré) — SSG Vite ou prerender suffit dans un premier temps
- **Tests E2E Playwright** comme garde-fou avant chaque phase
- **Sitemap dynamique** côté Edge Function (lecture catégories + listings) plutôt que script build
- **Storybook ou Ladle** pour cartographier les composants `<ListingCard>` × N catégories (régression visuelle)
- **Feature flags** ([src/config/features.ts](src/config/features.ts)) pour activer chaque catégorie en canary (10 % users) avant rollout
- **Repousser la catégorie villa** à une vague séparée — workflow hôtelier ≠ workflow location véhicule, exigerait probablement un module dédié `accommodation/` parallèle à `vehicles/` malgré l'unification BDD

### Anti-patterns à éviter
- Modale bloquante au chargement (mauvaise conversion, mauvais SEO mobile)
- Une table par catégorie (Option B) — explosion FK, impossible d'ajouter catégorie sans code
- Routes hardcodées `/scooters`, `/motos`, `/bateaux` — refactor à chaque ajout
- Ignorer la dette technique actuelle (RLS off, types desync, dossiers `DIAG-*`) — multipliera la complexité du refactor

### Quick wins indépendants du multi-catégories (à faire dès Phase 0)
- Régénérer `types.ts`
- Activer RLS `vehicles`
- Aligner statut `accepted` front ↔ SQL
- Archiver `DIAG-*.md` racine

### Conclusion
Le projet a une **amorce solide** (`vehicle_type`, switch EDL moto, routes duales, sitemap aware) mais aussi une **dette technique mesurable** (RLS off, types desync, duplication moto/voiture, pas de React Query home). Le passage en marketplace multi-catégories est **techniquement faisable en 8-14 semaines** avec l'Option C, **à condition** de traiter la dette en Phase 0 et de phaser strictement les catégories (voiture → bateau → villa) plutôt que tout livrer en parallèle.

Le risque principal est **SEO** (réindexation après refonte URLs) — à mitiger par un plan de redirections 301 chirurgical et un suivi Search Console pendant 8 semaines post-go-live.

---

## Annexe — Schéma cible (vue d'architecte)

```mermaid
flowchart LR
  subgraph db [Base de données]
    Categories[categories<br/>slug, slug_seo, label_i18n,<br/>attribute_schema, renderer,<br/>entity_schema, is_active]
    Listings[listings<br/>ex-vehicles<br/>category_id, attributes jsonb,<br/>title, slug, price, available]
    Bookings[bookings<br/>listing_id FK]
    Photos[listing_photos]
  end

  subgraph front [Front]
    HomePage["Home /"]
    CategoryPage["/location-:slug-nosy-be"]
    DetailPage["/location-:slug-nosy-be/:listingSlug"]
    Bar[CategoryBar sticky]
    Modal[CategoryPickerModal]
    Card[ListingCard generic]
  end

  Categories --> Listings
  Listings --> Bookings
  Listings --> Photos
  HomePage --> Bar
  Bar --> Modal
  CategoryPage --> Card
  DetailPage --> Card
  Card -. category.renderer .-> Categories
```
