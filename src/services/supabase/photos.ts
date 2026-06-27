import { supabase } from "@/integrations/supabase/client";
import { compressForUpload } from "@/utils/compressForUpload";

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
  // Chemin exact dans le bucket (ex: `${vehicleId}/frontLeft_...jpg`)
  storagePath?: string;
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

      // Compression EDL avant upload (réutilise le même mécanisme que checkin-photos)
      const compressed = await compressForUpload(file, () => {});
      if (!compressed) {
        return { data: null, error: 'Photo trop lourde après compression. Réessayez.' };
      }
      const fileToUpload = compressed;

      // Génération d'un nom de fichier unique (compressForUpload sort du JPEG → .jpg)
      const fileName = `${vehicleId}/${photoType}_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Erreur lors de l\'upload:', uploadError);
        return { data: null, error: uploadError.message };
      }

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Insertion dans la table vehicle_photos pour garder une trace en DB
      // La policy RLS côté DB vérifie que le vehicle_id appartient bien à auth.uid()
      const { error: dbError } = await supabase
        .from('vehicle_photos')
        .insert({
          vehicle_id: vehicleId,
          photo_url: publicUrl,
          storage_path: fileName,
          is_primary: photoType === 'frontLeft',
          display_order: position ?? 1,
        });

      if (dbError) {
        console.error('Erreur lors de l\'insertion dans vehicle_photos:', dbError);
        // On considère l'opération comme échouée pour que l'appelant puisse afficher une erreur utilisateur
        return { data: null, error: dbError.message };
      }

      const uploadedPhoto: UploadedPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        vehicleId,
        url: publicUrl,
        photoType,
        position,
        isPrimary: photoType === 'frontLeft',
        storagePath: fileName,
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

      // Suppression en parallèle : storage + enregistrement BD
      const [storageResult, dbResult] = await Promise.all([
        supabase.storage.from(this.BUCKET_NAME).remove([fullPath]),
        supabase.from('vehicle_photos').delete().eq('photo_url', photoUrl),
      ]);

      if (storageResult.error) {
        console.error('Erreur suppression storage:', storageResult.error);
        return { success: false, error: storageResult.error.message };
      }
      if (dbResult.error) {
        console.error('Erreur suppression vehicle_photos:', dbResult.error);
        return { success: false, error: dbResult.error.message };
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

      // Ignorer les .heic (non supportés par le navigateur, dégradation LCP)
      const supportedFiles = files.filter(
        (f) => !f.name.toLowerCase().endsWith('.heic')
      );

      // Construction des URLs publiques avec le chemin complet
      const photos: UploadedPhoto[] = supportedFiles.map((file, index) => {
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

  /**
   * Récupère, en une seule requête, la photo de couverture (principale) pour une liste de véhicules.
   *
   * Règles de sélection par véhicule :
   * 1. On privilégie `is_primary = true` s'il existe
   * 2. Sinon, on prend la plus petite valeur de `display_order`
   * 3. Sinon, la première photo trouvée
   */
  static async getPrimaryPhotosForVehicles(
    vehicleIds: string[]
  ): Promise<{ data: Record<string, UploadedPhoto>; error: string | null }> {
    try {
      if (!vehicleIds || vehicleIds.length === 0) {
        return { data: {}, error: null };
      }

      // Requête batch sur la table vehicle_photos
      const { data, error } = await supabase
        .from('vehicle_photos')
        .select('id, vehicle_id, photo_url, storage_path, is_primary, display_order')
        .in('vehicle_id', vehicleIds);

      if (error) {
        console.error('📸 [PhotoService] Erreur getPrimaryPhotosForVehicles:', error);
        return { data: {}, error: error.message };
      }

      if (!data || data.length === 0) {
        return { data: {}, error: null };
      }

      // Regrouper par vehicle_id
      const byVehicle: Record<string, any[]> = {};
      for (const row of data) {
        const vid = row.vehicle_id as string;
        if (!byVehicle[vid]) {
          byVehicle[vid] = [];
        }
        byVehicle[vid].push(row);
      }

      const result: Record<string, UploadedPhoto> = {};

      const isHeic = (url: string | null | undefined, path?: string | null) => {
        const u = (url || path || '').toLowerCase();
        return u.endsWith('.heic') || u.includes('.heic?');
      };

      for (const [vehicleId, rows] of Object.entries(byVehicle)) {
        const validRows = rows.filter((r) => !isHeic(r.photo_url, r.storage_path));
        if (validRows.length === 0) continue;

        // 1) Essayer de trouver une photo marquée principale
        let chosen = validRows.find((r) => r.is_primary) as any | undefined;

        // 2) Sinon, prendre la plus petite display_order
        if (!chosen) {
          validRows.sort((a, b) => {
            const da = a.display_order ?? Number.MAX_SAFE_INTEGER;
            const db = b.display_order ?? Number.MAX_SAFE_INTEGER;
            return da - db;
          });
          chosen = validRows[0];
        }

        if (!chosen) continue;

        // Construire un UploadedPhoto cohérent avec le reste du service
        const uploaded: UploadedPhoto = {
          id: chosen.id,
          vehicleId,
          url: chosen.photo_url,
          photoType:
            typeof chosen.storage_path === 'string' && chosen.storage_path.includes('frontLeft')
              ? 'frontLeft'
              : 'additional',
          position: chosen.display_order ?? 1,
          isPrimary: !!chosen.is_primary,
          storagePath: chosen.storage_path ?? undefined,
        };

        result[vehicleId] = uploaded;
      }

      return { data: result, error: null };
    } catch (error) {
      console.error('📸 [PhotoService] Erreur getPrimaryPhotosForVehicles:', error);
      return { data: {}, error: 'Erreur lors de la récupération des photos principales' };
    }
  }
}
