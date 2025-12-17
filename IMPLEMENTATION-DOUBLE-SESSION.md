# Implémentation : Double Session Client vs Propriétaire

## 📋 Résumé

**Problème résolu** : Les sessions client et propriétaire se remplaçaient mutuellement car elles partageaient la même clé de stockage dans `localStorage`.

**Solution** : Isolation des sessions via `storageKey` dynamique dans le client Supabase, basé sur une variable d'environnement `VITE_APP_CONTEXT`.

## 🔧 Modifications apportées

### 1. Client Supabase (`src/integrations/supabase/client.ts`)

**Avant :**
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Après :**
```typescript
// Détermine le contexte de l'application (tenant ou owner)
const APP_CONTEXT = import.meta.env.VITE_APP_CONTEXT || 'tenant';
const isValidContext = APP_CONTEXT === 'tenant' || APP_CONTEXT === 'owner';

// Extraction du project_ref depuis l'URL Supabase
const projectRefMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch ? projectRefMatch[1] : 'default';

// Clé de stockage isolée par contexte
const storageKey = `sb-${projectRef}-auth-token-${isValidContext ? APP_CONTEXT : 'tenant'}`;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: storageKey, // ← Isolation des sessions
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Changements :**
- ✅ Lecture de `VITE_APP_CONTEXT` (tenant/owner)
- ✅ Extraction automatique du `project-ref` depuis l'URL
- ✅ Génération d'une `storageKey` unique par contexte
- ✅ Validation et fallback sur "tenant" si invalide

### 2. Scripts de développement (`package.json`)

**Ajouté :**
```json
"dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
"dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013",
```

**Utilisation :**
```bash
# Terminal 1
npm run dev:tenant  # → http://localhost:3012 (contexte tenant)

# Terminal 2
npm run dev:owner    # → http://localhost:3013 (contexte owner)
```

## 🎯 Résultat

### Avant
- ❌ Une seule clé : `sb-<project-ref>-auth-token`
- ❌ Les deux instances partageaient la même session
- ❌ Connexion sur owner → déconnexion de tenant

### Après
- ✅ Deux clés distinctes :
  - `sb-<project-ref>-auth-token-tenant`
  - `sb-<project-ref>-auth-token-owner`
- ✅ Sessions complètement isolées
- ✅ Connexion simultanée possible sur les deux instances

## 🔍 Vérification

### Dans DevTools (Application → Local Storage)

**Instance tenant (localhost:3012) :**
```
sb-zykwfjxurwmputxwlkxs-auth-token-tenant: { access_token: "...", ... }
```

**Instance owner (localhost:3013) :**
```
sb-zykwfjxurwmputxwlkxs-auth-token-owner: { access_token: "...", ... }
```

Les deux clés coexistent sans collision.

## 📝 Notes importantes

1. **Compatibilité Windows** : Les scripts utilisent `cross-env` pour une compatibilité multiplateforme (Windows, macOS, Linux) :
   ```json
   "dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
   "dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013"
   ```

2. **Variable d'environnement optionnelle** : Si `VITE_APP_CONTEXT` n'est pas définie, l'app utilise "tenant" par défaut.

3. **Migration** : Les anciennes sessions (clé sans suffixe) ne seront plus utilisées. Il faudra se reconnecter sur chaque instance.

4. **Production** : Pour la production, définir `VITE_APP_CONTEXT` dans les variables d'environnement du déploiement selon l'instance.

## ✅ Tests à effectuer

Voir `GUIDE-DOUBLE-SESSION.md` pour la checklist complète de validation.

