# 🚀 ÉTAPE 1 : Dupliquer le code (sans toucher à la prod)

**Objectif** : Créer une copie complète du projet source vers un nouveau dossier avec un nouveau repo Git indépendant.

**⚠️ IMPORTANT** : Cette étape ne modifie **AUCUNEMENT** le projet source. Tout se fait dans le nouveau dossier.

---

## 📋 PRÉ-REQUIS

- [ ] Terminal macOS (zsh) ouvert
- [ ] Git installé (`git --version`)
- [ ] Accès en écriture au dossier parent : `/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/`

---

## 🎯 COMMANDES À EXÉCUTER

### Étape 1.1 : Vérifier l'état du projet source

```bash
# Aller dans le projet source
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/lagon-car-share"

# Vérifier qu'on est bien dans le bon dossier
pwd

# Vérifier l'état Git (s'assurer qu'on ne modifie rien)
git status
```

**✅ Validation** : Vous devez voir l'état Git du projet source. **Ne commitez rien ici**.

---

### Étape 1.2 : Vérifier que le dossier cible n'existe pas

```bash
# Remonter au dossier parent
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"

# Vérifier que le dossier cible n'existe pas encore
ls -la | grep rentanoo-nosy-be

# Si le dossier existe déjà, le supprimer (⚠️ ATTENTION : perte de données)
# rm -rf rentanoo-nosy-be
```

**✅ Validation** : Le dossier `rentanoo-nosy-be` ne doit **PAS** exister.

---

### Étape 1.3 : Copier le projet source vers le nouveau dossier

```bash
# Toujours dans le dossier parent
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"

# Copier récursivement tout le contenu (sauf .git sera ignoré par défaut avec certaines options)
# Option 1 : Copie complète avec rsync (recommandé - exclut .git automatiquement)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' \
  "lagon-car-share/" "rentanoo-nosy-be/"

# OU Option 2 : Copie simple avec cp (puis suppression manuelle de .git)
# cp -r lagon-car-share rentanoo-nosy-be
# cd rentanoo-nosy-be
# rm -rf .git

# Vérifier que la copie a fonctionné
cd rentanoo-nosy-be
ls -la
```

**✅ Validation** : 
- Le dossier `rentanoo-nosy-be` existe
- Il contient tous les fichiers du projet source
- **PAS de dossier `.git`** (ou le supprimer si présent)

---

### Étape 1.4 : Supprimer l'ancien .git (si présent)

```bash
# Dans le nouveau projet
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Vérifier si .git existe
ls -la | grep "\.git"

# Si .git existe, le supprimer
if [ -d ".git" ]; then
  echo "⚠️  Suppression de l'ancien .git..."
  rm -rf .git
  echo "✅ .git supprimé"
else
  echo "✅ Pas de .git à supprimer"
fi
```

**✅ Validation** : Le dossier `.git` ne doit **PAS** exister.

---

### Étape 1.5 : Vérifier et renforcer le .gitignore

```bash
# Toujours dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Vérifier le contenu de .gitignore
cat .gitignore | grep -E "\.env"

# Si .env n'est pas dans .gitignore, l'ajouter
if ! grep -q "^\.env$" .gitignore; then
  echo "" >> .gitignore
  echo "# Environment variables (secrets)" >> .gitignore
  echo ".env" >> .gitignore
  echo ".env.local" >> .gitignore
  echo ".env.*.local" >> .gitignore
  echo "✅ .gitignore mis à jour"
else
  echo "✅ .gitignore contient déjà .env"
fi
```

**✅ Validation** : Le fichier `.gitignore` contient au minimum :
```
.env
.env.local
.env.*.local
```

---

### Étape 1.6 : Initialiser le nouveau repo Git

```bash
# Toujours dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Initialiser Git
git init

# Vérifier que l'initialisation a fonctionné
git status
```

**✅ Validation** : 
- Le message doit indiquer "Initial commit"
- Vous devez voir tous les fichiers non trackés

---

### Étape 1.7 : Vérifier qu'aucun secret n'est tracké

```bash
# Toujours dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Vérifier que .env et .env.local ne sont PAS dans les fichiers à commiter
git status | grep -E "\.env"

# Vérifier explicitement avec git ls-files (après add, mais avant commit)
# D'abord, voir ce qui serait ajouté
git add -n . 2>/dev/null | grep -E "\.env" || echo "✅ Aucun fichier .env ne sera commité"

# Vérifier que les fichiers .env existent bien localement (c'est normal)
ls -la | grep "\.env"
```

