#!/bin/bash

# Script pour créer automatiquement le repo GitHub
# Utilise GitHub CLI si disponible, sinon l'API GitHub avec token

set -e

REPO_NAME="rentanoo-nosy-be"
REPO_DESCRIPTION="Plateforme de location de véhicules pour Nosy Be, Madagascar"
PRIVATE=true

echo "🚀 Création du repo GitHub: $REPO_NAME"
echo ""

# Méthode 1: Utiliser GitHub CLI si disponible
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI détecté"
    
    # Vérifier l'authentification
    if gh auth status &> /dev/null; then
        echo "✅ Authentifié avec GitHub CLI"
        echo ""
        echo "📦 Création du repo..."
        
        if [ "$PRIVATE" = true ]; then
            gh repo create "$REPO_NAME" \
                --private \
                --description "$REPO_DESCRIPTION" \
                --source=. \
                --remote=origin \
                --push
        else
            gh repo create "$REPO_NAME" \
                --public \
                --description "$REPO_DESCRIPTION" \
                --source=. \
                --remote=origin \
                --push
        fi
        
        echo ""
        echo "✅ Repo créé et code poussé avec succès!"
        gh repo view "$REPO_NAME" --web
        exit 0
    else
        echo "⚠️  GitHub CLI non authentifié"
        echo "   Exécutez: gh auth login"
        echo ""
    fi
fi

# Méthode 2: Utiliser l'API GitHub avec token
echo "📝 Méthode alternative: API GitHub"
echo ""
read -p "Avez-vous un Personal Access Token GitHub? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📚 Pour créer un token:"
    echo "   1. Allez sur https://github.com/settings/tokens"
    echo "   2. Cliquez sur 'Generate new token (classic)'"
    echo "   3. Cochez 'repo' pour les permissions"
    echo "   4. Copiez le token généré"
    echo ""
    echo "Ou installez GitHub CLI:"
    echo "   brew install gh"
    echo "   gh auth login"
    exit 1
fi

read -sp "Collez votre token GitHub: " GITHUB_TOKEN
echo ""

# Récupérer le username
USERNAME=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -o '"login":"[^"]*' | cut -d'"' -f4)

if [ -z "$USERNAME" ]; then
    echo "❌ Erreur: Token invalide ou expiré"
    exit 1
fi

echo "✅ Authentifié en tant que: $USERNAME"
echo ""

# Créer le repo via API
echo "📦 Création du repo via API GitHub..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d "{
        \"name\": \"$REPO_NAME\",
        \"description\": \"$REPO_DESCRIPTION\",
        \"private\": $PRIVATE
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Repo créé avec succès!"
    echo ""
    
    # Ajouter le remote et pousser
    if ! git remote get-url origin &>/dev/null; then
        git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
    else
        git remote set-url origin "https://github.com/$USERNAME/$REPO_NAME.git"
    fi
    
    echo "📤 Poussage du code..."
    git push -u origin main
    
    echo ""
    echo "✅ Projet poussé sur GitHub!"
    echo "   URL: https://github.com/$USERNAME/$REPO_NAME"
    echo ""
    echo "🌐 Ouverture dans le navigateur..."
    open "https://github.com/$USERNAME/$REPO_NAME"
else
    echo "❌ Erreur lors de la création du repo"
    echo "Code HTTP: $HTTP_CODE"
    echo "Réponse: $BODY"
    exit 1
fi

