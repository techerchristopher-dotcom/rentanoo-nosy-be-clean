/**
 * Résout l'URL affichable d'une photo à partir d'un objet photo.
 * Utilisé par les grids EDL (départ recap, retour step2/3/4) pour éviter
 * d'afficher un storagePath relatif comme src (→ image cassée).
 *
 * Ordre de priorité :
 * 1. publicUrl (URL complète Supabase Storage)
 * 2. url (compatibilité moto / ancien format)
 * 3. storagePath → construction de l'URL publique via getPublicUrl() du client Supabase
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "checkin-photos";

export function resolvePhotoUrl(photo: { publicUrl?: string; url?: string; storagePath?: string } | null | undefined): string {
  if (!photo || typeof photo !== "object") return "";
  
  // Priorité 1 : publicUrl (URL complète déjà disponible)
  if (photo.publicUrl && typeof photo.publicUrl === "string" && photo.publicUrl.trim()) {
    return photo.publicUrl;
  }
  
  // Priorité 2 : url (compatibilité moto / ancien format)
  if (photo.url && typeof photo.url === "string" && photo.url.trim()) {
    return photo.url;
  }
  
  // Priorité 3 : storagePath → utiliser getPublicUrl() du client Supabase
  if (photo.storagePath && typeof photo.storagePath === "string" && photo.storagePath.trim()) {
    const path = photo.storagePath.startsWith("/") ? photo.storagePath.slice(1) : photo.storagePath;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    
    // Debug en dev uniquement
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      console.log("[resolvePhotoUrl] 🔍 Debug:", {
        storagePath: photo.storagePath,
        normalizedPath: path,
        bucket: BUCKET_NAME,
        publicUrl: data.publicUrl,
        hasPublicUrl: !!photo.publicUrl,
        hasUrl: !!photo.url,
      });
    }
    
    return data.publicUrl || "";
  }
  
  return "";
}
