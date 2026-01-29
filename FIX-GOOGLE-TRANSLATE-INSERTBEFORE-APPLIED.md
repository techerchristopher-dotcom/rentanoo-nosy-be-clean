# ✅ Fix Appliqué - insertBefore + Google Translate

**Date**: 2026-01-15  
**Problème**: `NotFoundError: Failed to execute 'insertBefore' on 'Node'`  
**Cause probable**: Google Translate modifie le DOM, Radix UI Portal fait `insertBefore` sur un nœud invalide

---

## A) FIXES APPLIQUÉS

### ✅ Fix 1: Désactiver traduction automatique (Quick Fix)

**Fichier**: `index.html`

**Changement** :
```html
<!-- AVANT -->
<html lang="en">

<!-- APRÈS -->
<html lang="en" translate="no" class="notranslate">
```

**Effet** :
- ✅ Désactive la traduction automatique de Google Translate
- ✅ Évite les modifications DOM par les extensions de traduction
- ✅ Simple et rapide

---

### ✅ Fix 2: Portal Root Stable

**Fichier**: `index.html`

**Changement** :
```html
<body>
  <div id="root"></div>
  <div id="date-picker-portal"></div>
  <div id="radix-portal-root"></div> <!-- ⭐ NOUVEAU -->
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Effet** :
- ✅ Container isolé de `document.body`
- ✅ Moins sensible aux mutations de Google Translate
- ✅ Contrôle total sur le container

---

### ✅ Fix 3: Modifier tous les composants Portal

**Fichiers modifiés** :
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/select.tsx`

**Changement** (exemple pour `DropdownMenuContent`) :
```typescript
// AVANT
<DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.Content ... />
</DropdownMenuPrimitive.Portal>

// APRÈS
const portalContainer = typeof document !== 'undefined' 
  ? document.getElementById('radix-portal-root')
  : null;

<DropdownMenuPrimitive.Portal container={portalContainer}>
  <DropdownMenuPrimitive.Content ... />
</DropdownMenuPrimitive.Portal>
```

**Effet** :
- ✅ Tous les portails utilisent maintenant le container stable
- ✅ Évite les conflits avec Google Translate qui modifie `document.body`
- ✅ Plus robuste face aux mutations DOM externes

---

### ✅ Fix 4: Upgrade Radix UI

**Commandes exécutées** :
```bash
npm update @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-alert-dialog @radix-ui/react-select
```

**Versions mises à jour** :
- `@radix-ui/react-dropdown-menu`: `^2.1.15` → `2.1.16`
- `@radix-ui/react-dialog`: `^1.1.14` → `1.1.15`
- `@radix-ui/react-popover`: `^1.1.14` → `1.1.15`
- `@radix-ui/react-alert-dialog`: `^1.1.14` → `1.1.15`
- `@radix-ui/react-select`: `^2.2.5` → `2.2.6`

**Effet** :
- ✅ Corrections de bugs potentielles
- ✅ Améliorations de la gestion des portails
- ✅ Meilleure compatibilité avec les extensions

---

### ✅ Fix 5: ErrorBoundary autour de Navbar

**Fichier**: `src/App.tsx`

**Changement** :
```typescript
// AVANT
<BrowserRouter>
  <div className="relative">
    <LanguageSwitcher />
    <Routes>
      {/* ... */}
    </Routes>
  </div>
</BrowserRouter>

// APRÈS
<BrowserRouter>
  <div className="relative">
    <LanguageSwitcher />
    <ErrorBoundary fallback={
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg font-bold">RENTANOO</Link>
            <p className="text-sm text-muted-foreground">Menu temporairement indisponible</p>
          </div>
        </div>
      </nav>
    }>
      <Navbar />
    </ErrorBoundary>
    <Routes>
      {/* ... */}
    </Routes>
  </div>
</BrowserRouter>
```

**Effet** :
- ✅ Isole les erreurs du menu
- ✅ Évite que le crash du menu casse toute la page
- ✅ Affiche un fallback si le menu crash

