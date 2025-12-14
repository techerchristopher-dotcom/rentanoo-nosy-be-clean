# 🔧 Correction de la Connexion MCP Supabase

**Date** : 2025-01-27  
**Problème** : La connexion MCP Supabase pointe vers le mauvais projet  
**Projet attendu** : `zykwfjxurwmputxwlkxs` (rentanoo.yt)  
**Projet actuellement connecté** : `slkgokhcaflhdfcqlucp` ❌

---

## 📋 ÉTAPE A — Identification de la Source du Problème

### ✅ Vérifications Effectuées

#### 1. Fichiers du Repository

**✅ `supabase/config.toml`** :
```toml
project_id = "zykwfjxurwmputxwlkxs"
```
✅ **CORRECT** — Le fichier pointe vers le bon projet.

**✅ Recherche dans le code** :
- Aucune référence à `slkgokhcaflhdfcqlucp` trouvée dans le repo
- Toutes les références pointent vers `zykwfjxurwmputxwlkxs` ✅
- Aucun fichier `.env` trouvé dans le repo (probablement dans `.gitignore`)

#### 2. Connexion MCP Supabase (via Cursor)

**❌ URL actuelle** :
```
https://slkgokhcaflhdfcqlucp.supabase.co
```

**✅ URL attendue** :
```
https://zykwfjxurwmputxwlkxs.supabase.co
```

#### 3. Preuve de la Mauvaise Connexion

**Requêtes de vérification** :

1. **Project URL** :
   ```sql
   -- Résultat : https://slkgokhcaflhdfcqlucp.supabase.co ❌
   ```

2. **Tables existantes** :
   - `salaries` (5 lignes) — Table non liée à Rentanoo
   - `conversations` (32 lignes) — Schéma différent de celui attendu
   - `companies_stats`, `n8n_company`, etc. — Tables non liées à Rentanoo
   - ❌ **Aucune table Rentanoo** (`bookings`, `profiles`, `vehicles`, etc.)

3. **Buckets Storage** :
   - `companies-imports` — Bucket non lié à Rentanoo
   - ❌ **Aucun bucket Rentanoo** (`vehicle-photos`, `checkin-photos`, etc.)

### 🎯 Conclusion

**Le problème vient de la configuration MCP Supabase dans Cursor**, pas du repository.

La configuration MCP est stockée dans les **paramètres de Cursor** (pas dans le repo), probablement dans :
- Fichier de configuration MCP de Cursor (généralement dans `~/.cursor/` ou dans les paramètres de l'application)
- Variables d'environnement système
- Configuration du serveur MCP Supabase

---

## 🔧 ÉTAPE B — Correction de la Connexion

### Option 1 : Via les Paramètres Cursor (Recommandé)

1. **Ouvrir les paramètres Cursor** :
   - `Cmd + ,` (Mac) ou `Ctrl + ,` (Windows/Linux)
   - Ou : `Cursor` → `Settings` → `Features` → `Model Context Protocol`

2. **Localiser la configuration MCP Supabase** :
   - Chercher "MCP" ou "Supabase" dans les paramètres
   - Ou chercher le fichier de configuration MCP (généralement `mcp.json` ou similaire)

3. **Mettre à jour la configuration** :
   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://zykwfjxurwmputxwlkxs.supabase.co",
         "projectRef": "zykwfjxurwmputxwlkxs",
         "apiKey": "[VOTRE_SERVICE_ROLE_KEY]"
       }
     }
   }
   ```

### Option 2 : Via les Variables d'Environnement

Si la configuration MCP utilise des variables d'environnement :

1. **Vérifier les variables d'environnement système** :
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_PROJECT_REF
   ```

2. **Définir les bonnes variables** :
   ```bash
   export SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
   export SUPABASE_PROJECT_REF=zykwfjxurwmputxwlkxs
   ```

3. **Redémarrer Cursor** pour que les changements prennent effet.

