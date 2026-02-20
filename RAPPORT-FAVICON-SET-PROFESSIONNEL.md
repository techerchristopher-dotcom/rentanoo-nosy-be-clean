# Rapport – Set favicon professionnel Rentanoo

**Date :** 20 février 2025  
**Objectif :** Créer un set favicon complet à partir du cercle « R » blanc du logo Rentanoo.

---

## 1. Fichiers créés

| Fichier | Dimensions | Description |
|---------|------------|-------------|
| `public/favicon.ico` | 16×16, 32×32 | Favicon multi-size (fallback navigateurs) |
| `public/favicon-16x16.png` | 16×16 | Favicon PNG petit |
| `public/favicon-32x32.png` | 32×32 | Favicon PNG standard |
| `public/apple-touch-icon.png` | 180×180 | Icône iOS / macOS Safari |
| `public/android-chrome-192x192.png` | 192×192 | Icône PWA Android |
| `public/android-chrome-512x512.png` | 512×512 | Icône PWA Android HD |

**Source :** cercle avec « R » blanc extrait de `logo_rentanoo_2.png` (vert officiel `#287a74`, padding 5–10 %).

---

## 2. Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `index.html` | Nouveaux liens favicon, `theme-color` = `#287a74` |
| `public/site.webmanifest` | `name`/`short_name` = « Rentanoo », `theme_color` = `#287a74`, icônes Android, `display` = `standalone` |

---

## 3. Fichiers supprimés

| Fichier | Raison |
|---------|--------|
| `public/favicon-rentanoo.png` | Remplacé par le set favicon ci-dessus |
| `public/favicon.ico.tmp.png` | Fichier temporaire inutilisé |

---

## 4. Extrait `index.html`

```html
<!-- Favicon & app icons -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#287a74">
```

---

## 5. Extrait `site.webmanifest`

```json
{
  "name": "Rentanoo",
  "short_name": "Rentanoo",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#287a74",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

---

## 6. Checklist de test

| Test | Statut |
|------|--------|
| `npm run build` OK | ✅ |
| Favicons présents dans `dist/` | ✅ |
| `index.html` avec liens corrects | ✅ |
| `site.webmanifest` valide | ✅ |
| `theme-color` = `#287a74` | ✅ |
| `favicon-rentanoo.png` supprimé | ✅ |
| favicon.ico multi-size (16+32) | ✅ |

---

## 7. Outils utilisés

- **Sharp** (via script précédent) : extraction et redimensionnement du cercle « R »
- **to-ico** : génération du fichier `.ico` multi-size à partir des PNG

---

## 8. Vérification manuelle recommandée

1. **Desktop :** Charger le site, vérifier l’icône dans l’onglet.
2. **Mobile :** Tester « Ajouter à l’écran d’accueil » (icône, barre de statut).
3. **PWA :** Vérifier les icônes 192 et 512 dans le manifest.
