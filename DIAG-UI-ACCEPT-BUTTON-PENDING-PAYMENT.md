# DIAG UI — Bouton "Accepter" visible alors que statut = pending_payment

**Date**: 2025-01-XX  
**Objectif**: Diagnostic strict — Pourquoi le bouton "Accepter" est visible avec `pending_payment`  
**Status**: 🔍 Diagnostic en cours — Logs DEV-only ajoutés

---

## A) Localisation du rendu du bouton "Accepter"

### 1. Composant exact
**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Composant**: `OwnerBookingCard`

### 2. Emplacement JSX exact
**Lignes**: 1047-1077

```1047:1077:src/components/OwnerBookingCard.tsx
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
  <>
    <Button
      variant="default"
      size="sm"
      onClick={(e) => {
        console.log('[UI] Bouton "Accepter" cliqué', { bookingId: booking.id, status: booking.status })
        e.stopPropagation()
        handleAccept()
      }}
      disabled={isUpdating}
      className="bg-success hover:bg-success/90 flex-1 sm:flex-none"
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      Accepter
    </Button>
    <Button
      variant="destructive"
      size="sm"
      onClick={(e) => {
        e.stopPropagation()
        handleReject()
      }}
      disabled={isUpdating}
      className="flex-1 sm:flex-none"
    >
      <XCircle className="h-4 w-4 mr-2" />
      Refuser
    </Button>
  </>
)}
```

### 3. Condition d'affichage actuelle

**Condition actuelle** (ligne 1047):
```typescript
booking.status === 'pending' || booking.status === 'pending_payment'
```

**Problème identifié**: 
- ✅ Cette condition contrôle **les deux boutons** ("Accepter" ET "Refuser")
- ❌ Le bouton "Accepter" est rendu pour `pending_payment` alors qu'il ne devrait pas

---

## B) Analyse de la condition actuelle

### Condition utilisée pour le bouton "Accepter"

**Condition actuelle**: `booking.status === 'pending' || booking.status === 'pending_payment'`

**Analyse**:
- ✅ Le bouton "Accepter" est inclus dans cette condition
- ❌ `pending_payment` est **explicitement inclus** (pas exclu)
- ❌ La condition est **trop large** — elle affiche "Accepter" pour deux statuts différents

### Structure du code

Les deux boutons sont dans le **même bloc conditionnel**:
```tsx
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
  <>
    <Button>Accepter</Button>  // ❌ Affiché pour pending_payment
    <Button>Refuser</Button>    // ✅ Correct pour pending_payment
  </>
)}
```

**Problème**: Les boutons "Accepter" et "Refuser" partagent la même condition, alors qu'ils devraient avoir des conditions différentes.

---

## C) Comparaison avec la règle métier attendue

### Règle métier attendue

**Bouton "Accepter" visible UNIQUEMENT si**:
- ✅ `role = owner` (implicite — on est dans OwnerBookingCard)
- ✅ `booking.status === "pending"`

**Bouton "Accepter" DOIT ÊTRE MASQUÉ si**:
- ❌ `booking.status === "pending_payment"` ← **PROBLÈME ICI**
- ❌ `booking.status === "confirmed"`
- ❌ `booking.status === "active"`
- ❌ `booking.status === "completed"`

**Bouton "Refuser" visible si**:
- ✅ `booking.status === "pending"` (refuser avant acceptation)
- ✅ `booking.status === "pending_payment"` (refuser après acceptation, avant paiement)

### Comparaison avec l'implémentation actuelle

| Statut | Règle attendue "Accepter" | Règle attendue "Refuser" | Implémentation actuelle |
|--------|--------------------------|---------------------------|-------------------------|
| `pending` | ✅ Visible | ✅ Visible | ✅ Visible (correct) |
| `pending_payment` | ❌ **Masqué** | ✅ Visible | ❌ **Visible** (FAUX) |
| `confirmed` | ❌ Masqué | ❌ Masqué | ❌ Masqué (correct) |

**Conclusion**: 
- ❌ L'implémentation actuelle **viole la règle métier** pour `pending_payment`
- ✅ L'implémentation actuelle est correcte pour `pending`

---

## D) Cause racine exacte

### Problème identifié