---

## B) RÉSUMÉ DES MODIFICATIONS

### Fichiers modifiés

1. **`index.html`** :
   - Ajout `translate="no" class="notranslate"` sur `<html>`
   - Ajout `<div id="radix-portal-root"></div>`

2. **`src/components/ui/dropdown-menu.tsx`** :
   - Modification `DropdownMenuContent` pour utiliser container personnalisé

3. **`src/components/ui/dialog.tsx`** :
   - Modification `DialogContent` pour utiliser container personnalisé

4. **`src/components/ui/popover.tsx`** :
   - Modification `PopoverContent` pour utiliser container personnalisé

5. **`src/components/ui/alert-dialog.tsx`** :
   - Modification `AlertDialogContent` pour utiliser container personnalisé

6. **`src/components/ui/select.tsx`** :
   - Modification `SelectContent` pour utiliser container personnalisé

7. **`src/App.tsx`** :
   - Ajout `ErrorBoundary` autour de `Navbar`
   - Import `Navbar` et `Link`

8. **`package.json`** :
   - Upgrade Radix UI vers dernières versions

---

## C) TESTS À EFFECTUER

### Test 1: Navigation privée/incognito

**Objectif** : Vérifier si le crash disparaît sans extensions

**Étapes** :
1. Ouvrir Chrome/Edge en navigation privée (Cmd+Shift+N / Ctrl+Shift+N)
2. Aller sur https://rentanoo.com/contact
3. Soumettre le formulaire
4. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Confirme l'hypothèse extension
- ❌ **Si crash persiste** → Problème côté app (pas extension)

---

### Test 2: Désactiver Google Translate

**Objectif** : Vérifier si le crash disparaît sans traduction

**Étapes** :
1. Désactiver Google Translate :
   - **Chrome** : Paramètres → Langues → Désactiver "Proposer de traduire les pages"
   - **Extension** : Désactiver l'extension Google Translate
2. Aller sur https://rentanoo.com/contact
3. Soumettre le formulaire
4. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Confirme l'hypothèse Google Translate
- ❌ **Si crash persiste** → Autre extension ou problème app

---

### Test 3: Mobile (pas d'extensions)

**Objectif** : Vérifier si le crash apparaît sur mobile

**Étapes** :
1. Ouvrir https://rentanoo.com/contact sur mobile (Safari iOS / Chrome Android)
2. Soumettre le formulaire
3. Observer si l'erreur `insertBefore` apparaît

**Résultat attendu** :
- ✅ **Si pas de crash** → Confirme l'hypothèse extension desktop
- ❌ **Si crash persiste** → Problème côté app

---

## D) PROCHAINES ÉTAPES

### Si crash lié à extension/traduction

✅ **Fixes appliqués** :
- Désactivation traduction automatique (`translate="no"`)
- Portal root stable
- Upgrade Radix UI
- ErrorBoundary Navbar

**Résultat attendu** : Le crash devrait disparaître

---

### Si crash persiste même sans extensions

**Actions supplémentaires** :
1. Activer source maps prod (identifier composant exact)
2. Vérifier remount Navbar (keys, conditional rendering)
3. Vérifier hydrate/mismatch (si SSR)
4. Logger précisément en production (Sentry, console)

---

## E) CHECKLIST FINALE

### Fixes appliqués

- [x] Ajouter `translate="no"` sur `<html>` (quick fix)
- [x] Créer portal root stable (`index.html` + composants)
- [x] Modifier tous les composants Portal pour utiliser container
- [x] Upgrade Radix UI (vérifier changelog)
- [x] ErrorBoundary Navbar (isoler les erreurs)

### Tests à effectuer

- [ ] Test navigation privée (extensions désactivées)
- [ ] Test sans Google Translate
- [ ] Test mobile (pas d'extensions)
- [ ] Test avec source maps activées (identifier composant exact)

---

**Les fixes sont appliqués. Les tests de reproduction doivent être effectués pour confirmer l'efficacité des mitigations.**

