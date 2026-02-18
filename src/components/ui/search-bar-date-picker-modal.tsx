import { createPortal } from "react-dom";
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
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-center mb-4 relative">
          <h3 className="text-xl font-bold text-gray-900">
            {t("common.selectDates", "Sélectionner des dates")}
          </h3>
          <button onClick={onClose} className="absolute right-0 text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
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
          monthsShown={2}
          inline
          className="airbnb-calendar-modal"
        />
        {startDate && endDate && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={onValidate}
              className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-8 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("common.valider_mes_dates")}
            </Button>
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
