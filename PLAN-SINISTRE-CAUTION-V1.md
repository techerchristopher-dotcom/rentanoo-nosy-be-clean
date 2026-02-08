# 🔍 DIAG — Page "Sinistre & caution" (locataire V1) + raccourci footer

**Date** : 2026-02-06  
**Objectif** : Créer la page `/sinistre-caution` pour locataires, avec FAQ et raccourci footer.  
**Statut** : Diagnostic complet — **aucune implémentation** tant que ce plan n'est pas validé.

---

## A) Réponses techniques (cartographie de l'existant)

### 1) Framework / Routing

| Élément | Valeur |
|---------|--------|
| **Framework** | **Vite + React 18** (pas Next.js) |
| **Router** | React Router v6 (`react-router-dom`) |
| **Routing** | Côté client uniquement (SPA) |
| **Serveur prod** | Express.js avec fallback SPA → `index.html` pour toutes les routes non-API |

**Route cible** : `/sinistre-caution`  
**Fichier route actuel** : **n'existe pas**. La page doit être créée.

### 2) Emplacement des routes

- **Fichier principal** : `src/App.tsx`
- Les routes critiques (Index, Login, Legal, Contact) sont importées directement.
- Les routes non critiques sont lazy-loaded.
- Pour une page statique informative, une import directe est adaptée (comme `Legal`).

### 3) Système de styles / charte

| Élément | Valeur |
|---------|--------|
| **Stack CSS** | **Tailwind CSS** |
| **Config** | `tailwind.config.ts` |
| **Design system** | Charte "Lagoon" (Mayotte) dans `src/index.css` |

**Tokens de marque (CSS variables)** :
- **Primary** : `hsl(185 84% 25%)` — bleu lagune
- **Primary-soft** : `hsl(185 45% 85%)`
- **Background** : `hsl(200 30% 97%)`
- **Muted** : `hsl(190 25% 94%)`
- **Success** : `hsl(165 85% 35%)`
- **Radius** : `var(--radius)` (0.5rem)
- **Gradients** : `gradient-lagoon`, `gradient-soft`, `gradient-sunset`
- **Classes utilitaires** : `bg-gradient-soft`, `text-primary`, `bg-primary/5`, etc.

### 4) Composants UI réutilisables

| Composant | Fichier | Usage |
|-----------|---------|-------|
| **Card** | `@/components/ui/card` | Card, CardHeader, CardTitle, CardDescription, CardContent |
| **Button** | `@/components/ui/button` | variants: default, outline, destructive, secondary, ghost, link |
| **Accordion** | `@/components/ui/accordion` | Accordion, AccordionItem, AccordionTrigger, AccordionContent (Radix UI) |
| **Container** | Pattern `container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl` | Utilisé dans Legal, Contact |
| **Footer** | `@/components/layout/footer` | Composant unique, utilisé par toutes les pages |

### 5) Pages de référence

| Page | Fichier | Structure |
|------|---------|-----------|
| **Legal** | `src/pages/legal/Legal.tsx` | `min-h-screen flex flex-col bg-gradient-soft` → main → `container max-w-4xl` → Cards + prose |
| **Contact** | `src/pages/Contact.tsx` | Idem + formulaire, Footer en bas |

