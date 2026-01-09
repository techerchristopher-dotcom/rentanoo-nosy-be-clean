# DIAG RUNTIME — Actions propriétaire (Accepter/Refuser)

**Date**: 2025-01-XX  
**Objectif**: Confirmer en runtime POURQUOI les actions owner ne s'affichent pas  
**Status**: ✅ Logs DEV-only ajoutés — À tester en runtime

---

## 1. Logs DEV-only ajoutés

### Emplacement 1: Log au rendu du composant

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: 238-252

```typescript
// DEV-only: Diagnostic des actions propriétaire au rendu
useEffect(() => {
  if (import.meta.env.DEV) {
    const shouldShowActions_pendingOnly = booking.status === 'pending'
    const shouldShowActions_pendingOrPayment = booking.status === 'pending' || booking.status === 'pending_payment'
    
    console.info('[owner-actions-diag]', {
      bookingId: booking.id,
      status: booking.status,
      isExpanded,
      shouldShowActions_pendingOnly,
      shouldShowActions_pendingOrPayment,
      location: 'Component render',
      inCollapsibleContent: true, // Les actions sont toujours dans CollapsibleContent
    })
  }
}, [booking.id, booking.status, isExpanded])
```

### Emplacement 2: Log au moment du rendu des actions

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: ~1000-1025 (dans le bloc JSX des actions)

```typescript
{(() => {
  // DEV-only: Log au moment du rendu des actions
  if (import.meta.env.DEV) {
    const conditionPending = booking.status === 'pending'
    const conditionPendingOrPayment = booking.status === 'pending' || booking.status === 'pending_payment'
    
    if (conditionPending) {
      console.info('[owner-actions-diag] ACTIONS RENDERED', {
        bookingId: booking.id,
        status: booking.status,
        isExpanded,
        condition: 'booking.status === "pending"',
        result: true,
        location: 'CollapsibleContent (ligne ~998)',
        willRender: true,
      })
    } else {
      console.info('[owner-actions-diag] ACTIONS HIDDEN', {
        bookingId: booking.id,
        status: booking.status,
        isExpanded,
        condition: 'booking.status === "pending"',
        result: false,
        location: 'CollapsibleContent (ligne ~998)',
        willRender: false,
        reason: `Status is "${booking.status}", expected "pending"`,
        alternative: conditionPendingOrPayment 
          ? 'Would render if condition included pending_payment' 
          : 'Status does not match pending or pending_payment',
      })
    }
  }
  return null
})()}
```

---

## 2. Logs attendus pour les 3 cas de test

### Cas 1: `booking.status = 'pending'` (carte repliée)

**Conditions**:
- `booking.status === 'pending'`
- `isExpanded === false`

**Logs attendus**:

```javascript
// Log 1: Au rendu du composant
[owner-actions-diag] {
  bookingId: "abc123...",
  status: "pending",
  isExpanded: false,
  shouldShowActions_pendingOnly: true,
  shouldShowActions_pendingOrPayment: true,
  location: "Component render",
  inCollapsibleContent: true
}

// Log 2: Au moment du rendu des actions (dans CollapsibleContent)
[owner-actions-diag] ACTIONS RENDERED {
  bookingId: "abc123...",
  status: "pending",
  isExpanded: false,
  condition: 'booking.status === "pending"',
  result: true,
  location: "CollapsibleContent (ligne ~998)",
  willRender: true
}
```

**Résultat attendu**: 
- ✅ Les actions sont **rendues** dans le DOM (le JSX est exécuté)
- ❌ Les actions sont **invisibles** car `CollapsibleContent` est caché (`isExpanded === false`)

**Conclusion**: Le code JSX des actions est exécuté, mais le conteneur `CollapsibleContent` n'est pas visible.

---

### Cas 2: `booking.status = 'pending'` (carte dépliée)

**Conditions**:
- `booking.status === 'pending'`
- `isExpanded === true`

**Logs attendus**:

```javascript
// Log 1: Au rendu du composant
[owner-actions-diag] {
  bookingId: "abc123...",
  status: "pending",
  isExpanded: true,
  shouldShowActions_pendingOnly: true,
  shouldShowActions_pendingOrPayment: true,
  location: "Component render",
  inCollapsibleContent: true
}

// Log 2: Au moment du rendu des actions
[owner-actions-diag] ACTIONS RENDERED {
  bookingId: "abc123...",
  status: "pending",
  isExpanded: true,
  condition: 'booking.status === "pending"',
  result: true,
  location: "CollapsibleContent (ligne ~998)",
  willRender: true
}
```

