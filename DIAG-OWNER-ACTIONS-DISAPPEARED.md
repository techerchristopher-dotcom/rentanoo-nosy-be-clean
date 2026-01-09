# DIAG UI — Actions propriétaire disparues (Accepter / Refuser / Annuler)

**Date**: 2025-01-XX  
**Contexte**: Les actions propriétaire (Accepter/Refuser) ne s'affichent plus sur la carte de réservation en vue propriétaire.

---

## A) Identification du composant et de l'arbre de rendu

### 1. Composant principal
**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Lignes**: 91-1509

### 2. Page parent
**Fichier**: `src/pages/owner/OwnerBookings.tsx`  
**Route**: `/me/owner/bookings` (probablement)  
**Lignes**: 63-740

### 3. Arbre de rendu minimal
```
OwnerBookings (page)
  └─> filteredBookings.map()
      └─> OwnerBookingCard (ligne 712)
          └─> Collapsible (ligne 679)
              ├─> CollapsibleTrigger (header, ligne 690)
              └─> CollapsibleContent (détails, ligne 884)
                  └─> Actions (ligne 997-1123)
                      └─> Accepter/Refuser (ligne 999-1029) ⚠️
```

**Point critique**: Les actions sont dans `CollapsibleContent`, donc **visibles uniquement si la carte est dépliée** (`isExpanded === true`).

---

## B) Preuves d'existence passée des actions

### 1. Code actuel (actions existent toujours)

**Fichier**: `src/components/OwnerBookingCard.tsx`

```999:1029:src/components/OwnerBookingCard.tsx
                  {booking.status === 'pending' && (
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

### 2. Handlers associés

**Fichier**: `src/components/OwnerBookingCard.tsx`

- `handleAccept()` (ligne 238-362): Met le statut à `pending_payment`
- `handleReject()` (ligne 364-366): Ouvre la modal de refus
- `handleConfirmReject()` (ligne 373-440): Confirme le refus avec motif

### 3. Autres occurrences dans le repo

Les actions existent aussi dans:
- `src/pages/owner/OwnerBookingRequests.tsx` (ligne 355-365) — mais pour les conversations, pas les bookings
- `src/pages/owner/OwnerBookingDiscussion.tsx` (ligne 506-519) — dans la page de discussion

**Conclusion**: Les actions n'ont **PAS été supprimées**. Elles existent toujours dans le code.

---

## C) Conditions d'affichage actuelles

### 1. Emplacement du bloc JSX

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Ligne**: 997-1123 (dans `CollapsibleContent`)

### 2. Conditions d'affichage

#### Condition principale (ligne 999)
```typescript
{booking.status === 'pending' && (
  // Boutons Accepter/Refuser
)}
```

**Condition stricte**: `booking.status === 'pending'` (exactement, pas `pending_payment` ni autre)

#### Condition de visibilité (ligne 884)
```typescript
<CollapsibleContent>
  {/* Actions ici */}
</CollapsibleContent>
```

**Condition implicite**: La carte doit être **dépliée** (`isExpanded === true`)

### 3. Autres conditions dans le même bloc

- **Bouton "Annuler"** (ligne 1097-1109): **TOUJOURS AFFICHÉ** (pas de condition de statut)
- **Bouton "État des lieux"** (ligne 1032-1048): `booking.status === 'confirmed' && !hasCheckin`
- **Bouton "État des lieux retour"** (ligne 1051-1094): `checkinDepart?.status === 'completed'`

### 4. Analyse pour le cas de la capture (owner + pending)

D'après l'image fournie:
- ✅ Statut affiché: "En attente" (orange) → correspond à `pending`
- ❓ Carte dépliée: **NON visible** (on ne voit que le header)
- ❓ `booking.status`: Probablement `'pending'` mais à vérifier

**Hypothèses**:
1. **Hypothèse 1 (la plus probable)**: La carte est **repliée** (`isExpanded === false`), donc les actions ne sont pas visibles car elles sont dans `CollapsibleContent`.
2. **Hypothèse 2**: Le statut n'est pas exactement `'pending'` (peut-être `'pending_payment'` ou autre valeur).
3. **Hypothèse 3**: Un problème de données (`booking.status` est `undefined` ou `null`).

---

## D) Vérification des données

### 1. Shape de `booking` attendue

**Type**: `BookingWithDetails` (ligne 62-79 de `OwnerBookingCard.tsx`)

```typescript
type BookingWithDetails = Booking & {
  vehicle?: Vehicle
  primaryPhoto?: Photo
  renter?: User
  conversation?: { id: string }
  pickupLocation?: string
  selectedOptions?: any[]
  pricePerDay?: number
  rentalDays?: number
  subtotal?: number
  serviceFee?: number
  totalPrice?: number
  depositStatus?: 'pending' | 'paid' | 'refunded' | null
  checkinDepart?: CheckinDepartSummary
  checkinReturn?: CheckinReturnSummary
}
```

### 2. Mapping depuis Supabase

**Fichier**: `src/pages/owner/OwnerBookings.tsx` (ligne 189-216)

```typescript
status: (booking.status as any) || 'pending',  // ⚠️ Fallback à 'pending' si undefined
```

**Point critique**: Le mapping utilise `booking.status` depuis Supabase. Si le champ est `null` ou `undefined`, il y a un fallback à `'pending'`.

### 3. Filtre "pending" dans la page

**Fichier**: `src/pages/owner/OwnerBookings.tsx` (ligne 655-659)

```typescript
case 'pending':
  return (booking.status === 'confirmed' && booking.depositStatus === 'pending') ||
         booking.status === 'pending' || 
         booking.status === 'pending_payment';
