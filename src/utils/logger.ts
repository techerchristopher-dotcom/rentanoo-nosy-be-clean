/**
 * Logger utilitaire : logs debug uniquement en dev, erreurs toujours affichées
 */

export const isDev = import.meta.env.DEV;

export function debug(...args: unknown[]): void {
  if (isDev) console.log(...args);
}

export function warn(...args: unknown[]): void {
  if (isDev) console.warn(...args);
}
