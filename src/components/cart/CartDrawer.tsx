import { Calendar, Car, Hotel, Trash2 } from "lucide-react";
import { MdMoped, MdTwoWheeler, MdTerrain } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, CART_MAX_ITEMS, type CartVehicleType } from "@/contexts/CartContext";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

const TYPE_ICONS: Record<CartVehicleType, typeof Car> = {
  car: Car,
  moto: MdTwoWheeler as unknown as typeof Car,
  scooter: MdMoped as unknown as typeof Car,
  quad: MdTerrain as unknown as typeof Car,
  accommodation: Hotel,
};

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return `${fmt(startDate)} → ${fmt(endDate)}`;
}

export function CartDrawer() {
  const { items, count, isOpen, closeCart, removeItem } = useCart();
  const navigate = useNavigate();
  const { formatClientInline } = useExchangeRate();

  const itemTotal = (item: (typeof items)[number]) =>
    (item.estimatedPrice || 0) +
    (item.selectedOptions?.reduce((sum, opt) => sum + (opt.totalPrice || 0), 0) || 0);

  const total = items.reduce((sum, item) => sum + itemTotal(item), 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mon panier ({count}/{CART_MAX_ITEMS})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="py-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Votre panier est vide. Ajoutez un véhicule ou un hébergement depuis sa fiche.
            </p>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICONS[item.vehicleType] || Car;
              const hasOptions = item.selectedOptions && item.selectedOptions.length > 0;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {item.vehicleThumbnail ? (
                      <img
                        src={item.vehicleThumbnail}
                        alt={item.vehicleLabel}
                        className="h-14 w-14 rounded-xl object-cover shrink-0 ring-1 ring-border"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-primary-soft/30 flex items-center justify-center shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-semibold leading-tight truncate">
                        {item.vehicleLabel}
                      </p>
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDateRange(item.startDate, item.endDate)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.estimatedPrice != null && (
                    <div className="mt-3 space-y-1.5 border-t pt-3">
                      <div>
                        <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                          <span className="truncate">Location</span>
                          <span className="shrink-0 tabular-nums">
                            {formatClientInline(item.estimatedPrice)}
                          </span>
                        </div>
                        {item.pricePerDay != null && item.rentalDays != null && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {formatClientInline(item.pricePerDay)} / jour × {item.rentalDays} jour
                            {item.rentalDays > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                      {hasOptions &&
                        item.selectedOptions!.map((opt) => (
                          <div
                            key={opt.id}
                            className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground"
                          >
                            <span className="truncate">{opt.name}</span>
                            {opt.totalPrice > 0 && (
                              <span className="shrink-0 tabular-nums">
                                {formatClientInline(opt.totalPrice)}
                              </span>
                            )}
                          </div>
                        ))}
                      <div className="flex items-baseline justify-between gap-3 pt-1">
                        <span className="text-xs font-medium text-foreground">
                          Sous-total
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatClientInline(itemTotal(item))}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70">
                        Annulation gratuite jusqu'à 48h{item.vehicleType === "accommodation" ? " avant l'arrivée" : " avant le retrait"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>

          {items.length > 0 && (
            <div className="sticky bottom-0 bg-background border-t pt-3 pb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between w-full text-sm">
                <span className="text-muted-foreground">Total estimé</span>
                <span className="font-semibold">{formatClientInline(total)}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  closeCart();
                  navigate("/panier/soumettre");
                }}
              >
                Valider ma demande →
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
