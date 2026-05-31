import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchBarTimePickerModalProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}

export function SearchBarTimePickerModal({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onClose,
  t,
}: SearchBarTimePickerModalProps) {
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem),92vh)] sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-bar-time-picker-title"
      >
        <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-4 relative">
          <h3 id="search-bar-time-picker-title" className="text-xl font-bold text-gray-900 text-center">
            {t("common.slectionner_les_heures")}
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

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6">
          <div className="flex items-center justify-center gap-6 sm:gap-8 py-2">
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-gray-700 mb-3">{t("common.heure_de_dpart")}</span>
              <Select value={startTime} onValueChange={onStartTimeChange}>
                <SelectTrigger className="w-24 h-12 text-lg font-semibold border-2 border-gray-300 rounded-xl">
                  <SelectValue placeholder="08:00" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                      {`${i.toString().padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-gray-400 text-2xl font-bold mt-8">→</div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-gray-700 mb-3">{t("common.heure_de_retour")}</span>
              <Select value={endTime} onValueChange={onEndTimeChange}>
                <SelectTrigger className="w-24 h-12 text-lg font-semibold border-2 border-gray-300 rounded-xl">
                  <SelectValue placeholder="18:00" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                      {`${i.toString().padStart(2, "0")}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {startTime && endTime && (
          <div className="shrink-0 sticky bottom-0 z-10 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-8 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {t("common.valider_mes_heures")}
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
