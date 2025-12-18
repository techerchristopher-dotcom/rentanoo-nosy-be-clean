import { TFunction } from "i18next";

/**
 * Formatte une durée (jours/heures) en texte localisé.
 * Retourne null si aucune durée exploitable.
 */
export function formatDuration(
  t: TFunction,
  days: number,
  hours: number
): string | null {
  if (days === 0 && hours === 0) return null;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(t("duration.days", { count: days }));
  }

  if (hours > 0) {
    parts.push(t("duration.hours", { count: hours }));
  }

  const joiner = t("duration.joiner");
  return parts.join(joiner);
}


