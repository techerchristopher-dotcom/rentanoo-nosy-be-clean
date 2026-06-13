import { useTranslation } from "react-i18next";
import { Car, Home, Bike } from "lucide-react";
import { MdMoped, MdTwoWheeler } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  resolveEmptyStateConfig,
  type ExplorerMainCategoryId,
} from "@/data/explorerFilterConfig";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { trackGa4Event } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/utils/whatsappUrl";
import { cn } from "@/lib/utils";

interface EmptyCategoryStateProps {
  categoryType: ExplorerMainCategoryId;
  subCategory?: string | null;
  className?: string;
}

function EmptyIllustration({
  type,
}: {
  type?: "home" | "scooter" | "moto" | "car";
}) {
  const iconClass = "h-12 w-12 text-primary/70";
  switch (type) {
    case "home":
      return <Home className={iconClass} aria-hidden />;
    case "scooter":
      return <MdMoped className={iconClass} aria-hidden />;
    case "moto":
      return <MdTwoWheeler className={iconClass} aria-hidden />;
    case "car":
      return <Car className={iconClass} aria-hidden />;
    default:
      return <Bike className={iconClass} aria-hidden />;
  }
}

export function EmptyCategoryState({
  categoryType,
  subCategory,
  className,
}: EmptyCategoryStateProps) {
  const { t } = useTranslation("common");
  const { waUrl } = useWhatsAppContact();

  const config = resolveEmptyStateConfig(categoryType, subCategory);
  if (!config) return null;

  const handleRequest = () => {
    trackGa4Event("filter_empty_request", {
      category: categoryType,
      subCategory: subCategory ?? "",
    });

    const message = t(config.waPrefillKey);
    const url = buildWhatsAppUrl(waUrl, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className={cn("border-dashed bg-muted/20", className)}>
      <CardContent className="flex flex-col items-center text-center p-8 sm:p-12">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10">
          <EmptyIllustration type={config.illustration} />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {t(config.titleKey)}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
          {t(config.descriptionKey)}
        </p>
        <Button type="button" onClick={handleRequest} className="min-w-[200px]">
          {t(config.ctaKey)}
        </Button>
      </CardContent>
    </Card>
  );
}
