# DIAGNOSTIC + PLAN D'IMPLÉMENTATION — Admin Blog Complet (Rentanoo)

**Date** : 2025-03-03  
**Objectif** : Blog sur rentanoo.com avec back-office type mini-WordPress pour publier articles (photos, vidéos) sans toucher au code.  
**Statut** : Diagnostic + plan — **aucune implémentation tant que le plan n'est pas validé**.

---

## 0) CLARIFICATIONS REQUISES (à valider avant implémentation)

### 1) Accès à /admin/blog

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Qui peut accéder ? | **Admin uniquement** (profiles.role = 'admin') | ☐ |
| Rôles Supabase | Le champ `profiles.role` existe déjà : `"renter" \| "owner" \| "admin"` | ☐ |
| Vérification | JWT Supabase + lookup `profiles.role` côté API Express | ☐ |

### 2) Éditeur d'article

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Type | **Rich text (WYSIWYG)** — Titre, intro, corps avec mise en forme | ☐ |
| Mise en forme | Titres H2/H3, listes, gras, italique, liens, images inline | ☐ |
| Alternatives rejetées | Zones simples (titre + sections) = trop limité pour contenu long | ☐ |

### 3) Images

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Upload multiple | Oui — hero + galerie (optionnel) | ☐ |
| Drag & drop | Oui — zone dédiée | ☐ |
| Compression/resize | Oui — réutiliser `compressForUpload` (1280×1280, max 500KB) | ☐ |
| Légende / alt text | **Alt text obligatoire** pour SEO ; légende optionnelle | ☐ |

### 4) Vidéos

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Format | **YouTube/Vimeo embed uniquement** (URL collée) | ☐ |
| Upload vidéo | **Interdit** — trop lourd, coût storage | ☐ |

### 5) Publication

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Statuts | `draft` \| `published` | ☐ |
| Planification | **Phase 2** — pas au MVP | ☐ |
| Slug | Auto-généré depuis titre (slugify) + **modifiable** manuellement | ☐ |

### 6) Langues

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| MVP | **FR uniquement** | ☐ |
| Évolution | i18n (fr/en/de/it) — colonne `language_code` prévue en DB pour plus tard | ☐ |

### 7) SEO par article

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Champs | meta title, meta description, og image custom (upload) | ☐ |

### 8) Commentaires / partage

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Commentaires | **Non** | ☐ |
| Partage | Boutons sociaux optionnels (Phase 2) | ☐ |

### 9) URL

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Format | `/blog/:slug` **obligatoire** | ☐ |

### 10) Permissions

| Question | Proposition par défaut | À valider |
|----------|------------------------|-----------|
| Endpoints admin | JWT Supabase + vérification `profiles.role = 'admin'` | ☐ |
| Validation | Zod sur tous les payloads | ☐ |

---

## 1) LIVRABLE 1 — DIAGNOSTIC (sans code)

### 1.1 Existant vérifié

| Élément | Fichier / Zone | Constat |
|---------|----------------|---------|
| **Routes** | `App.tsx` | React Router v6, routes déclaratives, lazy loading |
| **SEO** | `Seo.tsx` | react-helmet-async, title, description, canonical, og, twitter, JSON-LD |
| **Sitemap** | `scripts/generate-sitemap.js` | Build-time, fetch Supabase (vehicles), écrit `public/sitemap.xml` |
| **Auth** | `server/lib/depositAuth.ts` | `getAuthUserFromRequest(req)` — valide JWT, retourne user |
| **Rôles** | `profiles.role` | `"renter" \| "owner" \| "admin"` |
| **Admin** | `src/pages/admin/Admin.tsx` | Page existe, **pas de protection** — accessible à tous |
| **Navbar** | `navbar.tsx` | Pas de lien "Admin" pour les admins |
| **Storage** | `checkin-photos`, `vehicle-photos` | Supabase Storage utilisé, `compressForUpload` existant |
| **robots.txt** | `public/robots.txt` | `Disallow:` vide, `Sitemap: https://rentanoo.com/sitemap.xml` |

