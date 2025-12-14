#!/bin/bash

# ============================================
# SCRIPT : ÉTAPE 1 - DUPLICATION DU CODE
# ============================================
# 
# Ce script duplique le projet source vers un nouveau dossier
# et initialise un nouveau repo Git indépendant.
#
# ⚠️ IMPORTANT : Ne modifie PAS le projet source
# ============================================

set -e  # Arrêter en cas d'erreur
set -u  # Erreur si variable non définie

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SOURCE_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/lagon-car-share"
TARGET_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"
PARENT_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"

echo ""
echo -e "${BLUE}🚀 ÉTAPE 1 : DUPLICATION DU CODE${NC}"
echo "=========================================="
echo ""

# ============================================
# VÉRIFICATIONS PRÉLIMINAIRES
# ============================================

echo -e "${BLUE}📋 Vérifications préliminaires...${NC}"

# Vérifier que le dossier source existe
if [ ! -d "$SOURCE_DIR" ]; then
  echo -e "${RED}❌ Erreur : Le dossier source n'existe pas :${NC}"
  echo "   $SOURCE_DIR"
  exit 1
fi
echo -e "${GREEN}✅ Dossier source trouvé${NC}"

# Vérifier que Git est installé
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Erreur : Git n'est pas installé${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Git est installé${NC}"

# Vérifier que rsync est disponible (ou utiliser cp)
if command -v rsync &> /dev/null; then
  USE_RSYNC=true
  echo -e "${GREEN}✅ rsync disponible (sera utilisé)${NC}"
else
  USE_RSYNC=false
  echo -e "${YELLOW}⚠️  rsync non disponible, utilisation de cp${NC}"
fi

# Vérifier si le dossier cible existe déjà
if [ -d "$TARGET_DIR" ]; then
  echo -e "${YELLOW}⚠️  Le dossier cible existe déjà : $TARGET_DIR${NC}"
  read -p "Voulez-vous le supprimer et recommencer ? (o/N) : " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo -e "${YELLOW}🗑️  Suppression du dossier existant...${NC}"
    rm -rf "$TARGET_DIR"
    echo -e "${GREEN}✅ Dossier supprimé${NC}"
  else
    echo -e "${RED}❌ Opération annulée${NC}"
    exit 1
  fi
fi

# ============================================
# COPIE DU PROJET
# ============================================

echo ""
echo -e "${BLUE}📦 Copie du projet...${NC}"

cd "$PARENT_DIR"

if [ "$USE_RSYNC" = true ]; then
  # Utiliser rsync (exclut .git et TOUS les fichiers .env)
  echo -e "${YELLOW}🔒 Exclusion des fichiers .env lors de la copie...${NC}"
  rsync -av --exclude='.git' \
           --exclude='node_modules' \
           --exclude='dist' \
           --exclude='.DS_Store' \
           --exclude='.env' \
           --exclude='.env.local' \
           --exclude='.env.*' \
           "lagon-car-share/" "rentanoo-nosy-be/"
  echo -e "${GREEN}✅ Fichiers .env exclus de la copie${NC}"
else
  # Utiliser cp (plus simple mais moins optimal)
  cp -r "lagon-car-share" "rentanoo-nosy-be"
  cd "rentanoo-nosy-be"
  # Supprimer .git si présent
  if [ -d ".git" ]; then
    rm -rf .git
  fi
  # Supprimer node_modules, dist et TOUS les fichiers .env
  rm -rf node_modules dist 2>/dev/null || true
  rm -f .env .env.local .env.* 2>/dev/null || true
  echo -e "${GREEN}✅ Fichiers .env supprimés${NC}"
fi

echo -e "${GREEN}✅ Copie terminée${NC}"

# ============================================
# NETTOYAGE ET CONFIGURATION
# ============================================

cd "$TARGET_DIR"

echo ""
echo -e "${BLUE}🧹 Nettoyage...${NC}"

# Supprimer .git si présent (au cas où)
if [ -d ".git" ]; then
  echo -e "${YELLOW}🗑️  Suppression de l'ancien .git...${NC}"
  rm -rf .git
fi

# Supprimer node_modules et dist (seront recréés)
rm -rf node_modules dist 2>/dev/null || true

echo -e "${GREEN}✅ Nettoyage terminé${NC}"

# ============================================
# CONFIGURATION .gitignore
# ============================================