**Résultat attendu**: 
- ✅ Les actions sont **rendues** dans le DOM
- ✅ Les actions sont **visibles** car `CollapsibleContent` est ouvert (`isExpanded === true`)

**Conclusion**: Les actions devraient être visibles et fonctionnelles.

---

### Cas 3: `booking.status = 'pending_payment'` (carte dépliée)

**Conditions**:
- `booking.status === 'pending_payment'`
- `isExpanded === true`

**Logs attendus**:

```javascript
// Log 1: Au rendu du composant
[owner-actions-diag] {
  bookingId: "abc123...",
  status: "pending_payment",
  isExpanded: true,
  shouldShowActions_pendingOnly: false,
  shouldShowActions_pendingOrPayment: true,
  location: "Component render",
  inCollapsibleContent: true
}

// Log 2: Au moment du rendu des actions
[owner-actions-diag] ACTIONS HIDDEN {
  bookingId: "abc123...",
  status: "pending_payment",
  isExpanded: true,
  condition: 'booking.status === "pending"',
  result: false,
  location: "CollapsibleContent (ligne ~998)",
  willRender: false,
  reason: 'Status is "pending_payment", expected "pending"',
  alternative: "Would render if condition included pending_payment"
}
```

**Résultat attendu**: 
- ❌ Les actions ne sont **pas rendues** (le JSX conditionnel retourne `null`)
- ❌ Les actions sont **invisibles** (même si la carte est dépliée)

**Conclusion**: La condition stricte `booking.status === 'pending'` exclut `pending_payment`.

---

## 3. Cause racine exacte (après analyse des logs)

### Hypothèse principale (à confirmer avec les logs)

**Cause #1 (très probable)**: Carte repliée (`isExpanded === false`)
- Les actions sont dans `CollapsibleContent` (ligne 884)
- Même si le JSX est rendu, le conteneur est caché par le composant `Collapsible`
- **Preuve attendue**: Log `ACTIONS RENDERED` avec `isExpanded: false`

**Cause #2 (probable)**: Statut différent de `'pending'`
- Condition stricte: `booking.status === 'pending'` (ligne 999)
- Si le statut est `'pending_payment'` ou autre, les actions ne sont pas rendues
- **Preuve attendue**: Log `ACTIONS HIDDEN` avec `reason: "Status is ..."`

**Cause #3 (moins probable)**: Les deux causes combinées
- Carte repliée ET statut différent de `'pending'`
- **Preuve attendue**: Log `ACTIONS HIDDEN` avec `isExpanded: false` ET `result: false`

---

## 4. Recommandations UI (sans implémentation)

### Option A: Garder dans le collapsible + auto-expand pending

**Fichier**: `src/pages/owner/OwnerBookings.tsx` (ligne ~715)

**Changement**:
```typescript
<OwnerBookingCard
  key={booking.id}
  booking={bookingDetails as any}
  isExpanded={expandedBookings.has(booking.id) || booking.status === 'pending'} // Auto-expand si pending
  toggleExpanded={toggleExpanded}
  // ...
/>
```

**Avantages**:
- ✅ Minimal (1 ligne modifiée)
- ✅ Les actions restent dans le contexte détaillé
- ✅ UX: Les bookings pending nécessitent une action, donc visible par défaut

**Inconvénients**:
- ⚠️ Toutes les cartes pending sont dépliées par défaut (peut être encombrant si beaucoup)
- ⚠️ Ne résout pas le problème si le statut est `pending_payment`

**Recommandation**: ⭐⭐⭐ (3/5) — Bon si le problème est uniquement la visibilité

---

### Option B: Déplacer les boutons dans le header

**Fichier**: `src/components/OwnerBookingCard.tsx`

**Changement**: Déplacer le bloc actions (ligne 997-1029) dans `CollapsibleTrigger` (après la ligne 878), mais uniquement pour les actions critiques (Accepter/Refuser).