### 1.2 Points de branchement

| Zone | Action |
|------|--------|
| **Routes blog public** | Ajouter `/blog` et `/blog/:slug` dans `App.tsx` (avant `*`) |
| **Routes admin** | Ajouter `/admin/blog` et `/admin/blog/new`, `/admin/blog/:id/edit` |
| **Protection admin** | Créer `RequireAdmin` wrapper ou guard dans page — redirection `/auth/login` si non connecté, `/` si connecté mais pas admin |
| **API** | Nouveaux endpoints sous `/api/blog` (public) et `/api/admin/blog` (protégés) |

### 1.3 Risques identifiés

| Risque | Gravité | Détail |
|--------|---------|--------|
| **SPA SEO** | Moyen | Contenu rendu côté client ; Google indexe bien les SPA, mais meta dynamiques via Helmet sont corrects |
| **Meta dynamiques** | Faible | `Seo` + `react-helmet-async` déjà utilisés sur VehicleDetails — pattern à répliquer |
| **Indexation** | Faible | Sitemap doit inclure `/blog` et tous les slugs publiés |
| **Admin non protégé** | Élevé | `/admin` actuel accessible sans vérification — à corriger pour `/admin/blog` |

### 1.4 Décisions recommandées

| Décision | Choix | Justification |
|----------|-------|---------------|
| **Stockage contenu** | **DB Supabase** | Édition sans redéploiement, workflow rédactionnel, cohérence avec vehicles/dictionary |
| **Stockage images** | **Supabase Storage** (bucket `blog`) | Déjà utilisé (checkin-photos, vehicle-photos), CDN Supabase inclus |
| **Format contenu** | **HTML string** (éditeur riche) | Simple à stocker, afficher avec `dangerouslySetInnerHTML` ou composant sécurisé ; pas de parsing Markdown |
| **MVP** | Table `blog_posts` + admin React + API Express | Pas de CMS externe, stack unifiée |
| **Plus tard** | i18n, planification, sitemap dynamique | Évolutif sans refonte |

---

## 2) LIVRABLE 2 — PLAN D'IMPLÉMENTATION

### Phase A — Data & Storage (MVP)

**Complexité : Faible**

#### A.1 Schéma Postgres `blog_posts`

```sql
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,                    -- HTML from rich editor
  meta_title TEXT,
  meta_description TEXT,
  og_image_path TEXT,                       -- path in blog bucket
  hero_image_path TEXT,
  category TEXT,                            -- guides, itineraires, conseils, etc.
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id UUID REFERENCES public.profiles(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cta_enabled BOOLEAN DEFAULT true,
  faq JSONB,                                -- [{q, a}]
  video_embed_url TEXT                       -- YouTube/Vimeo URL
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status_published ON blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
```

#### A.2 Table `blog_assets` (optionnel — MVP : images dans Storage uniquement, paths en `blog_posts`)

Pour une galerie d'images inline, on peut stocker les paths dans un JSONB `gallery` sur `blog_posts` :

```sql
-- Colonne optionnelle sur blog_posts
gallery JSONB  -- [{path, alt, caption}]
```

Ou table séparée si besoin de gestion avancée :

```sql
CREATE TABLE public.blog_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Recommandation MVP** : pas de `blog_assets` — hero + images inline dans le HTML du rich editor. Galerie = Phase 2.

#### A.3 RLS Policies

```sql
-- Lecture publique : posts publiés uniquement
CREATE POLICY "blog_posts_select_published"
  ON blog_posts FOR SELECT
  USING (status = 'published');

-- Écriture : admin uniquement (via service role ou RPC avec check)
-- Option 1 : Pas de RLS INSERT/UPDATE pour anon — tout passe par API Express (service role)
-- Option 2 : Policy avec check auth.role() = 'admin' (nécessite custom claim ou fonction)
```

**Recommandation** : API Express utilise `supabaseAdmin` (service role) pour les écritures. Les lectures publiques peuvent passer par le client anon avec une **vue** ou une **policy** :

```sql
-- Policy SELECT : tout le monde peut lire les published
CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  USING (status = 'published');

