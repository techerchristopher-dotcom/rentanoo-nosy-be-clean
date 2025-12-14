import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import EtatDesLieuxDepartForm from "@/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Checking() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [referenceNumber, setReferenceNumber] = useState<number | null>(null);
  const [loadingReference, setLoadingReference] = useState(true);

  // Charger le reference_number depuis Supabase
  useEffect(() => {
    async function loadBookingReference() {
      if (!bookingId) {
        setLoadingReference(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("reference_number")
          .eq("id", bookingId)
          .single();

        if (error) {
          console.error("[Checking] Erreur chargement reference_number:", error);
        } else if (data) {
          setReferenceNumber((data as any).reference_number || null);
        }
      } catch (error) {
        console.error("[Checking] Erreur:", error);
      } finally {
        setLoadingReference(false);
      }
    }

    loadBookingReference();
  }, [bookingId]);

  if (!bookingId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">
            État des lieux de départ – Réservation{" "}
            {loadingReference ? (
              <span className="text-muted-foreground">...</span>
            ) : referenceNumber !== null ? (
              `n° ${referenceNumber}`
            ) : (
              <span className="text-sm text-muted-foreground">({bookingId})</span>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Veuillez remplir le formulaire ci-dessous pour effectuer l'état des lieux de départ.
          </p>
        </div>
        <ErrorBoundary>
          <EtatDesLieuxDepartForm 
            bookingId={bookingId} 
            bookingReferenceNumber={referenceNumber}  // ⭐ NOUVEAU : propagation du n° de réservation
          />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

