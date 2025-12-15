# Guide d'utilisation - Accélérateur i18n (Codemod + Extraction)

Ce guide décrit comment utiliser les outils d'accélération i18n pour transformer automatiquement les chaînes de caractères en dur en clés de traduction.

## 📦 Installation

Les dépendances sont déjà installées :
- `jscodeshift` : Pour transformer le code automatiquement
- `i18next-scanner` : Pour extraire les clés de traduction
- `@types/jscodeshift` : Types TypeScript pour jscodeshift

## 🎯 Vue d'ensemble

Le workflow se compose de deux étapes principales :

1. **Codemod** : Transforme automatiquement les chaînes en dur en appels `t()` 
2. **Extraction** : Extrait toutes les clés `t()` et met à jour les fichiers JSON de traduction

## 📋 Dry-run Plan

### Ordre d'exécution recommandé

1. **D'abord les pages** (`src/pages/`)
   - Plus isolées, moins de risques de régressions
   - Plus facile à tester

2. **Ensuite les composants** (`src/components/`)
   - Dépendances entre composants
   - Nécessite plus de validation

3. **Enfin les modules** (`src/modules/`)
   - Complexité moyenne
   - Logique métier

### Risques identifiés

⚠️ **Chaînes JSX complexes** :
- Les chaînes avec interpolation peuvent nécessiter une adaptation manuelle
- Exemple : `Bonjour ${name}` → `t('common.hello_name', { name })`

⚠️ **Chaînes conditionnelles** :
- Les ternaires avec chaînes doivent être vérifiés manuellement
- Exemple : `status === 'pending' ? 'En attente' : 'Confirmé'`

⚠️ **Attributs HTML** :
- Les attributs comme `placeholder`, `title`, `aria-label` sont transformés
- Vérifier que les clés générées sont correctes

⚠️ **Variables nommées** :
- Les variables contenant "label", "title", "text", "message" sont transformées automatiquement
- Vérifier chaque cas individuellement

### Comment revenir en arrière

1. **Via Git** (recommandé) :
```bash
# Avant d'exécuter le codemod
git add -A
git commit -m "Sauvegarde avant codemod i18n"

# Si problème, revenir en arrière
git reset --hard HEAD
```

2. **Via dry-run** :
```bash
# Toujours tester en mode dry-run d'abord
npm run i18n:codemod:dry-run src/pages
```

## 🚀 Commandes disponibles

### Extraction de clés

```bash
# Extraire toutes les clés t() des fichiers source
npm run i18n:extract
```

Cette commande :
- Parcourt tous les fichiers `.js`, `.jsx`, `.ts`, `.tsx` dans `src/`
- Extrait les appels `t('key')` et `t("key")`
- Met à jour les fichiers JSON dans `src/i18n/locales/{lang}/common.json`
- Ajoute les nouvelles clés avec la valeur `__STRING_NOT_TRANSLATED__`

### Codemod (transformation automatique)

#### Mode dry-run (test sans modification)

```bash
# Tester sur un fichier/dossier spécifique
npm run i18n:codemod:dry-run src/pages/Index.tsx

# Tester sur tout le dossier pages
npm run i18n:codemod:dry-run src/pages

# Tester sur tout le dossier components  
npm run i18n:codemod:dry-run src/components
```

#### Mode réel (modifie les fichiers)

```bash
# Sur un dossier spécifique
npm run i18n:codemod:pages      # src/pages uniquement
npm run i18n:codemod:components # src/components uniquement

# Sur un fichier spécifique
npm run i18n:codemod src/pages/Index.tsx

# Sur plusieurs dossiers
npm run i18n:codemod src/pages src/components

# Script wrapper avec confirmation
./scripts/i18n-run-codemod.sh src/pages
./scripts/i18n-run-codemod.sh src/pages --dry-run
```

## 📝 Workflow étape par étape

### Étape 1 : Préparation

```bash
# 1. Assurez-vous d'avoir un commit Git propre
git status

# 2. Créez une branche pour les changements i18n
git checkout -b feature/i18n-codemod

# 3. Commitez l'état actuel
git add -A
git commit -m "Sauvegarde avant codemod i18n"
```

### Étape 2 : Dry-run sur les pages

```bash
# Tester sur une page simple d'abord
npm run i18n:codemod:dry-run src/pages/Index.tsx

# Examiner la sortie pour voir ce qui serait transformé
# Si ça semble correct, tester sur tout le dossier pages
npm run i18n:codemod:dry-run src/pages
```

**Vérifications à faire** :
- ✅ Les chaînes de texte utilisateur sont transformées en `t('...')`
- ✅ Les imports `useTranslation` sont ajoutés
- ✅ Les hooks `const { t } = useTranslation('common')` sont ajoutés
- ❌ Les identifiants techniques ne sont pas transformés (variables, IDs, etc.)

### Étape 3 : Exécution réelle sur les pages

```bash
# Exécuter le codemod sur src/pages
npm run i18n:codemod:pages

# OU utiliser le script wrapper (recommandé)
./scripts/i18n-run-codemod.sh src/pages
```

### Étape 4 : Vérification et tests

```bash
# 1. Vérifier les changements avec git
git diff src/pages/

# 2. Vérifier que le projet compile
npm run build

# 3. Tester l'application
npm run dev

# 4. Vérifier quelques pages manuellement dans le navigateur
```

**Points à vérifier** :
- ✅ L'application démarre sans erreur
- ✅ Les pages s'affichent correctement
- ✅ Les textes s'affichent (même avec `__STRING_NOT_TRANSLATED__`)
- ✅ Aucune erreur console liée à i18n

### Étape 5 : Extraction des clés

```bash
# Extraire toutes les nouvelles clés t()
npm run i18n:extract
```

