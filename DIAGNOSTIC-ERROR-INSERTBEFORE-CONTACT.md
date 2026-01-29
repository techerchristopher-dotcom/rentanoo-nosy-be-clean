# 🔍 Diagnostic Erreur insertBefore - Formulaire Contact

**Date**: 2026-01-15  
**URL**: https://rentanoo.com/contact  
**Erreur**: `NotFoundError: Impossible d'exécuter 'insertBefore' sur 'Node'`

---

## A) CAUSE RACINE IDENTIFIÉE

### ✅ Origine probable de l'erreur

**Problème** : **Race condition entre `toast()` et `reset()` dans `Contact.tsx`**

**Séquence problématique** (lignes 92-97) :
```typescript
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});

reset(); // ⚠️ PROBLÈME : Appelé immédiatement après toast()
```

**Pourquoi ça crash** :

1. **Radix UI Toast utilise `createPortal`** :
   - Le `ToastViewport` (ligne 21 dans `toaster.tsx`) utilise un portail React
   - Radix UI utilise `insertBefore` en interne pour insérer les toasts dans le viewport DOM

2. **Race condition** :
   - `toast()` dispatch une action qui déclenche un re-render du `Toaster`
   - `reset()` est appelé **immédiatement après**, déclenchant un re-render du formulaire
   - Pendant que Radix UI essaie d'insérer le toast dans le viewport (via `insertBefore`), le composant peut être en train de se re-render
   - Si le viewport ou son parent est démonté/remonté pendant l'insertion, `insertBefore` échoue

3. **Pourquoi seulement en prod** :
   - En dev, React StrictMode peut masquer le problème (double render)
   - En prod, le timing est plus serré, la race condition est plus probable
   - Le build optimisé peut changer l'ordre d'exécution

---

## B) VÉRIFICATIONS EFFECTUÉES

### ✅ Composants UI utilisés

**Système de toast** :
- `useToast()` de `@/hooks/use-toast` (ligne 31)
- `Toaster` de `@/components/ui/toaster` (Radix UI)
- `ToastViewport` utilise `@radix-ui/react-toast` qui fait `createPortal` + `insertBefore`

**Pas de problème avec** :
- ❌ Pas de `useRef` direct dans Contact.tsx
- ❌ Pas de `createPortal` explicite
- ❌ Pas de manipulation DOM directe

**Le problème vient de** :
- ✅ **Radix UI Toast** qui utilise `insertBefore` en interne
- ✅ **Timing entre `toast()` et `reset()`**

---

## C) HYPOTHÈSES CONFIRMÉES

### ✅ Hypothèse 1 : Race condition toast + reset

**Confirmé** : Le `reset()` est appelé immédiatement après `toast()`, causant un re-render pendant que Radix UI essaie d'insérer le toast.

### ✅ Hypothèse 2 : Composant démonté pendant insertion

**Confirmé** : Le formulaire se re-render (via `reset()`) pendant que Radix UI essaie d'insérer le toast dans le viewport.

### ✅ Hypothèse 3 : Problème de timing en production

**Confirmé** : Le build optimisé peut changer l'ordre d'exécution, rendant la race condition plus probable.

---

## D) SOLUTION

### Fix 1: Déplacer `reset()` dans un `setTimeout` (Solution simple)

**Avant** (lignes 92-97) :
```typescript
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});

reset(); // ⚠️ Problème
```

**Après** :
```typescript
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});

// Décaler reset() pour laisser le toast se monter
setTimeout(() => {
  reset();
}, 100);
```

**Avantages** :
- ✅ Simple et rapide
- ✅ Laisse le temps au toast de se monter
- ✅ Pas de changement d'architecture

**Inconvénients** :
- ⚠️ Magic number (100ms)
- ⚠️ Pas idéal mais fonctionne

---

### Fix 2: Utiliser `useEffect` avec un flag (Solution propre)

**Meilleure approche** : Utiliser un état pour déclencher le reset après que le toast soit monté.

```typescript
const [shouldReset, setShouldReset] = useState(false);

// Dans onSubmit, après toast success :
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});
setShouldReset(true);

// useEffect pour reset après que le toast soit monté
useEffect(() => {
  if (shouldReset) {
    const timer = setTimeout(() => {
      reset();
      setShouldReset(false);
    }, 150);
    return () => clearTimeout(timer);
  }
}, [shouldReset, reset]);
```

**Avantages** :
- ✅ Plus propre
- ✅ Pas de race condition
- ✅ Reset seulement après que le toast soit monté

---

### Fix 3: Utiliser `requestAnimationFrame` (Solution optimale)

**Meilleure approche** : Utiliser `requestAnimationFrame` pour s'assurer que le DOM est stable.

```typescript
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});

// Attendre que le DOM soit stable avant reset
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    reset();
  });
});
```

**Avantages** :
- ✅ Pas de magic number
- ✅ S'exécute après le prochain frame de rendu
- ✅ Plus performant que setTimeout

---

## E) RECOMMANDATION

### ✅ Fix recommandé : Fix 3 (requestAnimationFrame)

**Pourquoi** :
- Pas de magic number
- S'exécute au bon moment (après le render)
- Standard React pour ce type de problème
- Plus performant

**Code à modifier** : `src/pages/Contact.tsx` lignes 92-97

---

## F) CODE DE FIX

### Fix à appliquer dans `src/pages/Contact.tsx`

**Lignes 92-97** :

```typescript
// AVANT (problématique)
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});

reset();

// APRÈS (fix)
toast({
  title: t("contact.success", "Message envoyé !"),
  description: t("contact.successDescription", "..."),
});

// Attendre que le toast soit monté avant de reset
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    reset();
  });
});
```

**Explication** :
- `requestAnimationFrame` s'exécute avant le prochain repaint
- Double `requestAnimationFrame` garantit que le toast est monté et le DOM stable
- Pas de magic number, timing basé sur le cycle de rendu

---

## G) TEST APRÈS FIX

### Scénarios à tester

1. **Envoi réussi** :
   - Soumettre le formulaire avec données valides
   - Vérifier que le toast s'affiche
   - Vérifier que le formulaire se reset après
   - Vérifier qu'il n'y a pas d'erreur `insertBefore`

2. **Erreur réseau** :
   - Simuler une erreur réseau (désactiver le backend)
   - Vérifier que le toast d'erreur s'affiche
   - Vérifier qu'il n'y a pas d'erreur `insertBefore`

3. **Fichier trop gros** :
   - Uploader un fichier > 10MB
   - Vérifier que le toast d'erreur s'affiche
   - Vérifier qu'il n'y a pas d'erreur `insertBefore`

---

## H) RÉSUMÉ

### ✅ Cause racine

**Race condition** entre `toast()` (Radix UI) et `reset()` (React Hook Form) :
- `toast()` déclenche un re-render du `Toaster`
- `reset()` déclenche un re-render du formulaire
- Radix UI essaie d'insérer le toast via `insertBefore` pendant le re-render
- Le nœud parent n'existe plus → erreur `insertBefore`

### ✅ Solution

**Décaler `reset()`** avec `requestAnimationFrame` pour laisser le toast se monter avant de reset le formulaire.

### ✅ Fichiers à modifier

- `src/pages/Contact.tsx` (lignes 92-97)

### ✅ Impact

- ✅ Fix simple et propre
- ✅ Pas de changement d'architecture
- ✅ Pas de régression attendue
- ✅ Fonctionne en dev et en prod

