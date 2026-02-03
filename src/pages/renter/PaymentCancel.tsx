import { Footer } from "@/components/layout/footer";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-4">Le paiement a été annulé</h1>
        <p className="text-muted-foreground">Ta réservation n’est pas encore confirmée.</p>
      </main>
      <Footer />
    </div>
  );
}


