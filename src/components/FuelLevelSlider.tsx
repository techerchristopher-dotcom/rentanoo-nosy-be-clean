"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { Fuel, Pencil } from "lucide-react";

type FuelLevelSliderProps = {
  label?: string;
  value: number;
  onChange: (val: number) => void;
};

export function FuelLevelSlider({
  label = "Niveau de carburant / batterie",
  value,
  onChange,
}: FuelLevelSliderProps) {
  // clamp sécurité
  const safeValue = Math.min(100, Math.max(0, value ?? 0));
  
  // État local pour l'input de pourcentage
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(safeValue));

  // Synchroniser l'inputValue avec safeValue quand la valeur change de l'extérieur
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(String(safeValue));
    }
  }, [safeValue, isEditing]);

  // palette dynamique
  const getColor = useCallback((v: number) => {
    if (v <= 25) return "#dc2626"; // rouge
    if (v <= 50) return "#facc15"; // jaune
    if (v <= 80) return "#fb923c"; // orange
    return "#16a34a"; // vert
  }, []);

  const color = getColor(safeValue);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    onChange(next);
  }

  function handlePercentInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    
    // Si c'est un nombre valide, mettre à jour immédiatement
    const numVal = Number(val);
    if (!isNaN(numVal) && val !== '') {
      const clamped = Math.min(100, Math.max(0, numVal));
      onChange(clamped);
    }
  }

  function handlePercentInputBlur() {
    // À la perte de focus, valider et corriger la valeur
    const numVal = Number(inputValue);
    if (isNaN(numVal) || inputValue === '') {
      setInputValue(String(safeValue));
    } else {
      const clamped = Math.min(100, Math.max(0, numVal));
      setInputValue(String(clamped));
      onChange(clamped);
    }
    setIsEditing(false);
  }

  function handlePercentInputFocus() {
    setIsEditing(true);
  }

  function handlePercentInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Label + pourcentage */}
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="flex items-center gap-1 group">
          <div className="relative flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-primary transition-colors cursor-text">
            <input
              type="text"
              value={inputValue}
              onChange={handlePercentInputChange}
              onBlur={handlePercentInputBlur}
              onFocus={handlePercentInputFocus}
              onKeyDown={handlePercentInputKeyDown}
              className="text-sm font-semibold text-gray-900 tabular-nums w-10 text-right focus:outline-none bg-transparent"
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <span className="text-sm font-semibold text-gray-900">%</span>
            <Pencil 
              size={12} 
              className="text-gray-400 group-hover:text-primary transition-colors ml-1" 
            />
          </div>
        </div>
      </div>

      {/* Barre principale avec curseur voiture */}
      <div className="relative h-5 w-full">
        {/* Barre de fond */}
        <div className="absolute inset-0 h-5 w-full rounded-full bg-gray-200 overflow-hidden">
          {/* Barre colorée */}
          <div
            className="absolute left-0 top-0 h-full transition-all duration-300"
            style={{
              width: `${safeValue}%`,
              backgroundColor: color,
            }}
          />

          {/* Curseur icône carburant */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 z-10"
            style={{
              left: `calc(${safeValue}% - 16px)`, // centrage approx. icône avec fond (32px)
            }}
          >
            {/* Fond rond grisé */}
            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 shadow-sm flex items-center justify-center">
              {/* Icône centrée */}
              <Fuel
                size={20}
                color="#111827"
                className="drop-shadow-md pointer-events-none select-none"
              />
            </div>
          </div>
        </div>

        {/* Input range (superposé, invisible mais actif) */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={safeValue}
          onChange={handleInput}
          className="absolute inset-0 w-full h-5 opacity-0 cursor-pointer z-20"
        />
      </div>

      {/* Légendes */}
      <div className="flex justify-between text-[11px] text-gray-500 leading-none">
        <span>Vide</span>
        <span>1/4</span>
        <span>1/2</span>
        <span>3/4</span>
        <span>Plein</span>
      </div>
    </div>
  );
}

