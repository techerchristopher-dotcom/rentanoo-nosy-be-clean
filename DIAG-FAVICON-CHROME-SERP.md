# Diagnostic Favicon — Chrome vs Google SERP

**Date :** 20 février 2026  
**Contexte :** Google affiche le favicon dans la SERP, Chrome n'affiche pas le favicon dans l'onglet (icône générique), y compris en navigation privée.

---

## 1) HTML servi en production

### Requête : `curl -s https://rentanoo.com/`

**Balises `<link rel="icon"...>` présentes et correctes :**

```html
<!-- Favicon (en premier pour éviter le cache globe par défaut) -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

**Conclusion :**
- Les balises sont présentes dès le chargement initial.
- Ordre : favicon en tête du `<head>` (après viewport).
- Aucun doublon conflictuel (icon + shortcut icon pointent vers le même .ico).
- Les liens sont relatifs à la racine (`/favicon.ico`), ce qui est correct.
- Aucun lien concurrent vers un autre favicon.

---

## 2) Content-Type et réponse serveur

### Requêtes `curl -I` en production

| URL | HTTP | Content-Type | Content-Length | index.html servi ? |
|-----|------|--------------|----------------|--------------------|
| `/favicon.ico` | 200 | `image/vnd.microsoft.icon` | 5238 | Non |
| `/favicon-32x32.png` | 200 | `image/png` | 1544 | Non |
| `/site.webmanifest` | 200 | `application/manifest+json; charset=utf-8` | 584 | Non |
| `/apple-touch-icon.png` | 200 | `image/png` | 17992 | Non |

**Serveur :** Railway (Express + Varnish).

**Analyse :**
- Les 4 URLs renvoient bien les fichiers binaires/JSON, pas `index.html`.
- Les Content-Type sont corrects.
- `image/vnd.microsoft.icon` est le type IANA pour .ico (équivalent à `image/x-icon` pour Chrome).

---

## 3) Commandes curl et interprétation

### favicon.ico

```bash
curl -I https://rentanoo.com/favicon.ico
```

**Valeurs attendues :**
- `HTTP/2 200` ou `HTTP/1.1 200`
- `Content-Type: image/vnd.microsoft.icon` ou `image/x-icon`
- `Content-Length: 5238` (ou proche)

**Valeurs observées :** conformes (200, `image/vnd.microsoft.icon`, 5238).

---

### favicon-32x32.png

```bash
curl -I https://rentanoo.com/favicon-32x32.png
```

**Valeurs attendues :**
- `HTTP/2 200` ou `HTTP/1.1 200`
- `Content-Type: image/png`
- `Content-Length: 1544` (ou proche)

**Valeurs observées :** conformes (200, `image/png`, 1544).

---

### Test rapide pour vérifier que ce n’est pas du HTML

```bash
curl -sI https://rentanoo.com/favicon.ico | grep -i content-type
# Attendu : content-type: image/vnd.microsoft.icon
# Problème si : content-type: text/html
```

**Résultat actuel :** `content-type: image/vnd.microsoft.icon` (correct).

---

## 4) Diagnostic final

### Cause la plus probable : priorité de la balise icon dans Chrome

**Constat :**
- HTML correct.
- Réponses 200 avec Content-Type correct.
- Même en navigation privée, le favicon ne s’affiche pas.

**Hypothèse principale :** l’ordre et le type des balises icon ne correspondent pas bien au comportement de Chrome.

1. **Ordre actuel :** `.ico` en premier, puis `.png`.
2. **Recommandations courantes :** Chrome gère mieux le PNG ; le premier lien icon utilisé peut être privilégié.
3. **Impact possible :** si Chrome utilise en priorité le .ico et rencontre un problème (format multi-size, parsing), il peut ne pas retomber correctement sur le PNG et afficher l’icône par défaut.
4. **Google SERP :** Google utilise son propre crawler et sa propre logique de favicon, ce qui peut expliquer une différence par rapport à Chrome.

**Autres causes moins probables :**
- Format ICO mal supporté par Chrome (multi-size, généré par `to-ico`).
- Comportement spécifique aux SPAs (favicon fixé à la première charge).
- Cache Varnish/CDN pouvant servir une ancienne version dans de rares cas.

---

## 5) Fix minimal recommandé (à appliquer manuellement)

### A) Mettre le PNG 32×32 en premier

Changer l’ordre des balises pour placer le PNG avant le .ico :

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

### B) Conserver une seule référence au .ico (optionnel)

Supprimer `rel="shortcut icon"` et ne garder que `rel="icon"` pour éviter toute ambiguïté :

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
```

### C) Vérifier le fichier ICO (si le fix A ne suffit pas)

Tester avec un .ico généré par un autre outil (ex. favicon.io, realfavicongenerator.net) pour écarter un format mal accepté par Chrome.

---

## 6) Synthèse

| Élément | État | Commentaire |
|---------|------|-------------|
| HTML servi | OK | Balises présentes, ordre correct |
| Réponse /favicon.ico | OK | 200, Content-Type correct |
| Réponse /favicon-32x32.png | OK | 200, Content-Type correct |
| Doublons / liens concurrents | OK | Aucun |
| Cause la plus probable | Priorité / ordre des icônes | Mettre le PNG 32×32 en premier |
| Fix recommandé | Modifier `index.html` | Voir section 5 |
