/**
 * Génération PDF contrat de location + upload Storage (bucket checkin-photos, même convention que l’EDL).
 *
 * Rendu : une seule page PDF — le bloc `.page` entier est capturé puis mis à l’échelle sur l’A4 (pas de
 * rognage). Un texte juridique très long peut devenir illisible ; dans ce cas, reprendre le découpage
 * multi-pages comme `checkinDepartPdfService`.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildRentalContractDocumentHtml } from "@/modules/rentalContract/contractTemplateHtml";
import type { RentalContractPayload } from "@/modules/rentalContract/rentalContractPayload";
import { RENTAL_CONTRACT_TEMPLATE_VERSION } from "@/modules/rentalContract/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const BUCKET_NAME = "checkin-photos";
const PDF_MARGIN = 15;
const PDF_HTML2CANVAS_SCALE = 2;
const PDF_JPEG_QUALITY = 0.92;

export interface GenerateRentalContractPdfResult {
  pdfStoragePath: string | null;
  publicUrl: string | null;
  error: string | null;
}

function buildContractPdfStoragePath(bookingId: string, referenceNumber: number | null): string {
  const ref = referenceNumber ?? "unknown";
  return `resa_${ref}/documents/contrat_location_${bookingId}.pdf`;
}

function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(() => resolve(), 5000);
    });
  });
  return Promise.all(promises).then(() => {});
}

async function generatePdfBlobFromHtml(fullHtml: string): Promise<{ blob: Blob | null; error: string | null }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { blob: null, error: "DOM non disponible" };
  }

  let tempDiv: HTMLDivElement | null = null;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;

    tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "210mm";
    tempDiv.style.backgroundColor = "#ffffff";
    tempDiv.innerHTML = fullHtml;
    document.body.appendChild(tempDiv);

    await waitForImages(tempDiv);

    const pageEl = tempDiv.querySelector(".page") as HTMLElement | null;
    if (!pageEl) {
      return { blob: null, error: "Template PDF sans .page" };
    }

    const canvas = await html2canvas(pageEl, {
      scale: PDF_HTML2CANVAS_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: pageEl.scrollWidth,
      height: pageEl.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const availableWidth = pdfWidth - PDF_MARGIN * 2;
    const availableHeight = pdfHeight - PDF_MARGIN * 2;

    const imgWidthMM = (canvas.width * 25.4) / 96;
    const imgHeightMM = (canvas.height * 25.4) / 96;
    const ratio = imgHeightMM / imgWidthMM;
    let renderWidth = availableWidth;
    let renderHeight = renderWidth * ratio;
    if (renderHeight > availableHeight) {
      renderHeight = availableHeight;
      renderWidth = renderHeight / ratio;
    }
    const offsetX = PDF_MARGIN + (availableWidth - renderWidth) / 2;
    const offsetY = PDF_MARGIN + (availableHeight - renderHeight) / 2;
    pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST");

    return { blob: pdf.output("blob"), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { blob: null, error: msg };
  } finally {
    if (tempDiv?.parentNode) {
      tempDiv.parentNode.removeChild(tempDiv);
    }
  }
}

/**
 * Génère le PDF, l’upload dans Storage et met à jour `bookings` (URL + date + version template).
 */
export async function generateAndStoreRentalContractPdf(params: {
  payload: RentalContractPayload;
  renterSignatureDataUrl: string;
  ownerSignatureDataUrl: string;
}): Promise<GenerateRentalContractPdfResult> {
  const { payload, renterSignatureDataUrl, ownerSignatureDataUrl } = params;
  const signedAt = new Date();
  const signedAtLabel = format(signedAt, "dd/MM/yyyy 'à' HH:mm", { locale: fr });

  const html = buildRentalContractDocumentHtml(payload, {
    renterSignatureDataUrl,
    ownerSignatureDataUrl,
    signedAtLabel,
  });

  const { blob, error: blobError } = await generatePdfBlobFromHtml(html);
  if (blobError || !blob) {
    return { pdfStoragePath: null, publicUrl: null, error: blobError || "PDF vide" };
  }

  const storagePath = buildContractPdfStoragePath(payload.bookingId, payload.referenceNumber);

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, blob, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) {
    return {
      pdfStoragePath: null,
      publicUrl: null,
      error: uploadError.message || "Erreur upload Storage",
    };
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;
  if (!publicUrl?.trim()) {
    return { pdfStoragePath: storagePath, publicUrl: null, error: "URL publique invalide" };
  }

  const signedIso = signedAt.toISOString();
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      rental_contract_pdf_url: publicUrl,
      rental_contract_signed_at: signedIso,
      rental_contract_template_version: RENTAL_CONTRACT_TEMPLATE_VERSION,
    })
    .eq("id", payload.bookingId);

  if (updateError) {
    return {
      pdfStoragePath: storagePath,
      publicUrl,
      error: updateError.message || "Erreur mise à jour réservation",
    };
  }

  return { pdfStoragePath: storagePath, publicUrl, error: null };
}
