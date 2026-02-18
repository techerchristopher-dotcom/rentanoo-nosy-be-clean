import "@/styles/modal-animations.css";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { format, addMonths, eachDayOfInterval, isSameDay, addDays, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface AvailabilityData {
  [key: string]: 'available' | 'neutral';
}

interface InteractiveCalendarProps {
  availability: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
}

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({
  availability,
  onAvailabilityChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selection, setSelection] = useState<{
    isDragging: boolean;
    start: Date | null;
    hover: Date | null;
    end: Date | null;
  }>({ isDragging: false, start: null, hover: null, end: null });
  const [applyToThreeMonths, setApplyToThreeMonths] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const formatDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

  const getDayStatus = (date: Date) => {
    const key = formatDateKey(date);
    return availability[key] || 'neutral';
  };

  const isDateInDragRange = (date: Date) => {
    if (!selection.isDragging || !selection.start) return false;
    const start = selection.start;
    const hover = selection.hover || selection.start;
    const from = start <= hover ? start : hover;
    const to = start <= hover ? hover : start;
    return date >= from && date <= to;
  };

  const getDragRangeInfo = () => {
    if (!selection.start) return null;
    const start = selection.start;
    const hover = selection.hover || selection.start;
    const from = start <= hover ? start : hover;
    const to = start <= hover ? hover : start;
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return {
      from,
      to,
      days: daysDiff,
      text: `${format(from, 'd MMM', { locale: fr })}${!isSameDay(from, to) ? ` – ${format(to, 'd MMM', { locale: fr })}` : ''} • ${daysDiff} jour${daysDiff > 1 ? 's' : ''}`
    };
  };

  // Normalize date to midnight
  const normalize = (d: Date) => {
    const n = new Date(d);
    n.setHours(0, 0, 0, 0);
    return n;
  };

  const handlePointerDown = (date: Date, e: React.PointerEvent<HTMLButtonElement>) => {
    const today = normalize(new Date());
    const d = normalize(date);
    if (d < today) return;

    if (e.pointerType === 'touch') {
      const timer = setTimeout(() => {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
        setSelection({ isDragging: true, start: d, hover: d, end: null });
      }, 350);
      setLongPressTimer(timer);
    } else {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      setSelection({ isDragging: true, start: d, hover: d, end: null });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (longPressTimer && e.pointerType !== 'mouse') {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (!selection.isDragging) return;
    e.preventDefault();

    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const dateAttr = element?.getAttribute('data-date');
    if (dateAttr) {
      const hovered = normalize(new Date(dateAttr));
      const today = normalize(new Date());
      if (hovered >= today) {
        setSelection((sel) => (sel.isDragging ? { ...sel, hover: hovered } : sel));
      }
    }
  };

  const handlePointerUp = (date: Date, e: React.PointerEvent<HTMLButtonElement>) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    const d = normalize(date);
    const endDate = selection.hover ? selection.hover : d;

    // Update selection with end date
    setSelection((sel) => ({ ...sel, isDragging: false, end: endDate }));

    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const handleDayClick = (date: Date) => {
    if (selection.isDragging) return;
    const normalizedDate = normalize(date);
    const today = normalize(new Date());
    if (normalizedDate < today) return;
    setSelection({
      isDragging: false,
      start: normalizedDate,
      hover: null,
      end: normalizedDate
    });
  };

  const clearSelection = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setSelection({ isDragging: false, start: null, hover: null, end: null });
  };

  const markAsAvailable = () => {
    if (!selection.start || !selection.end) return;

    const newAvailability = { ...availability };
    
    // Normalize dates to midnight for consistency
    const from = normalize(selection.start);
    const to = normalize(selection.end);
    
    // Ensure proper ordering (handle reverse selection)
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    
    // Debug log for validation
    const daysToApply = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    console.log('Marking as available:', { start, end, daysToApply, applyToThreeMonths });
    
    // Helper function to get last day of month
    const getLastDayOfMonth = (date: Date) => {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      lastDay.setHours(0, 0, 0, 0);
      return lastDay;
    };

    // Helper function to clamp date to valid day in target month
    const clampToMonth = (date: Date, monthRef: Date) => {
      const lastDay = getLastDayOfMonth(monthRef);
      const targetDate = new Date(monthRef.getFullYear(), monthRef.getMonth(), date.getDate());
      targetDate.setHours(0, 0, 0, 0);
      
      // If the day doesn't exist in target month (e.g., Jan 31 -> Feb), clamp to last day
      if (targetDate.getMonth() !== monthRef.getMonth()) {
        return lastDay;
      }
      return targetDate;
    };

    // Helper function to apply range inclusively
    const applyRangeInclusive = (rangeStart: Date, rangeEnd: Date) => {
      const orderedStart = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
      const orderedEnd = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
      
      // Use addDays to iterate through each day inclusively
      for (let currentDate = new Date(orderedStart); !isAfter(currentDate, orderedEnd); currentDate = addDays(currentDate, 1)) {
        const normalizedDate = normalize(currentDate);
        newAvailability[formatDateKey(normalizedDate)] = 'available';
      }
    };

    // 1) Apply to the base selection
    applyRangeInclusive(start, end);

    // 2) If checkbox is checked, repeat the pattern in the next 3 months
    if (applyToThreeMonths) {
      for (let k = 1; k <= 3; k++) {
        // Project both start and end dates to month k
        const monthRef = addMonths(start, k);
        const startK = clampToMonth(start, monthRef);
        const endK = clampToMonth(end, monthRef);
        
        // Apply the same pattern in month k
        applyRangeInclusive(startK, endK);
      }
    }

    onAvailabilityChange(newAvailability);
    clearSelection();
    setApplyToThreeMonths(false);
  };

  const resetAllAvailability = () => {
    onAvailabilityChange({});
    clearSelection();
    setApplyToThreeMonths(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? addMonths(prev, -1) : addMonths(prev, 1)
    );
  };

  const getSelectedRange = () => {
    if (!selection.start || !selection.end) return null;
    
    const from = selection.start <= selection.end ? selection.start : selection.end;
    const to = selection.start <= selection.end ? selection.end : selection.start;
    
    return { from, to };
  };

  const renderCalendarDay = (date: Date) => {
    const status = getDayStatus(date);
    const isInDragRange = isDateInDragRange(date);
    const isToday = isSameDay(date, new Date());
    const isPastDate = date < new Date();

    return (
      <button
        data-date={formatDateKey(date)}
        onPointerDown={(e) => {
          e.preventDefault();
          handlePointerDown(date, e);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUp(date, e)}
        onClick={() => handleDayClick(date)}
        className={cn(
          "relative w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150 border select-none",
          "hover:scale-105 active:scale-95",
          // Selection state (drag in progress) - teal overlay
          isInDragRange && !isPastDate && "bg-teal-100 text-teal-900 border-teal-300 shadow-sm",
          // Available state
          status === 'available' && !isInDragRange && "bg-green-100 text-green-800 border-green-200",
          // Neutral state (default)
          status === 'neutral' && !isInDragRange && "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
          // Today indicator
          isToday && !isInDragRange && "ring-2 ring-primary ring-offset-1",
          // Past dates
          isPastDate && "opacity-30 cursor-not-allowed",
          // Drag start/end emphasis
          selection.isDragging && selection.start && isSameDay(date, selection.start) && "ring-2 ring-teal-500",
          selection.isDragging && selection.hover && isSameDay(date, selection.hover) && "ring-2 ring-teal-500"
        )}
        disabled={isPastDate}
      >
        {format(date, 'd')}
        {/* Available indicator */}
        {status === 'available' && !isInDragRange && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
        )}
        {/* Selection indicator */}
        {isInDragRange && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-600 rounded-full border-2 border-white shadow-sm" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Accessibility announcements */}
      <div aria-live="polite" className="sr-only">
        {selection.isDragging && selection.start && getDragRangeInfo()?.text && 
          `Sélection en cours : ${getDragRangeInfo()?.text}`
        }
        {!selection.isDragging && selection.start && selection.end && getDragRangeInfo()?.text &&
          `Sélection : ${getDragRangeInfo()?.text} - Prêt à marquer comme disponible`
        }
      </div>
      
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Définir mes jours disponibles</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez les dates où votre véhicule sera disponible à la location
        </p>
      </div>

      {/* Inline Selection Summary Bar */}
      {selection.start && selection.end && !selection.isDragging && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-lg shadow-black/5 animate-fade-in" role="region" aria-live="polite">
          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Left: Selection info */}
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Sélection en cours</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900 min-w-[30px]">Du :</span>
                  <span className="text-sm text-slate-700">{format(selection.start, 'EEEE dd MMMM yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900 min-w-[30px]">Au :</span>
                  <span className="text-sm text-slate-700">{format(selection.end, 'EEEE dd MMMM yyyy', { locale: fr })}</span>
                </div>
              </div>
            </div>
            
            {/* Right: Action buttons */}
            <div className="space-y-4">
              {/* Main action button */}
              <Button
                onClick={markAsAvailable}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium transition-all duration-120 hover:shadow-lg hover:shadow-green-600/25"
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Marquer comme disponibles
              </Button>
              
              {/* Options row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                {/* 3 months option */}
                <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 flex-1">
                  <Checkbox
                    id="apply-three-months"
                    checked={applyToThreeMonths}
                    onCheckedChange={(checked) => setApplyToThreeMonths(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1 min-w-0">
                    <label
                      htmlFor="apply-three-months"
                      className="text-xs font-medium leading-tight cursor-pointer text-slate-700"
                    >
                      Appliquer mon choix pour les 3 prochains mois
                    </label>
                    <p className="text-xs text-slate-500 leading-tight">
                      Les dates des 3 mois suivants adopteront le même statut
                    </p>
                  </div>
                </div>
                
                {/* Clear selection */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  Vider la sélection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-card rounded-lg border p-6">
        {/* Selection feedback */}
        {selection.isDragging && selection.start && (
          <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
                  Sélection : {getDragRangeInfo()?.text}
                </p>
                <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                  Relâchez pour choisir disponible ou indisponible
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-teal-600 hover:text-teal-800 hover:bg-teal-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h4 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h4>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week days header */}
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
            <div key={day} className="text-center text-muted-foreground font-normal text-sm p-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {(() => {
            const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            const firstDayWeekday = firstDayOfMonth.getDay();
            const daysInMonth = lastDayOfMonth.getDate();
            
            const days = [];
            
            // Empty cells for days before the first day of the month
            for (let i = 0; i < firstDayWeekday; i++) {
              days.push(<div key={`empty-${i}`} className="p-1" />);
            }
            
            // Days of the month
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              days.push(
                <div key={day} className="p-1">
                  {renderCalendarDay(date)}
                </div>
              );
            }
            
            return days;
          })()}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded-lg relative shadow-sm">
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full shadow-sm" />
            </div>
            <span className="text-sm text-slate-600 font-medium">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm" />
            <span className="text-sm text-slate-600 font-medium">Neutre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-teal-100 border border-teal-300 rounded-lg relative shadow-sm">
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-teal-600 rounded-full shadow-sm" />
            </div>
            <span className="text-sm text-slate-600 font-medium">Sélection</span>
          </div>
        </div>
        
        {/* Clear selection button */}
        {(selection.isDragging || selection.start) && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Vider la sélection
            </Button>
          </div>
        )}
      </div>
      
      {/* Global reset button */}
      <div className="flex justify-center mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={resetAllAvailability}
          className="text-slate-500 hover:text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-120"
        >
          <span className="mr-2">↺</span>
          Réinitialiser mon choix
        </Button>
      </div>

    </div>
  );
};