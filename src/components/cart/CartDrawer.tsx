import { Car, Hotel, Trash2 } from "lucide-react";
import { MdMoped, MdTwoWheeler, MdTerrain } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, CART_MAX_ITEMS, type CartVehicleType } from "@/contexts/CartContext";

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

  const total = items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mon panier ({count}/{CART_MAX_ITEMS})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Votre panier est vide. Ajoutez un véhicule ou un hébergement depuis sa fiche.
            </p>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICONS[item.vehicleType] || Car;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="rounded-full bg-primary-soft/30 p-2 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.vehicleLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(item.startDate, item.endDate)}
                    </p>
                    {item.estimatedPrice != null && (
                      <p className="text-xs text-muted-foreground">
                        ~{item.estimatedPrice.toLocaleString("fr-FR")} Ar
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex items-center justify-between w-full text-sm">
              <span className="text-muted-foreground">Total estimé</span>
              <span className="font-semibold">{total.toLocaleString("fr-FR")} Ar</span>
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
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
