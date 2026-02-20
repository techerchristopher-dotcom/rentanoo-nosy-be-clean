# DIAG GA4 — Pas de données en temps réel

**Date :** 20 février 2026  
**Contexte :** GA4 Measurement ID `G-WVKC4DHFL3` — `typeof gtag` = "function", mais aucune requête `google-analytics.com/g/collect` et absence dans GA4 Temps réel.  
**⚠️ DIAGNOSTIC UNIQUEMENT — aucune modification tant que la cause n’est pas identifiée.**

---

## 1) Scan du tracking

### Où le tracking est installé

| Emplacement | Fichier | Extrait / comportement |
|-------------|---------|------------------------|
| **index.html** | `index.html` L.14, 50 | `preconnect` vers googletagmanager.com ; commentaire : "Google tag chargé de façon différée via main.tsx après requestIdleCallback". **Aucun script gtag.js dans le HTML.** |
| **Entrypoint** | `src/main.tsx` L.6, 10 | `import { initGtag } from "@/lib/gtag"` ; `initGtag()` appelé immédiatement au démarrage. |
| **Logique gtag** | `src/lib/gtag.ts` | Création du stub gtag, config, chargement différé du script. |
| **GTM** | — | Aucune trace de GTM (GTM-XXXX) dans le projet. |
| **Autres** | `DepositFlowModal.tsx`, `PaymentSuccess.tsx` | Utilisent `sendPurchaseConversion`, `sendDepositConversion` (conversions Google Ads uniquement). |

### Extrait pertinent : `src/lib/gtag.ts`

```ts
const GOOGLE_ADS_ID = "AW-17959989720";

export function initGtag(): void {
  window.dataLayer = window.dataLayer || [];
  const gtagFn = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtagFn;

  gtagFn("js", new Date());
  gtagFn("config", GOOGLE_ADS_ID);   // ← UNIQUEMENT Google Ads (AW-)

  const loadGtagScript = () => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;  // ← Charge AW- uniquement
    document.head.appendChild(s);
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(loadGtagScript, { timeout: 2000 });
  } else {
    setTimeout(loadGtagScript, 2000);
  }
}
```

### Constat

- Seul **Google Ads** (`AW-17959989720`) est configuré.
- Le Measurement ID **GA4** (`G-WVKC4DHFL3`) n’apparaît nulle part dans le code.

---

## 2) Consent Mode

| Recherche | Résultat |
|-----------|----------|
| `gtag('consent'` | Aucune occurrence |
| `ad_storage` | Aucune |
| `analytics_storage` | Aucune |
| `Consent Mode` | Aucune |
| `default` / `denied` | Aucune (hors contexte analytics) |
| CMP | Aucune |

**Conclusion :** Pas de Consent Mode, donc pas de blocage par consentement.

---

## 3) send_page_view

| Recherche | Résultat |
|-----------|----------|
| `send_page_view` | Aucune occurrence |
| `send_page_view: false` | Aucune |
| `page_view` | Aucune (hors i18n) |

**Conclusion :** Pas de désactivation explicite de `send_page_view`. Mais **GA4 n’est jamais configuré**, donc la question du page_view ne se pose pas.

---

## 4) CSP / headers

| Recherche | Résultat |
|-----------|----------|
| `Content-Security-Policy` | Aucune (pas de netlify.toml, vercel.json, CSP dans le code) |
| `script-src` / `connect-src` | Aucune |
| `server/index.ts` | Aucune définition de CSP (uniquement Cache-Control) |

**Conclusion :** Aucune CSP repérée dans le repo. Risque faible, à confirmer en prod (headers HTTP).

---

## 5) Tag chargé trop tard / jamais

### Flux actuel

1. `main.tsx` appelle `initGtag()` dès le chargement.
2. Stub gtag défini immédiatement (`window.gtag` = fonction).
3. `gtag("js", ...)` et `gtag("config", GOOGLE_ADS_ID)` sont mis dans le dataLayer.
4. Le script est chargé via `requestIdleCallback(loadGtagScript, { timeout: 2000 })` → exécution au plus tard ~2 s.
5. Le script charge `gtag/js?id=AW-17959989720` (Google Ads uniquement).

### Conditions spécifiques

| Vérification | Résultat |
|--------------|----------|
| Uniquement en production ? | Non — `initGtag()` est appelé sans condition d’environnement. |
| Uniquement certaines routes ? | Non. |
| Après consent ? | Non. |
| try/catch masquant des erreurs ? | Non. |

**Conclusion :** Le script gtag est bien chargé (avec délai). Le vrai problème est qu’il ne traite que le tag Google Ads (AW-), pas GA4 (G-).

---

## 6) Cannibalisation / tags multiples

| Vérification | Résultat |
|-------------|----------|
| Plusieurs IDs GA4 ? | Non — aucun ID GA4 configuré. |
| GTM + gtag en parallèle ? | Non — pas de GTM. |
| dataLayer réinitialisée ? | Non — utilisation classique. |
| gtag défini mais pas initialisé ? | Stub défini ; le vrai script est chargé avec `id=AW-...`. |

**Conclusion :** Pas de cannibalisation. C’est l’**absence** de configuration GA4 qui pose problème.

---

## 7) Preuves et tests (sans changer la prod)

### A) Vérifier l’appel à `gtag('config')`

Ligne de log temporaire dans `src/lib/gtag.ts` juste après `gtagFn("config", GOOGLE_ADS_ID)` :

