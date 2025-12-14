# 🚀 ÉTAPE 1 OFFICIELLE : Duplication Safe

**Script 100% sécurisé, automatique, sans interaction manuelle**

---

## ✅ COMMANDES EXACTES À EXÉCUTER

```bash
cd "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/lagon-car-share"
./scripts/etape1-duplication-safe.sh
./scripts/validation-etape1.sh
```

**C'est tout !** Le script fait tout automatiquement.

---

## 🔒 GARANTIES DE SÉCURITÉ

Le script `etape1-duplication-safe.sh` garantit :

1. ✅ **Positionnement explicite** dans le bon dossier (pas de dépendance à `~`)
2. ✅ **Exclusion stricte** des fichiers `.env*` lors de la copie (`rsync --exclude`)
3. ✅ **Vérification .gitignore** AVANT `git add`
4. ✅ **Contrôles bloquants** AVANT commit :
   - `git diff --cached --name-only | grep -E '\.env'` → doit être vide
   - `git ls-files | grep -E '\.env'` → doit être vide
5. ✅ **Arrêt immédiat** si un secret est détecté
6. ✅ **Validation automatique** après création du commit

---

## 📋 CE QUE FAIT LE SCRIPT

### Étape 1/8 : Positionnement
- Se place explicitement dans `/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub`
- Vérifie que `lagon-car-share` existe

### Étape 2/8 : Nettoyage
- Supprime `rentanoo-nosy-be` s'il existe déjà

### Étape 3/8 : Copie sécurisée
- Utilise `rsync` avec exclusions strictes :
  - `.git`
  - `node_modules`
  - `dist`
  - `.env`
  - `.env.local`
  - `.env.*`
- Vérifie qu'aucun `.env` n'a été copié

### Étape 4/8 : Sécurisation .gitignore
- Ajoute les règles `.env` si absentes
- Vérifie que les règles sont présentes

### Étape 5/8 : Initialisation Git
- `git init`
- Branche `main`

### Étape 6/8 : Contrôles bloquants
- Vérifie qu'aucun `.env` n'est dans le staging
- Vérifie qu'aucun `.env` n'est tracké
- **ARRÊT IMMÉDIAT** si un secret est détecté

### Étape 7/8 : Commit initial
- Message : "Initial commit: duplication Rentanoo Nosy Be"

### Étape 8/8 : Validation finale
- Vérifie qu'aucun `.env` n'est dans le commit
- Affiche un résumé complet

---

## 🎯 RÉSULTAT ATTENDU

Après exécution, vous verrez :

```
╔════════════════════════════════════════════════════════╗
║  ✅ ÉTAPE 1 TERMINÉE AVEC SUCCÈS                       ║
╚════════════════════════════════════════════════════════╝

📁 Chemin du projet :
   /Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub/rentanoo-nosy-be

📊 Statistiques :
   ✅ Fichiers trackés : [nombre]
   ✅ Fichiers .env trackés : 0
   ✅ Fichiers .env dans staging : 0
   ✅ Fichiers .env dans commit : 0
   ✅ Remotes configurés : 0

🔒 Sécurité :
   ✅ Aucun .env copié
   ✅ Aucun .env tracké
   ✅ Aucun .env dans le commit
   ✅ Aucun remote configuré

ÉTAPE 1 VALIDÉE — Prêt pour l'étape 2 (Supabase)
```

---

## 🚨 EN CAS D'ERREUR

### Erreur : "Des fichiers .env sont dans le staging"

Le script s'arrête automatiquement avec un message clair :

```
╔════════════════════════════════════════════════════════╗
║  ❌ ERREUR CRITIQUE : SECRETS DÉTECTÉS !            ║
╚════════════════════════════════════════════════════════╝
```

**Action** : Suivez les instructions affichées. Le commit n'a **PAS** été créé.

### Erreur : "Le dossier parent n'existe pas"

Vérifiez que le chemin est correct :
```bash
ls -la "/Users/christopher/Desktop/FORMATION/projet web/rentanoo/Codesource/GIthub"
```

### Erreur : "rsync n'est pas installé"

Installez rsync :
```bash
brew install rsync
```

---

## ✅ VALIDATION FINALE

Le script de validation (`validation-etape1.sh`) vérifie :

- [ ] `.git` existe
- [ ] Aucun remote configuré
- [ ] Aucun `.env` tracké
- [ ] Aucun `.env` dans le staging
- [ ] Aucun `.env` dans le dernier commit
- [ ] `.gitignore` contient `.env`
- [ ] Fichiers essentiels présents
- [ ] Au moins un commit existe

**Résultat attendu** : `✅ VALIDATION RÉUSSIE`

---

## 🎯 PROCHAINES ÉTAPES

Une fois l'étape 1 validée :

1. ✅ Consultez `GUIDE-DUPLICATION-PROJET.md` pour l'étape 2
2. ✅ Créez la nouvelle instance Supabase
3. ✅ Dupliquez le schéma de base de données

---

**Document créé le** : 2025  
**Script** : `scripts/etape1-duplication-safe.sh`  
**Validation** : `scripts/validation-etape1.sh`
