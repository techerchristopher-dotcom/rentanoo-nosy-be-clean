# 🔧 Fix insertBefore - Problème Navbar DropdownMenu

**Problème** : L'erreur `insertBefore` persiste même après avoir remplacé le toast par Sonner.

**Cause probable** : Le `DropdownMenu` de la Navbar (Radix UI) utilise aussi `createPortal` et `insertBefore`. Pendant le submit du formulaire, un re-render peut démonter/remonter la Navbar pendant que le DropdownMenu essaie d'insérer un nœud.

---

## Solution : Wrapper le submit dans startTransition

**Pourquoi** :
- `startTransition` rend le submit non-bloquant
- Évite les re-renders synchrones qui peuvent causer le problème
- Permet à React de gérer les updates de manière optimale

---

## Alternative : Désactiver les interactions pendant le submit

**Option** : Ajouter un `pointer-events-none` sur la Navbar pendant le submit pour éviter toute interaction avec les DropdownMenus.

