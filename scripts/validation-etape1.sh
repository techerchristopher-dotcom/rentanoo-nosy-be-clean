#!/bin/bash

# ============================================
# SCRIPT : VALIDATION ÉTAPE 1
# ============================================
# 
# Ce script valide que l'étape 1 a été correctement effectuée
# ============================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration absolue du chemin
TARGET_DIR="/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be"

echo ""
echo -e "${BLUE}🔍 VALIDATION ÉTAPE 1${NC}"
echo "=========================================="
echo ""

# Vérifier que le dossier existe
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}❌ Le dossier cible n'existe pas : $TARGET_DIR${NC}"
  exit 1
fi

cd "$TARGET_DIR"

# Vérifications
ERRORS=0
WARNINGS=0

echo -e "${BLUE}📋 Vérifications en cours...${NC}"
echo ""

# 1. Vérifier que .git existe
if [ -d ".git" ]; then
  echo -e "${GREEN}✅ .git existe${NC}"
else
  echo -e "${RED}❌ .git n'existe pas${NC}"
  ((ERRORS++))
fi

# 2. Vérifier qu'il n'y a pas de remote
REMOTE_COUNT=$(git remote -v 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMOTE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ Aucun remote configuré${NC}"
else
  echo -e "${RED}❌ Des remotes sont configurés (ne devrait pas)${NC}"
  git remote -v
  ((ERRORS++))
fi

# 3. Vérifier qu'aucun .env n'est tracké
ENV_TRACKED=$(git ls-files 2>/dev/null | grep -c '\.env' || echo 0)
if [ "$ENV_TRACKED" -eq 0 ]; then
  echo -e "${GREEN}✅ Aucun fichier .env tracké${NC}"
else
  echo -e "${RED}❌ $ENV_TRACKED fichier(s) .env sont trackés !${NC}"
  git ls-files | grep '\.env'
  ((ERRORS++))
fi

# 3b. Vérifier qu'aucun .env n'est dans le staging (si modifications en cours)
ENV_IN_STAGING=$(git diff --cached --name-only 2>/dev/null | grep -E '\.env' || true)
if [ -z "$ENV_IN_STAGING" ]; then
  echo -e "${GREEN}✅ Aucun fichier .env dans le staging${NC}"
else
  echo -e "${RED}❌ Des fichiers .env sont dans le staging !${NC}"
  echo "$ENV_IN_STAGING"
  ((ERRORS++))
fi

# 3c. Vérifier qu'aucun .env n'est dans le dernier commit
ENV_IN_COMMIT=$(git show HEAD --name-only 2>/dev/null | grep -E '\.env' || true)
if [ -z "$ENV_IN_COMMIT" ]; then
  echo -e "${GREEN}✅ Aucun fichier .env dans le dernier commit${NC}"
else
  echo -e "${RED}❌ Des fichiers .env sont dans le dernier commit !${NC}"
  echo "$ENV_IN_COMMIT"
  ((ERRORS++))
fi

# 4. Vérifier que .gitignore contient .env
if grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo -e "${GREEN}✅ .gitignore contient .env${NC}"
else
  echo -e "${YELLOW}⚠️  .gitignore ne contient pas .env${NC}"
  ((WARNINGS++))
fi

# 5. Vérifier les fichiers essentiels
ESSENTIAL_FILES=(
  "package.json"
  "vite.config.ts"
  "src/integrations/supabase/client.ts"
  ".gitignore"
  "supabase/config.toml"
)

echo ""
echo -e "${BLUE}📁 Fichiers essentiels :${NC}"
for file in "${ESSENTIAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✅${NC} $file"
  else
    echo -e "  ${RED}❌${NC} $file (MANQUANT)"
    ((ERRORS++))
  fi
done

# 6. Vérifier qu'il y a au moins un commit
COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
if [ "$COMMIT_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ $COMMIT_COUNT commit(s) trouvé(s)${NC}"
else
  echo -e "${RED}❌ Aucun commit trouvé${NC}"
  ((ERRORS++))
fi

# 7. Vérifier que node_modules n'est pas présent (sera recréé)
if [ -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  node_modules est présent (sera recréé avec npm install)${NC}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✅ node_modules absent (normal)${NC}"
fi

# Résumé
echo ""
echo "=========================================="
if [ "$ERRORS" -eq 0 ]; then
  if [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION RÉUSSIE${NC}"
  else
    echo -e "${YELLOW}⚠️  VALIDATION RÉUSSIE AVEC $WARNINGS AVERTISSEMENT(S)${NC}"
  fi
  echo "=========================================="
  exit 0
else
  echo -e "${RED}❌ VALIDATION ÉCHOUÉE : $ERRORS erreur(s)${NC}"
  echo "=========================================="
  exit 1
fi
