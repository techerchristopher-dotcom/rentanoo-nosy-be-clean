# Configuration de l'URL de l'API en Production

## Problème résolu

Le formulaire de contact tentait d'appeler `localhost:3000/api/contact` en production au lieu de l'URL correcte du serveur.

## Solution implémentée

Le code dans `src/pages/Contact.tsx` a été corrigé pour utiliser une **URL relative** par défaut, qui fonctionne automatiquement en production si le backend Express est servi sur le même domaine.

### Logique de détermination de l'URL

```typescript
// Stratégie robuste :
// 1. Si VITE_API_URL est défini, l'utiliser (backend sur autre domaine)
// 2. Sinon, utiliser une URL relative (backend sur même domaine - fonctionne en prod et dev via proxy Vite)
const apiBase = import.meta.env.VITE_API_URL?.trim();
const apiUrl = apiBase ? `${apiBase}/api/contact` : "/api/contact";
```

## Configuration selon le déploiement

### Cas 1 : Backend sur le même domaine (recommandé)

**Exemple** : Frontend sur `https://rentanoo.com` et backend sur `https://rentanoo.com/api/*`

**Configuration** :
- ✅ **Ne pas définir** `VITE_API_URL` (ou laisser vide)
- ✅ L'URL relative `/api/contact` sera utilisée automatiquement
- ✅ Fonctionne en dev grâce au proxy Vite configuré dans `vite.config.ts`

**Avantages** :
- Pas de configuration nécessaire
- Pas de problèmes CORS
- Fonctionne automatiquement

### Cas 2 : Backend sur un autre domaine

**Exemple** : Frontend sur `https://rentanoo.com` et backend sur `https://api.rentanoo.com`

**Configuration** :
- ✅ Définir `VITE_API_URL=https://api.rentanoo.com` (sans slash final)
- ✅ L'URL complète sera `https://api.rentanoo.com/api/contact`

**Important** :
- Ne pas inclure `/api` dans `VITE_API_URL` (c'est ajouté automatiquement)
- Ne pas mettre de slash final

## Variables d'environnement

### En développement local

Le proxy Vite dans `vite.config.ts` redirige automatiquement `/api/*` vers `http://localhost:3001` :

```typescript
proxy: {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
    secure: false,
  },
}
```

**Pas besoin de définir `VITE_API_URL` en dev** - l'URL relative fonctionne grâce au proxy.

### En production

#### Option A : Backend sur même domaine (recommandé)
```bash
# Ne pas définir VITE_API_URL ou laisser vide
# VITE_API_URL=  # Optionnel : vide ou non défini
```

#### Option B : Backend sur autre domaine
```bash
# Définir l'URL complète du backend (sans /api ni slash final)
VITE_API_URL=https://api.rentanoo.com
```

## Vérification

### Logs de debug

Le code ajoute maintenant des logs détaillés dans la console :

```typescript
console.log("[Contact] 📡 Envoi formulaire vers:", apiUrl);
console.log("[Contact] 📥 Réponse reçue:", {
  status: response.status,
  statusText: response.statusText,
  ok: response.ok,
  url: apiUrl,
});
```

### En cas d'erreur

Les erreurs réseau sont maintenant détectées et affichent un message clair :

- **Erreur réseau** : "Impossible de contacter le serveur. Vérifiez votre connexion internet."
- **Erreur HTTP** : Le message d'erreur du serveur est affiché
- **Logs détaillés** : L'URL appelée et le status sont loggés dans la console

## Instructions pour Railway / Coolify / Autres plateformes

### Railway

1. Aller dans les **Variables d'environnement** de votre service
2. **Si backend sur même domaine** : Ne pas définir `VITE_API_URL`
3. **Si backend sur autre domaine** : Ajouter `VITE_API_URL=https://votre-backend.railway.app`
4. Redéployer l'application

### Coolify

1. Aller dans les **Variables d'environnement** de votre application
2. **Si backend sur même domaine** : Ne pas définir `VITE_API_URL`
3. **Si backend sur autre domaine** : Ajouter `VITE_API_URL=https://votre-backend.coolify.app`
4. Redéployer l'application

## Test en production

1. Ouvrir la console du navigateur (F12)
2. Soumettre le formulaire de contact
3. Vérifier les logs :
   - `[Contact] 📡 Envoi formulaire vers: /api/contact` (ou l'URL complète si VITE_API_URL est défini)
   - `[Contact] 📥 Réponse reçue: { status: 200, ... }`
4. Si erreur, vérifier l'URL dans les logs et ajuster `VITE_API_URL` si nécessaire

## Résumé

✅ **Correction appliquée** : URL relative par défaut  
✅ **Gestion d'erreur améliorée** : Logs détaillés et messages clairs  
✅ **Configuration flexible** : Support backend même domaine ou autre domaine  
✅ **Traductions ajoutées** : Messages d'erreur en FR et EN

