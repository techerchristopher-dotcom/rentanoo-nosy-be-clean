# DIAGNOSTIC RESPONSIVE — Page Mes réservations (/me/renter/bookings)

**Date** : 2025-02-26  
**URL** : https://rentanoo.com/me/renter/bookings  
**Objectif** : Identifier les causes du non-responsive (contenu coupé, espace blanc à droite, débordement horizontal) sur mobile (≈430×932).

---

## A) Résumé exécutif

Les causes principales du non-responsive sont :

1. **`whitespace-nowrap` sur tous les boutons** (Button UI) — les filtres (Toutes, En attente, En cours, etc.) et boutons de carte ne peuvent pas se replier, ce qui force une largeur minimale élevée des flex containers parents et provoque le scroll horizontal.

2. **WhatsAppHeader** — barre sticky « WhatsApp / Envoyez un email » en `flex` sans `flex-wrap`, avec du texte long (`+33 (0) 6 33 70 75 69`, `Contact WhatsApp uniquement`) qui dépasse sur mobile.

3. **Cartes de réservation (RenterBookingCard)** — boutons avec `min-w-[200px]` dans une grille flex, et header en `flex` avec une colonne droite dense (badge, avatar, chevron) qui ne s’adapte pas sur petits écrans.

4. **Container Tailwind** — configuration avec `padding: "2rem"` (32px de chaque côté) qui, combinée aux éléments non-flexibles, réduit fortement la largeur utile sur mobile.

5. **Absence de `min-width: 0`** sur certains flex enfants — comportement par défaut qui empêche le shrink et favorise le débordement.

---

## B) Tableau des problèmes détectés

| Symptôme | Élément(s) responsable(s) | Règle(s) CSS incriminée(s) | Pourquoi ça casse en mobile | Fix recommandé | Priorité |
|----------|---------------------------|----------------------------|-----------------------------|----------------|----------|
| Filtres qui débordent ou imposent un scroll horizontal | `Button` (filtres Toutes/En attente/…) | `whitespace-nowrap` (buttonVariants, button.tsx:8) | Chaque bouton garde sa largeur minimale ; une rangée de 7 boutons dépasse ~400–500px sur 430px | Surcharger `whitespace-nowrap` par `whitespace-normal` ou `whitespace-nowrap sm:whitespace-nowrap` pour les filtres ; ou autoriser flex-shrink sur les filtres | **P0** |
| Barre WhatsApp/Email qui dépasse | `WhatsAppHeader` — div.flex | `flex items-center justify-center gap-4` sans `flex-wrap`, pas de `min-w-0` | Le bloc (WhatsApp + Email) ne wrap pas ; largeur > 430px | Ajouter `flex-wrap`, `flex-col sm:flex-row`, ou raccourcir/masquer du texte sur mobile | **P0** |
| Boutons « Payer » / « Activer la caution » qui débordent | `RenterBookingCard` — boutons CTA | `min-w-[200px]` (lignes 1253, 1277) | Deux boutons = 400px min dans un conteneur ~350px | Remplacer par `min-w-0 sm:min-w-[200px]` ou `w-full sm:min-w-[200px]` | **P0** |
| Header des cartes de réservation trop dense | `RenterBookingCard` — CardContent header | `flex items-center justify-between` + droite en `flex items-center gap-3` sans wrap | Badge, texte annulation, countdown, avatar, chevron ne passent pas sur une seule ligne en mobile | Passer en `flex-col sm:flex-row` ou `flex-wrap` ; réorganiser (avatar/badge en dessous sur mobile) | **P1** |
| Container trop serré ou éléments qui poussent | `tailwind.config.ts` — container | `padding: "2rem"` (32px × 2) | 64px de marge ; sur 390px, contenu utile ≈ 326px, accentue les débordements | Réduire `padding` sur mobile (ex. `padding: { DEFAULT: "1rem", sm: "2rem" }`) ou utiliser `px-4` dans les pages | **P1** |
| Bouton « Nouvelle réservation » potentiellement problématique | Header RenterBookings | Button avec `whitespace-nowrap` | Si le header est en `flex` et que le bouton ne wrap pas | Passer le header en `flex-col` sur mobile (déjà partiellement le cas avec `flex-col sm:flex-row`) | P2 |
| Absence de `overflow-x` sur le body | `index.html` / styles globaux | Pas de `overflow-x: hidden` | On ne recommande PAS de cacher le débordement ; mieux vaut corriger la cause | — | — |

---

## C) Hypothèses sur l’architecture

- **Framework** : React (Vite)
- **CSS** : Tailwind CSS v3+
- **UI** : shadcn/ui (Radix UI) — Button, Badge, Card, DropdownMenu, etc.
- **Layout** : structure classique (`div.relative` > Navbar + Routes), Navbar avec WhatsAppHeader sticky + header principal

---

## D) Plan de correction proposé

### Quick wins (≈1 h)

- [ ] **WhatsAppHeader** : ajouter `flex-wrap` ou `flex-col md:flex-row` + texte raccourci sur mobile
- [ ] **Filtres** : wrapper dans `overflow-x-auto` horizontal scrollable OU remplacer Button par un composant sans `whitespace-nowrap` pour les chips
- [ ] **Boutons CTA RenterBookingCard** : `min-w-[200px]` → `min-w-0 w-full sm:min-w-[200px]`

