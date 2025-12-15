# Diagnostic Complet - Rentanoo Nosy Be

## 📦 Stack Technique

### Framework & Build
- **Framework** : React 18.3.1 (SPA)
- **Build Tool** : Vite 5.4.19 avec plugin React SWC
- **Node.js** : >= 18.0.0 (configuré pour Node 22 en production via nixpacks.toml)
- **TypeScript** : 5.8.3
- **Routing** : React Router DOM 6.30.1

### UI & Styling
- **UI Components** : shadcn/ui (Radix UI primitives)
- **Styling** : Tailwind CSS 3.4.17
- **Icons** : Lucide React 0.462.0, React Icons 5.5.0
- **Animations** : tailwindcss-animate, Framer Motion (via Radix)

### Backend & Database
- **Backend API** : Express 5.1.0 (server/index.ts)
- **Database** : Supabase (PostgreSQL)
- **ORM/Client** : @supabase/supabase-js 2.58.0
- **Project ID** : `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)

### State Management & Data Fetching
- **Query** : @tanstack/react-query 5.83.0
- **Forms** : react-hook-form 7.61.1 + Zod 3.25.76
- **Auth** : Supabase Auth (via AuthContext)

### Payment & Services
- **Payment** : Stripe 19.2.0 (@stripe/stripe-js, @stripe/react-stripe-js)
- **PDF Generation** : jsPDF 3.0.3 + html2canvas 1.4.1
- **Date Handling** : date-fns 3.6.0 (locale FR)

### Déploiement
- **Build** : `npm run build` → génère `dist/`
- **Production Server** : Express sert statiques + API sur même port
- **Deploy Config** : nixpacks.toml (Node 22, npm ci, build, start:prod)

---

## 📁 Arborescence

### Pages (`src/pages/`)
```
pages/
├── Index.tsx                    # Page d'accueil avec recherche véhicules
├── auth/                        # Authentification
│   ├── Login.tsx
│   ├── Register.tsx
│   └── Callback.tsx
├── owner/                       # Espace propriétaire
│   ├── Dashboard.tsx
│   ├── OwnerVehicles.tsx
│   ├── OwnerBookings.tsx
│   ├── OwnerBookingRequests.tsx
│   ├── AddVehicle.tsx
│   ├── ManageVehicle.tsx
│   └── RentMyCarLanding.tsx
├── renter/                      # Espace locataire
│   ├── RenterBookings.tsx
│   ├── PaymentSuccess.tsx
│   └── PaymentCancel.tsx
├── vehicles/
│   └── VehicleDetails.tsx
├── booking/
│   ├── BookingDiscussion.tsx
│   └── MessageToOwners.tsx
├── admin/
│   └── Admin.tsx
└── legal/
    └── Legal.tsx
