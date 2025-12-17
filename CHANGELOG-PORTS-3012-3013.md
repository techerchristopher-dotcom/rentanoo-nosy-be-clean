# Changelog : Ajustement des ports Tenant/Owner (3012/3013)

## 📋 Résumé des modifications

Les ports des instances tenant et owner ont été ajustés pour éviter les conflits avec l'ancienne version du site :
- **Tenant** : Port `3012` (au lieu de 3000)
- **Owner** : Port `3013` (au lieu de 3001)

## ✅ Modifications effectuées

### 1. `package.json`
- ✅ Ajout de `cross-env` dans `devDependencies` pour compatibilité Windows/macOS/Linux
- ✅ Mise à jour des scripts :
  - `dev:tenant` : `cross-env VITE_APP_CONTEXT=tenant vite --port 3012`
  - `dev:owner` : `cross-env VITE_APP_CONTEXT=owner vite --port 3013`

### 2. Documentation mise à jour
- ✅ `GUIDE-DOUBLE-SESSION.md` : Tous les ports 3000/3001 → 3012/3013
- ✅ `DIAGNOSTIC-DOUBLE-SESSION.md` : Ports mis à jour
- ✅ `IMPLEMENTATION-DOUBLE-SESSION.md` : Ports et cross-env documentés

### 3. Fichiers de configuration
- ✅ `supabase/functions/create-checkout-session/index.ts` : Commentaires mis à jour pour refléter les nouveaux ports
- ✅ `server/index.ts` : Message console mis à jour

### 4. Vérifications effectuées
- ✅ `vite.config.ts` : Le proxy vers `localhost:3001` est pour l'API backend (OK, pas de changement nécessaire)
- ✅ Aucune autre référence aux ports 3000/3001 dans le code source (sauf dans des commentaires de code métier non liés)

## 🚀 Utilisation

### Commandes finales

```bash
# Terminal 1 — Client / Locataire
npm run dev:tenant
# → http://localhost:3012

# Terminal 2 — Propriétaire / Loueur
npm run dev:owner
# → http://localhost:3013
```

### Isolation Supabase (inchangée)

L'isolation des sessions reste identique :
- **Tenant (3012)** : Clé `sb-<project-ref>-auth-token-tenant`
- **Owner (3013)** : Clé `sb-<project-ref>-auth-token-owner`

Le port n'impacte **PAS** Supabase, seul le `storageKey` fait l'isolation.

## ✅ Validation finale

- [ ] Lancer `npm run dev:tenant` → `http://localhost:3012`
- [ ] Lancer `npm run dev:owner` → `http://localhost:3013`
- [ ] Se connecter sur tenant (3012) avec `renter@demo.fr`
- [ ] Se connecter sur owner (3013) avec `owner@demo.fr`
- [ ] Rafraîchir les deux pages → sessions toujours actives
- [ ] Se déconnecter de tenant → owner reste connecté
- [ ] Se déconnecter de owner → tenant reste connecté
- [ ] Vérifier dans DevTools → deux clés distinctes dans localStorage

## 📝 Notes importantes

1. **Compatibilité multiplateforme** : `cross-env` est maintenant utilisé pour garantir le fonctionnement sur Windows, macOS et Linux

2. **Configuration Stripe** : Si vous utilisez des callbacks Stripe en développement local, mettre à jour les variables d'environnement Supabase :
   - `STRIPE_SUCCESS_URL` : `http://localhost:3012/success` (tenant) ou `http://localhost:3013/success` (owner)
   - `STRIPE_CANCEL_URL` : `http://localhost:3012/cancel` (tenant) ou `http://localhost:3013/cancel` (owner)

3. **API Backend** : Le proxy dans `vite.config.ts` pointe toujours vers `localhost:3001` pour l'API backend (serveur Express). C'est correct et n'a pas besoin d'être modifié.

4. **Production** : Ces ports ne sont utilisés qu'en développement. En production, les ports sont gérés par le serveur de déploiement.

## 🔄 Migration

Si vous aviez des sessions actives sur les anciens ports :
1. Les sessions dans localStorage sont liées au port (chaque port a son propre localStorage)
2. Il faudra se reconnecter sur les nouveaux ports (3012 et 3013)
3. Les anciennes sessions sur 3000/3001 ne seront plus accessibles (mais c'est voulu pour éviter les conflits)