### Correctifs structurants (≈½ journée)

- [ ] **Button** : variante sans `whitespace-nowrap` pour les usages « chip » / « filtre » (ex. `allowWrap` ou variante `chip`)
- [ ] **RenterBookingCard** : refactor du header en layout responsive (flex-col / stack sur mobile)
- [ ] **Container** : ajuster le padding mobile dans `tailwind.config.ts`
- [ ] **Vérifier** : `overflow-x: hidden` sur body/html (à éviter si utilisé pour masquer le bug)

### Refacto si nécessaire

- [ ] Mettre en place un composant `FilterChips` responsive (scroll horizontal ou menu déroulant sur mobile)
- [ ] Revoir le design du header des cartes pour mobile (priorité aux infos principales)

---

## E) Snippets CSS / Tailwind minimaux

### 1. WhatsAppHeader — permettre le wrap / layout mobile

```tsx
// Fichier: src/components/layout/WhatsAppHeader.tsx
// Remplacer la div flex par :
<div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 py-2 md:py-2.5">
// Ou pour un stack vertical sur mobile :
<div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-4 py-2 md:py-2.5">
```

### 2. Filtres RenterBookings — permettre le wrap des boutons

```tsx
// Fichier: src/pages/renter/RenterBookings.tsx, ligne ~610
// Sur le conteneur des filtres, ajouter overflow + permettre shrink :
<div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
// Et sur chaque Button filtre, override whitespace :
<Button
  ...
  className={cn("... whitespace-normal sm:whitespace-nowrap shrink-0", ...)}
>
```

### 3. Boutons CTA RenterBookingCard — largeur responsive

```tsx
// Fichier: src/components/RenterBookingCard.tsx, lignes 1253 et 1277
// Remplacer :
className="... flex-1 min-w-[200px] ..."
// Par :
className="... flex-1 min-w-0 w-full sm:min-w-[200px] ..."
```

### 4. Container — padding mobile (optionnel)

```ts
// Fichier: tailwind.config.ts
container: {
  center: true,
  padding: {
    DEFAULT: "1rem",
    sm: "1.5rem",
    lg: "2rem",
  },
  screens: {
    "2xl": "1400px",
  },
},
```

### 5. Card header RenterBookingCard — layout mobile

```tsx
// Fichier: src/components/RenterBookingCard.tsx, ~ligne 578
// Remplacer le header par :
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  {/* Colonne gauche : photo + détails */}
  <div className="flex items-center space-x-4 flex-1 min-w-0">...</div>
  {/* Colonne droite : badge + actions — empilée sur mobile */}
  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 sm:flex-nowrap">...</div>
</div>
```

---

## Procédure DevTools (si débordement non reproductible en direct)

1. Ouvrir https://rentanoo.com/me/renter/bookings en mode connecté.
2. DevTools > Toggle device toolbar (Ctrl+Shift+M) > iPhone 13 Pro (390×844) ou dimensions custom 430×932.
3. Vérifier le meta viewport :  
   `document.querySelector('meta[name="viewport"]').content` → doit contenir `width=device-width`.
4. Dans la console :

```js
// Éléments qui dépassent
[...document.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth && el.clientWidth > 0)
  .map(el => ({ tag: el.tagName, classes: el.className?.slice(0,60), sw: el.scrollWidth, cw: el.clientWidth }))
```

5. Inspecter les éléments listés pour les règles : `whitespace`, `min-width`, `flex-shrink`.

---

## IMPLÉMENTATION (2025-02-26)

### Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/components/layout/WhatsAppHeader.tsx` | P0.1 — flex-col sm:flex-row, min-w-0, truncate |
| `src/components/RenterBookingCard.tsx` | P0.2 + P1.1 — CTA responsive, header layout |
| `src/pages/renter/RenterBookings.tsx` | P0.3 + min-w-0 — filtres scrollables, conteneurs |

### Diffs principaux

**WhatsAppHeader** : Layout `flex-col sm:flex-row`, `min-w-0` sur bouton/lien, `truncate` sur textes longs.

**RenterBookingCard** : CTA `w-full min-w-0 sm:min-w-[200px] sm:flex-1` ; header `flex-col sm:flex-row` ; actions `flex-wrap` ; container actions `flex-col sm:flex-row`.

**RenterBookings** : Filtres dans `overflow-x-auto` + `shrink-0` sur boutons, `-mx-4 px-4` mobile ; `min-w-0` sur wrappers principaux.

### Procédure de vérification

1. Lancer `npm run dev`, ouvrir `/me/renter/bookings` (connecté).
2. DevTools > Toggle device toolbar > 430×932 (ou 360×800, 390×844).
3. Console :

```js
// Pas de scroll horizontal
document.documentElement.scrollWidth === document.documentElement.clientWidth
// → doit être true

// Aucun élément ne dépasse
[...document.querySelectorAll('*')]
  .filter(el => el.scrollWidth > el.clientWidth && el.clientWidth > 0)
  .slice(0, 20)
// → doit être []
```

4. Vérifier : filtres scrollables horizontalement, header WhatsApp empilé, cartes lisibles, CTA en colonne sur mobile.
5. Desktop/tablette (768px+) : aucun changement visuel attendu.

---

*Document initial : diagnostic. Section Implémentation ajoutée après correctifs P0/P1.*
