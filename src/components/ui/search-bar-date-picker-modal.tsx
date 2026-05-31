import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyDatePicker } from "@/components/ui/lazy-date-picker";
import type { Locale } from "date-fns";

interface SearchBarDatePickerModalProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  dateLocale: Locale;
  onClose: () => void;
  onValidate: () => void;
  t: (key: string, fallback?: string) => string;
}

export function SearchBarDatePickerModal({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  dateLocale,
  onClose,
  onValidate,
  t,
}: SearchBarDatePickerModalProps) {
  const [monthsShown, setMonthsShown] = useState(2);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMonthsShown(mq.matches ? 1 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div
        className="search-bar-date-modal bg-white rounded-2xl shadow-2xl w-full sm:max-w-4xl flex flex-col max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem),92vh)] sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-bar-date-picker-title"
      >
        <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-4 relative">
          <h3 id="search-bar-date-picker-title" className="text-xl font-bold text-gray-900 text-center">
            {t("common.selectDates", "Sélectionner des dates")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 sm:right-6 sm:top-6 text-gray-500 hover:text-gray-700"
            aria-label={t("common.close", "Fermer")}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-6">
          <LazyDatePicker
            selected={startDate}
            onChange={(dates) => {
              if (Array.isArray(dates)) {
                onStartDateChange(dates[0]);
                onEndDateChange(dates[1]);
              } else {
                onStartDateChange(dates);
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
        </div>

        {startDate && endDate && (
          <div className="shrink-0 sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={onValidate}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-8 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {t("common.valider_mes_dates")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  return createPortal(
    content,
    typeof document !== "undefined" ? (document.getElementById("radix-portal-root") || document.body) : null
  );
}
