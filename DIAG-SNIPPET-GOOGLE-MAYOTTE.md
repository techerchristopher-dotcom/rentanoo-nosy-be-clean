# DIAG — Snippet Google "Mayotte" + "particulier & pros"

**Date :** 20 février 2026  
**Contexte :** Le snippet Google affiche encore « location de voiture entre particulier & pros sur l'île de Mayotte » alors que le site semble nettoyé.  
**⚠️ Phase 1 = DIAGNOSTIC UNIQUEMENT (aucune modification).**

---

## 1) GREP global (source de vérité)

### Occurrences exactes et variantes

| Terme recherché | Fichiers trouvés | Ligne(s) |
|-----------------|------------------|----------|
| **"Mayotte"** | AUDIT-SEO-PHASE1-NOSY-BE.md, DIAGNOSTIC-CARDS-VEHICULES.md, PLAN-*, archive/Index.tsx.backup, src/i18n (clés **only**) | Docs, archive, clés i18n (valeurs = "Nosy Be") |
| **"particulier"** | AUDIT-SEO-PHASE1-NOSY-BE.md, archive/Index.tsx.backup, FIX-WEBHOOK-EDL (cas particulier), i18n clé `louez_des_vhicules_entre_particuliers_dans_le_plus` | Valeur i18n = "Louez des scooters à Nosy Be..." |
| **"entre particulier"** | AUDIT-SEO-PHASE1-NOSY-BE.md | 61, 149 |
| **"location de voiture"** | AUDIT-SEO-PHASE1-NOSY-BE.md | 61, 149 |
| **"île de Mayotte"** | Aucun (dans le code source) | — |
| **"pros"** | AUDIT-SEO-PHASE1-NOSY-BE.md (dans la phrase complète) | 61, 149 |

### Détail des fichiers impactés

| Fichier | Type | Contenu |
|---------|------|---------|
| `AUDIT-SEO-PHASE1-NOSY-BE.md` | Documentation | Décrit l’**ancienne** meta description — pas du code exécutable |
| `archive/Index.tsx.backup` | Archive | Ancien backup — non déployé |
| `src/i18n/locales/*/common.json` | i18n | Clés legacy (`mayotte`, `partagez_la_route_mayotte`) — **valeurs = "Nosy Be"** |

**Conclusion GREP :** La chaîne exacte « location de voiture entre particulier & pros sur l'île de Mayotte » n’apparaît **pas** dans le code source actuel, uniquement dans des documents d’audit ou des archives.

---

## 2) Sources SEO réelles

### index.html (meta title / description / og / twitter)

| Élément | Valeur actuelle |
|---------|-----------------|
| `<title>` | Location scooter Nosy Be – Louer un scooter en ligne \| Rentanoo |
| `<meta name="description">` | Louez votre scooter à Nosy Be en quelques clics. Livraison à l'aéroport ou à l'hôtel. Casques et assurance inclus. Réservation 100 % en ligne. |
| `og:title` | Location scooter Nosy Be – Louer un scooter en ligne \| Rentanoo |
| `og:description` | Louez votre scooter à Nosy Be en quelques clics... |
| `twitter:title` | Idem |
| `twitter:description` | Idem |

**Mayotte / particulier / voiture :** Aucune occurrence dans index.html.

### Seo.tsx

- Gère `title`, `description`, `canonical`, `ogImage`, `structuredData`.
- Les valeurs viennent des props ou des traductions i18n.
- Aucune chaîne hardcodée Mayotte/particulier/voiture.

### i18n — clés `seo.*`

**Fichier :** `src/i18n/locales/fr/common.json`

| Clé | Valeur |
|-----|--------|
| `seo.home.title` | Location scooter Nosy Be – Réservation en ligne \| Rentanoo |
| `seo.home.description` | Louez votre scooter à Nosy Be en quelques clics. Livraison à l'aéroport ou à l'hôtel. Casques et assurance inclus. Réservez en ligne. |
| `seo.contact.*` | Nosy Be |
| `seo.legal.*` | Nosy Be |
| `seo.rentMyCar.*` | Nosy Be |
| `seo.sinistreCaution.*` | Nosy Be |
| `seo.notFound.*` | Nosy Be |
| `seo.vehicleLoading.*` | Nosy Be |
| `seo.vehicleNotFound.*` | Nosy Be |

**Conclusion :** Aucune clé SEO i18n ne contient Mayotte, particulier ou "location de voiture".

### Home : valeurs utilisées au runtime

- `Index.tsx` : `<Seo title={t("seo.home.title")} description={t("seo.home.description")} />`
- Valeurs réelles = celles de `seo.home.*` ci-dessus → Nosy Be, scooter.

---

## 3) Production (ce que Google voit aujourd’hui)

