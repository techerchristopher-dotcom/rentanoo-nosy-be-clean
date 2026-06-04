import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignatureCanvas } from "@/components/checkin/SignatureCanvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRentalContractPayload, type RentalContractPayload } from "./rentalContractPayload";
import { generateAndStoreRentalContractPdf } from "@/services/rentalContractPdfService";
import { RENTAL_CONTRACT_TEMPLATE_VERSION } from "./constants";
import { supabase } from "@/integrations/supabase/client";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

interface RentalContractPanelProps {
  bookingId: string;
  referenceNumber: number | null;
  onContractComplete: () => void;
}

export function RentalContractPanel({
  bookingId,
  referenceNumber,
  onContractComplete,
}: RentalContractPanelProps) {
  const [payload, setPayload] = useState<RentalContractPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingPayload, setLoadingPayload] = useState(true);
  const [renterSig, setRenterSig] = useState("");
  const [ownerSig, setOwnerSig] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // KYC fields — pre-filled from profile, editable before signing
  const [kycBirthdate, setKycBirthdate] = useState("");
  const [kycAddressLine1, setKycAddressLine1] = useState("");
  const [kycPostalCode, setKycPostalCode] = useState("");
  const [kycCity, setKycCity] = useState("");
  const [kycCountry, setKycCountry] = useState("");
  const [kycLicenseNumber, setKycLicenseNumber] = useState("");
  const [kycLicenseIssueDate, setKycLicenseIssueDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingPayload(true);
    setLoadError(null);
    getRentalContractPayload(bookingId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error || "Données indisponibles");
        setPayload(null);
      } else {
        setPayload(data);
        // Pre-fill KYC fields from profile
        setKycBirthdate(data.renter.birthdate ?? "");
        setKycAddressLine1(data.renter.addressLine1 ?? "");
        setKycPostalCode(data.renter.postalCode ?? "");
        setKycCity(data.renter.city ?? "");
        setKycCountry(data.renter.country ?? "");
        setKycLicenseNumber(data.renter.driverLicenseNumber ?? "");
        setKycLicenseIssueDate(data.renter.driverLicenseIssueDate ?? "");
      }
      setLoadingPayload(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const handleSignAndStore = async () => {
    if (!payload) return;
    if (!renterSig.trim()) {
      toast.error("La signature du locataire est requise.");
      return;
    }
    if (!ownerSig.trim()) {
      toast.error("La signature du propriétaire du véhicule est requise.");
      return;
    }
    setSubmitting(true);
    try {
      // Merge KYC overrides into payload
      const enrichedPayload: RentalContractPayload = {
        ...payload,
        renter: {
          ...payload.renter,
          birthdate: kycBirthdate.trim() || null,
          addressLine1: kycAddressLine1.trim() || null,
          postalCode: kycPostalCode.trim() || null,
          city: kycCity.trim() || null,
          country: kycCountry.trim() || null,
          driverLicenseNumber: kycLicenseNumber.trim() || null,
          driverLicenseIssueDate: kycLicenseIssueDate.trim() || null,
        },
      };

      const result = await generateAndStoreRentalContractPdf({
        payload: enrichedPayload,
        renterSignatureDataUrl: renterSig,
        ownerSignatureDataUrl: ownerSig,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Persist KYC back to profiles so future contracts are pre-filled
      await supabase.from("profiles").update({
        birthdate: kycBirthdate.trim() || null,
        address_line1: kycAddressLine1.trim() || null,
        postal_code: kycPostalCode.trim() || null,
        city: kycCity.trim() || null,
        country: kycCountry.trim() || null,
        driver_license_number: kycLicenseNumber.trim() || null,
        driver_license_issue_date: kycLicenseIssueDate.trim() || null,
      }).eq("id", payload.renter.id);

      toast.success("Contrat signé et enregistré.");
      onContractComplete();
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPayload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement du contrat…</span>
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contrat de location</CardTitle>
          <CardDescription className="text-destructive">{loadError || "Erreur"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const refLabel = referenceNumber != null ? `n° ${referenceNumber}` : bookingId.slice(0, 8);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Contrat de location</CardTitle>
        <CardDescription>
          Réservation {refLabel} — modèle {RENTAL_CONTRACT_TEMPLATE_VERSION}. Locataire et propriétaire du
          véhicule signent ici (même tablette au départ), puis l’état des lieux de départ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ScrollArea className="h-[min(420px,50vh)] rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
          <ContractReadOnlySummary payload={payload} />
        </ScrollArea>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations du locataire</CardTitle>
            <CardDescription className="text-xs">
              Ces données apparaissent sur le contrat. Complétez ou corrigez si nécessaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="kyc-license-number">N° permis de conduire</Label>
              <Input
                id="kyc-license-number"
                placeholder="12345678901234567"
                value={kycLicenseNumber}
                onChange={(e) => setKycLicenseNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kyc-license-issue">Date de délivrance du permis</Label>
              <Input
                id="kyc-license-issue"
                type="date"
                value={kycLicenseIssueDate}
                onChange={(e) => setKycLicenseIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kyc-birthdate">Date de naissance</Label>
              <Input
                id="kyc-birthdate"
                type="date"
                value={kycBirthdate}
                onChange={(e) => setKycBirthdate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kyc-address">Adresse</Label>
              <Input
                id="kyc-address"
                placeholder="12 rue de la Paix"
                value={kycAddressLine1}
                onChange={(e) => setKycAddressLine1(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kyc-postal">Code postal</Label>
              <Input
                id="kyc-postal"
                placeholder="75001"
                value={kycPostalCode}
                onChange={(e) => setKycPostalCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kyc-city">Ville</Label>
              <Input
                id="kyc-city"
                placeholder="Paris"
                value={kycCity}
                onChange={(e) => setKycCity(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="kyc-country">Pays</Label>
              <Input
                id="kyc-country"
                placeholder="France"
                value={kycCountry}
                onChange={(e) => setKycCountry(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <SignatureCanvas
              id="rental-contract-renter-sig"
              label="Signature du locataire"
              value={renterSig}
              onChange={setRenterSig}
            />
          </div>
          <div className="space-y-2">
            <SignatureCanvas
              id="rental-contract-owner-sig"
              label="Signature du propriétaire du véhicule"
              value={ownerSig}
              onChange={setOwnerSig}
            />
          </div>
        </div>

        <Button
          type="button"
          className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
          disabled={submitting}
          onClick={handleSignAndStore}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération du PDF…
            </>
          ) : (
            "Signer et enregistrer le contrat"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Aperçu lecture (cohérent avec le PDF, sans HTML juridique complet dans le scroll). */
function ContractReadOnlySummary({ payload: p }: { payload: RentalContractPayload }) {
  const { formatClientInline, footnote } = useExchangeRate();
  const d = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="space-y-3 text-foreground">
      <p className="font-semibold text-primary">Parties</p>
      <p>
        <strong>Locataire :</strong> {p.renter.firstName} {p.renter.lastName} — {p.renter.email} —{" "}
        {p.renter.phone || "—"}
      </p>
      <p>
        <strong>Propriétaire du véhicule :</strong> {p.owner.firstName} {p.owner.lastName} — {p.owner.email}{" "}
        — {p.owner.phone || "—"}
      </p>
      <p className="font-semibold text-primary pt-2">Véhicule</p>
      <p>
        {p.vehicle.brand} {p.vehicle.model} ({p.vehicle.year}) — {p.vehicle.licensePlate || "—"}
      </p>
      <p className="font-semibold text-primary pt-2">Durée</p>
      <p>
        Du {d(p.startDate)} {p.startTime ? `(${p.startTime})` : ""} au {d(p.endDate)}{" "}
        {p.endTime ? `(${p.endTime})` : ""}
      </p>
      <p>Lieu : {p.pickupLocation?.trim() || "Selon accord"}</p>
      <p className="font-semibold text-primary pt-2">Montants</p>
      <p>
        Total : <strong>{formatClientInline(p.totalPrice)}</strong>
      </p>
      <p className="text-sm text-muted-foreground">
        Sous-total {formatClientInline(p.subtotal)} · options {formatClientInline(p.optionsTotal)} · frais{" "}
        {formatClientInline(p.serviceFee)}
      </p>
      <p className="text-xs text-muted-foreground">{footnote}</p>
      <p className="text-xs text-muted-foreground pt-2">
        Le PDF final reprend ces éléments et les dispositions générales du modèle. Signez ci-dessous pour
        confirmer.
      </p>
    </div>
  );
}
