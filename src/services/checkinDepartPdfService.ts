/**
 * ⭐ Service de génération de PDF d'état des lieux départ
 * 
 * Phase 4 du plan stratégique PDF : Implémentation backend de la génération PDF
 * 
 * ✅ Génère un PDF à partir du snapshot_legal d'un checkin_depart
 * ✅ Stocke le PDF dans Supabase Storage (bucket checkin-photos)
 * ✅ Retourne l'URL publique du PDF
 * 
 * Source de données : uniquement snapshot_legal + colonnes SQL déjà snapshottées
 * Aucune jointure avec bookings, profiles, vehicles au moment de la génération
 */

import { supabase } from "@/integrations/supabase/client";
import { SupabaseCheckinService, type CheckinDepart } from "./supabaseCheckinService";
import { type CheckinLegalSnapshot } from "@/types/snapshot-legal";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ⚠️ IMPORTANT : html2canvas et jsPDF sont chargés dynamiquement dans generatePdfBlob
// pour éviter de charger ces dépendances lors de l'import du module (elles nécessitent le DOM)

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateCheckinDepartPdfResult {
  pdfStoragePath: string | null;
  publicUrl: string | null;
  error: string | null;
}

export interface GenerateCheckinDepartPdfOptions {
  skipStatusCheck?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BUCKET_NAME = 'checkin-photos';
const PDF_PAGE_WIDTH = 210; // mm (A4 portrait)
const PDF_PAGE_HEIGHT = 297; // mm (A4 portrait)
const PDF_MARGIN = 15; // mm

// ⭐ Phase 4.A.1 : Optimisations pour réduire le poids du PDF
// Scale html2canvas : réduit la résolution du canvas (1.5 = bonne qualité/compromis poids, vs 2 = haute résolution/lourd)
const PDF_HTML2CANVAS_SCALE = 2.0;
// Qualité JPEG : entre 0 et 1 (0.85 = bon compromis qualité/poids, vs PNG = non compressé/très lourd)
const PDF_JPEG_QUALITY = 0.92;

// Limites d'images par page pour les sections photos
const MAX_PHOTOS_PER_PAGE = 6;

// Couleurs (HSL -> RGB pour le PDF)
const COLOR_PRIMARY = '#065F6B'; // hsl(185, 84%, 25%)
const COLOR_SECONDARY = '#F0EBE3'; // hsl(35, 25%, 92%)
const COLOR_TEXT_PRIMARY = '#1A2024'; // hsl(200, 15%, 10%)
const COLOR_TEXT_SECONDARY = '#697479'; // hsl(200, 10%, 45%)
const COLOR_BORDER = '#D8E6E8'; // hsl(190, 25%, 88%)

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Génère un PDF d'état des lieux départ et l'upload dans Storage
 * 
 * @param checkinId - ID du check-in
 * @param options - Options de génération (skipStatusCheck pour bypasser la vérification de status)
 * @returns Résultat avec path Storage, URL publique du PDF ou erreur
 */
export async function generateCheckinDepartPdf(
  checkinId: string,
  options?: GenerateCheckinDepartPdfOptions
): Promise<GenerateCheckinDepartPdfResult> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CheckinDepartPdfService] 🎯 Génération PDF d'état des lieux", { 
    checkinId,
    skipStatusCheck: options?.skipStatusCheck || false,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ⚠️ Vérification de l'environnement (DOM disponible)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const errorMsg = "DOM non disponible : generateCheckinDepartPdf doit être appelé côté client";
    console.error("[CheckinDepartPdfService] ❌", errorMsg);
    return {
      pdfStoragePath: null,
      publicUrl: null,
      error: errorMsg,
    };
  }

  try {
    // ============================================================================
    // ÉTAPE 1 : Charger le checkin avec snapshot_legal
    // ============================================================================
    console.log("[CheckinDepartPdfService] 📥 Chargement du checkin...");

    const { data: checkin, error: checkinError } = await SupabaseCheckinService.getCheckinById(checkinId);

    if (checkinError || !checkin) {
      console.error("[CheckinDepartPdfService] ❌ Check-in introuvable:", checkinError);
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: checkinError || "Check-in introuvable",
      };
    }

    // ============================================================================
    // ÉTAPE 2 : Vérifications
    // ============================================================================
    console.log("[CheckinDepartPdfService] 🔍 Vérifications...");
    console.log("[CheckinDepartPdfService] 🔍 Checkin chargé pour PDF:", {
      checkinId,
      status: checkin.status,
      hasSnapshot: !!checkin.snapshot_legal,
      skipStatusCheck: options?.skipStatusCheck || false,
    });

    // Vérification du status (peut être bypassée si appelée depuis finalizeCheckinDepart)
    if (!options?.skipStatusCheck && checkin.status !== 'completed') {
      console.error("[CheckinDepartPdfService] ❌ Status invalide pour PDF:", {
        checkinId,
        status: checkin.status,
        expected: 'completed',
      });
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: `Le check-in doit être finalisé (status = "completed") pour générer le PDF. Statut actuel: ${checkin.status}`,
      };
    }

    if (!checkin.snapshot_legal) {
      console.error("[CheckinDepartPdfService] ❌ Snapshot légal manquant");
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: "Snapshot légal manquant. Le check-in doit avoir un snapshot_legal pour générer le PDF.",
      };
    }

    const snapshot = checkin.snapshot_legal;
    const bookingReferenceNumber = checkin.booking_reference_number;

    console.log("[CheckinDepartPdfService] ✅ Vérifications OK");
    console.log("[CheckinDepartPdfService] 📊 Réservation #:", bookingReferenceNumber);

    // ============================================================================
    // ÉTAPE 3 : Générer le PDF (HTML → Canvas → PDF)
    // ============================================================================
    console.log("[CheckinDepartPdfService] 📄 ÉTAPE 3 : Génération du PDF Blob...");
    console.log("[CheckinDepartPdfService] 📄 ÉTAPE 3.1 : Appel à generatePdfBlob...");
    console.log("[CheckinDepartPdfService] 📄 ÉTAPE 3.2 : Snapshot présent:", !!snapshot);
    console.log("[CheckinDepartPdfService] 📄 ÉTAPE 3.3 : Checkin présent:", !!checkin);

    // ⭐ Phase 3.A : Nouveau retour structuré de generatePdfBlob
    const { blob: pdfBlob, error: blobError } = await generatePdfBlob(snapshot, checkin);
    console.log("[CheckinDepartPdfService] 📄 ÉTAPE 3.4 : generatePdfBlob retourné:", {
      hasBlob: !!pdfBlob,
      blobSize: pdfBlob ? `${pdfBlob.size} bytes` : "null",
      hasError: !!blobError,
      error: blobError || "null",
    });

    // ⭐ Phase 3.A : Gérer les erreurs avec messages explicites
    if (blobError || !pdfBlob) {
      const errorMessage = blobError || "Erreur lors de la génération du PDF (Blob null)";
      console.error("[CheckinDepartPdfService] ❌ Erreur génération PDF Blob:", errorMessage);
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: errorMessage,
      };
    }

    console.log("[CheckinDepartPdfService] ✅ PDF généré, taille:", pdfBlob.size, "bytes");

    // ============================================================================
    // ÉTAPE 4 : Upload vers Supabase Storage
    // ============================================================================
    const storagePath = buildStoragePath(checkinId, bookingReferenceNumber);
    console.log("[CheckinDepartPdfService] ☁️ Upload du PDF vers Storage...", {
      bucket: BUCKET_NAME,
      storagePath,
      pdfSize: pdfBlob.size,
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true, // Écraser si existe déjà
      });

    if (uploadError) {
      console.error("[CheckinDepartPdfService] ❌ Erreur upload:", {
        checkinId,
        storagePath,
        bucket: BUCKET_NAME,
        error: uploadError,
        errorMessage: uploadError.message || String(uploadError),
      });
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: `Erreur lors de l'upload du PDF : ${uploadError.message}`,
      };
    }

    console.log("[CheckinDepartPdfService] ✅ PDF uploadé avec succès", {
      checkinId,
      storagePath,
      uploadData: uploadData?.path || 'N/A',
    });

    // ============================================================================
    // ÉTAPE 5 : Récupérer l'URL publique
    // ============================================================================
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log("[CheckinDepartPdfService] 🔗 URL publique:", publicUrl);

    // ⭐ Phase 3.B : Validation stricte de l'URL publique
    if (!publicUrl || typeof publicUrl !== 'string' || publicUrl.trim() === '') {
      const errorMsg = "URL publique invalide ou vide après génération du PDF";
      console.error("[CheckinDepartPdfService] ❌ URL publique invalide:", {
        checkinId,
        storagePath,
        publicUrl,
        urlDataType: typeof publicUrl,
      });
      return {
        pdfStoragePath: storagePath,
        publicUrl: null,
        error: errorMsg,
      };
    }

    // ============================================================================
    // ÉTAPE 6 : Mettre à jour legal_pdf_url dans checkin_depart
    // ============================================================================
    console.log("[CheckinDepartPdfService] 💾 Mise à jour legal_pdf_url...", {
      checkinId,
      publicUrl,
    });

    const { data: updatedCheckin, error: updateError } = await SupabaseCheckinService.updateCheckinPDFUrl(
      checkinId,
      publicUrl
    );

    if (updateError || !updatedCheckin) {
      const errorMessage = typeof updateError === 'string' 
        ? updateError 
        : (updateError && typeof updateError === 'object' && 'message' in updateError 
          ? (updateError as { message: string }).message 
          : 'Erreur inconnue');
      
      // ⭐ Phase 3.B : Remontée explicite de l'erreur de mise à jour legal_pdf_url
      const finalErrorMsg = `PDF généré mais erreur lors de la mise à jour legal_pdf_url : ${errorMessage}`;
      console.error("[CheckinDepartPdfService] ❌ Erreur mise à jour legal_pdf_url:", {
        checkinId,
        publicUrl,
        error: updateError,
        errorMessage,
      });
      console.error("[CheckinDepartPdfService] ❌ PDF généré mais legal_pdf_url non mis à jour");
      
      // Retourner une erreur structurée pour informer l'appelant
      // Le PDF est bien généré (présent dans Storage) mais legal_pdf_url n'a pas été mis à jour
      return {
        pdfStoragePath: storagePath,
        publicUrl: publicUrl, // L'URL est valide, même si la DB n'a pas été mise à jour
        error: finalErrorMsg,
      };
    } else {
      console.log("[CheckinDepartPdfService] ✅ legal_pdf_url mis à jour avec succès", {
        checkinId,
        legal_pdf_url: updatedCheckin.legal_pdf_url,
      });
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CheckinDepartPdfService] ✅ PDF généré avec succès !");
    console.log("[CheckinDepartPdfService] 📁 Path:", storagePath);
    console.log("[CheckinDepartPdfService] 🔗 URL:", publicUrl);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return {
      pdfStoragePath: storagePath,
      publicUrl: publicUrl,
      error: null,
    };
  } catch (error: any) {
    console.error("[CheckinDepartPdfService] ❌ Exception non gérée:", error);
    return {
      pdfStoragePath: null,
      publicUrl: null,
      error: `Erreur inattendue : ${error.message || String(error)}`,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construit le chemin de stockage du PDF
 */
function buildStoragePath(checkinId: string, bookingReferenceNumber: number | null | undefined): string {
  const bookingRef = bookingReferenceNumber ?? 'unknown';
  return `resa_${bookingRef}/documents/etat_des_lieux_depart_${checkinId}.pdf`;
}

/**
 * Génère le Blob PDF à partir du snapshot légal
 * 
 * ⭐ Phase 3.A : Nouvelle signature avec erreurs structurées
 * Retourne { blob, error } au lieu de Blob | null pour permettre des messages d'erreur explicites
 */
async function generatePdfBlob(
  snapshot: CheckinLegalSnapshot,
  checkin: CheckinDepart
): Promise<{ blob: Blob | null; error: string | null }> {
  console.log("[CheckinDepartPdfService] 🔧 generatePdfBlob : Début");
  console.log("[CheckinDepartPdfService] 🔧 generatePdfBlob : Vérification DOM...", {
    windowAvailable: typeof window !== 'undefined',
    documentAvailable: typeof document !== 'undefined',
  });

  // ⭐ Phase 3.A : Vérification DOM avec retour structuré
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const errorMsg = "DOM non disponible : window ou document est undefined";
    console.error("[CheckinDepartPdfService] ❌ DOM non disponible dans generatePdfBlob");
    return { blob: null, error: errorMsg };
  }

  // ⭐ Phase 3.C : Déclaration de tempDiv avant le try pour garantir le nettoyage dans le finally
  let tempDiv: HTMLDivElement | null = null;

  try {
    // ⚠️ IMPORTANT : Charger html2canvas et jsPDF dynamiquement (nécessitent le DOM)
    // Cela évite de charger ces dépendances lors de l'import du module
    console.log("[CheckinDepartPdfService] 🔧 generatePdfBlob : Import dynamique html2canvas...");
    let html2canvas: any;
    try {
      html2canvas = (await import('html2canvas')).default;
      console.log("[CheckinDepartPdfService] 🔧 generatePdfBlob : html2canvas importé:", typeof html2canvas);
    } catch (importError: any) {
      const errorMsg = `Erreur lors du chargement de html2canvas : ${importError?.message || String(importError)}`;
      console.error("[CheckinDepartPdfService] ❌ Erreur import html2canvas:", importError);
      return { blob: null, error: errorMsg };
    }
    
    console.log("[CheckinDepartPdfService] 🔧 generatePdfBlob : Import dynamique jsPDF...");
    let jsPDF: any;
    try {
      jsPDF = (await import('jspdf')).default;
      console.log("[CheckinDepartPdfService] 🔧 generatePdfBlob : jsPDF importé:", typeof jsPDF);
    } catch (importError: any) {
      const errorMsg = `Erreur lors du chargement de jsPDF : ${importError?.message || String(importError)}`;
      console.error("[CheckinDepartPdfService] ❌ Erreur import jsPDF:", importError);
      return { blob: null, error: errorMsg };
    }

    // Créer un élément HTML invisible avec le template PDF
    tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.backgroundColor = '#ffffff';
    
    // Générer le HTML du PDF
    tempDiv.innerHTML = createPDFTemplateHTML(snapshot, checkin);
    
    // Attacher temporairement au DOM
    document.body.appendChild(tempDiv);

    // Attendre que les images se chargent
    await waitForImages(tempDiv);

    // Capturer chaque page séparément
    let pdf: any;
    try {
      pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const availableWidth = pdfWidth - (PDF_MARGIN * 2);
      const availableHeight = pdfHeight - (PDF_MARGIN * 2);

      const pageElements = tempDiv.querySelectorAll('.page');

      for (let index = 0; index < pageElements.length; index++) {
        const pageElement = pageElements[index] as HTMLElement;

        let canvas: HTMLCanvasElement;
        try {
          canvas = await html2canvas(pageElement, {
            scale: PDF_HTML2CANVAS_SCALE,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: pageElement.scrollWidth,
            height: pageElement.scrollHeight,
          });
        } catch (html2canvasError: any) {
          const errorMsg = `Erreur lors de la conversion HTML vers Canvas (page ${index + 1}) : ${html2canvasError?.message || String(html2canvasError)}`;
          console.error("[CheckinDepartPdfService] ❌ Erreur html2canvas page:", html2canvasError);
          return { blob: null, error: errorMsg };
        }

        const imgData = canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY);

        const imgWidthMM = (canvas.width * 25.4) / 96;
        const imgHeightMM = (canvas.height * 25.4) / 96;
        const ratio = imgHeightMM / imgWidthMM;

        let renderWidth = availableWidth;
        let renderHeight = renderWidth * ratio;

        if (renderHeight > availableHeight) {
          renderHeight = availableHeight;
          renderWidth = renderHeight / ratio;
        }

        const offsetX = PDF_MARGIN + ((availableWidth - renderWidth) / 2);
        const offsetY = PDF_MARGIN + ((availableHeight - renderHeight) / 2);

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');

        // Ajouter numéro de page
        const pageNum = index + 1;
        const totalPages = pageElements.length;
        pdf.setFontSize(10);
        pdf.setTextColor(COLOR_TEXT_SECONDARY);
        pdf.text(
          `Page ${pageNum} / ${totalPages}`,
          pdfWidth / 2,
          pdfHeight - 10,
          { align: 'center' }
        );
      }

      const blob = pdf.output('blob');
      return { blob, error: null };
    } catch (jspdfError: any) {
      const errorMsg = `Erreur lors de la génération du PDF via jsPDF : ${jspdfError?.message || String(jspdfError)}`;
      console.error("[CheckinDepartPdfService] ❌ Erreur jsPDF:", jspdfError);
      return { blob: null, error: errorMsg };
    }
  } catch (error: any) {
    // ⭐ Phase 3.A : Erreur générique catchée avec message explicite
    const errorMsg = `Erreur inattendue lors de la génération du PDF : ${error?.message || String(error)}`;
    console.error("[CheckinDepartPdfService] ❌ Erreur génération PDF Blob:", error);
    return { blob: null, error: errorMsg };
  } finally {
    // ⭐ Phase 3.C : Garantir le nettoyage du DOM quoi qu'il arrive
    if (tempDiv && typeof document !== 'undefined' && document.body && document.body.contains(tempDiv)) {
      try {
        document.body.removeChild(tempDiv);
        console.log("[CheckinDepartPdfService] 🧹 tempDiv nettoyé du DOM");
      } catch (cleanupError: any) {
        // Ne pas faire échouer la fonction si le nettoyage échoue
        console.warn("[CheckinDepartPdfService] ⚠️ Erreur lors du nettoyage du DOM:", cleanupError);
      }
    }
  }
}

