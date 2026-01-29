# 🔍 Diagnostic & Validation - insertBefore Crash Production

**Date**: 2026-01-15  
**URL**: https://rentanoo.com/contact  
**Erreur**: `NotFoundError: Failed to execute 'insertBefore' on 'Node'`

---

## A) VÉRIFICATION DES FIXES APPLIQUÉS

### ✅ Fix 1: `translate="no"` sur `<html>`

**Fichier**: `index.html`

**Vérification** :
```html
<html lang="en" translate="no" class="notranslate">
```

**Status**: ✅ **APPLIQUÉ**

---

### ✅ Fix 2: Portal Root Stable

**Fichier**: `index.html`

**Vérification** :
```html
<body>
  <div id="root"></div>
  <div id="date-picker-portal"></div>
  <div id="radix-portal-root"></div> <!-- ⭐ -->
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Status**: ✅ **APPLIQUÉ**

---

### ✅ Fix 3: Tous les Portals utilisent le container

**Composants vérifiés** :

1. **`DropdownMenuContent`** (`src/components/ui/dropdown-menu.tsx`) :
```typescript
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

<DropdownMenuPrimitive.Portal container={portalContainer}>
```

2. **`DialogContent`** (`src/components/ui/dialog.tsx`) :
```typescript
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

<DialogPortal container={portalContainer}>
```

3. **`PopoverContent`** (`src/components/ui/popover.tsx`) :
```typescript
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

<PopoverPrimitive.Portal container={portalContainer}>
```

4. **`AlertDialogContent`** (`src/components/ui/alert-dialog.tsx`) :
```typescript
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

<AlertDialogPortal container={portalContainer}>
```

5. **`SelectContent`** (`src/components/ui/select.tsx`) :
```typescript
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

<SelectPrimitive.Portal container={portalContainer}>
```

**Status**: ✅ **TOUS LES PORTALS UTILISENT LE CONTAINER**

---

### ⚠️ Exception: `createPortal` dans `search-bar-airbnb.tsx`

**Fichier**: `src/components/ui/search-bar-airbnb.tsx` (lignes 367, 429)

**Code actuel** :
```typescript
{showDatePicker && createPortal(
  <div>...</div>,
  document.body // ⚠️ Utilise encore document.body
)}
```

**Impact** : 
- ⚠️ Ce composant utilise `createPortal` directement avec `document.body`
- ⚠️ Non protégé contre Google Translate
- ⚠️ Peut causer le crash si utilisé sur la page Contact

**Recommandation** : Modifier pour utiliser le container stable

---

### ✅ Fix 4: ErrorBoundary autour de Navbar

**Fichier**: `src/App.tsx`

**Vérification** :
```typescript
<ErrorBoundary fallback={...}>
  <Navbar />
