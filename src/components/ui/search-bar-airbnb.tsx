import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Calendar, X, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";

const getDateLocale = (lang: string): Promise<Locale> => {
  if (lang.startsWith("fr")) return import("date-fns/locale/fr").then((m) => m.fr);
  if (lang.startsWith("it")) return import("date-fns/locale/it").then((m) => m.it);
  if (lang.startsWith("de")) return import("date-fns/locale/de").then((m) => m.de);
  return import("date-fns/locale/en-US").then((m) => m.enUS);
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FEATURES } from "@/config/features";
import { cn } from "@/lib/utils";
import "@/styles/search-bar.css";

const SingleLocationModal = lazy(() =>
  import("@/components/ui/single-location-modal").then((m) => ({ default: m.SingleLocationModal }))
);
const SearchBarDatePickerModal = lazy(() =>
  import("@/components/ui/search-bar-date-picker-modal").then((m) => ({ default: m.SearchBarDatePickerModal }))
);
const SearchBarTimePickerModal = lazy(() =>
  import("@/components/ui/search-bar-time-picker-modal").then((m) => ({ default: m.SearchBarTimePickerModal }))
);

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
    t,
    i18n,
  } = useTranslation('common');

  // Locale date-fns chargée à la demande (lazy)
  const [dateLocale, setDateLocale] = useState<Locale>(enUS);
  useEffect(() => {
    getDateLocale(i18n.language || "fr").then(setDateLocale);
  }, [i18n.language]);

  const [hoveredField, setHoveredField] = useState<'destination' | 'dates' | 'travelers' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [openTimeAfterDates, setOpenTimeAfterDates] = useState(false);

  // Format des dates pour l'affichage
  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, "d MMM", { locale: dateLocale })} - ${format(endDate, "d MMM", { locale: dateLocale })}`;
    } else if (startDate) {
      return `${format(startDate, "d MMM", { locale: dateLocale })} - ...`;
    }
    return t("common.addDates", "Ajouter des dates");
  };

  // Fonction pour effacer les dates
  const clearDates = () => {
    onStartDateChange(null);
    onEndDateChange(null);
  };

  // Helpers d'orchestration des modales
  const openDateModal = () => {
    setActiveField('dates');
    setShowDatePicker(true);
  };

  const openTimeModal = () => {
    setActiveField('travelers');
    setShowTimePicker(true);
  };

  const handleDepartureDateClick = () => {
    openDateModal();
  };

  const handleReturnDateClick = () => {
    openDateModal();
  };

  const handleTimeClick = () => {
    if (startDate && endDate) {
      openTimeModal();
    } else {
      // Si les dates ne sont pas encore sélectionnées, ouvrir d'abord la modale de dates
      setOpenTimeAfterDates(true);
      openDateModal();
    }
  };

  const isReadyToLaunch = Boolean(startDate && endDate);

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4">
      {/* Barre de recherche principale */}
      <div className="bg-white shadow-xl border-0 rounded-3xl overflow-hidden relative backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-stretch relative min-h-[64px] md:min-h-[72px]">
          {/* Lieu de prise en charge (MVP: disabled via feature flag until hotel partnerships) */}
          {FEATURES.pickupLocationEnabled && (
            <div
              className={`hidden lg:flex flex-1 relative transition-all duration-500 ease-out ${
                hoveredField === 'destination' || activeField === 'destination'
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-200 mx-3 my-2 scale-[1.02]'
                  : 'border-r border-gray-100 hover:bg-gray-50/50'
              }`}
              onMouseEnter={() => setHoveredField('destination')}
              onMouseLeave={() => setHoveredField(null)}
              onClick={() => setActiveField('destination')}
            >
              <div className="px-4 py-3 flex flex-col justify-center">
                {activeField === 'destination' && (
                  <Suspense fallback={null}>
                    <SingleLocationModal
                      selectedLocation={searchText}
                      onLocationChange={onSearchTextChange}
                      placeholder={t('common.rechercher_une_ville_de_prise_en_charge', 'Rechercher une ville de prise en charge')}
                      trigger={
                        <div className="cursor-pointer group relative">
                      <div className="flex items-center mb-2">
                        <div
                          className={`p-2 rounded-xl transition-all duration-300 ${
                            hoveredField === 'destination' || activeField === 'destination'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                          }`}
                        >
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="ml-3 text-xs font-bold text-primary uppercase tracking-wider">
                          {t('lieu_de_prise_en_charge')}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-semibold transition-colors duration-300 ${
                            searchText
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-primary/70'
                          } truncate`}
                        >
                          {searchText || t('common.rechercher_une_ville_de_prise_en_charge', 'Rechercher une ville de prise en charge')}
                        </span>
                      </div>
                    </div>
                  }
                    />
                  </Suspense>
                )}
                {activeField !== 'destination' && (
                  <div
                    className="cursor-pointer group relative"
                    onClick={() => setActiveField('destination')}
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className={`p-2 rounded-xl transition-all duration-300 ${
                          hoveredField === 'destination' || activeField === 'destination'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                        }`}
                      >
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="ml-3 text-xs font-bold text-primary uppercase tracking-wider">
                        {t('lieu_de_prise_en_charge')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          searchText ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'
                        } truncate`}
                      >
                        {searchText || t('common.rechercher_une_ville_de_prise_en_charge', 'Rechercher une ville de prise en charge')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bloc central : Pattern A Départ / Retour */}
          <div className="flex-1 px-3 py-3 md:px-4 md:py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              {/* Colonne Départ */}
              <button
                type="button"
                className={`flex-1 text-center rounded-2xl border border-gray-100 hover:bg-gray-50/50 transition-all duration-300 px-3 py-3 md:px-4 md:py-3 ${
                  activeField === 'dates'
                    ? 'shadow-lg border-primary/40 bg-gradient-to-br from-green-50 to-emerald-50'
                    : ''
                }`}
                onClick={handleDepartureDateClick}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {t('searchBar.departure', 'Départ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-center">
                  <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDepartureDateClick();
                    }}
                  >
                    <span className="text-xs text-gray-500 font-medium mb-1">
                      {t('searchBar.date', 'Date')}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        startDate ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {startDate ? format(startDate, 'd MMM', { locale: dateLocale }) : 'Sélectionner'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-gray-300 text-lg font-bold">·</div>
                  <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeClick();
                    }}
                  >
                    <span className="text-xs text-gray-500 font-medium mb-1">
                      {t('searchBar.time', 'Heure')}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        startTime ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {startTime || '--:--'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Séparateur flèche (desktop uniquement) */}
              <div className="hidden md:flex items-center justify-center px-1 mx-1">
                <span className="text-gray-400 text-lg font-bold">→</span>
              </div>

              {/* Colonne Retour */}
              <button
                type="button"
                className={`flex-1 text-center rounded-2xl border border-gray-100 hover:bg-gray-50/50 transition-all duration-300 px-3 py-3 md:px-4 md:py-3 ${
                  activeField === 'dates'
                    ? 'shadow-lg border-primary/40 bg-gradient-to-br from-green-50 to-emerald-50'
                    : ''
                }`}
                onClick={handleReturnDateClick}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {t('searchBar.return', 'Retour')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-center">
                  <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReturnDateClick();
                    }}
                  >
                    <span className="text-xs text-gray-500 font-medium mb-1">
                      {t('searchBar.date', 'Date')}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        endDate ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {endDate ? format(endDate, 'd MMM', { locale: dateLocale }) : 'Sélectionner'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-gray-300 text-lg font-bold">·</div>
                  <div
                    className="flex flex-col items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeClick();
                    }}
                  >
                    <span className="text-xs text-gray-500 font-medium mb-1">
                      {t('searchBar.time', 'Heure')}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        endTime ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {endTime || '--:--'}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Bouton Rechercher + Reset */}
          <div className="px-3 py-2 md:px-4 md:py-3 flex items-center gap-2 md:gap-3 justify-center">
            <Button
              onClick={onSearch}
              disabled={searching}
              aria-label={
                searching
                  ? t('common.searchBar.searching', 'Recherche en cours…')
                  : t('common.searchBar.launchSearch', 'Je lance la recherche')
              }
              className={cn(
                "bg-gradient-lagoon hover:opacity-90 text-white rounded-2xl px-5 md:px-6 py-3 md:py-3 font-semibold shadow-lagoon hover:shadow-2xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center min-h-[48px] md:min-h-[54px] text-sm md:text-base ml-12 md:ml-16",
                !searching && isReadyToLaunch && "search-launch-cta"
              )}
            >
              <Search
                className={cn(
                  "relative z-[1] h-4 w-4 md:h-5 md:w-5 mr-2",
                  !searching && isReadyToLaunch && "search-launch-icon"
                )}
              />
              <span className="relative z-[1]">
                {searching
                  ? t('common.searchBar.searching', 'Recherche en cours…')
                  : t('common.searchBar.launchSearch', 'Je lance la recherche')}
              </span>
            </Button>

            {/* Bouton Reset - apparaît seulement si des critères sont sélectionnés */}
            {(searchText || startDate || endDate || startTime !== '06:30' || endTime !== '06:00') &&
              onResetSearch && (
                <Button
                  onClick={onResetSearch}
                  variant="ghost"
                  size="icon"
                  className="h-[48px] w-[48px] md:h-[54px] md:w-[54px] text-primary hover:text-white hover:bg-red-500 hover:shadow-lg transition-all duration-300 group bg-transparent border-none shadow-none"
                  title={t('common.rinitialiser', 'Réinitialiser')}
                >
                  <RotateCcw className="h-4 w-4 md:h-5 md:w-5 group-hover:rotate-180 transition-transform duration-300" />
                </Button>
              )}
          </div>
        </div>
      </div>
      {/* Modal calendrier — lazy (charge LazyDatePicker + react-datepicker au clic) */}
      {showDatePicker && (
        <Suspense fallback={null}>
          <SearchBarDatePickerModal
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            dateLocale={dateLocale}
            onClose={() => {
              setShowDatePicker(false);
              setActiveField(null);
            }}
            onValidate={() => {
              setShowDatePicker(false);
              setActiveField(null);
              if (openTimeAfterDates || true) {
                setShowTimePicker(true);
                setActiveField('travelers');
              }
              setOpenTimeAfterDates(false);
            }}
            t={t}
          />
        </Suspense>
      )}
      {/* Modal sélection d'heures — lazy */}
      {showTimePicker && (
        <Suspense fallback={null}>
          <SearchBarTimePickerModal
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={onStartTimeChange}
            onEndTimeChange={onEndTimeChange}
            onClose={() => {
              setShowTimePicker(false);
              setActiveField(null);
            }}
            t={t}
          />
        </Suspense>
      )}
    </div>
  );
}
