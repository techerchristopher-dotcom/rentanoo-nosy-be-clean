/**
 * Type pour une photo horodatée (valeur juridique)
 * Chaque photo capturée doit inclure un timestamp immuable
 * pour prouver la date et l'heure de prise de vue
 */
export interface PhotoWithTimestamp {
  file: File;
  timestamp: string; // ISO 8601 format
  takenAt?: Date; // Pour faciliter les calculs
}

/**
 * Crée un objet photo avec timestamp
 * Appelé à chaque ajout de photo dans le formulaire
 */
export function createPhotoWithTimestamp(file: File): PhotoWithTimestamp {
  const now = new Date();
  return {
    file,
    timestamp: now.toISOString(),
    takenAt: now,
  };
}

/**
 * Convertit un tableau de File[] en PhotoWithTimestamp[]
 * Utile pour migration ou batch upload
 */
export function addTimestampsToPhotos(files: File[]): PhotoWithTimestamp[] {
  return files.map(file => createPhotoWithTimestamp(file));
}

/**
 * Formate le timestamp pour affichage juridique français
 * Format : "07/11/2025 à 14:32"
 */
export function formatPhotoTimestamp(timestamp: string | Date): string {
  if (!timestamp) return "";
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Erreur formatage timestamp photo:", error);
    return "";
  }
}

/**
 * Calcule la plage temporelle des photos (min/max timestamps)
 * Pour synthèse juridique : "Photos prises le DD/MM/YYYY entre HH:MM et HH:MM"
 */
export function computePhotoTimeRange(photos: PhotoWithTimestamp[]): {
  first: Date;
  last: Date;
  sameDay: boolean;
} | null {
  if (!photos || photos.length === 0) return null;

  const timestamps = photos
    .map(p => p.takenAt || new Date(p.timestamp))
    .sort((a, b) => a.getTime() - b.getTime());

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];

  const sameDay = first.toDateString() === last.toDateString();

  return { first, last, sameDay };
}

/**
 * Formate la synthèse temporelle pour affichage
 * Ex: "Toutes les photos ont été prises le 07/11/2025 entre 14:02 et 14:15"
 */
export function formatPhotoTimeSummary(range: { first: Date; last: Date; sameDay: boolean } | null): string {
  if (!range) return "";

  const firstStr = formatPhotoTimestamp(range.first);
  const lastTimeStr = range.last.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (range.sameDay) {
    if (range.first.getTime() === range.last.getTime()) {
      return `Photo prise le ${firstStr}`;
    }
    return `Photos prises le ${firstStr.split(" à ")[0]} entre ${firstStr.split(" à ")[1]} et ${lastTimeStr}`;
  } else {
    const lastStr = formatPhotoTimestamp(range.last);
    return `Photos prises entre le ${firstStr} et le ${lastStr}`;
  }
}

