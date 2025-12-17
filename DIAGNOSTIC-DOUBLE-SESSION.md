# Diagnostic : Double Session Client vs Propriétaire

## 🔍 A) Diagnostic de l'authentification actuelle

### 1. Gestion des tokens/sessions

**Stack d'authentification :**
- **Bibliothèque** : Supabase Auth (`@supabase/supabase-js`)
- **Stockage** : `localStorage` (configuré dans `src/integrations/supabase/client.ts`)
- **Format des clés** : Supabase utilise des clés par défaut comme `sb-<project-ref>-auth-token`

**Fichiers clés identifiés :**
- `src/integrations/supabase/client.ts` : Création du client Supabase avec config auth
- `src/contexts/AuthContext.tsx` : Context React pour l'auth
- `src/hooks/use-auth-store.ts` : Hook personnalisé pour l'auth
- `src/pages/auth/Login.tsx` : Page de connexion
- `src/components/layout/navbar.tsx` : Déconnexion via `signOut()`

**Configuration actuelle :**
```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### 2. Distinction Client vs Propriétaire

**Rôles dans l'app :**
- Type `Role = "renter" | "owner" | "admin"` (défini dans `src/types/index.ts`)
- Les rôles sont stockés dans la table `profiles` (champ `role`)
- Vérification des rôles via `UserRoleUtils.hasRole()` et `ProfileService.getCurrentUserProfile()`

**Routes :**
- Client/Locataire : `/me/renter/*`
- Propriétaire : `/me/owner/*`
- Pas de séparation par sous-domaine actuellement

### 3. Pourquoi les sessions se remplacent

**Problème identifié :**
- **Même localStorage** : Les deux instances (tenant et owner) partagent le même `localStorage`
- **Même clé de stockage** : Supabase utilise la même clé par défaut `sb-<project-ref>-auth-token` pour les deux instances
- **Même client Supabase** : Un seul client Supabase est créé et partagé

**Collision :**
Quand on se connecte sur l'instance "owner", Supabase écrase la session "tenant" dans localStorage car :
1. Même clé de stockage (`sb-<project-ref>-auth-token`)
2. Même domaine/port = même localStorage
3. Supabase remplace la session existante

## 🎯 B) Architecture cible

### Solution choisie : StorageKey isolé par instance

**Stratégie** : Utiliser le paramètre `storageKey` de Supabase pour isoler les sessions

**Avantages :**
- ✅ Minimaliste : Une seule modification dans le client Supabase
- ✅ Robuste : Isolation complète des sessions
- ✅ Compatible : Fonctionne avec ports différents OU sous-domaines
- ✅ Pas de changement backend nécessaire

**Implémentation :**
- Variable d'environnement `VITE_APP_CONTEXT=tenant|owner`
- `storageKey` dynamique : `sb-<project-ref>-auth-token-tenant` vs `sb-<project-ref>-auth-token-owner`

### Alternative (non retenue) : Sous-domaines

Sous-domaines (`tenant.localhost` vs `owner.localhost`) isolent automatiquement les cookies/localStorage, mais :
- Nécessite configuration `/etc/hosts`
- Nécessite configuration serveur dev pour accepter ces hostnames
- Plus complexe à déployer

## 📋 C) Fichiers à modifier

1. **`src/integrations/supabase/client.ts`** : Ajouter `storageKey` dynamique
2. **`package.json`** : Ajouter scripts `dev:tenant` et `dev:owner`
3. **`.env.local.example`** : Documenter `VITE_APP_CONTEXT`
4. **`vite.config.ts`** : (optionnel) Config pour sous-domaines si besoin

## ✅ D) Checklist de validation

- [ ] Se connecter sur `localhost:3012` (tenant) avec un compte renter
- [ ] Se connecter sur `localhost:3013` (owner) avec un compte owner
- [ ] Vérifier que les deux sessions restent actives
- [ ] Rafraîchir les deux pages → les deux restent connectées
- [ ] Se déconnecter de tenant → owner reste connecté
- [ ] Se déconnecter de owner → tenant reste connecté
- [ ] Vérifier dans DevTools → deux clés distinctes dans localStorage

## 🎯 E) Implémentation réalisée

### Fichiers modifiés

1. **`src/integrations/supabase/client.ts`**
   - ✅ Ajout de la logique `storageKey` dynamique
   - ✅ Extraction automatique du `project-ref` depuis l'URL Supabase
   - ✅ Support de `VITE_APP_CONTEXT` (tenant/owner)
   - ✅ Fallback sur "tenant" si non défini ou invalide

2. **`package.json`**
   - ✅ Ajout des scripts `dev:tenant` (port 3012)
   - ✅ Ajout des scripts `dev:owner` (port 3013)
   - ✅ Utilisation de `cross-env` pour compatibilité Windows
   - ✅ Chaque script définit `VITE_APP_CONTEXT` avant de lancer Vite

### Clés de stockage générées

- **Instance tenant** : `sb-<project-ref>-auth-token-tenant`
- **Instance owner** : `sb-<project-ref>-auth-token-owner`

Exemple avec project-ref `zykwfjxurwmputxwlkxs` :
- Tenant : `sb-zykwfjxurwmputxwlkxs-auth-token-tenant`
- Owner : `sb-zykwfjxurwmputxwlkxs-auth-token-owner`

### Configuration requise

Ajouter dans `.env.local` (optionnel, "tenant" par défaut) :
```bash
VITE_APP_CONTEXT=tenant  # ou "owner"
```

### Utilisation

```bash
# Terminal 1 - Instance Client
npm run dev:tenant

# Terminal 2 - Instance Propriétaire  
npm run dev:owner
```

## 📚 Documentation

Voir `GUIDE-DOUBLE-SESSION.md` pour :
- Guide de démarrage rapide
- Checklist de validation détaillée
- Dépannage
- Notes techniques

