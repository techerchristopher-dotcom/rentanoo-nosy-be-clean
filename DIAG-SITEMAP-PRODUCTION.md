# DIAG SITEMAP PRODUCTION — 500 sur /sitemap.xml

**Date :** 20 février 2026  
**Problème constaté :** `https://rentanoo.com/sitemap.xml` a renvoyé 500 (lors d’un test précédent).  
**⚠️ Aucune modification — diagnostic uniquement.**

---

## 1) Présence du fichier dans dist/

| Vérification | Résultat |
|--------------|----------|
| **dist/sitemap.xml** | ✅ **Présent** |
| Chemin | `dist/sitemap.xml` (747 octets) |
| Source | Copié par Vite depuis `public/sitemap.xml` lors du build |

```
$ ls -la dist/sitemap.xml
-rw-r--r--  1 christopher  staff  747 Feb 20 19:05 dist/sitemap.xml
```

---

## 2) Ordre des middlewares (server/index.ts)

**Lignes 1145–1197 :**

```
1. express.static(distPath)    ← sert les fichiers de dist/, dont sitemap.xml
2. app.get("*splat", ...)      ← fallback SPA (uniquement si static n'a pas répondu)
```

`express.static` est bien monté avant le fallback. Une requête vers `/sitemap.xml` est d’abord traitée par le middleware statique.

---

## 3) Interception par une route

| Route | Méthode | Intercepte /sitemap.xml ? |
|-------|---------|---------------------------|
| `/api/*` | Divers | ❌ Non |
| `app.get("*splat")` | GET | ❌ Non (uniquement si `express.static` n’a pas trouvé le fichier) |

Aucune route ne cible explicitement `/sitemap.xml`. Le fallback `*splat` ne s’exécute que si `express.static` appelle `next()` parce qu’aucun fichier n’a été trouvé.

---

## 4) Réponse attendue en production

| Attribut | Valeur attendue |
|----------|-----------------|
| **Status HTTP** | `200 OK` |
| **Content-Type** | `application/xml` |
| **Cache-Control** | `public, max-age=86400` (défini dans `setHeaders` pour `sitemap.xml`) |

---

## 5) Test en production (20 fév. 2026)

```bash
$ curl -sI https://rentanoo.com/sitemap.xml
HTTP/2 200 
content-type: application/xml
cache-control: public, max-age=86400
content-length: 747
x-powered-by: Express
server: railway-edge
```

Le sitemap répond correctement en production.

---

## 6) Conclusion

### Cause du 500

Le 500 constaté lors d’un test précédent peut venir de :

1. **Déploiement ou redémarrage** — période où le service n’était pas encore prêt
2. **Cache / CDN** — Varnish ou autre CDN renvoyant une réponse en erreur
3. **Nœud edge** — un réplica Railway en difficulté ponctuelle

Rien dans la configuration serveur (`express.static`, ordre des middlewares, routes) n’indique une cause structurelle : le sitemap est servi par `express.static` dès qu’il existe dans `dist/`.

### Sitemap accessible en production ?

Oui. Le test `curl` montre une réponse 200, un `Content-Type` correct et le `Cache-Control` attendu.

### Correction côté serveur nécessaire ?

Non. La configuration actuelle est cohérente. Si des 500 réapparaissent, vérifier :

- Les logs Railway autour de l’heure du 500
- Un éventuel cache CDN à purger
- Le bon déploiement de `dist/sitemap.xml` (présence du fichier dans l’image de déploiement)

---

## Annexe — Flux de traitement pour GET /sitemap.xml

```
Requête GET /sitemap.xml
       │
       ▼
express.static(distPath)
  └─ Cherche dist/sitemap.xml
  └─ Si trouvé → 200 + application/xml + Cache-Control max-age=86400
  └─ Si non trouvé → next()
       │
       ▼ (si next appelé)
app.get("*splat")
  └─ hasExtension = /\.[^/]+$/.test("/sitemap.xml") = true
  └─ → 404 "File not found"
  └─ Pas d’appel à sendFile(index.html)
```

Le sitemap est donc servi par `express.static` en 200 tant que `dist/sitemap.xml` existe au déploiement.
