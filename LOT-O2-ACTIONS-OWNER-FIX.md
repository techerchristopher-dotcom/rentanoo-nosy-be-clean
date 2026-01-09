# LOT O2 — Réafficher actions owner (Accepter/Refuser)

**Date**: 2025-01-XX  
**Status**: ✅ Implémenté  
**Objectif**: Faire réapparaître les actions Owner (Accepter/Refuser) avec fix minimal

---

## Modifications effectuées

### O2.1 — Élargir la condition d'affichage des actions

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Ligne**: 1047

**Avant**:
```typescript
{booking.status === 'pending' && (
  // Boutons Accepter/Refuser
)}
```

**Après**:
```typescript
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
  // Boutons Accepter/Refuser
)}
```

**Impact**: Les actions s'affichent maintenant pour les deux statuts `pending` et `pending_payment`.

---

### O2.2 — Auto-expand des cards "action required"

**Fichier**: `src/pages/owner/OwnerBookings.tsx`  
**Lignes**: 711-718

**Avant**:
```typescript
<OwnerBookingCard
  key={booking.id}
  booking={bookingDetails as any}
  isExpanded={expandedBookings.has(booking.id)}
  // ...
/>
```

**Après**:
```typescript
// Auto-expand les cards qui nécessitent une action (pending/pending_payment)
const forceExpand = booking.status === 'pending' || booking.status === 'pending_payment';

<OwnerBookingCard
  key={booking.id}
  booking={bookingDetails as any}
  isExpanded={expandedBookings.has(booking.id) || forceExpand}
  // ...
/>
```

**Impact**: Les cards avec statut `pending` ou `pending_payment` s'ouvrent automatiquement, rendant les actions visibles sans clic.

---

### O2.3 — Mise à jour des logs DEV-only

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: 1017-1050

**Changements**:
- Logs mis à jour pour refléter la nouvelle condition `pending || pending_payment`
- Message de log ajusté pour indiquer la condition complète
- Suppression de la variable `conditionPending` devenue inutile

**Impact**: Les logs de diagnostic reflètent maintenant la condition réelle utilisée.

---

## Comportement attendu

### Cas 1: Booking `pending` (nouvelle demande)
- ✅ Card auto-expandée
- ✅ Actions "Accepter" et "Refuser" visibles
- ✅ Actions fonctionnelles

### Cas 2: Booking `pending_payment` (accepté, en attente de paiement)
- ✅ Card auto-expandée
- ✅ Actions "Accepter" et "Refuser" visibles
- ✅ Actions fonctionnelles

### Cas 3: Booking `active`, `confirmed`, `completed`, etc.
- ✅ Card repliée par défaut (comportement normal)
- ❌ Pas d'actions "Accepter/Refuser" (comportement attendu)
- ✅ Bouton "Annuler" toujours disponible dans le contenu déplié

---

## Vérifications effectuées

- ✅ Build/lint: Aucune erreur
- ✅ Logs DEV-only: Conservés et mis à jour
- ✅ Condition élargie: `pending || pending_payment`
- ✅ Auto-expand: Implémenté pour les statuts nécessitant une action
- ✅ Pas de refactor lourd: Modifications minimales uniquement

---

## Fichiers modifiés

1. **src/components/OwnerBookingCard.tsx**
   - Ligne 1047: Condition d'affichage élargie
   - Lignes 1017-1050: Logs DEV-only mis à jour

2. **src/pages/owner/OwnerBookings.tsx**
   - Lignes 711-718: Auto-expand pour pending/pending_payment

---

## Diff résumé

### OwnerBookingCard.tsx

```diff
- {booking.status === 'pending' && (
+ {(booking.status === 'pending' || booking.status === 'pending_payment') && (
    <>
      <Button>Accepter</Button>
      <Button>Refuser</Button>
    </>
  )}
```

### OwnerBookings.tsx

```diff
+ // Auto-expand les cards qui nécessitent une action (pending/pending_payment)
+ const forceExpand = booking.status === 'pending' || booking.status === 'pending_payment';
+ 
  return (
    <OwnerBookingCard
      key={booking.id}
      booking={bookingDetails as any}
-     isExpanded={expandedBookings.has(booking.id)}
+     isExpanded={expandedBookings.has(booking.id) || forceExpand}
      // ...
    />
  );
```

---

## Notes

- Les autres occurrences de `booking.status === 'pending'` (lignes 795, 1501) sont **intentionnellement conservées** car elles concernent:
  - `PaymentCountdown` (ligne 795): Doit s'afficher uniquement pour `pending`, pas pour `pending_payment`
  - Message modal d'annulation (ligne 1501): Message différent selon le statut

- Le comportement d'expansion manuelle est conservé: l'utilisateur peut toujours replier/déplier les cards manuellement via `toggleExpanded`.

- Les logs DEV-only restent actifs uniquement en mode développement (`import.meta.env.DEV`).

---

**FIN DU LOT O2**  
**✅ Actions owner réaffichées avec fix minimal**

