import { useState, useEffect, useRef, forwardRef } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NOSYBE_CITIES, getLocationIcon } from "@/data/locations";

interface LocationDropdownProps {
  value: string;
  onChange: (location: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showResetButton?: boolean;
  onReset?: () => void;
  onEnter?: () => void;
}

export const LocationDropdown = forwardRef<HTMLInputElement, LocationDropdownProps>(
  ({ 
    value, 
    onChange, 
    placeholder = "Sélectionnez votre lieu de prise en charge",
    className,
    disabled = false,
    showResetButton = false,
    onReset,
    onEnter
  }, ref) => {
    // États pour l'autocomplete
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [showFullCityList, setShowFullCityList] = useState(false);
    const [filteredCities, setFilteredCities] = useState<string[]>([]);
    const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fermer le dropdown quand on clique en dehors
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current &&
          !searchInputRef.current.contains(event.target as Node)
        ) {
          setShowCityDropdown(false);
          setShowFullCityList(false);
          setSelectedCityIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Gestion de l'autocomplete des villes
    const handleSearchTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      onChange(inputValue);
      
      // Si on affiche la liste complète, la fermer quand on tape
      if (showFullCityList) {
        setShowFullCityList(false);
      }
      
      if (inputValue.trim().length >= 1) {
        // Filtrer les villes qui contiennent le texte tapé
        const filtered = NOSYBE_CITIES.filter(city =>
          city.toLowerCase().includes(inputValue.toLowerCase())
        );
        setFilteredCities(filtered);
        setShowCityDropdown(filtered.length > 0);
        setSelectedCityIndex(-1);
      } else {
        // Si le champ est vide, afficher toutes les villes
        setFilteredCities(NOSYBE_CITIES);
        setShowCityDropdown(true);
        setSelectedCityIndex(-1);
      }
    };

    // Gestion du focus sur le champ de recherche
    const handleSearchFocus = () => {
      if (value.trim() === "") {
        // Si le champ est vide, afficher toutes les villes
        setFilteredCities(NOSYBE_CITIES);
        setShowCityDropdown(true);
        setShowFullCityList(false);
        setSelectedCityIndex(-1);
      } else {
        // Si le champ a du contenu, afficher les résultats filtrés
        const filtered = NOSYBE_CITIES.filter(city =>
          city.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredCities(filtered);
        setShowCityDropdown(filtered.length > 0);
        setSelectedCityIndex(-1);
      }
    };

    // Toggle pour afficher la liste complète
    const toggleFullCityList = () => {
      if (showFullCityList) {
        setShowFullCityList(false);
        setShowCityDropdown(false);
      } else {
        setShowFullCityList(true);
        setShowCityDropdown(true);
        setFilteredCities(NOSYBE_CITIES);
        setSelectedCityIndex(-1);
        // Vider le champ de recherche pour afficher toutes les villes
        onChange("");
      }
    };

    const handleCitySelect = (city: string) => {
      onChange(city);
      setShowCityDropdown(false);
      setShowFullCityList(false);
      setFilteredCities([]);
      setSelectedCityIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showCityDropdown) {
        if (e.key === 'Enter' && onEnter) {
          e.preventDefault();
          onEnter();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCityIndex(prev => 
            prev < filteredCities.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCityIndex(prev => 
            prev > 0 ? prev - 1 : filteredCities.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedCityIndex >= 0 && selectedCityIndex < filteredCities.length) {
            handleCitySelect(filteredCities[selectedCityIndex]);
          } else if (onEnter) {
            onEnter();
          }
          break;
        case 'Escape':
          setShowCityDropdown(false);
          setShowFullCityList(false);
          setSelectedCityIndex(-1);
          break;
      }
    };

    const hasValue = value.trim() !== "";

    return (
      <div className={cn("relative", className)}>
        <Card className="bg-white/95 backdrop-blur-sm shadow-lagoon border-0">
          <CardContent className="p-0">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary z-10 transition-all duration-300 hover:scale-110" />
              <Input
                ref={searchInputRef}
                placeholder={placeholder}
                value={value}
                onChange={handleSearchTextChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="pl-12 pr-20 py-6 text-base border-0 rounded-full bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg"
              />
              
              {/* Bouton liste complète */}
              <button
                onClick={toggleFullCityList}
                disabled={disabled}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-all duration-300 z-10 button-bounce hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showFullCityList ? "Masquer la liste" : "Voir toutes les villes"}
                title={showFullCityList ? "Masquer la liste" : "Voir toutes les villes"}
              >
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-gray-500 hover:text-gray-700 transition-all duration-300",
                    showFullCityList && "rotate-180"
                  )} 
                />
              </button>
              
              {/* Icône de réinitialisation */}
              {showResetButton && hasValue && onReset && (
                <button
                  onClick={onReset}
                  disabled={disabled}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-red-100 transition-all duration-300 z-10 button-bounce hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Réinitialiser la recherche"
                >
                  <X className="h-5 w-5 text-gray-500 hover:text-red-600 transition-colors duration-300" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Dropdown des villes - Sorti du Card pour un z-index plus élevé */}
        {showCityDropdown && filteredCities.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] max-h-60 overflow-y-auto dropdown-enter backdrop-blur-sm"
          >
            {/* En-tête du dropdown */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {showFullCityList ? "Toutes les zones de Nosy Be" : 
                 filteredCities.length === NOSYBE_CITIES.length ? "Toutes les zones de Nosy Be" : "Suggestions"}
              </h3>
            </div>
        
            {filteredCities.map((city, index) => {
              const IconComponent = getLocationIcon(city);
              return (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border-b border-gray-100 last:border-b-0 list-item-enter group",
                    index === selectedCityIndex && "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center">
                    <IconComponent className={cn(
                      "h-4 w-4 mr-3 transition-all duration-300",
                      index === selectedCityIndex ? "text-blue-500 map-pin-pulse" : "text-gray-600 group-hover:text-blue-500 group-hover:scale-110"
                    )} />
                    <span className={cn(
                      "text-sm font-medium transition-all duration-300",
                      index === selectedCityIndex ? "text-blue-600 font-semibold" : "text-gray-800 group-hover:text-blue-700"
                    )}>
                      {city}
                    </span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ChevronDown className="h-3 w-3 text-blue-500 rotate-90" />
                    </div>
                  </div>
                </button>
              );
            })}
        
            {/* Pied du dropdown */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <p className="text-xs text-gray-500 text-center">
                {showFullCityList ? "Cliquez sur une ville pour la sélectionner" : "Utilisez ↑/↓ pour naviguer"}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

LocationDropdown.displayName = "LocationDropdown";
