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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-center mb-4 relative">
          <h3 className="text-xl font-bold text-gray-900">{t("common.slectionner_les_heures")}</h3>
          <button onClick={onClose} className="absolute right-0 text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-8 mb-6">
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
        {startTime && endTime && (
          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-8 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("common.valider_mes_heures")}
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
