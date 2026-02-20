# DIAG SEO — JSON-LD absent dans le HTML rendu

**Date :** 20 février 2026  
**Contexte :** structuredData passé via `<Seo structuredData={...} />` (react-helmet-async), mais aucun `<script type="application/ld+json">` visible dans le HTML en prod.  
**⚠️ Aucune modification — diagnostic uniquement.**

---

## 1) Vérification Seo.tsx

### Code actuel du bloc Helmet

**Fichier :** `src/components/seo/Seo.tsx`

```tsx
return (
  <Helmet>
    <title>{effectiveTitle}</title>
    <meta name="description" content={effectiveDescription} />
    <meta property="og:title" content={effectiveTitle} />
    ...
    {canonical && <link rel="canonical" href={canonical} />}
    {structuredData && (
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    )}
  </Helmet>
);
```

### Analyse

- Le bloc `{structuredData && (...)}` est correct : le script n’est rendu que si `structuredData` est défini.
- `JSON.stringify()` produit une chaîne JSON valide.
- react-helmet-async gère les scripts avec contenu (`innerHTML`) : le contenu est mappé en `innerHTML` puis injecté dans le DOM.
- Aucune option `encode` ou `sanitize` n’est passée à Helmet → encodage par défaut uniquement sur les attributs, pas sur le contenu `innerHTML` du script.
- Documentation Helmet : les enfants de `<script>` doivent être une string (ou tableau de strings). `JSON.stringify(obj)` retourne bien une string → conforme.

**Conclusion :** L’implémentation Seo.tsx est correcte. Le script est censé être injecté dans le `<head>` quand `structuredData` est fourni.

---

## 2) Vérification Index.tsx

### Appel à Seo

**Fichier :** `src/pages/Index.tsx` (lignes 488–505)

```tsx
<Seo
  title={t("seo.home.title")}
  description={t("seo.home.description")}
  canonical="https://rentanoo.com"
  structuredData={{
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Rentanoo",
    url: "https://rentanoo.com",
    image: "https://rentanoo.com/og-rentanoo-nosy-be.webp",
    description: "Location scooter Nosy Be avec livraison...",
    areaServed: {
      "@type": "Place",
      name: "Nosy Be, Madagascar",
    },
  }}
/>
```

### Analyse

- `structuredData` est passé directement (objet inline).
- Pas de condition (`&&`, ternaire) qui pourrait le rendre `undefined`.
- L’objet est valide pour schema.org.
- `Seo` est monté dès le premier rendu du return principal (pas dans un sous-composant conditionnel).

**Conclusion :** Index.tsx transmet correctement `structuredData` à `<Seo>`. Aucune cause évidente côté appel.

---

## 3) Conflits potentiels (Seo / Helmet multiples)

### Occurrences de Seo sur la route Home

| Composant              | Monté sur Home ?        | Seo avec structuredData ? |
|------------------------|-------------------------|---------------------------|
| **Index**             | Oui (premier rendu)     | Oui (LocalBusiness)       |
| **HomeResults**       | Lazy, monté si showResults | Non (aucun Seo)    |
| **Footer**            | Lazy, monté             | Non                       |
| **SearchBarAirbnb**   | Oui                     | Non                       |
| **Navbar**            | Oui                     | Non                       |

### Provider Helmet

**Fichier :** `src/main.tsx`

```tsx
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
```

- Un seul `HelmetProvider` à la racine.
- Pas de `HelmetProvider` imbriqué.

### Conflit éventuel

- Un seul `<Seo>` avec structuredData sur la Home.
- Pas d’autre `<Seo>` ou `<Helmet>` susceptible de remplacer les scripts.
- Helmet fusionne les tags ; le script JSON-LD est ajouté à la liste des scripts du head.

**Conclusion :** Aucun conflit détecté. Le JSON-LD ne devrait pas être écrasé par un autre Helmet/Seo.

---

## 4) Test local reproductible (sans navigateur)

### Prérequis

- Build prod : `npm run build`
- Servir `dist` : par exemple `npx serve dist -p 3000` ou le script serveur du projet.

### Vérification du DOM après hydration

Le script est injecté côté client après l’exécution de React. Il ne sera donc **jamais** visible dans “View Page Source” (HTML initial servi par le serveur).

#### Option A : Manuellement (DevTools)

1. Aller sur `http://localhost:3000/` (ou l’URL de prod).
2. Ouvrir DevTools → onglet **Elements**.
3. Développer `<head>`.
4. Rechercher un élément `<script type="application/ld+json">` avec l’attribut `data-rh="true"`.
5. Vérifier que le contenu du script est du JSON LocalBusiness.

