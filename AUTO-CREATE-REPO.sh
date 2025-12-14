#!/bin/bash

# Script pour créer automatiquement le repo GitHub avec GitHub CLI

set -e

REPO_NAME="rentanoo-nosy-be"
REPO_DESCRIPTION="Plateforme de location de véhicules pour Nosy Be, Madagascar"

echo "🚀 Création automatique du repo GitHub"
echo "   Nom: $REPO_NAME"
echo ""

# Vérifier si GitHub CLI est installé
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI n'est pas installé"
    echo "   Installation: brew install gh"
    exit 1
fi

# Vérifier l'authentification
if ! gh auth status &> /dev/null; then
    echo "⚠️  Authentification GitHub requise"
    echo "   Lancement de l'authentification interactive..."
    echo ""
    gh auth login
fi

echo "✅ Authentifié avec GitHub"
echo ""

# Vérifier si le remote existe déjà
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Le remote 'origin' existe déjà"
    CURRENT_URL=$(git remote get-url origin)
    echo "   URL actuelle: $CURRENT_URL"
    read -p "Voulez-vous le remplacer? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "❌ Annulé"
        exit 1
    fi
fi

# Créer le repo et pousser
echo "📦 Création du repo GitHub (privé)..."
gh repo create "$REPO_NAME" \
    --private \
    --description "$REPO_DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push

echo ""
echo "✅ Repo créé et code poussé avec succès!"
echo ""
echo "🌐 Ouverture dans le navigateur..."
gh repo view "$REPO_NAME" --web

echo ""
echo "📋 Informations:"
git remote -v
echo ""
echo "URL: https://github.com/$(gh api user --jq .login)/$REPO_NAME"