**Cause**: Les boutons "Accepter" et "Refuser" sont dans le **même bloc conditionnel** avec une condition partagée.

**Ligne problématique**: 1047
```typescript
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
```

**Impact**: 
- Le bouton "Accepter" est rendu pour `pending_payment` alors qu'il ne devrait pas
- Le bouton "Refuser" est correctement rendu pour `pending_payment`

### Solution attendue (sans implémentation)

**Séparer les conditions**:

```typescript
{/* Bouton "Accepter" — UNIQUEMENT pour pending */}
{booking.status === 'pending' && (
  <Button onClick={handleAccept}>
    <CheckCircle className="h-4 w-4 mr-2" />
    Accepter
  </Button>
)}

{/* Bouton "Refuser" — pour pending ET pending_payment */}
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
  <Button onClick={handleReject}>
    <XCircle className="h-4 w-4 mr-2" />
    Refuser
  </Button>
)}
```

---

## E) Logs DEV-only ajoutés

### Emplacement des logs

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: ~1047-1077 (dans le bloc JSX des actions)

### Log 1: Diagnostic au rendu des actions

```typescript
{(() => {
  // DEV-only: Diagnostic du bouton "Accepter" au rendu
  if (import.meta.env.DEV) {
    const conditionAccept = booking.status === 'pending' || booking.status === 'pending_payment'
    const conditionAcceptCorrect = booking.status === 'pending'
    const conditionReject = booking.status === 'pending' || booking.status === 'pending_payment'
    
    console.info('[owner-accept-button-diag]', {
      bookingId: booking.id,
      status: booking.status,
      location: 'CollapsibleContent (ligne ~1047)',
      // Condition actuelle (FAUSSE)
      conditionAcceptCurrent: conditionAccept,
      willShowAcceptCurrent: conditionAccept,
      // Condition correcte attendue
      conditionAcceptCorrect: conditionAcceptCorrect,
      willShowAcceptCorrect: conditionAcceptCorrect,
      // Condition Refuser (correcte)
      conditionReject: conditionReject,
      willShowReject: conditionReject,
      // Diagnostic
      problem: conditionAccept && !conditionAcceptCorrect 
        ? `Bouton "Accepter" affiché pour status "${booking.status}" alors qu'il devrait être masqué`
        : 'OK',
      isExpanded,
    })
  }
  return null
})()}
```

### Log 2: Diagnostic au clic sur "Accepter"

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Ligne**: ~1053 (dans le onClick du bouton)

**Log existant** (à enrichir):
```typescript
onClick={(e) => {
  // Log existant
  console.log('[UI] Bouton "Accepter" cliqué', { bookingId: booking.id, status: booking.status })
  
  // DEV-only: Diagnostic enrichi
  if (import.meta.env.DEV) {
    console.warn('[owner-accept-button-diag] CLICK', {
      bookingId: booking.id,
      status: booking.status,
      shouldNotBeVisible: booking.status === 'pending_payment',
      problem: booking.status === 'pending_payment' 
        ? 'Bouton "Accepter" cliqué alors que status = pending_payment (ne devrait pas être visible)'
        : 'OK',
    })
  }
  
  e.stopPropagation()
  handleAccept()
}}
```

---

## F) Logs attendus pour les cas de test

### Cas 1: `booking.status = 'pending'` (carte dépliée)

**Conditions**:
- `booking.status === 'pending'`
- `isExpanded === true`

**Logs attendus**:
```javascript
[owner-accept-button-diag] {
  bookingId: "abc123...",
  status: "pending",
  conditionAcceptCurrent: true,
  willShowAcceptCurrent: true,
  conditionAcceptCorrect: true,
  willShowAcceptCorrect: true,
  conditionReject: true,
  willShowReject: true,
  problem: "OK",
  isExpanded: true
}
```

**Résultat attendu**: 
- ✅ Bouton "Accepter" visible (correct)
- ✅ Bouton "Refuser" visible (correct)

---

### Cas 2: `booking.status = 'pending_payment'` (carte dépliée)

**Conditions**:
- `booking.status === 'pending_payment'`
- `isExpanded === true`

**Logs attendus**:
```javascript
[owner-accept-button-diag] {
  bookingId: "abc123...",
  status: "pending_payment",
  conditionAcceptCurrent: true,        // ❌ FAUX — devrait être false
  willShowAcceptCurrent: true,         // ❌ FAUX — devrait être false
  conditionAcceptCorrect: false,        // ✅ CORRECT
  willShowAcceptCorrect: false,        // ✅ CORRECT
  conditionReject: true,               // ✅ CORRECT
  willShowReject: true,                // ✅ CORRECT
  problem: "Bouton \"Accepter\" affiché pour status \"pending_payment\" alors qu'il devrait être masqué",
  isExpanded: true
}
```

**Résultat attendu**: 
- ❌ Bouton "Accepter" visible (FAUX — ne devrait pas être visible)
- ✅ Bouton "Refuser" visible (correct)

**Si clic sur "Accepter"**:
```javascript
[owner-accept-button-diag] CLICK {
  bookingId: "abc123...",
  status: "pending_payment",
  shouldNotBeVisible: true,
  problem: "Bouton \"Accepter\" cliqué alors que status = pending_payment (ne devrait pas être visible)"
}
```

---

### Cas 3: `booking.status = 'confirmed'` (carte dépliée)

**Conditions**:
- `booking.status === 'confirmed'`
- `isExpanded === true`

**Logs attendus**:
```javascript
[owner-accept-button-diag] {
  bookingId: "abc123...",
  status: "confirmed",
  conditionAcceptCurrent: false,
  willShowAcceptCurrent: false,
  conditionAcceptCorrect: false,
  willShowAcceptCorrect: false,
  conditionReject: false,
  willShowReject: false,
  problem: "OK",
  isExpanded: true
}
```

**Résultat attendu**: 
- ✅ Bouton "Accepter" masqué (correct)
- ✅ Bouton "Refuser" masqué (correct)

---

## G) Résumé du diagnostic

### Problème identifié

1. **Localisation**: Ligne 1047 de `OwnerBookingCard.tsx`
2. **Cause**: Condition partagée entre "Accepter" et "Refuser"
3. **Impact**: Bouton "Accepter" visible pour `pending_payment` alors qu'il devrait être masqué

### Condition actuelle (FAUSSE)
```typescript
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
  // Les deux boutons sont rendus
)}
```

### Condition correcte attendue

**Bouton "Accepter"**:
```typescript
{booking.status === 'pending' && (
  <Button>Accepter</Button>
)}
```

**Bouton "Refuser"**:
```typescript
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
  <Button>Refuser</Button>
)}
```

### Fichiers modifiés (logs DEV-only uniquement)

1. ✅ `src/components/OwnerBookingCard.tsx`
   - Ligne ~1047: Log au rendu des actions
   - Ligne ~1053: Log enrichi au clic sur "Accepter"

---

## H) Checklist de test

- [ ] Ouvrir la console navigateur (DEV mode)
- [ ] Naviguer vers `/me/owner/bookings`
- [ ] Tester Cas 1: Booking `pending` déplié
  - [ ] Vérifier log `[owner-accept-button-diag]` avec `status: "pending"`
  - [ ] Vérifier que `willShowAcceptCurrent === true` ET `willShowAcceptCorrect === true`
  - [ ] Vérifier que les deux boutons sont visibles
- [ ] Tester Cas 2: Booking `pending_payment` déplié
  - [ ] Vérifier log avec `status: "pending_payment"`
  - [ ] Vérifier que `willShowAcceptCurrent === true` (FAUX) ET `willShowAcceptCorrect === false` (CORRECT)
  - [ ] Vérifier que le bouton "Accepter" est visible (PROBLÈME)
  - [ ] Vérifier que le bouton "Refuser" est visible (correct)
  - [ ] Cliquer sur "Accepter" et vérifier le log `CLICK` avec `shouldNotBeVisible: true`
- [ ] Tester Cas 3: Booking `confirmed` déplié
  - [ ] Vérifier log avec `status: "confirmed"`
  - [ ] Vérifier que les deux boutons sont masqués
- [ ] Documenter les résultats réels

---

**FIN DU DIAGNOSTIC**  
**⚠️ PROCHAINES ÉTAPES**: 
1. Tester en runtime avec les logs DEV-only
2. Confirmer le problème avec les logs
3. Appliquer la correction (séparer les conditions)