-- Pas de INSERT/UPDATE/DELETE pour anon — l'API Express utilise service_role
```

#### A.4 Bucket Supabase Storage `blog`

| Paramètre | Valeur |
|-----------|--------|
| **Nom** | `blog` |
| **Structure** | `{slug}/hero.jpg`, `{slug}/og.jpg`, `{slug}/inline_{timestamp}_{uuid}.jpg` |
| **Accès lecture** | Public (pour affichage articles) |
| **Accès écriture** | Via API Express (JWT admin) — upload via `supabaseAdmin.storage` |
| **Taille max** | 5 MB par fichier (images) |

**Création bucket** : Dashboard Supabase → Storage → New bucket → `blog` → Public.

---

### Phase B — API Express

**Complexité : Moyenne**

#### B.1 Endpoints

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/blog` | — | Liste paginée, `?status=published&page=1&limit=12&category=guides` |
| GET | `/api/blog/:slug` | — | Détail article publié (404 si draft) |
| POST | `/api/admin/blog` | JWT + admin | Créer article |
| PATCH | `/api/admin/blog/:id` | JWT + admin | Modifier article |
| POST | `/api/admin/blog/:id/publish` | JWT + admin | Passer en published, set `published_at` |
| POST | `/api/admin/blog/:id/unpublish` | JWT + admin | Repasser en draft |
| DELETE | `/api/admin/blog/:id` | JWT + admin | Supprimer (soft delete optionnel) |
| POST | `/api/admin/upload` | JWT + admin | Upload image (multipart), retourne `{ path, url }` |

#### B.2 Sécurité

| Élément | Implémentation |
|---------|---------------|
| **JWT** | `getAuthUserFromRequest(req)` (existant) |
| **Admin check** | Nouvelle fonction `getAdminUserFromRequest(req)` : après `getUser`, fetch `profiles.role` via supabaseAdmin, vérifier `role === 'admin'` |
| **Validation** | Zod schemas pour create/update payloads |
| **Rate limit** | `express-rate-limit` sur `/api/admin/*` (ex. 100 req/15min) |

#### B.3 Pagination, tri, recherche

- `GET /api/blog` : `page`, `limit`, `category`, `status` (public = published only)
- Tri par défaut : `published_at DESC`
- Recherche full-text : Phase 2 (pg_trgm ou tsvector)

---

### Phase C — Front Blog Public

**Complexité : Moyenne**

#### C.1 Pages

| Route | Composant | Contenu |
|-------|-----------|---------|
| `/blog` | `BlogIndex` | Liste paginée, filtres catégories, cartes article |
| `/blog/:slug` | `BlogArticle` | Article complet, SEO, CTA, sticky |

#### C.2 Composants conversion

| Composant | Rôle |
|-----------|------|
| `BlogCtaReservation` | Bouton "Réserver un scooter" → lien `/` ou page véhicules |
| `BlogStickyCta` | Barre fixe bas mobile |
| `BlogVehicleShowcase` | Grille 3–6 scooters (réutiliser `VehicleCard` / `MotoVehicleCard`, fetch Supabase) |

#### C.3 SEO

- `Seo` avec `title`, `description`, `canonical`, `ogImage`
- JSON-LD `BlogPosting` (schema.org)
- BreadcrumbList : Accueil > Blog > [Titre]

---

### Phase D — Admin Blog (UX WordPress)

**Complexité : Élevée**

#### D.1 Routes

| Route | Composant | Protection |
|-------|-----------|------------|
| `/admin/blog` | `AdminBlogList` | RequireAdmin |
| `/admin/blog/new` | `AdminBlogEditor` | RequireAdmin |
| `/admin/blog/:id/edit` | `AdminBlogEditor` | RequireAdmin |

