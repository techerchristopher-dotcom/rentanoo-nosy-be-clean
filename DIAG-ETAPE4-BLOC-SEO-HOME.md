# DIAG ÉTAPE 4 — Bloc texte SEO Home (120–150 mots)

**Date :** 20 février 2026  
**Objectif :** Identifier où et comment intégrer un paragraphe SEO sur la page d'accueil sans casser le design (i18n + structure H1/H2).  
**Contrainte :** AUCUNE MODIFICATION du code — diagnostic uniquement.

---

## 1) Localisation de la Home

| Élément | Valeur |
|---------|--------|
| **Composant principal** | `src/pages/Index.tsx` |
| **Route** | `/` |
| **Composant enfants** | `HomeResults` (`src/components/home/HomeResults.tsx`), `SearchBarAirbnb`, `Footer`, `Seo` |

### Structure DOM actuelle (sections principales)

```
<div className="min-h-screen flex flex-col bg-gradient-soft">
  <Seo />
  <main className="flex-1">
    <!-- 1. Hero Section -->
    <section className="bg-gradient-lagoon text-white py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1>...</h1>
        <p>...</p>  <!-- heroSubtitle -->
        <SearchBarAirbnb />
      </div>
    </section>

    <!-- 2. Filters & Results (HomeResults) -->
    <section className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Filtres -->
        <div className="mb-8">...</div>
        <!-- Résultats -->
        <div>
          <h2>Véhicules disponibles</h2>
          <div className="grid ...">...</div>
        </div>
      </div>
    </section>
  </main>
  <Footer />
</div>
```

---

## 2) Structure SEO existante

| Élément | Valeur exacte |
|---------|---------------|
| **H1** | `t("home.heroTitle")` → « Louez votre scooter à Nosy Be en quelques clics » |
| **Texte intro** | Oui — `t("home.heroSubtitle")` → « RENTANOO, la première plateforme de location de scooters 100 % en ligne » |
| **H2** | Un seul : `t("common.vhicules_disponibles")` → « Véhicules disponibles » (dans HomeResults) |
| **H3** | Aucun sur la Home |
| **Zone hero** | ✅ Oui — section `bg-gradient-lagoon` avec H1 + subtitle + SearchBar |
| **Section véhicules** | ✅ Oui — HomeResults (filtres + grille de véhicules) |

### Hiérarchie actuelle

- **H1** : Hero (location scooter Nosy Be)
- **H2** : Véhicules disponibles (sous les filtres)

**Conclusion** : Le bloc texte SEO (120–150 mots) pourrait être encadré par un **H2** dédié (ex. « Location scooter Nosy Be : vos avantages ») ou intégré comme paragraphe sans nouveau H2 si on évite de surcharger la hiérarchie.

---

## 3) Deux emplacements candidats pour le bloc texte

### Emplacement recommandé #1 : **Entre le Hero et HomeResults** (prioritaire)

| Critère | Valeur |
|---------|--------|
| **Fichier** | `src/pages/Index.tsx` |
| **Zone JSX** | Entre la fermeture de la `</section>` du Hero (ligne ~419) et l’ouverture du `{!showResults ? ... : <Suspense><HomeResults />` (ligne ~421) |
| **Position** | Nouvelle section insérée juste après le Hero, avant les résultats |
| **Impact UX** | Visible immédiatement sous la barre de recherche, lecture naturelle avant la liste de véhicules. Pas de rupture visuelle si on utilise le même `container` et une typo sobre |
| **Responsive** | `container mx-auto px-4 sm:px-6 lg:px-8` — déjà cohérent. `max-w-3xl mx-auto` pour limiter la largeur du texte (comme heroSubtitle) |
| **Style existant** | Hero : `text-white/90 max-w-3xl mx-auto`. Pour le bloc SEO : fond clair `bg-background` ou `bg-white/80` pour différencier du hero, `text-muted-foreground text-base leading-relaxed max-w-3xl mx-auto` (inspiré footer, SinistreCaution, RentMyCarLanding) |

**Avantage** : Le bloc est lu après le CTA (SearchBar) et avant la liste — ordre logique pour SEO et UX.

---

### Emplacement recommandé #2 : **Au-dessus des filtres dans HomeResults**

| Critère | Valeur |
|---------|--------|
| **Fichier** | `src/components/home/HomeResults.tsx` |
| **Zone JSX** | Au début de la section, avant la div Filtres (`<div className="mb-8">` ligne 56), ou entre les filtres et le H2 « Véhicules disponibles » |
| **Position** | En tête de la section résultats, ou juste avant le H2 |
| **Impact UX** | Plus proche du contenu véhicules. Peut être perçu comme « texte au-dessus de la liste » — légèrement plus dense |
| **Responsive** | Même `container` que HomeResults — pas de changement |
| **Style existant** | `text-muted-foreground` (HomeResults, Footer), `leading-relaxed` ou `leading-7` (SinistreCaution) |

