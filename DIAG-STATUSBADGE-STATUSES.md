# DIAGNOSTIC — StatusBadge / Booking Status Labels

**Date** : 2025-01-27  
**Scope** : StatusBadge uniquement + sources de statuts  
**Objectif** : Inventorier tous les statuts possibles, leur mapping UI/i18n, et diagnostiquer les clés brutes

---

## A) INVENTAIRE DES STATUTS (Source de vérité)

### 1) Sources des statuts

#### Backend (Base de données Supabase)

**Fichier** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (ligne 221)  
**Contrainte CHECK** :
```sql
CONSTRAINT bookings_status_check CHECK (
  (status)::text = ANY (
    ARRAY[
      'pending'::character varying,
      'pending_payment'::character varying,
      'confirmed'::character varying,
      'active'::character varying,
      'completed'::character varying,
      'cancelled'::character varying,
      'rejected'::character varying,
      'declined'::character varying
    ]::text[]
  )
)
```

**Valeurs backend possibles** (8 statuts) :
1. `pending`
2. `pending_payment`
3. `confirmed`
4. `active`
5. `completed`
6. `cancelled`
7. `rejected`
8. `declined`

**Preuve** : `DIAGNOSTIC-SCHEMA-COMPLET-RENTANOO.md` (ligne 68)

---

#### Frontend TypeScript (Types)

**Fichier** : `src/types/index.ts` (lignes 5-12)  
**Type** :
```typescript
export type BookingStatus = 
  | "pending" 
  | "accepted" 
  | "declined" 
  | "cancelled" 
  | "active" 
  | "closed"
  | "pending_payment";
```

**Valeurs TypeScript possibles** (7 statuts) :
1. `pending`
2. `accepted` ⚠️ **N'existe pas dans le backend**
3. `declined`
4. `cancelled`
5. `active`
6. `closed` ⚠️ **N'existe pas dans le backend**
7. `pending_payment`

**Problème identifié** :
- ❌ `accepted` dans TypeScript mais pas dans backend (backend utilise `confirmed`)
- ❌ `closed` dans TypeScript mais pas dans backend (backend utilise `completed`)
- ❌ `confirmed` dans backend mais pas dans TypeScript
- ❌ `rejected` dans backend mais pas dans TypeScript

---

#### Service Supabase (Utilisation réelle)

**Fichier** : `src/services/supabase/bookings.ts` (ligne 139)  
**Signature** :
```typescript
static async updateBookingStatusWithReason(
  bookingId: string,
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'active' | 'closed' | 'declined' | 'confirmed' | 'pending_payment',
  reason?: string
)
```

**Valeurs utilisées dans le service** (10 statuts) :
1. `pending`
2. `accepted`
3. `rejected`
4. `cancelled`
5. `completed`
6. `active`
7. `closed`
8. `declined`
9. `confirmed`
10. `pending_payment`

**Preuve** : Union de tous les statuts utilisés dans le codebase

---

### 2) Liste exhaustive des statuts réellement possibles

**Statuts uniques identifiés** (10 statuts) :

| Status Value | Backend | TypeScript | Service | Casse |
|--------------|---------|------------|---------|-------|
| `pending` | ✅ | ✅ | ✅ | snake_case |
| `pending_payment` | ✅ | ✅ | ✅ | snake_case |
| `confirmed` | ✅ | ❌ | ✅ | snake_case |
| `active` | ✅ | ✅ | ✅ | snake_case |
| `completed` | ✅ | ❌ | ✅ | snake_case |
| `cancelled` | ✅ | ✅ | ✅ | snake_case |
| `rejected` | ✅ | ❌ | ✅ | snake_case |
| `declined` | ✅ | ✅ | ✅ | snake_case |
| `accepted` | ❌ | ✅ | ✅ | snake_case |
| `closed` | ❌ | ✅ | ✅ | snake_case |