**✅ Validation** : 
- `git status` ne doit **PAS** afficher `.env` ou `.env.local`
- Les fichiers `.env*` existent localement (c'est normal, ils ne doivent juste pas être commités)

---

### Étape 1.8 : Créer le commit initial

```bash
# Toujours dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Vérifier une dernière fois qu'aucun .env n'est inclus
git status | grep -E "\.env" || echo "✅ Aucun .env dans le staging"

# Créer le commit initial
git commit -m "Initial commit: Duplication pour Nosy Be

- Projet dupliqué depuis lagon-car-share
- Nouveau repo Git indépendant
- Configuration pour rentanoo.com (Nosy Be)"
```

**✅ Validation** : 
- Le commit est créé avec succès
- Aucun fichier `.env*` n'est dans le commit

---

### Étape 1.9 : Vérifier qu'il n'y a pas de remote configuré

```bash
# Toujours dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Vérifier les remotes (doit être vide)
git remote -v

# Vérifier la branche actuelle
git branch
```

**✅ Validation** : 
- `git remote -v` doit retourner **rien** (pas de remote configuré)
- La branche par défaut est `main` ou `master`

---

### Étape 1.10 : Vérification finale de sécurité

```bash
# Toujours dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# 1. Vérifier qu'aucun secret n'est dans le dernier commit
git show HEAD --name-only | grep -E "\.env" || echo "✅ Aucun .env dans le commit"

# 2. Vérifier le contenu du commit pour des clés sensibles (optionnel mais recommandé)
git show HEAD | grep -iE "(supabase|stripe|secret|key|password|token)" | head -5
# ⚠️ Si vous voyez des clés complètes, c'est un problème !

# 3. Lister tous les fichiers trackés
echo "📋 Fichiers trackés par Git :"
git ls-files | wc -l
echo "fichiers"

# 4. Vérifier que les fichiers importants sont présents
echo ""
echo "✅ Vérification des fichiers essentiels :"
[ -f "package.json" ] && echo "  ✅ package.json" || echo "  ❌ package.json manquant"
[ -f "vite.config.ts" ] && echo "  ✅ vite.config.ts" || echo "  ❌ vite.config.ts manquant"
[ -f "src/integrations/supabase/client.ts" ] && echo "  ✅ supabase/client.ts" || echo "  ❌ supabase/client.ts manquant"
[ -f ".gitignore" ] && echo "  ✅ .gitignore" || echo "  ❌ .gitignore manquant"
[ -f "supabase/config.toml" ] && echo "  ✅ supabase/config.toml" || echo "  ❌ supabase/config.toml manquant"
```

**✅ Validation** : 
- Aucun fichier `.env*` dans le commit
- Aucune clé secrète complète dans le commit
- Tous les fichiers essentiels sont présents

---

## ✅ CHECKLIST DE VALIDATION COMPLÈTE

Cochez chaque point après vérification :

### Structure du projet
- [ ] Le dossier `rentanoo-nosy-be` existe dans le bon emplacement
- [ ] Le dossier contient tous les fichiers du projet source
- [ ] Le dossier `.git` n'existe **PAS** (ou a été supprimé)
- [ ] Le dossier `node_modules` n'est **PAS** présent (normal, sera recréé avec `npm install`)

### Configuration Git
- [ ] `git status` fonctionne et montre "Initial commit"
- [ ] `git remote -v` retourne **rien** (pas de remote)
- [ ] `git branch` montre une branche (main ou master)
- [ ] Un commit initial a été créé avec succès

### Sécurité (CRITIQUE)
- [ ] `.gitignore` contient `.env`, `.env.local`, `.env.*.local`
- [ ] `git status` ne montre **AUCUN** fichier `.env*`
- [ ] `git ls-files` ne liste **AUCUN** fichier `.env*`
- [ ] `git show HEAD` ne contient **AUCUN** fichier `.env*`
- [ ] Les fichiers `.env*` existent localement (c'est normal, ils ne doivent juste pas être trackés)

### Fichiers essentiels
- [ ] `package.json` existe
- [ ] `vite.config.ts` existe
- [ ] `src/integrations/supabase/client.ts` existe
- [ ] `supabase/config.toml` existe
- [ ] `.gitignore` existe et est correct

### Vérification du projet source (ne pas modifier)
- [ ] Le projet source `lagon-car-share` est **intact**
- [ ] `git status` dans le projet source n'a **PAS** changé
- [ ] Aucun fichier n'a été modifié dans le projet source

---

## 🚨 ERREURS FRÉQUENTES + SOLUTIONS

### ❌ Erreur : "Permission denied" lors de la copie

**Cause** : Droits d'accès insuffisants

**Solution** :
```bash
# Vérifier les permissions
ls -la "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"

# Si nécessaire, ajuster les permissions
chmod -R u+w "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"
```

---

### ❌ Erreur : ".env est dans git status"

**Cause** : Le fichier `.env` était déjà tracké dans l'ancien repo et a été copié

**Solution** :
```bash
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Vérifier si .env est tracké
git ls-files | grep "\.env"

# Si oui, le retirer de l'index (mais garder le fichier local)
git rm --cached .env .env.local 2>/dev/null

# Vérifier que .gitignore contient .env
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Refaire le commit
git add .gitignore
git commit --amend --no-edit
```

---

### ❌ Erreur : "fatal: not a git repository"

**Cause** : Vous n'êtes pas dans le bon dossier ou Git n'est pas initialisé

**Solution** :
```bash
# Vérifier où vous êtes
pwd

# Vous devez être dans rentanoo-nosy-be
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Réinitialiser Git si nécessaire
rm -rf .git
git init
```

---

### ❌ Erreur : Le dossier cible existe déjà

**Cause** : Une tentative précédente a créé le dossier

**Solution** :
```bash
# ⚠️ ATTENTION : Cela supprime tout le contenu du dossier
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"
rm -rf rentanoo-nosy-be

# Puis recommencez depuis l'étape 1.3
```

---

### ❌ Erreur : Des secrets sont visibles dans `git show HEAD`

**Cause** : Un fichier contenant des secrets a été commité

**Solution** :
```bash
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

# Identifier le fichier problématique
git show HEAD | grep -B 5 -A 5 "secret\|key\|password"

# Retirer le fichier de l'historique Git (si c'est le dernier commit)
git reset --soft HEAD~1  # Annule le commit mais garde les fichiers
# OU
git reset --hard HEAD~1  # ⚠️ ATTENTION : Supprime aussi les modifications

# Ajouter le fichier au .gitignore
echo "nom-du-fichier" >> .gitignore

# Refaire le commit sans le fichier problématique
git add .
git commit -m "Initial commit: Duplication pour Nosy Be (sans secrets)"
```

---

## 📝 COMMANDES RAPIDES (Script complet)

Si vous préférez exécuter toutes les commandes d'un coup, voici un script complet :

```bash
#!/bin/bash
set -e  # Arrêter en cas d'erreur

# Variables
SOURCE_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/lagon-car-share"
TARGET_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"
PARENT_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"

echo "🚀 ÉTAPE 1 : Duplication du code"
echo "================================"
echo ""

# Vérifier que le dossier source existe
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Erreur : Le dossier source n'existe pas : $SOURCE_DIR"
  exit 1
fi

# Supprimer le dossier cible s'il existe
if [ -d "$TARGET_DIR" ]; then
  echo "⚠️  Le dossier cible existe déjà. Suppression..."
  rm -rf "$TARGET_DIR"
fi

# Copier le projet
echo "📦 Copie du projet..."
cd "$PARENT_DIR"
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' \
  "lagon-car-share/" "rentanoo-nosy-be/"

# Aller dans le nouveau projet
cd "$TARGET_DIR"

# Supprimer .git si présent
if [ -d ".git" ]; then
  echo "🗑️  Suppression de l'ancien .git..."
  rm -rf .git
fi

# Vérifier .gitignore
echo "🔒 Vérification de .gitignore..."
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo "" >> .gitignore
  echo "# Environment variables (secrets)" >> .gitignore
  echo ".env" >> .gitignore
  echo ".env.local" >> .gitignore
  echo ".env.*.local" >> .gitignore
fi

# Initialiser Git
echo "🔧 Initialisation de Git..."
git init

# Vérifier qu'aucun .env n'est tracké
echo "🔍 Vérification de sécurité..."
if git status | grep -q "\.env"; then
  echo "⚠️  ATTENTION : Des fichiers .env sont détectés !"
  git status | grep "\.env"
  exit 1
fi

# Créer le commit initial
echo "💾 Création du commit initial..."
git add .
git commit -m "Initial commit: Duplication pour Nosy Be

- Projet dupliqué depuis lagon-car-share
- Nouveau repo Git indépendant
- Configuration pour rentanoo.com (Nosy Be)"

# Vérification finale
echo ""
echo "✅ Vérification finale..."
echo "  - Remote configuré : $(git remote -v | wc -l | tr -d ' ') (doit être 0)"
echo "  - Fichiers trackés : $(git ls-files | wc -l | tr -d ' ')"
echo "  - Fichiers .env trackés : $(git ls-files | grep -c '\.env' || echo 0) (doit être 0)"

echo ""
echo "✅ ÉTAPE 1 TERMINÉE !"
echo "📁 Nouveau projet : $TARGET_DIR"
```

**Pour utiliser ce script** :
```bash
# Sauvegarder le script
cat > /tmp/dupliquer-projet.sh << 'EOF'
[paste le script ci-dessus]
EOF

# Rendre exécutable
chmod +x /tmp/dupliquer-projet.sh

# Exécuter
/tmp/dupliquer-projet.sh
```

---

## 🎯 PROCHAINES ÉTAPES

Une fois l'étape 1 terminée et validée :

1. ✅ **Étape 2** : Créer la nouvelle instance Supabase
2. ✅ **Étape 3** : Dupliquer le schéma de base de données
3. ✅ **Étape 4** : Dupliquer les buckets de storage
4. ✅ **Étape 5** : Déployer les Edge Functions
5. ✅ **Étape 6** : Configurer OAuth et Stripe
6. ✅ **Étape 7** : Mettre à jour le code frontend
7. ✅ **Étape 8** : Configurer le domaine et déployer

Consultez `GUIDE-DUPLICATION-PROJET.md` pour les détails complets.

---

**Document créé le** : 2025  
**Dernière mise à jour** : 2025
