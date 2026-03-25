# PLAN D'EXÉCUTION OPÉRATIONNEL — Migration Mayotte

**Date** : 2025-03-10  
**Référence** : DIAGNOSTIC-MIGRATION-MAYOTTE.md  
**Objectif** : Transformer le projet Rentanoo Nosy Be en site Mayotte opérationnel.  
**Statut** : Plan uniquement — aucune modification du code.

---

# 1. STRATÉGIE DE MISE EN ŒUVRE

## 1.1 AVANT toute duplication

| Action | Raison |
|--------|--------|
| **Clarifier le projet Supabase cible** | Deux projets référencés (zykwfjxurwmputxwlkxs vs tbsgzykqcksmqxpimwry). Décider : nouveau projet Mayotte ou réutiliser un existant. |
| **Décider : nouveau Stripe ou clés partagées** | Comptes Stripe séparés = facturation propre, webhooks dédiés. Partagé = risque de mélange. |
| **Décider le nom de marque et le domaine** | Nécessaire pour toutes les variables SITE_URL, CORS, meta. |
| **Créer le repo fork** | Clone du repo actuel, branche dédiée ou nouveau repo. Tag de sauvegarde sur la base. |
| **Documenter .env.local.example Mayotte** | Template complet avec toutes les variables (obligatoires + optionnelles). |

**Ne pas commencer le rebranding ni les modifications de contenu avant d'avoir ces décisions.**

---

## 1.2 IMMÉDIATEMENT après le fork

| Action | Raison |
|--------|--------|
| **Configurer le projet Supabase Mayotte** | Nouveau projet ou pointer config.toml vers le projet choisi. Appliquer les migrations. |
| **Configurer les variables d'environnement** | .env.local avec les clés du nouveau projet. Sans ça, rien ne fonctionne. |
| **Corriger la redirection www** | Remplacer `rentanoo.com` par variable dans server/index.ts. Sinon la prod redirige vers le mauvais domaine. |
| **Corriger le CORS Edge Function** | allowedOrigins dans create-checkout-session : ajouter le domaine Mayotte, retirer ou paramétrer rentanoo.com. |
| **Sécuriser le webhook Stripe** | STRIPE_WEBHOOK_SECRET obligatoire, retirer le fallback non signé. |
| **Protéger la route /admin** | Créer RequireAdmin, wrapper la route. Sinon accès public aux stats (même si mocks). |

**Objectif : avoir une base technique saine avant de toucher au contenu.**

---

## 1.3 JUSTE avant la mise en prod

| Action | Raison |
|--------|--------|
| **Vérifier toutes les variables d'env en prod** | STRIPE_*, SUPABASE_*, N8N_*, VITE_SITE_URL, VITE_STRIPE_PUBLISHABLE_KEY. |
| **Vérifier le webhook Stripe en prod** | URL correcte, secret correspondant, endpoint testé. |
| **Vérifier sitemap et robots.txt** | SITE_BASE = domaine Mayotte, pas de référence rentanoo.com. |
| **Vérifier canonical et og:image** | Toutes les pages pointent vers le domaine Mayotte. |
| **Recette complète** | Parcours visiteur, locataire, propriétaire, paiement, EDL. |
| **Vérifier emails** | Templates n8n avec la bonne marque, expéditeur, contenu. |

**Ne pas déployer sans ces validations.**

---

# 2. ORDRE EXACT DES TRAVAUX

## Lot 0 — Sécurisation

| Élément | Détail |
|---------|--------|
| **Objectif** | Corriger les failles bloquantes avant toute évolution. |
| **Pourquoi en premier** | Admin ouvert, webhook non signé, routes checkin sans auth = risques de sécurité. Mieux vaut sécuriser sur une base stable. |
| **Dépendances** | Aucune. Peut être fait sur le repo actuel avant fork. |
| **Risque si trop tôt** | Aucun. |
| **Risque si trop tard** | Déploiement d'un fork vulnérable. |
| **Livrable** | RequireAdmin en place, STRIPE_WEBHOOK_SECRET obligatoire, routes checkin éventuellement protégées (ou documentées comme acceptables). |

