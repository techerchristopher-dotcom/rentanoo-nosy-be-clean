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
  isPlatformPickupOption,
  isPlatformReturnOption,
  isPlatformTransportOption,
  LEGACY_AIRPORT_OPTION_ID_MAP,
  resolvePickupExclusion,
  resolveReturnExclusion,
} from "@/constants/platformBookingOptions";
import { applyComplementaryServicesToDraft, getBookingDraft } from "@/services/localStorage/bookingStorage";
import { requiresHotelName } from "@/utils/bookingLocations";
import { useToast } from "@/hooks/use-toast";
import { usePlatformTransportOptions } from "@/hooks/usePlatformTransportOptions";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";

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
  const { options: platformTransportOptions } = usePlatformTransportOptions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hotelName, setHotelName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const draft = getBookingDraft();
    const platformIds = (draft?.selectedOptions ?? [])
      .filter((o) => o.selected && isPlatformTransportOption(o.id))
      .map((o) => LEGACY_AIRPORT_OPTION_ID_MAP[o.id] ?? o.id);
    setSelectedIds(platformIds);
    setHotelName(draft?.hotelName ?? "");
  }, [isOpen]);

  const optionsTotal = useMemo(
    () =>
      platformTransportOptions
        .filter((o) => selectedIds.includes(o.id))
        .reduce((sum, o) => sum + o.totalPrice, 0),
    [selectedIds, platformTransportOptions]
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
      platformOptionDefs: platformTransportOptions.map((o) => ({
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
      platformOptionDefs: platformTransportOptions.map((o) => ({
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
      <DialogContent className="flex w-[calc(100%-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 top-[50%] max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1rem),90vh)] translate-x-[-50%] translate-y-[-50%] rounded-2xl sm:rounded-lg">
        <DialogHeader className="shrink-0 space-y-1.5 px-5 pb-2 pt-5 text-left sm:px-6 sm:pt-6">
          <DialogTitle>{t("booking.complementaryServices.title")}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("booking.complementaryServices.subtitle")}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2 sm:px-6">
          <div className="space-y-3">
            {platformTransportOptions.map((opt) => {
              const Icon = optionIcon(opt.id);
              const checked = selectedIds.includes(opt.id);
              return (
                <div key={opt.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Checkbox
                    id={`upsell-${opt.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleOption(opt.id)}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={`upsell-${opt.id}`} className="flex cursor-pointer items-center gap-2 font-medium">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">{opt.name}</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  <ClientMgaPrice amountMga={opt.totalPrice} prefix="+" />
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
                <div className="flex items-end justify-between gap-3 text-sm">
                  <span>{t("booking.complementaryServices.optionsTotal")}</span>
                  <ClientMgaPrice amountMga={optionsTotal} prefix="+" primaryClassName="font-bold tabular-nums leading-none text-primary text-base" />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-col sm:px-6">
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
