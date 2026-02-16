# DIAG FINAL 3.2.2 "100%" (NO IMPLEMENTATION)

**Date** : 2026-02-14  
**Mode** : DIAG ONLY — Aucune modification de fichiers.

---

## 1) Règle de validation

### Ancienne (invalide)

```bash
npx tsc --noEmit server/index.ts
```

**Problème** : mode ad-hoc, pas de tsconfig, options par défaut (target ES5, pas esModuleInterop) → erreurs environnement.

### Nouvelle (valide)

```bash
npx tsc -p tsconfig.server.json --noEmit
```

**Prérequis** : existence de `tsconfig.server.json` et corrections listées ci-dessous.

---

## 2) Import de `src/utils/serviceFees.ts` par le serveur

### Résultat : **OUI, le serveur l’importe**

| Fichier | Ligne | Import |
|---------|-------|--------|
| `server/index.ts` | 129-136 | `} = await import("../src/utils/serviceFees.js");` |

**Contexte** (L.125-146) : dans le handler webhook Stripe `checkout.session.completed`, les fonctions de calcul des fees (`calcServiceFeeRenter`, `calcServiceFeeOwner`, `calcRenterTotal`, `calcOwnerPayout`, `calcPlatformTotalFee`, `validateFeeCalculations`) sont importées dynamiquement depuis `../src/utils/serviceFees.js`.

**Chemin résolu** : `server/index.ts` → `../src/utils/serviceFees.js` = `src/utils/serviceFees.ts`.

---

## 3) Closed list des corrections minimales

### (a) Création de `tsconfig.server.json`

**Options minimales** :

- `compilerOptions` :
  - `target`: `"ES2020"` (ou `"ES2022"`)
  - `module`: `"ESNext"` ou `"NodeNext"`
  - `moduleResolution`: `"bundler"` ou `"NodeNext"`
  - `esModuleInterop`: `true`
  - `skipLibCheck`: `true`
  - `noEmit`: `true`
  - `strict`: `true` ou `false` (aligné sur le reste du projet)
  - `baseUrl`: `"."`
  - `paths`: `{ "@/*": ["./src/*"] }` (si le serveur utilise des alias `@/`)

- `include` :
  - `["server/**/*", "src/utils/serviceFees.ts"]`

- `exclude` (optionnel) : `["node_modules"]`

**Référence** : s’inspirer de `tsconfig.node.json` (target ES2022, module ESNext) et ajouter `esModuleInterop`, `include` serveur + serviceFees.

---

### (b) Stripe `apiVersion`

**Fichier** : `server/lib/stripe.ts`  
**Ligne** : 57  
**Actuel** : `apiVersion: "2024-12-18.acacia"`  
**Erreur** : TS2322 — type attendu `"2025-10-29.clover"` (cf. `node_modules/stripe/types/apiVersion.d.ts`, `node_modules/stripe/types/lib.d.ts` L.32, L.50).

**Correction minimale** : remplacer par `apiVersion: "2025-10-29.clover"` (ou utiliser `ApiVersion` depuis `stripe` si disponible).

---

### (c) Décision `serviceFees`

**Constat** : le serveur importe `src/utils/serviceFees.ts` (L.136).

**Problème** : `src/utils/serviceFees.ts` L.76 utilise `import.meta.env.DEV` (API Vite). En mode Node (tsc/tsx), `import.meta.env` n’est pas défini → TS1343, TS2339.

**Options** :

| Option | Description | Impact |
|--------|-------------|--------|
| A | Remplacer `import.meta.env.DEV` par `process.env.NODE_ENV !== "production"` dans `validateFeeCalculations` | Comportement équivalent en dev ; `validateFeeCalculations` n’est appelé que par le serveur (webhook). |
| B | Exclure `serviceFees.ts` du tsconfig serveur | Impossible : l’import dynamique dans `server/index.ts` fait que tsc doit le typechecker. |
| C | Créer un `serviceFees.server.ts` sans `import.meta` | Duplication de logique, non minimal. |

**Recommandation** : Option A — remplacer L.76 `import.meta.env.DEV` par `process.env.NODE_ENV !== "production"`. Pas de changement pour le front (Vite remplace `process.env`), serveur compatible.

---

## 4) Output final

### Commande de validation

```bash
npx tsc -p tsconfig.server.json --noEmit
```

### Résultat attendu

```
# (aucune sortie)
```

**Exit code** : `0`

### Conditions pour y arriver

1. `tsconfig.server.json` existe avec les options ci-dessus.
2. `server/lib/stripe.ts` L.57 : `apiVersion: "2025-10-29.clover"`.
3. `src/utils/serviceFees.ts` L.76 : `import.meta.env.DEV` remplacé par `process.env.NODE_ENV !== "production"`.

### GO / NO GO

| Critère | Statut |
|---------|--------|
| Règle de validation définie | ✅ `tsc -p tsconfig.server.json --noEmit` |
| Import `serviceFees` par le serveur identifié | ✅ `server/index.ts` L.136 |
| Liste fermée des corrections | ✅ (a) tsconfig, (b) Stripe, (c) serviceFees |
| Pas de modification de fichiers (DIAG) | ✅ Aucun fichier modifié |

**Verdict** : **NO GO** — les 3 corrections minimales ci-dessus doivent être appliquées pour obtenir `exit 0` sur `npx tsc -p tsconfig.server.json --noEmit`. Dès qu’elles sont faites, le diagnostic considère la Phase 3.2.2 "100%" comme validée côté TypeScript serveur.
