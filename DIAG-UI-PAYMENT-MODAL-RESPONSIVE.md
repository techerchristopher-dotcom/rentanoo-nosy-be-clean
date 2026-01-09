# DIAG UI — Modale "Confirmer et payer" non responsive (overflow / découpage écran)

**Date**: 2025-01-XX  
**Objectif**: Diagnostic strict — Pourquoi la modale est coupée verticalement  
**Status**: 🔍 Diagnostic complet — Problèmes identifiés

---

## A) Identification de la modale et arbre DOM

### 1. Composant exact

**Fichier**: `src/components/PaymentFlowModal.tsx`  
**Composant**: `PaymentFlowModal`  
**Ligne d'ouverture**: 48

### 2. Arbre JSX simplifié

```
Dialog (Radix UI)
└─ DialogContent (ligne 49)
   └─ <div className="space-y-6"> (ligne 50)
      ├─ DialogHeader (ligne 51-53)
      │  └─ DialogTitle: "Confirmer et payer"
      │
      ├─ Collapsible (Étape 1 — Payer ma location) (ligne 55-199)
      │  ├─ CollapsibleTrigger (ligne 56-87)
      │  │  └─ Header avec bouton "Payer via Stripe"
      │  └─ CollapsibleContent (ligne 89-198)
      │     ├─ Résumé réservation
      │     ├─ Dates (grid 2 colonnes)
      │     ├─ Montants (base, frais, total)
      │     ├─ Services supplémentaires
      │     ├─ Bloc réassurance Stripe
      │     └─ Footer CTA (boutons Payer/Annuler)
      │
      └─ Collapsible (Étape 2 — Payer ma caution) (ligne 202-247)
         ├─ CollapsibleTrigger (ligne 203-221)
         └─ CollapsibleContent (ligne 222-246)
            └─ Contenu étape 2
```

### 3. Classes CSS importantes

#### DialogContent (PaymentFlowModal.tsx:49)
```tsx
className="w-[min(95vw,960px)] sm:max-w-3xl sm:rounded-2xl shadow-xl overflow-visible p-6 sm:p-8"
```

**Classes clés**:
- `w-[min(95vw,960px)]` → Largeur responsive (95vw max 960px)
- `sm:max-w-3xl` → Largeur max 768px sur écrans ≥640px
- `overflow-visible` → ❌ **PROBLÈME** — Empêche le scroll
- `p-6 sm:p-8` → Padding responsive

#### DialogContent base (dialog.tsx:38-39)
```tsx
className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] ..."
```

**Classes clés**:
- `fixed` → Position fixe
- `left-[50%] top-[50%]` → Centrage initial
- `translate-x-[-50%] translate-y-[-50%]` → Centrage parfait
- ❌ **AUCUNE contrainte de hauteur** (`max-height`, `max-h-*`)
- ❌ **AUCUN overflow-y** défini

#### Conteneur interne (PaymentFlowModal.tsx:50)
```tsx
<div className="space-y-6">
```

**Classes clés**:
- `space-y-6` → Espacement vertical entre enfants
- ❌ **AUCUNE contrainte de hauteur**
- ❌ **AUCUN scroll défini**

---

## B) Analyse responsive (cause racine)

### 1. Hauteur max de la modale

**Résultat**: ❌ **AUCUNE hauteur max définie**

**Preuve**:
- `dialog.tsx:38-39` : Pas de `max-height` ou `max-h-*` dans les classes de base
- `PaymentFlowModal.tsx:49` : Pas de `max-height` ou `max-h-*` dans les classes custom

**Impact**: La modale peut dépasser la hauteur du viewport (`100vh`)

---

### 2. Où est appliqué le scroll ?

**Résultat**: ❌ **AUCUN scroll appliqué**

**Preuve**:
- `PaymentFlowModal.tsx:49` : `overflow-visible` → **BLOQUE le scroll**
- `dialog.tsx:38-39` : Pas de `overflow-y-auto` ou `overflow-y-scroll`
- `PaymentFlowModal.tsx:50` : Conteneur interne sans `overflow-y-auto`

**Impact**: Le contenu ne peut pas scroller, même s'il dépasse l'écran

---

### 3. Overflow-hidden bloque-t-il le scroll ?

**Résultat**: ❌ **OUI — `overflow-visible` empêche le scroll**

