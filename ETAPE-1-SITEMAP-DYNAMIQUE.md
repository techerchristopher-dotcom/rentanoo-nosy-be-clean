# ÉTAPE 1 — Sitemap dynamique

## Résumé

Le sitemap est généré automatiquement au build à partir des véhicules disponibles dans Supabase.

- **Fichier** : `scripts/generate-sitemap.js`
- **Source** : Supabase `vehicles` (`available = true`)
- **URLs produit** : `/moto/{license}` (moto/scooter), `/vehicle/{license}` (car)
- **License** : 8 premiers caractères de l’ID (UUID), en majuscules

## Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| `scripts/generate-sitemap.js` | **Créé** — Script de génération |
| `package.json` | **Modifié** — Scripts `generate-sitemap`, `prebuild` |
| `public/sitemap.xml` | **Écrasé** à chaque build (généré) |

## Comment tester en local

### 1. Générer le sitemap

```bash
npm run generate-sitemap
```

Sortie attendue :
```
[generate-sitemap] Fetch véhicules Supabase...
[generate-sitemap] X moto(s), Y véhicule(s)
[generate-sitemap] Écrit: .../public/sitemap.xml (N URLs)
```

### 2. Vérifier le contenu

```bash
# Voir le fichier
cat public/sitemap.xml

# Vérifier les URLs moto/vehicle
grep -E "moto|vehicle" public/sitemap.xml
```

### 3. Tester en dev

```bash
npm run dev
# Puis ouvrir http://localhost:3002/sitemap.xml
```

### 4. Test avec build complet

```bash
npm run build
# Le prebuild lance automatiquement generate-sitemap avant vite build

# Vérifier que dist/sitemap.xml contient les URLs produit
grep moto dist/sitemap.xml
```

## Comment tester en production

### 1. Déployer

Après `npm run build`, le dossier `dist/` contient `sitemap.xml`. Le serveur Express sert `dist/sitemap.xml` via `express.static`.

### 2. Vérifier l’URL

```bash
curl -sI https://rentanoo.com/sitemap.xml
# Attendu : HTTP/1.1 200 OK

curl -s https://rentanoo.com/sitemap.xml | grep -E "moto|vehicle"
# Doit afficher les URLs /moto/* et /vehicle/*
```

### 3. Google Search Console

- Pages > Sitemaps
- Soumettre ou actualiser : `https://rentanoo.com/sitemap.xml`

## Prérequis

- `.env.local` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- Si variables absentes : seules les URLs statiques sont générées (5 URLs)

## Configuration optionnelle

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_SITE_URL` | Base URL du site | `https://rentanoo.com` |

## Format XML

Chaque URL produit inclut :
- `<loc>` — URL absolue
- `<lastmod>` — Date ISO (updated_at du véhicule ou aujourd’hui)
- `<changefreq>weekly</changefreq>`
- `<priority>0.8</priority>`
