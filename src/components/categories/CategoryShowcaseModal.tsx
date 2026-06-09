import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AVAILABLE_CATEGORIES,
  COMING_SOON_CATEGORIES,
  type CategoryShowcaseItem,
} from "@/data/categoryShowcaseItems";
import { useCategoryShowcase } from "@/hooks/useCategoryShowcase";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { trackGa4Event } from "@/lib/analytics";
import { CategoryShowcaseCard } from "./CategoryShowcaseCard";

function buildWhatsAppUrl(waUrl: string, message: string): string {
  const separator = waUrl.includes("?") ? "&" : "?";
  return `${waUrl}${separator}text=${encodeURIComponent(message)}`;
}

export function CategoryShowcaseModal() {
  const { t } = useTranslation("common");
  const { isOpen, close } = useCategoryShowcase();
  const { waUrl } = useWhatsAppContact();

  const handleAvailableClick = useCallback(
    (item: CategoryShowcaseItem) => {
      trackGa4Event("category_select", { category: item.gtagCategoryId });
      close();
    },
    [close],
  );

  // Click coming-soon : ouvre WhatsApp directement, ne ferme PAS la modale,
  // ne persiste PAS le flag (l'utilisateur n'a pas exprim\u00e9 de fermeture explicite).
  const handleComingSoonClick = useCallback(
    (item: CategoryShowcaseItem) => {
      if (!item.waPrefillKey) return;

      trackGa4Event("category_interest", { category: item.gtagCategoryId });

      const prefillMessage = t(item.waPrefillKey);
      const url = buildWhatsAppUrl(waUrl, prefillMessage);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [t, waUrl],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-w-3xl gap-6 sm:p-8">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {t(
              "categoryShowcase.title",
              "Que souhaitez-vous louer à Nosy Be ?",
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t(
              "categoryShowcase.subtitle",
              "Découvrez nos solutions de location disponibles aujourd'hui et celles qui arrivent prochainement.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 overflow-y-auto">
          <section aria-labelledby="category-section-available">
            <h3
              id="category-section-available"
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t(
                "categoryShowcase.sectionAvailable",
                "Disponible maintenant",
              )}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AVAILABLE_CATEGORIES.map((item) => (
                <CategoryShowcaseCard
                  key={item.id}
                  item={item}
                  onClick={handleAvailableClick}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="category-section-coming-soon">
            <h3
              id="category-section-coming-soon"
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t("categoryShowcase.sectionComingSoon", "Prochainement")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COMING_SOON_CATEGORIES.map((item) => (
                <CategoryShowcaseCard
                  key={item.id}
                  item={item}
                  onClick={handleComingSoonClick}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-center border-t pt-4">
          <button
            type="button"
            onClick={close}
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            {t(
              "categoryShowcase.viewAllAvailable",
              "Voir toutes les locations disponibles",
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
