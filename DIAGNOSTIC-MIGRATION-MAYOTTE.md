# DIAGNOSTIC COMPLET — Migration Rentanoo → Mayotte

**Date** : 2025-03-10  
**Objectif** : Audit technique, produit, SEO, data, sécurité et déploiement pour préparer un fork vers une plateforme de location entre particuliers à Mayotte.  
**Statut** : Diagnostic uniquement — aucune modification du code.

---

## RÉSUMÉ EXÉCUTIF

Le projet **rentanoo-nosy-be-clean** est une application de location de scooters/véhicules à **Nosy Be (Madagascar)**. La stack est mature : React 18 + Vite + TypeScript + Supabase + Stripe + Express. Le site cible actuellement Nosy Be avec livraison aéroport/hôtel, états des lieux numériques, paiement Stripe et caution.

**Points forts** : Architecture claire, i18n (fr/en/it/de), SEO structuré, flux de réservation complet, états des lieux départ/retour, intégration Stripe.

**Points critiques** : Admin non protégé et basé sur des mocks localStorage ; redirection www hardcodée `rentanoo.com` ; données géographiques Nosy Be en dur ; webhook Stripe potentiellement non sécurisé en prod ; deux projets Supabase référencés.

**Recommandation** : **Option A** — Dupliquer proprement le projet puis adapter pour Mayotte. La base est solide, les adaptations sont principalement de contenu et de configuration.

---

## LES 10 PRINCIPAUX RISQUES

| # | Risque | Probabilité | Impact | Action préventive |
|---|--------|-------------|--------|-------------------|
| 1 | **Admin accessible sans auth** — `/admin` ouvert à tous, utilise mocks localStorage | Élevée | Bloquant | Ajouter `RequireAdmin` + migrer Admin vers Supabase |
| 2 | **Domaine hardcodé** — `rentanoo.com` dans server, index.html, CORS Edge Function | Élevée | Bloquant | Variable `VITE_SITE_URL` / `SITE_URL` partout |
| 3 | **Données géographiques Nosy Be** — `locations.ts`, i18n, meta SEO | Élevée | Important | Remplacer par communes/zones Mayotte |
| 4 | **Webhook Stripe non signé** — `STRIPE_WEBHOOK_SECRET` optionnel, TODO en prod | Moyenne | Bloquant | Configurer secret en prod, retirer fallback |
| 5 | **Deux projets Supabase** — config.toml = rentanoo-nosy-be, .cursorrules = rentanoo principal | Moyenne | Important | Clarifier projet cible, unifier config |
| 6 | **Emails n8n** — webhooks hardcodés `n8n.srv1285649.hstgr.cloud` | Moyenne | Important | Variables d'env, webhooks Mayotte |
| 7 | **WhatsApp +33** — numéro FR dans `WhatsAppHeader.tsx` | Élevée | Important | Remplacer par numéro Mayotte (+262) |
| 8 | **Indexation SEO dupliquée** — sitemap, canonical, og:image pointent rentanoo.com | Élevée | Bloquant | Nouveau domaine, sitemap, meta |
| 9 | **Devise EUR** — DB et Stripe en EUR, Mayotte = EUR (OK) | Faible | — | Vérifier si adaptation nécessaire |
| 10 | **Route `/checking` vs `/checkin`** — typo possible, lien OwnerBookingCard vers `/checking/` | Faible | Amélioration | Vérifier cohérence des routes |

---

# 1. VUE D'ENSEMBLE DU PROJET

## 1.1 Stack exacte

| Élément | Technologie |
|---------|-------------|
| **Framework** | React 18.3 |
| **Build** | Vite 5.4 |
| **Langage** | TypeScript 5.8 |
| **Routing** | React Router v6 |
| **State** | TanStack Query, AuthContext |
| **UI** | Radix UI, Tailwind, shadcn |
| **Backend** | Express 5 (Node 20+) |
| **Base de données** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Paiement** | Stripe (Checkout + SetupIntent caution) |
| **Emails** | n8n webhooks |
| **i18n** | i18next, react-i18next (fr, en, it, de) |