#### D.2 Composant `RequireAdmin`

- Si pas connecté → redirect `/auth/login`
- Si connecté mais `role !== 'admin'` → redirect `/` + toast "Accès refusé"
- Affiche enfants si OK

#### D.3 Liste articles

- Tableau : titre, slug, statut, date, catégorie, actions (éditer, publier/dépublier)
- Filtres : brouillons / publiés
- Bouton "Nouvel article"

#### D.4 Éditeur

| Champ | Type | Notes |
|-------|------|-------|
| Titre | Input text | Obligatoire |
| Slug | Input text | Auto-généré (slugify), modifiable |
| Description SEO | Textarea | meta_description |
| Contenu | Rich text editor | WYSIWYG |
| Hero image | Upload + preview | Drag & drop, compression |
| OG image | Upload (optionnel) | Fallback = hero |
| Catégorie | Select | guides, itineraires, conseils, comparatifs, actualites, securite |
| CTA actif | Checkbox | Afficher bouton "Réserver" |
| FAQ | Répétable (q/a) | Optionnel |
| Vidéo | Input URL | YouTube/Vimeo |
| Boutons | Enregistrer brouillon / Publier / Dépublier | |

#### D.5 Gestion erreurs

- Toast sur succès/erreur
- Validation formulaire (Zod + react-hook-form)
- États loading sur boutons

---

### Phase E — Sitemap + robots

**Complexité : Faible**

#### E.1 Option A — Build-time (actuel)

Modifier `scripts/generate-sitemap.js` :
- Ajouter `STATIC_URLS` : `/blog`
- `fetchBlogPosts()` : fetch Supabase `blog_posts` où `status='published'`
- Pour chaque post : `<loc>https://rentanoo.com/blog/{slug}</loc>`

**Limite** : sitemap figé au build ; nouveau post = redéploiement.

#### E.2 Option B — Sitemap dynamique (recommandé long terme)

- Route Express `GET /sitemap.xml` (ou `GET /api/sitemap.xml`)
- Génère XML à la volée : static URLs + vehicles + blog posts
- Mettre à jour `robots.txt` : `Sitemap: https://rentanoo.com/sitemap.xml` (ou `/api/sitemap.xml` si servi par Express)
- Cache header 1h sur la réponse

**Recommandation** : Option A pour MVP (simple), Option B en Phase 2.

#### E.3 robots.txt

- Déjà OK : `Disallow:` vide, Sitemap présent
- Pas de changement si sitemap reste à `/sitemap.xml`

---

### Phase F — Tests & Qualité

**Complexité : Moyenne**

| Type | Actions |
|------|---------|
| **Unitaires** | Zod schemas (blog create/update) |
| **E2E** | Publier un article → vérifier visible sur `/blog/:slug` |
| **Lighthouse** | Performance, SEO sur page article |
| **Sécurité** | Tester 401/403 sur `/api/admin/*` sans JWT / avec JWT non-admin |

---

## 3) LIVRABLE 3 — DÉCISIONS TECHNIQUES

### 3.1 Éditeur riche

| Option | Recommandation | Justification |
|--------|----------------|---------------|
| **TipTap** | ✅ Oui | Léger, headless, extensible, support images inline, bien maintenu |
| Lexical | Non | Plus lourd, écosystème Facebook |
| Slate | Non | Plus bas niveau |
| Quill | Non | Moins moderne |

**Choix : TipTap** — package `@tiptap/react`, extensions : StarterKit, Image, Link. Output HTML.

### 3.2 Format stockage contenu

| Option | Recommandation | Justification |
|--------|----------------|---------------|
| **HTML** | ✅ Oui | Direct output de TipTap, pas de conversion, `dangerouslySetInnerHTML` ou lib sécurisée (DOMPurify) |
| Markdown | Non | Nécessite conversion éditeur → MD, parsing à l'affichage |
| JSON | Non | Plus flexible mais plus complexe, TipTap peut exporter JSON mais HTML suffit pour MVP |