---

## Lot 1 — Duplication technique

| Élément | Détail |
|---------|--------|
| **Objectif** | Créer l'infrastructure dédiée Mayotte (Supabase, Stripe, n8n, domaine). |
| **Pourquoi à ce moment** | Sans infra, impossible de tester le fork. |
| **Dépendances** | Décisions stratégiques (nouveau vs partagé). |
| **Risque si trop tôt** | Décisions pas encore prises. |
| **Risque si trop tard** | Rebranding sans environnement de test. |
| **Livrable** | Projet Supabase Mayotte, compte Stripe (ou clés), webhooks n8n, domaine réservé, repo fork créé. |

---

## Lot 2 — Configuration env

| Élément | Détail |
|---------|--------|
| **Objectif** | Remplacer tous les hardcodes par des variables d'environnement. |
| **Pourquoi à ce moment** | Après l'infra, on peut définir les vraies valeurs. Avant le rebranding, pour éviter de coder le domaine en dur. |
| **Dépendances** | Lot 1 (domaine, projet Supabase, Stripe). |
| **Risque si trop tôt** | Valeurs encore inconnues. |
| **Risque si trop tard** | Rebranding avec des hardcodes → double travail. |
| **Livrable** | .env.local.example complet, SITE_URL/SITE_BASE utilisés partout, CORS paramétré, pas de rentanoo.com en dur. |

---

## Lot 3 — Rebranding

| Élément | Détail |
|---------|--------|
| **Objectif** | Remplacer Rentanoo/Nosy Be par la marque et Mayotte. |
| **Pourquoi à ce moment** | Une fois la config propre, le rebranding ne sera pas écrasé par des variables. |
| **Dépendances** | Lot 2 (variables en place). |
| **Risque si trop tôt** | Conflits avec des hardcodes non encore extraits. |
| **Risque si trop tard** | Retards sur les tests et la prod. |
| **Livrable** | Logo, favicon, couleurs, nom du site, meta, i18n (marque), WhatsApp, navbar, footer. |

---

## Lot 4 — Adaptation Mayotte

| Élément | Détail |
|---------|--------|
| **Objectif** | Adapter les données géographiques, contenus, zones de livraison. |
| **Pourquoi à ce moment** | Après le rebranding, le contenu métier reste à adapter. |
| **Dépendances** | Lot 3 (marque en place). |
| **Risque si trop tôt** | Rebranding incomplet. |
| **Risque si trop tard** | Site avec des zones Nosy Be en prod. |
| **Livrable** | locations.ts (communes Mayotte), i18n (textes Mayotte), pickup_zones, SEO local. |

---

## Lot 5 — SEO / Légal

| Élément | Détail |
|---------|--------|
| **Objectif** | Sitemap, robots.txt, meta, CGU, politique de confidentialité. |
| **Pourquoi à ce moment** | Contenu et marque finalisés. |
| **Dépendances** | Lots 3 et 4. |
| **Risque si trop tôt** | Contenu pas encore stabilisé. |
| **Risque si trop tard** | Indexation incorrecte, non-conformité légale. |
| **Livrable** | sitemap.xml, robots.txt, Legal.tsx à jour, canonical, JSON-LD. |

---

## Lot 6 — QA

| Élément | Détail |
|---------|--------|
| **Objectif** | Recette exhaustive avant mise en prod. |
| **Pourquoi à ce moment** | Toutes les modifications sont faites. |
| **Dépendances** | Lots 0 à 5. |
| **Risque si trop tôt** | Fonctionnalités pas encore prêtes. |
| **Risque si trop tard** | Bugs en prod. |
| **Livrable** | Checklist validée, bugs corrigés, rapport de recette. |

---

## Lot 7 — Déploiement