#### Option B : Playwright (exemple)

```js
// test-jsonld.spec.js
import { test, expect } from '@playwright/test';

test('JSON-LD LocalBusiness présent après chargement', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('networkidle'); // ou 'domcontentloaded'

  const script = await page.locator('script[type="application/ld+json"]').first();
  await expect(script).toBeVisible();
  const content = await script.textContent();
  const json = JSON.parse(content);
  expect(json['@type']).toBe('LocalBusiness');
  expect(json.name).toBe('Rentanoo');
});
```

#### Option C : jsdom (Node)

```js
import { JSDOM } from 'jsdom';
// Nécessite d'exécuter le JS de l'app (hydration) — complexe pour une SPA.
// Préférer Playwright/Puppeteer pour une SPA.
```

**Recommandation :** Utiliser DevTools (Elements) ou Playwright pour vérifier le DOM après chargement.

### Distinction importante

| Méthode              | Ce qu’on voit                                      | JSON-LD attendu ? |
|----------------------|----------------------------------------------------|--------------------|
| View Page Source     | HTML initial (index.html, avant React)             | Non                |
| Inspect Element      | DOM actuel après exécution de React                | Oui                |
| curl / fetch brut    | HTML initial seulement                             | Non                |

---

## 5) Cause la plus probable + correctif minimal

### Cause la plus probable

1. **Utilisation de “View Page Source” ou d’un outil qui affiche l’HTML initial**

   - En SPA, l’HTML servi est `index.html` (ou équivalent).
   - React et Helmet s’exécutent côté client.
   - Le script JSON-LD est injecté après le chargement du JS.
   - Donc : le script n’apparaît jamais dans “View Page Source”.

2. **Décalage de timing (Helmet `defer`)**

   - Helmet utilise `defer: true` par défaut → `requestAnimationFrame`.
   - Si une vérification se fait avant le prochain frame, le script peut ne pas être encore présent.

3. **Absence de SSR**

   - Sans SSR, l’HTML initial n’a pas le JSON-LD.
   - Certains crawlers ou tests (ex. rich results) peuvent se baser sur l’HTML brut ou sur un rendu incomplet.

### Fix minimal recommandé (sans coder ici)

#### Si la cause est “View Source” / absence de SSR

- **Option 1 (idéale) :** Mettre en place du SSR (Next.js, Remix, etc.) et injecter le JSON-LD dans le `<head>` côté serveur.
- **Option 2 (workaround) :** Injecter le JSON-LD directement dans `index.html` pour la Home (script statique dans `public/index.html` ou généré au build).
- **Option 3 :** Ne rien changer et vérifier dans le DOM réel (Inspect Element) ou via l’outil d’inspection d’URL de Google après rendu JS.

#### Si la cause est timing / Helmet

- **Option 1 :** Passer `defer={false}` à `<Helmet>` dans Seo.tsx pour que les changements soient appliqués immédiatement.
- **Option 2 :** S’assurer que les tests attendent un peu (par ex. `waitForLoadState('networkidle')` ou `setTimeout`) avant de chercher le script.

#### Si le script est mal injecté par Helmet

- **Option 1 :** Remplacer l’injection via Helmet par un script ajouté manuellement (effet ou ref) :

  ```tsx
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
    return () => script.remove();
  }, [structuredData]);
  ```

- **Option 2 :** Utiliser `dangerouslySetInnerHTML` dans un élément `<script>` rendu via un portal dans le head (si Helmet pose problème).

### Checklist de vérification avant tout correctif

1. [ ] Vérifier dans **Elements** (Inspect) et non “View Page Source”.
2. [ ] Attendre le chargement complet de la page (Network idle).
3. [ ] Vérifier sur une URL Home réelle (pas une redirection ou une 404).
4. [ ] Tester en navigation directe sur `/` (et non après une redirection complexe).

---

## 6) Synthèse

| Point                         | Statut |
|------------------------------|--------|
| Seo.tsx rend le script       | Correct |
| Index.tsx passe structuredData | Correct |
| Conflit Helmet / Seo         | Aucun |
| Cause probable               | View Source vs DOM réel, ou timing Helmet `defer` |
| Correctif minimal            | Vérifier en Inspect ; si nécessaire : SSR ou injection manuelle |

**Recommandation :** D’abord confirmer que le script est absent en Inspect Element (et pas seulement en View Source). S’il reste absent après chargement complet, envisager une injection manuelle via `useEffect` en contournant Helmet.
