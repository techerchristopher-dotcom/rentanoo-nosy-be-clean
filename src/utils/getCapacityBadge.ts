/**
 * Retourne le label "Idéal pour..." selon la capacité d'accueil.
 * Réutilisable sur toutes les pages/composants hébergement.
 */
export function getCapacityBadge(capacity: number | null | undefined): string | null {
  if (!capacity || capacity <= 0) return null;
  if (capacity <= 2) return "Idéal pour un couple";
  if (capacity <= 5) return "Idéal pour une famille";
  return "Idéal pour un groupe d'amis";
}
