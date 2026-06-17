import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

export function AddedToCartModal() {
  const { isAddedModalOpen, lastAddedItem, closeAddedModal, openCart, openSuggestionModal } =
    useCart();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAddedModalOpen || !contentRef.current) return;
    const el = contentRef.current;
    el.classList.remove("animate-modal-shake");
    // force reflow pour pouvoir rejouer l'animation si réouverte juste après
    void el.offsetWidth;
    el.classList.add("animate-modal-shake");
  }, [isAddedModalOpen]);

  if (!lastAddedItem) return null;

  const handleSeeCart = () => {
    closeAddedModal();
    openCart();
  };

  const handleContinueSearch = () => {
    closeAddedModal();
    openSuggestionModal(lastAddedItem.dates);
  };

  return (
    <Dialog open={isAddedModalOpen}>
      <DialogContent
        ref={contentRef}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 max-w-md text-center [&>button]:hidden"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            ✓ {lastAddedItem.label} ajouté !
          </DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground">Voulez-vous réserver autre chose ?</p>

        <div className="flex flex-col gap-3 mt-2">
          <Button size="lg" onClick={handleContinueSearch}>
            Continuer mes recherches →
          </Button>
          <Button size="lg" variant="outline" onClick={handleSeeCart}>
            Voir mon panier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
