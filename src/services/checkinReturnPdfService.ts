/**
 * ⭐ Service de génération de PDF d'état des lieux retour
 * 
 * Inspiré de checkinDepartPdfService.ts
 * 
 * ✅ Génère un PDF à partir du snapshot_legal d'un checkin_return
 * ✅ Stocke le PDF dans Supabase Storage (bucket checkin-photos)
 * ✅ Retourne l'URL publique du PDF
 * 
 * Source de données : uniquement snapshot_legal
 */

import { supabase } from "@/integrations/supabase/client";
import { SupabaseCheckinReturnService, type CheckinReturn } from "./supabaseCheckinReturnService";
import { type CheckinReturnLegalSnapshot } from "./checkinReturnSnapshotService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ⚠️ IMPORTANT : html2canvas et jsPDF sont chargés dynamiquement dans generatePdfBlob
// pour éviter de charger ces dépendances lors de l'import du module

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateCheckinReturnPdfResult {
  pdfStoragePath: string | null;
  publicUrl: string | null;
  error: string | null;
}

export interface GenerateCheckinReturnPdfOptions {
  skipStatusCheck?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BUCKET_NAME = 'checkin-photos';
const PDF_PAGE_WIDTH = 210; // mm (A4 portrait)
const PDF_PAGE_HEIGHT = 297; // mm (A4 portrait)
const PDF_MARGIN = 15; // mm
const PDF_HTML2CANVAS_SCALE = 2.0;
const PDF_JPEG_QUALITY = 0.92;
const MAX_PHOTOS_PER_PAGE = 6;

// Couleurs
const COLOR_PRIMARY = '#065F6B';
const COLOR_SECONDARY = '#F0EBE3';
const COLOR_TEXT_PRIMARY = '#1A2024';
const COLOR_TEXT_SECONDARY = '#697479';
const COLOR_BORDER = '#D8E6E8';

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Génère un PDF d'état des lieux retour et l'upload dans Storage
 */
export async function generateCheckinReturnPdf(
  checkinReturnId: string,
  options?: GenerateCheckinReturnPdfOptions
): Promise<GenerateCheckinReturnPdfResult> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CheckinReturnPdfService] 🎯 Génération PDF d'état des lieux retour", { 
    checkinReturnId,
    skipStatusCheck: options?.skipStatusCheck || false,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ⚠️ Vérification de l'environnement (DOM disponible)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const errorMsg = "DOM non disponible : generateCheckinReturnPdf doit être appelé côté client";
    console.error("[CheckinReturnPdfService] ❌", errorMsg);
    return {
      pdfStoragePath: null,
      publicUrl: null,
      error: errorMsg,
    };
  }

  try {
    // ============================================================================
    // ÉTAPE 1 : Charger le checkin_return avec snapshot_legal
    // ============================================================================
    console.log("[CheckinReturnPdfService] 📥 Chargement du check-in retour...");

    const { data: checkinReturn, error: checkinError } = await SupabaseCheckinReturnService.getReturnById(checkinReturnId);

    if (checkinError || !checkinReturn) {
      console.error("[CheckinReturnPdfService] ❌ Check-in retour introuvable:", checkinError);
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: checkinError || "Check-in retour introuvable",
      };
    }

    // ============================================================================
    // ÉTAPE 2 : Vérifications
    // ============================================================================
    console.log("[CheckinReturnPdfService] 🔍 Vérifications...");
    console.log("[CheckinReturnPdfService] 🔍 Checkin retour chargé pour PDF:", {
      checkinReturnId,
      status: checkinReturn.status,
      hasSnapshot: !!checkinReturn.snapshot_legal,
      skipStatusCheck: options?.skipStatusCheck || false,
    });

    // Vérification du status (peut être bypassée si appelée depuis finalizeCheckinReturn)
    if (!options?.skipStatusCheck && checkinReturn.status !== 'completed') {
      console.error("[CheckinReturnPdfService] ❌ Status invalide pour PDF:", {
        checkinReturnId,
        status: checkinReturn.status,
        expected: 'completed',
      });
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: `Le check-in retour doit être finalisé (status = "completed") pour générer le PDF. Statut actuel: ${checkinReturn.status}`,
      };
    }

    if (!checkinReturn.snapshot_legal) {
      console.error("[CheckinReturnPdfService] ❌ Snapshot légal manquant");
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: "Snapshot légal manquant. Le check-in retour doit avoir un snapshot_legal pour générer le PDF.",
      };
    }

    const snapshot = checkinReturn.snapshot_legal as CheckinReturnLegalSnapshot;
    const bookingReferenceNumber = snapshot.booking.referenceNumber;

    // Détection du type de véhicule (méthode locale : depuis booking_id)
    let vehicleType: string | null = null;
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("vehicle_id")
        .eq("id", checkinReturn.booking_id)
        .single();
      
      if (booking?.vehicle_id) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("vehicle_type")
          .eq("id", booking.vehicle_id)
          .single();
        
        vehicleType = vehicle?.vehicle_type || null;
      }
    } catch (error) {
      console.warn("[CheckinReturnPdfService] ⚠️ Impossible de récupérer vehicle_type, utilisation du comportement par défaut (voiture):", error);
    }

    console.log("[CheckinReturnPdfService] ✅ Vérifications OK");
    console.log("[CheckinReturnPdfService] 📊 Réservation #:", bookingReferenceNumber);
    console.log("[CheckinReturnPdfService] 🚗 Type de véhicule:", vehicleType || "voiture (défaut)");

    // ============================================================================
    // ÉTAPE 3 : Générer le PDF (HTML → Canvas → PDF)
    // ============================================================================
    console.log("[CheckinReturnPdfService] 📄 ÉTAPE 3 : Génération du PDF Blob...");

    const { blob: pdfBlob, error: blobError } = await generatePdfBlob(snapshot, checkinReturn, vehicleType);
    console.log("[CheckinReturnPdfService] 📄 generatePdfBlob retourné:", {
      hasBlob: !!pdfBlob,
      blobSize: pdfBlob ? `${pdfBlob.size} bytes` : "null",
      hasError: !!blobError,
      error: blobError || "null",
    });

    if (blobError || !pdfBlob) {
      const errorMessage = blobError || "Erreur lors de la génération du PDF (Blob null)";
      console.error("[CheckinReturnPdfService] ❌ Erreur génération PDF Blob:", errorMessage);
      return {
        pdfStoragePath: null,
        publicUrl: null,
        error: errorMessage,
      };
    }

    console.log("[CheckinReturnPdfService] ✅ PDF généré, taille:", pdfBlob.size, "bytes");

    // ============================================================================
    // ÉTAPE 4 : Upload vers Supabase Storage
    // ============================================================================
    const storagePath = buildStoragePath(checkinReturnId, bookingReferenceNumber);
    console.log("[CheckinReturnPdfService] ☁️ Upload du PDF vers Storage...", {
      bucket: BUCKET_NAME,
      storagePath,
      pdfSize: pdfBlob.size,
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error("[CheckinReturnPdfService] ❌ Erreur upload:", {
        checkinReturnId,
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

    console.log("[CheckinReturnPdfService] ✅ PDF uploadé avec succès", {
      checkinReturnId,
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
    console.log("[CheckinReturnPdfService] 🔗 URL publique:", publicUrl);

    if (!publicUrl || typeof publicUrl !== 'string' || publicUrl.trim() === '') {
      const errorMsg = "URL publique invalide ou vide après génération du PDF";
      console.error("[CheckinReturnPdfService] ❌ URL publique invalide:", {
        checkinReturnId,
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
    // ÉTAPE 6 : Mettre à jour legal_pdf_url dans checkin_return
    // ============================================================================
    console.log("[CheckinReturnPdfService] 💾 Mise à jour legal_pdf_url...", {
      checkinReturnId,
      publicUrl,
    });

    const { data: updatedCheckinReturn, error: updateError } = await SupabaseCheckinReturnService.updateReturnPDFUrl(
      checkinReturnId,
      publicUrl
    );

    if (updateError || !updatedCheckinReturn) {
      const errorMessage = typeof updateError === 'string' 
        ? updateError 
        : (updateError && typeof updateError === 'object' && 'message' in updateError 
          ? (updateError as { message: string }).message 
          : 'Erreur inconnue');
      
      const finalErrorMsg = `PDF généré mais erreur lors de la mise à jour legal_pdf_url : ${errorMessage}`;
      console.error("[CheckinReturnPdfService] ❌ Erreur mise à jour legal_pdf_url:", {
        checkinReturnId,
        publicUrl,
        error: updateError,
        errorMessage,
      });
      
      return {
        pdfStoragePath: storagePath,
        publicUrl: publicUrl,
        error: finalErrorMsg,
      };
    } else {
      console.log("[CheckinReturnPdfService] ✅ legal_pdf_url mis à jour avec succès", {
        checkinReturnId,
        legal_pdf_url: updatedCheckinReturn.legal_pdf_url,
      });
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CheckinReturnPdfService] ✅ PDF généré avec succès !");
    console.log("[CheckinReturnPdfService] 📁 Path:", storagePath);
    console.log("[CheckinReturnPdfService] 🔗 URL:", publicUrl);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return {
      pdfStoragePath: storagePath,
      publicUrl: publicUrl,
      error: null,
    };
  } catch (error: any) {
    console.error("[CheckinReturnPdfService] ❌ Exception non gérée:", error);
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
 * Construit le chemin de stockage du PDF retour
 */
function buildStoragePath(checkinReturnId: string, bookingReferenceNumber: number | null | undefined): string {
  const bookingRef = bookingReferenceNumber ?? 'unknown';
  return `resa_${bookingRef}/documents/etat_des_lieux_retour_${checkinReturnId}.pdf`;
}

/**
 * Génère le Blob PDF à partir du snapshot légal
 */
async function generatePdfBlob(
  snapshot: CheckinReturnLegalSnapshot,
  checkinReturn: CheckinReturn,
  vehicleType: string | null
): Promise<{ blob: Blob | null; error: string | null }> {
  console.log("[CheckinReturnPdfService] 🔧 generatePdfBlob : Début");

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const errorMsg = "DOM non disponible : window ou document est undefined";
    console.error("[CheckinReturnPdfService] ❌ DOM non disponible dans generatePdfBlob");
    return { blob: null, error: errorMsg };
  }

  let tempDiv: HTMLDivElement | null = null;

  try {
    // Import dynamique html2canvas et jsPDF
    console.log("[CheckinReturnPdfService] 🔧 generatePdfBlob : Import dynamique html2canvas...");
    let html2canvas: any;
    try {
      html2canvas = (await import('html2canvas')).default;
      console.log("[CheckinReturnPdfService] 🔧 generatePdfBlob : html2canvas importé:", typeof html2canvas);
    } catch (importError: any) {
      const errorMsg = `Erreur lors du chargement de html2canvas : ${importError?.message || String(importError)}`;
      console.error("[CheckinReturnPdfService] ❌ Erreur import html2canvas:", importError);
      return { blob: null, error: errorMsg };
    }
    
    console.log("[CheckinReturnPdfService] 🔧 generatePdfBlob : Import dynamique jsPDF...");
    let jsPDF: any;
    try {
      jsPDF = (await import('jspdf')).default;
      console.log("[CheckinReturnPdfService] 🔧 generatePdfBlob : jsPDF importé:", typeof jsPDF);
    } catch (importError: any) {
      const errorMsg = `Erreur lors du chargement de jsPDF : ${importError?.message || String(importError)}`;
      console.error("[CheckinReturnPdfService] ❌ Erreur import jsPDF:", importError);
      return { blob: null, error: errorMsg };
    }

    // Créer un élément HTML invisible avec le template PDF
    tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    tempDiv.style.backgroundColor = '#ffffff';
    
    // Générer le HTML du PDF
    tempDiv.innerHTML = createPDFTemplateHTML(snapshot, checkinReturn, vehicleType);
    
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
          console.error("[CheckinReturnPdfService] ❌ Erreur html2canvas page:", html2canvasError);
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
      console.error("[CheckinReturnPdfService] ❌ Erreur jsPDF:", jspdfError);
      return { blob: null, error: errorMsg };
    }
  } catch (error: any) {
    const errorMsg = `Erreur inattendue lors de la génération du PDF : ${error?.message || String(error)}`;
    console.error("[CheckinReturnPdfService] ❌ Erreur génération PDF Blob:", error);
    return { blob: null, error: errorMsg };
  } finally {
    if (tempDiv && typeof document !== 'undefined' && document.body && document.body.contains(tempDiv)) {
      try {
        document.body.removeChild(tempDiv);
        console.log("[CheckinReturnPdfService] 🧹 tempDiv nettoyé du DOM");
      } catch (cleanupError: any) {
        console.warn("[CheckinReturnPdfService] ⚠️ Erreur lors du nettoyage du DOM:", cleanupError);
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
 * Divise un tableau en sous-tableaux de taille maximale size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Crée le template HTML du PDF retour
 */
function createPDFTemplateHTML(
  snapshot: CheckinReturnLegalSnapshot,
  checkinReturn: CheckinReturn,
  vehicleType: string | null
): string {
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
        .comparison-row {
          display: flex;
          gap: 15px;
          margin-bottom: 10px;
        }
        .comparison-col {
          flex: 1;
          border: 1px solid ${COLOR_BORDER};
          border-radius: 4px;
          padding: 10px;
        }
        .comparison-label {
          font-weight: 600;
          color: ${COLOR_TEXT_SECONDARY};
          margin-bottom: 5px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .table th,
        .table td {
          border: 1px solid ${COLOR_BORDER};
          padding: 8px;
          text-align: left;
        }
        .table th {
          background-color: ${COLOR_SECONDARY};
          font-weight: 600;
          color: ${COLOR_TEXT_PRIMARY};
        }
        .table td {
          color: ${COLOR_TEXT_PRIMARY};
        }
        .ras-text {
          color: ${COLOR_TEXT_SECONDARY};
          font-style: italic;
        }
        .legal-mention {
          margin-top: 20px;
          padding: 15px;
          background-color: ${COLOR_SECONDARY};
          border-left: 4px solid ${COLOR_PRIMARY};
          font-size: 11pt;
          color: ${COLOR_TEXT_PRIMARY};
          text-align: center;
        }
      </style>
    </head>
    <body>
      ${generatePage1(snapshot, checkinReturn)}
      ${generatePage2(snapshot, checkinReturn, vehicleType)}
      ${generatePage3(snapshot, checkinReturn)}
      ${generatePage4(snapshot, checkinReturn)}
      ${generatePage5(snapshot, checkinReturn)}
      ${generatePage6(snapshot, checkinReturn)}
    </body>
    </html>
  `;
}

/**
 * Génère la page 1 : Informations générales et relevés
 */
function generatePage1(snapshot: CheckinReturnLegalSnapshot, checkinReturn: CheckinReturn): string {
  const booking = snapshot.booking;
  const vehicle = snapshot.vehicle;
  const owner = snapshot.owner;
  const renter = snapshot.renter;
  const validatedAt = snapshot.return.step7.validatedAt || snapshot.metadata.createdAt;

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de retour</div>
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
        </div>
      </div>

      <div class="section">
        <div class="section-title">Relevés</div>
        <div class="card">
          <div class="comparison-row">
            <div class="comparison-col">
              <div class="comparison-label">Départ</div>
              <div class="field-row">
                <span class="field-label">Kilométrage :</span>
                <span class="field-value">${snapshot.depart.mileage !== null ? `${snapshot.depart.mileage} km` : 'Non renseigné'}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Carburant :</span>
                <span class="field-value">${snapshot.depart.fuelLevel !== null ? `${snapshot.depart.fuelLevel}%` : 'Non renseigné'}</span>
              </div>
            </div>
            <div class="comparison-col">
              <div class="comparison-label">Retour</div>
              <div class="field-row">
                <span class="field-label">Kilométrage :</span>
                <span class="field-value">${snapshot.return.step2.mileage !== null ? `${snapshot.return.step2.mileage} km` : 'Non renseigné'}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Carburant :</span>
                <span class="field-value">${snapshot.return.step2.fuelLevel !== null ? `${snapshot.return.step2.fuelLevel}%` : 'Non renseigné'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${snapshot.return.step2.dashboardPhotos && snapshot.return.step2.dashboardPhotos.length > 0 ? `
      <div class="section">
        <div class="section-title">Photos dashboard retour</div>
        <div class="card">
          <div class="photo-grid">
            ${snapshot.return.step2.dashboardPhotos.map((photo: any) => `
              <div class="photo-item">
                <img src="${photo.publicUrl || ''}" alt="Dashboard retour" onerror="this.style.display='none'"/>
                <div class="photo-caption">Dashboard retour</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      ` : `
      <div class="section">
        <div class="section-title">Photos dashboard retour</div>
        <div class="card">
          <p class="ras-text">Aucune photo fournie</p>
        </div>
      </div>
      `}

      <div class="section">
        <div class="section-title">Propriétaire</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Nom :</span>
            <span class="field-value">${owner.lastName || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Prénom :</span>
            <span class="field-value">${owner.firstName || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Téléphone :</span>
            <span class="field-value">${owner.phone || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Email :</span>
            <span class="field-value">${owner.email || 'Non renseigné'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Locataire</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Nom :</span>
            <span class="field-value">${renter.lastName || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Prénom :</span>
            <span class="field-value">${renter.firstName || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Téléphone :</span>
            <span class="field-value">${renter.phone || 'Non renseigné'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Email :</span>
            <span class="field-value">${renter.email || 'Non renseigné'}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Réservation</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Réservation n° :</span>
            <span class="field-value">${booking.referenceNumber || 'N/A'}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date de départ :</span>
            <span class="field-value">${formatDateTimeForPDF(booking.departureDatetime)}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Date de retour :</span>
            <span class="field-value">${formatDateTimeForPDF(booking.returnDatetime)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère la page 2 : Extérieur RETOUR (TOUTES les zones)
 */
function generatePage2(snapshot: CheckinReturnLegalSnapshot, checkinReturn: CheckinReturn, vehicleType: string | null): string {
  const step3 = snapshot.return?.step3 || { sections: {} as Record<string, any> };
  const sections = step3.sections || {};
  
  // Sélection des zones selon le type de véhicule
  // Pour VOITURE : conserver EXACTEMENT la liste actuelle (et l'ordre actuel) si type != moto
  // Pour MOTO : utiliser un ordre déterministe basé sur les définitions de zones moto existantes
  let zoneKeys: string[];
  if (vehicleType === 'moto') {
    // Ordre déterministe pour la moto (aligné avec RETURN_MOTO_ZONE_KEYS dans checkinReturnSnapshotService)
    // Pour les motos, seulement 2 jantes : avant et arrière (sans distinction gauche/droite)
    const MOTO_ZONE_ORDER = [
      "avant",
      "droit",
      "arriere",
      "gauche",
      "janteAvant",
      "janteArriere",
    ];
    // Ne garder que les zones réellement présentes dans le snapshot pour éviter les sections vides
    zoneKeys = MOTO_ZONE_ORDER.filter((key) => Object.prototype.hasOwnProperty.call(sections, key));
  } else {
    // Comportement par défaut : zones voiture (strictement identique à l'existant)
    zoneKeys = ["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"];
  }

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de retour</div>
        <div class="header-subtitle">État extérieur du véhicule</div>
      </div>

      ${zoneKeys.map(zoneKey => {
        const section = sections[zoneKey] || { label: zoneKey, isSameAsDepart: true, newDamages: [] };
        const hasNewDamage = !section.isSameAsDepart && section.newDamages && section.newDamages.length > 0;
        const firstDamage = hasNewDamage ? section.newDamages[0] : null;

        return `
          <div class="section">
            <div class="section-title">${section.label || zoneKey}</div>
            <div class="card">
              <div class="field-row">
                <span class="field-label">Nouveau dégât constaté ?</span>
                <span class="field-value">${hasNewDamage ? '<strong style="color: #dc2626;">Oui</strong>' : '<strong style="color: #16a34a;">Non</strong>'}</span>
              </div>
              ${!hasNewDamage ? `
                <p class="ras-text" style="margin-top: 10px; padding: 10px; background-color: #f0fdf4; border-left: 3px solid #16a34a;">
                  ✓ Aucun nouveau dégât constaté sur cette zone.
                </p>
              ` : `
                ${firstDamage ? `
                  <div style="margin-top: 15px; padding: 15px; background-color: #fef2f2; border-left: 3px solid #dc2626;">
                    <div class="field-row">
                      <span class="field-label">Description :</span>
                      <span class="field-value">${firstDamage.description || 'Non renseigné'}</span>
                    </div>
                    ${firstDamage.type ? `
                    <div class="field-row">
                      <span class="field-label">Type :</span>
                      <span class="field-value">${firstDamage.type}</span>
                    </div>
                    ` : ''}
                    ${firstDamage.photos && firstDamage.photos.length > 0 ? `
                    <div class="photo-grid" style="margin-top: 15px;">
                      ${firstDamage.photos.map((photo: any) => `
                        <div class="photo-item">
                          <img src="${photo.publicUrl || ''}" alt="Dégât ${section.label || zoneKey}" onerror="this.style.display='none'"/>
                          <div class="photo-caption">${section.label || zoneKey}</div>
                        </div>
                      `).join('')}
                    </div>
                    ` : ''}
                  </div>
                ` : ''}
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Génère la page 3 : Intérieur RETOUR
 */
function generatePage3(snapshot: CheckinReturnLegalSnapshot, checkinReturn: CheckinReturn): string {
  const step4 = snapshot.return.step4;
  const hasNewDamage = !step4.isSameAsDepart && step4.newDamages && step4.newDamages.length > 0;
  const firstDamage = hasNewDamage ? step4.newDamages[0] : null;

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de retour</div>
        <div class="header-subtitle">État intérieur du véhicule</div>
      </div>

      <div class="section">
        <div class="section-title">État intérieur</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Nouveaux dégâts intérieurs constatés ?</span>
            <span class="field-value">${hasNewDamage ? '<strong style="color: #dc2626;">Oui</strong>' : '<strong style="color: #16a34a;">Non</strong>'}</span>
          </div>
          ${!hasNewDamage ? `
            <p class="ras-text" style="margin-top: 10px; padding: 10px; background-color: #f0fdf4; border-left: 3px solid #16a34a;">
              ✓ Aucun nouveau dégât intérieur constaté. État identique au départ.
            </p>
          ` : firstDamage ? `
            <div style="margin-top: 15px; padding: 15px; background-color: #fef2f2; border-left: 3px solid #dc2626;">
              <div class="field-row">
                <span class="field-label">Zone :</span>
                <span class="field-value">${firstDamage.area || 'Non renseigné'}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Description :</span>
                <span class="field-value">${firstDamage.description || 'Non renseigné'}</span>
              </div>
              ${firstDamage.photos && firstDamage.photos.length > 0 ? `
              <div class="photo-grid" style="margin-top: 15px;">
                ${firstDamage.photos.map((photo: any) => `
                  <div class="photo-item">
                    <img src="${photo.publicUrl || ''}" alt="Dégât intérieur" onerror="this.style.display='none'"/>
                    <div class="photo-caption">${firstDamage.area || 'Intérieur'}</div>
                  </div>
                `).join('')}
              </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère la page 4 : Accessoires (tableau complet)
 */
function generatePage4(snapshot: CheckinReturnLegalSnapshot, checkinReturn: CheckinReturn): string {
  const step5 = snapshot.return.step5;
  const accessoiresList = step5.accessoiresList || [];

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de retour</div>
        <div class="header-subtitle">Accessoires</div>
      </div>

      <div class="section">
        <div class="section-title">État des accessoires</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Accessoires identiques au départ ?</span>
            <span class="field-value">${step5.isSameAsDepart ? '<strong style="color: #16a34a;">Oui</strong>' : '<strong style="color: #dc2626;">Non</strong>'}</span>
          </div>
          ${step5.commentaire ? `
          <div class="field-row" style="margin-top: 10px;">
            <span class="field-label">Commentaire :</span>
            <span class="field-value">${step5.commentaire}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Détail des accessoires</div>
        <div class="card">
          <table class="table">
            <thead>
              <tr>
                <th>Accessoire</th>
                <th>Présent au départ</th>
                <th>Présent au retour</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              ${accessoiresList.map(acc => {
                const wasPresent = acc.presentAtDepart;
                const isPresent = acc.presentAtReturn;
                let status = '';
                let statusColor = '';
                
                if (!wasPresent) {
                  status = 'Non concerné';
                  statusColor = '#999';
                } else if (isPresent) {
                  status = 'Présent';
                  statusColor = '#16a34a';
                } else {
                  status = 'Manquant';
                  statusColor = '#dc2626';
                }

                return `
                  <tr>
                    <td>${acc.label}</td>
                    <td>${wasPresent ? 'Oui' : 'Non'}</td>
                    <td>${wasPresent ? (isPresent ? 'Oui' : 'Non') : '—'}</td>
                    <td style="color: ${statusColor}; font-weight: 600;">${status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère la page 5 : Remarques
 */
function generatePage5(snapshot: CheckinReturnLegalSnapshot, checkinReturn: CheckinReturn): string {
  const step6 = snapshot.return.step6;
  const hasRemarks = step6.remarquesGeneral || step6.remarquesOwner || step6.remarquesRenter;

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de retour</div>
        <div class="header-subtitle">Remarques</div>
      </div>

      <div class="section">
        <div class="section-title">Remarques</div>
        <div class="card">
          ${hasRemarks ? `
            ${step6.remarquesGeneral ? `
            <div class="field-row">
              <span class="field-label">Remarques générales :</span>
              <span class="field-value">${step6.remarquesGeneral}</span>
            </div>
            ` : ''}
            ${step6.remarquesOwner ? `
            <div class="field-row">
              <span class="field-label">Remarques propriétaire :</span>
              <span class="field-value">${step6.remarquesOwner}</span>
            </div>
            ` : ''}
            ${step6.remarquesRenter ? `
            <div class="field-row">
              <span class="field-label">Remarques locataire :</span>
              <span class="field-value">${step6.remarquesRenter}</span>
            </div>
            ` : ''}
          ` : `
            <p class="ras-text">Aucune remarque signalée</p>
          `}
        </div>
      </div>
    </div>
  `;
}

/**
 * Génère la page 6 : Validation, signatures et mention légale
 */
function generatePage6(snapshot: CheckinReturnLegalSnapshot, checkinReturn: CheckinReturn): string {
  const step7 = snapshot.return.step7;

  return `
    <div class="page">
      <div class="header">
        <div class="header-title">État des lieux de retour</div>
        <div class="header-subtitle">Validation et signatures</div>
      </div>

      <div class="section">
        <div class="section-title">Validation</div>
        <div class="card">
          <div class="field-row">
            <span class="field-label">Date de validation :</span>
            <span class="field-value">${formatDateTimeForPDF(step7.validatedAt)}</span>
          </div>
          <div class="comparison-row" style="margin-top: 20px;">
            <div class="comparison-col">
              <div class="comparison-label">Signature propriétaire</div>
              <div class="signature-box">
                ${step7.ownerSignature ? `
                  <img src="${step7.ownerSignature}" alt="Signature propriétaire" onerror="this.style.display='none'"/>
                ` : '<span style="color: #999;">Non signé</span>'}
              </div>
            </div>
            <div class="comparison-col">
              <div class="comparison-label">Signature locataire</div>
              <div class="signature-box">
                ${step7.renterSignature ? `
                  <img src="${step7.renterSignature}" alt="Signature locataire" onerror="this.style.display='none'"/>
                ` : '<span style="color: #999;">Non signé</span>'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="legal-mention">
        <strong>Mention légale :</strong><br/>
        Le présent document fait foi et engage les deux parties. Il constitue une preuve de l'état du véhicule au moment du retour.
      </div>
    </div>
  `;
}