## 1.2 Type de rendu

**CSR (Client-Side Rendering)** — SPA classique. Pas de SSR/SSG/ISR. Meta dynamiques via `react-helmet-async`. Sitemap généré au build (`prebuild` → `generate-sitemap.js`).

## 1.3 Structure générale

```
rentanoo-nosy-be-clean/
├── src/           # Frontend React
├── server/        # API Express
├── supabase/      # Config, migrations, Edge Functions
├── public/        # Assets statiques
├── scripts/       # Sitemap, favicon, verify
└── codemods/      # i18n transform
```

## 1.4 Niveau de maturité

- **Métier** : Complet (réservation, paiement, check-in/out, messagerie)
- **Auth** : Supabase Auth (email/password, OAuth possible)
- **Admin** : Non fonctionnel (mocks, non protégé)
- **Tests** : Non détectés (pas de jest/vitest)

## 1.5 Facilité de duplication

**Élevée** — Projet clair, sans monore complexe. Duplication = clone repo + config env + rebranding. Effort principal : contenu (i18n, meta, données géo) et configuration (domaine, Stripe, etc.).

---

# 2. ARBORESCENCE ET ARCHITECTURE

## 2.1 Dossiers principaux

| Dossier | Rôle |
|---------|------|
| `src/pages/` | Pages (auth, owner, renter, vehicles, booking, legal, admin) |
| `src/components/` | layout, ui, vehicles, booking, checkin, forms, seo |
| `src/services/` | Mock (localStorage) + Supabase (bookings, conversations, messages, profile, checkinPhotos) |
| `src/contexts/` | AuthContext |
| `src/integrations/supabase/` | client, types |
| `src/lib/` | gtag, stripePublicKey, payerLocation, config, depositCaution |
| `src/modules/` | etatDesLieuxDepart, etatDesLieuxDepartMoto, etatDesLieuxRetour |
| `src/i18n/` | config, locales (fr, en, it, de) |
| `src/data/` | locations.ts (Nosy Be) |
| `server/` | Express index + lib (stripe, depositAuth) |

## 2.2 Séparation front / back

- **Front** : Vite + React, port 3002 (dev), proxy `/api` → 3000
- **Back** : Express sur 3000, sert `dist/` en prod
- **Edge Functions** : Supabase (create-checkout-session, stripe-webhook)

## 2.3 Routes API (Express)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/stripe/webhook` | Signature Stripe | Webhook paiement |
| POST | `/api/deposit/create-setup-intent` | JWT | SetupIntent caution |
| POST | `/api/deposit/attach-payment-method` | JWT | Attacher PM |
| POST | `/api/bookings/:id/force-deposit` | JWT | Owner force caution |
| POST | `/api/contact` | — | Formulaire contact → n8n |
| GET | `/api/health/email` | — | Test n8n |
| GET | `/api/stripe-health` | — | Test Stripe |
| GET | `/api/stripe/session-details` | — | Détails session (Google Ads) |
| POST | `/api/checkin/start` | — | Démarrer EDL départ |
| POST | `/api/checkin/saveDraft` | — | Sauvegarder brouillon EDL |

## 2.4 Code mort / duplication

| Élément | Constat |
|---------|---------|
| `src/services/index.ts` | Mock localStorage (UsersService, VehiclesService, PhotosService, BookingsService) — utilisé par Admin et MessageToOwners |
| `src/services/supabaseVehiclesService.ts` | Service Supabase réel — utilisé par Index, VehicleDetails, OwnerVehicles, etc. |
| `src/services/supabase/bookings.ts` | SupabaseBookingsService — utilisé partout |
| **Admin** | Utilise `UsersService`, `VehiclesService`, `BookingsService` (mocks) → pas de données réelles |
| **MessageToOwners** | Utilise `VehiclesService`, `UsersService`, `BookingsService` (mocks) → incohérence |
| **Route `/checking/:bookingId`** | App.tsx L195 — composant `Checking` ; OwnerBookingCard L1263 pointe vers `/checking/` |
| **Route `/etat-des-lieux/depart/:id`** | API checkin/start retourne `redirectUrl: /etat-des-lieux/depart/:checkinId` — **aucune route correspondante** dans App.tsx. OwnerBookingCard redirige vers cette URL → risque 404. La route existante est `/checking/:bookingId` (attend bookingId, pas checkinId). |

