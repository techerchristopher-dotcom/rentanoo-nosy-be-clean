#!/usr/bin/env node
/**
 * Script de diagnostic Stripe : Identification de la configuration actuelle
 * 
 * Ce script vérifie :
 * 1. Quel service crée la Checkout Session (Railway vs Supabase Edge Function)
 * 2. Quel webhook est configuré (Railway vs Supabase Edge Function)
 * 3. Les variables d'environnement Stripe (TEST vs LIVE)
 * 4. Les URLs de redirection Stripe
 * 
 * Usage:
 *   node scripts/diagnose-stripe-config.js
 */

import { readFileSync } from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger .env.local si disponible
const envLocalPath = path.resolve(__dirname, "..", ".env.local");
try {
  dotenv.config({ path: envLocalPath });
  console.log(`📁 [Config] .env.local chargé depuis ${envLocalPath}`);
} catch (err) {
  console.log("ℹ️  .env.local non trouvé (normal en production)");
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log("\n" + "=".repeat(80));
console.log("🔍 DIAGNOSTIC STRIPE - Configuration actuelle");
console.log("=".repeat(80) + "\n");

// ============================================
// 1. SERVICE DE CRÉATION CHECKOUT SESSION
// ============================================
console.log("📋 1. SERVICE DE CRÉATION CHECKOUT SESSION");
console.log("-".repeat(80));

// Vérifier le code source
const payerLocationPath = path.resolve(__dirname, "..", "src", "lib", "payerLocation.ts");
try {
  const payerLocationCode = readFileSync(payerLocationPath, "utf-8");
  
  if (payerLocationCode.includes("supabase.functions.invoke")) {
    console.log("✅ Service utilisé : Supabase Edge Function");
    console.log("   Fichier : src/lib/payerLocation.ts");
    console.log("   Edge Function : create-checkout-session");
    console.log(`   URL : ${SUPABASE_URL}/functions/v1/create-checkout-session`);
  } else {
    console.log("❓ Service non identifié dans payerLocation.ts");
  }
} catch (err) {
  console.log("⚠️  Impossible de lire payerLocation.ts");
}

// Vérifier si Railway route existe (obsolète)
const serverIndexPath = path.resolve(__dirname, "..", "server", "index.ts");
try {
  const serverCode = readFileSync(serverIndexPath, "utf-8");
  
  if (serverCode.includes("ENDPOINT OBSOLÈTE") || serverCode.includes("Migré vers Supabase Edge Function")) {
    console.log("ℹ️  Railway route /api/create-checkout-session : OBSOLÈTE (non utilisé)");
  }
} catch (err) {
  console.log("⚠️  Impossible de lire server/index.ts");
}

console.log("");

// ============================================
// 2. VARIABLES D'ENVIRONNEMENT STRIPE
// ============================================
console.log("📋 2. VARIABLES D'ENVIRONNEMENT STRIPE");
console.log("-".repeat(80));

// Railway (process.env)
const railwayStripeSecret = process.env.STRIPE_SECRET_KEY;
const railwayWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

console.log("\n🔧 Railway Environment Variables:");
if (railwayStripeSecret) {
  const keyType = railwayStripeSecret.startsWith("sk_test_") ? "TEST" 
    : railwayStripeSecret.startsWith("sk_live_") ? "LIVE" 
    : "UNKNOWN";
  console.log(`   STRIPE_SECRET_KEY : ✅ Présente (mode ${keyType})`);
  console.log(`   Préfixe : ${railwayStripeSecret.substring(0, 7)}...`);
} else {
  console.log("   STRIPE_SECRET_KEY : ❌ Absente");
}

if (railwayWebhookSecret) {
  console.log(`   STRIPE_WEBHOOK_SECRET : ✅ Présente (${railwayWebhookSecret.substring(0, 7)}...)`);
} else {
  console.log("   STRIPE_WEBHOOK_SECRET : ⚠️  Absente (mode dev non sécurisé)");
}

// Supabase Secrets (nécessite Supabase CLI ou API)
console.log("\n🔧 Supabase Secrets (Edge Functions):");
console.log("   ⚠️  Pour vérifier les secrets Supabase, exécutez :");
console.log("   supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE");
console.log("\n   Variables attendues :");
console.log("   - STRIPE_SECRET_KEY (sk_test_... ou sk_live_...)");
console.log("   - STRIPE_SUCCESS_URL (https://rentanoo.com/success)");
console.log("   - STRIPE_CANCEL_URL (https://rentanoo.com/cancel)");
console.log("   - STRIPE_WEBHOOK_SECRET (whsec_..., si Edge Function webhook utilisé)");

console.log("");

// ============================================
// 3. WEBHOOK ENDPOINTS
// ============================================
console.log("📋 3. WEBHOOK ENDPOINTS");
console.log("-".repeat(80));

// Vérifier Railway webhook
const serverIndexPath2 = path.resolve(__dirname, "..", "server", "index.ts");
try {
  const serverCode = readFileSync(serverIndexPath2, "utf-8");
  
  if (serverCode.includes('app.post("/api/stripe/webhook"')) {
    console.log("\n✅ Railway Express Webhook disponible :");
    console.log("   Route : POST /api/stripe/webhook");
    console.log("   URL complète : https://rentanoo.com/api/stripe/webhook");
    console.log("   Fichier : server/index.ts");
    console.log("   Variables requises : STRIPE_WEBHOOK_SECRET (Railway)");
  }
} catch (err) {
  console.log("⚠️  Impossible de lire server/index.ts");
}

// Vérifier Supabase Edge Function webhook
const webhookEdgePath = path.resolve(__dirname, "..", "supabase", "functions", "stripe-webhook", "index.ts");
try {
  const webhookCode = readFileSync(webhookEdgePath, "utf-8");
  
  if (webhookCode.includes("Deno.serve")) {
    console.log("\n✅ Supabase Edge Function Webhook disponible :");
    console.log("   Route : POST /functions/v1/stripe-webhook");
    console.log(`   URL complète : ${SUPABASE_URL}/functions/v1/stripe-webhook`);
    console.log("   Fichier : supabase/functions/stripe-webhook/index.ts");
    console.log("   Variables requises : STRIPE_WEBHOOK_SECRET (Supabase Secrets)");
  }
} catch (err) {
  console.log("⚠️  Edge Function webhook non trouvé");
}

console.log("\n⚠️  ACTION REQUISE : Vérifier dans Stripe Dashboard quel webhook est configuré :");
console.log("   1. Aller sur https://dashboard.stripe.com/test/webhooks");
console.log("   2. Identifier l'endpoint actif");
console.log("   3. Vérifier qu'un seul webhook est actif en production");

console.log("");

// ============================================
// 4. URLs DE REDIRECTION
// ============================================
console.log("📋 4. URLs DE REDIRECTION STRIPE");
console.log("-".repeat(80));

console.log("\n✅ URLs attendues (Supabase Secrets) :");
console.log("   STRIPE_SUCCESS_URL : https://rentanoo.com/success?session_id={CHECKOUT_SESSION_ID}");
console.log("   STRIPE_CANCEL_URL : https://rentanoo.com/cancel");
console.log("\n⚠️  Vérifier avec :");
console.log("   supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE_SUCCESS_URL");
console.log("   supabase secrets list --project-ref zykwfjxurwmputxwlkxs | grep STRIPE_CANCEL_URL");

console.log("");

// ============================================
// 5. RÉSUMÉ ET RECOMMANDATIONS
// ============================================
console.log("📋 5. RÉSUMÉ ET RECOMMANDATIONS");
console.log("-".repeat(80));

console.log("\n✅ Configuration détectée :");
console.log("   - Checkout Session : Supabase Edge Function (create-checkout-session)");
console.log("   - Webhook : Vérifier dans Stripe Dashboard (Railway OU Supabase)");

console.log("\n📝 Prochaines étapes pour passer en LIVE :");
console.log("   1. Activer le compte Stripe LIVE");
console.log("   2. Créer un webhook LIVE dans Stripe Dashboard");
console.log("   3. Mettre à jour STRIPE_SECRET_KEY (sk_live_...) dans Supabase Secrets");
console.log("   4. Mettre à jour STRIPE_WEBHOOK_SECRET (whsec_... LIVE) dans Supabase Secrets");
console.log("   5. Si Railway webhook utilisé : mettre à jour les variables Railway");
console.log("   6. Redéployer et tester avec un paiement réel faible montant");

console.log("\n📖 Documentation complète : STRIPE-GO-LIVE-CHECKLIST.md");

console.log("\n" + "=".repeat(80) + "\n");

