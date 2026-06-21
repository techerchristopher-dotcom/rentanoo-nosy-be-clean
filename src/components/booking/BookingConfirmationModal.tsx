import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Car, Euro, Zap, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { it as itLocale } from "date-fns/locale/it";
import { de as deLocale } from "date-fns/locale/de";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBookingDraft, updateBookingOptions } from "@/services/localStorage/bookingStorage";
import { formatBillableDays } from "@/utils/formatDuration";
import { getBookingRentalPricing } from "@/utils/rentalPriceFromDates";
import { formatCurrency } from "@/utils/currency";
import { DualPrice } from "@/components/currency/DualPrice";
import { ClientPriceRow } from "@/components/currency/PriceRows";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { PaymentMethodSelector } from "@/components/booking/PaymentMethodSelector";
import { useRenterFeePreview } from "@/hooks/useRenterFeePreview";
import { feePercentLabel } from "@/services/supabase/renterFeePreview";
import type { BookingPaymentMethod } from "@/services/supabase/bookings";
import { ANALYTICS_BOOKING_CURRENCY, trackGa4Event } from "@/lib/analytics";
import { useListingTerms, type ListingKind } from "@/utils/listingTerminology";

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: BookingPaymentMethod) => void;
  listingKind?: ListingKind;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    imageUrl?: string;
    category?: string;
    vehicleType?: string;
  };
  rentalInfo: {
    pickupLocation?: string;
    returnLocation?: string;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    rentalDays: number;
    pricePerDay: number;
    basePrice: number;
  };
  selectedOptions?: Array<{
    name: string;
    pricePerDay: number;
    totalPrice: number;
  }>;
}

