import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCategoryShowcase } from "@/hooks/useCategoryShowcase";
import { cn } from "@/lib/utils";

interface ExploreCategoriesButtonProps {
  className?: string;
  /** When true (default on mobile usage), the label is hidden under the sm breakpoint */
  iconOnlyOnMobile?: boolean;
}

export function ExploreCategoriesButton({
  className,
  iconOnlyOnMobile = false,
}: ExploreCategoriesButtonProps) {
  const { t } = useTranslation("common");
  const { open } = useCategoryShowcase();

  const label = t("categoryShowcase.button", "Explorer");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={open}
      aria-label={label}
      className={cn("font-medium hover:bg-black/5", className)}
    >
      <Compass
        className={cn("h-4 w-4", iconOnlyOnMobile ? "sm:mr-2" : "mr-2")}
        aria-hidden="true"
      />
      <span className={cn(iconOnlyOnMobile && "hidden sm:inline")}>{label}</span>
    </Button>
  );
}
