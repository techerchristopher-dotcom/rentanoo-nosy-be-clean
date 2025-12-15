# 🚀 Quick Start - Accélérateur i18n

## Installation ✅

Les dépendances sont déjà installées.

## Commandes principales

### 1. Extraction des clés de traduction
```bash
npm run i18n:extract
```
Extrait toutes les clés `t()` et met à jour les fichiers JSON dans `src/i18n/locales/`.

### 2. Transformation automatique (codemod)

**Mode test (dry-run)** :
```bash
npm run i18n:codemod:dry-run src/pages/Index.tsx
```

**Mode réel** :
```bash
npm run i18n:codemod:pages      # Sur src/pages
npm run i18n:codemod:components # Sur src/components
```

## Workflow recommandé

```bash
# 1. Sauvegarder l'état actuel
git add -A && git commit -m "Avant codemod i18n"

# 2. Tester d'abord (dry-run)
npm run i18n:codemod:dry-run src/pages

# 3. Exécuter sur un dossier
npm run i18n:codemod:pages

# 4. Vérifier les changements
git diff src/pages/

# 5. Extraire les clés
npm run i18n:extract

# 6. Compléter les traductions
# Éditer src/i18n/locales/*/common.json
# Remplacer __STRING_NOT_TRANSLATED__ par les vraies traductions
```

## Fichiers créés

- `i18next-scanner.config.js` : Configuration de l'extraction
- `codemods/i18n-transform.js` : Codemod de transformation
- `scripts/i18n-run-codemod.sh` : Script wrapper sécurisé
- `I18N-ACCELERATOR-GUIDE.md` : Guide complet détaillé

## ⚠️ Important

- **Toujours tester en dry-run d'abord**
- **Faire un commit Git avant d'exécuter le codemod**
- **Vérifier manuellement après transformation**
- **Compléter les traductions après extraction**

Voir `I18N-ACCELERATOR-GUIDE.md` pour le guide complet.

