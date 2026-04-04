import type { RentalContractPayload } from "./rentalContractPayload";
import { RENTAL_CONTRACT_TEMPLATE_VERSION } from "./constants";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoneyEUR(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function formatDateFR(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/**
 * HTML d’une page A4 pour capture PDF (classe `.page` requise par le générateur).
 * Texte générique — à remplacer par votre modèle juridique validé.
 */
export function buildRentalContractDocumentHtml(
  payload: RentalContractPayload,
  opts: {
    renterSignatureDataUrl: string;
    ownerSignatureDataUrl: string;
    signedAtLabel: string;
  }
): string {
  const p = payload;
  const ref = p.referenceNumber != null ? String(p.referenceNumber) : p.bookingId.slice(0, 8);
  const pickup = p.pickupLocation?.trim() || "Selon accord entre les parties";
  const timeDep = p.startTime || "—";
  const timeRet = p.endTime || "—";

  const body = `
    <h1 style="font-size:18px;margin:0 0 12px 0;color:#065F6B;">Contrat de location de véhicule</h1>
    <p style="font-size:10px;color:#697479;margin:0 0 16px 0;">Réf. réservation n° <strong>${escapeHtml(ref)}</strong> — Modèle v${escapeHtml(
      RENTAL_CONTRACT_TEMPLATE_VERSION
    )}</p>

    <h2 style="font-size:12px;margin:16px 0 6px 0;">1. Parties</h2>
    <p style="font-size:10px;margin:0 0 8px 0;line-height:1.45;">
      <strong>Locataire :</strong> ${escapeHtml(p.renter.firstName)} ${escapeHtml(p.renter.lastName)}<br/>
      Email : ${escapeHtml(p.renter.email)} — Tél. : ${escapeHtml(p.renter.phone || "—")}
    </p>
    <p style="font-size:10px;margin:0 0 8px 0;line-height:1.45;">
      <strong>Propriétaire du véhicule (loueur) :</strong> ${escapeHtml(p.owner.firstName)} ${escapeHtml(p.owner.lastName)}<br/>
      Email : ${escapeHtml(p.owner.email)} — Tél. : ${escapeHtml(p.owner.phone || "—")}
    </p>

    <h2 style="font-size:12px;margin:16px 0 6px 0;">2. Véhicule</h2>
    <p style="font-size:10px;margin:0;line-height:1.45;">
      ${escapeHtml(p.vehicle.brand)} ${escapeHtml(p.vehicle.model)} (${p.vehicle.year})<br/>
      Immatriculation : ${escapeHtml(p.vehicle.licensePlate || "—")}<br/>
      Couleur : ${escapeHtml(p.vehicle.color || "—")} — Carburant : ${escapeHtml(p.vehicle.fuelType || "—")}
    </p>

    <h2 style="font-size:12px;margin:16px 0 6px 0;">3. Durée et lieu</h2>
    <p style="font-size:10px;margin:0;line-height:1.45;">
      Du <strong>${escapeHtml(formatDateFR(p.startDate))}</strong> (${escapeHtml(timeDep)})
      au <strong>${escapeHtml(formatDateFR(p.endDate))}</strong> (${escapeHtml(timeRet)})<br/>
      Lieu de prise en charge : ${escapeHtml(pickup)}
    </p>

    <h2 style="font-size:12px;margin:16px 0 6px 0;">4. Prix</h2>
    <p style="font-size:10px;margin:0;line-height:1.45;">
      Prix journalier : ${formatMoneyEUR(p.pricePerDay)} — Jours : ${p.rentalDays ?? "—"}<br/>
      Sous-total : ${formatMoneyEUR(p.subtotal)} — Options : ${formatMoneyEUR(p.optionsTotal)}<br/>
      Frais de service : ${formatMoneyEUR(p.serviceFee)}<br/>
      <strong>Total TTC à payer (réservation) : ${formatMoneyEUR(p.totalPrice)}</strong>
    </p>

    <h2 style="font-size:12px;margin:16px 0 6px 0;">5. Dispositions générales</h2>
    <p style="font-size:9px;margin:0;line-height:1.4;color:#333;">
      Le locataire déclare avoir pris connaissance des conditions de location et de l’état du véhicule
      tel qu’il sera constaté à l’état des lieux de départ signé après le présent contrat.
      Les parties reconnaissent la valeur probante de la signature électronique réalisée sur la plateforme Rentanoo.
      (Texte à compléter / adapter selon votre conseil juridique.)
    </p>

    <p style="font-size:10px;margin:20px 0 8px 0;"><strong>Signatures</strong> — Fait électroniquement le ${escapeHtml(
      opts.signedAtLabel
    )}</p>
    <table style="width:100%;font-size:10px;border-collapse:collapse;">
      <tr>
        <td style="width:48%;vertical-align:top;padding-right:8px;">
          <div>Locataire</div>
          <img src="${opts.renterSignatureDataUrl}" alt="Signature locataire" style="max-height:72px;margin-top:6px;border:1px solid #D8E6E8;" />
        </td>
        <td style="width:48%;vertical-align:top;padding-left:8px;">
          <div>Propriétaire du véhicule</div>
          <img src="${opts.ownerSignatureDataUrl}" alt="Signature propriétaire du véhicule" style="max-height:72px;margin-top:6px;border:1px solid #D8E6E8;" />
        </td>
      </tr>
    </table>
  `;

  return `
<div class="page" style="box-sizing:border-box;padding:14mm 12mm;font-family:system-ui,-apple-system,sans-serif;color:#1A2024;width:210mm;min-height:297mm;background:#fff;">
  ${body}
</div>
`;
}
