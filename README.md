# Rentanoo Nosy Be

Plateforme de location de véhicules pour Nosy Be, Madagascar.

## 🚀 Projet

Ce projet est une duplication propre et indépendante du projet Lagon Car Share, adaptée spécifiquement pour Nosy Be.

## 📋 Prérequis

- Node.js >= 18.0.0
- npm ou yarn
- Compte Supabase configuré

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Copier le template d'environnement
cp scripts/env-template-nosy-be.txt .env

# Configurer les variables d'environnement dans .env
# (Voir scripts/env-template-nosy-be.txt pour la liste complète)
```

## 🏃 Développement

```bash
# Démarrer le serveur de développement
npm run dev

# Démarrer sur un port spécifique
npm run dev:renter  # Port 3000
npm run dev:3002    # Port 3002
```

## 📦 Build

```bash
# Build de production
npm run build

# Build de développement
npm run build:dev
```

## 🗄️ Base de données

Le projet utilise Supabase. La configuration se trouve dans le dossier `supabase/`.

Voir les fichiers `ETAPE-*.md` pour les instructions de duplication de la base de données.

## 📚 Structure du projet

```
├── src/              # Code source React/TypeScript
├── supabase/         # Configuration Supabase
├── scripts/          # Scripts de duplication et migration
├── public/           # Assets statiques
└── server/           # Backend Express
```

## 🔐 Sécurité

⚠️ **IMPORTANT**: Ne jamais commiter de fichiers `.env` ou contenant des secrets.

Le `.gitignore` est configuré pour exclure automatiquement :
- `.env*`
- `node_modules/`
- `dist/`

## 📝 Documentation

- `ETAPE-1-DUPLICATION-CODE.md` : Instructions de duplication du code
- `ETAPE-1-OFFICIELLE.md` : Guide officiel étape 1
- `SETUP-GITHUB.md` : Instructions pour configurer le repo GitHub
- `scripts/README-DUPLICATION.md` : Documentation des scripts de duplication

## 🚢 Déploiement

Le projet est configuré pour être déployé avec Nixpacks (voir `nixpacks.toml`).

## 📄 Licence

Propriétaire - Rentanoo