### 3.3 Stratégie images

| Élément | Décision |
|---------|----------|
| **Alt text** | Obligatoire pour hero et images inline (SEO) |
| **Compression** | Réutiliser `compressForUpload` avant upload (côté client ou serveur) |
| **Taille max** | 5 MB en entrée, compression → ~500 KB max |

### 3.4 Langues

| Phase | Décision |
|-------|----------|
| **MVP** | FR uniquement — pas de colonne `language_code` utilisée |
| **Phase 2** | Ajouter `language_code` (fr, en, de, it), filtre par langue sur liste, URL `/blog/:slug` ou `/en/blog/:slug` selon choix |

---

## 4) RISQUES + MITIGATIONS

| Risque | Mitigation |
|--------|------------|
| **SEO SPA** | Meta dynamiques via Helmet ; Google indexe bien ; sitemap à jour |
| **XSS (contenu HTML)** | Sanitize avec DOMPurify avant `dangerouslySetInnerHTML` |
| **Upload malveillant** | Validation type MIME, extension ; pas d'exécution côté serveur |
| **Accès admin** | JWT + vérification `profiles.role` ; pas de bypass RLS pour anon sur INSERT/UPDATE |
| **Rate limit** | Limiter `/api/admin/*` pour éviter brute force |
| **Perf (images)** | Compression avant upload ; lazy load images dans article ; `getOptimizedImageUrl` si applicable |
| **Sitemap obsolète** | Option B (dynamique) en Phase 2 pour éviter redéploiement à chaque nouvel article |

---

## 5) CHECKLIST RÉCAPITULATIVE

### Phase A — Data & Storage
- [ ] Migration SQL `blog_posts`
- [ ] RLS policies
- [ ] Bucket Storage `blog` (public read)
- [ ] Types Supabase générés

### Phase B — API
- [ ] `getAdminUserFromRequest`
- [ ] GET `/api/blog`, GET `/api/blog/:slug`
- [ ] POST/PATCH/DELETE `/api/admin/blog`
- [ ] POST `/api/admin/upload`
- [ ] POST publish/unpublish
- [ ] Zod validation
- [ ] Rate limit admin

### Phase C — Front public
- [ ] Routes `/blog`, `/blog/:slug`
- [ ] `BlogIndex`, `BlogArticle`
- [ ] `BlogCtaReservation`, `BlogStickyCta`, `BlogVehicleShowcase`
- [ ] SEO (Seo, JSON-LD, breadcrumbs)

### Phase D — Admin
- [ ] `RequireAdmin` guard
- [ ] Routes `/admin/blog`, `/admin/blog/new`, `/admin/blog/:id/edit`
- [ ] Liste articles
- [ ] Éditeur TipTap
- [ ] Upload hero, OG image
- [ ] Champs meta, catégorie, FAQ, vidéo
- [ ] Boutons brouillon / publier

### Phase E — Sitemap
- [ ] Étendre `generate-sitemap.js` (blog posts)
- [ ] Ou endpoint dynamique (Phase 2)

### Phase F — Tests
- [ ] Tests Zod
- [ ] E2E publish → view
- [ ] Lighthouse
- [ ] 401/403 admin API

---

## 6) ESTIMATION COMPLEXITÉ PAR PHASE

| Phase | Complexité | Durée estimée |
|-------|-------------|---------------|
| A — Data & Storage | Faible | 0,5 j |
| B — API Express | Moyenne | 1,5 j |
| C — Front public | Moyenne | 1,5 j |
| D — Admin blog | Élevée | 2–3 j |
| E — Sitemap | Faible | 0,25 j |
| F — Tests | Moyenne | 0,5 j |
| **Total** | | **6–7 jours** |

---

*Document généré — aucune modification du code. Valider les clarifications (section 0) avant de démarrer l'implémentation.*
