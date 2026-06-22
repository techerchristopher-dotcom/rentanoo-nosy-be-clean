import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  EXPLORER_MAIN_CATEGORIES,
  type ExplorerMainCategoryId,
} from "@/data/explorerFilterConfig";
import {
  getSubFilterCountKey,
  useExplorerFilterCounts,
} from "@/hooks/useExplorerFilterCounts";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { cn } from "@/lib/utils";

interface ExplorerVisualFiltersProps {
  vehicles: SupabaseVehicle[];
  selectedMainCategory: ExplorerMainCategoryId | null;
  selectedSubFilter: string | null;
  onMainCategoryChange: (category: ExplorerMainCategoryId | null) => void;
  onSubFilterChange: (subFilterId: string | null) => void;
  onResetFilters: () => void;
}

export function ExplorerVisualFilters({
  vehicles,
  selectedMainCategory,
  selectedSubFilter,
  onMainCategoryChange,
  onSubFilterChange,
  onResetFilters,
}: ExplorerVisualFiltersProps) {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const counts = useExplorerFilterCounts(vehicles);
  const [subFilterDrawerOpen, setSubFilterDrawerOpen] = useState(false);

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("search-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const handleViewResults = useCallback(() => {
    setSubFilterDrawerOpen(false);
    // Laisser l'animation de fermeture du drawer avant le scroll
    window.setTimeout(scrollToResults, 150);
  }, [scrollToResults]);

  useEffect(() => {
    setSubFilterDrawerOpen(false);
  }, [selectedMainCategory]);

  const activeCategory = selectedMainCategory
    ? EXPLORER_MAIN_CATEGORIES.find((c) => c.id === selectedMainCategory)
    : null;

  const hasActiveFilters =
    selectedMainCategory != null || selectedSubFilter != null;

  const renderSubFilterChip = (
    subId: string,
    labelKey: string,
    mainId: ExplorerMainCategoryId
  ) => {
    const count = counts.sub[getSubFilterCountKey(mainId, subId)] ?? 0;
    const isActive = selectedSubFilter === subId;

    return (
      <button
        key={subId}
        type="button"
        aria-pressed={isActive}
        aria-label={t("explorerFilters.subFilterAria", {
          label: t(labelKey),
          count,
        })}
        onClick={() =>
          onSubFilterChange(isActive ? null : subId)
        }
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          isActive
            ? "border-primary bg-primary text-primary-foreground shadow-sm"
            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50"
        )}
      >
        <span>{t(labelKey)}</span>
        <span
          className={cn(
            "tabular-nums",
            isActive ? "text-primary-foreground/90" : "text-muted-foreground"
          )}
        >
          ({count})
        </span>
      </button>
    );
  };

  const subFiltersRow = activeCategory ? (
    <div className="flex flex-wrap gap-2">
      {activeCategory.subFilters.map((sub) =>
        renderSubFilterChip(sub.id, sub.labelKey, activeCategory.id)
      )}
    </div>
  ) : null;

  const subFiltersMobileDrawer = activeCategory && isMobile ? (
    <Drawer open={subFilterDrawerOpen} onOpenChange={setSubFilterDrawerOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {t("explorerFilters.moreFilters")}
          {selectedSubFilter ? (
            <span className="ml-1.5 text-muted-foreground">(1)</span>
          ) : null}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{t(activeCategory.labelKey)}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {activeCategory.subFilters.map((sub) =>
            renderSubFilterChip(sub.id, sub.labelKey, activeCategory.id)
          )}
        </div>
        <DrawerFooter className="flex-row gap-2">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onSubFilterChange(null);
              }}
            >
              {t("explorerFilters.reset")}
            </Button>
          </DrawerClose>
          <Button
            type="button"
            className="flex-1"
            onClick={handleViewResults}
          >
            {t("explorerFilters.viewResults")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ) : null;

  const renderMainCategoryDesktop = (
    category: (typeof EXPLORER_MAIN_CATEGORIES)[number]
  ) => {
    const count = counts.main[category.id] ?? 0;
    const isActive = selectedMainCategory === category.id;
    const { Icon } = category;

    const countLabel =
      count === 0
        ? t("explorerFilters.comingSoon")
        : count === 1
          ? t("explorerFilters.listingsCount_one", { count })
          : t("explorerFilters.listingsCount", { count });

    return (
      <button
        key={category.id}
        type="button"
        aria-pressed={isActive}
        aria-label={t("explorerFilters.mainCategoryAria", {
          label: t(category.labelKey),
          count,
        })}
        onClick={() =>
          onMainCategoryChange(
            isActive ? null : (category.id as ExplorerMainCategoryId)
          )
        }
        className={cn(
          "group relative flex min-w-[140px] flex-1 flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          isActive
            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
            : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-xl ring-1 transition-colors",
            isActive
              ? "bg-primary/10 text-primary ring-primary/20"
              : "bg-muted/50 text-foreground/80 ring-border group-hover:bg-primary/5"
          )}
        >
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {t(category.labelKey)}
        </span>
        <span
          className={cn(
            "text-xs",
            count === 0 ? "text-amber-600 font-medium" : "text-muted-foreground"
          )}
        >
          {countLabel}
        </span>
      </button>
    );
  };

  const renderMainCategoryMobile = (
    category: (typeof EXPLORER_MAIN_CATEGORIES)[number]
  ) => {
    const count = counts.main[category.id] ?? 0;
    const isActive = selectedMainCategory === category.id;
    const { Icon } = category;

    return (
      <button
        key={category.id}
        type="button"
        aria-pressed={isActive}
        onClick={() =>
          onMainCategoryChange(
            isActive ? null : (category.id as ExplorerMainCategoryId)
          )
        }
        className={cn(
          "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isActive
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border bg-card"
        )}
      >
        <Icon className="h-6 w-6 text-primary" aria-hidden />
        <span className="text-xs font-semibold text-center leading-tight">
          {t(category.labelKey)} ({count})
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>{t("common.filtres")}</span>
        </div>
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={onResetFilters}>
            {t("explorerFilters.reset")}
          </Button>
        ) : null}
      </div>

      {/* Niveau 1 */}
      {isMobile ? (
        <div className="grid grid-cols-3 gap-2">
          {EXPLORER_MAIN_CATEGORIES.map(renderMainCategoryMobile)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXPLORER_MAIN_CATEGORIES.map(renderMainCategoryDesktop)}
        </div>
      )}

      {/* Niveau 2 */}
      {activeCategory ? (
        <div className="space-y-3">
          {isMobile ? subFiltersMobileDrawer : subFiltersRow}
        </div>
      ) : null}
    </div>
  );
}
