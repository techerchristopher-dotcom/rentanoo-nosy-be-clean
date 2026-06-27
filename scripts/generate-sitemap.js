#!/usr/bin/env node
/**
 * Génère sitemap.xml avec URLs statiques + pages produit véhicules.
 * Les IDs viennent de Supabase (vehicles disponibles).
 *
 * Usage: node scripts/generate-sitemap.js
 * Prérequis: .env.local avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, "..");
dotenv.config({ path: join(ROOT, ".env.local") });

const SITE_BASE = process.env.VITE_SITE_URL || "https://rentanoo.com";

const STATIC_URLS = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/legal", changefreq: "monthly", priority: "0.5" },
  { loc: "/contact", changefreq: "monthly", priority: "0.5" },
  { loc: "/rent-my-car", changefreq: "weekly", priority: "0.8" },
  { loc: "/sinistre-caution", changefreq: "monthly", priority: "0.6" },
  { loc: "/politique-annulation", changefreq: "monthly", priority: "0.5" },
  { loc: "/meteo-nosy-be", changefreq: "daily", priority: "0.9" },
  { loc: "/taux-change-euro-ariary-madagascar", changefreq: "daily", priority: "0.9" },
  { loc: "/vols-aeroport-nosy-be", changefreq: "hourly", priority: "0.9" },
  // --- Pages SEO catégories véhicules ---
  { loc: "/location-scooter-nosy-be", changefreq: "weekly", priority: "0.95" },
  { loc: "/location-moto-nosy-be", changefreq: "weekly", priority: "0.95" },
  { loc: "/location-quad-nosy-be", changefreq: "weekly", priority: "0.9" },
  { loc: "/location-voiture-nosy-be", changefreq: "weekly", priority: "0.9" },
  // --- Pages SEO hébergement ---
  { loc: "/location-hebergement-nosy-be", changefreq: "weekly", priority: "0.95" },
  { loc: "/location-vacances-nosy-be", changefreq: "weekly", priority: "0.95" },
  { loc: "/location-appartement-nosy-be", changefreq: "weekly", priority: "0.9" },
  { loc: "/location-villa-nosy-be", changefreq: "weekly", priority: "0.9" },
  { loc: "/location-villa-bord-de-mer-nosy-be", changefreq: "weekly", priority: "0.9" },
  { loc: "/location-villa-piscine-nosy-be", changefreq: "weekly", priority: "0.9" },
  { loc: "/location-bungalow-nosy-be", changefreq: "weekly", priority: "0.85" },
  // --- Blog ---
  { loc: "/blog", changefreq: "weekly", priority: "0.8" },
  { loc: "/blog/comment-louer-un-scooter-a-nosy-be", changefreq: "monthly", priority: "0.75" },
  { loc: "/blog/visiter-nosy-be-en-scooter", changefreq: "monthly", priority: "0.75" },
  { loc: "/blog/itineraire-nosy-be-4-jours", changefreq: "monthly", priority: "0.75" },
  { loc: "/blog/aeroport-fascene-guide-arrivee", changefreq: "monthly", priority: "0.75" },
];

function isAccommodation(v) {
  return v.vehicle_type?.toLowerCase() === "accommodation";
}

function isMotoOnly(v) {
  return v.vehicle_type?.toLowerCase() === "moto";
}

/** URL de la fiche véhicule — scooter et car → /vehicle/, moto → /moto/, hébergement → /hebergement/ */
function getVehiclePath(v) {
  if (isAccommodation(v)) return `/hebergement/${v.license}`;
  if (isMotoOnly(v)) return `/moto/${v.license}`;
  return `/vehicle/${v.license}`;
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastmod(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

async function fetchVehicles() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[generate-sitemap] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquantes. Véhicules ignorés.");
    return [];
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, vehicle_type, updated_at")
    .eq("available", true);

  if (error) {
    console.error("[generate-sitemap] Erreur Supabase:", error.message);
    return [];
  }

  return (data || []).map((v) => ({
    id: v.id,
    vehicle_type: v.vehicle_type,
    updated_at: v.updated_at,
    // Code URL = 8 premiers chars de l'UUID (avant le premier tiret, équivalent à replace(id,'-','').substring(0,8))
    license: (v.id || "").replace(/-/g, "").substring(0, 8).toUpperCase(),
  }));
}

function buildXml(vehicles) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const u of STATIC_URLS) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(SITE_BASE + u.loc)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    lines.push(`    <priority>${u.priority}</priority>`);
    lines.push("  </url>");
  }

  for (const v of vehicles) {
    if (!v.license) continue;
    const path = getVehiclePath(v);
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(SITE_BASE + path)}</loc>`);
    lines.push(`    <lastmod>${toLastmod(v.updated_at)}</lastmod>`);
    lines.push("    <changefreq>weekly</changefreq>");
    lines.push("    <priority>0.8</priority>");
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

async function main() {
  console.log("[generate-sitemap] Fetch véhicules Supabase...");
  const vehicles = await fetchVehicles();
  const accommodations = vehicles.filter(isAccommodation);
  const motos = vehicles.filter(isMotoOnly);
  const scooters = vehicles.filter((v) => v.vehicle_type?.toLowerCase() === "scooter");
  const cars = vehicles.filter((v) => !isMotoOnly(v) && !isAccommodation(v) && v.vehicle_type?.toLowerCase() !== "scooter");
  console.log(
    `[generate-sitemap] ${scooters.length} scooter(s), ${motos.length} moto(s), ${cars.length} voiture(s), ${accommodations.length} hébergement(s)`
  );

  const xml = buildXml(vehicles);
  const outPath = join(ROOT, "public", "sitemap.xml");
  writeFileSync(outPath, xml, "utf-8");
  console.log(`[generate-sitemap] Écrit: ${outPath} (${STATIC_URLS.length + vehicles.length} URLs)`);
}

main().catch((err) => {
  console.error("[generate-sitemap] Erreur:", err);
  process.exit(1);
});