```

### Routing (`src/App.tsx`)
- **SPA Routing** : React Router v6 avec `<BrowserRouter>`
- **Routes principales** :
  - `/` → Index (recherche véhicules)
  - `/vehicle/:license` → Détails véhicule
  - `/me/owner/*` → Dashboard propriétaire
  - `/me/renter/*` → Espace locataire
  - `/auth/*` → Authentification
- **Fallback** : Route `*` → NotFound

### Composants (`src/components/`)
- **UI Primitives** : `components/ui/` (78 fichiers shadcn/ui)
- **Business Logic** :
  - `vehicles/` → Cartes véhicules
  - `booking/` → Modales réservation
  - `filters/` → Barre de filtres
  - `layout/` → Navbar, Footer
- **Modules métier** :
  - `modules/etatDesLieuxDepart/` → 18 fichiers
  - `modules/etatDesLieuxRetour/` → 8 fichiers

### Services (`src/services/`)
- **Supabase Services** :
  - `supabase/vehicles.ts` → Recherche véhicules
  - `supabase/bookings.ts` → Gestion réservations
  - `supabase/conversations.ts` → Messagerie
  - `supabase/photos.ts` → Gestion photos
  - `supabase/profile.ts` → Profils utilisateurs
- **Local Storage** :
  - `localStorage/searchStorage.ts` → Sauvegarde critères recherche
  - `localStorage/bookingStorage.ts` → Sauvegarde réservations
- **PDF Services** :
  - `checkinDepartPdfService.ts`
  - `checkinReturnPdfService.ts`

### API Backend (`server/index.ts`)
- **Endpoints** :
  - `POST /api/stripe/webhook` → Webhook Stripe
  - `POST /api/checkin/start` → Démarrage état des lieux
  - `POST /api/checkin/saveDraft` → Sauvegarde brouillon
  - `GET /api/stripe-health` → Health check Stripe
- **Production** : Express sert `dist/` + API sur même port

### Base de données (Supabase)
- **Tables principales** :
  - `profiles` → Utilisateurs
  - `vehicles` → Véhicules
  - `bookings` → Réservations
  - `conversations` → Conversations
  - `messages` → Messages
  - `checkin_depart` → États des lieux départ
  - `checkin_return` → États des lieux retour
  - `photos` → Photos véhicules
- **Storage** : Supabase Storage pour images
- **Auth** : Supabase Auth (email/password, OAuth)

### Données statiques (`src/data/`)
- `brands.ts` → Marques véhicules (32 marques)
- `colors.ts` → Couleurs
- `fuelTypes.ts` → Types carburant
- `transmissionTypes.ts` → Transmissions
- `vehicleCategories.ts` → Catégories
- `locations.ts` → Lieux Mayotte (Aéroport, Barges, Communes)

---

## 📝 Contenu

### Source du contenu
- **Texte hardcodé** : Principalement dans les composants React (pas de CMS)
- **Données dynamiques** : Supabase (véhicules, réservations, profils)
- **Données statiques** : Fichiers TypeScript (`src/data/*.ts`)
- **Traductions** : Aucune (tout en français)

### Ajout/Édition de contenu
1. **Véhicules** : Via interface propriétaire (`/me/owner/vehicles/add`)
2. **Profils** : Via page Profile (`/profile`)
3. **Données statiques** : Édition directe fichiers `src/data/*.ts`
4. **Textes UI** : Édition directe composants React
5. **Contenu légal** : Page `/legal` (composant React)

### Pas de CMS
- Aucun headless CMS (Strapi, Contentful, etc.)
- Pas de système de gestion de contenu
- Contenu géré via code source

---

## 🌍 i18n (Internationalisation)

### État actuel
- **❌ Aucune i18n présente**
- **Langue unique** : Français (hardcodé)
- **Locale date-fns** : `fr` utilisée partout (`date-fns/locale/fr`)

### Recommandation : react-i18next

**Pourquoi react-i18next ?**
- ✅ Compatible React Router v6
- ✅ Lazy loading des traductions
- ✅ Support namespaces
- ✅ TypeScript-friendly
- ✅ Gratuit et open-source
- ✅ Large communauté

**Installation** :
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**Structure proposée** :
```
src/
├── i18n/
│   ├── config.ts              # Configuration i18next
│   └── locales/
│       ├── fr/
│       │   ├── common.json
│       │   ├── vehicles.json
│       │   ├── booking.json
│       │   └── auth.json
│       ├── en/
│       │   ├── common.json
│       │   ├── vehicles.json
│       │   ├── booking.json
│       │   └── auth.json
│       └── mg/                 # Malgache (optionnel)
│           └── ...
```

**Format URL par langue** :
- Option 1 : Préfixe `/fr/`, `/en/` (recommandé)
- Option 2 : Sous-domaine `fr.rentanoo.com`, `en.rentanoo.com`
- Option 3 : Query param `?lang=fr` (moins SEO-friendly)

**Exemple config** (`src/i18n/config.ts`) :
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr/common.json';
import en from './locales/en/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { common: fr },
      en: { common: en },
    },
    fallbackLng: 'fr',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
```

**Intégration React Router** :
- Wrapper `<I18nextProvider>` dans `App.tsx`
- Hook `useTranslation()` dans composants
- Route `/fr/*`, `/en/*` avec détection langue

---

## 🔍 Recherche

### État actuel
- **✅ Recherche présente** : Recherche véhicules sur page Index
- **Service** : `SupabaseVehiclesService.searchAvailableVehicles()`
- **Filtres** : Location, dates, carburant, transmission, catégories
- **Stockage** : LocalStorage (`searchStorage.ts`) pour critères sauvegardés

### Options gratuites pour améliorer la recherche

#### Option 1 : Supabase Full-Text Search (PostgreSQL)
**Avantages** :
- ✅ Gratuit (inclus Supabase)
- ✅ Pas de dépendance externe
- ✅ Recherche full-text PostgreSQL native
- ✅ Index GIN pour performance

**Implémentation** :
```sql
-- Créer index full-text sur vehicles
CREATE INDEX idx_vehicles_fts ON vehicles 
USING gin(to_tsvector('french', 
  coalesce(brand, '') || ' ' || 
  coalesce(model, '') || ' ' || 
  coalesce(description, '')
));

-- Requête
SELECT * FROM vehicles 
WHERE to_tsvector('french', brand || ' ' || model || ' ' || description) 
@@ plainto_tsquery('french', 'renault clio');
```

#### Option 2 : Meilisearch (Self-hosted)
**Avantages** :
- ✅ Open-source, gratuit
- ✅ Typo-tolerance
- ✅ Facettes/filtres avancés
- ✅ API REST simple

**Déploiement** :
- Docker : `docker run -p 7700:7700 getmeili/meilisearch`
- Index véhicules via API
- Frontend : SDK JavaScript

**Limite** : Nécessite serveur/hébergement pour Meilisearch

**Recommandation** : **Option 1 (Supabase Full-Text)** car déjà intégré et gratuit.

---

## 📚 Modèle "Dictionnaire/Étymologie"

### Schéma proposé : Table `dictionary_entries`

```sql
CREATE TABLE dictionary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Mot/terme principal
  word TEXT NOT NULL,
  word_normalized TEXT NOT NULL, -- Version normalisée (lowercase, sans accents)
  
  -- Langue du mot
  language_code TEXT NOT NULL DEFAULT 'mg', -- 'mg' (malgache), 'fr' (français), etc.
  
  -- Définitions (JSONB pour flexibilité)
  definitions JSONB NOT NULL DEFAULT '[]', -- Array de définitions
  -- Structure: [{ "text": "...", "source": "...", "examples": [...] }]
  
  -- Étymologie
  etymology JSONB, -- { "origin": "...", "derivation": "...", "related_words": [...] }
  
  -- Prononciation
  pronunciation TEXT, -- Phonétique IPA ou transcription
  
  -- Catégories/Tags
  categories TEXT[], -- ['verbe', 'nom', 'adjectif', 'expression']
  tags TEXT[], -- Tags libres
  
  -- Relations
  related_entries UUID[], -- IDs d'autres entrées liées
  synonyms TEXT[], -- Synonymes
  antonyms TEXT[], -- Antonymes
  
  -- Métadonnées
  usage_examples JSONB DEFAULT '[]', -- Exemples d'usage
  -- Structure: [{ "sentence": "...", "translation": "...", "context": "..." }]
  
  -- Sources/Références
  sources JSONB DEFAULT '[]', -- Sources bibliographiques
  -- Structure: [{ "name": "...", "page": "...", "year": ... }]
  
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  verified BOOLEAN DEFAULT false, -- Vérifié par expert
  
  -- Auteur/Éditeur
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX idx_dictionary_word_normalized ON dictionary_entries(word_normalized);
CREATE INDEX idx_dictionary_language ON dictionary_entries(language_code);
CREATE INDEX idx_dictionary_categories ON dictionary_entries USING gin(categories);
CREATE INDEX idx_dictionary_fts ON dictionary_entries 
  USING gin(to_tsvector('french', word || ' ' || COALESCE(definitions::text, '')));

-- RLS Policies
ALTER TABLE dictionary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON dictionary_entries
  FOR SELECT USING (status = 'published');

CREATE POLICY "Authenticated insert" ON dictionary_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner update" ON dictionary_entries
  FOR UPDATE USING (auth.uid() = created_by);
```

### Où l'implémenter

1. **Service** : `src/services/supabase/dictionary.ts`
   ```typescript
   export class DictionaryService {
     static async searchEntries(query: string, lang?: string) {
       // Recherche full-text
     }
     static async getEntry(id: string) { }
     static async createEntry(entry: DictionaryEntry) { }
   }
   ```

2. **Types** : `src/types/dictionary.ts`
   ```typescript
   export interface DictionaryEntry {
     id: string;
     word: string;
     language_code: string;
     definitions: Definition[];
     etymology?: Etymology;
     // ...
   }
   ```

3. **Pages** : 
   - `src/pages/dictionary/Index.tsx` → Liste/recherche
   - `src/pages/dictionary/[id].tsx` → Détail entrée
   - `src/pages/dictionary/Add.tsx` → Ajout (admin)

4. **Composants** : `src/components/dictionary/` → Cartes, formulaires

---

## 🔌 Plugins/Paquets Gratuits Recommandés

### 1. react-i18next (i18n)
**Pourquoi** :
- ✅ Gratuit, open-source
- ✅ Compatible React Router v6
- ✅ TypeScript support
- ✅ Lazy loading
- ✅ Détection automatique langue

**Installation** :
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**Usage** :
```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('welcome.title')}</h1>;
}
```

---

### 2. @tanstack/react-virtual (Virtualisation)
**Pourquoi** :
- ✅ Gratuit (TanStack)
- ✅ Performance pour listes longues (véhicules, entrées dictionnaire)
- ✅ Compatible avec React Query
- ✅ Réduit le rendu DOM

**Installation** :
```bash
npm install @tanstack/react-virtual
```

**Usage** : Virtualiser la liste de véhicules sur Index.tsx pour améliorer les performances.

---

### 3. zod-i18n-map (Validation i18n)
**Pourquoi** :
- ✅ Gratuit
- ✅ Traductions erreurs Zod
- ✅ Compatible react-hook-form
- ✅ Améliore UX formulaires multilingues

**Installation** :
```bash
npm install zod-i18n-map
```

**Usage** : Intégrer avec react-i18next pour messages d'erreur traduits.

---

## ⚠️ Risques & Contraintes

### Performance
- **Risque** : Liste véhicules non virtualisée → ralentissement avec 100+ véhicules
- **Solution** : @tanstack/react-virtual pour virtualisation
- **Risque** : Images non optimisées → poids pages élevé
- **Solution** : Utiliser Supabase Image Transform API ou Next.js Image

### SEO
- **Risque** : SPA React → contenu non indexable sans SSR
- **Solution** : 
  - Prerender pages importantes (Vite Plugin SSR)
  - Meta tags dynamiques (react-helmet-async)
  - Sitemap.xml généré

### Contenu multilingue
- **Risque** : Pas d'i18n → difficile d'ajouter langues
- **Solution** : Implémenter react-i18next (voir section i18n)
- **Risque** : URLs non localisées → SEO multilingue faible
- **Solution** : Routes `/fr/*`, `/en/*` avec détection langue

### Complexité
- **Risque** : Pas de CMS → contenu géré par développeurs
- **Solution** : Interface admin pour gestion contenu (dictionnaire, textes légaux)
- **Risque** : Pas de système de recherche avancé → recherche limitée
- **Solution** : Supabase Full-Text Search (voir section Recherche)

### Autres contraintes
- **Base de données** : Dépendance Supabase (vendor lock-in partiel)
- **Paiement** : Stripe uniquement (pas d'alternative intégrée)
- **Auth** : Supabase Auth uniquement (pas de SSO custom)

---

## 📋 Dépendances Pertinentes (package.json)

### Core
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "typescript": "^5.8.3",
  "vite": "^5.4.19"
}
```

### UI
```json
{
  "@radix-ui/*": "Multiple packages (shadcn/ui)",
  "tailwindcss": "^3.4.17",
  "lucide-react": "^0.462.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1"
}
```

### Data & State
```json
{
  "@tanstack/react-query": "^5.83.0",
  "@supabase/supabase-js": "^2.58.0",
  "react-hook-form": "^7.61.1",
  "zod": "^3.25.76"
}
```

### Utils
```json
{
  "date-fns": "3.6.0",
  "stripe": "^19.2.0",
  "jspdf": "^3.0.3",
  "html2canvas": "^1.4.1"
}
```

---

## 📄 Fichiers de Config i18n

**État** : ❌ Aucun fichier de config i18n présent

**Fichiers à créer** (après installation react-i18next) :
- `src/i18n/config.ts` → Configuration i18next
- `src/i18n/locales/fr/common.json` → Traductions françaises
- `src/i18n/locales/en/common.json` → Traductions anglaises

---

## 🎯 Résumé Exécutif

- **Stack** : React 18 + Vite + TypeScript + Supabase + Express
- **i18n** : ❌ Absent → Recommandation : react-i18next
- **Recherche** : ✅ Basique présente → Amélioration : Supabase Full-Text Search
- **Contenu** : Hardcodé dans composants (pas de CMS)
- **Dictionnaire** : Schéma proposé avec table `dictionary_entries` (JSONB flexible)
- **Plugins** : react-i18next, @tanstack/react-virtual, zod-i18n-map
- **Risques** : SEO (SPA), Performance (listes), Multilingue (absent)

---

*Diagnostic généré le : $(date)*