echo ""
echo -e "${BLUE}🔒 Configuration de .gitignore...${NC}"

# Vérifier que .gitignore existe
if [ ! -f ".gitignore" ]; then
  echo -e "${YELLOW}⚠️  .gitignore n'existe pas, création...${NC}"
  touch .gitignore
fi

# Vérifier et ajouter les règles pour .env si nécessaire (AVANT git add)
echo -e "${YELLOW}🔒 Vérification/ajout des règles .env dans .gitignore...${NC}"

# Vérifier chaque règle individuellement
ENV_IGNORED=true
if ! grep -qE "^(\.env|\.env\.local|\.env\..*\.local)$" .gitignore 2>/dev/null; then
  ENV_IGNORED=false
fi

if [ "$ENV_IGNORED" = false ]; then
  echo "" >> .gitignore
  echo "# Environment variables (secrets) - DO NOT COMMIT" >> .gitignore
  echo ".env" >> .gitignore
  echo ".env.local" >> .gitignore
  echo ".env.*.local" >> .gitignore
  echo -e "${GREEN}✅ Règles .env ajoutées à .gitignore${NC}"
else
  echo -e "${GREEN}✅ .gitignore contient déjà les règles .env${NC}"
fi

# Vérification stricte : s'assurer que les règles sont bien présentes
if ! grep -qE "^\.env$" .gitignore 2>/dev/null; then
  echo -e "${RED}❌ ERREUR : .env n'est pas dans .gitignore après ajout !${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Vérification .gitignore OK${NC}"

# ============================================
# INITIALISATION GIT
# ============================================

echo ""
echo -e "${BLUE}🔧 Initialisation de Git...${NC}"

git init

# Configurer la branche par défaut (main)
git branch -M main 2>/dev/null || git branch -M master 2>/dev/null || true

echo -e "${GREEN}✅ Git initialisé${NC}"

# ============================================
# VÉRIFICATION DE SÉCURITÉ
# ============================================

echo ""
echo -e "${BLUE}🔍 Vérification de sécurité...${NC}"

# Vérifier qu'aucun .env n'est dans git status (AVANT git add)
ENV_FILES=$(git status --porcelain 2>/dev/null | grep -E "\.env" || true)

if [ -n "$ENV_FILES" ]; then
  echo -e "${RED}❌ ATTENTION : Des fichiers .env sont détectés dans git status !${NC}"
  echo "$ENV_FILES"
  echo ""
  echo -e "${YELLOW}Solution :${NC}"
  echo "  1. Vérifiez que .gitignore contient .env"
  echo "  2. Si un .env est tracké, exécutez : git rm --cached .env"
  exit 1
fi

