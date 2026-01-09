# Diagnostic: Boot Error Edge Function (NO FIX)

**Date**: 2025-01-XX  
**Mode**: DIAG uniquement (pas de modification, pas de refactor)  
**Erreur**: `Uncaught SyntaxError: Identifier 'amount' has already been declared at supabase/functions/create-checkout-session/index.ts:194`

---

## 1) Résumé en 1 phrase

**Cause racine**: Double déclaration de la variable `amount` dans le même scope (ligne 207 avec `const amount = ...` et ligne 229 avec `const { amount, ... } = ...`), provoquant une erreur de syntaxe détectée au boot de l'Edge Function.

---

## 2) Localisation exacte du problème

### Fichier: `supabase/functions/create-checkout-session/index.ts`

### Première déclaration (ligne 207)

**Contexte** (lignes 200-208):
```typescript
try {
  // Lire et parser le body JSON
  const body = await req.json();
  
  // Extraire les clés du body (sans les valeurs sensibles)
  const bodyKeys = Object.keys(body || {});
  const bookingId = body?.bookingId || null;
  const amount = body?.amount || null;  // ← PREMIÈRE DÉCLARATION
```

**Détails**:
- **Ligne**: 207
- **Type**: `const`
- **Scope**: Bloc `try` (commence ligne 200)
- **Valeur**: `body?.amount || null` (avec fallback à `null`)

---

### Deuxième déclaration (ligne 229)

**Contexte** (lignes 228-229):
```typescript
// Valider les paramètres requis
const { amount, description, bookingId } = body || {};  // ← DEUXIÈME DÉCLARATION
```

**Détails**:
- **Ligne**: 229
- **Type**: `const` (via destructuring)
- **Scope**: Bloc `try` (même scope que ligne 207)
- **Valeur**: `body.amount` (sans fallback, peut être `undefined`)

---

## 3) Tableau des déclarations

| Ligne | Type de déclaration | Scope | Rôle fonctionnel |
|-------|---------------------|-------|------------------|
| **207** | `const amount = body?.amount \|\| null;` | Bloc `try` (ligne 200) | Extraction de `amount` pour les logs diagnostiques (avec fallback `null` pour éviter les erreurs dans les logs) |
| **229** | `const { amount, description, bookingId } = body \|\| {};` | Bloc `try` (même scope) | Destructuring de `amount` pour la validation et l'utilisation dans la suite du code (sans fallback) |

---

## 4) Analyse de scope JavaScript / TypeScript

### Pourquoi c'est une redéclaration

**Règle JavaScript/TypeScript**: Dans le même scope, une variable déclarée avec `const` ou `let` ne peut pas être redéclarée.

**Analyse du scope**:
1. Les deux déclarations sont dans le **même bloc `try`** (commence ligne 200)
2. Aucun sous-bloc ne les sépare (pas de `if`, `for`, `{}` entre les deux)
3. Les deux utilisent `const`, donc aucune n'est réassignable
4. La ligne 229 tente de **redéclarer** `amount` dans le même scope

**Conclusion**: C'est une **redéclaration explicite** dans le même scope lexical, ce qui viole les règles de JavaScript/TypeScript.

---

### Pourquoi cette erreur provoque un "worker boot error"

**Erreur de syntaxe vs erreur runtime**:

