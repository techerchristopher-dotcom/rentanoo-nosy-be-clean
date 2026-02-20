# Rapport final — Étape 3 Images SEO

**Date :** 20 février 2026  
**Statut :** ✅ Finalisée  

---

## 1. Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/pages/sinistre-caution/SinistreCaution.tsx` | SUPABASE_BASE, couple-serein.webp, assurance.webp, devis-facture.webp |
| `index.html` | og:image, twitter:image, favicon |
| `src/components/seo/Seo.tsx` | DEFAULT_OG_IMAGE |
| `public/site.webmanifest` | icônes favicon |
| `public/og-rentanoo-nosy-be.webp` | **Créé** — OG image teal 1200×630 |
| `public/favicon-rentanoo.png` | **Créé** — favicon teal 64×64 |

---

## 2. Diff des changements

### Partie A — SinistreCaution.tsx

```diff
- const SUPABASE_BASE =
-   "https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/sinistre%20caution%20page";
+ const SUPABASE_BASE =
+   "https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/sinistre-caution-page";

- src={getOptimizedImageUrl(`${SUPABASE_BASE}/couple-serain-.webp`, 640, 360)}
- srcSet={generateSrcSet(`${SUPABASE_BASE}/couple-serain-.webp`, [400, 640, 960])}
+ src={getOptimizedImageUrl(`${SUPABASE_BASE}/couple-serein.webp`, 640, 360)}
+ srcSet={generateSrcSet(`${SUPABASE_BASE}/couple-serein.webp`, [400, 640, 960])}

- src={getOptimizedImageUrl(`${SUPABASE_BASE}/asurance%20.webp`, 520)}
- srcSet={generateSrcSet(`${SUPABASE_BASE}/asurance%20.webp`, [400, 520])}
+ src={getOptimizedImageUrl(`${SUPABASE_BASE}/assurance.webp`, 520)}
+ srcSet={generateSrcSet(`${SUPABASE_BASE}/assurance.webp`, [400, 520])}

- src={getOptimizedImageUrl(`${SUPABASE_BASE}/devis%20facture.webp`, 640)}
- srcSet={generateSrcSet(`${SUPABASE_BASE}/devis%20facture.webp`, [400, 640])}
+ src={getOptimizedImageUrl(`${SUPABASE_BASE}/devis-facture.webp`, 640)}
+ srcSet={generateSrcSet(`${SUPABASE_BASE}/devis-facture.webp`, [400, 640])}
```

### Partie B — index.html + Seo.tsx

```diff
<!-- index.html -->
- <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
- <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
+ <meta property="og:image" content="https://rentanoo.com/og-rentanoo-nosy-be.webp" />
+ <meta name="twitter:image" content="https://rentanoo.com/og-rentanoo-nosy-be.webp" />

/* Seo.tsx */
- export const DEFAULT_OG_IMAGE = "https://lovable.dev/opengraph-image-p98pqg.png";
+ export const DEFAULT_OG_IMAGE = "https://rentanoo.com/og-rentanoo-nosy-be.webp";
```

### Partie C — Favicon

```diff
<!-- index.html -->
- <link rel="icon" type="image/png" href="https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/email-asset/R%20rentanoo%20favison%20.png">
+ <link rel="icon" type="image/png" href="/favicon-rentanoo.png">

/* site.webmanifest */
- "src":"https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/email-asset/R%20rentanoo%20favison%20.png"
+ "src":"/favicon-rentanoo.png"
```

---

## 3. Grep de validation

### lovable.dev (source code)

```bash
$ grep -r "lovable\.dev" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.js" --include="*.json" .
# Aucun résultat
```

### %20 (encodage espace)

```bash
$ grep -r "%20" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.json" src/ public/*.json public/*.html public/site.webmanifest 2>/dev/null
# Aucun résultat
```

### asurance (typo)

```bash
$ grep -r "asurance" --include="*.tsx" --include="*.ts" --include="*.html" src/
# Aucun résultat
```

### serain (typo)

```bash
$ grep -r "serain" --include="*.tsx" --include="*.ts" --include="*.html" src/
# Aucun résultat
```

### favison (typo)

```bash
$ grep -r "favison" --include="*.html" --include="*.webmanifest" public/
# Aucun résultat
```

---

## 4. Build

```bash
$ npm run build
✓ built in 7.71s
```

**Statut :** ✅ Réussi

---

## 5. Action requise — Supabase (Part A)

Le code pointe désormais vers le **nouveau bucket et les nouveaux noms de fichiers**. Vous devez :

1. **Créer le bucket** `sinistre-caution-page` dans Supabase Storage (projet `tbsgzykqcksmqxpimwry`).
2. **Renommer et uploader** les fichiers :
   - `couple-serain-.webp` → `couple-serein.webp`
   - `asurance .webp` (ou `asurance%20.webp`) → `assurance.webp`
   - `devis facture.webp` (ou `devis%20facture.webp`) → `devis-facture.webp`
   - `timeline.webp` et `justificatif.webp` et `relax.webp` restent inchangés (même bucket)
3. **Rendre le bucket public** si nécessaire.

En attendant cette mise à jour Supabase, les images `/sinistre-caution` ne s’afficheront pas.

---

## 6. Résumé — Étape 3 finalisée

| Partie | Statut | Détail |
|--------|--------|--------|
| **A** Supabase sinistre-caution | ✅ Code à jour | Bucket + noms corrigés dans le code. Action Supabase manuelle requise. |
| **B** OG image Lovable | ✅ Remplacé | `og-rentanoo-nosy-be.webp` créé et référencé |
| **C** Favicon | ✅ Corrigé | `favicon-rentanoo.png` créé, référencé dans index.html et site.webmanifest |
| Build | ✅ Réussi | Aucune régression |
| Validation grep | ✅ OK | 0 occurrence lovable.dev, %20, asurance, serain, favison dans le code |

---

*Rapport généré automatiquement après application des corrections Étape 3 Images SEO.*
