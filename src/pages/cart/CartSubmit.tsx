import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SupabaseBookingsService } from "@/services/supabase/bookings";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { DualPrice } from "@/components/currency/DualPrice";

interface ItemResult {
  id: string;
  label: string;
  status: "success" | "failed";
  error?: string;
}

export default function CartSubmit() {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"edit" | "review">("edit");

  const total = items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);

  useEffect(() => {
    if (!user) {
      navigate(`/auth/login?redirect=${encodeURIComponent("/panier/soumettre")}`);
    }
  }, [user, navigate]);

  if (!user) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Votre panier est vide.</p>
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);

    const cartGroupId = crypto.randomUUID();
    const results: ItemResult[] = [];

    for (const item of items) {
      const { data, error } = await SupabaseBookingsService.createBooking({
        vehicleId: item.vehicleId,
        renterId: user.id,
        startDate: item.startDate,
        endDate: item.endDate,
        startTime: item.startTime,
        endTime: item.endTime,
        pickupLocation: item.pickupLocation,
        totalPrice: item.estimatedPrice || 0,
        basePrice: item.estimatedPrice || 0,
        cartGroupId,
      });

      results.push({
        id: item.id,
        label: item.vehicleLabel,
        status: data ? "success" : "failed",
        error: error || undefined,
      });
    }

    try {
      await supabase.from("cart_submissions").insert({
        cart_group_id: cartGroupId,
        client_user_id: user.id,
        client_name: `${user.firstName} ${user.lastName}`.trim(),
        client_email: user.email,
        client_phone: user.phone || null,
        items_count: items.length,
        notes: notes.trim() || null,
      });
    } catch (err) {
      console.warn("[CartSubmit] cart_submissions insert failed", err);
    }

    try {
      await fetch("/api/cart/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_group_id: cartGroupId,
          client_name: `${user.firstName} ${user.lastName}`.trim(),
          client_email: user.email,
          client_phone: user.phone,
          notes,
          items: results.map((r) => ({ label: r.label, status: r.status })),
        }),
      });
    } catch (err) {
      console.warn("[CartSubmit] email notify failed", err);
    }

    clearCart();
    setSubmitting(false);

    const resultsParam = encodeURIComponent(JSON.stringify(results));
    navigate(`/panier/confirmation?group=${cartGroupId}&results=${resultsParam}`);
  };

  if (step === "review") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <ShoppingCart className="h-7 w-7 text-primary" />
                Récapitulatif de ma demande ({items.length} élément{items.length > 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{item.vehicleLabel}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(item.startDate).toLocaleDateString("fr-FR")} →{" "}
                        {new Date(item.endDate).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="text-muted-foreground text-xs italic">Prix estimé au moment de l'ajout</p>
                    </div>
                    {item.estimatedPrice ? (
                      <DualPrice
                        amountMga={item.estimatedPrice}
                        variant="client"
                        primaryClassName="font-semibold tabular-nums shrink-0"
                        secondaryClassName="text-xs"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Prix non disponible</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <span className="font-semibold">Total estimé</span>
                <DualPrice
                  amountMga={total}
                  variant="client"
                  primaryClassName="font-bold text-lg tabular-nums"
                  secondaryClassName="text-sm"
                />
              </div>

              <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 p-3">
                Cette demande n'est pas un paiement — chaque propriétaire valide votre demande individuellement.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("edit")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Envoi en cours..." : "Confirmer l'envoi"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShoppingCart className="h-7 w-7 text-primary" />
              Valider ma demande groupée ({items.length} élément{items.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep("review");
              }}
              className="space-y-6"
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{item.vehicleLabel}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(item.startDate).toLocaleDateString("fr-FR")} →{" "}
                        {new Date(item.endDate).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {item.estimatedPrice ? (
                      <DualPrice
                        amountMga={item.estimatedPrice}
                        variant="client"
                        primaryClassName="font-semibold tabular-nums shrink-0"
                        secondaryClassName="text-xs"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Prix non disponible</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold">Total estimé</span>
                <DualPrice
                  amountMga={total}
                  variant="client"
                  primaryClassName="font-bold text-lg tabular-nums"
                  secondaryClassName="text-sm"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <Input value={`${user.firstName} ${user.lastName}`.trim()} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={user.email} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={user.phone || ""} disabled />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Précisions sur votre demande..."
                />
              </div>

              <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 p-3">
                Cette demande n'est pas un paiement — chaque propriétaire valide votre demande individuellement.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Annuler
                </Button>
                <Button type="submit">
                  Vérifier ma demande
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