### Commande exécutée

```bash
curl -s https://rentanoo.com/ | head -80
```

### Éléments extraits de l’HTML initial

| Élément | Contenu |
|--------|---------|
| `<title>` | Location scooter Nosy Be – Louer un scooter en ligne \| Rentanoo |
| `<meta name="description">` | Louez votre scooter à Nosy Be en quelques clics. Livraison à l'aéroport ou à l'hôtel. Casques et assurance inclus. Réservation 100 % en ligne. |
| `og:title` | Location scooter Nosy Be – Louer un scooter en ligne \| Rentanoo |
| `og:description` | Louez votre scooter à Nosy Be en quelques clics... |
| `twitter:title` | Idem |
| `twitter:description` | Idem |
| JSON-LD LocalBusiness | name: "Rentanoo", description: "Location scooter Nosy Be...", areaServed: "Nosy Be, Madagascar" |

### Présence de Mayotte / particulier / voiture dans l’HTML prod

**Non.** Aucune occurrence dans l’HTML initial servi par le serveur.

---

## 4) Autres endpoints / pages

### Pages vérifiées

| Page | HTML initial | i18n / contenu |
|------|--------------|----------------|
| `/` (Home) | Nosy Be partout | `seo.home.*` → Nosy Be |
| `/legal` | Seo via `t("seo.legal.*")` | Nosy Be ; texte Legal.tsx = Nosy Be |
| `/contact` | `t("seo.contact.*")` | Nosy Be |
| `/rent-my-car` | `t("seo.rentMyCar.*")` | Nosy Be |
| `/sinistre-caution` | `t("seo.sinistreCaution.*")` | Nosy Be |

### Sitemap et robots

- `public/sitemap.xml` : uniquement des URLs, pas de meta ni de texte visible.
- `public/robots.txt` : aucun texte Mayotte/particulier/voiture.

---

## 5) Diagnostic final

### Cause la plus probable (par ordre)

| Rang | Cause | Probabilité | Preuve |
|------|-------|-------------|--------|
| **1** | **D) Snippet Google en cache** | Très élevée | HTML prod 2026 = Nosy Be. Aucune trace de Mayotte/particulier dans le code ni l’HTML. |
| 2 | A) Meta index.html / i18n | Faible | Toutes les meta actuelles = Nosy Be |
| 3 | B) JSON-LD | Nulle | LocalBusiness = Nosy Be |
| 4 | C) OG / Twitter | Nulle | og:* et twitter:* = Nosy Be |

### Tableau des sources

| Source trouvée ? | Fichier | Ligne | Action recommandée |
|------------------|---------|-------|--------------------|
| ❌ Non | index.html | — | Aucune (déjà correct) |
| ❌ Non | Seo.tsx | — | Aucune |
| ❌ Non | i18n seo.* | — | Aucune |
| ❌ Non | Legal.tsx | — | Aucune (Nosy Be) |
| ❌ Non | JSON-LD | — | Aucune |
| ❌ Non | OG / Twitter | — | Aucune |
| ⚠️ Oui (legacy) | i18n clés `mayotte`, `partagez_la_route_mayotte` | common.json | Optionnel : renommer pour cohérence (sans impact SEO direct) |
| ⚠️ Oui (docs) | AUDIT-SEO-PHASE1-NOSY-BE.md | 61, 149 | Aucune (documentation historique) |
| ⚠️ Oui (backup) | archive/Index.tsx.backup | 370, 537 | Aucune (non déployé) |

---

## 6) Plan de fix minimal (phase 2 — après diagnostic)

### Verdict

**Le texte problématique n’est plus présent dans le code ni dans l’HTML servi en production.** Le snippet Google provient très probablement d’une ancienne indexation.

### Actions recommandées (dans l’ordre)

1. **Google Search Console**
   - Inspection d’URL : `https://rentanoo.com`
   - Vérifier que la version indexée correspond bien à l’HTML actuel (Nosy Be).
   - Cliquer sur **« Demander une indexation »** pour forcer un recrawl.
   - Répéter si besoin pour la page d’accueil et les URLs principales.

2. **Vérifier la date d’indexation**
   - Dans GSC : Indexation > Pages.
   - Confirmer quand Google a last crawl la page.
   - Si la date est ancienne, le recrawl doit résoudre le problème.

3. **Travail optionnel (nettoyage cosmétique)**
   - Renommer les clés i18n `mayotte` → par ex. `nosyBe` pour éviter toute confusion future (pas d’impact SEO direct).

### À ne pas faire

- Ne pas modifier les meta actuelles (elles sont correctes).
- Ne pas modifier le JSON-LD (il est correct).
- Ne pas déployer ou utiliser `archive/Index.tsx.backup`.