/**
 * Attend que toutes les images dans l'élément soient chargées
 */
function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Continuer même si une image échoue
      setTimeout(() => resolve(), 5000); // Timeout de 5s
    });
  });
  return Promise.all(promises).then(() => {});
}

/**
 * Formate une date pour l'affichage dans le PDF (DD/MM/YYYY)
 */
function formatDateForPDF(dateString: string | null | undefined): string {
  if (!dateString) return "Non renseigné";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
  } catch {
    return "Date invalide";
  }
}

/**
 * Formate une date/heure pour l'affichage dans le PDF (DD/MM/YYYY HH:mm)
 */
function formatDateTimeForPDF(dateString: string | null | undefined): string {
  if (!dateString) return "Non renseigné";
  try {
    return format(new Date(dateString), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return "Date invalide";
  }
}

/**
 * Formate une heure pour l'affichage (HH:mm)
 */
function formatTimeForPDF(dateString: string | null | undefined): string {
  if (!dateString) return "Non renseigné";
  try {
    return format(new Date(dateString), "HH:mm", { locale: fr });
  } catch {
    return "Heure invalide";
  }
}

/**
 * Divise un tableau en sous-tableaux de taille maximale size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function normalizePhotoUrl(photo: any): string {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  if (typeof photo === 'object' && photo.publicUrl) return photo.publicUrl;
  if (typeof photo === 'object' && photo.url) return photo.url;
  return String(photo);
}

type PhotoItem = { label: string; url: string };

function buildExteriorPhotoItems(exterior: any, isMoto: boolean = false): PhotoItem[] {
  const zones = [
    { label: 'Avant', photos: exterior?.photos?.avant || [] },
    { label: 'Droite', photos: exterior?.photos?.droit || [] },
    { label: 'Arrière', photos: exterior?.photos?.arriere || [] },
    { label: 'Gauche', photos: exterior?.photos?.gauche || [] },
    // ⭐ Exclure "Coffre" pour moto
    ...(isMoto ? [] : [{ label: 'Coffre', photos: exterior?.photos?.coffre || [] }]),
    { label: 'Jantes', photos: [
      ...(exterior?.photos?.janteAvDroit || []),
      ...(exterior?.photos?.janteArDroit || []),
      ...(exterior?.photos?.janteAvGauche || []),
      ...(exterior?.photos?.janteArGauche || []),
    ] },
  ];

  const items: PhotoItem[] = [];
  zones.forEach(zone => {
    zone.photos?.forEach((photo: any, idx: number) => {
      const url = normalizePhotoUrl(photo);
      if (!url) return;
      items.push({
        label: zone.photos.length > 1 ? `${zone.label} ${idx + 1}` : zone.label,
        url,
      });
    });
  });
  return items;
}

function buildInteriorPhotoItems(interior: any): PhotoItem[] {
  const groups = [
    { label: 'Propreté intérieure', photos: interior?.cleanliness?.photos || [] },
    { label: 'Sièges', photos: interior?.seats?.photos || [] },
  ];

  const items: PhotoItem[] = [];
  groups.forEach(group => {
    group.photos?.forEach((photo: any, idx: number) => {
      const url = normalizePhotoUrl(photo);
      if (!url) return;
      items.push({
        label: group.photos.length > 1 ? `${group.label} ${idx + 1}` : group.label,
        url,
      });
    });
  });
  return items;
}

function generatePhotoPages(title: string, items: PhotoItem[]): string {
  if (!items || items.length === 0) return '';

  const chunks = chunkArray(items, MAX_PHOTOS_PER_PAGE);
  const total = chunks.length;

  return chunks.map((chunk, idx) => `
    <div class="page page-photos">
      <div class="header">
        <div class="header-title">${title}${total > 1 ? ` (page ${idx + 1}/${total})` : ''}</div>
      </div>
      <div class="section">
        <div class="card">
          <div class="photo-grid">
            ${chunk.map(item => `
              <div class="photo-item">
                <img src="${item.url}" alt="${item.label}" onerror="this.style.display='none'"/>
                <div class="photo-caption">${item.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Crée le template HTML du PDF
 * Cette fonction génère le HTML complet du PDF avec toutes les sections
 */
function createPDFTemplateHTML(
  snapshot: CheckinLegalSnapshot,
  checkin: CheckinDepart
): string {
  // Ce sera une fonction très longue, on va la séparer en sous-fonctions
  // Pour l'instant, retournons la structure de base
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12pt;
          line-height: 1.6;
          color: ${COLOR_TEXT_PRIMARY};
          background: #ffffff;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          background: #ffffff;
          page-break-after: always;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .page-break-before {
          page-break-before: always;
        }
        .header {
          border-bottom: 3px solid ${COLOR_PRIMARY};
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .header-title {
          font-size: 24pt;
          font-weight: bold;
          color: ${COLOR_PRIMARY};
          margin-bottom: 5px;
        }
        .header-subtitle {
          font-size: 12pt;
          color: ${COLOR_TEXT_SECONDARY};
        }
        .section {
          margin-bottom: 25px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16pt;
          font-weight: 600;
          color: ${COLOR_PRIMARY};
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 2px solid ${COLOR_BORDER};
        }
        .card {
          background: #ffffff;
          border: 1px solid ${COLOR_BORDER};
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .field-row {
          display: flex;
          margin-bottom: 10px;
        }
        .field-label {
          font-weight: 600;
          color: ${COLOR_TEXT_SECONDARY};
          width: 150px;
          flex-shrink: 0;
        }
        .field-value {
          color: ${COLOR_TEXT_PRIMARY};
          flex: 1;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 10px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .photo-item {
          border: 1px solid ${COLOR_BORDER};
          border-radius: 4px;
          overflow: hidden;
          max-width: 100%;
          break-inside: avoid;
          page-break-inside: avoid;
          background: #fafafa;
        }
        .photo-item img {
          width: 100%;
          height: auto;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          display: block;
        }
        .photo-caption {
          font-size: 10pt;
          color: ${COLOR_TEXT_SECONDARY};
          text-align: center;
          padding: 6px;
          background: #fff;
        }
        .signature-box {
          border: 1px solid ${COLOR_BORDER};
          border-radius: 4px;
          padding: 10px;
          margin-top: 10px;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .signature-box img {
          max-width: 200px;
          max-height: 60px;
        }
      </style>
    </head>
    <body>
      ${generatePage1(snapshot, checkin)}
      ${generatePage2(snapshot, checkin)}
      ${snapshot.interior ? generatePage3(snapshot, checkin) : ''}
      ${generatePage4(snapshot, checkin)}
      ${generatePage5(snapshot, checkin)}
    </body>
    </html>
  `;
}

/**
 * Génère la page 1 : Détails de l'état des lieux
 */
function generatePage1(snapshot: CheckinLegalSnapshot, checkin: CheckinDepart): string {
  const driver = snapshot.driver;
  const owner = snapshot.owner;
  const booking = snapshot.booking;
  const vehicle = snapshot.vehicle;
  const validatedAt = snapshot.validation.validatedAt || checkin.validated_at || snapshot.metadata.createdAt;


  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de départ</div>
        <div class="header-subtitle">
          Réservation n° ${booking.referenceNumber || 'N/A'} • 
          ${formatDateTimeForPDF(validatedAt)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Véhicule</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Marque :</span>
            <span class="field-value">${vehicle.brand || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Modèle :</span>
            <span class="field-value">${vehicle.model || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Immatriculation :</span>
            <span class="field-value">${vehicle.licensePlate || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Kilométrage départ :</span>
            <span class="field-value">${vehicle.mileageDeparture !== null ? `${vehicle.mileageDeparture} km` : 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Niveau de carburant :</span>
            <span class="field-value">${vehicle.fuelLevel !== null ? `${vehicle.fuelLevel}%` : 'Non renseigné'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Informations client (conducteur)</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Nom :</span>
            <span class="field-value">${driver.lastName || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Prénom :</span>
            <span class="field-value">${driver.firstName || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Téléphone :</span>
            <span class="field-value">${driver.phone || checkin.driver_phone || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Email :</span>
            <span class="field-value">${driver.email || checkin.driver_email || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Permis n° :</span>
            <span class="field-value">${driver.licenseNumber || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Pays :</span>
            <span class="field-value">${driver.licenseCountry || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Catégorie :</span>
            <span class="field-value">${driver.licenseCategory || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date d'obtention :</span>
            <span class="field-value">${formatDateForPDF(driver.licenseIssueDate) || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date d'expiration :</span>
            <span class="field-value">${formatDateForPDF(driver.licenseExpirationDate) || 'Non renseigné'}</span>
          </div>
        </div>
      </div>

      <!-- ⭐ Phase 4.B.1 : Section photos permis de conduire -->
      ${driver?.licensePhotos?.recto || driver?.licensePhotos?.verso ? `
      <div class="section">
        <div class="section-title">Permis de conduire</div>
        <div class="card">
          ${driver?.licensePhotos?.recto || driver?.licensePhotos?.verso ? `
            <div class="photo-grid">
              ${driver?.licensePhotos?.recto ? `
                <div class="photo-item">
                  <img src="${driver.licensePhotos.recto}" alt="Permis recto" onerror="this.style.display='none'"/>
                </div>
              ` : ''}
              ${driver?.licensePhotos?.verso ? `
                <div class="photo-item">
                  <img src="${driver.licensePhotos.verso}" alt="Permis verso" onerror="this.style.display='none'"/>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Propriétaire</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Nom :</span>
            <span class="field-value">${owner.lastName || checkin.owner_last_name || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Prénom :</span>
            <span class="field-value">${owner.firstName || checkin.owner_first_name || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Téléphone :</span>
            <span class="field-value">${owner.phone || checkin.owner_phone || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Email :</span>
            <span class="field-value">${owner.email || checkin.owner_email || 'Non renseigné'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Réservation</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Réservation n° :</span>
            <span class="field-value">${booking.referenceNumber || checkin.booking_reference_number || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date de départ :</span>
            <span class="field-value">${formatDateTimeForPDF(booking.departureDatetime || checkin.booking_departure_datetime || null)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Lieu de départ :</span>
            <span class="field-value">${booking.departureLocation || checkin.booking_departure_location || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date de retour prévue :</span>
            <span class="field-value">${formatDateTimeForPDF(booking.returnDatetime || checkin.booking_return_datetime || null)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Lieu de retour prévu :</span>
            <span class="field-value">${booking.returnLocation || checkin.booking_return_location || 'Non renseigné'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère la page 2 : État du véhicule – Extérieur
 */
function generatePage2(snapshot: CheckinLegalSnapshot, checkin: CheckinDepart): string {
  const exterior = snapshot.exterior;
  const vehicle = snapshot.vehicle;
  const isMoto = vehicle.type_normalized === 'moto';

  // Limiter les photos à 2 par zone maximum
  const photoLimit = 2;

  const exteriorPhotos = buildExteriorPhotoItems(exterior, isMoto);

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État du véhicule – Extérieur</div>
      </div>

      <div class="section">
        <div class="section-title">Propreté extérieure</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Niveau :</span>
            <span class="field-value">${exterior.cleanliness.level || 'Non renseigné'}</span>
          </div>
          ${exterior.cleanliness.notes ? `
            <div class="field-row">
              <span class="field-label">Notes :</span>
              <span class="field-value">${exterior.cleanliness.notes}</span>
            </div>
          ` : ''}
        </div>
      </div>

      ${!isMoto ? `
      <div class="section">
        <div class="section-title">Équipements du coffre</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Triangle :</span>
            <span class="field-value">${exterior.trunkEquipments.triangle ? 'Oui' : 'Non'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Gilet :</span>
            <span class="field-value">${exterior.trunkEquipments.gilet ? 'Oui' : 'Non'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Roue de secours :</span>
            <span class="field-value">${exterior.trunkEquipments.roueSecours ? 'Oui' : 'Non'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Kit anti-crevaison :</span>
            <span class="field-value">${exterior.trunkEquipments.kitAntiCrevaison ? 'Oui' : 'Non'}</span>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Dégâts extérieurs relevés</div>
        ${exterior.damages && exterior.damages.length > 0 ? `
          <div class="card">
            ${exterior.damages.map((damage, idx) => `
              <div style="margin-bottom: 15px; ${idx < exterior.damages.length - 1 ? 'border-bottom: 1px solid ' + COLOR_BORDER + '; padding-bottom: 10px;' : ''}">
                <div class="field-row">
                  <span class="field-label">Zone :</span>
                  <span class="field-value">${damage.zone || 'Non renseigné'}</span>
                </div>
                ${damage.typeDegats && Array.isArray(damage.typeDegats) && damage.typeDegats.length > 0 ? `
                <div class="field-row">
                  <span class="field-label">Types de dégâts :</span>
                  <span class="field-value">${damage.typeDegats.join(', ')}</span>
                </div>
                ` : ''}
                ${damage.commentaire ? `
                  <div class="field-row">
                    <span class="field-label">Commentaire :</span>
                    <span class="field-value">${damage.commentaire}</span>
                  </div>
                ` : ''}
                ${damage.photos && damage.photos.length > 0 ? `
                  <div class="photo-grid">
                    ${damage.photos.slice(0, 2).map(photo => `
                      <div class="photo-item">
                        <img src="${photo.publicUrl}" alt="Dégât ${damage.zone}" onerror="this.style.display='none'"/>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="card">
            <div class="field-value">Aucun dégât extérieur relevé</div>
          </div>
        `}
      </div>
    </div>
    ${generatePhotoPages("Photos extérieures", exteriorPhotos)}
  `;
}

/**
 * Génère la page 3 : État du véhicule – Intérieur
 */
function generatePage3(snapshot: CheckinLegalSnapshot, checkin: CheckinDepart): string {
  // ⭐ Défense en profondeur : ne pas générer la page si interior est null (moto)
  if (!snapshot.interior) {
    return '';
  }

  const interior = snapshot.interior;

  const interiorPhotos = buildInteriorPhotoItems(interior);

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État du véhicule – Intérieur</div>
      </div>

      <div class="section">
        <div class="section-title">Propreté intérieure</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Niveau :</span>
            <span class="field-value">${interior.cleanliness.level || 'Non renseigné'}</span>
          </div>
          ${interior.cleanliness.notes ? `
            <div class="field-row">
              <span class="field-label">Notes :</span>
              <span class="field-value">${interior.cleanliness.notes}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Sièges</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Dégâts présents :</span>
            <span class="field-value">${interior.seats.hasDamage ? 'Oui' : 'Non'}</span>
          </div>
          ${interior.seats.damages && interior.seats.damages.length > 0 ? `
            <div class="field-row">
              <span class="field-label">Liste des dégâts :</span>
              <span class="field-value">${interior.seats.damages.join(', ')}</span>
            </div>
          ` : ''}
          ${interior.seats.notes ? `
            <div class="field-row">
              <span class="field-label">Notes :</span>
              <span class="field-value">${interior.seats.notes}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Équipements</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Radio / Multimédia :</span>
            <span class="field-value">${interior.equipments.radioOk ? 'OK' : 'Non fonctionnel'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Climatisation :</span>
            <span class="field-value">${interior.equipments.acOk ? 'OK' : 'Non fonctionnel'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Verrouillage centralisé :</span>
            <span class="field-value">${interior.equipments.centralLockOk ? 'OK' : 'Non fonctionnel'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Fenêtres :</span>
            <span class="field-value">${interior.equipments.windowsOk ? 'OK' : 'Non fonctionnel'}</span>
          </div>
        </div>
      </div>
    </div>
    ${generatePhotoPages("Photos intérieures", interiorPhotos)}
  `;
}

/**
 * Génère la page 4 : Accessoires & Remarques
 */
function generatePage4(snapshot: CheckinLegalSnapshot, checkin: CheckinDepart): string {
  const accessories = snapshot.accessories;
  const remarks = snapshot.remarks;
  const vehicle = snapshot.vehicle;

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">Accessoires & Remarques</div>
      </div>

      <div class="section">
        <div class="section-title">Photos du tableau de bord</div>
        ${vehicle.dashboardPhotos && vehicle.dashboardPhotos.length > 0 ? `
          <div class="card">
            <div class="photo-grid">
              ${vehicle.dashboardPhotos.slice(0, 4).map(photo => `
                <div class="photo-item">
                  <img src="${photo.publicUrl}" alt="Tableau de bord" onerror="this.style.display='none'"/>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="card">
            <div class="field-value">Aucune photo du tableau de bord</div>
          </div>
        `}
      </div>

      <div class="section">
        <div class="section-title">Accessoires</div>
        <div class="card">
          ${accessories.comment ? `
            <div class="field-row">
              <span class="field-label">Commentaire :</span>
              <span class="field-value">${accessories.comment}</span>
            </div>
          ` : `
            <div class="field-value">Aucun commentaire sur les accessoires</div>
          `}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Remarques générales</div>
        <div class="card">
          ${remarks.general ? `
            <div class="field-value" style="white-space: pre-wrap;">${remarks.general}</div>
          ` : `
            <div class="field-value">Aucune remarque générale</div>
          `}
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère la page 5 : Validation & signatures
 */
function generatePage5(snapshot: CheckinLegalSnapshot, checkin: CheckinDepart): string {
  const driver = snapshot.driver;
  const owner = snapshot.owner;
  const validation = snapshot.validation;
  const validatedAt = validation.validatedAt || checkin.validated_at || snapshot.metadata.createdAt;
  const location = validation.location || 'Non renseigné';

  // Signatures depuis snapshot ou colonnes SQL
  const ownerSignature = validation.ownerSignature || checkin.signature_owner;
  const renterSignature = validation.renterSignature || checkin.signature_renter;

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">Validation & Signatures</div>
      </div>

      <div class="section">
        <div class="section-title">Récapitulatif</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Conducteur :</span>
            <span class="field-value">${driver.firstName || ''} ${driver.lastName || ''}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Propriétaire :</span>
            <span class="field-value">${owner.firstName || ''} ${owner.lastName || ''}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date et heure de validation :</span>
            <span class="field-value">${formatDateTimeForPDF(validatedAt)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Lieu de l'état des lieux :</span>
            <span class="field-value">${location}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Signatures</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="card">
            <div style="font-weight: 600; margin-bottom: 10px; color: ${COLOR_PRIMARY};">
              Signature propriétaire
            </div>
            ${ownerSignature ? `
              <div class="signature-box">
                <img src="${ownerSignature}" alt="Signature propriétaire" onerror="this.style.display='none'; this.parentElement.innerHTML='Signature non disponible';"/>
              </div>
            ` : `
              <div class="signature-box" style="color: ${COLOR_TEXT_SECONDARY};">
                Signature non disponible
              </div>
            `}
          </div>
          
          <div class="card">
            <div style="font-weight: 600; margin-bottom: 10px; color: ${COLOR_PRIMARY};">
              Signature locataire/conducteur
            </div>
            ${renterSignature ? `
              <div class="signature-box">
                <img src="${renterSignature}" alt="Signature locataire" onerror="this.style.display='none'; this.parentElement.innerHTML='Signature non disponible';"/>
              </div>
            ` : `
              <div class="signature-box" style="color: ${COLOR_TEXT_SECONDARY};">
                Signature non disponible
              </div>
            `}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card" style="background: ${COLOR_SECONDARY}; padding: 20px; border-left: 4px solid ${COLOR_PRIMARY};">
          <div style="font-size: 10pt; color: ${COLOR_TEXT_PRIMARY}; line-height: 1.8;">
            <strong>Texte légal :</strong><br/>
            Les parties reconnaissent avoir pris connaissance de l'état des lieux ci-dessus et confirment 
            l'exactitude des informations consignées. Le présent document fait foi de l'état du véhicule 
            au moment de la remise des clés.
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère une grille de photos pour une zone
 */
function generatePhotoGrid(zones: Array<{ label: string; photos: Array<{ publicUrl: string }> }>): string {
  let hasPhotos = false;
  let html = '';

  for (const zone of zones) {
    if (zone.photos && zone.photos.length > 0) {
      hasPhotos = true;
      html += `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: 600; margin-bottom: 5px; color: ${COLOR_PRIMARY};">
            ${zone.label}
          </div>
          <div class="photo-grid">
            ${zone.photos.map(photo => `
              <div class="photo-item">
                <img src="${photo.publicUrl}" alt="${zone.label}" onerror="this.style.display='none'"/>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  if (!hasPhotos) {
    return '<div class="field-value">Aucune photo disponible</div>';
  }

  return html;
}