**Avantage** : Tout le contenu « véhicules + SEO » reste dans le même composant. **Inconvénient** : Moins visible qu’en position #1 si l’utilisateur scroll vite.

---

## 4) i18n / traduction

| Question | Réponse |
|----------|---------|
| **La Home utilise-t-elle i18n ?** | ✅ Oui — `useTranslation('common')` et `t("home.heroTitle")`, `t("home.heroSubtitle")`, etc. |
| **Où sont les strings Home ?** | `src/i18n/locales/{fr,en,de,it}/common.json` sous la clé `home` |
| **Structure actuelle** | `home.heroTitle`, `home.heroSubtitle`, `home.toasts.*`, `seo.home.title`, `seo.home.description` |

### Recommandation i18n

| Option | Recommandation |
|--------|----------------|
| **Texte en dur FR** | ❌ Non — incohérent avec le reste de la Home |
| **i18n FR + EN (minimum)** | ✅ Oui |
| **Clé proposée** | `home.seoBlock` ou `home.introText` |
| **Emplacement** | `common.json` → objet `home` → ajouter `"seoBlock": "..."` |

Exemple de structure :

```json
"home": {
  "heroTitle": "...",
  "heroSubtitle": "...",
  "seoBlock": "Paragraphe 120–150 mots avec : location scooter nosy be, livraison aéroport, hôtel, assurance, casque, madagascar.",
  "toasts": { ... }
}
```

Pour EN, DE, IT : traduire `home.seoBlock` avec les mêmes notions.

---

## 5) Contraintes UI

| Composant | Existant ? | Usage |
|-----------|-----------|-------|
| **Card** | ✅ `@/components/ui/card` | HomeResults utilise déjà `Card` pour les véhicules et l’état vide. Possible pour encadrer le bloc SEO si besoin |
| **Section** | Pas de composant dédié | Sections en `<section>` + `div` avec classes Tailwind |
| **Container** | Pattern répété | `container mx-auto px-4 sm:px-6 lg:px-8` |

### Limites typo / largeur observées

| Pattern | Fichier | Usage |
|---------|---------|-------|
| `max-w-3xl mx-auto` | Index.tsx (heroSubtitle) | Texte centré, largeur limitée |
| `max-w-2xl mx-auto` | RentMyCarLanding, Contact | Bloc texte court |
| `max-w-md` | Footer (description) | Texte plus étroit |
| `text-muted-foreground` | Footer, SinistreCaution, Contact | Texte secondaire |
| `leading-7`, `leading-relaxed` | SinistreCaution | Lisibilité paragraphe |
| `text-base` ou `text-sm` | Standard pour paragraphes |

**Recommandation** :  
- `max-w-3xl mx-auto` (aligné avec le heroSubtitle)  
- `text-muted-foreground text-base leading-relaxed`  
- Optionnel : `py-8` ou `py-10` pour l’espacement, `section` avec `aria-labelledby` si on ajoute un H2

---

## 6) Livrables DIAG (résumé)

### Fichier Home + structure

- **Fichier** : `src/pages/Index.tsx`  
- **Sections** : 1) Hero (H1 + subtitle + SearchBar), 2) HomeResults (filtres + H2 « Véhicules disponibles » + grille)

### H1 / H2 actuels

- **H1** : « Louez votre scooter à Nosy Be en quelques clics »
- **H2** : « Véhicules disponibles » (dans HomeResults)

### Emplacements recommandés

| # | Emplacement | Justification |
|---|-------------|---------------|
| **1** | Entre Hero et HomeResults (Index.tsx) | Visible, flux naturel, séparation claire Hero / contenu / résultats |
| **2** | Début de HomeResults, avant ou après les filtres | Proche des véhicules, tout dans le même bloc visuel |

### Recommandation i18n

- **Oui** — utiliser i18n
- **Clé** : `home.seoBlock` (ou `home.introText`) dans `common.json`
- **Locales** : FR (source), EN minimum ; DE et IT si le projet les cible déjà

### TODO list d’implémentation (sans coder)

1. [ ] Créer la clé `home.seoBlock` dans `fr/common.json` avec le texte SEO (120–150 mots, incluant : location scooter nosy be, livraison aéroport, hôtel, assurance, casque, madagascar)
2. [ ] Traduire `home.seoBlock` en EN (et éventuellement DE, IT)
3. [ ] Dans `Index.tsx`, insérer une nouvelle `<section>` entre le Hero et le bloc `{!showResults ? ... : <HomeResults />}`
4. [ ] Appliquer les classes : `container mx-auto px-4 sm:px-6 lg:px-8`, `py-8` ou `py-10`, `max-w-3xl mx-auto`, `text-muted-foreground text-base leading-relaxed`
5. [ ] Optionnel : ajouter un H2 (ex. `home.seoBlockTitle`) si la hiérarchie SEO le permet ; sinon paragraphe seul
6. [ ] Tester responsive (mobile/desktop) et vérifier que le bloc ne casse pas le layout
7. [ ] Vérifier le rendu avec i18n (changement de langue FR/EN)