export function BookingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  listingKind = "car",
  vehicle,
  rentalInfo,
  selectedOptions = []
}: BookingConfirmationModalProps) {
  const { t, i18n } = useTranslation();
  const terms = useListingTerms(listingKind);
  const { footnote, formatClientInline } = useExchangeRate();
  
  // Locale du calendrier / formatage des dates en fonction de la langue active
  const currentLang = i18n.language || "fr";
  const dateLocale =
    currentLang.startsWith("fr") ? fr :
    currentLang.startsWith("it") ? itLocale :
    currentLang.startsWith("de") ? deLocale :
    enUS;

  // Locale pour formatCurrency
  const currencyLocale = 
    currentLang.startsWith("fr") ? "fr-FR" :
    currentLang.startsWith("it") ? "it-IT" :
    currentLang.startsWith("de") ? "de-DE" :
    "en-US";
  
  // État pour les options sélectionnées depuis localStorage
  const [draftOptions, setDraftOptions] = useState<Array<{
    id: string;
    name: string;
    pricePerDay: number;
    totalPrice: number;
    selected: boolean;
  }>>([]);
  const [draftPickupLocation, setDraftPickupLocation] = useState<string | undefined>();
  const [draftReturnLocation, setDraftReturnLocation] = useState<string | undefined>();
  
  const syncDraftState = () => {
    const draft = getBookingDraft();
    if (draft?.selectedOptions) {
      const selectedOptionsFromDraft = draft.selectedOptions.filter(opt => opt.selected);
      setDraftOptions(selectedOptionsFromDraft);
    } else {
      setDraftOptions([]);
    }
    setDraftPickupLocation(draft?.pickupLocation);
    setDraftReturnLocation(draft?.returnLocation);
  };

  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('card_online');

  const handlePaymentMethodChange = (method: BookingPaymentMethod) => {
    if (method === paymentMethod) return;
    setPaymentMethod(method);
    trackGa4Event("payment_method_selected", {
      payment_method: method,
      vehicle_id: vehicle.id,
      vehicle_category: vehicle.category ?? "unknown",
      subtotal,
      currency: ANALYTICS_BOOKING_CURRENCY,
    });
  };

  // Charger le brouillon depuis localStorage quand la modal s'ouvre
  useEffect(() => {
    if (!isOpen) return;
    setPaymentMethod('card_online');
    syncDraftState();
    const interval = setInterval(syncDraftState, 100);
    return () => clearInterval(interval);
  }, [isOpen]);
  
  const pickupLocation = draftPickupLocation ?? rentalInfo.pickupLocation;
  const returnLocation = draftReturnLocation ?? rentalInfo.returnLocation;
  const isAccommodation = listingKind === "accommodation";
  const showLocations = !isAccommodation && (pickupLocation || returnLocation);
  
  // Calculer le total des options (utiliser draftOptions au lieu de selectedOptions)
  const optionsTotal = draftOptions.reduce((sum, opt) => sum + opt.totalPrice, 0);
  
  // Calculer le sous-total
  const subtotal = rentalInfo.basePrice + optionsTotal;

  const { previewFor, savingsMga, loading: previewLoading, error: previewError } =
    useRenterFeePreview(subtotal, vehicle.vehicleType);

  const activePreview = previewFor(paymentMethod);
  const reservationFee = activePreview?.service_fee_renter ?? 0;
  const totalAmount = activePreview?.amount_total_expected ?? subtotal;
  const feePercentDisplay = activePreview ? feePercentLabel(activePreview.fee_percent) : null;
  
  // Formater les dates avec locale dynamique
  const formattedStartDate = format(rentalInfo.startDate, "EEEE d MMMM yyyy", { locale: dateLocale });
  const formattedEndDate = format(rentalInfo.endDate, "EEEE d MMMM yyyy", { locale: dateLocale });
  
  const pricingPreview = getBookingRentalPricing({
    pricePerDay: rentalInfo.pricePerDay,
    startDate: rentalInfo.startDate,
    endDate: rentalInfo.endDate,
    startTime: rentalInfo.startTime,
    endTime: rentalInfo.endTime,
  });
  const durationText =
    formatBillableDays(t, pricingPreview?.billableDays ?? rentalInfo.rentalDays) ??
    t("duration.day", { count: 1 });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FONCTION POUR SUPPRIMER UNE OPTION DEPUIS LA MODAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleRemoveOption = (optionId: string) => {
    console.log('🗑️ [BookingConfirmationModal] Suppression de l\'option:', optionId);
    
    // Récupérer le brouillon actuel
    const draft = getBookingDraft();
    if (!draft?.selectedOptions) return;
    
    // Marquer l'option comme non sélectionnée
    const updatedOptions = draft.selectedOptions.map(option => 
      option.id === optionId ? { ...option, selected: false } : option
    );
    
    // Mettre à jour le localStorage
    updateBookingOptions(updatedOptions);
    
    console.log('✅ [BookingConfirmationModal] Option supprimée:', optionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={[
          "flex w-[calc(100%-1rem)] max-w-2xl sm:max-w-3xl flex-col gap-0 overflow-hidden p-0",
          "top-[50%] translate-x-[-50%] translate-y-[-50%]",
          "h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1rem),92vh)]",
          "max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1rem),92vh)]",
          "rounded-2xl sm:rounded-lg sm:top-[2rem] sm:translate-y-0",
          "sm:h-[min(calc(100vh-2rem),95vh)] sm:max-h-[min(calc(100vh-2rem),95vh)]",
        ].join(" ")}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <DialogHeader className="text-center mb-4 sm:mb-6">
          <div className="hidden sm:flex items-center justify-center gap-2 mb-2">
            <div className="p-2 bg-primary rounded-full">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl sm:text-3xl font-bold text-center text-primary">
            {t("booking.confirmation.title")}
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            {t("booking.confirmation.subtitle")}
          </p>
        </DialogHeader>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche: Détails réservation */}
          <div className="lg:col-span-2 space-y-4">
          {/* Section Véhicule */}
          <div className="flex items-center gap-4 p-4 bg-gradient-soft rounded-xl border border-border/50">
            {vehicle.imageUrl && (
              <img 
                src={vehicle.imageUrl} 
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-20 h-20 object-cover rounded-lg shadow-sm"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-primary">
                {terms.formatListingTitle(vehicle.brand, vehicle.model)}
              </h3>
              {!isAccommodation && (
                <p className="text-sm text-muted-foreground font-medium">
                  {t("ownerVehicles.card.year", "Année")} {vehicle.year}
                </p>
              )}
            </div>
          </div>

          {/* Lieux de prise en charge / restitution */}
          {showLocations && (
            <>
              <Separator />
              <div className="space-y-3 px-2">
                {pickupLocation && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-soft rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">{terms.pickupLocationLabel}</p>
                      <p className="text-base font-semibold text-foreground">
                        {pickupLocation}
                      </p>
                    </div>
                  </div>
                )}
                {returnLocation && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-soft rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {terms.returnLocationLabel}
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {returnLocation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Section Dates et Durée */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">{t("dates")}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{terms.startDateLabel}</p>
                <p className="text-sm font-bold text-foreground capitalize">{formattedStartDate}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{rentalInfo.startTime}</span>
                </div>
              </div>

              <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{terms.endDateLabel}</p>
                <p className="text-sm font-bold text-foreground capitalize">{formattedEndDate}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{rentalInfo.endTime}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Badge variant="default" className="text-sm px-4 py-1.5 bg-primary text-white font-semibold">
                {t("booking.durationLabel")} {durationText || ""}
              </Badge>
            </div>
          </div>
          </div>

          {/* Colonne droite: Récapitulatif prix */}
          <div className="lg:col-span-1">
          {/* Sticky en haut de la colonne droite sur desktop */}
          <div className="lg:sticky lg:top-0 space-y-4">
          
          {/* Section Tarif de Base */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Euro className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{t("booking.baseRateLabel").replace("* :", "").trim()}</span>
            </div>

            <div className="bg-card rounded-lg border border-border/50 p-3 space-y-2">
              <ClientPriceRow
                label={terms.rentalLabel}
                amountMga={rentalInfo.basePrice}
                labelClassName="font-medium"
              />
              <p className="text-xs text-muted-foreground pl-1">
                {formatClientInline(rentalInfo.pricePerDay)}/{terms.perNightSuffix} × {durationText || ""}
              </p>
            </div>
          </div>

          {/* Section Options (si présentes) */}
          {draftOptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-soft rounded-lg">
                    <Car className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {t("booking.selectedOptions")}
                  </span>
                </div>

                <div className="bg-card rounded-lg border border-border/50 p-3 space-y-3">
                  {draftOptions.map((option, index) => (
                    <div key={option.id || index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => handleRemoveOption(option.id)}
                          className="opacity-70 hover:opacity-100 hover:bg-red-500/10 rounded-full p-1.5 transition-all duration-200 flex items-center justify-center hover:border-red-400 flex-shrink-0"
                          title={t("profileForm.delete")}
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                        <span className="text-sm text-foreground font-medium">
                          {option.name}
                        </span>
                      </div>
                      <DualPrice
                        amountMga={option.totalPrice}
                        variant="client"
                        className="items-end text-right min-w-[80px]"
                        primaryClassName="text-base font-bold text-primary"
                        secondaryClassName="text-xs"
                      />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/50 mt-2">
                    <ClientPriceRow label={t("booking.optionsSubtotal")} amountMga={optionsTotal} bold />
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Mode de paiement (P3-A) */}
          <PaymentMethodSelector
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            savingsMga={savingsMga}
            disabled={previewLoading}
            listingKind={listingKind}
          />

          {previewError ? (
            <p className="text-xs text-muted-foreground">
              {t("booking.paymentMethod.previewError")}
            </p>
          ) : null}

          {/* Section Total */}
          <div className="space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
            <ClientPriceRow label={t("booking.subtotal")} amountMga={subtotal} bold />
            {activePreview && feePercentDisplay !== null ? (
              <ClientPriceRow
                label={t("booking.reservationFee", { percent: feePercentDisplay })}
                amountMga={reservationFee}
              />
            ) : previewLoading ? (
              <p className="text-xs text-muted-foreground text-right">…</p>
            ) : null}

            <Separator className="border-primary/30" />

            <div className="flex justify-between items-start pt-2 gap-4">
              <span className="text-base font-bold text-foreground">{t("booking.totalToPay")}</span>
              <DualPrice
                amountMga={totalAmount}
                variant="client"
                className="items-end text-right"
                primaryClassName="text-3xl font-bold text-primary"
                secondaryClassName="text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{footnote}</p>
          </div>
          </div>
          </div>

        </div>

        {/* Informations importantes — desktop uniquement (allège mobile) */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">{t("booking.benefits.quickResponse")}</p>
              <p className="text-[10px] text-blue-700">{t("booking.benefits.quickResponseHint")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">{t("booking.benefits.safePayment")}</p>
              <p className="text-[10px] text-blue-700">{t("booking.benefits.safePaymentHint")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">{t("booking.freeCancellation")}</p>
              <p className="text-[10px] text-blue-700">{t("booking.benefits.freeCancellationHint")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">{t("booking.benefits.quickConfirmation")}</p>
              {/* TODO(i18n): subtitle "Rapide" is now redundant with quickConfirmation - consider removing */}
            </div>
          </div>
        </div>

        {/* DEBUG PANEL - DEV ONLY */}
        {import.meta.env.DEV && (() => {
          const bundleTranslation = i18n.getResourceBundle(i18n.language, "translation");
          const bundleCommon = i18n.getResourceBundle(i18n.language, "common");
          
          const keysTranslation = bundleTranslation ? Object.keys(bundleTranslation).slice(0, 50) : null;
          const keysCommon = bundleCommon ? Object.keys(bundleCommon).slice(0, 50) : null;
          
          const resourceStoreNs = Object.keys(i18n.store?.data?.[i18n.language] ?? {});
          
          // Vérifications de structure exactes
          const hasSearchBarAtRootTranslation = !!bundleTranslation?.searchBar;
          const hasSearchBarUnderCommonTranslation = !!bundleTranslation?.common?.searchBar;
          const hasBookingAtRootTranslation = !!bundleTranslation?.booking;
          const hasDurationAtRootTranslation = !!bundleTranslation?.duration;
          
          const hasSearchBarAtRootCommon = !!bundleCommon?.searchBar;
          const hasSearchBarUnderCommonCommon = !!bundleCommon?.common?.searchBar;
          const hasBookingAtRootCommon = !!bundleCommon?.booking;
          const hasDurationAtRootCommon = !!bundleCommon?.duration;
          
          // Log console pour vérification
          const structureCheck = {
            hasSearchBarAtRootTranslation,
            hasSearchBarUnderCommonTranslation,
            hasBookingAtRootTranslation,
            hasDurationAtRootTranslation,
            hasSearchBarAtRootCommon,
            hasSearchBarUnderCommonCommon,
            hasBookingAtRootCommon,
            hasDurationAtRootCommon,
          };
          
          if (import.meta.env.DEV) {
            console.log("[I18N STRUCTURE CHECK]", structureCheck);
            console.log("[I18N BUNDLE TRANSLATION]", {
              hasBundle: !!bundleTranslation,
              topLevelKeys: bundleTranslation ? Object.keys(bundleTranslation).slice(0, 20) : [],
              searchBarLocation: bundleTranslation?.searchBar ? "at root" : bundleTranslation?.common?.searchBar ? "under common" : "NOT FOUND",
              bookingLocation: bundleTranslation?.booking ? "at root" : bundleTranslation?.common?.booking ? "under common" : "NOT FOUND",
            });
            console.log("[I18N BUNDLE COMMON]", {
              hasBundle: !!bundleCommon,
              topLevelKeys: bundleCommon ? Object.keys(bundleCommon).slice(0, 20) : [],
              searchBarLocation: bundleCommon?.searchBar ? "at root" : bundleCommon?.common?.searchBar ? "under common" : "NOT FOUND",
              bookingLocation: bundleCommon?.booking ? "at root" : bundleCommon?.common?.booking ? "under common" : "NOT FOUND",
            });
          }
          
          return (
            <div style={{ marginTop: 16, padding: 12, background: "#111", color: "#0f0", borderRadius: 8, overflow: "auto", fontSize: 12, fontFamily: "monospace" }}>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(
                  {
                    component: "BookingConfirmationModal",
                    lang: i18n.language,
                    namespaces: i18n.options?.ns,
                    defaultNS: i18n.options?.defaultNS,
                    hasTranslationBundle: !!bundleTranslation,
                    hasCommonBundle: !!bundleCommon,
                    translationTopKeys: keysTranslation,
                    commonTopKeys: keysCommon,
                    resourceStoreNs: resourceStoreNs,
                    bundleTranslationSize: bundleTranslation ? Object.keys(bundleTranslation).length : 0,
                    bundleCommonSize: bundleCommon ? Object.keys(bundleCommon).length : 0,
                    structureCheck: structureCheck,
                    exists: {
                      searchBarDeparture: i18n.exists("searchBar.departure"),
                      searchBarReturn: i18n.exists("searchBar.return"),
                      commonSearchBarDeparture: i18n.exists("common.searchBar.departure"),
                      durationDay: i18n.exists("duration.day"),
                      durationDayOne: i18n.exists("duration.day_one"),
                      durationDayOther: i18n.exists("duration.day_other"),
                      durationHour: i18n.exists("duration.hour"),
                      durationHourOne: i18n.exists("duration.hour_one"),
                      durationHourOther: i18n.exists("duration.hour_other"),
                      durationSeparator: i18n.exists("duration.separator"),
                    },
                    tValues: {
                      departure: t("searchBar.departure"),
                      return: t("searchBar.return"),
                      commonDeparture: t("common.searchBar.departure"),
                      durationDayCount1: t("duration.day", { count: 1 }),
                      durationDayCount4: t("duration.day", { count: 4 }),
                      durationHourCount1: t("duration.hour", { count: 1 }),
                      durationHourCount6: t("duration.hour", { count: 6 }),
                      separator: t("duration.separator"),
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          );
        })()}
        </div>

        {/* CTA sticky — toujours visible sur mobile */}
        <div className="sticky bottom-0 z-10 flex shrink-0 flex-col border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          <Button
            onClick={() => onConfirm(paymentMethod)}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 font-semibold"
          >
            <Zap className="h-5 w-5 mr-2 text-yellow-400" fill="currentColor" />
            {t("booking.confirmBooking")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

