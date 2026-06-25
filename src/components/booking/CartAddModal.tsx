import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "date-fns";
import { ArrowLeft, Calendar, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LazyDatePicker } from "@/components/ui/lazy-date-picker";
import { Separator } from "@/components/ui/separator";
import { usePlatformTransportOptions } from "@/hooks/usePlatformTransportOptions";
import { getBookingRentalPricing } from "@/utils/rentalPriceFromDates";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import {
  isPlatformPickupOption,
  isPlatformReturnOption,
  resolvePickupExclusion,
  resolveReturnExclusion,
  type PlatformBookingOptionDef,
} from "@/constants/platformBookingOptions";

export interface CartAddParams {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  selectedPlatformOptions: PlatformBookingOptionDef[];
}

interface CartAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricePerDay: number;
  vehicleLabel: string;
  vehicleThumbnail?: string;
  dateLocale: Locale | null;
  t: (key: string, fallback?: string) => string;
  onAddToCart: (params: CartAddParams) => void;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  showDeliveryOptions?: boolean;
}

const START_TIME = "06:30";
const END_TIME = "06:00";

export function CartAddModal({
  isOpen,
  onClose,
  pricePerDay,
  vehicleLabel,
  vehicleThumbnail,
  dateLocale,
  t,
  onAddToCart,
  initialStartDate,
  initialEndDate,
  showDeliveryOptions = true,
}: CartAddModalProps) {
  const [step, setStep] = useState<"dates" | "options">("dates");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [monthsShown, setMonthsShown] = useState(2);

  const { options: platformOptions } = usePlatformTransportOptions();
  const { formatClient } = useExchangeRate();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMonthsShown(mq.matches ? 1 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStartDate(initialStartDate ?? null);
    setEndDate(initialEndDate ?? null);
    setSelectedIds([]);
    setStep(initialStartDate && initialEndDate ? "options" : "dates");
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const pricing = useMemo(() => {
    if (!startDate || !endDate) return null;
    return getBookingRentalPricing({
      pricePerDay,
      startDate,
      endDate,
      startTime: START_TIME,
      endTime: END_TIME,
    });
  }, [pricePerDay, startDate, endDate]);

  const selectedOptions = useMemo(
    () => platformOptions.filter((o) => selectedIds.includes(o.id)),
    [platformOptions, selectedIds]
  );

  const optionsTotal = useMemo(
    () => selectedOptions.reduce((sum, o) => sum + o.totalPrice, 0),
    [selectedOptions]
  );

  const total = (pricing?.basePrice ?? 0) + optionsTotal;

  const toggleOption = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      let next = [...prev, id];
      if (isPlatformPickupOption(id)) next = resolvePickupExclusion(id, next);
      if (isPlatformReturnOption(id)) next = resolveReturnExclusion(id, next);
      return next;
    });
  };

  const handleValidateDates = () => {
    if (!startDate || !endDate || !pricing) return;
    setStep("options");
  };

  const handleAddToCart = () => {
    if (!startDate || !endDate) return;
    onAddToCart({
      startDate,
      endDate,
      startTime: START_TIME,
      endTime: END_TIME,
      selectedPlatformOptions: selectedOptions,
    });
  };

  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
        role="dialog"
        aria-modal="true"
        aria-label={vehicleLabel}
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 relative border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 text-center">
            {step === "dates"
              ? t("common.selectDates", "Choisir les dates")
              : "Résumé & options"}
          </h3>
          {step === "options" && (
            <button
              type="button"
              onClick={() => setStep("dates")}
              className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-6 text-gray-500 hover:text-gray-700 p-1"
              aria-label="Retour aux dates"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-6 text-gray-500 hover:text-gray-700 p-1"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Date picker */}
        {step === "dates" && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-6 py-2">
              {dateLocale && (
                <LazyDatePicker
                  selected={startDate}
                  onChange={(dates) => {
                    if (Array.isArray(dates)) {
                      setStartDate(dates[0]);
                      setEndDate(dates[1]);
                    } else {
                      setStartDate(dates);
                    }
                  }}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  minDate={new Date()}
                  dateFormat="d MMM"
                  locale={dateLocale}
                  monthsShown={monthsShown}
                  inline
                  className="airbnb-calendar-modal"
                />
              )}
            </div>
            {startDate && endDate && (
              <div className="shrink-0 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                <Button
                  type="button"
                  onClick={handleValidateDates}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 font-semibold"
                >
                  {t("common.valider_mes_dates", "Valider mes dates")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step 2: Sticky price summary + scrollable options */}
        {step === "options" && pricing && (
          <>
            {/* Sticky price card */}
            <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6 border-b border-gray-100 bg-white">
              <div className="flex gap-3 items-start">
                {vehicleThumbnail && (
                  <img
                    src={vehicleThumbnail}
                    alt={vehicleLabel}
                    className="h-16 w-16 rounded-xl object-cover shrink-0 shadow-sm"
                  />
                )}
                <div className="flex-1 min-w-0 rounded-xl bg-muted/40 p-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {pricing.billableDays} jour{pricing.billableDays > 1 ? "s" : ""} × {formatClient(pricePerDay).primary}/j
                    </span>
                    <span className="font-semibold">{formatClient(pricing.basePrice).primary}</span>
                  </div>
                  {selectedOptions.map((o) => (
                    <div key={o.id} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground truncate pr-2">{o.name}</span>
                      <span className="font-semibold shrink-0">+{formatClient(o.totalPrice).primary}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Total estimé</span>
                    <div className="text-right">
                      <div className="font-bold text-primary text-lg leading-tight">{formatClient(total).primary}</div>
                      <div className="text-xs text-muted-foreground">{formatClient(total).secondary}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable options */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              {showDeliveryOptions && platformOptions.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-gray-800">Options de livraison</p>
                  {platformOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{opt.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {opt.description}
                        </div>
                        <div className="text-xs font-semibold text-primary mt-1">
                          +{formatClient(opt.totalPrice).primary}
                        </div>
                      </div>
                      <Switch
                        checked={selectedIds.includes(opt.id)}
                        onCheckedChange={() => toggleOption(opt.id)}
                        aria-label={opt.name}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 space-y-2">
              <Button
                type="button"
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 font-semibold"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ajouter au panier
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("dates")}
                className="w-full text-muted-foreground text-sm"
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Modifier les dates
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(
    content,
    typeof document !== "undefined"
      ? document.getElementById("radix-portal-root") || document.body
      : null
  );
}