**Preuve**:
- `PaymentFlowModal.tsx:49` : `overflow-visible` explicitement défini
- Cette classe **remplace** le comportement par défaut qui pourrait permettre le scroll

**Impact**: Même si le contenu dépasse, il ne peut pas scroller

---

### 4. Un parent empêche-t-il l'enfant de scroller ?

**Résultat**: ⚠️ **OUI — Position fixe + centrage vertical**

**Preuve**:
- `dialog.tsx:38-39` : `fixed top-[50%] translate-y-[-50%]`
- Cette approche centre la modale verticalement, mais si la modale est plus haute que le viewport, elle sort de l'écran

**Impact**: Le footer peut être coupé en bas si la modale dépasse `100vh`

---

### 5. Le footer sort-il de l'écran ?

**Résultat**: ✅ **OUI — Confirmé par l'utilisateur**

**Preuve**:
- Description utilisateur : "footer partiellement hors écran"
- Cause : Pas de contrainte de hauteur + pas de scroll + centrage vertical fixe

**Impact**: Les boutons CTA (Payer/Annuler) ne sont pas accessibles sans zoom navigateur

---

## C) Comparaison attendue (UX correcte)

### Comportement attendu

1. **Hauteur max basée sur viewport**:
   ```css
   max-height: calc(100vh - 2rem)  /* ou 90vh */
   ```

2. **Scroll interne sur le contenu**:
   ```css
   overflow-y: auto  /* sur le conteneur de contenu */
   ```

3. **Header visible**:
   - Header fixe en haut (non scrollable)
   - Titre "Confirmer et payer" toujours visible

4. **Footer CTA toujours accessible**:
   - Option A: Footer sticky en bas (recommandé)
   - Option B: Footer dans la zone scrollable mais visible après scroll

### Structure recommandée

```
DialogContent (max-height: calc(100vh - 2rem))
├─ DialogHeader (flex-shrink-0) → Header fixe
├─ <div className="overflow-y-auto flex-1"> → Zone scrollable
│  └─ Contenu (Étape 1 + Étape 2)
└─ Footer (flex-shrink-0) → Footer fixe (optionnel)
```

---

## D) Logs / tests DEV (optionnels)

### Log DEV-only recommandé

Si nécessaire pour confirmer en runtime, ajouter dans `PaymentFlowModal.tsx`:

```typescript
useEffect(() => {
  if (import.meta.env.DEV && isOpen) {
    const dialogContent = document.querySelector('[role="dialog"]') as HTMLElement
    if (dialogContent) {
      const rect = dialogContent.getBoundingClientRect()
      console.info('[payment-modal-diag]', {
        windowHeight: window.innerHeight,
        modalHeight: rect.height,
        modalTop: rect.top,
        modalBottom: rect.bottom,
        exceedsViewport: rect.height > window.innerHeight,
        footerVisible: rect.bottom <= window.innerHeight,
        overflowComputed: window.getComputedStyle(dialogContent).overflow,
        overflowYComputed: window.getComputedStyle(dialogContent).overflowY,
      })
    }
  }
}, [isOpen])
```

**Emplacement**: Après la ligne 46 dans `PaymentFlowModal.tsx`

---

## E) Conclusion — Cause racine et recommandations

### Cause racine unique

**Problème principal**: `DialogContent` n'a **aucune contrainte de hauteur** et utilise `overflow-visible`, ce qui empêche le scroll interne.

**Éléments fautifs exacts**:

1. **`PaymentFlowModal.tsx:49`** — `overflow-visible`
   - ❌ Empêche le scroll
   - ✅ Devrait être `overflow-y-auto` ou supprimé

2. **`dialog.tsx:38-39`** — Pas de `max-height`
   - ❌ La modale peut dépasser `100vh`
   - ✅ Devrait avoir `max-h-[calc(100vh-2rem)]` ou `max-h-[90vh]`

3. **`PaymentFlowModal.tsx:50`** — Conteneur sans scroll
   - ❌ Le contenu ne peut pas scroller
   - ✅ Devrait avoir `overflow-y-auto` et `max-h-*`

4. **Position centrage vertical** (`dialog.tsx:38-39`)
   - ⚠️ `top-[50%] translate-y-[-50%]` peut poser problème si modale > viewport
   - ✅ Devrait utiliser `top-[5vh]` ou `top-[2rem]` avec `max-h-[90vh]`