1. **Erreur de syntaxe** (c'est le cas ici):
   - Détectée lors du **parsing/compilation** du code
   - Le moteur JavaScript/TypeScript ne peut **pas** créer l'environnement d'exécution
   - Le code ne peut **jamais** s'exécuter, même partiellement

2. **Erreur runtime**:
   - Détectée lors de l'**exécution** du code
   - Le code peut démarrer, mais échoue à un moment donné

**Dans le contexte Supabase Edge Functions**:

- Les Edge Functions sont **compilées/parsées** avant d'être déployées
- Si une erreur de syntaxe est détectée, le **worker ne peut pas démarrer**
- Supabase retourne un **HTTP 503** (Service Unavailable) avec `execution_id: null`
- L'erreur apparaît dans les logs comme "boot error" ou "worker boot error"

**Preuve dans le message d'erreur**:
```
Uncaught SyntaxError: Identifier 'amount' has already been declared
```

Le préfixe `Uncaught SyntaxError` indique que c'est une erreur de syntaxe détectée au parsing, pas une erreur runtime.

---

## 5) Contexte fonctionnel

### Rôle de chaque déclaration

#### Ligne 207: `const amount = body?.amount || null;`

**Rôle**:
- Extraction de `amount` pour les **logs diagnostiques** (lignes 209-225)
- Utilisé dans les logs DEV-only pour afficher `amountValue: amount` (ligne 222)
- Fallback à `null` pour éviter les erreurs si `body.amount` est `undefined`

**Usage**:
- Ligne 222: `amountValue: amount` (dans les logs)

#### Ligne 229: `const { amount, description, bookingId } = body || {};`

**Rôle**:
- Destructuring de `amount` pour la **validation** et l'utilisation dans la suite du code
- Utilisé pour valider que `amount` est un `number > 0` (ligne 231)
- Utilisé pour créer la session Stripe (ligne 354: `unit_amount: Math.round(amount * 100)`)
- Pas de fallback (peut être `undefined` si absent de `body`)

**Usage**:
- Ligne 231: Validation `if (typeof amount !== "number" || amount <= 0)`
- Ligne 233-236: Logs d'erreur avec `amount`
- Ligne 354: Calcul `Math.round(amount * 100)` pour Stripe
- Ligne 369: Log de succès avec `amount`

---

### Sont-ils conceptuellement distincts ?

**Non**. Les deux déclarations extraient la **même valeur** (`body.amount`), mais avec des objectifs différents:

1. **Ligne 207**: Pour les logs (avec fallback `null`)
2. **Ligne 229**: Pour la validation et l'utilisation (sans fallback)

**Problème**: Ces deux objectifs pourraient être satisfaits avec une **seule déclaration**, mais le code tente de les déclarer deux fois dans le même scope.

**Note**: La ligne 207 semble être un ajout récent pour les logs diagnostiques (probablement ajouté lors des améliorations de logs), alors que la ligne 229 existait déjà. Cela a créé le conflit.

---

## 6) Impact runtime

### Confirmation de l'impact

✅ **Empêche complètement l'Edge Function de démarrer**:
- L'erreur est détectée au **parsing** du code
- Le worker ne peut **pas** être initialisé
- Aucune requête ne peut être traitée

✅ **Entraîne un HTTP 503 avec `execution_id: null`**:
- Supabase retourne `503 Service Unavailable`
- Le champ `execution_id` est `null` car aucune exécution n'a pu démarrer
- L'erreur apparaît dans les logs Supabase comme "boot error" ou "worker boot error"

### Comportement observé

**Lors d'un appel à l'Edge Function**:
```bash
curl -X POST https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Test"}'
```

**Réponse attendue**:
- Status: `503 Service Unavailable`
- Body: Erreur générique de Supabase (pas de détails sur la syntaxe)
- Logs Supabase: `Uncaught SyntaxError: Identifier 'amount' has already been declared`

**Note**: Les détails de l'erreur de syntaxe ne sont généralement **pas** retournés dans la réponse HTTP (sécurité), mais apparaissent dans les logs Supabase Dashboard.

---

## 7) Conclusion

### Pourquoi le code ne peut pas booter en l'état

1. **Erreur de syntaxe JavaScript/TypeScript**:
   - Double déclaration de `const amount` dans le même scope (lignes 207 et 229)
   - Violation des règles de portée lexicale de JavaScript/TypeScript

2. **Détection au parsing**:
   - L'erreur est détectée lors du **parsing/compilation** du code
   - Le moteur JavaScript ne peut **pas** créer l'environnement d'exécution
   - Le code ne peut **jamais** s'exécuter, même partiellement

3. **Impact sur Supabase Edge Functions**:
   - Le worker ne peut **pas** démarrer
   - Toutes les requêtes retournent **HTTP 503**
   - Aucune exécution n'est possible (`execution_id: null`)

4. **Cause probable**:
   - La ligne 207 a été ajoutée récemment pour les logs diagnostiques
   - La ligne 229 existait déjà pour la validation
   - Les deux déclarations sont dans le même scope, créant le conflit

---

## 8) Références

- **Fichier**: `supabase/functions/create-checkout-session/index.ts`
- **Lignes problématiques**: 207 et 229
- **Scope**: Bloc `try` (commence ligne 200)
- **Type d'erreur**: `SyntaxError` (redéclaration de variable)

---

**Note**: Ce diagnostic est **uniquement informatif**. Aucune modification n'a été apportée au code. L'analyse identifie la cause racine sans proposer de solution.