**Structure proposée**:
```typescript
<CollapsibleTrigger asChild>
  <CardContent>
    {/* Header existant */}
    
    {/* Actions critiques dans le header (si pending) */}
    {booking.status === 'pending' && (
      <div className="flex gap-2">
        <Button onClick={handleAccept}>Accepter</Button>
        <Button onClick={handleReject}>Refuser</Button>
      </div>
    )}
  </CardContent>
</CollapsibleTrigger>

<CollapsibleContent>
  {/* Détails */}
  {/* Actions secondaires (Annuler, État des lieux, etc.) */}
</CollapsibleContent>
```

**Avantages**:
- ✅ Actions critiques toujours visibles (même carte repliée)
- ✅ Meilleure UX pour les actions urgentes
- ✅ Les détails restent dans le contenu déplié

**Inconvénients**:
- ⚠️ Plus de modifications (déplacer du code)
- ⚠️ Header peut devenir encombré
- ⚠️ Nécessite un design responsive pour mobile

**Recommandation**: ⭐⭐⭐⭐ (4/5) — Meilleure UX, mais plus de travail

---

### Option C: Afficher une mini row actions même replié

**Fichier**: `src/components/OwnerBookingCard.tsx`

**Changement**: Ajouter une mini-row d'actions dans le header (ligne ~748), visible uniquement si `booking.status === 'pending'` et `!isExpanded`.

**Structure proposée**:
```typescript
{/* Actions et statut - alignement parfait */}
<div className="flex flex-col items-end gap-2 h-16">
  {/* Badge statut */}
  
  {/* Mini actions (si pending et replié) */}
  {booking.status === 'pending' && !isExpanded && (
    <div className="flex gap-1">
      <Button size="sm" variant="default" onClick={handleAccept}>
        <CheckCircle className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="destructive" onClick={handleReject}>
        <XCircle className="h-3 w-3" />
      </Button>
    </div>
  )}
  
  {/* Avatar + Message */}
</div>
```

**Avantages**:
- ✅ Actions visibles même replié
- ✅ Design compact (icônes seulement)
- ✅ Les actions complètes restent dans le contenu déplié

**Inconvénients**:
- ⚠️ Duplication de code (actions dans header ET contenu)
- ⚠️ Design peut être encombré
- ⚠️ Nécessite gestion de l'état (éviter double clic)

**Recommandation**: ⭐⭐⭐ (3/5) — Bon compromis, mais duplication

---

## 5. Recommandation finale (après analyse des logs)

### Si cause #1 (carte repliée) → **Option A** ou **Option B**
- **Option A** si on veut une solution rapide
- **Option B** si on veut une meilleure UX long terme

### Si cause #2 (statut différent) → **Corriger la condition** + Option A/B
- Modifier la condition (ligne 999) pour inclure `pending_payment`
- Puis appliquer Option A ou B selon préférence UX

### Si cause #3 (les deux) → **Option B** (recommandé)
- Option B résout les deux problèmes en une fois
- Meilleure UX globale

---

## 6. Checklist de test

- [ ] Ouvrir la console navigateur (DEV mode)
- [ ] Naviguer vers `/me/owner/bookings`
- [ ] Tester Cas 1: Booking `pending` replié
  - [ ] Vérifier log `[owner-actions-diag]` avec `isExpanded: false`
  - [ ] Vérifier log `ACTIONS RENDERED` ou `ACTIONS HIDDEN`
  - [ ] Vérifier visibilité dans le DOM (DevTools)
- [ ] Tester Cas 2: Booking `pending` déplié
  - [ ] Vérifier log avec `isExpanded: true`
  - [ ] Vérifier que les actions sont visibles
- [ ] Tester Cas 3: Booking `pending_payment` déplié
  - [ ] Vérifier log `ACTIONS HIDDEN` avec `reason`
  - [ ] Vérifier que les actions ne sont pas rendues
- [ ] Documenter les résultats réels
- [ ] Choisir l'option de correction selon les résultats

---

## 7. Fichiers modifiés

1. ✅ `src/components/OwnerBookingCard.tsx`
   - Ligne 238-252: Log au rendu du composant
   - Ligne ~1000-1025: Log au moment du rendu des actions

---

**FIN DU DIAGNOSTIC RUNTIME**  
**⚠️ PROCHAINES ÉTAPES**: Tester en runtime et documenter les résultats réels

