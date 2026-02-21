#!/usr/bin/env node
/**
 * Génère sitemap.xml avec les URLs statiques + pages produit véhicules/motos.
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
];

function isMoto(v) {
  const t = v.vehicle_type?.toLowerCase();
  return t === "moto" || t === "scooter";
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
    license: (v.id || "").substring(0, 8).toUpperCase(),
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
    const path = isMoto(v) ? `/moto/${v.license}` : `/vehicle/${v.license}`;
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
  const motos = vehicles.filter(isMoto);
  const cars = vehicles.filter((v) => !isMoto(v));
  console.log(`[generate-sitemap] ${motos.length} moto(s), ${cars.length} véhicule(s)`);

  const xml = buildXml(vehicles);
  const outPath = join(ROOT, "public", "sitemap.xml");
  writeFileSync(outPath, xml, "utf-8");
  console.log(`[generate-sitemap] Écrit: ${outPath} (${STATIC_URLS.length + vehicles.length} URLs)`);
}

main().catch((err) => {
  console.error("[generate-sitemap] Erreur:", err);
  process.exit(1);
});
