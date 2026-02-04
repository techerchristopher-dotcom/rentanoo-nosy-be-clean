/**
 * Résout l'URL affichable d'une photo à partir d'un objet photo.
 * Utilisé par les grids EDL (départ recap, retour step2/3/4) pour éviter
 * d'afficher un storagePath relatif comme src (→ image cassée).
 *
 * Ordre de priorité :
 * 1. publicUrl (URL complète Supabase Storage)
 * 2. url (compatibilité moto / ancien format)
 * 3. storagePath → construction de l'URL publique du bucket checkin-photos
 */
const BUCKET_NAME = "checkin-photos";

export function resolvePhotoUrl(photo: { publicUrl?: string; url?: string; storagePath?: string } | null | undefined): string {
  if (!photo || typeof photo !== "object") return "";
  if (photo.publicUrl && typeof photo.publicUrl === "string" && photo.publicUrl.trim()) return photo.publicUrl;
  if (photo.url && typeof photo.url === "string" && photo.url.trim()) return photo.url;
  if (photo.storagePath && typeof photo.storagePath === "string" && photo.storagePath.trim()) {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    if (!baseUrl) return "";
    const path = photo.storagePath.startsWith("/") ? photo.storagePath.slice(1) : photo.storagePath;
    return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
  }
  return "";
}