### 6) Footer

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/components/layout/footer.tsx` |
| **Type** | Composant unique, partagé par toutes les pages |
| **Structure** | 4 colonnes (md) : Logo + description | Quick Links | Legal Links | (vide) |
| **Section Legal Links** | lignes 59–73 : CGU, Politique confidentialité, Mentions légales (tous → `/legal`) |
| **Emplacement lien Sinistre** | Dans la section **"Legal Links"** (ou nouvelle section "Aide / Locataire") |

**Option recommandée** : Ajouter le lien dans la section "Legal Links" (ou renommer en "Informations" et inclure Sinistre & caution).

### 7) i18n

- **Lib** : `react-i18next` + `i18next`
- **Namespace** : `common`
- **Fichiers** : `src/i18n/locales/{fr,en,de,it}/common.json`
- Le footer utilise `useTranslation('common')` et `t('footer.description')`, etc.
- **À prévoir** : clé `footer.sinistreCaution` (ou équivalent) pour le libellé du lien.

---

## B) Structure de la page (sections + slots images)

La page contiendra **8 sections**, chacune avec un **slot image placeholder** :

| # | Section | Contenu | Slot image |
|---|---------|---------|------------|
| 1 | **HERO** | Titre + sous-titre + box "À retenir" | Image hero |
| 2 | **Pourquoi vous recevez cette page** | Explication courte | Image |
| 3 | **Comment ça se passe (process)** | Timeline / cards étapes | Image |
| 4 | **La caution : à quoi elle sert** | Bullets explicatifs | Image |
| 5 | **Paiement CB = avantage** | Encadré rassurant | Image |
| 6 | **Documents mis à disposition** | Liste documents | Image |
| 7 | **FAQ** | Accordion (AccordionItem × N) | Image ou bandeau |
| 8 | **CTA final** | Contact Rentanoo | Mini-illustration |

**Layout proposé** :
- **Mobile** : 1 colonne, image entre chaque section (ou au-dessus)
- **Desktop** : 1 colonne centrée (comme Legal) avec images en full-width entre sections, OU 2 colonnes (texte + image à droite) — à confirmer avec le commanditaire.

---

## C) SEO / Tracking / Accessibilité

| Point | État actuel | Action prévue |
|-------|-------------|---------------|
| **Title / meta** | Pas de Helmet/React-Helmet détecté ; `index.html` a un seul title global | Step 6 : ajouter un composant type `useEffect` + `document.title` (ou `react-helmet-async` si présent) |
| **Hn structure** | — | H1 unique (titre page), H2 par section |
| **OpenGraph** | Global dans `index.html` | Optionnel : meta dynamiques par page (Step 6) |
| **Images** | — | `alt` descriptif, placeholder si image absente |
| **Tracking** | Aucun GTM/Plausible identifié dans le repo | Si besoin : event sur clic CTA "Contacter Rentanoo" / lien footer |

---

## D) Inventaire des fichiers à modifier (sans les modifier)

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajouter route `<Route path="/sinistre-caution" element={<SinistreCaution />} />` |
| `src/pages/sinistre-caution/SinistreCaution.tsx` | **Nouveau** — Page complète avec 8 sections |
| `src/components/layout/footer.tsx` | Ajouter lien "Sinistre & caution" dans section Legal (ou nouvelle section) |
| `src/i18n/locales/fr/common.json` | Ajouter clé(s) pour libellé lien + éventuellement titres de page |
| `src/i18n/locales/en/common.json` | Idem (traduction EN) |
| `src/i18n/locales/de/common.json` | Idem (traduction DE) |
| `src/i18n/locales/it/common.json` | Idem (traduction IT) |

**Option** : Créer `src/pages/sinistre-caution/index.tsx` si on préfère un dossier dédié (comme `legal/`, `dictionary/`).

---

## E) Plan d'implémentation @PLAN-SINISTRE-CAUTION-V1

### Step 1 — Créer la page statique avec placeholders images
- Créer `src/pages/sinistre-caution/SinistreCaution.tsx` (ou `SinistreCaution.tsx` à la racine de `pages`)
- Structure : 8 sections avec contenu texte + `<div>` ou `<img>` placeholder (`aria-hidden` ou `alt="Placeholder"`) pour chaque slot image
- Utiliser `Card`, `container`, `Footer` comme Legal
- **Pas d'images réelles** — uniquement des zones réservées (ex: `className="h-48 bg-muted rounded-lg"` avec texte "Image à venir")
- Ajouter la route dans `App.tsx`
- **Livrable** : Page accessible sur `/sinistre-caution`, structure OK, pas de style fin

### Step 2 — Brancher le style selon la charte
- Appliquer classes Tailwind : `bg-gradient-soft`, `text-primary`, `prose`, `border-primary/20`, etc.
- Réutiliser les composants `Card`, `Button` existants
- Harmoniser avec Legal et Contact
- **Livrable** : Page visuellement cohérente avec le reste du site

### Step 3 — Ajouter FAQ (accordion) et CTA
- Intégrer `Accordion` de `@/components/ui/accordion`
- Remplir les items FAQ avec le contenu fourni
- Ajouter CTA "Contacter Rentanoo" → lien vers `/contact`
- **Livrable** : FAQ fonctionnelle, CTA cliquable

### Step 4 — Ajouter le lien dans le footer
- Modifier `footer.tsx` : ajouter un `<Link to="/sinistre-caution">` dans la section appropriée
- Ajouter les clés i18n dans les 4 locales (fr, en, de, it)
- **Livrable** : Lien "Sinistre & caution" visible dans le footer sur toutes les pages

### Step 5 — Checks responsive + lint + build
- Vérifier responsive mobile/tablet/desktop
- `npm run lint` et `npm run build` sans erreur
- **Livrable** : Page stable, build OK

### Step 6 — (Optionnel) SEO metas
- Ajouter `document.title` et `meta name="description"` dynamiques pour la page
- Vérifier structure H1/H2
- **Livrable** : Meta correctes pour la page

---

## F) Dépendances entre steps

```
Step 1 ──► Step 2 ──► Step 3
  │          │          │
  │          │          └──► Step 4 (footer)
  │          │
  │          └──► Step 5 (après Step 4)
  │
  └──► Step 6 (optionnel, indépendant)
```

Chaque step est **mergeable** seul et **testable** indépendamment.

---

## G) Points à clarifier avec le commanditaire

1. **Layout desktop** : 1 colonne (comme Legal) ou 2 colonnes (texte + image à droite) ?
2. **Contenu précis** : Texte du mail + version développée + FAQ — à fournir pour Step 1/3.
3. **Images** : Dimensions souhaitées pour les placeholders ? (ex: 16:9, 4:3)
4. **Tracking** : Utilisez-vous Plausible/GTM ? Si oui, quel event pour le CTA ?

---

**Fin du diagnostic.** Aucune implémentation effectuée. Attente validation du plan avant Step 1.