| Élément | Détail |
|---------|--------|
| **Objectif** | Mise en production du site Mayotte. |
| **Pourquoi en dernier** | Après QA. |
| **Dépendances** | Lot 6. |
| **Risque si trop tôt** | Recette incomplète. |
| **Risque si trop tard** | Aucun. |
| **Livrable** | Site live, DNS configuré, monitoring actif. |

---

# 3. BACKLOG PRIORISÉ

| ID | Tâche | Description | Zone / Fichiers | Criticité | Effort | Dépend de | Risque | Critère de validation |
|----|-------|-------------|-----------------|-----------|--------|-----------|--------|----------------------|
| B01 | Créer RequireAdmin | Guard qui vérifie JWT + profiles.role=admin, redirige sinon | src/components/RequireAdmin.tsx, App.tsx | Bloquant | S | — | Admin public | /admin inaccessible sans rôle admin |
| B02 | Protéger route /admin | Wrapper Admin avec RequireAdmin | App.tsx | Bloquant | XS | B01 | — | Route protégée |
| B03 | STRIPE_WEBHOOK_SECRET obligatoire | Retirer fallback, exiger la variable en prod | server/index.ts | Bloquant | S | — | Webhook falsifiable | 400 si signature invalide |
| B04 | Créer projet Supabase Mayotte | Nouveau projet ou choix du projet cible | Supabase Dashboard | Bloquant | M | Décision | Données mélangées | Projet dédié opérationnel |
| B05 | Clarifier config Supabase | Unifier config.toml et .cursorrules | supabase/config.toml, .cursorrules | Important | XS | B04 | Confusion | Un seul project_id |
| B06 | Remplacer hardcode rentanoo.com (server) | Variable SITE_URL pour redirect www | server/index.ts L48-58 | Bloquant | S | Domaine connu | Mauvaise redirection | Redirect dynamique |
| B07 | Remplacer hardcode rentanoo.com (CORS Edge) | allowedOrigins paramétrable | supabase/functions/create-checkout-session/index.ts | Bloquant | S | Domaine connu | CORS bloque paiement | Paiement fonctionne |
| B08 | Créer .env.local.example Mayotte | Template complet avec toutes les variables | .env.local.example | Important | M | — | Config incomplète | Toutes les variables documentées |
| B09 | SITE_BASE dans generate-sitemap | Variable VITE_SITE_URL | scripts/generate-sitemap.js | Bloquant | XS | B08 | Sitemap wrong domain | Sitemap avec bon domaine |
| B10 | VITE_PUBLIC_SITE_URL dans config.ts | Remplacer fallback localhost | src/lib/config.ts | Important | XS | B08 | Callbacks OAuth wrong | Auth callback OK |
| B11 | Remplacer logo et favicon | Nouveaux assets marque Mayotte | public/brand/, public/favicon*, index.html | Important | M | Marque définie | Branding oublié | Nouveau logo visible |
| B12 | Remplacer meta index.html | Title, description, og, JSON-LD | index.html | Bloquant | S | B08 | SEO wrong | Meta Mayotte |
| B13 | Remplacer meta Seo.tsx | DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE | src/components/seo/Seo.tsx | Bloquant | S | B08 | — | Valeurs par défaut Mayotte |
| B14 | Remplacer WhatsApp numéro | +262 au lieu de +33 | src/components/layout/WhatsAppHeader.tsx | Important | XS | — | Contact wrong | Numéro Mayotte |
| B15 | Remplacer locations.ts | Communes Mayotte | src/data/locations.ts | Important | M | — | Zones wrong | MAYOTTE_* en place |
| B16 | Remplacer i18n marque/géo | Rentanoo→Marque, Nosy Be→Mayotte | src/i18n/locales/*/common.json | Important | L | — | Textes wrong | Tous les fichiers à jour |
| B17 | Remplacer webhooks n8n hardcodés | Variables d'env | src/services/checkinDepartService.ts | Important | S | B08 | Emails wrong | Webhook URL variable |
| B18 | Mettre à jour Legal.tsx | CGU, politique confidentialité Mayotte | src/pages/legal/Legal.tsx | Important | M | Juridique | Non-conformité | Contenu Mayotte |
| B19 | Mettre à jour robots.txt | Sitemap URL | public/robots.txt | Bloquant | XS | B08 | SEO wrong | Sitemap domaine Mayotte |
| B20 | Mettre à jour site.webmanifest | name, description, theme_color | public/site.webmanifest | Important | XS | B11 | PWA wrong | Manifest Mayotte |
| B21 | Migrer Admin hors mocks | Utiliser Supabase (profiles, vehicles, bookings) | src/pages/admin/Admin.tsx, src/services/ | Important | L | B04, B01 | Admin inutilisable | Stats réelles |
| B22 | Corriger redirectUrl checkin/start | Retourner /checking/:bookingId au lieu de /etat-des-lieux/depart/:checkinId | server/index.ts L915 | Confort | XS | — | 404 possible | Redirect vers route existante |
| B23 | Vérifier route /checking vs /etat-des-lieux | Cohérence OwnerBookingCard et API | OwnerBookingCard, server | Confort | XS | — | Confusion | Une seule URL cohérente |
| B24 | Migrer MessageToOwners hors mocks | SupabaseVehiclesService, SupabaseBookingsService | src/pages/booking/MessageToOwners.tsx | Confort | M | B04 | Données wrong | Données réelles |
| B25 | Configurer GA/gtag Mayotte | Nouvelle propriété ou désactiver | src/lib/gtag.ts | Confort | S | — | Analytics mélangés | GA dédié ou désactivé |

---

# 4. PLAN FICHIER PAR FICHIER

## Sécurité

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `src/App.tsx` | Route /admin sans protection | Wrapper Admin avec RequireAdmin | P1 |
| `src/components/RequireAdmin.tsx` | N'existe pas | Créer guard JWT + role admin | P1 |
| `server/index.ts` | STRIPE_WEBHOOK_SECRET optionnel | Exiger en prod, retirer fallback | P1 |
| `server/index.ts` | /api/checkin/start, saveDraft sans auth | Documenter ou ajouter auth | P2 |

## Configuration

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `server/index.ts` | rentanoo.com hardcodé (redirect www) | Variable SITE_URL ou VITE_SITE_URL | P1 |
| `supabase/config.toml` | project_id = tbsgzykqcksmqxpimwry | project_id projet Mayotte | P1 |
| `.cursorrules` | Référence deux projets | Unifier pour Mayotte | P2 |
| `.env.local.example` | Incomplet | Template Mayotte complet | P1 |
| `src/lib/config.ts` | Fallback localhost, comment rentanoo.yt | VITE_PUBLIC_SITE_URL | P1 |
| `vite.config.ts` | — | Aucune (proxy OK) | — |

## Branding

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `index.html` | Rentanoo, Nosy Be, rentanoo.com, #287a74 | Marque Mayotte, domaine, couleurs | P1 |
| `public/site.webmanifest` | Rentanoo, description Nosy Be | Marque Mayotte | P1 |
| `public/brand/rentanoo-logo.svg` | Logo Rentanoo | Remplacer par logo Mayotte | P1 |
| `public/favicon.ico`, `favicon-32x32.png`, etc. | Favicons Rentanoo | Nouveaux favicons | P1 |
| `src/components/layout/navbar.tsx` | Logo, alt Rentanoo | Logo, alt Marque | P1 |
| `src/components/layout/footer.tsx` | Références Rentanoo | Marque Mayotte | P1 |
| `src/components/layout/WhatsAppHeader.tsx` | +33 6 33 70 75 69 | +262 xxx | P1 |
| `src/components/RenterBookingCard.tsx` | "Rentanoo" en dur | i18n ou variable | P2 |

## SEO

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `index.html` | title, description, og, JSON-LD Nosy Be | Mayotte | P1 |
| `src/components/seo/Seo.tsx` | DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE | Valeurs Mayotte ou variables | P1 |
| `src/utils/vehicleSeo.ts` | Références Nosy Be | Mayotte | P1 |
| `src/pages/Index.tsx` | canonical, JSON-LD rentanoo.com, Nosy Be | Domaine et zone Mayotte | P1 |
| `scripts/generate-sitemap.js` | SITE_BASE = rentanoo.com | VITE_SITE_URL | P1 |
| `public/robots.txt` | Sitemap rentanoo.com | Domaine Mayotte | P1 |
| `public/og-rentanoo-nosy-be.webp` | Image Nosy Be | Nouvelle og image Mayotte | P1 |

## Données géographiques

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `src/data/locations.ts` | NOSYBE_STRATEGIC_POINTS, NOSYBE_LOCATIONS, NOSYBE_CITIES | MAYOTTE_* avec communes Mayotte | P1 |
| Composants utilisant locations | Import NOSYBE_* | Import MAYOTTE_* | P1 |
| `vehicles.pickup_zones` | Zones Nosy Be en DB | Adapter ou migrer données | P2 |

## Paiement

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `server/index.ts` | Webhook sans secret en dev | Secret obligatoire en prod | P1 |
| `supabase/functions/create-checkout-session/index.ts` | allowedOrigins rentanoo.com | Domaine Mayotte, variable | P1 |
| `supabase/functions/create-checkout-session/index.ts` | STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL | URLs domaine Mayotte | P1 |
| `src/lib/stripePublicKey.ts` | VITE_STRIPE_PUBLISHABLE_KEY | Clé Stripe Mayotte | P1 |
| `src/lib/payerLocation.ts` | — | Aucune (Edge Function) | — |

## Email / webhooks

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `src/services/checkinDepartService.ts` | Webhook n8n hardcodé | Variable d'env | P1 |
| `src/pages/auth/Callback.tsx` | VITE_N8N_WELCOME_WEBHOOK_URL | URL Mayotte | P1 |
| `server/index.ts` | N8N_WEBHOOK_URL | Webhook contact Mayotte | P1 |
| `.env.local.example` | VITE_N8N_* | Documenter URLs Mayotte | P1 |

## Admin

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `src/pages/admin/Admin.tsx` | UsersService, VehiclesService, BookingsService (mocks) | Supabase (profiles, vehicles, bookings) | P1 |
| `src/services/index.ts` | Mocks localStorage | Admin utilise services Supabase | P1 |
| `server/lib/depositAuth.ts` | Pas de getAdminUserFromRequest | Créer si API admin côté serveur | P2 |

## Routing

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `server/index.ts` L915 | redirectUrl = /etat-des-lieux/depart/:checkinId | redirectUrl = /checking/:bookingId | P2 |
| `src/components/OwnerBookingCard.tsx` | redirectUrl fallback | Aligner avec API | P2 |

## Legal

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `src/pages/legal/Legal.tsx` | CGU, politique Nosy Be | CGU, politique Mayotte | P1 |
| `src/pages/legal/Legal.tsx` | canonical rentanoo.com | Domaine Mayotte | P1 |

## Analytics

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `src/lib/gtag.ts` | VITE_GOOGLE_ADS_* | Nouvelle propriété GA ou désactiver | P2 |
| `index.html` | — | GA ID si nouveau | P2 |

## Déploiement

| Fichier | Problème actuel | Modification future | Priorité |
|---------|-----------------|---------------------|----------|
| `nixpacks.toml` | — | Aucune (Railway) | — |
| Variables Railway/Vercel | — | Configurer toutes les env | P1 |

---

# 5. MATRICE DE DÉCISION "NOUVEAU PROJET OU PARTAGE"

| Élément | Partager ou nouveau ? | Recommandation | Raison | Risques si partagé |
|--------|------------------------|----------------|--------|--------------------|
| **Supabase** | Nouveau projet | **Nouveau** | Données Mayotte isolées, pas de mélange users/véhicules/réservations. RLS et migrations propres. | Fuite de données, conflits de schéma, confusion. |
| **Stripe** | Nouveau compte ou clés | **Nouveau compte** (ou au minimum clés dédiées) | Facturation séparée, webhooks dédiés, pas de mélange paiements. | Webhooks reçus pour l'autre site, analytics Stripe mélangés. |
| **n8n** | Nouveau ou partagé | **Nouveaux webhooks** (même instance possible) | Emails avec marque Mayotte, workflows dédiés. | Emails envoyés avec mauvaise marque, templates mélangés. |
| **Google Analytics / Tag** | Nouveau | **Nouvelle propriété** | Métriques Mayotte séparées. | Données mélangées, conversions wrong. |
| **Domaine** | Nouveau | **Nouveau** | Site Mayotte distinct. | SEO dupliquée, confusion utilisateurs. |
| **Storage** | Inclus Supabase | **Inclus dans nouveau projet Supabase** | Buckets vehicle-photos, checkin-photos dans projet Mayotte. | Fichiers mélangés, URLs wrong. |
| **Emails transactionnels** | Via n8n | **Templates dédiés Mayotte** | Marque, expéditeur, contenu adaptés. | Emails Rentanoo envoyés aux users Mayotte. |

**Résumé** : Nouveau projet Supabase, nouveau compte Stripe (ou clés dédiées), nouveau domaine, nouveaux webhooks n8n, nouvelle propriété GA.

---

# 6. PLAN DE MIGRATION DES ENVIRONNEMENTS

## Local

| Élément | Détail |
|--------|--------|
| **Variables nécessaires** | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (projet Mayotte ou dev), STRIPE_SECRET_KEY (test), STRIPE_SUCCESS_URL (localhost:3002/success), STRIPE_CANCEL_URL (localhost:3002/cancel), N8N_WEBHOOK_URL (test), VITE_SITE_URL (http://localhost:3002), VITE_STRIPE_PUBLISHABLE_KEY (pk_test_), STRIPE_WEBHOOK_SECRET (optionnel en dev). |
| **Services connectés** | Supabase (projet dev ou Mayotte), Stripe (mode test), n8n (webhook test). |
| **Données** | Fake ou copie anonymisée. Pas de prod. |
| **Tests** | npm run dev, npm run dev:api, parcours complet manuel. |
| **Vigilance** | Ne pas utiliser clés prod. Vérifier que le proxy /api fonctionne. |

## Preview / Staging

| Élément | Détail |
|--------|--------|
| **Variables nécessaires** | Mêmes que prod mais URLs staging (ex. preview.xxx.com). Stripe test. Supabase projet Mayotte. |
| **Services connectés** | Supabase Mayotte, Stripe test, n8n staging. |
| **Données** | Données de test, seed si besoin. |
| **Tests** | Recette complète, paiement test, EDL, emails. |
| **Vigilance** | Pas d'indexation (noindex si possible). Vérifier CORS avec domaine preview. |

## Production

| Élément | Détail |
|--------|--------|
| **Variables nécessaires** | Toutes, avec valeurs prod. STRIPE_* live, domaine final, VITE_SITE_URL = https://domaine-mayotte. |
| **Services connectés** | Supabase Mayotte prod, Stripe live, n8n prod, domaine. |
| **Données** | Réelles. |
| **Tests** | Smoke post-deploy, paiement réel (petit montant), emails. |
| **Vigilance** | STRIPE_WEBHOOK_SECRET obligatoire. Sitemap, robots, canonical. Monitoring. |

---

# 7. PLAN DE RECETTE

## Parcours visiteur

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Accéder à / | Page d'accueil, marque Mayotte, zones Mayotte | Bloquant |
| Rechercher véhicules (dates, lieu) | Résultats affichés | Bloquant |
| Cliquer sur un véhicule | Fiche détaillée | Bloquant |
| Vérifier meta (view source) | Title, description, og Mayotte | Important |
| Vérifier responsive | Mobile OK | Important |

## Parcours locataire

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| S'inscrire | Compte créé, email bienvenue (marque Mayotte) | Bloquant |
| Se connecter | Session active | Bloquant |
| Réserver un véhicule | Réservation créée, redirection Stripe | Bloquant |
| Payer (test) | Paiement OK, redirection /success | Bloquant |
| Voir mes réservations | Liste des réservations | Bloquant |
| Contacter propriétaire | Message envoyé | Important |

## Parcours propriétaire

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Devenir propriétaire | Inscription owner | Bloquant |
| Ajouter un véhicule | Véhicule créé, zones Mayotte | Bloquant |
| Recevoir une demande | Notification, discussion | Bloquant |
| Accepter une réservation | Statut accepted, lien paiement | Bloquant |
| Démarrer état des lieux | Redirect /checking/:bookingId, formulaire EDL | Bloquant |
| Finaliser EDL départ | PDF généré, email envoyé | Bloquant |
| État des lieux retour | Formulaire, finalisation | Bloquant |

## Parcours admin

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Accéder à /admin sans être admin | Redirection, accès refusé | Bloquant |
| Accéder à /admin en tant qu'admin | Dashboard visible | Important |
| Voir stats (si migré) | Données réelles Supabase | Important |

## Paiement

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Checkout Stripe | Redirection Stripe, montant correct | Bloquant |
| Paiement réussi | Webhook reçu, booking status=accepted | Bloquant |
| Caution (SetupIntent) | Carte enregistrée, deposit_status mis à jour | Bloquant |
| Annulation | Redirection /cancel | Important |

## Check-in / Check-out

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Démarrer EDL départ | Pas de 404, formulaire chargé | Bloquant |
| Sauvegarder brouillon | Données persistées | Bloquant |
| Finaliser EDL départ | PDF, email | Bloquant |
| EDL retour | Formulaire, finalisation | Bloquant |

## SEO

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| /sitemap.xml | URLs domaine Mayotte | Bloquant |
| /robots.txt | Sitemap domaine Mayotte | Bloquant |
| Meta homepage | Title, description Mayotte | Bloquant |
| Meta page véhicule | Title, description dynamiques | Important |
| Canonical | Domaine Mayotte | Bloquant |

## Responsive

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Mobile 375px | Layout correct | Important |
| Tablet 768px | Layout correct | Confort |
| Desktop 1280px | Layout correct | Important |

## Emails

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| Inscription | Email bienvenue, marque Mayotte | Important |
| Contact | Email reçu, marque Mayotte | Important |
| EDL départ finalisé | Email locataire + propriétaire | Important |

## Sécurité

| Action | Résultat attendu | Criticité |
|--------|-----------------|-----------|
| /admin sans auth | 401 ou redirect | Bloquant |
| Webhook Stripe sans signature | 400 | Bloquant |
| API deposit sans JWT | 401 | Bloquant |

---

# 8. PLAN DE MISE EN PRODUCTION

## J-3

| Élément | Détail |
|--------|--------|
| **Prérequis** | Recette complète validée en staging. Tous les bugs bloquants corrigés. |
| **Vérifications** | Variables prod configurées. Domaine pointé. Stripe webhook configuré. n8n prod prêt. |
| **Actions** | Backup DB Supabase. Tag git de la version à déployer. Documenter rollback. |
| **Rollback** | Garder l'ancienne version déployable. Plan : revert git, redeploy. |

## Jour J

| Élément | Détail |
|--------|--------|
| **Prérequis** | J-3 OK. Équipe disponible. |
| **Vérifications** | Dernière recette smoke. Variables env. |
| **Actions** | Deploy. Vérifier DNS. Tester homepage. Tester paiement (petit montant). Vérifier webhook Stripe. |
| **Rollback** | Si erreur critique : revert, redeploy. |

## J+1

| Élément | Détail |
|--------|--------|
| **Surveillance** | Logs erreurs. Stripe webhook deliveries. n8n executions. |
| **Vérifications** | Indexation Google (Search Console). Emails reçus. Aucune erreur 500. |
| **Actions** | Corriger bugs mineurs. Ajuster monitoring. |

---

# 9. CE QU'IL NE FAUT PAS FAIRE

## Erreurs fréquentes

- **Modifier le contenu avant la config** : Les hardcodes seront écrasés. D'abord variables, puis contenu.
- **Déployer sans STRIPE_WEBHOOK_SECRET** : Webhook falsifiable.
- **Partager le projet Supabase** : Risque de données mélangées.
- **Oublier le CORS Edge Function** : Paiement bloqué en prod.
- **Laisser /admin ouvert** : Même avec mocks, accès non autorisé.

## Fausses bonnes idées

- **Multi-brand dans le même repo** : Complexité inutile. Fork dédié plus simple.
- **Corriger les mocks Admin sans migrer** : Les mocks ne reflètent pas la prod. Migrer vers Supabase.
- **Tout faire en une fois** : Suivre les lots. Risque de régressions.

## Ordre dangereux

- **Rebranding avant variables** : Double travail.
- **Déploiement avant QA** : Bugs en prod.
- **Créer le projet Supabase après le rebranding** : Impossible de tester.

## Pièges

| Domaine | Piège |
|---------|-------|
| **SEO** | Oublier canonical, sitemap, robots.txt → indexation wrong. |
| **Stripe** | Mélanger clés test/live. Webhook secret wrong. |
| **Supabase** | Mauvais project_id. Service role key exposée côté client. |
| **Branding** | Oublier og:image, manifest, favicon. |
| **Domaine** | www vs non-www. Redirect 301. |

---

# 10. RECOMMANDATION FINALE

## Meilleure séquence d'exécution

1. **Lot 0** — Sécurisation (RequireAdmin, STRIPE_WEBHOOK_SECRET)
2. **Lot 1** — Duplication technique (Supabase, Stripe, n8n, domaine, fork)
3. **Lot 2** — Configuration env (variables, suppression hardcodes)
4. **Lot 3** — Rebranding (logo, meta, i18n marque, WhatsApp)
5. **Lot 4** — Adaptation Mayotte (locations, i18n contenu, SEO local)
6. **Lot 5** — SEO / Légal (sitemap, Legal.tsx)
7. **Lot 6** — QA
8. **Lot 7** — Déploiement

## Chemin critique

- **B04** (projet Supabase) → **B06, B07** (variables domaine) → **B12, B13** (meta) → **B09, B19** (sitemap, robots) → **Recette** → **Déploiement**

Sans projet Supabase, pas de config. Sans config domaine, pas de rebranding cohérent. Sans meta/sitemap, pas de SEO. Sans recette, pas de déploiement sûr.

## 5 tâches à lancer en premier

1. **B04** — Créer projet Supabase Mayotte
2. **B01-B02** — RequireAdmin + protection /admin
3. **B03** — STRIPE_WEBHOOK_SECRET obligatoire
4. **B08** — .env.local.example Mayotte complet
5. **B06** — Variable SITE_URL dans server (redirect www)

## 5 tâches à ne surtout pas oublier

1. **B07** — CORS Edge Function (create-checkout-session)
2. **B17** — Webhooks n8n dans checkinDepartService
3. **B19** — robots.txt
4. **B21** — Migration Admin hors mocks (ou désactiver /admin si non prioritaire)
5. **Recette paiement** — Test complet Stripe (checkout + webhook + caution)

---

*Plan généré à partir du DIAGNOSTIC-MIGRATION-MAYOTTE.md. Aucune modification du code.*