### Option 3 : Via le Fichier de Configuration MCP

Si vous avez accès au fichier de configuration MCP :

1. **Localiser le fichier** (généralement dans `~/.cursor/mcp.json` ou similaire)

2. **Mettre à jour** :
   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://zykwfjxurwmputxwlkxs.supabase.co",
         "projectRef": "zykwfjxurwmputxwlkxs"
       }
     }
   }
   ```

3. **Redémarrer Cursor**

---

## ✅ ÉTAPE C — Vérification de la Correction

### Requêtes de Preuve

Une fois la configuration corrigée, exécuter ces requêtes pour vérifier :

#### 1. Vérifier l'URL du Projet

```sql
-- Via MCP : mcp_supabase_get_project_url
-- Résultat attendu : https://zykwfjxurwmputxwlkxs.supabase.co
```

#### 2. Lister les Tables (5 premières)

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name 
LIMIT 5;
```

**Résultat attendu** (si le bon projet est vide) :
- Aucune table ou seulement les tables système

**Résultat attendu** (si le bon projet a déjà des tables Rentanoo) :
- `bookings`
- `profiles`
- `vehicles`
- `conversations`
- `messages`
- etc.

#### 3. Lister les Buckets Storage

```sql
SELECT id, name, public 
FROM storage.buckets 
ORDER BY name 
LIMIT 5;
```

**Résultat attendu** (si le bon projet est vide) :
- Aucun bucket ou seulement les buckets système

**Résultat attendu** (si le bon projet a déjà des buckets Rentanoo) :
- `vehicle-photos`
- `checkin-photos`
- `driver-licenses`
- `avatars`
- etc.

### ✅ Critères de Succès

La connexion est correcte si :

1. ✅ `get_project_url()` retourne : `https://zykwfjxurwmputxwlkxs.supabase.co`
2. ✅ Les tables listées correspondent au schéma Rentanoo (ou aucune table si le projet est vide)
3. ✅ Les buckets listés correspondent aux buckets Rentanoo (ou aucun bucket si le projet est vide)

---

## 🚨 Si la Correction Ne Fonctionne Pas

### Vérifications Supplémentaires

1. **Vérifier les variables d'environnement du système** :
   ```bash
   env | grep -i supabase
   ```

2. **Vérifier les fichiers de configuration cachés** :
   ```bash
   find ~ -name "*mcp*" -o -name "*supabase*" 2>/dev/null | grep -i config
   ```

3. **Vérifier les paramètres Cursor** :
   - Ouvrir les paramètres Cursor
   - Chercher "MCP" ou "Supabase"
   - Vérifier toutes les occurrences

4. **Redémarrer Cursor complètement** :
   - Fermer toutes les fenêtres Cursor
   - Redémarrer l'application
   - Réessayer les requêtes

### Contact Support

Si le problème persiste :
- Vérifier la documentation MCP Supabase
- Vérifier les logs Cursor pour les erreurs de connexion
- Contacter le support Cursor si nécessaire

---

## 📝 Notes Importantes

1. **Ne jamais modifier le fichier `supabase/config.toml`** — Il est déjà correct ✅
2. **Ne jamais commiter les clés API** — Les variables d'environnement doivent rester locales
3. **Redémarrer Cursor après modification** — Les changements de configuration MCP nécessitent un redémarrage

---

## 🔄 Prochaines Étapes

Une fois la connexion corrigée :

1. ✅ Exécuter les requêtes de preuve (ÉTAPE C)
2. ✅ Confirmer que l'URL est `https://zykwfjxurwmputxwlkxs.supabase.co`
3. ✅ Refaire le diagnostic complet du schéma sur le **bon projet**
4. ✅ Générer le plan de recréation du schéma (sans données)
5. ✅ Exécuter le script SQL de création du schéma

---

**⚠️ IMPORTANT** : Ne pas générer ni exécuter de SQL de migration tant que la connexion n'est pas corrigée et vérifiée.

