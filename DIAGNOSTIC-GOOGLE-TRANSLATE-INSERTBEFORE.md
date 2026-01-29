# 🔍 Diagnostic Complet - insertBefore + Google Translate

**Date**: 2026-01-15  
**Problème**: `NotFoundError: Failed to execute 'insertBefore' on 'Node'`  
**Indice majeur**: Google Translate actif (barre anglais/français)  
**Hypothèse**: Extension/traduction modifie le DOM, Radix UI fait `insertBefore` sur un nœud qui n'est plus enfant

---

## A) DIAGNOSTIC INITIAL

### Composants Radix UI identifiés

**Composants utilisant Portal (createPortal/insertBefore)** :

1. **DropdownMenu** (`@radix-ui/react-dropdown-menu@^2.1.15`)
   - Utilisé dans : `Navbar` (lignes 156-180, 220-331)
   - Portal : `<DropdownMenuPrimitive.Portal>` (ligne 59 dans `dropdown-menu.tsx`)
   - Container : **Non spécifié** → utilise `document.body` par défaut

2. **Dialog** (`@radix-ui/react-dialog@^1.1.14`)
   - Portal : `<DialogPortal>` (ligne 34 dans `dialog.tsx`)
   - Container : **Non spécifié** → utilise `document.body` par défaut

3. **Popover** (`@radix-ui/react-popover@^1.1.14`)
   - Portal : `<PopoverPrimitive.Portal>` (ligne 14 dans `popover.tsx`)
   - Container : **Non spécifié** → utilise `document.body` par défaut

4. **AlertDialog** (`@radix-ui/react-alert-dialog@^1.1.14`)
   - Portal : `<AlertDialogPortal>` (ligne 32 dans `alert-dialog.tsx`)
   - Container : **Non spécifié** → utilise `document.body` par défaut

5. **Select** (`@radix-ui/react-select@^2.2.5`)
   - Portal : `<SelectPrimitive.Portal>` (ligne 65 dans `select.tsx`)
   - Container : **Non spécifié** → utilise `document.body` par défaut

6. **Toast** (`@radix-ui/react-toast@^1.2.14`)
   - Déjà remplacé par Sonner ✅

7. **Autres** : ContextMenu, Menubar, Sheet, Drawer (utilisés ailleurs)

**Problème identifié** :
- ❌ **Aucun composant Radix UI n'utilise un container personnalisé**
- ❌ **Tous utilisent `document.body` par défaut**
- ⚠️ **Google Translate modifie `document.body`** → les portails peuvent pointer vers des nœuds invalides

---

## B) VERSIONS RADIX UI ACTUELLES

### Versions installées

```json
"@radix-ui/react-dropdown-menu": "^2.1.15",
"@radix-ui/react-dialog": "^1.1.14",
"@radix-ui/react-popover": "^1.1.14",
"@radix-ui/react-alert-dialog": "^1.1.14",
"@radix-ui/react-select": "^2.2.5",
"@radix-ui/react-toast": "^1.2.14",
```

**Versions les plus récentes** (à vérifier) :
- `@radix-ui/react-dropdown-menu`: v2.x (dernière v2.1.15)
- `@radix-ui/react-dialog`: v1.x (dernière v1.1.14)
- `@radix-ui/react-popover`: v1.x (dernière v1.1.14)

**Changelog à vérifier** :
- Support du prop `container` pour Portal
- Fixes pour les conflits avec extensions de navigateur
- Amélioration de la gestion des mutations DOM

---

## C) PLAN DE REPRODUCTION

### Tests à effectuer

1. **Test en navigation privée/incognito** :
   - Ouvrir https://rentanoo.com/contact en navigation privée
   - Soumettre le formulaire
   - ✅ Si pas de crash → **confirme l'hypothèse extension**
   - ❌ Si crash persiste → problème côté app

2. **Test avec traduction désactivée** :
   - Désactiver Google Translate (extension ou Chrome intégré)
   - Soumettre le formulaire
   - ✅ Si pas de crash → **confirme l'hypothèse Google Translate**
   - ❌ Si crash persiste → autre extension ou problème app