**Conclusion** : Il y a un **désalignement** entre :
- Backend : 8 statuts (`pending`, `pending_payment`, `confirmed`, `active`, `completed`, `cancelled`, `rejected`, `declined`)
- TypeScript : 7 statuts (`pending`, `accepted`, `declined`, `cancelled`, `active`, `closed`, `pending_payment`)
- Service : 10 statuts (union de tous)

---

## B) MAPPING UI ACTUEL (StatusBadge)

**Fichier** : `src/components/ui/status-badge.tsx`

### Tableau de mapping actuel

| Status | Label actuel | Type | Couleur | Icône | Fallback | Preuve |
|--------|--------------|------|---------|-------|----------|--------|
| `pending` | `t('bookings.status.pending')` | **i18n** | `bg-[#fef2e1] text-[#d97706]` | Clock | `{status}` | ligne 53 |
| `pending_payment` | `"En attente de paiement"` | **hardcoded** | `bg-blue-50 text-blue-700` | Clock | `{status}` | ligne 58 |
| `accepted` | `"Acceptée"` | **hardcoded** | `bg-success text-success-foreground` | - | `{status}` | ligne 63 |
| `declined` | `"Refusée"` | **hardcoded** | `bg-destructive text-destructive-foreground` | - | `{status}` | ligne 67 |
| `cancelled` | `"Annulée"` | **hardcoded** | `bg-muted text-muted-foreground` | - | `{status}` | ligne 71 |
| `active` | `"En cours"` | **hardcoded** | `bg-primary text-primary-foreground` | - | `{status}` | ligne 75 |
| `closed` | `"Terminée"` | **hardcoded** | `bg-muted text-muted-foreground` | - | `{status}` | ligne 79 |
| `confirmed` | ❌ **MISSING** | - | - | - | `{status}` | - |
| `completed` | ❌ **MISSING** | - | - | - | `{status}` | - |
| `rejected` | ❌ **MISSING** | - | - | - | `{status}` | - |

**Fallback** : Si `status` n'est pas dans `statusConfig`, le composant affiche `{status}` (la valeur brute) — ligne 119

---

## C) MAPPING i18n ACTUEL (Clés existantes)

### Clés i18n dans `bookings.status.*`

**Fichiers** : `src/i18n/locales/{fr,en,de,it}/common.json`

#### Tableau des clés existantes

| Clé i18n | FR | EN | DE | IT | Status candidat |
|----------|----|----|----|----|-----------------|
| `bookings.status.paymentConfirmed` | "Paiement confirmé" | "Payment confirmed" | "Zahlung bestätigt" | "Pagamento confermato" | `confirmed` |
| `bookings.status.depositPending` | "En attente de la caution" | "Deposit pending" | "Kaution ausstehend" | "Deposito in attesa" | `pending` (avec deposit) |
| `bookings.status.readyToGo` | "Prêt à partir" | "Ready to go" | "Bereit zum Start" | "Pronto a partire" | `confirmed` (avec deposit paid) |
| `bookings.status.paymentDepositValidated` | "Paiement et caution validés" | "Payment and deposit validated" | "Zahlung und Kaution bestätigt" | "Pagamento e deposito convalidati" | `confirmed` (avec deposit paid) |
| `bookings.status.active` | "En cours" | "Ongoing" | "Laufend" | "In corso" | `active` |
| `bookings.status.completed` | "Terminé" | "Completed" | "Abgeschlossen" | "Completato" | `completed` |
| `bookings.status.cancelled` | "Annulée" | "Cancelled" | "Storniert" | "Annullata" | `cancelled` |

#### Clés manquantes

