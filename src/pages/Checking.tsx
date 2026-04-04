import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Footer } from "@/components/layout/footer";
import EtatDesLieuxDepartForm from "@/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm";
import { EtatDesLieuxDepartFormMoto } from "@/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getVehicleTypeForChecking } from "@/utils/vehicleType";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RentalContractPanel } from "@/modules/rentalContract/RentalContractPanel";

export default function Checking() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [referenceNumber, setReferenceNumber] = useState<number | null>(null);
  const [rentalContractSignedAt, setRentalContractSignedAt] = useState<string | null>(null);

  // Phase 1 states
  const [vehicleType, setVehicleType] = useState<'car' | 'moto' | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [bookingNotFound, setBookingNotFound] = useState(false);

  // Charger le reference_number, vehicle_id et statut contrat depuis Supabase
  useEffect(() => {
    async function loadBookingReference() {
      if (!bookingId) {
        setBookingNotFound(true);
        setVehicleType("car");
        setLoadingPage(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("reference_number, vehicle_id, rental_contract_signed_at")
          .eq("id", bookingId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            console.error("[Checking] Réservation introuvable:", bookingId);
            setBookingNotFound(true);
            setVehicleType("car");
            return;
          }

          console.error("[Checking] Erreur récupération booking:", error);
          setVehicleType("car");
          return;
        }

        if (data) {
          setReferenceNumber(data.reference_number || null);
          setRentalContractSignedAt(data.rental_contract_signed_at ?? null);

          const rawVehicleId = data.vehicle_id;
          
          if (!rawVehicleId) {
            console.warn("[Checking] vehicle_id NULL, fallback car");
            setVehicleType("car");
            return;
          }
          
          const vehicleId = rawVehicleId;

          const { data: vehicle, error: vehicleError } = await supabase
            .from("vehicles")
            .select("vehicle_type")
            .eq("id", vehicleId)
            .single();

          if (vehicleError) {
            if (vehicleError.code === "PGRST116") {
              console.error("[Checking] Vehicle introuvable:", vehicleError);
            } else if (vehicleError.code === "PGRST301") {
              console.error("[Checking] Erreur permission vehicle:", vehicleError);
            } else {
              console.error("[Checking] Erreur récupération vehicle:", vehicleError);
            }

            setVehicleType("car");
            return;
          }

          const rawVehicleType = vehicle?.vehicle_type;
          const normalizedType = getVehicleTypeForChecking(rawVehicleType);
          setVehicleType(normalizedType);
        }
      } catch (error) {
        console.error("[Checking] Erreur:", error);
        setVehicleType("car");
      } finally {
        setLoadingPage(false);
      }
    }

    loadBookingReference();
  }, [bookingId]);

  if (!bookingId) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-destructive">Erreur</h1>
            <p className="text-muted-foreground mt-2">
              Aucun identifiant de réservation fourni.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Composants UI locaux Phase 1
  function CheckingVehicleTypeLoader() {
    return (
      <div className="mx-auto flex min-h-[360px] w-full max-w-3xl items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Chargement du type de véhicule...
          </p>
        </div>
      </div>
    );
  }


  const contractPending =
    !bookingNotFound && !loadingPage && !rentalContractSignedAt;

  const handleRentalContractComplete = async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from("bookings")
      .select("rental_contract_signed_at")
      .eq("id", bookingId)
      .single();
    setRentalContractSignedAt(data?.rental_contract_signed_at ?? null);
  };

  function BookingNotFoundUI() {
    const navigate = useNavigate();

    return (
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardContent className="py-10 text-center">
            <h2 className="mb-2 text-xl font-semibold">Réservation introuvable</h2>
            <p className="mx-auto mb-6 max-w-prose text-sm text-muted-foreground">
              La réservation demandée n'existe pas ou n'est plus disponible.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/me/renter/bookings")}>
                Retour à mes réservations
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">
            {contractPending ? "Contrat de location – Réservation " : "État des lieux de départ – Réservation "}
            {loadingPage ? (
              <span className="text-muted-foreground">...</span>
            ) : referenceNumber !== null ? (
              `n° ${referenceNumber}`
            ) : (
              <span className="text-sm text-muted-foreground">({bookingId})</span>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            {contractPending
              ? "Signez le contrat (locataire et propriétaire du véhicule), puis le formulaire d'état des lieux de départ s'affichera."
              : "Veuillez remplir le formulaire ci-dessous pour effectuer l'état des lieux de départ."}
          </p>
        </div>
        <ErrorBoundary>
          {bookingNotFound ? (
            <BookingNotFoundUI />
          ) : loadingPage ? (
            <CheckingVehicleTypeLoader />
          ) : contractPending ? (
            <RentalContractPanel
              bookingId={bookingId}
              referenceNumber={referenceNumber}
              onContractComplete={handleRentalContractComplete}
            />
          ) : vehicleType === "moto" ? (
            <EtatDesLieuxDepartFormMoto
              bookingId={bookingId}
              bookingReferenceNumber={referenceNumber}
            />
          ) : (
            <EtatDesLieuxDepartForm 
              bookingId={bookingId} 
              bookingReferenceNumber={referenceNumber}
            />
          )}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

