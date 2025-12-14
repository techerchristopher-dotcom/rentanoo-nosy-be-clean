#!/bin/bash

# Script pour configurer le remote GitHub et pousser le code
# Usage: ./setup-github.sh YOUR_USERNAME

set -e

if [ -z "$1" ]; then
    echo "❌ Erreur: Nom d'utilisateur GitHub requis"
    echo "Usage: ./setup-github.sh YOUR_USERNAME"
    echo ""
    echo "Exemple: ./setup-github.sh christopher"
    exit 1
fi

USERNAME=$1
REPO_NAME="rentanoo-nosy-be"

echo "🔧 Configuration du remote GitHub..."
echo "   Repo: $USERNAME/$REPO_NAME"
echo ""

# Vérifier si le remote existe déjà
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Le remote 'origin' existe déjà:"
    git remote -v
    read -p "Voulez-vous le remplacer? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "❌ Annulé"
        exit 1
    fi
fi

# Ajouter le remote
echo "➕ Ajout du remote origin..."
git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"

echo ""
echo "✅ Remote configuré:"
git remote -v

echo ""
echo "📤 Poussage du code sur GitHub..."
echo "   (Vous devrez peut-être vous authentifier)"
echo ""

git push -u origin main

echo ""
echo "✅ Projet poussé sur GitHub avec succès!"
echo "   URL: https://github.com/$USERNAME/$REPO_NAME"
echo ""

