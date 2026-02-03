/**
 * ⭐ Service d'upload des photos de check-in
 * 
 * CONVENTION Option C variante 2 + renommage intelligent :
 * - Bucket : `checkin-photos`
 * - Structure : `booking_<bookingId>/<subfolder>/<bddColumnName>_<bookingId>_<timestamp>_<uuid>.<ext>`
 * - Subfolder : `depart/`, `retour/`, `documents/`
 * - bddColumnName : Nom exact de la colonne dans `checkin_depart`
 * 
 * EXEMPLES :
 * - Permis recto : booking_abc123/documents/photo_permis_recto_abc123_1730846234567_a3f8k2.jpg
 * - Dashboard    : booking_abc123/depart/photos_dashboard_abc123_1730846300000_c4d5e6.jpg
 */

import { supabase } from "@/integrations/supabase/client";
import { compressForUpload } from "@/utils/compressForUpload";

/**
 * Métadonnées d'une photo uploadée
 */
export interface UploadedCheckinPhoto {
  storagePath: string;  // Path relatif dans le bucket
  publicUrl: string;    // URL publique (pour affichage + stockage BDD)
  uploadedAt: string;   // ISO timestamp
}

/**
 * ⭐ Import des types Step3
 */
export type { ExteriorPhoto, ExteriorZoneId, ExteriorPhotoKind } from '@/types/step3';

export class CheckinPhotoService {
  private static readonly BUCKET_NAME = 'checkin-photos';  // ✅ Bucket dédié check-in
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * ⭐ Méthode générique d'upload
   * 
   * @param file - Fichier image
   * @param bookingId - ID de la réservation (UUID)
   * @param bookingReferenceNumber - Numéro lisible de réservation (ex: 8) pour naming
   * @param subfolder - Sous-dossier (`depart`, `retour`, `documents`)
   * @param bddColumnName - Nom exact de la colonne BDD (pour naming intelligent)
   * @param contextSuffix - Suffixe contextuel optionnel (ex: "_avant", "_degat_0")
   * @returns {data: {storagePath, publicUrl, uploadedAt}, error}
   */
  private static async uploadCheckinPhoto({
    file,
    bookingId,
    bookingReferenceNumber,
    subfolder,
    bddColumnName,
    contextSuffix,  // ⭐ NOUVEAU pour Step3
  }: {
    file: File;
    bookingId: string;
    bookingReferenceNumber?: number | null;
    subfolder: 'depart' | 'retour' | 'documents';
    bddColumnName: string;
    contextSuffix?: string;  // ⭐ NOUVEAU (ex: "_avant", "_cote_droit", "_degat_0")
  }): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    try {
      console.log(`[CheckinPhotoService] 📸 Upload photo (${bddColumnName}):`, {
        bookingId,
        subfolder,
        fileSize: file.size,
        fileType: file.type,
      });

      // Validation
      if (!file.type.startsWith('image/')) {
        return { data: null, error: 'Le fichier doit être une image' };
      }
      if (file.size > this.MAX_FILE_SIZE) {
        return { data: null, error: 'Le fichier ne doit pas dépasser 10MB' };
      }

      // ⭐ Compression robuste 2 passes avec garde-fou AVANT upload (source de vérité)
      const compressed = await compressForUpload(file, (sizeKB) => {
        // Le toast est géré par compressForUpload, on retourne juste l'erreur
      });
      if (!compressed) {
        const sizeKB = (file.size / 1024).toFixed(0);
        return { data: null, error: `Photo trop lourde (${sizeKB} KB). Réessayez.` };
      }
      
      // Utiliser le fichier compressé pour l'upload
      const fileToUpload = compressed;

      const fileExtension = fileToUpload.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);  // 8 caractères

      // ⭐ NOUVELLE CONVENTION : resa_<N>/ au lieu de booking_<uuid>/
      const folderPrefix = bookingReferenceNumber != null
        ? `resa_${bookingReferenceNumber}`              // Ex: resa_8/
        : `booking_${bookingId}`;                       // Fallback: booking_fc920e13-.../

