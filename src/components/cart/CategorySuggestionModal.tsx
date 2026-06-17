import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hotel, Car } from "lucide-react";
import { MdMoped, MdTwoWheeler, MdTerrain, MdAirportShuttle } from "react-icons/md";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const CATEGORIES: Array<{ id: string; label: string; route: string; Icon: typeof Car }> = [
  { id: "accommodation", label: "Hébergement", route: "/location-vacances-nosy-be", Icon: Hotel },
  { id: "scooter", label: "Scooter", route: "/location-scooter-nosy-be", Icon: MdMoped as unknown as typeof Car },
  { id: "quad", label: "Quad", route: "/location-quad-nosy-be", Icon: MdTerrain as unknown as typeof Car },
  { id: "car", label: "Voiture", route: "/location-voiture-nosy-be", Icon: Car },
  { id: "minibus", label: "Minibus", route: "/location-minibus-nosy-be", Icon: MdAirportShuttle as unknown as typeof Car },
  { id: "moto", label: "Moto", route: "/location-moto-nosy-be", Icon: MdTwoWheeler as unknown as typeof Car },
];

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export function CategorySuggestionModal() {
  const { isSuggestionModalOpen, closeSuggestionModal, lastAddedDates, openCart } = useCart();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number] | null>(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);

  const handleClose = (open: boolean) => {
    if (!open) {
      closeSuggestionModal();
      setSelectedCategory(null);
      setShowCustomDates(false);
      setCustomStart("");
      setCustomEnd("");
    }
  };

  const goToCategory = (start: string, end: string) => {
    if (!selectedCategory) return;
    navigate(`${selectedCategory.route}?start=${start}&end=${end}`);
    handleClose(false);
  };

  const handleKeepDates = () => {
    if (!lastAddedDates) return;
    goToCategory(
      lastAddedDates.startDate.slice(0, 10),
      lastAddedDates.endDate.slice(0, 10)
    );
  };

  const handleCustomDatesSubmit = () => {
    if (!customStart || !customEnd) return;
    goToCategory(customStart, customEnd);
  };

  const handlePassWithoutPayment = () => {
    handleClose(false);
    openCart();
  };

  return (
    <Dialog open={isSuggestionModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedCategory
              ? `${selectedCategory.label} — choisir les dates`
              : "Voulez-vous réserver autre chose ?"}
          </DialogTitle>
        </DialogHeader>

        {!selectedCategory ? (
          <>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/40 px-3 py-4 text-center hover:border-primary hover:bg-background transition-colors"
                >
                  <cat.Icon className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t mt-4 pt-4">
              <Button variant="outline" className="w-full" onClick={handlePassWithoutPayment}>
                Passer à ma demande (sans paiement)
              </Button>
            </div>
          </>
        ) : !showCustomDates ? (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Mêmes dates que votre dernier ajout ?
            </p>
            {lastAddedDates && (
              <Button className="w-full" onClick={handleKeepDates}>
                Oui, garder [{formatShortDate(lastAddedDates.startDate)} →{" "}
                {formatShortDate(lastAddedDates.endDate)}]
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCustomDates(true)}
            >
              Non, choisir d'autres dates
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setSelectedCategory(null)}
            >
              ← Retour aux catégories
            </Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date de début</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date de fin</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!customStart || !customEnd}
              onClick={handleCustomDatesSubmit}
            >
              Voir les disponibilités →
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowCustomDates(false)}
            >
              ← Retour
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