---

### Recommandation UI (sans implémentation)

#### Option A: Scroll interne sur contenu (RECOMMANDÉ)

**Modifications**:

1. **`PaymentFlowModal.tsx:49`** — Retirer `overflow-visible`, ajouter contrainte hauteur:
   ```tsx
   className="w-[min(95vw,960px)] sm:max-w-3xl sm:rounded-2xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col p-6 sm:p-8"
   ```

2. **`PaymentFlowModal.tsx:50`** — Ajouter scroll sur conteneur:
   ```tsx
   <div className="space-y-6 overflow-y-auto flex-1 min-h-0">
   ```

3. **`dialog.tsx:38-39`** — Ajuster position verticale:
   ```tsx
   className="... top-[2rem] translate-y-0 ..."  // Au lieu de top-[50%] translate-y-[-50%]
   ```

**Avantages**:
- ✅ Scroll interne propre
- ✅ Header toujours visible
- ✅ Footer accessible après scroll
- ✅ Modale ne dépasse jamais le viewport

---

#### Option B: Footer sticky (ALTERNATIVE)

**Modifications**:

1. **`PaymentFlowModal.tsx:49`** — Même que Option A
2. **Séparer footer** — Extraire les boutons CTA dans un footer sticky:
   ```tsx
   <div className="flex flex-col max-h-[calc(100vh-2rem)]">
     <div className="overflow-y-auto flex-1">
       {/* Contenu */}
     </div>
     <div className="flex-shrink-0 border-t p-4">
       {/* Footer CTA */}
     </div>
   </div>
   ```

**Avantages**:
- ✅ Footer toujours visible
- ✅ Scroll uniquement sur contenu

**Inconvénients**:
- ⚠️ Plus de modifications structurelles

---

#### Option C: Modale full-height avec scroll body (NON RECOMMANDÉ)

**Modifications**:
- Permettre le scroll sur le body quand la modale est ouverte

**Inconvénients**:
- ❌ UX moins propre
- ❌ Header peut sortir de l'écran

---

### Plan de correction UI (recommandé)

**Stratégie**: Option A (scroll interne)

**Étapes**:

1. **Modifier `dialog.tsx`** (base DialogContent):
   - Ajouter `max-h-[calc(100vh-2rem)]` dans les classes de base
   - Changer `top-[50%] translate-y-[-50%]` → `top-[2rem] translate-y-0`
   - Ajouter `flex flex-col` pour layout flexbox

2. **Modifier `PaymentFlowModal.tsx:49`**:
   - Retirer `overflow-visible`
   - S'assurer que `max-h-*` est hérité (ou redéfinir si nécessaire)

3. **Modifier `PaymentFlowModal.tsx:50`**:
   - Ajouter `overflow-y-auto flex-1 min-h-0` au conteneur interne

4. **Tester**:
   - Vérifier que le scroll fonctionne
   - Vérifier que le footer est accessible
   - Vérifier sur différentes tailles d'écran

---

## F) Résumé des problèmes

| Problème | Fichier | Ligne | Impact |
|----------|---------|-------|--------|
| `overflow-visible` bloque scroll | `PaymentFlowModal.tsx` | 49 | ❌ Contenu ne peut pas scroller |
| Pas de `max-height` | `dialog.tsx` | 38-39 | ❌ Modale peut dépasser viewport |
| Pas de scroll interne | `PaymentFlowModal.tsx` | 50 | ❌ Contenu ne peut pas scroller |
| Centrage vertical fixe | `dialog.tsx` | 38-39 | ⚠️ Footer peut sortir si modale > viewport |

---

## G) Checklist de test (après correction)

- [ ] Modale ne dépasse jamais `100vh`
- [ ] Scroll interne fonctionne sur le contenu
- [ ] Header "Confirmer et payer" toujours visible
- [ ] Footer CTA accessible (visible ou après scroll)
- [ ] Test sur écran normal (100% zoom) — pas besoin de zoom 90%
- [ ] Test sur mobile (viewport réduit)
- [ ] Test avec contenu long (Étape 1 + Étape 2 dépliées)

---

**FIN DU DIAGNOSTIC**  
**⚠️ PROCHAINES ÉTAPES**: 
1. Appliquer Option A (scroll interne)
2. Tester en runtime
3. Vérifier que le problème est résolu

