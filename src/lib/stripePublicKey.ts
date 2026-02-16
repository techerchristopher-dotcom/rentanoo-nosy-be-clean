export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

console.log("[Stripe Front] pk present?", !!STRIPE_PUBLISHABLE_KEY);


