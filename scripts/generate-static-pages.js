#!/usr/bin/env node
/**
 * Génère des fichiers HTML statiques pré-rendus pour les pages SEO et blog.
 * Exécuté en postbuild après `vite build`.
 * Chaque page → dist/{slug}/index.html avec title, meta, h1 et FAQ injectés.
 * Express sert automatiquement les index.html de sous-dossiers.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const PAGES = [
  {
    slug: "location-scooter-nosy-be",
    title: "Location scooter à Nosy Be – Réservez en ligne | Rentanoo",
    description: "Louez un scooter à Nosy Be dès 35 €/jour. Livraison à l'aéroport Fascène ou à l'hôtel. 125cc, 150cc, 200cc disponibles. Réservation 100 % en ligne.",
    canonical: "https://rentanoo.com/location-scooter-nosy-be",
    h1: "Location scooter à Nosy Be",
    intro: "Explorez Nosy Be à votre rythme avec nos scooters disponibles 7j/7. Livraison à l'aéroport Fascène ou à votre hôtel. Casque et assurance inclus.",
    faq: [
      { q: "Quel permis faut-il pour louer un scooter à Nosy Be ?", a: "Pour un 125cc, le permis voiture (B) suffit. Pour 150cc et plus, un permis moto (A) est recommandé." },
      { q: "La livraison à l'aéroport de Nosy Be est-elle possible ?", a: "Oui, Rentanoo livre à l'aéroport international Fascène. Précisez votre numéro de vol lors de la réservation." },
      { q: "Quel est le prix d'un scooter à Nosy Be ?", a: "Comptez en général entre 25 € et 50 € par jour. Des réductions sont disponibles pour les locations longue durée." },
      { q: "Le casque est-il fourni ?", a: "Oui, un casque homologué est inclus dans chaque location." },
      { q: "Peut-on payer en ligne pour louer un scooter à Nosy Be ?", a: "Oui, Rentanoo propose une réservation et un paiement 100 % en ligne par carte bancaire." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location scooter Nosy Be", item: "https://rentanoo.com/location-scooter-nosy-be" },
    ],
  },
  {
    slug: "location-moto-nosy-be",
    title: "Location moto à Nosy Be – Deux-roues puissants | Rentanoo",
    description: "Louez une moto à Nosy Be. Wakaza, Honda et autres modèles 250cc+. Livraison aéroport Fascène. Réservation en ligne sécurisée sur Rentanoo.",
    canonical: "https://rentanoo.com/location-moto-nosy-be",
    h1: "Location moto à Nosy Be",
    intro: "Découvrez Nosy Be sur une moto puissante. Modèles 250cc et plus, idéaux pour les pistes et les routes de l'île.",
    faq: [
      { q: "Quels modèles de motos sont disponibles à Nosy Be ?", a: "Rentanoo propose des motos 250cc et plus, adaptées aux routes de Nosy Be." },
      { q: "Faut-il un permis moto pour louer à Nosy Be ?", a: "Oui, un permis moto (A) est requis pour les modèles 250cc et plus." },
      { q: "La livraison à l'aéroport Fascène est-elle incluse ?", a: "Oui, la livraison à l'aéroport Fascène est disponible sur demande lors de la réservation." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location moto Nosy Be", item: "https://rentanoo.com/location-moto-nosy-be" },
    ],
  },
  {
    slug: "location-quad-nosy-be",
    title: "Location quad à Nosy Be – ATV disponibles | Rentanoo",
    description: "Louez un quad (ATV) à Nosy Be. Explorez les pistes et plages de Madagascar en toute sécurité. Livraison possible. Réservez sur Rentanoo.",
    canonical: "https://rentanoo.com/location-quad-nosy-be",
    h1: "Location quad à Nosy Be",
    intro: "Parcourez les pistes et plages de Nosy Be en quad. Modèles ATV robustes disponibles à la location.",
    faq: [
      { q: "Peut-on louer un quad à Nosy Be ?", a: "Oui, Rentanoo propose des quads (ATV) disponibles à la location pour explorer l'île." },
      { q: "Un permis est-il nécessaire pour conduire un quad à Nosy Be ?", a: "Un permis voiture (B) est généralement suffisant pour les quads de loisirs." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location quad Nosy Be", item: "https://rentanoo.com/location-quad-nosy-be" },
    ],
  },
  {
    slug: "location-voiture-nosy-be",
    title: "Location voiture à Nosy Be – SUV, pick-up, 4x4 | Rentanoo",
    description: "Louez une voiture à Nosy Be : SUV, pick-up 4x4, voitures climatisées. Livraison à l'aéroport Fascène. Réservation en ligne sur Rentanoo.",
    canonical: "https://rentanoo.com/location-voiture-nosy-be",
    h1: "Location voiture à Nosy Be",
    intro: "SUV, 4x4 et pick-ups disponibles à Nosy Be. Idéal pour les familles et les routes de l'île.",
    faq: [
      { q: "Quels types de voitures peut-on louer à Nosy Be ?", a: "Rentanoo propose des SUV, pick-ups 4x4 et berlines climatisées adaptées aux routes de Nosy Be." },
      { q: "La livraison à l'aéroport Fascène est-elle possible ?", a: "Oui, la livraison est disponible à l'aéroport international Fascène de Nosy Be." },
      { q: "Faut-il un permis international pour louer une voiture à Nosy Be ?", a: "Un permis de conduire français ou européen est accepté. Un permis international peut être demandé." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location voiture Nosy Be", item: "https://rentanoo.com/location-voiture-nosy-be" },
    ],
  },
  {
    slug: "location-vacances-nosy-be",
    title: "Location vacances Nosy Be – Appartements, villas, bungalows | Rentanoo",
    description: "Louez votre hébergement à Nosy Be : appartements, villas, bungalows à Ambatoloaka et Madirokely. Réservation sécurisée en ligne sur Rentanoo.",
    canonical: "https://rentanoo.com/location-vacances-nosy-be",
    h1: "Location vacances à Nosy Be",
    intro: "Trouvez votre hébergement idéal à Nosy Be : appartements climatisés, villas avec piscine ou bungalows authentiques.",
    faq: [
      { q: "Quels hébergements sont disponibles à Nosy Be ?", a: "Rentanoo propose des appartements, villas, bungalows et maisons à Ambatoloaka, Madirokely et Andilana." },
      { q: "Peut-on réserver un hébergement en ligne à Nosy Be ?", a: "Oui, toutes les réservations se font en ligne sur Rentanoo avec paiement sécurisé." },
      { q: "Dans quels quartiers se trouvent les hébergements ?", a: "Les hébergements sont principalement à Ambatoloaka, Madirokely et Andilana, proches des plages." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
    ],
  },
  {
    slug: "location-appartement-nosy-be",
    title: "Location appartement à Nosy Be – Ambatoloaka & Madirokely | Rentanoo",
    description: "Louez un appartement à Nosy Be. Proches de la plage d'Ambatoloaka, climatisés, tout équipés. Réservation en ligne sécurisée sur Rentanoo.",
    canonical: "https://rentanoo.com/location-appartement-nosy-be",
    h1: "Location appartement à Nosy Be",
    intro: "Appartements climatisés à Nosy Be, proches de la plage. Ambatoloaka et Madirokely.",
    faq: [
      { q: "Où trouver des appartements à louer à Nosy Be ?", a: "Les appartements Rentanoo sont situés principalement à Ambatoloaka et Madirokely, à proximité des plages." },
      { q: "Les appartements sont-ils climatisés à Nosy Be ?", a: "Oui, la plupart des appartements disponibles sur Rentanoo sont climatisés." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
      { name: "Location appartement Nosy Be", item: "https://rentanoo.com/location-appartement-nosy-be" },
    ],
  },
  {
    slug: "location-villa-nosy-be",
    title: "Location villa à Nosy Be – Avec piscine & vue mer | Rentanoo",
    description: "Louez une villa à Nosy Be : piscine, vue mer, espaces extérieurs. Andilana, Madirokely. Réservation en ligne sécurisée sur Rentanoo.",
    canonical: "https://rentanoo.com/location-villa-nosy-be",
    h1: "Location villa à Nosy Be",
    intro: "Villas avec piscine et vue mer à Nosy Be. Idéal pour des vacances en famille ou entre amis.",
    faq: [
      { q: "Y a-t-il des villas avec piscine à louer à Nosy Be ?", a: "Oui, Rentanoo propose des villas avec piscine privée, principalement à Andilana et Madirokely." },
      { q: "Quelle est la capacité des villas à Nosy Be ?", a: "Les villas disponibles sur Rentanoo peuvent accueillir de 4 à 10 personnes selon le modèle." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
      { name: "Location villa Nosy Be", item: "https://rentanoo.com/location-villa-nosy-be" },
    ],
  },
  {
    slug: "location-bungalow-nosy-be",
    title: "Location bungalow à Nosy Be – Authentique & proche mer | Rentanoo",
    description: "Louez un bungalow à Nosy Be. Style traditionnel malgache, proche de la plage. Ambatoloaka, Madirokely. Réservation en ligne sur Rentanoo.",
    canonical: "https://rentanoo.com/location-bungalow-nosy-be",
    h1: "Location bungalow à Nosy Be",
    intro: "Bungalows de style traditionnel malgache, proches de la mer à Nosy Be.",
    faq: [
      { q: "Qu'est-ce qu'un bungalow à Nosy Be ?", a: "Un bungalow est un hébergement de style traditionnel malgache, généralement proche de la plage et dans un cadre naturel." },
      { q: "Les bungalows sont-ils proches de la plage à Nosy Be ?", a: "Oui, les bungalows Rentanoo sont situés à Ambatoloaka et Madirokely, à quelques minutes à pied de la mer." },
    ],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
      { name: "Location bungalow Nosy Be", item: "https://rentanoo.com/location-bungalow-nosy-be" },
    ],
  },
  {
    slug: "blog",
    title: "Blog Nosy Be – Guides de voyage et conseils | Rentanoo",
    description: "Guides pratiques pour visiter Nosy Be : itinéraires, conseils location, météo, aéroport Fascène. Le blog voyage de Rentanoo.",
    canonical: "https://rentanoo.com/blog",
    h1: "Blog Nosy Be – Guides et conseils voyage",
    intro: "Préparez votre séjour à Nosy Be avec nos guides pratiques : itinéraires, location de scooter, météo et infos aéroport.",
    faq: [],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Blog", item: "https://rentanoo.com/blog" },
    ],
  },
  {
    slug: "blog/comment-louer-un-scooter-a-nosy-be",
    title: "Comment louer un scooter à Nosy Be — Guide complet | Rentanoo",
    description: "Documents nécessaires, choix du véhicule, prix et erreurs à éviter : notre guide complet pour louer un scooter à Nosy Be facilement et sereinement.",
    canonical: "https://rentanoo.com/blog/comment-louer-un-scooter-a-nosy-be",
    h1: "Comment louer un scooter à Nosy Be facilement",
    intro: "Le bon type de véhicule, les documents demandés, l'état du scooter et les conditions de remise : tout ce qu'il faut anticiper pour louer un scooter à Nosy Be sans perdre de temps.",
    faq: [],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Blog", item: "https://rentanoo.com/blog" },
      { name: "Comment louer un scooter à Nosy Be", item: "https://rentanoo.com/blog/comment-louer-un-scooter-a-nosy-be" },
    ],
  },
  {
    slug: "blog/visiter-nosy-be-en-scooter",
    title: "Visiter Nosy Be en scooter — Guide complet 2026 | Rentanoo",
    description: "Notre guide pour visiter Nosy Be en scooter : meilleurs itinéraires, routes praticables, plages accessibles, conseils de sécurité et tarifs de location.",
    canonical: "https://rentanoo.com/blog/visiter-nosy-be-en-scooter",
    h1: "Visiter Nosy Be en scooter : itinéraire et conseils pratiques",
    intro: "Le scooter est le moyen de transport idéal pour découvrir Nosy Be. Routes accessibles, paysages magnifiques et liberté totale.",
    faq: [],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Blog", item: "https://rentanoo.com/blog" },
      { name: "Visiter Nosy Be en scooter", item: "https://rentanoo.com/blog/visiter-nosy-be-en-scooter" },
    ],
  },
  {
    slug: "blog/itineraire-nosy-be-4-jours",
    title: "Itinéraire Nosy Be 4 jours – Programme complet 2026 | Rentanoo",
    description: "Programme jour par jour pour visiter Nosy Be en 4 jours : plages, Mont Passot, Nosy Tanikely, villages malgaches. Conseils pratiques et budget.",
    canonical: "https://rentanoo.com/blog/itineraire-nosy-be-4-jours",
    h1: "Itinéraire Nosy Be 4 jours : que voir et que faire",
    intro: "4 jours à Nosy Be : notre programme complet pour ne rien manquer de l'île aux parfums.",
    faq: [],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Blog", item: "https://rentanoo.com/blog" },
      { name: "Itinéraire Nosy Be 4 jours", item: "https://rentanoo.com/blog/itineraire-nosy-be-4-jours" },
    ],
  },
  {
    slug: "blog/aeroport-fascene-guide-arrivee",
    title: "Aéroport Fascène Nosy Be (NOS) — Guide arrivée 2026 | Rentanoo",
    description: "Guide complet arrivée à l'aéroport Fascène de Nosy Be : formalités, douane, change, transports depuis l'aéroport. Livraison scooter et voiture disponible.",
    canonical: "https://rentanoo.com/blog/aeroport-fascene-guide-arrivee",
    h1: "Aéroport Fascène Nosy Be : guide complet pour votre arrivée",
    intro: "Tout ce qu'il faut savoir pour votre arrivée à l'aéroport Fascène de Nosy Be : formalités, transport, et location de scooter sur place.",
    faq: [],
    breadcrumbs: [
      { name: "Accueil", item: "https://rentanoo.com/" },
      { name: "Blog", item: "https://rentanoo.com/blog" },
      { name: "Guide aéroport Fascène", item: "https://rentanoo.com/blog/aeroport-fascene-guide-arrivee" },
    ],
  },
];

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFaqSchema(faqItems, canonical) {
  if (!faqItems.length) return "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildBreadcrumbSchema(breadcrumbs) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function buildPrerenderedBody(page) {
  const faqHtml = page.faq.length
    ? `<section><h2>Questions fréquentes</h2><dl>${page.faq
        .map((f) => `<dt>${escapeHtml(f.q)}</dt><dd>${escapeHtml(f.a)}</dd>`)
        .join("")}</dl></section>`
    : "";

  return `<div id="prerender-seo" aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">
  <h1>${escapeHtml(page.h1)}</h1>
  <p>${escapeHtml(page.intro)}</p>
  ${faqHtml}
</div>`;
}

function injectIntoHtml(template, page) {
  let html = template;

  // Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(page.title)}</title>`
  );

  // Inject meta/link tags before </head>
  const metaTags = [
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:url" content="${escapeHtml(page.canonical)}">`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}">`,
    buildBreadcrumbSchema(page.breadcrumbs),
    buildFaqSchema(page.faq, page.canonical),
  ].join("\n");

  html = html.replace("</head>", `${metaTags}\n</head>`);

  // Inject pre-rendered content into #root
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${buildPrerenderedBody(page)}</div>`
  );

  return html;
}

async function main() {
  const templatePath = join(DIST, "index.html");
  let template;
  try {
    template = readFileSync(templatePath, "utf-8");
  } catch {
    console.error("[generate-static-pages] dist/index.html introuvable. Lance vite build d'abord.");
    process.exit(1);
  }

  let generated = 0;
  for (const page of PAGES) {
    const html = injectIntoHtml(template, page);
    const outDir = join(DIST, page.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html, "utf-8");
    console.log(`[generate-static-pages] ✓ ${page.slug}`);
    generated++;
  }

  console.log(`[generate-static-pages] ${generated} pages statiques générées dans dist/`);
}

main().catch((err) => {
  console.error("[generate-static-pages] Erreur:", err);
  process.exit(1);
});
