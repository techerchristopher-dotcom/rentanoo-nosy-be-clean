# 🔧 Configuration MCP Supabase pour Cursor

## ⚠️ Problème Actuel

La connexion MCP Supabase dans Cursor pointe actuellement vers le **mauvais projet** :
- ❌ Projet connecté : `slkgokhcaflhdfcqlucp`
- ✅ Projet attendu : `zykwfjxurwmputxwlkxs` (rentanoo.yt)

## 📋 Vérifications Effectuées

### ✅ Fichiers du Repository (Corrects)

1. **`supabase/config.toml`** :
   ```toml
   project_id = "zykwfjxurwmputxwlkxs"
   ```
   ✅ **CORRECT**

2. **Code du repository** :
   - Toutes les références pointent vers `zykwfjxurwmputxwlkxs` ✅
   - Aucune référence à `slkgokhcaflhdfcqlucp` trouvée ✅

### ❌ Configuration MCP Supabase dans Cursor (Incorrecte)

La configuration MCP Supabase est stockée dans les **paramètres de Cursor**, pas dans le repository.

## 🔧 Comment Corriger

### Option 1 : Via les Paramètres Cursor (Recommandé)

1. **Ouvrir les paramètres Cursor** :
   - `Cmd + ,` (Mac) ou `Ctrl + ,` (Windows/Linux)
   - Ou : `Cursor` → `Settings` → `Features` → `Model Context Protocol`

2. **Localiser la configuration MCP Supabase** :
   - Chercher "MCP" ou "Supabase" dans les paramètres
   - Ou chercher le fichier de configuration MCP

3. **Mettre à jour la configuration** :
   - **Project Ref** : `zykwfjxurwmputxwlkxs`
   - **URL** : `https://zykwfjxurwmputxwlkxs.supabase.co`
   - **API Key** : Votre Service Role Key (depuis le dashboard Supabase)

4. **Redémarrer Cursor** pour que les changements prennent effet.

### Option 2 : Via les Variables d'Environnement Système

Si la configuration MCP utilise des variables d'environnement :

```bash
export SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
export SUPABASE_PROJECT_REF=zykwfjxurwmputxwlkxs
```

Puis redémarrer Cursor.

## ✅ Vérification Après Correction

Une fois la configuration corrigée, exécuter :

```bash
npm run verify:supabase
```

Ou manuellement, vérifier que :
1. `get_project_url()` retourne : `https://zykwfjxurwmputxwlkxs.supabase.co`
2. Les tables listées correspondent au schéma Rentanoo (ou aucune table si le projet est vide)

## 📝 Fichiers Créés pour Aider

1. **`.cursorrules`** : Règles Cursor pour rappeler le bon projet
2. **`scripts/verify-supabase-connection.js`** : Script de vérification de la connexion
3. **`ETAPE-3-CORRECTION-CONNEXION-MCP.md`** : Guide détaillé de correction

## 🚨 Important

**Ne pas générer ni exécuter de SQL de migration tant que la connexion n'est pas corrigée et vérifiée.**

Une fois la connexion corrigée :
1. ✅ Exécuter les requêtes de preuve
2. ✅ Confirmer que l'URL est `https://zykwfjxurwmputxwlkxs.supabase.co`
3. ✅ Refaire le diagnostic complet du schéma sur le **bon projet**
4. ✅ Générer le plan de recréation du schéma (sans données)
5. ✅ Exécuter le script SQL de création du schéma

---

**Voir `ETAPE-3-CORRECTION-CONNEXION-MCP.md` pour plus de détails.**