| Status | Clé candidate | État |
|--------|---------------|------|
| `pending` | `bookings.status.pending` | ❌ **MISSING_KEY** |
| `pending_payment` | `bookings.status.pending_payment` | ❌ **MISSING_KEY** |
| `accepted` | `bookings.status.accepted` | ❌ **MISSING_KEY** |
| `declined` | `bookings.status.declined` | ❌ **MISSING_KEY** |
| `closed` | `bookings.status.closed` | ❌ **MISSING_KEY** |
| `rejected` | `bookings.status.rejected` | ❌ **MISSING_KEY** |
| `confirmed` | `bookings.status.confirmed` | ❌ **MISSING_KEY** (mais `paymentConfirmed` existe) |

---

## D) DIAGNOSTIC DU PROBLÈME "clé brute"

### Problème identifié : `bookings.status.pending` s'affiche brut

**Cause racine** :

1. **Clé inexistante** : `bookings.status.pending` n'existe pas dans les fichiers JSON
   - Preuve : `grep "pending" src/i18n/locales/en/common.json` → Seulement `bookings.filters.pending` et `bookings.status.depositPending`
   - StatusBadge utilise `t('bookings.status.pending')` (ligne 53) mais cette clé n'existe pas

2. **Namespace correct** : `useTranslation()` utilise `defaultNS = "translation"` ✅
   - Preuve : `src/i18n/config.ts` → `defaultNS: "translation"`

3. **Mapping incorrect** : StatusBadge utilise `t('bookings.status.pending')` pour le statut `pending`
   - Mais la clé `bookings.status.pending` n'existe pas
   - Résultat : `t('bookings.status.pending')` retourne la clé brute `"bookings.status.pending"`

### Log DEV ajouté

**Fichier** : `src/components/ui/status-badge.tsx` (lignes 137-160)

**Log** : `[statusbadge-i18n-diag]`

**Contenu** :
- `status_received` : Le statut reçu en prop
- `status_type` : Type du statut
- `i18n_language` : Langue active
- `i18n_resolvedLanguage` : Langue résolue
- `defaultNS` : Namespace par défaut
- `candidate_key` : Clé i18n candidate pour ce statut
- `key_exists` : Si la clé existe dans le store
- `t_result` : Résultat de `t(candidateKey)`
- `t_en` / `t_fr` : Résultats avec langue forcée
- `isRawKey` : Si le résultat est la clé brute
- `hasConfig` : Si le statut a une config dans `statusConfig`
- `label_used` : Le label utilisé (string ou function)
- `label_is_i18n` : Si le label utilise i18n

---

## E) TABLEAU RÉCAPITULATIF STATUS → LABEL → CLÉ i18n → ÉTAT

| Status | Label actuel (StatusBadge) | Clé i18n actuelle/candidate | État | Problème |
|--------|----------------------------|----------------------------|------|----------|
| `pending` | `t('bookings.status.pending')` | `bookings.status.pending` | ❌ **MISSING_KEY** | Clé n'existe pas → affiche clé brute |
| `pending_payment` | `"En attente de paiement"` | `bookings.status.pending_payment` | ❌ **HARDCODED + MISSING_KEY** | Hardcodé FR + clé n'existe pas |
| `accepted` | `"Acceptée"` | `bookings.status.accepted` | ❌ **HARDCODED + MISSING_KEY** | Hardcodé FR + clé n'existe pas |
| `declined` | `"Refusée"` | `bookings.status.declined` | ❌ **HARDCODED + MISSING_KEY** | Hardcodé FR + clé n'existe pas |
| `cancelled` | `"Annulée"` | `bookings.status.cancelled` | ✅ **OK** | Clé existe, mais label hardcodé |
| `active` | `"En cours"` | `bookings.status.active` | ✅ **OK** | Clé existe, mais label hardcodé |
| `completed` | ❌ **MISSING** | `bookings.status.completed` | ✅ **OK** | Clé existe, mais pas de config |
| `closed` | `"Terminée"` | `bookings.status.closed` | ❌ **HARDCODED + MISSING_KEY** | Hardcodé FR + clé n'existe pas |
| `confirmed` | ❌ **MISSING** | `bookings.status.confirmed` ou `bookings.status.paymentConfirmed` | ⚠️ **WRONG_KEY** | Clé `paymentConfirmed` existe mais mapping incorrect |
| `rejected` | ❌ **MISSING** | `bookings.status.rejected` | ❌ **MISSING_KEY** | Pas de config + clé n'existe pas |