</ErrorBoundary>
```

**Status**: ✅ **APPLIQUÉ**

---

### ✅ Fix 5: Pas de remount Navbar

**Vérification** :
- ❌ Pas de `key` prop sur `<Navbar />` dans `App.tsx`
- ❌ Pas de `key` qui change conditionnellement
- ✅ Navbar est monté une seule fois et reste stable

**Status**: ✅ **PAS DE REMOUNT**

---

## B) PLAN DE REPRODUCTION

### Test 1: Navigation privée/incognito (SANS extensions)

**Objectif** : Vérifier si le crash persiste sans extensions

**Étapes** :
1. Ouvrir Chrome/Edge en navigation privée :
   - **Chrome** : `Cmd+Shift+N` (Mac) / `Ctrl+Shift+N` (Windows)
   - **Edge** : `Cmd+Shift+N` (Mac) / `Ctrl+Shift+N` (Windows)
2. Aller sur https://rentanoo.com/contact
3. Ouvrir la console (F12 → Console)
4. Soumettre le formulaire avec des données valides
5. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Confirme que le problème vient des extensions
- ❌ **Si crash persiste** → Problème côté app (pas extension)

**Documentation** :
- Screenshot de la console (si erreur)
- Stack trace complète (si erreur)

---

### Test 2: Chrome normal avec Google Translate ACTIVÉ

**Objectif** : Vérifier si le crash apparaît avec Google Translate

**Étapes** :
1. Ouvrir Chrome normal (avec extensions)
2. Activer Google Translate :
   - **Chrome intégré** : Paramètres → Langues → Activer "Proposer de traduire les pages"
   - **Extension** : Activer l'extension Google Translate
3. Aller sur https://rentanoo.com/contact
4. **Forcer la traduction** : Clic droit → "Traduire en français" (ou autre langue)
5. Ouvrir la console (F12 → Console)
6. Soumettre le formulaire avec des données valides
7. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Les fixes fonctionnent
- ❌ **Si crash persiste** → Les fixes ne sont pas suffisants

**Documentation** :
- Screenshot de la console (si erreur)
- Stack trace complète (si erreur)
- Confirmation que la traduction est active (barre Google Translate visible)

---

### Test 3: Chrome normal avec Google Translate DÉSACTIVÉ

**Objectif** : Vérifier si le crash disparaît sans traduction

**Étapes** :
1. Ouvrir Chrome normal (avec extensions)
2. Désactiver Google Translate :
   - **Chrome intégré** : Paramètres → Langues → Désactiver "Proposer de traduire les pages"
   - **Extension** : Désactiver l'extension Google Translate
3. Aller sur https://rentanoo.com/contact
4. Ouvrir la console (F12 → Console)
5. Soumettre le formulaire avec des données valides
6. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Confirme que le problème vient de Google Translate
- ❌ **Si crash persiste** → Autre extension ou problème app

**Documentation** :
- Screenshot de la console (si erreur)
- Stack trace complète (si erreur)

---

### Test 4: Mobile (pas d'extensions)

**Objectif** : Vérifier si le crash apparaît sur mobile

**Étapes** :
1. Ouvrir https://rentanoo.com/contact sur mobile (Safari iOS / Chrome Android)
2. Ouvrir la console (si possible) ou utiliser remote debugging
3. Soumettre le formulaire avec des données valides
4. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Confirme que le problème vient des extensions desktop
- ❌ **Si crash persiste** → Problème côté app

**Documentation** :
- Screenshot de la console (si erreur)
- Stack trace complète (si erreur)

---

## C) VALIDATION PRODUCTION

### Vérification 1: `#radix-portal-root` présent en prod

**Méthode** :
1. Aller sur https://rentanoo.com/contact
2. Ouvrir la console (F12 → Console)
3. Exécuter : `document.getElementById('radix-portal-root')`
4. Vérifier que l'élément existe et n'est pas `null`

**Résultat attendu** :
```javascript
// Devrait retourner :
<div id="radix-portal-root"></div>
```

**Si `null`** : Le container n'est pas présent → problème de build/déploiement

---

### Vérification 2: Aucun Portal sur `document.body`

**Méthode** :
1. Aller sur https://rentanoo.com/contact
2. Ouvrir la console (F12 → Console)
3. Exécuter : `document.body.querySelectorAll('[data-radix-portal]')`
4. Vérifier qu'aucun élément Portal n'est directement dans `document.body`

**Résultat attendu** :
```javascript
// Devrait retourner :
NodeList [] // Vide
```

**Si éléments trouvés** : Des Portals utilisent encore `document.body` → problème

---

### Vérification 3: Portals dans `#radix-portal-root`

**Méthode** :
1. Aller sur https://rentanoo.com/contact
2. Ouvrir le menu utilisateur (DropdownMenu)
3. Ouvrir la console (F12 → Console)
4. Exécuter : `document.getElementById('radix-portal-root').children`
5. Vérifier que les Portals sont dans le container

**Résultat attendu** :
```javascript
// Devrait retourner :
HTMLCollection [div[data-radix-portal], ...] // Portals présents
```

**Si vide** : Les Portals ne sont pas dans le container → problème

---

## D) ALTERNATIVE MOINS AGRESSIVE (si nécessaire)

### Si ça marche en incognito mais casse avec traduction

**Problème** : `translate="no"` sur `<html>` désactive la traduction pour TOUT le site

**Solution** : Protéger uniquement les éléments critiques

### Option 1: `notranslate` uniquement sur Navbar + Portal Root

**Fichier**: `src/components/layout/navbar.tsx`

**Changement** :
```typescript
// Ajouter translate="no" sur le nav
<nav className="border-b bg-background" translate="no">
  {/* ... */}
</nav>
```

**Fichier**: `index.html`

