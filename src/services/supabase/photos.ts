import { supabase } from "@/integrations/supabase/client";

export interface PhotoUpload {
  file: File;
  vehicleId: string;
  photoType: 'frontLeft' | 'profileLeft' | 'interior' | 'additional';
  position?: number;
}

export interface UploadedPhoto {
  id: string;
  vehicleId: string;
  url: string;
  photoType: string;
  position: number;
  isPrimary: boolean;
}

export class PhotoService {
  private static readonly BUCKET_NAME = 'vehicle-photos';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Upload une photo vers Supabase Storage
   */
  static async uploadPhoto({ file, vehicleId, photoType, position = 1 }: PhotoUpload): Promise<{ data: UploadedPhoto | null; error: string | null }> {
    try {
      // Validation du fichier
      if (!file.type.startsWith('image/')) {
        return { data: null, error: 'Le fichier doit être une image' };
      }

      if (file.size > this.MAX_FILE_SIZE) {
        return { data: null, error: 'Le fichier ne doit pas dépasser 10MB' };
      }

      // Génération d'un nom de fichier unique
      const fileExtension = file.name.split('.').pop();
      const fileName = `${vehicleId}/${photoType}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erreur lors de l\'upload:', uploadError);
        return { data: null, error: uploadError.message };
      }

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      const uploadedPhoto: UploadedPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        vehicleId,
        url: urlData.publicUrl,
        photoType,
        position,
        isPrimary: photoType === 'frontLeft'
      };

      return { data: uploadedPhoto, error: null };
    } catch (error) {
      console.error('Erreur lors de l\'upload de la photo:', error);
      return { data: null, error: 'Erreur lors de l\'upload de la photo' };
    }
  }

  /**
   * Upload multiple photos
   */
  static async uploadMultiplePhotos(uploads: PhotoUpload[]): Promise<{ data: UploadedPhoto[]; errors: string[] }> {
    const results: UploadedPhoto[] = [];
    const errors: string[] = [];

    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      upload.position = i + 1; // Position basée sur l'ordre d'upload

      const result = await this.uploadPhoto(upload);
      
      if (result.data) {
        results.push(result.data);
      } else {
        errors.push(`Photo ${i + 1}: ${result.error}`);
      }
    }

    return { data: results, errors };
  }

  /**
   * Supprime une photo du storage
   */
  static async deletePhoto(photoUrl: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Extraction du nom de fichier depuis l'URL
      const urlParts = photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const vehicleId = urlParts[urlParts.length - 2];
      const fullPath = `${vehicleId}/${fileName}`;

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fullPath]);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      return { success: false, error: 'Erreur lors de la suppression de la photo' };
    }
  }

  /**
   * Récupère toutes les photos d'un véhicule
   */
  static async getVehiclePhotos(vehicleId: string): Promise<{ data: UploadedPhoto[]; error: string | null }> {
    try {
      console.log(`📸 [PhotoService] Recherche photos pour vehicleId: ${vehicleId}`);
      
      // CHANGEMENT : Lister les fichiers dans le DOSSIER du véhicule (pas à la racine)
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(vehicleId, {  // ← Utiliser vehicleId comme dossier
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        console.error('📸 [PhotoService] Erreur lors du listage des photos:', error);
        return { data: [], error: error.message };
      }

      console.log('📸 [PhotoService] Fichiers trouvés dans le dossier du véhicule:', files);

      if (!files || files.length === 0) {
        console.log('📸 [PhotoService] Aucun fichier trouvé dans le dossier du véhicule');
        return { data: [], error: null };
      }

      // Construction des URLs publiques avec le chemin complet
      const photos: UploadedPhoto[] = files.map((file, index) => {
        // CHANGEMENT : Chemin complet avec dossier
        const { data: urlData } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(`${vehicleId}/${file.name}`);

        // Extraction du type de photo depuis le nom de fichier
        const photoType = file.name.includes('exterior') ? 'frontLeft' :
                         file.name.includes('interior') ? 'interior' :
                         file.name.includes('profile') ? 'profileLeft' : 'additional';

        const photo = {
          id: `photo_${vehicleId}_${index}`,
          vehicleId,
          url: urlData.publicUrl,
          photoType,
          position: index + 1,
          isPrimary: photoType === 'frontLeft' || index === 0
        };

        console.log('📸 [PhotoService] Photo construite:', photo);
        return photo;
      });

      console.log('📸 [PhotoService] Photos finales retournées:', photos);
      return { data: photos, error: null };
    } catch (error) {
      console.error('📸 [PhotoService] Erreur lors de la récupération des photos:', error);
      return { data: [], error: 'Erreur lors de la récupération des photos' };
    }
  }
}