## 2.5 Dette technique visible

- Admin basé sur mocks : non adapté à la prod
- Pas de `RequireAdmin` : route /admin ouverte
- `/api/checkin/start` et `/api/checkin/saveDraft` sans auth
- `STRIPE_WEBHOOK_SECRET` optionnel (TODO en prod)

---

# 3. DÉPENDANCES ET OUTILS

## 3.1 Dépendances principales

| Catégorie | Packages |
|-----------|----------|
| **Front** | react, react-dom, react-router-dom, @tanstack/react-query |
| **UI** | @radix-ui/*, tailwindcss, lucide-react, shadcn |
| **Auth/DB** | @supabase/supabase-js |
| **Paiement** | @stripe/react-stripe-js, @stripe/stripe-js, stripe |
| **Forms** | react-hook-form, @hookform/resolvers, zod |
| **i18n** | i18next, react-i18next, i18next-browser-languagedetector |
| **SEO** | react-helmet-async |
| **PDF** | jspdf, html2canvas |
| **Utils** | date-fns, recharts, multer |

## 3.2 Dépendances obsolètes / risquées

- Non audité (npm audit non exécuté). Packages récents (2024–2025).

## 3.3 Dépendances par domaine

| Domaine | Package | Fichiers |
|---------|---------|----------|
| Auth | @supabase/supabase-js | AuthContext, depositAuth, Callback |
| DB | @supabase/supabase-js | services/supabase/*, integrations |
| Paiement | stripe, @stripe/* | payerLocation, DepositFlowModal, server, Edge |
| Emails | — | n8n webhooks (fetch) |
| Maps | — | Aucune |
| Upload | multer (server), Supabase Storage | checkinPhotos, vehicle-photos |
| Analytics | — | gtag.ts (Google Tag) |
| SEO | react-helmet-async | Seo.tsx, index.html |

## 3.4 Risques de compatibilité en cas de fork

- **Faible** — stack standard, pas de dépendances exotiques

---

# 4. CONFIGURATION DU PROJET

## 4.1 Fichiers de config

| Fichier | Rôle |
|---------|------|
| `package.json` | Scripts, deps, engines node >= 20 |
| `vite.config.ts` | React SWC, alias @/, proxy /api → 3000, port 3002 |
| `tsconfig.json` | Références app + node |
| `tailwind.config.ts` | Tailwind + typography |
| `eslint.config.js` | Flat config |
| `nixpacks.toml` | Railway (Node 22, npm ci, build, start:prod) |
| `supabase/config.toml` | project_id = tbsgzykqcksmqxpimwry |

**Pas de `vercel.json`** — déploiement configuré pour Railway (nixpacks). L’utilisateur mentionne Vercel — à clarifier.

## 4.2 Variables d’environnement

### Obligatoires (prod)

| Variable | Utilisation | Fichier |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Client Supabase | client.ts, payerLocation, config |
| `VITE_SUPABASE_ANON_KEY` | Client Supabase | client.ts |
| `SUPABASE_SERVICE_ROLE_KEY` | Express, Edge | server/index.ts, create-checkout-session |
| `STRIPE_SECRET_KEY` | Express, Edge | server/lib/stripe.ts, Edge |
| `STRIPE_SUCCESS_URL` | Edge | create-checkout-session |
| `STRIPE_CANCEL_URL` | Edge | create-checkout-session |
| `N8N_WEBHOOK_URL` | Contact form | server/index.ts |

### Optionnelles

| Variable | Utilisation |
|----------|-------------|
| `VITE_N8N_PROFILES_CREATED_WEBHOOK_URL` | Callback inscription |
| `VITE_N8N_WELCOME_WEBHOOK_URL` | Email bienvenue |
| `VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE` | gtag |
| `VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT` | gtag |
| `VITE_STRIPE_PUBLISHABLE_KEY` | stripePublicKey.ts |
| `STRIPE_WEBHOOK_SECRET` | Express webhook (recommandé en prod) |
| `VITE_SITE_URL` | generate-sitemap |

### Non documentées dans .env.local.example

- `VITE_SUPABASE_SERVICE_ROLE_KEY` (fallback server)
- `VITE_PUBLIC_SITE_URL` (config.ts)
- `VITE_API_URL` (Contact, PaymentSuccess)

## 4.3 Couplage fort

- `rentanoo.com` : server/index.ts (redirect www), index.html, Edge Function CORS
- `Nosy Be` : locations.ts, i18n, meta, Seo
- `n8n.srv1285649.hstgr.cloud` : webhooks hardcodés dans checkinDepartService

---

# 5. BRANDING ET ÉLÉMENTS À REMPLACER

| Élément | Où | Type de modification | Priorité |
|---------|-----|----------------------|----------|
| Nom du site | index.html, site.webmanifest, i18n, meta | Remplacer "Rentanoo" par marque Mayotte | P1 |
| Domaine | server/index.ts L52–53, index.html, Seo, Legal, CORS Edge | Variable `SITE_URL` / `VITE_SITE_URL` | P1 |
| Logo | `public/brand/rentanoo-logo.svg` | Nouveau logo | P1 |
| Favicon | index.html, site.webmanifest, public/ | favicon.ico, .png, apple-touch | P1 |
| Couleur | index.html, site.webmanifest, tailwind | `#287a74` → palette Mayotte | P2 |
| Meta title/description | index.html, Seo.tsx, i18n seo.* | Cibler Mayotte | P1 |
| OG image | index.html, Seo.tsx, og-rentanoo-nosy-be.webp | Nouvelle image | P1 |
| JSON-LD | index.html, Index.tsx, Seo | LocalBusiness, areaServed | P1 |
| Mentions légales | Legal.tsx | CGU, politique confidentialité | P1 |
| WhatsApp | WhatsAppHeader.tsx L5–6 | +33 6 33 70 75 69 → +262 | P1 |
| Emails n8n | Callback, checkinDepartService | Templates, expéditeur | P1 |
| Textes marketing | i18n (fr, en, it, de) | "Nosy Be" → "Mayotte" | P1 |
| Références géo | locations.ts | NOSYBE_* → MAYOTTE_* | P1 |
| Sitemap base | generate-sitemap.js L22 | SITE_BASE | P1 |
| robots.txt | public/robots.txt | Sitemap URL | P1 |

---

# 6. FONCTIONNALITÉS MÉTIER

| Fonctionnalité | Statut | Fichiers | Réutilisable | Effort |
|---------------|--------|----------|--------------|--------|
| Inscription / connexion | Existe | AuthContext, Login, Register, Callback | Oui | Faible |
| Gestion comptes | Existe | Profile, ProfileService | Oui | Faible |
| Annonces / listings | Existe | SupabaseVehiclesService, VehicleDetails, MotoVehicleDetails | Oui | Moyen (zones) |
| Moteur de recherche | Existe | Index, SearchBarAirbnb, SupabaseVehiclesService | Oui | Moyen |
| Filtres | Existe | VehicleFilters, VehicleTypeModal | Oui | Faible |
| Réservation / demande | Existe | SupabaseBookingsService, BookingDiscussion | Oui | Faible |
| Messagerie | Existe | ConversationsService, MessagesService | Oui | Faible |
| Paiement | Existe | Stripe, payerLocation, Edge | Oui | Faible |
| Calendrier / dispo | Existe | InteractiveCalendar | Oui | Faible |
| Avis | Table reviews vide | — | Non implémenté | — |
| Documents | Existe | checkin (permis, EDL), vehicle_photos | Oui | Faible |
| Géolocalisation | Partielle | pickup_zones | Oui | Moyen |
| Dashboard propriétaire | Existe | OwnerVehicles, OwnerBookings, OwnerBookingRequests | Oui | Faible |
| Dashboard locataire | Existe | RenterBookings | Oui | Faible |
| Administration | Partielle | Admin (mocks) | Non | Élevé |
| Modération | Non | — | — | — |
| Notifications email | Partielle | n8n webhooks | Oui | Moyen |
| SMS / push | Non | — | — | — |

---

# 7. BASE DE DONNÉES ET MODÈLE DATA

## 7.1 Schéma (Supabase)

| Table | RLS | Rôle |
|-------|-----|------|
| profiles | Oui | Utilisateurs, rôles, stripe_customer_id |
| vehicles | Non | Véhicules, owner_id |
| vehicle_photos | Oui | Photos véhicules |
| bookings | Oui | Réservations |
| conversations | Oui | Messages owner/renter |
| messages | Oui | Contenu messages |
| checkin_depart | Non | État des lieux départ |
| checkin_return | Non | État des lieux retour |
| payments | Oui | (vide) |
| reviews | Oui | (vide) |
| dictionary_entries | Oui | Dictionnaire |

## 7.2 Entités métier principales

- **profiles** → users (auth, roles)
- **vehicles** → annonces (owner_id, pickup_zones, vehicle_type)
- **bookings** → réservations (status, deposit, Stripe)
- **conversations** / **messages** → messagerie
- **checkin_depart** / **checkin_return** → EDL

## 7.3 Pour Mayotte

- **Conserver** : profiles, vehicles, bookings, conversations, messages, checkin_*
- **Adapter** : zones de prise en charge (pickup_zones), catégories véhicules
- **Manquant** : rien de bloquant pour une location entre particuliers

---

# 8. AUTHENTIFICATION, SÉCURITÉ ET CONFORMITÉ

## 8.1 Auth

- Supabase Auth (email/password)
- JWT dans `Authorization: Bearer` pour routes deposit
- `getAuthUserFromRequest` (depositAuth.ts) — pas de vérification rôle admin

## 8.2 Rôles

- `profiles.role` : `renter` | `owner` | `admin`
- Pas de guard `RequireAdmin` sur `/admin`

## 8.3 Sécurité API

| Route | Protection |
|-------|------------|
| `POST /api/deposit/*` | JWT |
| `POST /api/bookings/:id/force-deposit` | JWT + owner check |
| `POST /api/contact` | Non | 
| `POST /api/checkin/*` | Non |
| `POST /api/stripe/webhook` | Signature Stripe (optionnelle) |

## 8.4 Points bloquants avant prod fork

1. **Admin** : Protéger par `RequireAdmin` + migrer vers Supabase
2. **STRIPE_WEBHOOK_SECRET** : Obligatoire en prod
3. **Sanitization** : Contenu HTML (EDL, messages) — vérifier si DOMPurify ou équivalent
4. **Rate limit** : Aucun sur `/api/*`

---

# 9. SEO ET VISIBILITÉ

## 9.1 Ce qui est bon

- react-helmet-async sur les pages
- Composant `Seo` + `vehicleSeo.ts`
- Sitemap.xml (build-time)
- robots.txt
- JSON-LD LocalBusiness
- Canonical sur pages principales

## 9.2 À réécrire pour Mayotte

- Tous les meta (title, description)
- JSON-LD areaServed
- Contenu i18n
- `locations.ts`

## 9.3 Risques si copie tel quel

- Canonical et sitemap pointent rentanoo.com → risque de contenu dupliqué
- Indexation du mauvais domaine

---

# 10. PERFORMANCE ET QUALITÉ

## 10.1 Optimisations

- Lazy loading des routes (sauf Index)
- Code splitting
- Compression gzip
- Cache headers (assets 1 an, HTML no-cache)

## 10.2 À faire

- **Avant fork** : Corriger Admin, webhook Stripe
- **Pendant** : Adapter images, favicons
- **Après** : Lighthouse, monitoring

---

# 11. DÉPLOIEMENT

## 11.1 Configuration actuelle

- **Plateforme** : Railway (nixpacks.toml)
- **Build** : `npm run build` (prebuild → sitemap)
- **Start** : `npm run start:prod`
- **Express** : sert `dist/` + SPA fallback

## 11.2 Pour le nouveau site

- Nouveau projet Railway / Vercel
- Variables d’env
- Domaine
- Stripe (nouveau compte ou clés)
- Supabase (nouveau projet ou partagé)

---

# 12. INTÉGRATIONS TIERCES

| Intégration | Rôle | Fichiers | Indispensable | Complexité duplication |
|-------------|------|----------|---------------|-------------------------|
| Supabase | DB, Auth, Storage | client, services, Edge | Oui | Nouveau projet ou partagé |
| Stripe | Paiement | payerLocation, server, Edge | Oui | Nouveau compte ou clés |
| n8n | Emails, webhooks | Callback, Contact, checkinDepart | Oui | Nouveaux webhooks |
| Google Tag / GA4 | Analytics | gtag.ts | Non | Nouvelle propriété |
| WhatsApp | Contact | WhatsAppHeader | Oui | Nouveau numéro |

---

# 13. ADAPTATION SPÉCIFIQUE MAYOTTE

| Élément | Fichier / Zone | Action |
|---------|----------------|--------|
| Libellés géo | locations.ts | Remplacer par communes Mayotte |
| i18n | locales/*/common.json | mayotte, nosy_be → Mayotte |
| Format téléphone | react-phone-number-input | +262 |
| Devise | DB, Stripe | EUR (OK) |
| Catégories | vehicles.vehicle_category | Adapter si besoin |
| SEO local | Seo, meta | "Location Mayotte", "Mamoudzou", etc. |
| Pages légales | Legal.tsx | CGU, politique confidentialité Mayotte |

