import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Hotel, ShoppingCart } from "lucide-react";
import { MdMoped, MdTwoWheeler, MdTerrain } from "react-icons/md";
import { useCart, type CartVehicleType } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SupabaseBookingsService } from "@/services/supabase/bookings";
import { ProfileService } from "@/services/supabase/profile";
import { previewRenterFee, type RenterFeePreview } from "@/services/supabase/renterFeePreview";
import { supabase } from "@/integrations/supabase/client";
import { DualPrice } from "@/components/currency/DualPrice";
import { requiresHotelName } from "@/utils/bookingLocations";
import type { User } from "@/types";

const TYPE_ICONS: Record<CartVehicleType, typeof Car> = {
  car: Car,
  moto: MdTwoWheeler as unknown as typeof Car,
  scooter: MdMoped as unknown as typeof Car,
  quad: MdTerrain as unknown as typeof Car,
  accommodation: Hotel,
};

interface ItemResult {
  id: string;
  label: string;
  status: "success" | "failed";
  error?: string;
}

export default function CartSubmit() {
  const { items, clearCart, updateItem } = useCart();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feePreviews, setFeePreviews] = useState<Record<string, RenterFeePreview | null>>({});
  const [hotelNameErrors, setHotelNameErrors] = useState<Record<string, boolean>>({});

  const itemNeedsHotelName = (item: (typeof items)[number]) =>
    requiresHotelName(item.selectedOptions?.map((o) => o.id) ?? []);

  useEffect(() => {
    if (!authUser) {
      navigate(`/auth/login?redirect=${encodeURIComponent("/panier/soumettre")}`);
      return;
    }
    ProfileService.getCurrentUserProfile().then(({ data }) => setProfile(data));
  }, [authUser, navigate]);

  useEffect(() => {
    Promise.all(
      items.map(async (item) => {
        const itemOptionsTotal = item.selectedOptions?.reduce((sum, o) => sum + o.totalPrice, 0) || 0;
        const itemBase = (item.estimatedPrice || 0) + itemOptionsTotal;
        const preview = await previewRenterFee(itemBase, "card_online", item.vehicleType);
        return [item.id, preview] as const;
      })
    ).then((entries) => setFeePreviews(Object.fromEntries(entries)));
  }, [items]);

  if (!authUser) return null;

  const vehiclesSubtotal = items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
  const optionsSubtotal = items.reduce(
    (sum, item) => sum + (item.selectedOptions?.reduce((s, o) => s + o.totalPrice, 0) || 0),
    0
  );
  const baseTotal = vehiclesSubtotal + optionsSubtotal;
  const feeTotal = items.reduce((sum, item) => sum + (feePreviews[item.id]?.service_fee_renter || 0), 0);
  const total = baseTotal + feeTotal;
  const feePercentDisplay =
    baseTotal > 0 && feeTotal > 0 ? Math.round((feeTotal / baseTotal) * 100) : null;

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

  const clientName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const missingHotelNames: Record<string, boolean> = {};
    for (const item of items) {
      if (itemNeedsHotelName(item) && !item.hotelName?.trim()) {
        missingHotelNames[item.id] = true;
      }
    }
    if (Object.keys(missingHotelNames).length > 0) {
      setHotelNameErrors(missingHotelNames);
      toast({
        title: "Nom de l'hôtel requis",
        description: "Indique le nom de l'hôtel pour chaque véhicule concerné avant d'envoyer ta demande.",
        variant: "destructive",
      });
      return;
    }
    setHotelNameErrors({});

    setSubmitting(true);

    const cartGroupId = crypto.randomUUID();
    const results: ItemResult[] = [];

    for (const item of items) {
      const { data, error } = await SupabaseBookingsService.createBooking({
        vehicleId: item.vehicleId,
        renterId: profile.id,
        startDate: item.startDate,
        endDate: item.endDate,
        startTime: item.startTime,
        endTime: item.endTime,
        pickupLocation: item.pickupLocation,
        hotelName: item.hotelName?.trim() || undefined,
        notes: notes.trim() || undefined,
        totalPrice: feePreviews[item.id]?.amount_total_expected ?? item.estimatedPrice ?? 0,
        basePrice: item.estimatedPrice || 0,
        selectedOptions: item.selectedOptions?.map((o) => ({ id: o.id, name: o.name, pricePerDay: 0, totalPrice: o.totalPrice })),
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
        client_user_id: profile.id,
        client_name: clientName,
        client_email: profile.email,
        client_phone: profile.phone || null,
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
          client_name: clientName,
          client_email: profile.email,
          client_phone: profile.phone,
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                {items.map((item) => {
                  const Icon = TYPE_ICONS[item.vehicleType] || Car;
                  return (
                    <div key={item.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                          {item.vehicleThumbnail ? (
                            <img
                              src={item.vehicleThumbnail}
                              alt={item.vehicleLabel}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
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
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="mt-2 pt-2 border-t space-y-1">
                          {item.selectedOptions.map((opt) => (
                            <div key={opt.id} className="flex justify-between gap-2 text-xs text-muted-foreground">
                              <span>{opt.name}</span>
                              <DualPrice
                                amountMga={opt.totalPrice}
                                variant="client"
                                primaryClassName="text-xs"
                                secondaryClassName="text-[10px]"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {itemNeedsHotelName(item) && (
                        <div className="mt-2 pt-2 border-t space-y-1">
                          <Label htmlFor={`hotel-name-${item.id}`} className="text-xs">
                            Nom de l'hôtel *
                          </Label>
                          <Input
                            id={`hotel-name-${item.id}`}
                            placeholder="Ex. Royal Beach Hotel"
                            value={item.hotelName ?? ""}
                            onChange={(e) => {
                              updateItem(item.id, { hotelName: e.target.value });
                              if (hotelNameErrors[item.id]) {
                                setHotelNameErrors((prev) => ({ ...prev, [item.id]: false }));
                              }
                            }}
                            className={hotelNameErrors[item.id] ? "border-destructive" : ""}
                          />
                          {hotelNameErrors[item.id] && (
                            <p className="text-xs text-destructive">Ce champ est obligatoire.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total véhicules</span>
                  <DualPrice amountMga={vehiclesSubtotal} variant="client" primaryClassName="tabular-nums" secondaryClassName="text-xs" />
                </div>
                {optionsSubtotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total options</span>
                    <DualPrice amountMga={optionsSubtotal} variant="client" primaryClassName="tabular-nums" secondaryClassName="text-xs" />
                  </div>
                )}
                <div className="flex items-center justify-between text-sm border-t pt-1.5">
                  <span className="text-muted-foreground">
                    Frais de service{feePercentDisplay !== null ? ` (${feePercentDisplay}%)` : ""}
                  </span>
                  <DualPrice amountMga={feeTotal} variant="client" primaryClassName="tabular-nums" secondaryClassName="text-xs" />
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Total estimé</span>
                  <DualPrice
                    amountMga={total}
                    variant="client"
                    primaryClassName="font-bold text-lg tabular-nums"
                    secondaryClassName="text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <Input value={clientName} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={profile?.email || ""} disabled />
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={profile?.phone || ""} disabled />
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
                <Button type="submit" disabled={submitting || !profile}>
                  {submitting ? "Envoi en cours..." : "Envoyer ma demande"}
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
