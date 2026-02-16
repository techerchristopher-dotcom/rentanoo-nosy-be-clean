# DIAG Proxy Vite — ECONNREFUSED (API sur 3001, proxy cible 3000)

**Mode** : DIAG ONLY — aucun patch.  
**Objectif** : Pourquoi le proxy Vite renvoie ECONNREFUSED alors que l’API écoute sur 3001.

---

## 1️⃣ CONFIG DU PROXY VITE

**Fichier** : `vite.config.ts`

### Extrait `server.proxy` (lignes 16-25)

```typescript
  server: {
    host: "::",
    port: devPort,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
```

| Élément | Valeur | Ligne |
|---------|--------|-------|
| Chemin proxifié | `/api` | 19 |
| **Target** | `http://localhost:3000` | 20 |
| changeOrigin | true | 21 |
| secure | false | 22 |

**Conclusion** : Le proxy envoie toutes les requêtes `/api/*` vers `http://localhost:3000`. Aucune variable d’environnement, c’est une valeur fixe.

---

## 2️⃣ PORT DE L’API (SERVER)

**Fichier** : `server/index.ts`

### Lecture du port (lignes 1078-1081)

```typescript
// Port 3000 par défaut en dev (proxy Vite /api → localhost:3000, frontend sur 3001)
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
```

| Élément | Valeur |
|---------|--------|
| Variable | `process.env.PORT` |
| Défaut si absente | `3000` |
| Source possible | `.env.local`, `PORT=3001 npm run dev:api`, etc. |

**Exemple** : avec `PORT=3001`, Express écoute sur `http://localhost:3001` et le log affiche :

```
🚀 API listening on http://localhost:3001
```

Donc si l’API est lancée avec `PORT=3001` (ou `PORT=3001` dans `.env.local`), elle écoute bien sur 3001.

---

## 3️⃣ CAUSE DU PROBLÈME

| Proxy Vite (target) | Port API réel | Port 3000 | Résultat |
|--------------------|---------------|-----------|----------|
| `http://localhost:3000` | 3001 | Aucun serveur | Proxy se connecte à 3000 → **ECONNREFUSED** |

Le proxy tente une connexion à `localhost:3000`, où aucun serveur n’écoute. D’où ECONNREFUSED.

---

## 4️⃣ OCCURRENCES DE `3000` / `localhost:3000`

### Fichiers de configuration (impact direct)

| Fichier | Ligne | Contenu |
|---------|-------|---------|
| `vite.config.ts` | 20 | `target: "http://localhost:3000"` |
| `server/index.ts` | 1078-1079 | `const PORT = ... \|\| 3000` |
| `package.json` | 11 | `dev:local`: `PORT=3000 npm run dev:api` |

### Script `dev:local` (package.json L11)

```json
"dev:local": "concurrently -n api,vite -c blue,green \"cross-env PORT=3000 npm run dev:api\" \"npm run dev\""
```

Avec `dev:local` : API sur 3000, Vite sur 3002 (défaut). Proxy et API sont alignés.

### Cas où l’API est sur 3001

Si l’API est lancée avec `PORT=3001` (ou via `.env.local` avec `PORT=3001`), le serveur écoute sur 3001. Le proxy, lui, pointe toujours vers 3000 → ECONNREFUSED.

### Autres références (non liées au proxy)

- `package-lock.json` : dépendances (ex. caniuse-lite), sans rapport
- `src/pages/owner/ManageVehicle.tsx` : `duration: 3000` (ms), sans rapport
- `DIAG-*.md`, `README.md`, etc. : documentation ou diagnostics

---

## 5️⃣ ECONNREFUSED vs 500

| Erreur | Signification | Qui renvoie |
|--------|---------------|-------------|
| **ECONNREFUSED** | Impossible de se connecter à la cible du proxy (aucun serveur sur ce port) | Proxy Vite (échec de connexion) |
| **500** | Backend atteint, erreur dans le handler | Serveur Express |

Dans votre cas : **ECONNREFUSED** → le proxy ne peut pas joindre la cible. La requête n’atteint pas l’API.

---

## 6️⃣ VÉRIFICATION AVEC CURL

| Commande | Comportement |
|----------|--------------|
| `curl -i http://localhost:3003/api/test` | Vite reçoit la requête, proxy tente 3000 → **ECONNREFUSED** (comportement actuel) |
| `curl -i http://localhost:3001/api/test` | Requête directe à l’API → **404** (route `/api/test` absente) ou réponse si route existe |
| `curl -i http://localhost:3000/api/test` | Aucun serveur sur 3000 → **Connection refused** |

Exemple pour confirmer que l’API répond sur 3001 :

```bash
curl -i http://localhost:3001/api/stripe-health
```

Si l’API tourne sur 3001, cette requête renvoie du JSON (ex. 200).  
Sur 3000, elle échoue avec "Connection refused".

---

## 7️⃣ TABLEAU : CAUSE / PREUVE / CONFIRMATION / FIX

| Cause probable | Preuve | Comment confirmer | Fix minimal (descriptif) |
|----------------|--------|-------------------|---------------------------|
| **Proxy cible 3000, API sur 3001** | `vite.config.ts` L20 : `target: "http://localhost:3000"` | `curl http://localhost:3000/api/...` → refused ; `curl http://localhost:3001/api/...` → OK | Aligner la cible du proxy sur le port de l’API (ex. `target: "http://localhost:3001"` ou cible dynamique) |
| **API non démarrée sur 3000** | Log : `API listening on http://localhost:3001` | Si API sur 3001, le port 3000 reste libre | Lancer l’API sur 3000 OU adapter le proxy |
| **PORT=3001 dans .env.local** | Variable `PORT` lue à `server/index.ts` L1079 | Vérifier `.env.local` : présence de `PORT=3001` | Soit retirer/surcharger `PORT` pour rester sur 3000, soit adapter la cible du proxy à 3001 |

---

## 8️⃣ GO / NO GO

| Condition | GO | NO GO |
|-----------|-----|-------|
| Proxy target = port où l’API écoute | ✅ Requêtes atteignent l’API | ❌ ECONNREFUSED |
| Proxy target = 3000, API sur 3001 | — | ❌ **NO GO** (situation actuelle) |
| Proxy target = 3001, API sur 3001 | ✅ **GO** | — |

---

## 9️⃣ RÉSUMÉ

| Élément | Valeur |
|---------|--------|
| Proxy target | `http://localhost:3000` (vite.config.ts L20) |
| Port API actuel | 3001 (`PORT=3001` ou `.env.local`) |
| Port 3000 | Aucun serveur |
| Résultat | Proxy tente 3000 → **ECONNREFUSED** |

Le proxy et le port de l’API ne sont pas alignés : le proxy cible un port sans serveur.