```ts
// Temporaire
console.log("[GTAG-DEBUG] config appelé pour:", GOOGLE_ADS_ID, "| GA4 configuré ? NON");
```

### B) Test manuel dans la console

```js
// Vérifier que gtag existe
typeof window.gtag  // → "function"

// Configurer GA4 manuellement (pour test uniquement)
window.gtag('config', 'G-WVKC4DHFL3');
// Puis recharger et filtrer Network par "collect" → les requêtes /g/collect doivent apparaître
```

### C) Vérifier client_id

```js
// Après config GA4
window.gtag('get', 'G-WVKC4DHFL3', 'client_id', console.log);
```

### D) Événement test

```js
window.gtag('event', 'debug_test', { debug_mode: true });
// Puis vérifier Network → requêtes vers google-analytics.com
```

---

## 8) Synthèse

### A) Causes probables classées

| Rang | Cause | Justification |
|------|-------|----------------|
| 1 | GA4 jamais configuré | Seul `AW-17959989720` est utilisé. Aucune trace de `G-WVKC4DHFL3` ni de `gtag('config', 'G-...')`. Les requêtes `/g/collect` sont spécifiques à GA4. |
| 2 | Script chargé trop tard | `requestIdleCallback` peut retarder le chargement de 0 à 2 s. Peu probable comme cause principale car le stub fonctionne. |
| 3 | CSP en prod | Pas de CSP dans le repo ; à contrôler via les headers de réponse. |
| 4 | Consent Mode | Absent dans le code. |
| 5 | send_page_view désactivé | Non configuré ; non pertinent sans config GA4. |

### B) Cause racine la plus probable

**GA4 (G-WVKC4DHFL3) n’est jamais configuré.**

- Le code ne contient que le tag **Google Ads** (AW-17959989720).
- GA4 nécessite un `gtag('config', 'G-WVKC4DHFL3')` pour envoyer page_view et autres événements vers la propriété GA4.
- Sans cette configuration, aucune requête `/g/collect` n’est envoyée, d’où l’absence de données en Temps réel.

### C) Correctif minimal proposé

**Objectif :** ajouter la configuration GA4 à côté de Google Ads, sans toucher au reste.

#### 1. Constante GA4 dans `src/lib/gtag.ts`

```ts
const GOOGLE_ADS_ID = "AW-17959989720";
const GA4_MEASUREMENT_ID = "G-WVKC4DHFL3";  // ← Nouveau
```

#### 2. Charger gtag avec les deux IDs

Le script gtag peut être chargé avec un seul ID ; les deux configs suffisent :

```ts
gtagFn("js", new Date());
gtagFn("config", GOOGLE_ADS_ID);
gtagFn("config", GA4_MEASUREMENT_ID);  // ← Nouveau : active GA4 et envoie page_view
```

#### 3. Script gtag (optionnel)

Pour que le script soit optimisé pour GA4 dès le chargement, on peut charger avec l’ID GA4 :

```ts
s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
// OU les deux : id=G-WVKC4DHFL3&id=AW-17959989720 (si supporté)
```

Le plus simple est de conserver le chargement actuel (`id=AW-...`) et d’ajouter `gtag('config', GA4_MEASUREMENT_ID)` : gtag gère plusieurs IDs.

**Modifications recommandées :**

- **Fichier :** `src/lib/gtag.ts`
- **Lignes :** ajout de la constante GA4 et d’un `gtagFn("config", GA4_MEASUREMENT_ID)` après la config Ads.

### D) Validation

| Étape | Vérification |
|-------|--------------|
| 1 | Build OK : `npm run build` |
| 2 | Déployer et ouvrir la page |
| 3 | Network : filtre `collect` → voir des requêtes vers `www.google-analytics.com/g/collect` |
| 4 | GA4 : Temps réel → voir des utilisateurs actifs |
| 5 | GA4 DebugView : activer `debug_mode: true` pour un événement test puis vérifier la réception |

---

## Annexe : Diff minimal proposé

```diff
--- a/src/lib/gtag.ts
+++ b/src/lib/gtag.ts
@@ -5,7 +5,8 @@
  * l'impact des scripts tiers sur le chargement initial.
  */

 const GOOGLE_ADS_ID = "AW-17959989720";
+const GA4_MEASUREMENT_ID = "G-WVKC4DHFL3";

 export function initGtag(): void {
   window.dataLayer = window.dataLayer || [];
@@ -19,6 +20,7 @@ export function initGtag(): void {

   gtagFn("js", new Date());
   gtagFn("config", GOOGLE_ADS_ID);
+  gtagFn("config", GA4_MEASUREMENT_ID);

   const loadGtagScript = () => {
     const s = document.createElement("script");
```

Optionnel : changer l’URL du script pour charger avec l’ID GA4 si souhaité (`id=${GA4_MEASUREMENT_ID}` ou combinaison des deux IDs).


---

## 9) Checklist de validation (post-fix)

Après déploiement du fix GA4 + RouteChangeTracker :

| # | Vérification | Comment faire |
|---|--------------|---------------|
| 1 | **Network : /g/collect présent** | F12 → Network → filtre `collect` → recharger la page. Doit apparaître des requêtes vers `www.google-analytics.com/g/collect` |
| 2 | **GA4 Temps réel : utilisateur visible** | GA4 → Rapports → Temps réel → vérifier qu'au moins 1 utilisateur actif s'affiche |
| 3 | **Pages and screens : pages listées** | GA4 → Temps réel → section "Pages et écrans" (ou "Pages and screens") → les URLs visitées doivent apparaître |
