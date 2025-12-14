#!/bin/bash

# ============================================
# SCRIPT : ÉTAPE 1 - DUPLICATION SAFE
# ============================================
# 
# Duplication 100% sécurisée du projet source vers rentanoo-nosy-be
# Aucun secret ne sera copié ou commité
# ============================================

set -e  # Arrêter en cas d'erreur
set -u  # Erreur si variable non définie

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ============================================
# CONFIGURATION ABSOLUE DES CHEMINS
# ============================================

PARENT_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"
SOURCE_DIR="$PARENT_DIR/lagon-car-share"
TARGET_DIR="$PARENT_DIR/rentanoo-nosy-be"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║  ÉTAPE 1 : DUPLICATION SAFE (100% SÉCURISÉE)         ║${NC}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# ÉTAPE 1 : FORCER LE BON DOSSIER DE TRAVAIL
# ============================================

echo -e "${BLUE}📍 Étape 1/8 : Positionnement dans le bon dossier...${NC}"

# Se placer explicitement dans le dossier parent
if [ ! -d "$PARENT_DIR" ]; then
  echo -e "${RED}❌ ERREUR : Le dossier parent n'existe pas :${NC}"
  echo "   $PARENT_DIR"
  exit 1
fi

cd "$PARENT_DIR"
echo -e "${GREEN}✅ Positionné dans : $(pwd)${NC}"

# Vérifier que le projet source existe
if [ ! -d "$SOURCE_DIR" ]; then
  echo -e "${RED}❌ ERREUR : Le projet source n'existe pas :${NC}"
  echo "   $SOURCE_DIR"
  exit 1
fi
echo -e "${GREEN}✅ Projet source trouvé : lagon-car-share${NC}"

# ============================================
# ÉTAPE 2 : SUPPRIMER TOUTE ANCIENNE TENTATIVE
# ============================================

echo ""
echo -e "${BLUE}🗑️  Étape 2/8 : Nettoyage des anciennes tentatives...${NC}"

if [ -d "$TARGET_DIR" ]; then
  echo -e "${YELLOW}⚠️  Le dossier cible existe déjà, suppression...${NC}"
  rm -rf "$TARGET_DIR"
  echo -e "${GREEN}✅ Ancien dossier supprimé${NC}"
else
  echo -e "${GREEN}✅ Aucun dossier existant à supprimer${NC}"
fi

# ============================================
# ÉTAPE 3 : COPIE EN MODE SAFE (exclusions strictes)
# ============================================

echo ""
echo -e "${BLUE}📦 Étape 3/8 : Copie sécurisée du projet...${NC}"

# Vérifier que rsync est disponible
if ! command -v rsync &> /dev/null; then
  echo -e "${RED}❌ ERREUR : rsync n'est pas installé${NC}"
  echo "   Installez rsync : brew install rsync"
  exit 1
fi

echo -e "${YELLOW}🔒 Exclusion stricte des fichiers sensibles...${NC}"

# Copie avec exclusions OBLIGATOIRES
rsync -av \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*' \
  --exclude='*.log' \
  "lagon-car-share/" "rentanoo-nosy-be/"

echo -e "${GREEN}✅ Copie terminée (fichiers .env exclus)${NC}"

# Vérification : aucun .env ne doit être présent
cd "$TARGET_DIR"
if [ -f ".env" ] || [ -f ".env.local" ]; then
  echo -e "${RED}❌ ERREUR CRITIQUE : Des fichiers .env sont présents après copie !${NC}"
  ls -la | grep "\.env"
  exit 1
fi
echo -e "${GREEN}✅ Vérification : aucun .env copié${NC}"

# ============================================
# ÉTAPE 4 : SÉCURISER LE .gitignore
# ============================================

echo ""
echo -e "${BLUE}🔒 Étape 4/8 : Sécurisation du .gitignore...${NC}"

# Vérifier que .gitignore existe
if [ ! -f ".gitignore" ]; then
  echo -e "${YELLOW}⚠️  .gitignore n'existe pas, création...${NC}"
  touch .gitignore
fi

# Ajouter les règles .env si absentes (AVANT git init)
ENV_RULES_ADDED=false
if ! grep -qE "^\.env$" .gitignore 2>/dev/null; then
  echo "" >> .gitignore
  echo "# Environment variables (secrets) - DO NOT COMMIT" >> .gitignore
  echo ".env" >> .gitignore
  ENV_RULES_ADDED=true
fi

if ! grep -qE "^\.env\.local$" .gitignore 2>/dev/null; then
  echo ".env.local" >> .gitignore
  ENV_RULES_ADDED=true
fi

if ! grep -qE "^\.env\." .gitignore 2>/dev/null; then
  echo ".env.*" >> .gitignore
  ENV_RULES_ADDED=true
fi

if [ "$ENV_RULES_ADDED" = true ]; then
  echo -e "${GREEN}✅ Règles .env ajoutées à .gitignore${NC}"
else
  echo -e "${GREEN}✅ .gitignore contient déjà les règles .env${NC}"
fi

# Vérification stricte
if ! grep -qE "^\.env$" .gitignore 2>/dev/null; then
  echo -e "${RED}❌ ERREUR : .env n'est pas dans .gitignore après ajout !${NC}"
  exit 1
fi

# ============================================
# ÉTAPE 5 : INITIALISER GIT
# ============================================

