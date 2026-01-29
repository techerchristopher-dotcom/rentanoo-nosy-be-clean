# 🛠️ Plan de Fix - insertBefore + Google Translate

**Date**: 2026-01-15  
**Problème**: `NotFoundError: Failed to execute 'insertBefore' on 'Node'`  
**Cause probable**: Google Translate modifie le DOM, Radix UI Portal fait `insertBefore` sur un nœud invalide

---

## A) TESTS DE REPRODUCTION (À FAIRE PAR L'UTILISATEUR)

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

## B) MITIGATIONS PROPOSÉES

### Mitigation 1: Portal Root Stable (PRIORITÉ HAUTE)

**Problème** : Tous les composants Radix UI utilisent `document.body` par défaut, qui est modifié par Google Translate.

**Solution** : Créer un container stable isolé de `document.body`.

**Implémentation** :

1. **Ajouter container dans `index.html`** :
```html
<body>
  <div id="root"></div>
  <div id="date-picker-portal"></div>
  <div id="radix-portal-root"></div> <!-- ⭐ NOUVEAU -->
  <script type="module" src="/src/main.tsx"></script>
</body>
```

2. **Modifier tous les composants Portal pour utiliser le container** :
   - `DropdownMenuContent`
   - `DialogContent`
   - `PopoverContent`
   - `AlertDialogContent`
   - `SelectContent`

**Exemple pour `DropdownMenuContent`** :
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

### Mitigation 2: Désactiver traduction automatique

**Problème** : Google Translate modifie le DOM automatiquement.

**Solution** : Ajouter `translate="no"` sur `<html>` pour désactiver la traduction automatique.

**Implémentation** :

**Fichier**: `index.html`
```html
<html lang="en" translate="no" class="notranslate">
```

**Avantages** :
- ✅ Simple et rapide
- ✅ Évite les modifications DOM par Google Translate
- ✅ Pas de changement de code

**Inconvénients** :
- ⚠️ Désactive la traduction pour tous les utilisateurs
- ⚠️ Peut impacter l'UX si les utilisateurs veulent traduire

---

### Mitigation 3: Contrôle état DropdownMenu

**Problème** : Le menu peut être ouvert pendant le submit, causant des conflits.

**Solution** : Fermer le menu avant le submit.

**Implémentation** :

**Fichier**: `src/components/layout/navbar.tsx`
```typescript
const [dropdownOpen, setDropdownOpen] = useState(false);

// Dans le DropdownMenu
<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
  {/* ... */}
</DropdownMenu>
```

**Fichier**: `src/pages/Contact.tsx`
```typescript
useEffect(() => {
  const closeAllMenus = () => {
    window.dispatchEvent(new CustomEvent('close-all-menus'));
  };
  
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', closeAllMenus);
    return () => form.removeEventListener('submit', closeAllMenus);
  }
}, []);
```

---

### Mitigation 4: ErrorBoundary Navbar

**Problème** : Un crash du menu peut casser toute la page.

**Solution** : Isoler les erreurs du menu.

**Implémentation** :

**Fichier**: `src/App.tsx`
```typescript
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

### Mitigation 5: Upgrade Radix UI

**Problème** : Versions anciennes peuvent avoir des bugs avec les extensions.

**Solution** : Mettre à jour toutes les libs Radix UI.

**Commandes** :
```bash
npm update @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-alert-dialog @radix-ui/react-select @radix-ui/react-toast
```

**À vérifier dans le changelog** :
- Support du prop `container` pour Portal
- Fixes pour les conflits avec extensions
- Amélioration de la gestion des mutations DOM

---

## C) PLAN D'IMPLÉMENTATION

### Phase 1: Tests de reproduction (À FAIRE PAR L'UTILISATEUR)

1. ✅ Test navigation privée
2. ✅ Test sans Google Translate
3. ✅ Test mobile

**Résultat** : Confirmer si le crash est lié à Google Translate/extension

---

### Phase 2: Mitigations (À IMPLÉMENTER)

**Si crash lié à extension/traduction** :

1. ✅ **Mitigation 2** : Ajouter `translate="no"` sur `<html>` (quick fix)
2. ✅ **Mitigation 1** : Portal root stable (fix robuste)
3. ✅ **Mitigation 5** : Upgrade Radix UI (vérifier changelog)
4. ✅ **Mitigation 3** : Contrôle état DropdownMenu (bonne pratique)
5. ✅ **Mitigation 4** : ErrorBoundary Navbar (sécurité)

**Si crash persiste même sans extensions** :

1. ✅ Activer source maps prod (identifier composant exact)
2. ✅ Vérifier remount Navbar (keys, conditional rendering)
3. ✅ Vérifier hydrate/mismatch (si SSR)

---

## D) CODE DE FIX

### Fix 1: Portal Root Stable

**Fichier**: `index.html`
```html
<html lang="en" translate="no" class="notranslate">
  <!-- ... -->
  <body>
    <div id="root"></div>
    <div id="date-picker-portal"></div>
    <div id="radix-portal-root"></div> <!-- ⭐ NOUVEAU -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
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

**À appliquer aussi à** :
- `DialogContent`
- `PopoverContent`
- `AlertDialogContent`
- `SelectContent`

---

## E) CHECKLIST FINALE

### Tests de reproduction

- [ ] Test navigation privée (extensions désactivées)
- [ ] Test sans Google Translate
- [ ] Test mobile (pas d'extensions)
- [ ] Test avec source maps activées (identifier composant exact)

### Mitigations à implémenter

- [ ] Ajouter `translate="no"` sur `<html>` (quick fix)
- [ ] Créer portal root stable (`index.html` + composants)
- [ ] Upgrade Radix UI (vérifier changelog)
- [ ] Contrôle état DropdownMenu (fermer avant submit)
- [ ] ErrorBoundary Navbar (isoler les erreurs)
- [ ] Vérifier remount Navbar (keys, conditional rendering)

---

**Le plan est prêt. Les tests de reproduction doivent être effectués pour confirmer l'hypothèse Google Translate.**

