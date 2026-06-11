/**
 * Configuration centralisée de l'application
 * Gère les URLs de base pour dev local et production
 */

/**
 * URL de base du site
 * - En local : toujours l'origin réel (donc port 3002 ou 3006 selon où tu ouvres l'app)
 * - En production : VITE_PUBLIC_SITE_URL (Coolify) ou fallback build
 */
function getSiteUrl(): string {
  // Priorité : si on est en local, on respecte exactement l'origin (permet 3002 pour owner, 3006 pour renter)
  if (typeof window !== 'undefined' && window.location) {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return window.location.origin;
    }
  }

  // Sinon (prod / preprod), on utilise la variable d'environnement si définie
  if (import.meta.env.VITE_PUBLIC_SITE_URL) {
    return import.meta.env.VITE_PUBLIC_SITE_URL;
  }

  // Prod runtime si VITE_PUBLIC_SITE_URL absent au build Vite (ex. Railway)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Fallback pour build/SSR local
  return "http://localhost:3002";
}

export const SITE_URL = getSiteUrl();

/**
 * Construit une URL complète à partir d'un chemin
 * @param path - Chemin relatif (ex: '/auth/callback')
 * @returns URL complète (ex: 'https://rentanoo.yt/auth/callback')
 */
export function getFullUrl(path: string): string {
  // Nettoyer le path pour éviter les double-slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * URL de redirection pour l'authentification OAuth (Google, Facebook, etc.)
 */
export const AUTH_CALLBACK_URL = getFullUrl('/auth/callback');

/**
 * Vérifie si nous sommes en environnement de développement local
 */
export const isDevelopment = SITE_URL.includes('localhost') || SITE_URL.includes('127.0.0.1');

/**
 * Vérifie si nous sommes en environnement de production
 */
export const isProduction = !isDevelopment;

/**
 * Log de diagnostic (utile pour débugger les problèmes d'environnement)
 */
if (typeof window !== 'undefined') {
  console.log('🌍 Config:', {
    SITE_URL,
    AUTH_CALLBACK_URL,
    environment: isDevelopment ? 'development' : 'production',
    origin: window.location.origin,
  });
}

