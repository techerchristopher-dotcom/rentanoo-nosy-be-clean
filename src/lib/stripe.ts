import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY manquante dans .env.local");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log("✅ Clé Stripe secrète chargée avec succès (mode test)");


