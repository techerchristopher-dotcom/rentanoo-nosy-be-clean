#!/bin/bash
# Script pour switcher entre projets Supabase
# Usage: ./scripts/switch-supabase-project.sh [zykwfjxurwmputxwlkxs|tbsgzykqcksmqxpimwry]

set -e

PROJECT_1_REF="zykwfjxurwmputxwlkxs"
PROJECT_1_NAME="Rentanoo"
PROJECT_1_URL="https://zykwfjxurwmputxwlkxs.supabase.co"

PROJECT_2_REF="tbsgzykqcksmqxpimwry"
PROJECT_2_NAME="rentanoo-nosy-be"
PROJECT_2_URL="https://tbsgzykqcksmqxpimwry.supabase.co"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_CONFIG="$HOME/.cursor/mcp.json"
SUPABASE_CONFIG="$REPO_ROOT/supabase/config.toml"

# Fonction d'aide
show_help() {
    echo "Usage: $0 [PROJECT_REF]"
    echo ""
    echo "Projets disponibles:"
    echo "  $PROJECT_1_REF  - $PROJECT_1_NAME"
    echo "  $PROJECT_2_REF  - $PROJECT_2_NAME"
    echo ""
    echo "Exemples:"
    echo "  $0 $PROJECT_1_REF"
    echo "  $0 $PROJECT_2_REF"
    echo ""
    echo "Si aucun argument n'est fourni, affiche le projet actuel."
}

# Afficher le projet actuel
show_current() {
    echo "🔍 Projet actuel :"
    echo ""
    
    if [ -f "$SUPABASE_CONFIG" ]; then
        CURRENT_PROJECT=$(grep -E '^project_id\s*=' "$SUPABASE_CONFIG" | sed 's/.*"\(.*\)".*/\1/' || echo "non trouvé")
        echo "  supabase/config.toml: $CURRENT_PROJECT"
    else
        echo "  supabase/config.toml: fichier non trouvé"
    fi
    
    if [ -f "$MCP_CONFIG" ]; then
        CURRENT_MCP=$(grep -oE 'project_ref=[^"]+' "$MCP_CONFIG" | sed 's/project_ref=//' || echo "non trouvé")
        echo "  ~/.cursor/mcp.json: $CURRENT_MCP"
    else
        echo "  ~/.cursor/mcp.json: fichier non trouvé"
    fi
    
    if [ -f "$REPO_ROOT/.env.local" ]; then
        CURRENT_ENV=$(grep -E '^VITE_SUPABASE_URL=' "$REPO_ROOT/.env.local" | sed 's/.*\/\/\([^.]*\)\.supabase\.co.*/\1/' || echo "non trouvé")
        echo "  .env.local: $CURRENT_ENV"
    else
        echo "  .env.local: fichier non trouvé"
    fi
}

# Switcher vers un projet
switch_project() {
    local PROJECT_REF=$1
    local PROJECT_NAME
    local PROJECT_URL
    
    if [ "$PROJECT_REF" = "$PROJECT_1_REF" ]; then
        PROJECT_NAME="$PROJECT_1_NAME"
        PROJECT_URL="$PROJECT_1_URL"
    elif [ "$PROJECT_REF" = "$PROJECT_2_REF" ]; then
        PROJECT_NAME="$PROJECT_2_NAME"
        PROJECT_URL="$PROJECT_2_URL"
    else
        echo "❌ Projet inconnu: $PROJECT_REF"
        show_help
        exit 1
    fi
    
    echo "🔄 Switch vers le projet: $PROJECT_NAME ($PROJECT_REF)"
    echo ""
    
    # 1. Mettre à jour supabase/config.toml
    if [ -f "$SUPABASE_CONFIG" ]; then
        echo "1️⃣ Mise à jour de supabase/config.toml..."
        sed -i.bak "s/project_id = \".*\"/project_id = \"$PROJECT_REF\"/" "$SUPABASE_CONFIG"
        echo "   ✅ project_id = \"$PROJECT_REF\""
    else
        echo "   ⚠️  Fichier supabase/config.toml non trouvé"
    fi
    
    # 2. Mettre à jour ~/.cursor/mcp.json
    if [ -f "$MCP_CONFIG" ]; then
        echo "2️⃣ Mise à jour de ~/.cursor/mcp.json..."
        # Créer une sauvegarde
        cp "$MCP_CONFIG" "$MCP_CONFIG.bak"
        # Mettre à jour le project_ref
        sed -i.bak "s|project_ref=[^\"]*|project_ref=$PROJECT_REF|g" "$MCP_CONFIG"
        echo "   ✅ URL mise à jour avec project_ref=$PROJECT_REF"
        echo "   ⚠️  Redémarrez Cursor pour que les changements prennent effet"
    else
        echo "   ⚠️  Fichier ~/.cursor/mcp.json non trouvé"
    fi
    
    # 3. Mettre à jour .env.local (si existe)
    if [ -f "$REPO_ROOT/.env.local" ]; then
        echo "3️⃣ Mise à jour de .env.local..."
        sed -i.bak "s|VITE_SUPABASE_URL=https://[^.]*\.supabase\.co|VITE_SUPABASE_URL=$PROJECT_URL|g" "$REPO_ROOT/.env.local"
        echo "   ✅ VITE_SUPABASE_URL = $PROJECT_URL"
    else
        echo "   ⚠️  Fichier .env.local non trouvé (créer avec les bonnes valeurs)"
    fi
    
    echo ""
    echo "✅ Switch terminé !"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Redémarrer Cursor (si mcp.json a été modifié)"
    echo "   2. Vérifier avec: npm run verify:supabase"
    echo ""
}

# Script principal
if [ $# -eq 0 ]; then
    show_current
elif [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
else
    switch_project "$1"
fi

