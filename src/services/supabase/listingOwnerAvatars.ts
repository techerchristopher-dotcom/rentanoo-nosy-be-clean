import { supabase } from "@/integrations/supabase/client";
import { compressForUpload } from "@/utils/compressForUpload";

const BUCKET_NAME = "listing-owner-avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export class ListingOwnerAvatarsService {
  static validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return "Formats acceptés : JPG, PNG, WebP.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "L'image ne doit pas dépasser 5 Mo.";
    }

    return null;
  }

  static async uploadAvatar(
    listingOwnerId: string,
    file: File
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const validationError = this.validateFile(file);
      if (validationError) {
        return { url: null, error: validationError };
      }

      const compressed = await compressForUpload(file, () => {});
      if (!compressed) {
        return { url: null, error: "Photo trop lourde après compression. Réessayez." };
      }

      const fileName = `${listingOwnerId}/avatar_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        return { url: null, error: uploadError.message };
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      return { url: data.publicUrl, error: null };
    } catch {
      return { url: null, error: "Erreur lors de l'upload de l'image" };
    }
  }
}