      // ⭐ Gérer le sous-dossier interior pour Step 4
      let interiorSubfolder = '';
      let actualContextSuffix = contextSuffix ?? '';
      
      if (contextSuffix?.startsWith('/interior/')) {
        // Ex: "/interior/sieges" → extraire "sieges" et garder le reste comme suffix
        const parts = contextSuffix.split('/');
        if (parts.length >= 3) {
          interiorSubfolder = `interior/${parts[2]}/`;  // "interior/sieges/"
          actualContextSuffix = parts.slice(3).join('_');  // Reste du suffix si présent
        }
      }
      
      const filePrefix = bookingReferenceNumber != null
        ? `${bddColumnName}_${bookingReferenceNumber}${actualContextSuffix ? `_${actualContextSuffix}` : ""}`  // Ex: photos_interieur_sieges_8
        : `${bddColumnName}_${bookingId}${actualContextSuffix ? `_${actualContextSuffix}` : ""}`;              // Fallback

      // Path final : 
      // Step 3: resa_8/depart/photos_exterieur_avant_8_1730846300000_abcd1234.jpg
      // Step 4: resa_8/depart/interior/sieges/photos_interieur_sieges_8_1730846300000_abcd1234.jpg
      const storagePath = `${folderPrefix}/${subfolder}/${interiorSubfolder}${filePrefix}_${timestamp}_${random}.${fileExtension}`;

      console.log(`[CheckinPhotoService] 📁 Path (resa #${bookingReferenceNumber ?? 'N/A'}):`, storagePath);

      // ⭐ Upload vers Supabase Storage avec timeout et retry
      const MAX_RETRIES = 3;
      const TIMEOUT_MS = 30000; // 30 secondes
      let lastError: any = null;
      
      // ⭐ Instrumentation DEV
      const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
      const logDev = isDev ? console.log : () => {};
      const tUploadTotalStart = performance.now();
      const fileSizeKB = (fileToUpload.size / 1024).toFixed(0);
      const step = subfolder; // "depart", "retour", "documents"

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const tAttemptStart = performance.now();
          logDev(`[UPLOAD] step=${step} path=${storagePath} sizeKB=${fileSizeKB} type=${file.type || 'image/jpeg'} attempt=${attempt} START`);
          
