import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
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
import { isFilterableVehicleType, useCategoryShowcase } from "@/hooks/useCategoryShowcase";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { trackGa4Event } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/utils/whatsappUrl";
import { CategoryShowcaseCard } from "./CategoryShowcaseCard";

export function CategoryShowcaseModal() {
  const { t } = useTranslation("common");
  const { isOpen, close, selectAvailableCategory } = useCategoryShowcase();
  const { waUrl } = useWhatsAppContact();

  const handleAvailableClick = useCallback(
    (item: CategoryShowcaseItem) => {
      trackGa4Event("category_select", { category: item.gtagCategoryId });
      if (isFilterableVehicleType(item.id)) {
        selectAvailableCategory(item.id);
      } else {
        close();
      }
    },
    [close, selectAvailableCategory],
  );

  // Click coming-soon : ouvre WhatsApp directement, ne ferme PAS la modale,
  // ne persiste PAS le flag (l'utilisateur n'a pas exprimé de fermeture explicite).
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

  const availableCount = AVAILABLE_CATEGORIES.length;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        className="max-w-3xl gap-0 overflow-hidden border-0 p-0 shadow-2xl shadow-black/20 rounded-2xl sm:rounded-3xl duration-500"
      >
        {/* Hero zone : gradient subtil + blobs décoratifs */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.06] via-background to-background px-6 pb-7 pt-8 sm:px-10 sm:pt-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl"
          />

          <DialogHeader className="relative space-y-3 text-left">
            <div
              style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary animate-in fade-in-0 slide-in-from-top-1 duration-500"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("categoryShowcase.button", "Explorer")}
            </div>

            <DialogTitle
              style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl animate-in fade-in-0 slide-in-from-top-1 duration-500"
            >
              {t(
                "categoryShowcase.title",
                "Que souhaitez-vous louer à Nosy Be ?",
              )}
            </DialogTitle>

            <DialogDescription
              style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
              className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base animate-in fade-in-0 duration-500"
            >
              {t(
                "categoryShowcase.subtitle",
                "Découvrez nos solutions de location disponibles aujourd'hui et celles qui arrivent prochainement.",
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-7 overflow-y-auto px-6 pb-2 pt-2 sm:px-10">
          <section aria-labelledby="category-section-available">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="relative inline-flex h-2 w-2"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <h3
                id="category-section-available"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70"
              >
                {t(
                  "categoryShowcase.sectionAvailable",
                  "Disponible maintenant",
                )}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AVAILABLE_CATEGORIES.map((item, idx) => (
                <CategoryShowcaseCard
                  key={item.id}
                  item={item}
                  onClick={handleAvailableClick}
                  index={idx}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="category-section-coming-soon">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="inline-flex h-2 w-2 rounded-full bg-amber-500"
              />
              <h3
                id="category-section-coming-soon"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70"
              >
                {t("categoryShowcase.sectionComingSoon", "Prochainement")}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COMING_SOON_CATEGORIES.map((item, idx) => (
                <CategoryShowcaseCard
                  key={item.id}
                  item={item}
                  onClick={handleComingSoonClick}
                  index={availableCount + idx}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Footer premium */}
        <div className="mt-5 border-t border-border/60 bg-gradient-to-b from-muted/20 to-muted/40 px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={close}
            className="group mx-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/70 transition-all hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            {t(
              "categoryShowcase.viewAllAvailable",
              "Voir toutes les locations disponibles",
            )}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