**Changement** :
```html
<!-- AVANT -->
<html lang="en" translate="no" class="notranslate">

<!-- APRÈS -->
<html lang="en">
  <!-- ... -->
  <body>
    <div id="root"></div>
    <div id="date-picker-portal"></div>
    <div id="radix-portal-root" translate="no" class="notranslate"></div>
    <!-- ... -->
  </body>
</html>
```

**Avantages** :
- ✅ Garde la traduction pour le contenu
- ✅ Protège uniquement les éléments critiques (Navbar, Portals)
- ✅ Moins agressif que `translate="no"` sur `<html>`

---

### Option 2: `notranslate` sur éléments Radix UI uniquement

**Fichier**: `src/components/ui/dropdown-menu.tsx`

**Changement** :
```typescript
<DropdownMenuPrimitive.Portal container={portalContainer}>
  <DropdownMenuPrimitive.Content
    ref={ref}
    className={cn(..., "notranslate")} // ⭐ Ajouter notranslate
    translate="no" // ⭐ Ajouter translate="no"
    {...props}
  />
</DropdownMenuPrimitive.Portal>
```

**À appliquer aussi à** :
- `DialogContent`
- `PopoverContent`
- `AlertDialogContent`
- `SelectContent`

**Avantages** :
- ✅ Très ciblé (uniquement les composants Radix UI)
- ✅ Garde la traduction pour le reste du site
- ✅ Protection maximale des Portals

---

## E) PATCH FINAL RECOMMANDÉ

### Si les tests confirment que le problème vient de Google Translate

**Patch minimal** (Option 1) :

**Fichier**: `index.html`
```html
<!-- AVANT -->
<html lang="en" translate="no" class="notranslate">

<!-- APRÈS -->
<html lang="en">
  <!-- ... -->
  <body>
    <div id="root"></div>
    <div id="date-picker-portal"></div>
    <div id="radix-portal-root" translate="no" class="notranslate"></div>
    <!-- ... -->
  </body>
</html>
```

**Fichier**: `src/components/layout/navbar.tsx`
```typescript
// Ajouter translate="no" sur le nav
<nav className="border-b bg-background" translate="no">
  {/* ... */}
</nav>
```

**Fichier**: `src/components/ui/search-bar-airbnb.tsx`
```typescript
// Modifier createPortal pour utiliser le container stable
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

{showDatePicker && createPortal(
  <div>...</div>,
  portalContainer || document.body // ⭐ Utiliser container stable
)}
```

---

## F) CHECKLIST DE VÉRIFICATION PRODUCTION

### Avant déploiement

- [ ] `index.html` contient `<div id="radix-portal-root"></div>`
- [ ] Tous les Portals utilisent `container={portalContainer}`
- [ ] `search-bar-airbnb.tsx` utilise le container stable
- [ ] ErrorBoundary autour de Navbar
- [ ] Pas de `key` qui change sur Navbar
- [ ] Build OK : `npm run build`

### Après déploiement

- [ ] **Test incognito** : Pas de crash ✅
- [ ] **Test Chrome + Google Translate ON** : Pas de crash ✅
- [ ] **Test Chrome + Google Translate OFF** : Pas de crash ✅
- [ ] **Test mobile** : Pas de crash ✅
- [ ] **Vérification prod** : `#radix-portal-root` présent ✅
- [ ] **Vérification prod** : Aucun Portal sur `document.body` ✅
- [ ] **Vérification prod** : Portals dans `#radix-portal-root` ✅

---

## G) CONCLUSION

### Cause racine probable

**Hypothèse** : Google Translate modifie `document.body`, causant des conflits avec Radix UI Portal qui utilise `insertBefore`.

**Preuve attendue** :
- ✅ Crash en Chrome normal avec Google Translate ON
- ✅ Pas de crash en incognito (sans extensions)
- ✅ Pas de crash avec Google Translate OFF

### Fix recommandé

**Si tests confirment Google Translate** :
1. ✅ Garder `translate="no"` sur `<html>` (ou Option 1 moins agressive)
2. ✅ Garder portal root stable
3. ✅ Fixer `search-bar-airbnb.tsx` pour utiliser le container
4. ✅ Garder ErrorBoundary autour de Navbar

**Si crash persiste même sans extensions** :
1. Activer source maps prod
2. Logger précisément (Sentry)
3. Vérifier remount Navbar
4. Vérifier hydrate/mismatch (si SSR)

---

**Les tests de reproduction doivent être effectués pour confirmer la cause racine.**

