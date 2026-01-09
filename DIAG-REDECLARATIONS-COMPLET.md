# Diagnostic: Redéclarations de variables dans create-checkout-session

**Date**: 2025-01-XX  
**Fichier**: `supabase/functions/create-checkout-session/index.ts`  
**Scope analysé**: Bloc `try` (lignes 200-409)

---

## 1) Diagnostic: Toutes les déclarations issues du body

### Tableau des déclarations

| Variable | Ligne(s) | Type | Scope | Rôle |
|----------|----------|------|-------|------|
| `body` | 202 | `const body = await req.json()` | Bloc `try` | Body JSON parsé |
| `bodyKeys` | 205 | `const bodyKeys = Object.keys(body \|\| {})` | Bloc `try` | Clés du body (pour logs) |
| `bookingId` | 206 | `const bookingId = body?.bookingId \|\| null` | Bloc `try` | **Log-only** (extraction pour logs) |
| `amount` | 221 | `amountValue: body?.amount ?? null` | Bloc `if (isDev)` | **Log-only** (utilisé directement, pas de déclaration) ✅ |
| `amount` | 228 | `const { amount, description, bookingId } = body \|\| {}` | Bloc `try` | **Métier** (destructuring pour validation/Stripe) |
| `description` | 228 | `const { amount, description, bookingId } = body \|\| {}` | Bloc `try` | **Métier** (destructuring pour validation/Stripe) |
| `bookingId` | 228 | `const { amount, description, bookingId } = body \|\| {}` | Bloc `try` | **Métier** (destructuring pour validation/Stripe) |

---

## 2) Collisions identifiées

### Collision #1: `bookingId`

| Déclaration | Ligne | Scope | Rôle |
|-------------|-------|-------|------|
| **Première** | 206 | Bloc `try` | Log-only: `const bookingId = body?.bookingId \|\| null` |
| **Deuxième** | 228 | Bloc `try` (même scope) | Métier: `const { amount, description, bookingId } = body \|\| {}` |

**Problème**: Redéclaration dans le même scope lexical (bloc `try`).

**Usage de la première déclaration**:
- Ligne 222: `bookingIdValue: bookingId` (dans les logs DEV-only)

**Usage de la deuxième déclaration**:
- Ligne 228+: Utilisé dans la suite du code (validation, Stripe, etc.)

---

### Collision #2: `amount` (déjà corrigée)

| Déclaration | Ligne | Scope | Rôle |
|-------------|-------|-------|------|
| **Première** | ~~207~~ | ~~Bloc `try`~~ | ~~Log-only: `const amount = body?.amount \|\| null`~~ ✅ **SUPPRIMÉE** |
| **Deuxième** | 228 | Bloc `try` | Métier: `const { amount, description, bookingId } = body \|\| {}` |

**Statut**: ✅ **Déjà corrigée** - La première déclaration a été supprimée, on utilise maintenant `body?.amount ?? null` directement dans les logs (ligne 221).

---

### Collision #3: `description` (aucune)

| Déclaration | Ligne | Scope | Rôle |
|-------------|-------|-------|------|
| **Unique** | 228 | Bloc `try` | Métier: `const { amount, description, bookingId } = body \|\| {}` |

**Statut**: ✅ **Aucune collision** - `description` n'est déclarée qu'une seule fois.

---

## 3) Résumé des collisions

| Variable | Collision | Lignes impactées | Action requise |
|----------|-----------|------------------|----------------|
| `amount` | ❌ Non (déjà corrigée) | 221 (utilise `body?.amount ?? null`) | ✅ Aucune |
| `bookingId` | ✅ **OUI** | 206 (log-only) + 228 (métier) | 🔧 Supprimer ligne 206, utiliser `body?.bookingId ?? null` dans les logs |
| `description` | ❌ Non | 228 (unique déclaration) | ✅ Aucune |

---

## 4) Plan de correction

### Correction à appliquer

**Supprimer** la ligne 206:
```typescript
const bookingId = body?.bookingId || null;
```

**Modifier** la ligne 222 pour utiliser directement `body?.bookingId ?? null`:
```typescript
// Avant:
bookingIdValue: bookingId,

// Après:
bookingIdValue: body?.bookingId ?? null,
```

**Résultat attendu**: Plus qu'une seule déclaration de `bookingId` (ligne 228, destructuring métier).

---

## 5) Vérification post-correction

Après correction, il devrait rester:
- ✅ `amount`: Une seule déclaration (ligne 228, destructuring)
- ✅ `description`: Une seule déclaration (ligne 228, destructuring)
- ✅ `bookingId`: Une seule déclaration (ligne 228, destructuring)

**Aucune redéclaration** dans le même scope.