Cette commande va :
1. Parcourir tous les fichiers transformés
2. Extraire les appels `t('common.xxx')`
3. Ajouter les nouvelles clés dans `src/i18n/locales/{lang}/common.json`
4. Laisser les traductions existantes intactes

### Étape 6 : Compléter les traductions

```bash
# Ouvrir les fichiers de traduction
code src/i18n/locales/fr/common.json
code src/i18n/locales/en/common.json
code src/i18n/locales/it/common.json
code src/i18n/locales/de/common.json
```

**Actions** :
1. Rechercher `__STRING_NOT_TRANSLATED__` dans chaque fichier
2. Remplacer par la traduction appropriée
3. Renommer les clés si nécessaire (ex: `common.erreur_paiement` → `common.payment_error`)
4. Organiser les clés par catégorie si souhaité

**Exemple** :
```json
{
  "common": {
    "erreur_paiement": "__STRING_NOT_TRANSLATED__"
  }
}
```

Devient :
```json
{
  "common": {
    "payment_error": "Erreur de paiement"
  }
}
```

Puis mettre à jour le code pour utiliser la nouvelle clé :
```tsx
// Avant
t('common.erreur_paiement')

// Après
t('common.payment_error')
```

### Étape 7 : Répéter pour les composants

Une fois les pages validées, répéter le processus pour les composants :

```bash
# Dry-run
npm run i18n:codemod:dry-run src/components

# Exécution réelle
npm run i18n:codemod:components

# Extraction
npm run i18n:extract

# Compléter les traductions
# ...
```

### Étape 8 : Nettoyage final

```bash
# 1. Chercher les clés non utilisées (optionnel)
# Les fichiers JSON peuvent contenir des clés obsolètes

# 2. Vérifier qu'il n'y a plus de __STRING_NOT_TRANSLATED__
grep -r "__STRING_NOT_TRANSLATED__" src/i18n/locales/

# 3. Tester toutes les langues
# Changer la langue dans l'application et vérifier que tout s'affiche correctement

# 4. Linter
npm run lint

# 5. Build de production
npm run build
```

## 🔧 Configuration

### i18next-scanner.config.js

Le fichier `i18next-scanner.config.js` configure :
- Les fichiers à scanner (`src/**/*.{js,jsx,ts,tsx}`)
- Les fonctions à détecter (`t`, `i18next.t`, `i18n.t`)
- Les langues supportées (`fr`, `en`, `it`, `de`)
- Les fichiers de sortie (`src/i18n/locales/{lng}/{ns}.json`)

### codemods/i18n-transform.js

Le codemod transforme :
- Les chaînes JSX text → `{t('key')}`
- Les chaînes dans les props JSX → `t('key')`
- Les variables nommées (`label`, `title`, etc.) → `t('key')`
- Ajoute automatiquement `useTranslation` si nécessaire
- Ajoute `const { t } = useTranslation('common')` dans les composants

## 🐛 Dépannage

### Le codemod ne transforme pas certaines chaînes

**Cause** : Le codemod ignore les chaînes courtes (< 3 caractères) et celles qui ressemblent à des identifiants.

**Solution** : Transformer manuellement ces chaînes ou ajuster le codemod.

### Erreurs de syntaxe après le codemod

**Cause** : Transformation incorrecte d'une chaîne complexe.

**Solution** :
```bash
# Revenir en arrière
git checkout -- src/pages/ProblematicFile.tsx

# Transformer manuellement
```

### Les traductions ne s'affichent pas

**Vérifications** :
1. Le namespace est correct : `useTranslation('common')`
2. La clé existe dans le fichier JSON
3. Le fichier JSON est bien formaté (pas d'erreur JSON)
4. La langue est bien chargée

### Clés dupliquées ou mal nommées

**Solution** : Après l'extraction, renommer les clés dans les fichiers JSON et mettre à jour le code correspondant.

## 📚 Exemples

### Avant/Après

**Avant** :
```tsx
function MyComponent() {
  return (
    <div>
      <h1>Bienvenue</h1>
      <p>Ceci est un message de bienvenue</p>
      <button>Cliquez ici</button>
    </div>
  );
}
```

**Après codemod** :
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('common.bienvenue')}</h1>
      <p>{t('common.ceci_est_un_message_de_bienvenue')}</p>
      <button>{t('common.cliquez_ici')}</button>
    </div>
  );
}
```

**Après extraction et traduction** :
```json
// src/i18n/locales/fr/common.json
{
  "common": {
    "bienvenue": "Bienvenue",
    "ceci_est_un_message_de_bienvenue": "Ceci est un message de bienvenue",
    "cliquez_ici": "Cliquez ici"
  }
}
```

## ✅ Checklist de validation

Avant de considérer la migration comme terminée :

- [ ] Toutes les pages ont été transformées
- [ ] Toutes les clés ont été extraites (`npm run i18n:extract`)
- [ ] Toutes les traductions sont complètes (plus de `__STRING_NOT_TRANSLATED__`)
- [ ] L'application compile sans erreur (`npm run build`)
- [ ] L'application fonctionne en développement (`npm run dev`)
- [ ] Toutes les langues sont testées (fr, en, it, de)
- [ ] Aucune erreur console liée à i18n
- [ ] Le linter passe (`npm run lint`)
- [ ] Les changements sont commités dans Git

## 🎉 Résultat attendu

À la fin du processus :
- ✅ Tous les textes utilisateur sont internationalisés
- ✅ Les fichiers JSON contiennent toutes les clés avec leurs traductions
- ✅ L'application supporte le changement de langue en temps réel
- ✅ Le code est prêt pour de nouvelles traductions (il suffit d'ajouter un fichier JSON)