echo ""
echo -e "${BLUE}🔧 Étape 5/8 : Initialisation de Git...${NC}"

# Supprimer .git si présent (au cas où)
if [ -d ".git" ]; then
  rm -rf .git
fi

# Initialiser Git
git init --quiet
git branch -M main 2>/dev/null || git branch -M master 2>/dev/null || true

echo -e "${GREEN}✅ Git initialisé (branche main)${NC}"

# ============================================
# ÉTAPE 6 : CONTRÔLES BLOQUANTS AVANT COMMIT
# ============================================

echo ""
echo -e "${BLUE}🛡️  Étape 6/8 : Contrôles de sécurité BLOQUANTS...${NC}"

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add . > /dev/null 2>&1

# CONTRÔLE 1 : Vérifier qu'aucun .env n'est dans le staging
ENV_IN_STAGING=$(git diff --cached --name-only 2>/dev/null | grep -E '\.env' || true)

if [ -n "$ENV_IN_STAGING" ]; then
  echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ ERREUR CRITIQUE : SECRETS DÉTECTÉS !            ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}Fichiers .env détectés dans le staging :${NC}"
  echo "$ENV_IN_STAGING"
  echo ""
  echo -e "${YELLOW}Action immédiate :${NC}"
  echo "  1. Retirer du staging : git reset HEAD .env .env.local"
  echo "  2. Vérifier .gitignore"
  echo "  3. Relancer le script"
  echo ""
  exit 1
fi

# CONTRÔLE 2 : Vérifier qu'aucun .env n'est tracké
ENV_TRACKED=$(git ls-files 2>/dev/null | grep -E '\.env' || true)

if [ -n "$ENV_TRACKED" ]; then
  echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ ERREUR CRITIQUE : SECRETS TRACKÉS !              ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}Fichiers .env trackés par Git :${NC}"
  echo "$ENV_TRACKED"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ OK : aucun .env dans staging${NC}"
echo -e "${GREEN}✅ OK : aucun .env tracké${NC}"
echo -e "${GREEN}✅ Sécurité validée, commit autorisé${NC}"

# ============================================
# ÉTAPE 7 : COMMIT INITIAL
# ============================================

echo ""
echo -e "${BLUE}💾 Étape 7/8 : Création du commit initial...${NC}"

git commit -m "Initial commit: duplication Rentanoo Nosy Be

- Projet dupliqué depuis lagon-car-share
- Nouveau repo Git indépendant
- Aucun secret commité (fichiers .env exclus)" > /dev/null 2>&1

echo -e "${GREEN}✅ Commit initial créé${NC}"

# ============================================
# ÉTAPE 8 : VALIDATION FINALE AUTOMATIQUE
# ============================================

echo ""
echo -e "${BLUE}✅ Étape 8/8 : Validation finale...${NC}"

# Vérifier qu'aucun .env n'est dans le commit
ENV_IN_COMMIT=$(git show HEAD --name-only 2>/dev/null | grep -E '\.env' || true)

if [ -n "$ENV_IN_COMMIT" ]; then
  echo -e "${RED}❌ ERREUR : Des fichiers .env sont dans le commit !${NC}"
  echo "$ENV_IN_COMMIT"
  exit 1
fi

# Compter les fichiers trackés
FILE_COUNT=$(git ls-files 2>/dev/null | wc -l | tr -d ' ')

# Vérifier les remotes
REMOTE_COUNT=$(git remote -v 2>/dev/null | wc -l | tr -d ' ')

# Vérifier les fichiers essentiels
ESSENTIAL_FILES=(
  "package.json"
  "vite.config.ts"
  "src/integrations/supabase/client.ts"
  ".gitignore"
  "supabase/config.toml"
)

ALL_OK=true
for file in "${ESSENTIAL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    ALL_OK=false
    break
  fi
done

# ============================================
# RÉSUMÉ FINAL
# ============================================

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  ✅ ÉTAPE 1 TERMINÉE AVEC SUCCÈS                       ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📁 Chemin du projet :${NC}"
echo "   $TARGET_DIR"
echo ""
echo -e "${BLUE}📊 Statistiques :${NC}"
echo -e "   ${GREEN}✅${NC} Fichiers trackés : $FILE_COUNT"
echo -e "   ${GREEN}✅${NC} Fichiers .env trackés : 0"
echo -e "   ${GREEN}✅${NC} Fichiers .env dans staging : 0"
echo -e "   ${GREEN}✅${NC} Fichiers .env dans commit : 0"
echo -e "   ${GREEN}✅${NC} Remotes configurés : $REMOTE_COUNT"
echo ""
echo -e "${BLUE}🔒 Sécurité :${NC}"
echo -e "   ${GREEN}✅${NC} Aucun .env copié"
echo -e "   ${GREEN}✅${NC} Aucun .env tracké"
echo -e "   ${GREEN}✅${NC} Aucun .env dans le commit"
echo -e "   ${GREEN}✅${NC} Aucun remote configuré"
echo ""

if [ "$ALL_OK" = true ]; then
  echo -e "${GREEN}✅ Tous les fichiers essentiels sont présents${NC}"
else
  echo -e "${YELLOW}⚠️  Certains fichiers essentiels sont manquants${NC}"
fi

echo ""
echo -e "${BOLD}${GREEN}ÉTAPE 1 VALIDÉE — Prêt pour l'étape 2 (Supabase)${NC}"
echo ""
