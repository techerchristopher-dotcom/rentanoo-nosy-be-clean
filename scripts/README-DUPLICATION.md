# 📚 Scripts de Duplication du Projet

Ce dossier contient des scripts et outils pour faciliter la duplication du projet `rentanoo.yt` vers `rentanoo.com`.

## 📋 Fichiers disponibles

### 1. `diagnostic-duplication.js`
**Script de diagnostic automatique**

Collecte toutes les informations nécessaires avant la duplication :
- Fichiers de configuration présents
- Références au domaine `rentanoo.yt`
- Références au Project ID Supabase
- Buckets de storage utilisés
- Edge Functions présentes
- Appels aux Edge Functions

**Utilisation** :
```bash
node scripts/diagnostic-duplication.js
# ou
npm run diagnostic-duplication  # (si ajouté dans package.json)
```

**Sortie** : Affiche un rapport complet dans la console avec une checklist de vérification.

---

### 2. `duplicate-storage-buckets.sql`
**Script SQL pour dupliquer les buckets de storage**

Crée les buckets et leurs policies RLS dans le nouveau projet Supabase.

**Utilisation** :
1. Ouvrez le Dashboard Supabase du **NOUVEAU projet**
2. Allez dans **SQL Editor**
3. Copiez-collez le contenu de `duplicate-storage-buckets.sql`
4. Exécutez le script
5. Vérifiez que les buckets sont créés dans **Storage → Buckets**

**⚠️ Important** :
- Adaptez le script selon vos buckets réels
- Vérifiez les tailles de fichiers et MIME types
- Vérifiez si les buckets doivent être publics ou privés

---

### 3. `env-template-nosy-be.txt`
**Template de fichier d'environnement**

Template pour créer le fichier `.env.local` du nouveau projet.

**Utilisation** :
```bash
# Dans le nouveau projet
cp scripts/env-template-nosy-be.txt .env.local

# Puis éditez .env.local et remplacez toutes les valeurs [À_REMPLACER]
```

**⚠️ Important** :
- Ne commitez **JAMAIS** le fichier `.env.local` avec les vraies clés
- Ajoutez `.env.local` dans `.gitignore` si ce n'est pas déjà fait

---

## 🚀 Workflow recommandé

### Étape 1 : Diagnostic
```bash
node scripts/diagnostic-duplication.js
```

Notez toutes les informations affichées, notamment :
- Les buckets de storage à dupliquer
- Les Edge Functions à déployer
- Les variables d'environnement nécessaires

### Étape 2 : Préparation
1. Créez le nouveau projet Supabase
2. Récupérez les nouvelles clés (URL, anon key, service role key)
3. Créez le fichier `.env.local` à partir du template

### Étape 3 : Duplication Supabase
1. Dupliquez le schéma de base de données (voir `GUIDE-DUPLICATION-PROJET.md`)
2. Exécutez `duplicate-storage-buckets.sql` dans le nouveau projet
3. Déployez les Edge Functions

### Étape 4 : Configuration
1. Configurez OAuth Google dans le nouveau projet
2. Configurez les URLs de redirection
3. Configurez Stripe (webhooks)
4. Configurez le déploiement (Coolify)

### Étape 5 : Tests
Suivez la checklist de tests dans `GUIDE-DUPLICATION-PROJET.md`

---

## 📖 Documentation complète

Pour le guide complet étape par étape, consultez :
- **`GUIDE-DUPLICATION-PROJET.md`** (à la racine du projet)

---

## ⚠️ Points de vigilance

1. **Ne modifiez JAMAIS l'ancien projet** pendant la duplication
2. **Vérifiez toutes les variables d'environnement** avant de déployer
3. **Testez localement** avant de déployer en production
4. **Sauvegardez les clés** dans un gestionnaire de mots de passe sécurisé
5. **Documentez les différences** entre les deux projets si nécessaire

---

## 🆘 Support

En cas de problème :
1. Consultez les logs Supabase Dashboard
2. Consultez les logs de déploiement (Coolify)
3. Vérifiez que toutes les variables d'environnement sont correctes
4. Testez localement avec `npm run dev`