---

# 14. RISQUES DE DUPLICATION

| Risque | Probabilité | Impact | Action |
|--------|-------------|--------|--------|
| Branding oublié | Moyenne | Important | Checklist exhaustive |
| Fuite de données | Faible | Bloquant | Nouveau projet Supabase |
| Mauvaise config env | Élevée | Bloquant | .env.example à jour |
| SEO dupliquée | Élevée | Bloquant | Nouveau domaine, sitemap |
| Analytics mélangés | Moyenne | Important | Nouvelle propriété GA |
| Emails mauvaise marque | Moyenne | Important | Templates n8n |
| Erreur domaine | Moyenne | Bloquant | Variables SITE_URL |

---

# 15. RECOMMANDATION STRATÉGIQUE

**Option A : Dupliquer proprement puis adapter**

- **Justification** : Code base saine, pas de multi-tenant. Un fork dédié Mayotte évite la complexité multi-brand et les risques de régression sur Nosy Be.
- **Effort** : 1–2 semaines (rebranding, config, données géo, tests).

---

# 16. PLAN D'ACTION STEP BY STEP

## Phase 1 — Audit

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Valider périmètre | Confirmer fonctionnalités, domaine, marque | — | Cahier des charges |

## Phase 2 — Préparation du fork

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Backup | Clone repo, tag | — | Repo fork |
| Env | Créer .env.local.example Mayotte | .env.local.example | Template |

