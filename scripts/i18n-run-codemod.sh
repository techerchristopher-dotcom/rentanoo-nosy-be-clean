#!/bin/bash

# Script wrapper pour exécuter le codemod i18n de manière sécurisée
# Usage: ./scripts/i18n-run-codemod.sh [target_directory] [--dry-run]

set -e

CODEMOD_PATH="codemods/i18n-transform.js"
TARGET="${1:-src}"
DRY_RUN="${2:-}"

if [ ! -f "$CODEMOD_PATH" ]; then
  echo "❌ Erreur: Le fichier codemod $CODEMOD_PATH n'existe pas"
  exit 1
fi

if [ ! -d "$TARGET" ]; then
  echo "❌ Erreur: Le répertoire $TARGET n'existe pas"
  exit 1
fi

echo "🔍 Exécution du codemod i18n sur: $TARGET"

if [ "$DRY_RUN" = "--dry-run" ]; then
  echo "🧪 Mode dry-run (aucune modification ne sera effectuée)"
  jscodeshift -t "$CODEMOD_PATH" "$TARGET" --dry --print
else
  echo "⚠️  Mode réel: les fichiers seront modifiés"
  echo "📝 Assurez-vous d'avoir fait un commit Git avant de continuer"
  read -p "Continuer? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    jscodeshift -t "$CODEMOD_PATH" "$TARGET"
    echo "✅ Codemod terminé!"
    echo "📋 N'oubliez pas de:"
    echo "   1. Vérifier les changements avec git diff"
    echo "   2. Lancer npm run i18n:extract pour extraire les nouvelles clés"
    echo "   3. Compléter les traductions dans src/i18n/locales/"
  else
    echo "❌ Opération annulée"
  fi
fi

