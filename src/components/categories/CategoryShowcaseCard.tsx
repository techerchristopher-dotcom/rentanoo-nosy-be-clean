import { useTranslation } from "react-i18next";
import type { CategoryShowcaseItem } from "@/data/categoryShowcaseItems";
import { cn } from "@/lib/utils";

interface CategoryShowcaseCardProps {
  item: CategoryShowcaseItem;
  onClick: (item: CategoryShowcaseItem) => void;
}

export function CategoryShowcaseCard({ item, onClick }: CategoryShowcaseCardProps) {
  const { t } = useTranslation("common");
  const { Icon, available, labelKey } = item;

  const badgeLabel = available
    ? t("categoryShowcase.badgeAvailable", "Disponible maintenant")
    : t("categoryShowcase.badgeComingSoon", "Prochainement");

  const badgeClasses = available
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

  const ariaLabel = `${t(labelKey)} — ${badgeLabel}`;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      aria-label={ariaLabel}
      className={cn(
        "group flex flex-col items-center justify-between gap-3 rounded-2xl border bg-card p-5 text-center",
        "shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft/40 text-primary transition-colors",
          "group-hover:bg-primary/10",
        )}
      >
        <Icon className="h-9 w-9" aria-hidden="true" />
      </div>

      <span className="text-base font-semibold text-foreground">
        {t(labelKey)}
      </span>

      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          badgeClasses,
        )}
      >
        {badgeLabel}
      </span>
    </button>
  );
}
