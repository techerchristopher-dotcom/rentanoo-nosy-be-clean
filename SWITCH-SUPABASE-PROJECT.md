# 🔄 Guide de Switch entre Projets Supabase

**Date** : 2025-01-27  
**Projets disponibles** :
- `zykwfjxurwmputxwlkxs` — Rentanoo (projet principal)
- `tbsgzykqcksmqxpimwry` — rentanoo-nosy-be (projet alternatif)

---

## 📋 Projets Disponibles

### Projet 1 : Rentanoo (Principal)
- **Project Ref** : `zykwfjxurwmputxwlkxs`
- **URL** : `https://zykwfjxurwmputxwlkxs.supabase.co`
- **Nom** : Rentanoo
- **Région** : eu-west-3
- **Statut** : ACTIVE_HEALTHY

### Projet 2 : rentanoo-nosy-be (Alternatif)
- **Project Ref** : `tbsgzykqcksmqxpimwry`
- **URL** : `https://tbsgzykqcksmqxpimwry.supabase.co`
- **Nom** : rentanoo-nosy-be
- **Région** : eu-west-1
- **Statut** : ACTIVE_HEALTHY

---

## 🔧 Comment Switcher entre Projets

### Option 1 : Via la Configuration MCP (Recommandé)

#### Pour le projet principal (`zykwfjxurwmputxwlkxs`)

Modifier `~/.cursor/mcp.json` :
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=zykwfjxurwmputxwlkxs",
      "headers": {}
    }
  }
}
```

#### Pour le projet alternatif (`tbsgzykqcksmqxpimwry`)

Modifier `~/.cursor/mcp.json` :
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=tbsgzykqcksmqxpimwry",
      "headers": {}
    }
  }
}
```

**Important** : Redémarrer Cursor après modification.

---

### Option 2 : Via Rube/Composio (Sans Redémarrage)

Les outils Rube/Composio permettent de switcher entre projets **sans redémarrer Cursor**.

#### Utilisation dans les requêtes

Quand vous demandez de travailler sur un projet spécifique, je peux utiliser directement le `project_ref` dans les requêtes :

**Exemple pour le projet principal** :
```javascript
// Via Rube/Composio
ref: "zykwfjxurwmputxwlkxs"
```

**Exemple pour le projet alternatif** :
```javascript
// Via Rube/Composio
ref: "tbsgzykqcksmqxpimwry"
```

#### Avantages

- ✅ Pas besoin de redémarrer Cursor
- ✅ Switch instantané entre projets
- ✅ Les deux projets sont accessibles simultanément

---

### Option 3 : Via les Variables d'Environnement

#### Pour le projet principal

Créer/modifier `.env.local` :
```bash
VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
VITE_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]
```

#### Pour le projet alternatif

Créer/modifier `.env.local` :
```bash
VITE_SUPABASE_URL=https://tbsgzykqcksmqxpimwry.supabase.co
VITE_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]
```

---

### Option 4 : Via `supabase/config.toml`

#### Pour le projet principal

Modifier `supabase/config.toml` :
```toml
project_id = "zykwfjxurwmputxwlkxs"
```

#### Pour le projet alternatif

Modifier `supabase/config.toml` :
```toml
project_id = "tbsgzykqcksmqxpimwry"
```

---

## 🎯 Comment Demander un Switch

### Pour travailler sur le projet principal

Dites simplement :
- "Travaille sur le projet Rentanoo"
- "Utilise le projet zykwfjxurwmputxwlkxs"
- "Switch vers le projet principal"

### Pour travailler sur le projet alternatif

Dites simplement :
- "Travaille sur le projet tbsgzykqcksmqxpimwry"
- "Utilise le projet rentanoo-nosy-be"
- "Switch vers tbsgzykqcksmqxpimwry"

---

## ✅ Vérification du Projet Actif

### Via le Script de Vérification

```bash
npm run verify:supabase
```

Le script vérifie :
- Le `project_id` dans `supabase/config.toml`
- Les variables d'environnement dans `.env.local`

### Via les Requêtes Supabase

Je peux vérifier le projet actif en listant les tables ou en exécutant une requête simple.

---

## 📝 Notes Importantes

1. **Configuration MCP** : Le fichier `~/.cursor/mcp.json` contrôle quel projet est utilisé par défaut par les outils MCP Supabase natifs.

2. **Rube/Composio** : Les outils Rube/Composio permettent d'accéder aux deux projets simultanément en spécifiant le `ref` dans chaque requête.

3. **Variables d'environnement** : Les variables d'environnement (`VITE_SUPABASE_URL`) contrôlent quel projet est utilisé par l'application frontend.

4. **Fichier config.toml** : Le fichier `supabase/config.toml` est utilisé par la CLI Supabase locale.

---

## 🔄 Workflow Recommandé

### Pour le Développement Quotidien

1. **Utiliser Rube/Composio** : Je peux switcher entre projets instantanément sans redémarrer Cursor
2. **Spécifier le projet** : Dites-moi simplement sur quel projet travailler
3. **Vérification** : Je vérifie automatiquement le projet actif avant chaque opération

### Pour les Tests/Staging

1. **Modifier `.env.local`** : Changer les variables d'environnement
2. **Redémarrer l'application** : Pour que les changements prennent effet
3. **Tester** : Vérifier que l'application se connecte au bon projet

---

## 🚨 Troubleshooting

### Le switch ne fonctionne pas

1. **Vérifier la configuration MCP** : `~/.cursor/mcp.json`
2. **Redémarrer Cursor** : Après modification de `mcp.json`
3. **Vérifier les variables d'environnement** : `.env.local`
4. **Utiliser Rube/Composio** : Alternative qui ne nécessite pas de redémarrage

### Confusion entre projets

1. **Vérifier le project_ref** : Dans chaque requête, je spécifie le `ref` utilisé
2. **Vérifier les résultats** : Les tables/listes retournées indiquent le projet actif
3. **Demander confirmation** : N'hésitez pas à demander sur quel projet je travaille

---

**✅ Les deux projets sont maintenant accessibles et je peux switcher entre eux à votre demande !**

