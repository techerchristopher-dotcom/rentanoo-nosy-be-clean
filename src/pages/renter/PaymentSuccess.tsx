import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/me/renter/bookings?afterPayment=1");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card rounded-xl shadow-card p-6 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
          <span>✅</span>
          <span>Paiement confirmé</span>
        </h1>
        <p className="text-foreground">
          Merci ! Ton paiement a bien été reçu.
        </p>
        <p className="text-muted-foreground text-sm">
          Tu peux maintenant finaliser ta réservation en bloquant ta caution.
        </p>
        <p className="text-muted-foreground text-xs">
          Redirection en cours...
        </p>
      </div>
    </main>
  );
}


