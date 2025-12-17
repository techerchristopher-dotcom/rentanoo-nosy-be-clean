# Guide : Configuration Double Session (Client vs Propriétaire)

## 🚀 Démarrage rapide

### 1. Configuration des variables d'environnement

Créez ou modifiez votre fichier `.env.local` :

```bash
# Configuration Supabase
VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Contexte de l'application pour l'isolation des sessions
# Valeurs possibles: "tenant" (client/locataire) ou "owner" (propriétaire)
# Cette variable permet d'avoir deux sessions actives simultanément sur des ports différents
# - Instance tenant (port 3012): VITE_APP_CONTEXT=tenant
# - Instance owner (port 3013): VITE_APP_CONTEXT=owner
# Par défaut: "tenant" si non défini
VITE_APP_CONTEXT=tenant
```

### 2. Lancer les deux instances

**Terminal 1 - Instance Client (Locataire) :**
```bash
npm run dev:tenant
```
→ Ouvre sur `http://localhost:3012` avec contexte `tenant`

**Terminal 2 - Instance Propriétaire :**
```bash
npm run dev:owner
```
→ Ouvre sur `http://localhost:3013` avec contexte `owner`

## 🔧 Comment ça fonctionne

### Isolation des sessions

Le système utilise le paramètre `storageKey` de Supabase pour isoler les sessions dans `localStorage` :

- **Instance tenant** : Clé `sb-<project-ref>-auth-token-tenant`
- **Instance owner** : Clé `sb-<project-ref>-auth-token-owner`

Chaque instance lit/écrit dans sa propre clé, donc les sessions ne se remplacent plus.

### Fichiers modifiés

1. **`src/integrations/supabase/client.ts`**
   - Ajout de la logique `storageKey` dynamique basée sur `VITE_APP_CONTEXT`
   - Extraction automatique du `project-ref` depuis l'URL Supabase

2. **`package.json`**
   - Ajout des scripts `dev:tenant` et `dev:owner`
   - Chaque script définit `VITE_APP_CONTEXT` et un port différent

## ✅ Checklist de validation

### Test 1 : Connexion simultanée
- [ ] Ouvrir `http://localhost:3012` (tenant)
- [ ] Ouvrir `http://localhost:3013` (owner)
- [ ] Se connecter sur tenant avec un compte `renter@demo.fr`
- [ ] Se connecter sur owner avec un compte `owner@demo.fr`
- [ ] Vérifier que les deux sessions sont actives

### Test 2 : Persistance après rafraîchissement
- [ ] Rafraîchir la page tenant (F5) → reste connecté
- [ ] Rafraîchir la page owner (F5) → reste connecté
- [ ] Les deux sessions restent actives

### Test 3 : Isolation des déconnexions
- [ ] Se déconnecter de tenant → owner reste connecté
- [ ] Se déconnecter de owner → tenant reste connecté

### Test 4 : Vérification localStorage
Ouvrir DevTools → Application → Local Storage → `http://localhost:3012` :
- [ ] Clé `sb-<project-ref>-auth-token-tenant` présente avec session

Ouvrir DevTools → Application → Local Storage → `http://localhost:3013` :
- [ ] Clé `sb-<project-ref>-auth-token-owner` présente avec session
- [ ] Les deux clés sont distinctes et contiennent des sessions différentes

## 🐛 Dépannage

### Problème : Les sessions se remplacent encore

**Solution :**
1. Vérifier que `VITE_APP_CONTEXT` est bien défini dans chaque terminal
2. Vider le localStorage et se reconnecter :
   ```javascript
   // Dans la console du navigateur
   localStorage.clear();
   location.reload();
   ```
3. Vérifier dans DevTools que les clés sont bien distinctes

### Problème : Erreur "VITE_APP_CONTEXT invalide"

**Solution :**
- La variable doit être exactement `tenant` ou `owner` (minuscules)
- Vérifier qu'il n'y a pas d'espaces : `VITE_APP_CONTEXT=tenant` (pas `VITE_APP_CONTEXT= tenant`)

### Problème : Port déjà utilisé

**Solution :**
Modifier les ports dans `package.json` :
```json
"dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
"dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013",
```

## 📝 Notes techniques

- Les sessions sont isolées au niveau du `localStorage`, pas au niveau des cookies
- Chaque instance (port différent) a son propre `localStorage` de toute façon, mais le `storageKey` garantit l'isolation même si on utilisait le même port
- Le `project-ref` est extrait automatiquement depuis `VITE_SUPABASE_URL`
- Par défaut, si `VITE_APP_CONTEXT` n'est pas défini, l'app utilise `tenant`

## 🔄 Migration depuis l'ancien système

Si vous aviez des sessions actives avant cette modification :
1. Les anciennes sessions (clé `sb-<project-ref>-auth-token`) ne seront plus utilisées
2. Il faudra se reconnecter sur chaque instance
3. Les anciennes clés peuvent être supprimées manuellement du localStorage si besoin

