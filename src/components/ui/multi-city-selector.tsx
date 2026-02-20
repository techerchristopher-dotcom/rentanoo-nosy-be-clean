import { useState, useEffect } from "react";
import { MapPin, Plane, Ship, Check, X, Search, RotateCcw, Trash2, CheckCircle, Star, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NOSYBE_CITIES, NOSYBE_STRATEGIC_POINTS, NOSYBE_LOCATIONS, getLocationIcon, isStrategicPoint, isCommune } from "@/data/locations";

interface MultiCitySelectorProps {
  selectedCities: string[];
  onChange: (cities: string[]) => void;
  maxSelections?: number;
  className?: string;
}

export const MultiCitySelector = ({
  selectedCities,
  onChange,
  maxSelections = 25,
  className
}: MultiCitySelectorProps) => {
  const [showAllCities, setShowAllCities] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrer les villes selon le terme de recherche
  const filteredStrategicPoints = NOSYBE_STRATEGIC_POINTS.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCommunes = NOSYBE_LOCATIONS.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCities = [...filteredStrategicPoints, ...filteredCommunes];

  // Gérer la sélection/désélection d'une ville
  const handleCityToggle = (city: string) => {
    if (selectedCities.includes(city)) {
      // Désélectionner
      onChange(selectedCities.filter(c => c !== city));
    } else {
      // Sélectionner (vérifier la limite)
      if (selectedCities.length < maxSelections) {
        onChange([...selectedCities, city]);
      }
    }
  };

  // Supprimer une ville sélectionnée
  const removeSelectedCity = (city: string) => {
    onChange(selectedCities.filter(c => c !== city));
  };

  // Sélectionner toutes les villes visibles
  const selectAllVisible = () => {
    const availableSlots = maxSelections - selectedCities.length;
    if (availableSlots > 0) {
      const newCities = filteredCities
        .filter(city => !selectedCities.includes(city))
        .slice(0, availableSlots);
      onChange([...selectedCities, ...newCities]);
    }
  };

  // Désélectionner toutes les villes
  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Zone de recherche moderne */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="🔍 Rechercher une zone de Nosy Be..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-background to-muted/20 border-2 border-primary/20 rounded-xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 placeholder:text-muted-foreground/70 font-medium"
        />
      </div>

      {/* Statistiques et actions avec design moderne */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 rounded-xl border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
            <MapPin className="h-4 w-4" />
            <span>{selectedCities.length}</span>
            <span className="text-primary-foreground/80">/ {maxSelections}</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">villes sélectionnées</span>
        </div>
        <div className="flex gap-2">
          {filteredCities.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllVisible}
              disabled={selectedCities.length >= maxSelections}
              className="text-xs font-medium border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
            >
              <Check className="h-3 w-3 mr-1" />
              Tout sélectionner
            </Button>
          )}
          {selectedCities.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs font-medium border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all duration-300"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Tout effacer
            </Button>
          )}
        </div>
      </div>

      {/* Villes sélectionnées avec design premium */}
      {selectedCities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="text-sm font-semibold text-foreground">Villes sélectionnées</h4>
          </div>
          <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-slate-50 to-green-50/30 rounded-xl border border-slate-200">
            {selectedCities.map((city) => {
              const IconComponent = getLocationIcon(city);
              return (
                <div
                  key={city}
                  className="group flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-full text-sm font-medium border border-slate-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-300 hover:scale-105"
                >
                  <IconComponent className="h-4 w-4 text-green-600" />
                  <span>{city}</span>
                  <button
                    type="button"
                    onClick={() => removeSelectedCity(city)}
                    className="ml-1 hover:bg-red-50 rounded-full p-1 transition-all duration-300 hover:scale-110"
                    aria-label={`Supprimer ${city}`}
                  >
                    <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste des villes avec design moderne */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              {searchTerm ? `Résultats pour "${searchTerm}"` : "Points stratégiques et zones de Nosy Be"}
            </h4>
          </div>
          {!searchTerm && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCities(!showAllCities)}
                className="text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10"
              >
                {showAllCities ? "Masquer" : "Voir tout"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const availableCities = filteredCities.filter(city => !selectedCities.includes(city));
                  const remainingSlots = maxSelections - selectedCities.length;
                  const citiesToAdd = availableCities.slice(0, remainingSlots);
                  onChange([...selectedCities, ...citiesToAdd]);
                }}
                disabled={selectedCities.length >= maxSelections || filteredCities.every(city => selectedCities.includes(city))}
                className="text-xs font-medium border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 transition-all duration-300"
              >
                <Check className="h-3 w-3 mr-1" />
                Tout sélectionner
              </Button>
            </div>
          )}
        </div>

        <div className={cn(
          "space-y-1 border-2 border-primary/20 rounded-xl bg-gradient-to-br from-background to-muted/10 shadow-sm",
          !showAllCities && !searchTerm ? "max-h-80 overflow-y-auto" : ""
        )}>
          {/* Points stratégiques */}
          {filteredStrategicPoints.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Points stratégiques</span>
                </div>
              </div>
              {filteredStrategicPoints.map((city, index) => {
                const IconComponent = getLocationIcon(city);
                const isSelected = selectedCities.includes(city);
                const isDisabled = !isSelected && selectedCities.length >= maxSelections;
                
                return (
                  <div
                    key={city}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-all duration-300 cursor-pointer border-b border-primary/10",
                      isSelected && "bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-l-primary",
                      isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
                    onClick={() => !isDisabled && handleCityToggle(city)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      className="pointer-events-none data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <IconComponent className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-300",
                      isSelected ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                    )} />
                    <span className={cn(
                      "text-sm font-medium flex-1 transition-colors duration-300",
                      isSelected ? "text-primary font-semibold" : "text-foreground group-hover:text-primary"
                    )}>
                      {city}
                    </span>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0 animate-in slide-in-from-right-2 duration-300" />
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Communes */}
          {filteredCommunes.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gradient-to-r from-secondary/10 to-muted/10 border-b border-secondary/20">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-secondary-foreground" />
                  <span className="text-xs font-semibold text-secondary-foreground uppercase tracking-wide">Communes</span>
                </div>
              </div>
              {(searchTerm || showAllCities ? filteredCommunes : filteredCommunes.slice(0, 6)).map((city, index) => {
                const IconComponent = getLocationIcon(city);
                const isSelected = selectedCities.includes(city);
                const isDisabled = !isSelected && selectedCities.length >= maxSelections;
                
                return (
                  <div
                    key={city}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-all duration-300 cursor-pointer border-b border-primary/10 last:border-b-0",
                      isSelected && "bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-l-primary",
                      isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
                    onClick={() => !isDisabled && handleCityToggle(city)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      className="pointer-events-none data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <IconComponent className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-300",
                      isSelected ? "text-primary scale-110" : "text-muted-foreground group-hover:text-primary group-hover:scale-110"
                    )} />
                    <span className={cn(
                      "text-sm font-medium flex-1 transition-colors duration-300",
                      isSelected ? "text-primary font-semibold" : "text-foreground group-hover:text-primary"
                    )}>
                      {city}
                    </span>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0 animate-in slide-in-from-right-2 duration-300" />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Message si aucune ville trouvée */}
        {searchTerm && filteredCities.length === 0 && (
          <div className="text-center py-8 bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl border border-muted">
            <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground font-medium">Aucune ville trouvée pour "{searchTerm}"</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Essayez avec un autre terme de recherche</p>
          </div>
        )}

        {/* Message si limite atteinte avec design moderne */}
        {selectedCities.length >= maxSelections && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">Limite atteinte</p>
              <p className="text-xs text-amber-700">Vous avez sélectionné le maximum de {maxSelections} villes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
