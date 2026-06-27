/**
 * Retourne la cylindrée formatée (ex: "125 cc") à afficher comme badge sur les cartes scooter/moto.
 * Entrée : string brute du champ engine_capacity (ex: "125cc", "150", "200cc+"), ou null.
 */
export function getCylindreeBadge(engineCapacity: string | null | undefined): string | null {
  if (!engineCapacity || engineCapacity.trim() === "") return null;
  const trimmed = engineCapacity.trim();
  // Normalise : "125cc" → "125 cc", "150CC" → "150 cc", "200" → "200 cc"
  const normalized = trimmed.replace(/\s*cc\+?/gi, "").trim();
  if (!normalized) return null;
  return `${normalized} cc`;
}

/**
 * Parse la cylindrée en nombre pour le tri croissant.
 * "125cc" → 125, "200+" → 200, "unknown" → Infinity
 */
export function parseCylindree(engineCapacity: string | null | undefined): number {
  if (!engineCapacity) return Infinity;
  const match = engineCapacity.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}