3. **Test mobile** :
   - Tester sur mobile (pas d'extensions)
   - Soumettre le formulaire
   - ✅ Si pas de crash → **confirme l'hypothèse extension desktop**
   - ❌ Si crash persiste → problème côté app

---

## D) SOLUTIONS PROPOSÉES

### Solution 1: Portal Root Stable (RECOMMANDÉ)

**Créer un container stable pour tous les portails Radix UI**

**Avantages** :
- ✅ Container isolé de `document.body`
- ✅ Moins sensible aux mutations de Google Translate
- ✅ Contrôle total sur le container

**Implémentation** :

1. **Ajouter un container dans `index.html`** :
```html
<body>
  <div id="root"></div>
  <div id="date-picker-portal"></div>
  <div id="radix-portal-root"></div> <!-- ⭐ NOUVEAU -->
  <script type="module" src="/src/main.tsx"></script>
</body>
```

2. **Modifier `DropdownMenuContent` pour utiliser le container** :
```typescript
// src/components/ui/dropdown-menu.tsx
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const portalContainer = typeof document !== 'undefined' 
    ? document.getElementById('radix-portal-root')
    : null;
  
  return (
    <DropdownMenuPrimitive.Portal container={portalContainer}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(...)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
```

3. **Appliquer la même logique à tous les composants Portal** :
   - Dialog
   - Popover
   - AlertDialog
   - Select
   - ContextMenu
   - Menubar
   - Sheet
   - Drawer

---

### Solution 2: Contrôle de l'état du DropdownMenu

**Fermer le menu avant le submit pour éviter les conflits**

**Implémentation** :

```typescript
// src/components/layout/navbar.tsx
const [dropdownOpen, setDropdownOpen] = useState(false);

// Dans le DropdownMenu
<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
  {/* ... */}
</DropdownMenu>

// Dans Contact.tsx, fermer le menu avant le submit
useEffect(() => {
  // Fermer tous les menus ouverts avant le submit
  const closeAllMenus = () => {
    // Dispatch un événement pour fermer les menus
    window.dispatchEvent(new CustomEvent('close-all-menus'));
  };
  
  // Écouter le submit du formulaire
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', closeAllMenus);
    return () => form.removeEventListener('submit', closeAllMenus);
  }
}, []);
```

---

### Solution 3: ErrorBoundary autour du Navbar

**Isoler les erreurs du menu pour éviter de casser toute la page**

**Implémentation** :

```typescript
// src/App.tsx
<BrowserRouter>
  <div className="relative">
    <ErrorBoundary fallback={<NavbarFallback />}>
      <Navbar />
    </ErrorBoundary>
    <Routes>
      {/* ... */}
    </Routes>
  </div>
</BrowserRouter>
```

---

### Solution 4: Upgrade Radix UI

**Vérifier et mettre à jour toutes les libs Radix UI**

**Commandes** :
```bash
npm outdated @radix-ui/react-*
npm update @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-alert-dialog @radix-ui/react-select
```

**À vérifier dans le changelog** :
- Support du prop `container` pour Portal
- Fixes pour les conflits avec extensions
- Amélioration de la gestion des mutations DOM

---

## E) PLAN D'ACTION RECOMMANDÉ

### Phase 1: Reproduction (À FAIRE PAR L'UTILISATEUR)

1. **Test navigation privée** :
   - Ouvrir https://rentanoo.com/contact en navigation privée
   - Soumettre le formulaire
   - ✅ Si pas de crash → **confirme extension**
   - ❌ Si crash → problème app

2. **Test sans Google Translate** :
   - Désactiver Google Translate
   - Soumettre le formulaire
   - ✅ Si pas de crash → **confirme Google Translate**
   - ❌ Si crash → autre cause

3. **Test mobile** :
   - Tester sur mobile
   - Soumettre le formulaire
   - ✅ Si pas de crash → **confirme extension desktop**

---

### Phase 2: Mitigations (À IMPLÉMENTER)

**Si crash lié à extension/traduction** :

1. ✅ **Créer portal root stable** (`index.html` + modifier composants)
2. ✅ **Upgrade Radix UI** (vérifier changelog)
3. ✅ **Contrôle état DropdownMenu** (fermer avant submit)
4. ✅ **ErrorBoundary Navbar** (isoler les erreurs)

**Si crash persiste même sans extensions** :

1. ✅ **Activer source maps prod** (identifier composant exact)
2. ✅ **Vérifier remount Navbar** (keys, conditional rendering)
3. ✅ **Vérifier hydrate/mismatch** (si SSR)

---

## F) CODE DE FIX PROPOSÉ

### Fix 1: Portal Root Stable

**Fichier**: `index.html`
```html
<body>
  <div id="root"></div>
  <div id="date-picker-portal"></div>
  <div id="radix-portal-root"></div> <!-- ⭐ NOUVEAU -->
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Fichier**: `src/components/ui/dropdown-menu.tsx`
```typescript
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const portalContainer = typeof document !== 'undefined' 
    ? document.getElementById('radix-portal-root')
    : null;
  
  return (
    <DropdownMenuPrimitive.Portal container={portalContainer}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(...)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
```

---

## G) CHECKLIST FINALE

### Tests de reproduction

- [ ] Test navigation privée (extensions désactivées)
- [ ] Test sans Google Translate
- [ ] Test mobile (pas d'extensions)
- [ ] Test avec source maps activées (identifier composant exact)

### Mitigations à implémenter

- [ ] Créer portal root stable (`index.html` + composants)
- [ ] Upgrade Radix UI (vérifier changelog)
- [ ] Contrôle état DropdownMenu (fermer avant submit)
- [ ] ErrorBoundary Navbar (isoler les erreurs)
- [ ] Vérifier remount Navbar (keys, conditional rendering)

---

**Le diagnostic est prêt. Les tests de reproduction doivent être effectués pour confirmer l'hypothèse Google Translate.**

