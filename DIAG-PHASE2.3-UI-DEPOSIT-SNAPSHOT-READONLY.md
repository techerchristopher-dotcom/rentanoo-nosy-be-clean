# DIAG Phase 2.3 — Affichage caution snapshot read-only (DIAG ONLY)

**Date** : 2026-02-14  
**Objectif** : Afficher la caution snapshot en lecture seule sur OwnerBookingCard et RenterBookingCard.  
**Aucun code, aucun patch** : preuves uniquement.

---

## 1) Construction des objets booking

### 1.1 OwnerBookings.tsx → OwnerBookingCard

| Étape | Fichier | Lignes | Constat |
|-------|---------|--------|---------|
| Source | `SupabaseBookingsService.getOwnerBookings` | - | Retourne rows Supabase |
| Mapping brut | OwnerBookings.tsx | L.156-217 | `bookingsResult.data.map(booking => {...})` |
| Champs deposit | L.214 | `depositStatus: (booking as any).deposit_status \|\| null` | ✅ Mappé |
| Snapshot | - | - | ❌ `deposit_amount_snapshot` **non mappé** |
| Enrichissement | L.220-271 | `enrichedBookings` = ownerBookings + renter, vehicle, primaryPhoto | Les props finales passées à OwnerBookingCard |

Le select Supabase (getOwnerBookings) utilise :
```
.select(`*, checkin_depart:..., checkin_return:...`)
```
→ **`*`** donc toutes les colonnes (incluant `deposit_amount_snapshot`, `deposit_status` après migration).

### 1.2 RenterBookings.tsx → RenterBookingCard

| Étape | Fichier | Lignes | Constat |
|-------|---------|--------|---------|
| Source | `SupabaseBookingsService.getRenterBookings` | - | Retourne rows Supabase |
| Mapping | RenterBookings.tsx | L.353-514, L.488-490, L.534-536 | `result.data.map(async (booking) => {...})` |
| Champs deposit | L.488-490 | `depositStatus: (booking as any).deposit_status \|\| null`, `depositAmount: (booking as any).deposit_amount \|\| null` | ⚠️ `deposit_amount` **n'existe pas** dans bookings : la colonne correcte est `deposit_amount_snapshot` |

Le select Supabase (getRenterBookings) utilise :
```
.select(`*, checkin_depart:...`)
```
→ **`*`** donc toutes les colonnes.

**Conclusion** : 
- OwnerBookings : ajouter le mapping de `deposit_amount_snapshot` (actuellement absent).
- RenterBookings : remplacer `deposit_amount` par `deposit_amount_snapshot` (la colonne `deposit_amount` n'existe pas dans `bookings`).

---

## 2) Emplacement d’insertion du bloc "Caution (empreinte) : X€"

### 2.1 OwnerBookingCard

| Élément | Lignes | Description |
|---------|--------|-------------|
| Bloc Total | L.1005-1015 | Ligne "Total" avec montant TTC |
| Tooltip détail prix | L.1017-1063 | Détail : Sous-total, Frais, Total locataire, Commission, Revenu |
| Fin du bloc tarifaire | L.1065 | `</div>` qui ferme le flex contenant Durée + Total |
| Services supplémentaires | L.1068 | `{/* Services supplémentaires sélectionnés */}` |

**Emplacement recommandé** : Nouveau bloc entre L.1065 et L.1068 (après le `</div>` du Total, avant "Services supplémentaires"). Une ligne type :
```
Caution (empreinte) : X€   OU   Caution : aucune   OU   (masqué si null)
```

### 2.2 RenterBookingCard

| Élément | Lignes | Description |
|---------|--------|-------------|
| Tooltip détail prix | L.1124-1156 | Contient Location, Options, Sous-total, Frais, TOTAL |
| Ligne TOTAL | L.1146-1150 | `<span>TOTAL</span>` + montant |
| Fin du contenu tooltip | L.1151 | `</>` |
| Services supplémentaires | L.1165 | Section suivante |

**Emplacement recommandé** : À l’intérieur du Tooltip, après la ligne TOTAL (entre L.1150 et L.1151), nouvelle ligne du même style que les autres lignes du détail. Ou : bloc séparé après le bloc principal Total (équivalent OwnerBookingCard), avant "Services supplémentaires" (L.1165).

---

## 3) Gestion des cas

| Cas | Condition | Affichage recommandé |
|-----|-----------|----------------------|
| **Anciens bookings** | `deposit_status === null` ou `deposit_amount_snapshot === null` | **Masquer** — ne pas afficher de ligne caution. Éviter "—" qui peut prêter à confusion. |
| **Pas de caution** | `deposit_status === 'not_required'` OU `deposit_amount_snapshot === 0` | Afficher : "Caution : aucune" |
| **Caution prévue** | `deposit_status === 'pending'` ET `deposit_amount_snapshot > 0` | Afficher : "Caution (empreinte) : X€" avec X = snapshot formaté |

**Ordre des tests** : d’abord tester `deposit_status` (ou snapshot) pour null → masquer ; sinon tester snapshot > 0 → montant, sinon "aucune".

---

## 4) Risques

### 4.1 Types TypeScript

| Fichier | Interface | Constat |
|---------|-----------|---------|
| OwnerBookings.tsx | `BookingWithDetails` L.33-52 | Contient `depositStatus` mais **pas** `depositAmountSnapshot` / `depositAmount` |
| OwnerBookingCard.tsx | `BookingWithDetails` L.62-79 | `depositStatus?: 'pending' \| 'paid' \| 'refunded' \| null` — valeurs 'not_required' non typées (Phase 2) |
| RenterBookingCard.tsx | `BookingWithDetails` L.63-69 | `depositStatus`, `depositAmount` déjà présents |

**Risque** : `'not_required'` n’est pas dans le type `depositStatus` (actuellement `'pending' | 'paid' | 'refunded'`).  

**Solution** : étendre le type pour inclure `'not_required'`, ou utiliser `(booking as any).depositAmountSnapshot` pour l’affichage uniquement, sans modifier les interfaces globales (typing local minimal).

### 4.2 `deposit_amount` vs `deposit_amount_snapshot`

| Contexte | Colonne utilisée | Problème |
|----------|------------------|----------|
| RenterBookings L.490, L.536 | `(booking as any).deposit_amount` | La colonne `deposit_amount` n’existe **pas** dans `bookings`. La bonne colonne est `deposit_amount_snapshot`. |
| Phase 2.2 (snapshot à l’acceptation) | `deposit_amount_snapshot` | Correct — c’est la colonne écrite. |

**Action requise** : Remplacer `deposit_amount` par `deposit_amount_snapshot` dans le mapping RenterBookings. La source pour l’affichage doit être le snapshot, pas un champ vehicles.

---

## 5) Checklist validation UI

- [ ] **Booking avec snapshot 1500** : affichage "Caution (empreinte) : 1500€" (ou format local).
- [ ] **Booking avec snapshot 0** (ou `not_required`) : affichage "Caution : aucune".
- [ ] **Booking ancien (null)** : pas de ligne caution, pas d’erreur, pas de "undefined" ou "NaN".
- [ ] **OwnerBookingCard** : le bloc caution est lisible, cohérent visuellement avec le reste du bloc tarifaire.
- [ ] **RenterBookingCard** : idem.

---

FIN.
