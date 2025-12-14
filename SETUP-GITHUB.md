# Instructions pour créer le repo GitHub

## 1. Créer le repo sur GitHub

1. Aller sur https://github.com/new
2. Nom du repo : `rentanoo-nosy-be`
3. Visibilité : **Privée** (recommandé) ou Publique
4. **NE PAS** initialiser avec README, .gitignore ou licence
5. Cliquer sur "Create repository"

## 2. Configurer le remote et pousser

Une fois le repo créé, exécuter ces commandes dans le terminal :

```bash
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be-clean"

# Remplacer YOUR_USERNAME par votre nom d'utilisateur GitHub
git remote add origin https://github.com/YOUR_USERNAME/rentanoo-nosy-be.git

# Ou si vous utilisez SSH :
# git remote add origin git@github.com:YOUR_USERNAME/rentanoo-nosy-be.git

git push -u origin main
```

## 3. Vérification

```bash
git remote -v
git branch
git status
```