          // Créer une promesse avec timeout (et cleanup du timer)
          const tUploadStart = performance.now();
          const uploadPromise = supabase.storage
            .from(this.BUCKET_NAME)
            .upload(storagePath, fileToUpload, {
              cacheControl: '3600',
              contentType: fileToUpload.type || 'image/jpeg',
              upsert: false,
            });

          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error('Timeout: upload a pris plus de 30 secondes')),
              TIMEOUT_MS
            );
          });

          const { error: uploadError } = await (async () => {
            try {
              return await Promise.race([uploadPromise, timeoutPromise]);
            } finally {
              if (timeoutId) clearTimeout(timeoutId);
            }
          })();
          const tUploadMs = performance.now() - tUploadStart;

          if (uploadError) {
            lastError = uploadError;
            const tAttemptMs = performance.now() - tAttemptStart;
            logDev(`[UPLOAD] step=${step} path=${storagePath} sizeKB=${fileSizeKB} attempt=${attempt} FAILED uploadMs=${tUploadMs.toFixed(0)} attemptMs=${tAttemptMs.toFixed(0)} error="${uploadError.message}"`);
            
            console.warn(
              `[CheckinPhotoService] ⚠️ Tentative ${attempt}/${MAX_RETRIES} échouée:`,
              uploadError.message
            );

            if (attempt === MAX_RETRIES) {
              console.error('[CheckinPhotoService] ❌ Échec après toutes les tentatives:', uploadError);
              const tTotalMs = performance.now() - tUploadTotalStart;
              logDev(`[UPLOAD] step=${step} path=${storagePath} sizeKB=${fileSizeKB} FINAL_FAILED totalMs=${tTotalMs.toFixed(0)}`);
              return { data: null, error: uploadError.message };
            }

            // Backoff exponentiel : attendre avant retry (1s, 2s, 4s)
            const backoffMs = 1000 * Math.pow(2, attempt - 1);
            logDev(`[UPLOAD] step=${step} path=${storagePath} sizeKB=${fileSizeKB} attempt=${attempt} BACKOFF backoffMs=${backoffMs}`);
            console.log(`[CheckinPhotoService] ⏳ Attente ${backoffMs}ms avant retry...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          // Succès !
          const tPublicUrlStart = performance.now();
          const { data: urlData } = supabase.storage
            .from(this.BUCKET_NAME)
            .getPublicUrl(storagePath);
          const tPublicUrlMs = performance.now() - tPublicUrlStart;
          
          const tAttemptMs = performance.now() - tAttemptStart;
          const tTotalMs = performance.now() - tUploadTotalStart;
          
          logDev(`[UPLOAD] step=${step} path=${storagePath} sizeKB=${fileSizeKB} attempt=${attempt} SUCCESS uploadMs=${tUploadMs.toFixed(0)} publicUrlMs=${tPublicUrlMs.toFixed(0)} attemptMs=${tAttemptMs.toFixed(0)} totalMs=${tTotalMs.toFixed(0)}`);
          
          console.log(`[CheckinPhotoService] ✅ Fichier uploadé (tentative ${attempt})`);
          console.log('[CheckinPhotoService] 🔗 URL publique:', urlData.publicUrl);

          return {
            data: {
              storagePath,
              publicUrl: urlData.publicUrl,  // ⭐ URL complète pour stockage BDD
              uploadedAt: new Date().toISOString(),
            },
            error: null,
          };
        } catch (error: any) {
          lastError = error;
          const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
          const logDev = isDev ? console.log : () => {};
          const tAttemptMs = performance.now() - (performance.now() - 100); // Approximation
          logDev(`[UPLOAD] step=${subfolder} path=${storagePath} sizeKB=${(fileToUpload.size / 1024).toFixed(0)} attempt=${attempt} EXCEPTION error="${error.message}"`);
          
          console.warn(
            `[CheckinPhotoService] ⚠️ Exception tentative ${attempt}/${MAX_RETRIES}:`,
            error.message
          );

          if (attempt === MAX_RETRIES) {
            console.error('[CheckinPhotoService] ❌ Échec après toutes les tentatives:', error);
            return {
              data: null,
              error: `Erreur après ${MAX_RETRIES} tentatives : ${error.message}`,
            };
          }

          // Backoff exponentiel
          const backoffMs = 1000 * Math.pow(2, attempt - 1);
          logDev(`[UPLOAD] step=${subfolder} path=${storagePath} sizeKB=${(file.size / 1024).toFixed(0)} attempt=${attempt} BACKOFF backoffMs=${backoffMs}`);
          console.log(`[CheckinPhotoService] ⏳ Attente ${backoffMs}ms avant retry...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }

      // Ne devrait jamais arriver ici, mais au cas où
      return {
        data: null,
        error: lastError?.message || 'Échec après toutes les tentatives',
      };
    } catch (error: any) {
      console.error('[CheckinPhotoService] ❌ Exception:', error);
      return {
        data: null,
        error: `Erreur lors de l'upload : ${error.message}`,
      };
    }
  }

  /**
   * ⭐ Upload photo permis RECTO (Step1)
   * 
   * Path    : resa_8/documents/photo_permis_recto_8_<timestamp>_<uuid>.jpg (avec reference_number)
   * Fallback: booking_<bookingId>/documents/photo_permis_recto_<bookingId>_<timestamp>_<uuid>.jpg
   * Stockage: checkin_depart.photo_permis_recto (text) = publicUrl
   */
  static async uploadLicenseRecto(
    file: File,
    bookingId: string,
    bookingReferenceNumber?: number | null  // ⭐ NOUVEAU
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber,  // ⭐ PROPAGATION
      subfolder: 'documents',
      bddColumnName: 'photo_permis_recto',
    });
  }

  /**
   * ⭐ Upload photo permis VERSO (Step1)
   * 
   * Path    : resa_8/documents/photo_permis_verso_8_<timestamp>_<uuid>.jpg (avec reference_number)
   * Fallback: booking_<bookingId>/documents/photo_permis_verso_<bookingId>_<timestamp>_<uuid>.jpg
   * Stockage: checkin_depart.photo_permis_verso (text) = publicUrl
   */
  static async uploadLicenseVerso(
    file: File,
    bookingId: string,
    bookingReferenceNumber?: number | null  // ⭐ NOUVEAU
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber,  // ⭐ PROPAGATION
      subfolder: 'documents',
      bddColumnName: 'photo_permis_verso',
    });
  }

  /**
   * ⭐ Upload photo DASHBOARD (Step2)
   * 
   * Path    : resa_8/depart/photos_dashboard_8_<timestamp>_<uuid>.jpg (avec reference_number)
   * Fallback: booking_<bookingId>/depart/photos_dashboard_<bookingId>_<timestamp>_<uuid>.jpg
   * Stockage: checkin_depart.photos_dashboard (jsonb) = array d'objets avec publicUrl
   */
  static async uploadDashboardPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber?: number | null
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber,
      subfolder: 'depart',
      bddColumnName: 'photos_dashboard',
    });
  }

  // ============================================================================
  // ⭐ STEP 3 - PHOTOS EXTÉRIEUR & COFFRE
  // ============================================================================

  /**
   * ⭐ Upload photo de zone extérieure (Step3)
   * 
   * Path : resa_8/depart/photos_exterieur_avant_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'ensemble d'une zone (avant, droit, arriere, gauche)
   */
  static async uploadExteriorZonePhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    zone: string  // "avant", "droit", "arriere", "gauche"
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_exterieur',
      contextSuffix: `_${zone}`,  // ⭐ Ex: photos_exterieur_avant_8
    });
  }

  /**
   * ⭐ Upload photo de jante (Step3)
   * 
   * Path : resa_8/depart/photos_jantes_janteAvDroit_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'une des 4 jantes
   */
  static async uploadWheelPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    wheelKey: string  // "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_jantes',
      contextSuffix: `_${wheelKey}`,  // ⭐ Ex: photos_jantes_janteAvDroit_8
    });
  }

  /**
   * ⭐ Upload photo de coffre (Step3)
   * 
   * Path : resa_8/depart/photos_coffre_8_<timestamp>_<uuid>.jpg
   * Usage : Photo du coffre ouvert
   */
  static async uploadTrunkPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_coffre',
      // Pas de suffix, car c'est la colonne dédiée
    });
  }

  /**
   * ⭐ Upload photo de dégât (Step3)
   * 
   * Path : resa_8/depart/degats_avant_degat0_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'un dégât spécifique
   */
  static async uploadDamagePhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    zone: string,         // "avant", "droit", "arriere", "gauche", "coffre"
    damageIndex: number   // Index du dégât dans le tableau
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'degats',
      contextSuffix: `_${zone}_degat${damageIndex}`,  // ⭐ Ex: degats_avant_degat0_8
    });
  }

  // ============================================================================
  // ⭐ STEP 4 - PHOTOS INTÉRIEUR
  // ============================================================================

  /**
   * ⭐ Upload photo de sièges (Step4)
   * 
   * Path : resa_8/depart/interior/sieges/photos_interieur_sieges_8_<timestamp>_<uuid>.jpg
   * Usage : Photo des sièges (avant / arrière)
   */
  static async uploadInteriorSeatsPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_interieur_sieges',
      contextSuffix: '/interior/sieges',  // Sous-dossier interior/sieges
    });
  }

  /**
   * ⭐ Upload photo de propreté intérieure (Step4)
   * 
   * Path : resa_8/depart/interior/propreteGenerale/photos_interieur_proprete_8_<timestamp>_<uuid>.jpg
   * Usage : Photo de l'habitacle (vue générale)
   */
  static async uploadInteriorCleanlinessPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_interieur_proprete',
      contextSuffix: '/interior/propreteGenerale',  // Sous-dossier interior/propreteGenerale
    });
  }

  /**
   * ⭐ Upload photo de dégât intérieur (Step4)
   * 
   * Path : resa_8/depart/interior/sieges/photos_interieur_degats_sieges_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'un dégât sur les sièges
   */
  static async uploadInteriorDamagePhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    sectionKey: string  // "sieges"
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_interieur_degats',
      contextSuffix: `/interior/${sectionKey}`,  // ⭐ Sous-dossier: /interior/sieges
    });
  }

  // ============================================================================
  // ⭐ RETOUR - PHOTOS RETOUR
  // ============================================================================

  /**
   * ⭐ Upload photo dashboard RETOUR (Step2 retour)
   * 
   * Path    : resa_8/retour/photos_dashboard_retour_8_<timestamp>_<uuid>.jpg (avec reference_number)
   * Fallback: booking_<bookingId>/retour/photos_dashboard_retour_<bookingId>_<timestamp>_<uuid>.jpg
   * Stockage: checkin_return.data.step2.releves.dashboardPhotosRetour[] = array d'objets avec publicUrl
   */
  static async uploadReturnDashboardPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber?: number | null
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber,
      subfolder: 'retour',  // ⭐ NOUVEAU : sous-dossier retour
      bddColumnName: 'photos_dashboard_retour',
    });
  }

  /**
   * ⭐ Upload photo de dégât extérieur RETOUR (Step3 retour)
   * 
   * Path : resa_8/retour/degats_exterieur_{zone}_degat{index}_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'un nouveau dégât extérieur au retour
   * 
   * @param zone - Zone du véhicule ("avant", "droit", "arriere", "gauche", "coffre", etc.)
   * @param damageIndex - Index du dégât dans le tableau newDamages[] (généralement 0 pour V1)
   */
  static async uploadReturnExteriorDamagePhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    zone: string,         // "avant", "droit", "arriere", "gauche", "coffre", etc.
    damageIndex: number   // Index du dégât dans newDamages[] (généralement 0 pour V1)
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'retour',  // ⭐ NOUVEAU : sous-dossier retour
      bddColumnName: 'degats_exterieur',
      contextSuffix: `_${zone}_degat${damageIndex}`,  // ⭐ Ex: degats_exterieur_avant_degat0_8
    });
  }

  /**
   * ⭐ Upload photo de dégât intérieur RETOUR (Step4 retour)
   * 
   * Path : resa_8/retour/degats_interieur_{area}_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'un nouveau dégât intérieur au retour
   * 
   * @param area - Zone/élément intérieur ("sieges", "tableau de bord", "moquette", etc.)
   */
  static async uploadReturnInteriorDamagePhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    area: string  // "sieges", "tableau de bord", "moquette", etc.
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'retour',  // ⭐ NOUVEAU : sous-dossier retour
      bddColumnName: 'degats_interieur',
      contextSuffix: `_${area}`,  // ⭐ Ex: degats_interieur_sieges_8
    });
  }

  /**
   * ⭐ Upload photo d'accessoires (Step5)
   * 
   * Path : resa_8/depart/photos_accessoires_8_<timestamp>_<uuid>.jpg
   * Usage : Photo d'accessoires (casque, gants, etc.)
   */
  static async uploadAccessoryPhoto(
    file: File,
    bookingId: string,
    bookingReferenceNumber: number | null | undefined,
    accessorySuffix?: string  // Optionnel : "_casque", "_gants", etc.
  ): Promise<{ data: UploadedCheckinPhoto | null; error: string | null }> {
    return this.uploadCheckinPhoto({
      file,
      bookingId,
      bookingReferenceNumber: bookingReferenceNumber ?? null,
      subfolder: 'depart',
      bddColumnName: 'photos_accessoires',
      contextSuffix: accessorySuffix ? `_${accessorySuffix}` : undefined,
    });
  }
}
