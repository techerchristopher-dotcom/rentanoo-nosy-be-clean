import { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { createPortal } from "react-dom";
import { Search, MapPin, Calendar, Clock, X, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SingleLocationModal } from "@/components/ui/single-location-modal";

interface SearchBarAirbnbProps {
  searchText: string;
  onSearchTextChange: (text: string) => void;
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onSearch: () => void;
  searching?: boolean;
  onResetSearch?: () => void; // Fonction pour réinitialiser la recherche
}

// Custom Input pour le champ Dates
const DateInput = ({ value, onClick, placeholder, onClear }: any) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-0 py-0 text-left font-normal bg-transparent hover:bg-gray-50 transition-colors duration-200 rounded-lg"
  >
    <div className="flex items-center">
      <Calendar className="mr-3 h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-900 font-medium">
        {value || placeholder}
      </span>
    </div>
    {value && onClear && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        className="hover:bg-gray-200 rounded-full p-1 transition-colors"
      >
        <X className="h-3 w-3 text-gray-500" />
      </button>
    )}
  </button>
);

export function SearchBarAirbnb({
  searchText,
  onSearchTextChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onSearch,
  searching = false,
  onResetSearch,
}: SearchBarAirbnbProps) {
  const [activeField, setActiveField] = useState<'destination' | 'dates' | 'travelers' | null>(null);

  const {
    t: t,
  } = useTranslation('common');

  const [hoveredField, setHoveredField] = useState<'destination' | 'dates' | 'travelers' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Format des dates pour l'affichage
  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "d MMM", { locale: fr })} - ${format(endDate, "d MMM", { locale: fr })}`;
    } else if (startDate) {
      return `${format(startDate, "d MMM", { locale: fr })} - ...`;
    }
    return "Ajouter des dates";
  };

  // Fonction pour effacer les dates
  const clearDates = () => {
    onStartDateChange(null);
    onEndDateChange(null);
  };

  // Gestionnaire pour fermer le date picker quand on clique ailleurs
  const handleClickOutside = (event: MouseEvent) => {
    if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
      setShowDatePicker(false);
      setActiveField(null);
    }
  };

  return (
    <div className="relative">
      {/* Barre de recherche principale */}
      <div className="bg-white shadow-2xl border-0 rounded-3xl overflow-hidden relative backdrop-blur-sm">
        <div className="flex items-stretch relative min-h-[80px]">
          {/* Lieu de prise en charge */}
          <div 
            className={`flex-1 relative transition-all duration-500 ease-out ${
              hoveredField === 'destination' || activeField === 'destination'
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-200 mx-3 my-2 scale-[1.02]'
                : 'border-r border-gray-100 hover:bg-gray-50/50'
            }`}
            onMouseEnter={() => setHoveredField('destination')}
            onMouseLeave={() => setHoveredField(null)}
            onClick={() => setActiveField('destination')}
          >
            <div className="px-8 py-6 flex flex-col justify-center min-h-[80px]">
              <SingleLocationModal
                selectedLocation={searchText}
                onLocationChange={onSearchTextChange}
                placeholder="Rechercher une ville de prise en charge"
                trigger={
                  <div className="cursor-pointer group relative">
                <div className="flex items-center justify-center mb-2">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    hoveredField === 'destination' || activeField === 'destination'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="ml-3 text-xs font-bold text-primary uppercase tracking-wider">{t('common.lieu_de_prise_en_charge')}</span>
                </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-semibold transition-colors duration-300 ${
                        searchText 
                          ? 'text-primary' 
                          : 'text-muted-foreground group-hover:text-primary/70'
                      } truncate text-center w-full`}>
                        {searchText || "Rechercher une ville de prise en charge"}
                      </span>
                      {searchText && onResetSearch && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onResetSearch();
                          }}
                          className="absolute top-2 right-2 hover:bg-red-100 rounded-full p-2 transition-all duration-300 flex items-center justify-center group/btn"
                        >
                          <X className="h-4 w-4 text-gray-500 group-hover/btn:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Dates */}
          <div 
            className={`flex-1 relative transition-all duration-500 ease-out ${
              hoveredField === 'dates' || activeField === 'dates'
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl border border-green-200 mx-3 my-2 scale-[1.02]'
                : 'border-r border-gray-100 hover:bg-gray-50/50'
            }`}
            onMouseEnter={() => setHoveredField('dates')}
            onMouseLeave={() => setHoveredField(null)}
            onClick={() => {
              console.log('🗓️ Dates section clicked!');
              setActiveField('dates');
              setShowDatePicker(true);
            }}
          >
            <div className="px-8 py-6 flex flex-col justify-center min-h-[80px]">
              <div className="cursor-pointer group relative">
                <div className="flex items-center justify-center mb-2">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    hoveredField === 'dates' || activeField === 'dates'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="ml-3 text-xs font-bold text-primary uppercase tracking-wider">{t('common.dates')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-medium mb-1">{t('common.dpart')}</span>
                      <span className={`text-sm font-semibold transition-colors duration-300 ${
                        startDate 
                          ? 'text-gray-900' 
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}>
                        {startDate ? format(startDate, "d MMM", { locale: fr }) : "Sélectionner"}
                      </span>
                    </div>
                    <div className="text-gray-400 text-lg font-bold">→</div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 font-medium mb-1">{t('common.retour')}</span>
                      <span className={`text-sm font-semibold transition-colors duration-300 ${
                        endDate 
                          ? 'text-gray-900' 
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}>
                        {endDate ? format(endDate, "d MMM", { locale: fr }) : "Sélectionner"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Heures */}
          <div 
            className={`flex-1 relative transition-all duration-500 ease-out ${
              hoveredField === 'travelers' || activeField === 'travelers'
                ? 'bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl shadow-xl border border-purple-200 mx-3 my-2 scale-[1.02]'
                : 'hover:bg-gray-50/50'
            }`}
            onMouseEnter={() => setHoveredField('travelers')}
            onMouseLeave={() => setHoveredField(null)}
            onClick={() => {
              setActiveField('travelers');
              setShowTimePicker(true);
            }}
          >
            <div className="px-8 py-6 flex flex-col justify-center min-h-[80px]">
                <div className="flex items-center justify-center mb-2">
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    hoveredField === 'travelers' || activeField === 'travelers'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="ml-3 text-xs font-bold text-gray-700 uppercase tracking-wider">{t('common.heures')}</span>
                </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-6 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-medium mb-1">{t('common.dpart')}</span>
                    <span className={`text-sm font-semibold transition-colors duration-300 ${
                      startTime 
                        ? 'text-gray-900' 
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}>
                      {startTime || "Sélectionner"}
                    </span>
                  </div>
                  <div className="text-gray-400 text-lg font-bold">→</div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-medium mb-1">{t('common.retour')}</span>
                    <span className={`text-sm font-semibold transition-colors duration-300 ${
                      endTime 
                        ? 'text-gray-900' 
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}>
                      {endTime || "Sélectionner"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton Rechercher + Reset */}
          <div className="px-4 py-4 flex items-center gap-3">
            <Button
              onClick={onSearch}
              disabled={searching}
              className="bg-gradient-lagoon hover:opacity-90 text-white rounded-2xl px-8 py-4 font-bold shadow-lagoon hover:shadow-2xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-h-[60px] text-lg"
            >
              <Search className="h-5 w-5 mr-3" />
              {searching ? "Recherche..." : "Rechercher"}
            </Button>
            
            {/* Bouton Reset - Icône flottante élégante qui apparaît seulement si des critères sont sélectionnés */}
            {(searchText || startDate || endDate || startTime !== "06:30" || endTime !== "06:00") && onResetSearch && (
              <Button
                onClick={onResetSearch}
                variant="ghost"
                size="icon"
                className="h-[60px] w-[60px] text-primary hover:text-white hover:bg-red-500 hover:shadow-lg transition-all duration-300 group bg-transparent border-none shadow-none hover:shadow-lg"
                title="Réinitialiser tous les critères"
              >
                <RotateCcw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Modal flottant avec calendrier Airbnb - EN DEHORS DE LA STRUCTURE PRINCIPALE */}
      {showDatePicker && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-center mb-4 relative">
                  <h3 className="text-xl font-bold text-gray-900">{t('common.slectionner_les_dates')}</h3>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="absolute right-0 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
            
            {/* Calendrier Airbnb avec react-datepicker */}
            <DatePicker
              selected={startDate}
              onChange={(dates) => {
                console.log('🗓️ DatePicker onChange:', dates);
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
              locale={fr}
              monthsShown={2}
              inline
              className="airbnb-calendar-modal"
            />
            
            {/* Bouton Valider - apparaît quand les 2 dates sont sélectionnées */}
            {startDate && endDate && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => {
                    setShowDatePicker(false);
                    setActiveField(null);
                  }}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-8 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >{t('common.valider_mes_dates')}</Button>
              </div>
            )}
          </div>
            </div>,
            document.body
          )}
      {/* Modal flottant avec sélection d'heures */}
      {showTimePicker && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-center mb-4 relative">
              <h3 className="text-xl font-bold text-gray-900">{t('common.slectionner_les_heures')}</h3>
              <button
                onClick={() => setShowTimePicker(false)}
                className="absolute right-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Sélection des heures */}
            <div className="flex items-center justify-center gap-8 mb-6">
              {/* Heure de départ */}
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-gray-700 mb-3">{t('common.heure_de_dpart')}</span>
                <Select value={startTime} onValueChange={onStartTimeChange}>
                  <SelectTrigger className="w-24 h-12 text-lg font-semibold border-2 border-gray-300 rounded-xl">
                    <SelectValue placeholder="08:00" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {`${i.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Flèche */}
              <div className="text-gray-400 text-2xl font-bold mt-8">→</div>
              
              {/* Heure de retour */}
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-gray-700 mb-3">{t('common.heure_de_retour')}</span>
                <Select value={endTime} onValueChange={onEndTimeChange}>
                  <SelectTrigger className="w-24 h-12 text-lg font-semibold border-2 border-gray-300 rounded-xl">
                    <SelectValue placeholder="18:00" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {`${i.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Bouton Valider - apparaît quand les 2 heures sont sélectionnées */}
            {startTime && endTime && (
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    setShowTimePicker(false);
                    setActiveField(null);
                  }}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-8 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >{t('common.valider_mes_heures')}</Button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
