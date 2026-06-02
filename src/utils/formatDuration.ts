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
    const dayKey = days === 1 ? "duration.day_one" : "duration.day_other";
    const dayText = t(dayKey, { count: days });
    parts.push(dayText);
  }

  if (hours > 0) {
    const hourKey = hours === 1 ? "duration.hour_one" : "duration.hour_other";
    const hourText = t(hourKey, { count: hours });
    parts.push(hourText);
  }

  const separator = t("duration.separator");

  if (import.meta.env.DEV && !hasLoggedDevCheck && parts.length > 0) {
    hasLoggedDevCheck = true;
    const dayKey = days > 0 ? (days === 1 ? "duration.day_one" : "duration.day_other") : null;
    const hourKey = hours > 0 ? (hours === 1 ? "duration.hour_one" : "duration.hour_other") : null;
    // eslint-disable-next-line no-console
    console.log("[formatDuration] ✅ Translation check:", {
      dayKey,
      dayResult: days > 0 ? parts.find((p) => p.includes("jour")) : null,
      hourKey,
      hourResult: hours > 0 ? parts.find((p) => p.includes("heure")) : null,
      separatorKey: "duration.separator",
      separatorResult: separator,
      allTranslated:
        !parts.some((p) => p.startsWith("duration.")) &&
        separator !== "duration.separator",
    });
  }

  return parts.join(separator);
}

/**
 * Formatte les jours facturables (supporte les demi-journées : 3.5 → « 3 jours et demi »).
 */
export function formatBillableDays(
  t: TFunction,
  billableDays: number
): string | null {
  if (!billableDays || billableDays <= 0) return null;

  const wholeDays = Math.floor(billableDays);
  const hasHalf = Math.abs(billableDays - wholeDays - 0.5) < 0.001;

  if (wholeDays === 0 && hasHalf) {
    return t("duration.half_day");
  }

  if (!hasHalf) {
    const dayKey =
      wholeDays === 1 ? "duration.day_one" : "duration.day_other";
    return t(dayKey, { count: wholeDays });
  }

  if (wholeDays === 0) {
    return t("duration.half_day");
  }

  const dayKey = wholeDays === 1 ? "duration.day_one" : "duration.day_other";
  const daysText = t(dayKey, { count: wholeDays });
  const halfSuffix = t("duration.half_day_suffix");
  return `${daysText} ${halfSuffix}`;
}
