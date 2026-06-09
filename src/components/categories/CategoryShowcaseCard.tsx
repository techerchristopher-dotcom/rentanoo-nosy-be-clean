import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import type { CategoryShowcaseItem } from "@/data/categoryShowcaseItems";
import { cn } from "@/lib/utils";

interface CategoryShowcaseCardProps {
  item: CategoryShowcaseItem;
  onClick: (item: CategoryShowcaseItem) => void;
  /** Position globale de la carte dans la modale, utilisée pour le stagger d'entrée */
  index?: number;
}

export function CategoryShowcaseCard({
  item,
  onClick,
  index = 0,
}: CategoryShowcaseCardProps) {
  const { t } = useTranslation("common");
  const { Icon, available, labelKey } = item;

  const badgeLabel = available
    ? t("categoryShowcase.badgeAvailable", "Disponible maintenant")
    : t("categoryShowcase.badgeComingSoon", "Prochainement");

  const ariaLabel = `${t(labelKey)} — ${badgeLabel}`;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      aria-label={ariaLabel}
      style={{
        animationDelay: `${120 + index * 70}ms`,
        animationFillMode: "backwards",
      }}
      className={cn(
        "group relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-2xl border bg-card p-5 text-center",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out",
        "animate-in fade-in-0 slide-in-from-bottom-3 duration-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        available
          ? "border-emerald-100 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100/60"
          : "border-amber-100 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          available
            ? "bg-gradient-to-br from-emerald-50/70 via-transparent to-transparent"
            : "bg-gradient-to-br from-amber-50/70 via-transparent to-transparent",
        )}
      />

      <ArrowUpRight
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 h-4 w-4 -translate-y-0.5 translate-x-0.5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100",
          available ? "text-emerald-600" : "text-amber-600",
        )}
      />

      <div
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-2xl ring-1 transition-all duration-300",
          available
            ? "bg-gradient-to-br from-emerald-100 to-emerald-50/70 text-emerald-700 ring-emerald-200/60 group-hover:from-emerald-200 group-hover:to-emerald-100 group-hover:ring-emerald-300/80"
            : "bg-gradient-to-br from-amber-100 to-amber-50/70 text-amber-700 ring-amber-200/60 group-hover:from-amber-200 group-hover:to-amber-100 group-hover:ring-amber-300/80",
        )}
      >
        <Icon className="h-10 w-10" aria-hidden="true" />
      </div>

      <span className="relative text-base font-semibold tracking-tight text-foreground">
        {t(labelKey)}
      </span>

      <span
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
          available
            ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
            : "border-amber-200/80 bg-amber-50 text-amber-700",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            available ? "animate-pulse bg-emerald-500" : "bg-amber-500",
          )}
        />
        {badgeLabel}
      </span>
    </button>
  );
}
