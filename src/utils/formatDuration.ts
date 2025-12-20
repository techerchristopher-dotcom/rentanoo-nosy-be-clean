import { TFunction } from "i18next";

// Flag pour le log DEV (une seule fois)
let hasLoggedDevCheck = false;

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
    // Utiliser duration.day_one pour count=1, duration.day_other sinon
    const dayKey = days === 1 ? "duration.day_one" : "duration.day_other";
    const dayText = t(dayKey, { count: days });
    parts.push(dayText);
  }

  if (hours > 0) {
    // Utiliser duration.hour_one pour count=1, duration.hour_other sinon
    const hourKey = hours === 1 ? "duration.hour_one" : "duration.hour_other";
    const hourText = t(hourKey, { count: hours });
    parts.push(hourText);
  }

  const separator = t("duration.separator");
  
  // Mini log DEV (une fois) pour confirmer que t() retourne bien une string traduite
  if (import.meta.env.DEV && !hasLoggedDevCheck && parts.length > 0) {
    hasLoggedDevCheck = true;
    const dayKey = days > 0 ? (days === 1 ? "duration.day_one" : "duration.day_other") : null;
    const hourKey = hours > 0 ? (hours === 1 ? "duration.hour_one" : "duration.hour_other") : null;
    // eslint-disable-next-line no-console
    console.log("[formatDuration] ✅ Translation check:", {
      dayKey,
      dayResult: days > 0 ? parts.find(p => p.includes("jour")) : null,
      hourKey,
      hourResult: hours > 0 ? parts.find(p => p.includes("heure")) : null,
      separatorKey: "duration.separator",
      separatorResult: separator,
      allTranslated: !parts.some(p => p.startsWith("duration.")) && separator !== "duration.separator"
    });
  }
  
  return parts.join(separator);
}


