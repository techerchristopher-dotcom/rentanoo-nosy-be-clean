import type { RentalContractPayload } from "./rentalContractPayload";
import { RENTAL_CONTRACT_TEMPLATE_VERSION } from "./constants";
import {
  FALLBACK_EXCHANGE,
  formatDualPrice,
  type EurMgaExchangeConfig,
} from "@/utils/dualCurrency";

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

/** Date JJ/MM/AAAA ; chaîne vide ou invalide → « Non renseigné » */
function formatDateFR(d: string | null | undefined, fallback = "Non renseigné"): string {
  if (!d || !String(d).trim()) return fallback;
  try {
    const iso = String(d).includes("T") ? String(d) : `${d}T12:00:00`;
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
}

function formatRenterAddress(p: RentalContractPayload["renter"]): string {
  const parts = [p.addressLine1, p.postalCode, p.city, p.country].filter(
    (x) => x != null && String(x).trim() !== ""
  ) as string[];
  if (parts.length === 0) return "Non renseigné";
  return parts.join(", ");
}

function wrapPage(body: string): string {
  return `<div class="page" style="box-sizing:border-box;padding:11mm 13mm;font-family:'Times New Roman',Times,serif;font-size:9.5pt;line-height:1.37;color:#111;width:210mm;min-height:297mm;height:297mm;background:#fff;overflow:hidden;">${body}</div>`;
}

/**
 * HTML multi-pages (classe `.page` par feuille A4) pour capture PDF — modèle juridique V7 intégral.
 */
export function buildRentalContractDocumentHtml(
  payload: RentalContractPayload,
  opts: {
    renterSignatureDataUrl: string;
    ownerSignatureDataUrl: string;
    signedAtLabel: string;
    exchange?: EurMgaExchangeConfig;
  }
): string {
  const p = payload;
  const exchange = opts.exchange ?? FALLBACK_EXCHANGE;
  const ref = p.referenceNumber != null ? String(p.referenceNumber) : p.bookingId.slice(0, 8);

  const bookingReference = escapeHtml(ref);
  const contractDate = escapeHtml(opts.signedAtLabel);
  const locationCity = escapeHtml(p.pickupLocation?.trim() || "Nosy Be, Madagascar");
  const renterFullName = escapeHtml(`${p.renter.firstName} ${p.renter.lastName}`.trim() || "—");
  const renterBirthdate = escapeHtml(formatDateFR(p.renter.birthdate));
  const renterAddress = escapeHtml(formatRenterAddress(p.renter));
  const renterLicenseNumber = escapeHtml(p.renter.driverLicenseNumber?.trim() || "Non renseigné");
  const renterLicenseDate = escapeHtml(formatDateFR(p.renter.driverLicenseIssueDate));
  const renterPhone = escapeHtml(p.renter.phone?.trim() || "Non renseigné");
  const renterEmail = escapeHtml(p.renter.email?.trim() || "—");
  const vehicleBrand = escapeHtml(p.vehicle.brand);
  const vehicleModel = escapeHtml(p.vehicle.model);
  const vehicleRegistration = escapeHtml(p.vehicle.licensePlate?.trim() || "Non renseigné");
  const vehicleVin = escapeHtml(p.vehicle.vin?.trim() || "Non renseigné");
  const vehicleMileageStart = escapeHtml(
    p.vehicle.mileage != null && Number.isFinite(p.vehicle.mileage)
      ? `${new Intl.NumberFormat("fr-FR").format(p.vehicle.mileage)} km`
      : "Non renseigné"
  );
  const startDatetimeSafe = escapeHtml(
    `${formatDateFR(p.startDate)} à ${p.startTime || "—"}`
  );
  const endDatetimeSafe = escapeHtml(`${formatDateFR(p.endDate)} à ${p.endTime || "—"}`);

  const totalDual = formatDualPrice(p.totalPrice, exchange, "client");
  const bookingTotalPrice = escapeHtml(`${totalDual.primary} (${totalDual.secondary})`);
  const exchangeFootnote = escapeHtml(totalDual.footnote);
  const currency = escapeHtml(p.currencyCode);
  const depositCap = Math.max(
    Number(p.vehicle.depositAmount ?? 0),
    Number(p.depositAmountSnapshot ?? 0),
    0
  );
  const depositDual = formatDualPrice(depositCap, exchange, "client");
  const vehicleDepositAmount = escapeHtml(`${depositDual.primary} (${depositDual.secondary})`);
  const sinisterDeclarationDelay = String(p.sinisterDeclarationHours);

  const ver = escapeHtml(RENTAL_CONTRACT_TEMPLATE_VERSION);

  const p1 = `
    <h1 style="font-size:15pt;margin:0 0 8px 0;text-align:center;font-weight:bold;">CONTRAT DE LOCATION</h1>
    <p style="margin:0 0 4px 0;font-size:9pt;">Réservation n° <strong>${bookingReference}</strong></p>
    <p style="margin:0 0 4px 0;font-size:9pt;">Date d’émission : <strong>${contractDate}</strong></p>
    <p style="margin:0 0 4px 0;font-size:9pt;">Loueur : <strong>RENTANOO</strong></p>
    <p style="margin:0 0 4px 0;font-size:9pt;">Locataire : <strong>${renterFullName}</strong></p>
    <p style="margin:0 0 14px 0;font-size:9pt;">Lieu de la location : <strong>${locationCity}</strong></p>
    <p style="margin:0 0 6px 0;font-size:8pt;color:#444;">Modèle document PDF : v${ver} — texte juridique V7 intégral.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:12px 0 6px 0;font-size:10pt;">ARTICLE 1 — IDENTIFICATION DES PARTIES</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le présent contrat de location est conclu entre :</p>
    <p style="margin:0 0 6px 0;text-align:justify;">La société RENTANOO,<br/>
    Société par actions simplifiée à associé unique (SASU),<br/>
    immatriculée au Registre du Commerce et des Sociétés de Saint-Pierre de La Réunion sous le numéro 100 000 926,<br/>
    dont le siège social est situé au 38 chemin de la Source, 97416 Saint-Leu, La Réunion, France,<br/>
    représentée par son Président en exercice,<br/>
    Ci-après dénommée « le Loueur »,</p>
    <p style="margin:8px 0 6px 0;text-align:center;font-weight:bold;">ET</p>
    <p style="margin:0 0 6px 0;text-align:justify;">
    <strong>${renterFullName}</strong><br/>
    né(e) le ${renterBirthdate}<br/>
    demeurant ${renterAddress}<br/>
    titulaire du permis de conduire n° ${renterLicenseNumber}<br/>
    délivré le ${renterLicenseDate}<br/>
    joignable au ${renterPhone}<br/>
    et à l’adresse email ${renterEmail},<br/>
    Ci-après dénommé(e) « le Locataire ».</p>
    <p style="margin:10px 0 0 0;text-align:justify;">Dans le cadre de l’exploitation de ses activités à Madagascar, la société RENTANOO s’appuie sur sa filiale locale, également dénommée RENTANOO, société à responsabilité limitée (SARL), immatriculée au Registre du Commerce et des Sociétés de Nosy Be sous le numéro 2026 B 00041, dont le siège social est situé à Nosy Be, Madagascar. Cette entité intervient pour l’exécution opérationnelle des prestations de location, incluant la remise et la restitution des véhicules. Toutefois, la société RENTANOO demeure seule partie contractante et conserve l’entière responsabilité contractuelle.</p>
  `;

  const p2 = `
    <hr style="border:none;border-top:1px solid #333;margin:0 0 10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 2 — OBJET DU CONTRAT</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le présent contrat a pour objet la mise à disposition, à titre onéreux, par le Loueur au profit du Locataire, d’un véhicule terrestre à moteur sans chauffeur.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le présent contrat est associé à la réservation n° <strong>${bookingReference}</strong>.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le véhicule concerné est :<br/>
    <strong>${vehicleBrand} ${vehicleModel}</strong><br/>
    Immatriculation : ${vehicleRegistration}<br/>
    Numéro VIN : ${vehicleVin}<br/>
    Kilométrage au départ : ${vehicleMileageStart}</p>
    <p style="margin:0 0 6px 0;text-align:justify;">La location est consentie pour la période du <strong>${startDatetimeSafe}</strong> au <strong>${endDatetimeSafe}</strong>.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le présent contrat constitue, avec les états des lieux et documents annexes, l’intégralité de l’accord entre les parties.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 3 — DÉSIGNATION DU VÉHICULE ET ÉTAT</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le véhicule objet du présent contrat est décrit ci-dessus.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Un état des lieux de départ est établi lors de la remise du véhicule.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Un état des lieux de restitution est établi lors du retour du véhicule.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Ces états des lieux comprennent notamment :</p>
    <ul style="margin:0 0 8px 18px;padding:0;">
      <li style="margin:0 0 4px 0;text-align:justify;">une description détaillée du véhicule,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">des photographies horodatées,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">les données techniques (kilométrage, carburant ou charge),</li>
      <li style="margin:0 0 4px 0;text-align:justify;">les éventuels dommages préexistants.</li>
    </ul>
    <p style="margin:0 0 6px 0;text-align:justify;">Les états des lieux de départ et de restitution sont établis séparément au moment de la remise puis du retour du véhicule.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Ils sont contractuellement liés au présent contrat et conservés par le Loueur sous format numérique.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Les états des lieux et les éléments numériques associés (photographies, horodatage, données techniques) ont valeur contractuelle et probatoire entre les parties.</p>
  `;

  const p3 = `
    <p style="margin:0 0 6px 0;text-align:justify;">Le Locataire reconnaît expressément la validité de ces éléments comme preuve de l’état du véhicule.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Toute différence constatée entre l’état du véhicule au départ et à la restitution sera réputée imputable au Locataire, sauf preuve contraire.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire reconnaît avoir pris connaissance de l’état du véhicule avant sa prise en charge et l’accepte en l’état.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 4 — DURÉE DE LA LOCATION</p>
    <p style="margin:0 0 6px 0;text-align:justify;">La location est consentie pour la période définie à l’article 2.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le Locataire s’engage à restituer le véhicule à la date et à l’heure prévues.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Tout retard pourra entraîner la facturation d’une période supplémentaire ainsi que des pénalités.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire demeure responsable du véhicule jusqu’à sa restitution effective.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 5 — CONDITIONS FINANCIÈRES ET GARANTIE</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le prix total de la location est fixé à :<br/><strong>${bookingTotalPrice}</strong></p>
    <p style="margin:0 0 6px 0;font-size:8pt;color:#555;text-align:justify;">${exchangeFootnote}</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le paiement est effectué par carte bancaire via un prestataire de paiement sécurisé.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Afin de garantir l’exécution du contrat, une empreinte bancaire peut être réalisée pour un montant symbolique (0 € ou 1 €), permettant de vérifier le moyen de paiement.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le Locataire autorise expressément le Loueur à procéder à un ou plusieurs prélèvements en cas de dommage, de manquement contractuel ou de frais supplémentaires.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le montant maximum pouvant être prélevé est fixé à :<br/><strong>${vehicleDepositAmount}</strong></p>
    <p style="margin:0 0 6px 0;text-align:justify;">Ce montant constitue le plafond de responsabilité financière du Locataire.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Aucun montant ne sera prélevé en l’absence de dommage ou de manquement.</p>
  `;

  const p4 = `
    <p style="margin:0 0 6px 0;text-align:justify;">Tout prélèvement devra être justifié par des éléments objectifs tels que : états des lieux, photographies, devis ou factures.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire reconnaît que cette autorisation vaut accord pour tout prélèvement ultérieur justifié dans le cadre du présent contrat.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 6 — ASSURANCE ET SINISTRES</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le véhicule est couvert par une assurance conforme à la réglementation en vigueur.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le Locataire est responsable des dommages causés pendant la durée de la location.</p>
    <p style="margin:0 0 4px 0;text-align:justify;">En cas de sinistre, le Locataire s’engage à :</p>
    <ul style="margin:0 0 8px 18px;padding:0;">
      <li style="margin:0 0 4px 0;text-align:justify;">informer immédiatement le Loueur,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">fournir tous les éléments nécessaires (photos, description, documents),</li>
      <li style="margin:0 0 4px 0;text-align:justify;">coopérer pleinement à la gestion du sinistre,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">remplir un constat amiable en cas d’accident impliquant un tiers.</li>
    </ul>
    <p style="margin:0 0 6px 0;text-align:justify;">Le Locataire doit déclarer tout sinistre dans un délai maximum de <strong>${sinisterDeclarationDelay}</strong> heures.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire reste redevable des sommes dues au Loueur, indépendamment de l’intervention d’une assurance.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 7 — UTILISATION DU VÉHICULE</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le véhicule est destiné à un usage personnel.</p>
    <p style="margin:0 0 4px 0;text-align:justify;">Le Locataire s’engage à :</p>
    <ul style="margin:0 0 8px 18px;padding:0;">
      <li style="margin:0 0 4px 0;text-align:justify;">respecter la réglementation en vigueur,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">utiliser le véhicule de manière prudente,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">ne pas prêter le véhicule sans autorisation,</li>
      <li style="margin:0 0 4px 0;text-align:justify;">ne pas utiliser le véhicule dans des conditions interdites.</li>
    </ul>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire est seul responsable des infractions et amendes.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 8 — RESTITUTION ET DOMMAGES</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le véhicule doit être restitué dans un état conforme à celui constaté lors de l’état des lieux de départ.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Tout dommage ou différence constatée pourra entraîner : la facturation des réparations ; une retenue sur la garantie ; une indemnisation complémentaire.</p>
  `;

  const p5 = `
    <p style="margin:0 0 6px 0;text-align:justify;">Le Loueur pourra s’appuyer sur des devis, factures ou expertises.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Les états des lieux font foi entre les parties.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire autorise expressément le Loueur à prélever les sommes dues conformément à l’article 5.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 9 — RÉSILIATION ET ANNULATION</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Toute annulation est soumise aux conditions applicables lors de la réservation.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">En cas de non-respect du contrat, le Loueur pourra résilier immédiatement la location.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le Locataire devra restituer le véhicule sans délai.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Aucun remboursement ne sera effectué en cas de résiliation imputable au Locataire.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 10 — DROIT APPLICABLE ET LITIGES</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le présent contrat est soumis au droit applicable du lieu de location.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Les parties s’engagent à rechercher une solution amiable en cas de litige.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">À défaut d’accord, les juridictions compétentes seront saisies.</p>
    <hr style="border:none;border-top:1px solid #333;margin:10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 11 — DONNÉES PERSONNELLES</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Les données du Locataire sont collectées pour : la gestion de la location ; le paiement ; la gestion des sinistres.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Elles peuvent être transmises aux prestataires nécessaires à l’exécution du service.</p>
    <p style="margin:0 0 12px 0;text-align:justify;">Le Locataire dispose de droits d’accès, de rectification et de suppression.</p>
  `;

  const p6 = `
    <hr style="border:none;border-top:1px solid #333;margin:0 0 10px 0;" />
    <p style="font-weight:bold;margin:0 0 6px 0;font-size:10pt;">ARTICLE 12 — ACCEPTATION</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Le contrat est conclu de manière dématérialisée.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">La validation de la réservation vaut acceptation pleine et entière du présent contrat.</p>
    <p style="margin:0 0 6px 0;text-align:justify;">Une copie du contrat est mise à disposition du Locataire.</p>
    <p style="margin:12px 0 8px 0;text-align:justify;"><strong>Fait le ${contractDate}</strong></p>
    <p style="margin:0 0 10px 0;font-size:9pt;font-weight:bold;">Signatures — acceptation électronique sur la plateforme Rentanoo</p>
    <table style="width:100%;font-size:9pt;border-collapse:collapse;margin-top:6px;">
      <tr>
        <td style="width:48%;vertical-align:top;padding-right:8px;border:1px solid #ccc;padding:8px;">
          <div style="font-weight:bold;margin-bottom:4px;">Locataire</div>
          <div style="font-size:8pt;color:#444;margin-bottom:6px;">${renterFullName}</div>
          <img src="${opts.renterSignatureDataUrl}" alt="Signature locataire" style="max-height:64px;margin-top:4px;border:1px solid #D8E6E8;" />
        </td>
        <td style="width:48%;vertical-align:top;padding-left:8px;border:1px solid #ccc;padding:8px;">
          <div style="font-weight:bold;margin-bottom:4px;">Propriétaire du véhicule (co-signataire)</div>
          <div style="font-size:8pt;color:#444;margin-bottom:6px;">${escapeHtml(`${p.owner.firstName} ${p.owner.lastName}`.trim())}</div>
          <img src="${opts.ownerSignatureDataUrl}" alt="Signature propriétaire du véhicule" style="max-height:64px;margin-top:4px;border:1px solid #D8E6E8;" />
        </td>
      </tr>
    </table>
    <p style="margin-top:12px;font-size:8pt;color:#555;text-align:justify;">Les signatures électroniques ci-dessus ont la même valeur que des signatures manuscrites entre les parties, dans les conditions prévues par la plateforme.</p>
  `;

  const pages = [p1, p2, p3, p4, p5, p6].map(wrapPage);
  return pages.join("\n");
}