## Phase 3 — Duplication technique

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Nouveau projet | Supabase, Stripe, n8n | — | Comptes configurés |
| Config | Remplacer project_id, clés | supabase/config.toml, env | Config |

## Phase 4 — Rebranding

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Marque | Logo, favicon, couleurs | public/, index.html | Assets |
| Variables | SITE_URL partout | server, index.html, Seo, Edge | Pas de hardcode |
| Meta | Title, description, og | index.html, Seo, i18n | Meta Mayotte |

## Phase 5 — Adaptation métier Mayotte

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Zones | locations.ts | src/data/locations.ts | Communes Mayotte |
| i18n | Traductions | locales/* | Textes Mayotte |
| WhatsApp | Numéro | WhatsAppHeader.tsx | +262 |

## Phase 6 — Data / SEO / conformité

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Sitemap | SITE_BASE | generate-sitemap.js | sitemap.xml |
| Legal | CGU, politique | Legal.tsx | Pages légales |

## Phase 7 — Tests

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Smoke | Parcours complet | — | Rapport |
| Stripe | Test + prod | — | Paiement OK |

## Phase 8 — Mise en production

| Objectif | Actions | Fichiers | Livrable |
|----------|---------|----------|----------|
| Deploy | Railway / Vercel | — | Site live |
| DNS | Domaine | — | HTTPS |

---

# INVENTAIRES

## 1. Éléments à renommer

| Ancien | Nouveau |
|--------|---------|
| Rentanoo | [Marque Mayotte] |
| Nosy Be | Mayotte |
| rentanoo.com | [domaine-mayotte] |
| NOSYBE_STRATEGIC_POINTS | MAYOTTE_STRATEGIC_POINTS |
| NOSYBE_LOCATIONS | MAYOTTE_LOCATIONS |
| NOSYBE_CITIES | MAYOTTE_CITIES |
| maycar_* (localStorage) | [prefix]_* |

## 2. Variables d'environnement

| Variable | Obligatoire | Usage |
|----------|-------------|-------|
| VITE_SUPABASE_URL | Oui | Client Supabase |
| VITE_SUPABASE_ANON_KEY | Oui | Client Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Oui | Server, Edge |
| STRIPE_SECRET_KEY | Oui | Server, Edge |
| STRIPE_SUCCESS_URL | Oui | Edge |
| STRIPE_CANCEL_URL | Oui | Edge |
| STRIPE_WEBHOOK_SECRET | Recommandé | Express |
| VITE_STRIPE_PUBLISHABLE_KEY | Oui | Front |
| N8N_WEBHOOK_URL | Oui | Contact |
| VITE_SITE_URL | Oui | Sitemap |
| VITE_N8N_PROFILES_CREATED_WEBHOOK_URL | Optionnel | Callback |
| VITE_N8N_WELCOME_WEBHOOK_URL | Optionnel | Bienvenue |
| VITE_GOOGLE_ADS_CONVERSION_LABEL_* | Optionnel | gtag |

## 3. Intégrations externes

| Service | Type | URL / Config |
|---------|------|---------------|
| Supabase | DB, Auth, Storage | VITE_SUPABASE_URL |
| Stripe | Paiement | STRIPE_* |
| n8n | Webhooks | N8N_WEBHOOK_URL, VITE_N8N_* |
| Google Tag | Analytics | gtag |

## 4. Pages / routes

| Route | Composant |
|-------|------------|
| / | Index |
| /auth/login, /auth/register, /auth/callback | Auth |
| /onboarding/client | ClientOnboarding |
| /profile, /profile-test | Profile |
| /vehicle/:license, /moto/:license | VehicleDetails, MotoVehicleDetails |
| /vehicle/:license/booking/discussion | BookingDiscussion |
| /booking/message | MessageToOwners |
| /legal, /sinistre-caution, /contact | Legal, SinistreCaution, Contact |
| /me/dashboard | Dashboard |
| /me/renter/bookings | RenterBookings |
| /success, /cancel | PaymentSuccess, PaymentCancel |
| /me/owner/* | OwnerVehicles, OwnerBookings, OwnerBookingRequests |
| /rent-my-car, /rent-my-car/register | RentMyCarLanding, RentMyCarRegister |
| /admin | Admin |
| /checking/:bookingId | Checking |
| /checkin-return/:bookingId | CheckinReturnPage |
| /dictionary, /dictionary/:id | DictionaryIndex, DictionaryEntry |
| /picker-demo, /airport-services-demo, /simple-test | Demos |
| * | NotFound |

## 5. Composants / modules critiques

| Composant / Module | Rôle |
|--------------------|------|
| AuthContext | Auth global |
| Seo | Meta dynamiques |
| SupabaseVehiclesService | Véhicules |
| SupabaseBookingsService | Réservations |
| payerLocation | Stripe Checkout |
| DepositFlowModal | Caution Stripe |
| checkinDepartService | EDL départ |
| checkinReturnService | EDL retour |
| WhatsAppHeader | Contact |
| Navbar | Navigation |
| ProfileService | Profils |

---

*Document généré — aucune modification du code. Valider les clarifications avant implémentation.*