# Vérifier que les fichiers .env n'existent PAS localement (ils ont été exclus lors de la copie)
if [ -f ".env" ] || [ -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  Des fichiers .env existent localement (seront ignorés par .gitignore)${NC}"
  echo -e "${YELLOW}   Ils ne seront PAS commités grâce à .gitignore${NC}"
else
  echo -e "${GREEN}✅ Aucun fichier .env trouvé localement (normal, exclus lors de la copie)${NC}"
fi

echo -e "${GREEN}✅ Vérification de sécurité pré-add OK${NC}"

# ============================================
# CRÉATION DU COMMIT INITIAL
# ============================================

echo ""
echo -e "${BLUE}💾 Création du commit initial...${NC}"

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# ============================================
# VÉRIFICATION CRITIQUE AVANT COMMIT
# ============================================
echo ""
echo -e "${BLUE}🔒 Vérification de sécurité AVANT commit...${NC}"

# Vérification STRICTE : aucun .env dans le staging
ENV_IN_STAGING=$(git diff --cached --name-only | grep -E '\.env' || true)

if [ -n "$ENV_IN_STAGING" ]; then
  echo -e "${RED}❌ ERREUR CRITIQUE : Des fichiers .env sont dans le staging !${NC}"
  echo ""
  echo -e "${RED}Fichiers problématiques :${NC}"
  echo "$ENV_IN_STAGING"
  echo ""
  echo -e "${YELLOW}Solution immédiate :${NC}"
  echo "  1. Retirer les fichiers du staging :"
  echo "     git reset HEAD .env .env.local .env.*"
  echo "  2. Vérifier que .gitignore contient bien :"
  echo "     .env"
  echo "     .env.local"
  echo "     .env.*.local"
  echo "  3. Relancer le script"
  echo ""
  exit 1
fi

# Afficher confirmation explicite
echo -e "${GREEN}✅ OK: aucun .env dans staging${NC}"
echo -e "${GREEN}✅ Sécurité validée, création du commit...${NC}"

# Créer un fichier env-template si nécessaire (pour référence)
if [ ! -f ".env.template" ] && [ ! -f "scripts/env-template-nosy-be.txt" ]; then
  echo -e "${YELLOW}📝 Création d'un fichier env-template pour référence...${NC}"
  cat > .env.template << 'EOF'
# Template de fichier d'environnement
# Copiez ce fichier vers .env.local et remplissez les valeurs
# ⚠️ NE COMMITEZ JAMAIS le fichier .env.local avec des secrets !

VITE_SUPABASE_URL=https://[NOUVEAU_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[NOUVELLE_ANON_KEY]
VITE_PUBLIC_SITE_URL=https://rentanoo.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_[VOTRE_CLE_STRIPE]
EOF
  echo -e "${GREEN}✅ .env.template créé${NC}"
fi

# Créer le commit
git commit -m "Initial commit: Duplication pour Nosy Be

- Projet dupliqué depuis lagon-car-share
- Nouveau repo Git indépendant
- Configuration pour rentanoo.com (Nosy Be)
- Fichiers .env exclus pour sécurité"

echo -e "${GREEN}✅ Commit initial créé${NC}"

# ============================================
# VÉRIFICATION FINALE
# ============================================

echo ""
echo -e "${BLUE}✅ Vérification finale...${NC}"

# Vérifier les remotes (doit être vide)
REMOTE_COUNT=$(git remote -v | wc -l | tr -d ' ')
if [ "$REMOTE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ Aucun remote configuré (correct)${NC}"
else
  echo -e "${YELLOW}⚠️  Des remotes sont configurés :${NC}"
  git remote -v
fi

# Compter les fichiers trackés
FILE_COUNT=$(git ls-files | wc -l | tr -d ' ')
echo -e "${GREEN}✅ Fichiers trackés : $FILE_COUNT${NC}"

# Vérifier qu'aucun .env n'est tracké
ENV_TRACKED=$(git ls-files | grep -c '\.env' || echo 0)
if [ "$ENV_TRACKED" -eq 0 ]; then
  echo -e "${GREEN}✅ Aucun fichier .env tracké (correct)${NC}"
else
  echo -e "${RED}❌ ERREUR : $ENV_TRACKED fichier(s) .env sont trackés !${NC}"
  git ls-files | grep '\.env'
  exit 1
fi

# Vérifier les fichiers essentiels
echo ""
echo -e "${BLUE}📋 Vérification des fichiers essentiels :${NC}"
ESSENTIAL_FILES=(
  "package.json"
  "vite.config.ts"
  "src/integrations/supabase/client.ts"
  ".gitignore"
  "supabase/config.toml"
)

ALL_OK=true
for file in "${ESSENTIAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✅${NC} $file"
  else
    echo -e "  ${RED}❌${NC} $file (MANQUANT)"
    ALL_OK=false
  fi
done

if [ "$ALL_OK" = false ]; then
  echo -e "${RED}❌ Certains fichiers essentiels sont manquants${NC}"
  exit 1
fi

# ============================================
# RÉSUMÉ
# ============================================

echo ""
echo "=========================================="
echo -e "${GREEN}✅ ÉTAPE 1 TERMINÉE AVEC SUCCÈS !${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📁 Nouveau projet :${NC}"
echo "   $TARGET_DIR"
echo ""
echo -e "${BLUE}📊 Statistiques :${NC}"
echo "   - Fichiers trackés : $FILE_COUNT"
echo "   - Fichiers .env trackés : $ENV_TRACKED (doit être 0)"
echo "   - Remotes configurés : $REMOTE_COUNT (doit être 0)"
echo ""
echo -e "${BLUE}🎯 Prochaines étapes :${NC}"
echo "   1. Vérifiez le projet : cd \"$TARGET_DIR\""
echo "   2. Installez les dépendances : npm install"
echo "   3. Consultez GUIDE-DUPLICATION-PROJET.md pour l'étape 2"
echo ""
echo -e "${GREEN}✨ Bonne continuation !${NC}"
echo ""
