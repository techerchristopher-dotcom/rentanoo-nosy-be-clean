# Diagnostic – Favicons en production

**Date :** 20 février 2025  
**Problème :** Les favicons ne s'affichent pas en production (icône globe générique).

---

## 1) Contenu du dossier `dist/`

| Fichier | Présent | Taille |
|---------|---------|--------|
| `favicon.ico` | ✅ | 5 238 octets |
| `favicon-16x16.png` | ✅ | 688 octets |
| `favicon-32x32.png` | ✅ | 1 544 octets |
| `apple-touch-icon.png` | ✅ | 17 992 octets |
| `site.webmanifest` | ✅ | 584 octets |
| `android-chrome-192x192.png` | ✅ | (présent) |
| `android-chrome-512x512.png` | ✅ | (présent) |

**Conclusion :** Vite copie correctement tous les fichiers de `public/` vers `dist/` lors du build.

---

## 2) Configuration de déploiement

### Plateforme : Railway

- **Build :** `nixpacks.toml` → `npm run build` (Vite)
- **Start :** `npm run start:prod` → `NODE_ENV=production tsx server/index.ts`
- **Dossier servi :** `dist/` (via `express.static`)
- **Aucun config** Vercel, Netlify, Nginx ou Dockerfile détectée

### SPA fallback

- Le serveur Express utilise un fallback SPA pour les routes non trouvées.
- L’ordre est correct : `express.static(distPath)` **avant** le fallback `app.get("*splat", ...)`.

---

## 3) Analyse du serveur custom (`server/index.ts`)

### Ordre des middlewares (production)

```
1. cors, compression
2. Redirect www → non-www
3. Routes API (/api/*)
4. express.static(distPath)   ← sert /favicon.ico, /favicon-*.png, etc.
5. app.get("*splat")           ← fallback SPA (index.html)
```

### Comportement pour `/favicon.ico` et `/site.webmanifest`

1. **`express.static(distPath)`** cherche `dist/favicon.ico` et `dist/site.webmanifest`.
2. Si les fichiers existent → ils sont servis (200), pas de passage au fallback.
3. Si les fichiers n’existent pas → `next()`, puis le fallback.
4. Le fallback teste `hasExtension = /\.[^/]+$/.test(req.path)` → `true` pour `.ico` → réponse 404 "File not found".

Donc `/favicon.ico` et `/site.webmanifest` ne tombent dans le fallback que s’ils ne sont **pas** trouvés dans `dist/`.

### Cache-Control

- `favicon.ico` et `site.webmanifest` ont `Cache-Control: public, max-age=86400` (24 h).

---

## 4) Diagnostic

### Cause la plus probable : cache navigateur / CDN

1. Les favicons sont très souvent mis en cache (onglets, raccourcis, PWA).
2. Une ancienne absence de favicon peut avoir été mémorisée (icône globe).
3. Un CDN (ex. Railway) peut aussi mettre en cache une réponse 404 ancienne.

**Vérification rapide :**
- Ouvrir `https://votre-site.com/favicon.ico` dans une autre fenêtre.
- Si l’icône s’affiche → problème côté cache navigateur.
- Si 404 → problème côté serveur ou déploiement.

### Autres causes possibles

| Cause | Probabilité | Vérification |
|-------|-------------|--------------|
| `NODE_ENV` ≠ `"production"` sur Railway | Faible | Vérifier les variables d’environnement Railway (ou logs) |
| `process.cwd()` différent sur Railway | Faible | Logs : chemin de `distPath` au démarrage |
| Build incomplet ou ancien | Moyenne | Redéploiement complet après un nouveau build |
| Domaine personnalisé / reverse proxy | Faible | Vérifier la config du domaine (rentanoo.com) |

### Configuration serveur

L’ordre des middlewares et le fallback SPA sont cohérents avec un bon fonctionnement des favicons. Pas de correction nécessaire côté code dans l’état actuel.

---

## 5) Fix minimal recommandés

### A) Si le favicon est bien servi (200 sur `/favicon.ico`)

**Problème = cache :**

1. Forcer un rechargement : `Ctrl+Shift+R` (ou `Cmd+Shift+R`).
2. Tester en navigation privée.
3. Vider le cache du navigateur.
4. Ajouter un paramètre de version dans l’URL pour forcer le rechargement :
   ```html
   <link rel="icon" href="/favicon.ico?v=2">
   ```

### B) Si `/favicon.ico` renvoie 404

**Problème = déploiement ou environnement :**

1. Vérifier sur Railway que `NODE_ENV=production` est bien défini.
2. Redéployer entièrement (rebuild + redeploy).
3. Vérifier dans les logs au boot que `distPath` pointe bien vers un dossier contenant `favicon.ico`.

### C) Fix optionnel (robustesse)

Exclure explicitement les favicons du fallback SPA (redondant si `express.static` fonctionne) :

```typescript
// Dans app.get("*splat", ...), avant la logique hasExtension :
const faviconPaths = ['/favicon.ico', '/favicon-16x16.png', '/favicon-32x32.png', 
  '/apple-touch-icon.png', '/site.webmanifest'];
if (faviconPaths.includes(req.path)) {
  return res.status(404).send("File not found"); // ou next() si on veut que static gère
}
```

Ce bloc ne change pas le comportement actuel car `express.static` est appelé avant ; il sert surtout de garde-fou si l’ordre des middlewares venait à être modifié.

---

## 6) Checklist de vérification

- [ ] Accéder à `https://[domaine]/favicon.ico` → statut HTTP ?
- [ ] Tester en navigation privée
- [ ] Hard refresh (`Ctrl+Shift+R`)
- [ ] Vérifier `NODE_ENV=production` sur Railway
- [ ] Redéployer avec un build complet
- [ ] Consulter les logs Railway au démarrage pour confirmer `distPath`

---

## 7) DIAG + FIX — Ancien favicon Supabase (2026-02-20)

### DIAGNOSTIC — Source de l’ancienne URL

| Cible | email-asset / favison / R%20rentanoo |
|-------|--------------------------------------|
| `GET https://rentanoo.com/` (HTML) | **0 occurrence** — favicons locaux uniquement |
| `GET https://rentanoo.com/site.webmanifest` | **0 occurrence** — chemins locaux |
| `grep` dans `dist/`, `index.html`, `public/` | **0 occurrence** |

**Conclusion** : L’URL `https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/email-asset/R%20rentanoo%20favison%20.png` **n’est plus servie** par le code. La requête vient du **cache navigateur ou CDN**.

L’unique occurrence de `tbsgzykqcksmqxpimwry.supabase.co` dans le HTML est le **preconnect** (API Supabase) — usage légitime.

### FIX appliqué

1. **Versioning anti-cache** (`?v=20260220`) dans `index.html` et `site.webmanifest`
2. **Cache-Control** `max-age=0, must-revalidate` pour tous les favicons et le manifest (server/index.ts)

### Preuve finale (grep après build)

```
grep -r "email-asset\|favison\|R%20rentanoo" dist/ index.html public/
→ 0 occurrence
```