---

## F) RECOMMANDATIONS DE FIX MINIMAL (SANS IMPLÉMENTER)

### Fix 1 : Aligner TypeScript avec Backend

**Problème** : Désalignement entre `BookingStatus` type et backend

**Action** :
- Ajouter `confirmed`, `completed`, `rejected` au type `BookingStatus`
- Retirer `accepted` et `closed` du type (ou mapper `accepted` → `confirmed`, `closed` → `completed`)

**Fichier** : `src/types/index.ts`

---

### Fix 2 : Ajouter les clés i18n manquantes

**Clés à ajouter** dans `src/i18n/locales/{fr,en,de,it}/common.json` :

```json
"bookings": {
  "status": {
    "pending": "En attente" / "Pending" / "Ausstehend" / "In attesa",
    "pending_payment": "En attente de paiement" / "Pending payment" / "Zahlung ausstehend" / "Pagamento in attesa",
    "accepted": "Acceptée" / "Accepted" / "Akzeptiert" / "Accettata",
    "declined": "Refusée" / "Declined" / "Abgelehnt" / "Rifiutata",
    "closed": "Terminée" / "Closed" / "Geschlossen" / "Chiusa",
    "rejected": "Rejetée" / "Rejected" / "Abgelehnt" / "Rifiutata",
    "confirmed": "Confirmée" / "Confirmed" / "Bestätigt" / "Confermata"
  }
}
```

---

### Fix 3 : Remplacer les labels hardcodés par i18n dans StatusBadge

**Fichier** : `src/components/ui/status-badge.tsx`

**Actions** :
- `pending_payment` : `t('bookings.status.pending_payment')` au lieu de `"En attente de paiement"`
- `accepted` : `t('bookings.status.accepted')` au lieu de `"Acceptée"`
- `declined` : `t('bookings.status.declined')` au lieu de `"Refusée"`
- `cancelled` : `t('bookings.status.cancelled')` au lieu de `"Annulée"`
- `active` : `t('bookings.status.active')` au lieu de `"En cours"`
- `closed` : `t('bookings.status.closed')` au lieu de `"Terminée"`

**Ajouter les configs manquantes** :
- `confirmed` : `{ color: "...", label: t('bookings.status.confirmed') }`
- `completed` : `{ color: "...", label: t('bookings.status.completed') }`
- `rejected` : `{ color: "...", label: t('bookings.status.rejected') }`

---

### Fix 4 : Normaliser les statuts backend/frontend

**Option A** : Mapper `accepted` → `confirmed` et `closed` → `completed` dans le code
**Option B** : Ajouter `accepted` et `closed` au backend (si nécessaire métier)
**Option C** : Retirer `accepted` et `closed` du frontend et utiliser `confirmed` et `completed`

**Recommandation** : Option C (utiliser les statuts backend comme source de vérité)

---

## G) RÉSUMÉ DES PROBLÈMES

| Problème | Impact | Priorité |
|----------|--------|----------|
| `bookings.status.pending` n'existe pas | Affiche clé brute | 🔴 **HAUTE** |
| Labels hardcodés FR dans StatusBadge | Non traduits | 🟡 **MOYENNE** |
| Statuts manquants dans StatusBadge (`confirmed`, `completed`, `rejected`) | Affichent valeur brute | 🔴 **HAUTE** |
| Désalignement TypeScript/Backend | Erreurs potentielles | 🟡 **MOYENNE** |
| Clés i18n manquantes | Fallback sur clés brutes | 🟡 **MOYENNE** |

---

**STATUS** : Diagnostic complet — Log DEV ajouté — En attente d'exécution pour preuves runtime

