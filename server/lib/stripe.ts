/**
 * Module Stripe serveur-only (NE JAMAIS IMPORTER DEPUIS LE FRONTEND)
 * 
 * Ce module gère l'initialisation de Stripe côté serveur uniquement.
 * Il utilise une initialisation lazy pour éviter les erreurs au top-level.
 * 
 * En production (Railway) : utilise process.env directement
 * En développement : peut utiliser .env.local via dotenv (chargé dans server/index.ts)
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Récupère la clé secrète Stripe depuis les variables d'environnement.
 * Ne lance jamais d'erreur au top-level (lazy loading).
 * 
 * @returns La clé secrète Stripe ou null si absente
 */
function getStripeSecretKey(): string | null {
  // En production Railway, process.env est directement disponible
  // En dev, dotenv.config() est appelé dans server/index.ts avant l'import
  return process.env.STRIPE_SECRET_KEY || null;
}

/**
 * Initialise et retourne l'instance Stripe.
 * Lance une erreur uniquement si appelée ET que la clé est absente.
 * 
 * @throws Error si STRIPE_SECRET_KEY n'est pas configurée
 */
export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = getStripeSecretKey();
  
  if (!secretKey) {
    const env = process.env.NODE_ENV || "development";
    throw new Error(
      `❌ STRIPE_SECRET_KEY manquante. ` +
      `En ${env === "production" ? "production (Railway)" : "développement"}, ` +
      `vérifiez que la variable d'environnement STRIPE_SECRET_KEY est définie. ` +
      `En dev local, elle doit être dans .env.local. ` +
      `En production Railway, elle doit être dans les variables d'environnement du service.`
    );
  }

  // Détecter le type de clé (TEST vs LIVE) pour les logs
  const keyType = secretKey.startsWith("sk_test_") ? "TEST" : 
                  secretKey.startsWith("sk_live_") ? "LIVE" : 
                  "UNKNOWN";

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2025-10-29.clover",
  });

  console.log(`✅ [Stripe] Instance initialisée (mode ${keyType})`);
  
  return stripeInstance;
}

/**
 * Vérifie si Stripe est configuré (sans initialiser l'instance).
 * Utile pour les health checks au boot.
 * 
 * @returns true si STRIPE_SECRET_KEY est présente, false sinon
 */
export function isStripeConfigured(): boolean {
  return getStripeSecretKey() !== null;
}

/**
 * Retourne le type de clé Stripe (TEST/LIVE/UNKNOWN) sans révéler la clé.
 * Utile pour les logs de diagnostic.
 */
export function getStripeKeyType(): "TEST" | "LIVE" | "UNKNOWN" | "NOT_CONFIGURED" {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    return "NOT_CONFIGURED";
  }
  if (secretKey.startsWith("sk_test_")) {
    return "TEST";
  }
  if (secretKey.startsWith("sk_live_")) {
    return "LIVE";
  }
  return "UNKNOWN";
}

// Export par défaut pour compatibilité avec l'ancien code
// ⚠️ Ne pas utiliser directement, préférer getStripe()
export default {
  getStripe,
  isStripeConfigured,
  getStripeKeyType,
};

