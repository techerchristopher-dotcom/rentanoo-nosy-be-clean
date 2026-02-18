# Diagnostic : Google Ads ne détecte pas le tag AW-17959989720

## A) Diagnostic

| Vérification | Résultat |
|--------------|----------|
| Tag dans `index.html` (repo) | ✅ **Présent** (lignes 35-42) |
| Tag dans `dist/index.html` (build local) | ✅ **Présent** |
| Tag dans HTML servi par rentanoo.com | ❌ **ABSENT** |

### Constat

Le HTML servi en production **ne contient pas** le bloc Google tag. Comparaison :

**Build local (dist/index.html)** :
```html
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17959989720"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-17959989720');
  </script>
```

**Production (curl https://rentanoo.com/)** :
```html
  <meta name="twitter:description" content="...">
  <script type="module" crossorigin src="/assets/index-cb2K3spL.js"></script>
  <!-- ↑ pas de gtag entre les deux -->
```

### Cause probable

**Les modifications n'ont pas été déployées.**

- `index.html` est modifié localement mais **non commité ni pushé**
- Railway déploie depuis le dépôt Git (GitHub) → il sert l'ancienne version
- Hash des assets différent : prod `index-cb2K3spL.js` vs build local `index-AWjHp54c.js`

---

## B) Commandes de vérification

### 1. Confirmer l’absence du tag en prod
```bash
curl -sS "https://rentanoo.com/" | grep -E "gtag|googletagmanager|AW-"
# Doit être vide (exit 1) actuellement
```

### 2. Vérifier après déploiement
```bash
curl -sS "https://rentanoo.com/" | grep "AW-17959989720"
# Après correction : doit afficher 2 lignes (script + config)
```

### 3. Vérifier le build local
```bash
npm run build
grep "AW-17959989720" dist/index.html
# Doit afficher 2 lignes
```

---

## C) Étapes de correction

### 1. Commiter et pousser

```bash
git add index.html
git commit -m "fix: add Google Ads tag AW-17959989720 to index.html"
git push origin main
```

### 2. Déploiement Railway

- Si déploiement automatique : attendez la fin du build (~2–5 min)
- Si manuel : lancer un déploiement depuis le dashboard Railway

### 3. Vérifier

```bash
# Attendre 2–5 min après le push
curl -sS "https://rentanoo.com/" | grep "AW-17959989720"
```

Si le tag apparaît → problème réglé.

### 4. Cache (si le tag n’apparaît toujours pas)

- Railway : pas de CDN par défaut
- Vérifier dans Railway si un CDN/proxy est configuré
- En navigation privée : éviter le cache navigateur

---

## D) Checklist finale (navigateur)

1. **Network** : F12 → Network → filtrer `gtag`
   - Requête `gtag/js?id=AW-17959989720` → status 200

2. **View source** : Clic droit → “Afficher le code source”
   - Rechercher `AW-17959989720` → 2 occurrences (script + config)

3. **Console** : `typeof window.gtag` → `"function"`

4. **Tag Assistant** : Extension Chrome → vérifier que AW-17959989720 est détecté

---

## Action immédiate

1. **Commiter et pousser** `index.html` (et les autres fichiers liés au tag si souhaité)
2. Attendre le déploiement Railway
3. Re-tester avec `curl` et le navigateur