```

**Incohérence**: Le filtre inclut `pending_payment`, mais le composant `OwnerBookingCard` ne vérifie QUE `pending`.

### 4. Vérification du rôle owner

**Fichier**: `src/pages/owner/OwnerBookings.tsx` (ligne 116-124)

```typescript
if (!user.roles.includes('owner')) {
  // Redirection
}
```

**Conclusion**: Le rôle est vérifié au niveau de la page, pas au niveau de la carte.

---

## E) Logs runtime DEV-only (à ajouter)

### Emplacement recommandé

**Fichier**: `src/components/OwnerBookingCard.tsx`  
**Ligne**: Après la ligne 99 (début du composant) ou dans un `useEffect`

### Code à ajouter

```typescript
// DEV-only: Diagnostic des actions propriétaire
useEffect(() => {
  if (import.meta.env.DEV) {
    const isOwner = currentUser?.id === booking.vehicle?.ownerId || 
                    currentUser?.id === (booking as any).ownerId;
    const canAccept = booking.status === 'pending';
    const canDecline = booking.status === 'pending';
    const canCancel = true; // Toujours possible
    
    console.info('[owner-actions-diag]', {
      bookingId: booking.id,
      bookingStatus: booking.status,
      isExpanded,
      currentUser: {
        id: currentUser?.id,
        roles: currentUser?.roles,
      },
      booking: {
        ownerId: (booking as any).ownerId,
        renterId: booking.renterId,
        vehicleOwnerId: booking.vehicle?.ownerId,
      },
      computed: {
        isOwner,
        canAccept,
        canDecline,
        canCancel,
      },
      decision: {
        actionsVisible: isExpanded && canAccept,
        reasonHidden: !isExpanded 
          ? 'Carte repliée (isExpanded=false)' 
          : !canAccept 
            ? `Status !== 'pending' (actuel: ${booking.status})`
            : 'Actions devraient être visibles',
      },
    });
  }
}, [booking.id, booking.status, isExpanded, currentUser]);
```

### Points à vérifier dans les logs

1. `booking.status` === `'pending'` ?
2. `isExpanded` === `true` ?
3. `currentUser.id` correspond à `booking.vehicle.ownerId` ?
4. `booking.vehicle` existe ?

---

## F) Conclusion et plan minimal

### 1. Cause racine (hypothèses par ordre de probabilité)

#### 🎯 **Hypothèse 1 (très probable)**: Carte repliée
- **Fichier**: `src/components/OwnerBookingCard.tsx:884`
- **Cause**: Les actions sont dans `CollapsibleContent`, donc invisibles si `isExpanded === false`
- **Preuve**: L'image montre uniquement le header de la carte, pas le contenu déplié

#### 🎯 **Hypothèse 2 (probable)**: Statut différent de `'pending'`
- **Fichier**: `src/components/OwnerBookingCard.tsx:999`
- **Cause**: Condition stricte `booking.status === 'pending'` ne matche pas si le statut est `'pending_payment'` ou autre
- **Preuve**: Le filtre de la page inclut `pending_payment` (ligne 659), mais le composant ne vérifie que `pending`

#### 🎯 **Hypothèse 3 (moins probable)**: Données manquantes
- **Fichier**: `src/pages/owner/OwnerBookings.tsx:197`
- **Cause**: `booking.status` pourrait être `undefined` ou `null` malgré le fallback
- **Preuve**: Le fallback existe mais pourrait ne pas fonctionner dans certains cas

### 2. Table des actions attendues par statut + rôle

| Statut | Rôle | Accepter | Refuser | Annuler | État des lieux |
|--------|------|----------|---------|---------|----------------|
| `pending` | owner | ✅ | ✅ | ✅ | ❌ |
| `pending_payment` | owner | ❌ | ❌ | ✅ | ❌ |
| `confirmed` | owner | ❌ | ❌ | ✅ | ✅ (si pas de checkin) |
| `active` | owner | ❌ | ❌ | ✅ | ❌ |
| `completed` | owner | ❌ | ❌ | ✅ | ❌ |
| `cancelled` | owner | ❌ | ❌ | ✅ | ❌ |
| `declined` | owner | ❌ | ❌ | ✅ | ❌ |

**Note**: Toutes les actions sont dans `CollapsibleContent`, donc nécessitent `isExpanded === true`.

### 3. Plan minimal pour rétablir

#### Option A: Corriger la condition de statut (si hypothèse 2)

**Fichier**: `src/components/OwnerBookingCard.tsx:999`

**Changement**:
```typescript
// AVANT
{booking.status === 'pending' && (

// APRÈS
{(booking.status === 'pending' || booking.status === 'pending_payment') && (
```

**Justification**: Aligner avec le filtre de la page qui inclut `pending_payment`.

#### Option B: Déplacer les actions dans le header (si hypothèse 1)

**Fichier**: `src/components/OwnerBookingCard.tsx`

**Changement**: Déplacer le bloc actions (ligne 997-1123) dans `CollapsibleTrigger` (après la ligne 878), mais avec une condition pour n'afficher que les actions critiques (Accepter/Refuser) dans le header.

**Justification**: Les actions critiques doivent être visibles même si la carte est repliée.

#### Option C: Forcer l'expansion pour les bookings pending (si hypothèse 1)

**Fichier**: `src/pages/owner/OwnerBookings.tsx:715`

**Changement**:
```typescript
<OwnerBookingCard
  key={booking.id}
  booking={bookingDetails as any}
  isExpanded={expandedBookings.has(booking.id) || booking.status === 'pending'} // ⚠️ Auto-expand si pending
  toggleExpanded={toggleExpanded}
  // ...
/>
```

**Justification**: Les bookings `pending` nécessitent une action immédiate, donc doivent être visibles par défaut.

#### Option D: Ajouter les logs et diagnostiquer (recommandé en premier)

**Fichier**: `src/components/OwnerBookingCard.tsx`

**Changement**: Ajouter le code de logs DEV-only (section E) pour identifier la cause exacte.

**Justification**: Avant de corriger, il faut confirmer la cause.

---

## G) Checklist de diagnostic

- [ ] Ajouter les logs DEV-only (section E)
- [ ] Vérifier dans la console:
  - [ ] `booking.status` vaut exactement `'pending'` ?
  - [ ] `isExpanded` vaut `true` ?
  - [ ] `currentUser.id` correspond à `booking.vehicle.ownerId` ?
  - [ ] `booking.vehicle` existe ?
- [ ] Tester avec une carte dépliée manuellement
- [ ] Vérifier si le statut est `'pending_payment'` au lieu de `'pending'`
- [ ] Vérifier les données brutes depuis Supabase

---

## H) Fichiers concernés

1. `src/components/OwnerBookingCard.tsx` (ligne 999-1029, 884)
2. `src/pages/owner/OwnerBookings.tsx` (ligne 655-659, 712-727)

---

## I) Notes supplémentaires

- Le bouton "Annuler" est **toujours visible** (ligne 1097), donc le problème n'est pas lié à un problème de rendu général.
- Les actions existent dans d'autres pages (`OwnerBookingRequests`, `OwnerBookingDiscussion`), donc le problème est spécifique à `OwnerBookingCard`.
- Le composant utilise `Collapsible` de shadcn/ui, donc le comportement d'expansion/repli est géré par ce composant.

---

**FIN DU DIAGNOSTIC**  
**⚠️ STOP — Pas de correction à ce stade**

