# IMPLÉMENTATION — Schema LocalBusiness (Home)

**Date :** 20 février 2026  
**Objectif :** Ajouter JSON-LD LocalBusiness sur la page d'accueil uniquement.

---

## Diff

### src/components/seo/Seo.tsx

```diff
 export interface SeoProps {
   title?: string;
   description?: string;
   canonical?: string;
   ogImage?: string;
+  /** JSON-LD structured data (Schema.org) — injecté en script type="application/ld+json" */
+  structuredData?: object;
 }

 /**
  * Injects SEO meta tags...
+ * Optionally injects JSON-LD structured data when structuredData is provided.
  */
-export function Seo({ title, description, canonical, ogImage }: SeoProps) {
+export function Seo({ title, description, canonical, ogImage, structuredData }: SeoProps) {
   ...
       {canonical && <link rel="canonical" href={canonical} />}
+      {structuredData && (
+        <script type="application/ld+json">
+          {JSON.stringify(structuredData)}
+        </script>
+      )}
     </Helmet>
```

### src/pages/Index.tsx

```diff
       <Seo
         title={t("seo.home.title")}
         description={t("seo.home.description")}
         canonical="https://rentanoo.com"
+        structuredData={{
+          "@context": "https://schema.org",
+          "@type": "LocalBusiness",
+          name: "Rentanoo",
+          url: "https://rentanoo.com",
+          image: "https://rentanoo.com/og-rentanoo-nosy-be.webp",
+          description:
+            "Location scooter Nosy Be avec livraison à l'aéroport ou à l'hôtel. Assurance et casque inclus.",
+          areaServed: {
+            "@type": "Place",
+            name: "Nosy Be, Madagascar",
+          },
+        }}
       />
```

---

## Vérifications

### dist/index.html

Le fichier `dist/index.html` ne contient **pas** le JSON-LD. Comportement normal pour une SPA : le schéma est injecté côté client par `react-helmet-async` au montage du composant Index.

### dist/assets/index-*.js

Le bundle principal contient bien le code lié au schema :
- `schema.org`
- `LocalBusiness`
- `@context`

Le JSON-LD est présent dans le DOM après rendu de la page d'accueil.

### Autres pages

| Page | Seo utilisé | structuredData |
|------|-------------|----------------|
| Index (Home) | ✅ | ✅ LocalBusiness |
| SinistreCaution | ✅ | ❌ |
| VehicleDetails | ✅ | ❌ |
| MotoVehicleDetails | ✅ | ❌ |
| Contact, Legal, RentMyCar, etc. | ✅ | ❌ |

Le schema LocalBusiness n’est transmis qu’à la Home.

---

## Build

**OK** (✓ built in 5.25s)
