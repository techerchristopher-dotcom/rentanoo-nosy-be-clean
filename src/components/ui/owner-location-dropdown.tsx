import { useState, useEffect, useRef, forwardRef } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NOSYBE_CITIES, getLocationIcon } from "@/data/locations";

// Liste des villes pour les loueurs (3 villes supprimées : Aéroport, Barge Petite Terre, Barge Grande Terre)
const OWNER_NOSYBE_CITIES = NOSYBE_CITIES.filter(city => 
  !["Aéroport", "Barge Petite Terre", "Barge Grande Terre"].includes(city)
);

interface OwnerLocationDropdownProps {
  value: string;
  onChange: (location: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showResetButton?: boolean;
  onReset?: () => void;
  onEnter?: () => void;
}

export const OwnerLocationDropdown = forwardRef<HTMLInputElement, OwnerLocationDropdownProps>(
  ({ 
    value, 
    onChange, 
    placeholder = "Sélectionner votre ville",
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
        const filtered = OWNER_NOSYBE_CITIES.filter(city =>
          city.toLowerCase().includes(inputValue.toLowerCase())
        );
        setFilteredCities(filtered);
        setShowCityDropdown(filtered.length > 0);
        setSelectedCityIndex(-1);
      } else {
        // Si le champ est vide, afficher toutes les villes
        setFilteredCities(OWNER_NOSYBE_CITIES);
        setShowCityDropdown(true);
        setSelectedCityIndex(-1);
      }
    };

    // Gestion du focus sur le champ de recherche
    const handleSearchFocus = () => {
      if (value.trim() === "") {
        // Si le champ est vide, afficher toutes les villes
        setFilteredCities(OWNER_NOSYBE_CITIES);
        setShowCityDropdown(true);
        setShowFullCityList(false);
        setSelectedCityIndex(-1);
      } else {
        // Si le champ a du contenu, afficher les résultats filtrés
        const filtered = OWNER_NOSYBE_CITIES.filter(city =>
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
        setFilteredCities(OWNER_NOSYBE_CITIES);
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
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
              <Input
                ref={searchInputRef}
                placeholder={placeholder}
                value={value}
                onChange={handleSearchTextChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="pl-10 pr-12 py-3 text-sm border-0 rounded-lg bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-gray-50 transition-colors"
              />
              
              {/* Bouton liste complète */}
              <button
                onClick={toggleFullCityList}
                disabled={disabled}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showFullCityList ? "Masquer la liste" : "Voir toutes les villes"}
                title={showFullCityList ? "Masquer la liste" : "Voir toutes les villes"}
              >
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    showFullCityList && "rotate-180"
                  )} 
                />
              </button>
              
              {/* Icône de réinitialisation */}
              {showResetButton && hasValue && onReset && (
                <button
                  onClick={onReset}
                  disabled={disabled}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-red-100 transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Réinitialiser la sélection"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-red-600 transition-colors" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Dropdown des villes */}
        {showCityDropdown && filteredCities.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] max-h-60 overflow-y-auto"
          >
            {/* En-tête du dropdown */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-xs font-medium text-gray-600">
                {showFullCityList ? "Zones de Nosy Be (Loueurs)" : 
                 filteredCities.length === OWNER_NOSYBE_CITIES.length ? "Zones de Nosy Be (Loueurs)" : "Suggestions"}
              </h3>
            </div>
        
            {filteredCities.map((city, index) => {
              const IconComponent = getLocationIcon(city);
              return (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 group",
                    index === selectedCityIndex && "bg-blue-50 text-blue-600"
                  )}
                >
                  <div className="flex items-center">
                    <IconComponent className={cn(
                      "h-4 w-4 mr-3 text-gray-500 group-hover:text-blue-500",
                      index === selectedCityIndex && "text-blue-500"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      index === selectedCityIndex ? "text-blue-600 font-semibold" : "text-gray-800 group-hover:text-blue-700"
                    )}>
                      {city}
                    </span>
                  </div>
                </button>
              );
            })}
        
            {/* Pied du dropdown */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
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

OwnerLocationDropdown.displayName = "OwnerLocationDropdown";
