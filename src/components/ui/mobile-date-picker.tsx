import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MobileDatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className
}: MobileDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("01");
  const [selectedMonth, setSelectedMonth] = useState<string>("01");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Initialiser les valeurs
  useEffect(() => {
    if (value) {
      setSelectedDay(value.getDate().toString().padStart(2, '0'));
      setSelectedMonth((value.getMonth() + 1).toString().padStart(2, '0'));
      setSelectedYear(value.getFullYear().toString());
    } else {
      const today = new Date();
      setSelectedDay(today.getDate().toString().padStart(2, '0'));
      setSelectedMonth((today.getMonth() + 1).toString().padStart(2, '0'));
      setSelectedYear(today.getFullYear().toString());
    }
  }, [value, isOpen]);

  // Générer les données
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getValidDays = () => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const maxDays = getDaysInMonth(month, year);
    return Array.from({ length: maxDays }, (_, i) => (i + 1).toString().padStart(2, '0'));
  };

  const days = getValidDays();
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthNum = (i + 1).toString().padStart(2, '0');
    const monthName = new Date(0, i).toLocaleDateString('fr-FR', { month: 'long' });
    return { value: monthNum, label: monthName };
  });
  const years = Array.from({ length: 130 }, (_, i) => {
    const year = new Date().getFullYear() + 5 - i;
    return year.toString();
  });

  // Ajuster le jour si nécessaire
  useEffect(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    const maxDays = getDaysInMonth(month, year);
    const currentDay = parseInt(selectedDay);
    
    if (currentDay > maxDays) {
      setSelectedDay(maxDays.toString().padStart(2, '0'));
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  const handleConfirm = () => {
    const date = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, parseInt(selectedDay));
    onChange(date);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10 px-3 py-2",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? 
            `${value.getDate().toString().padStart(2, '0')}/${(value.getMonth() + 1).toString().padStart(2, '0')}/${value.getFullYear()}` 
            : placeholder
          }
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-full max-w-sm mx-auto sm:max-w-md mobile-date-picker">
        <DialogHeader>
          <DialogTitle className="text-center">Sélectionner une date</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date Picker - Simple et clair */}
          <div className="grid grid-cols-3 gap-4">
            {/* Jour */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Jour</label>
              <div className="relative">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full h-12 px-3 text-center border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mois */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Mois</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-12 px-3 text-center border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Année */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Année</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full h-12 px-3 text-center border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Aperçu de la date */}
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Date sélectionnée</p>
            <p className="text-lg font-semibold">
              {selectedDay} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            className="flex-1"
          >
            Confirmer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}