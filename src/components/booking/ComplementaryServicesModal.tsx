import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plane, Building2 } from "lucide-react";
import {
  PLATFORM_TRANSPORT_OPTIONS,
  PLATFORM_AIRPORT_PICKUP_ID,
  PLATFORM_AIRPORT_RETURN_ID,
  PLATFORM_HOTEL_PICKUP_ID,
  PLATFORM_HOTEL_RETURN_ID,
  isPlatformPickupOption,
  isPlatformReturnOption,
  resolvePickupExclusion,
  resolveReturnExclusion,
} from "@/constants/platformBookingOptions";
import { applyComplementaryServicesToDraft } from "@/services/localStorage/bookingStorage";
import { requiresHotelName } from "@/utils/bookingLocations";
import { formatCurrency } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";

interface ComplementaryServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function ComplementaryServicesModal({
  isOpen,
  onClose,
  onContinue,
}: ComplementaryServicesModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hotelName, setHotelName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds([]);
    setHotelName("");
  }, [isOpen]);

  const optionsTotal = useMemo(
    () =>
      PLATFORM_TRANSPORT_OPTIONS.filter((o) => selectedIds.includes(o.id)).reduce(
        (sum, o) => sum + o.totalPrice,
        0
      ),
    [selectedIds]
  );

  const showHotelField = requiresHotelName(selectedIds);

  const toggleOption = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      let next = [...prev, id];
      if (isPlatformPickupOption(id)) {
        next = resolvePickupExclusion(id, next);
      }
      if (isPlatformReturnOption(id)) {
        next = resolveReturnExclusion(id, next);
      }
      return next;
    });
  };

  const handleContinueWithServices = () => {
    if (showHotelField && !hotelName.trim()) {
      toast({
        title: t("booking.complementaryServices.hotelRequiredTitle"),
        description: t("booking.complementaryServices.hotelRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    applyComplementaryServicesToDraft({
      selectedPlatformIds: selectedIds,
      platformOptionDefs: PLATFORM_TRANSPORT_OPTIONS.map((o) => ({
        id: o.id,
        name: o.name,
        totalPrice: o.totalPrice,
      })),
      hotelName: showHotelField ? hotelName.trim() : undefined,
      declinedAgency: false,
    });
    onContinue();
  };

  const handleDecline = () => {
    applyComplementaryServicesToDraft({
      selectedPlatformIds: [],
      platformOptionDefs: PLATFORM_TRANSPORT_OPTIONS.map((o) => ({
        id: o.id,
        name: o.name,
        totalPrice: o.totalPrice,
      })),
      declinedAgency: true,
    });
    onContinue();
  };

  const optionIcon = (id: string) => {
    if (id.includes("hotel")) return Building2;
    return Plane;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("booking.complementaryServices.title")}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("booking.complementaryServices.subtitle")}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {PLATFORM_TRANSPORT_OPTIONS.map((opt) => {
            const Icon = optionIcon(opt.id);
            const checked = selectedIds.includes(opt.id);
            return (
              <div key={opt.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  id={`upsell-${opt.id}`}
                  checked={checked}
                  onCheckedChange={() => toggleOption(opt.id)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`upsell-${opt.id}`} className="flex cursor-pointer items-center gap-2 font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {opt.name}
                    <span className="text-primary">+{formatCurrency(opt.totalPrice)}</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </div>
            );
          })}

          {showHotelField && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="upsell-hotel-name">{t("booking.complementaryServices.hotelNameLabel")}</Label>
              <Input
                id="upsell-hotel-name"
                placeholder={t("booking.complementaryServices.hotelNamePlaceholder")}
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
              />
            </div>
          )}

          {optionsTotal > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span>{t("booking.complementaryServices.optionsTotal")}</span>
                <strong>{formatCurrency(optionsTotal)}</strong>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button type="button" className="w-full" onClick={handleContinueWithServices}>
            {t("booking.complementaryServices.continueWithServices")}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={handleDecline}>
            {t("booking.complementaryServices.declineAgency")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
