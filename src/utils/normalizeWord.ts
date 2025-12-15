/**
 * Normalise un mot pour la recherche :
 * - trim
 * - toLowerCase
 * - suppression des accents
 */
export function normalizeWord(input: string): string {
  if (!input) return "";

  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


