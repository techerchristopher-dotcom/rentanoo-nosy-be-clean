import { useState, forwardRef } from "react";
import { LazyDatePicker } from "@/components/ui/lazy-date-picker";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  startTime?: string;
  endTime?: string;
  onStartTimeChange?: (time: string) => void;
  onEndTimeChange?: (time: string) => void;
}

// Custom Input pour le style Airbnb
const CustomInput = forwardRef<HTMLButtonElement, any>(({ value, onClick, placeholder, isStart, time }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-6 text-left font-normal bg-white/95 backdrop-blur-sm hover:bg-white transition-all duration-300 border-r-2 border-gray-200 group"
  >
    <div className="flex items-center flex-1">
      <Calendar className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground font-medium mb-1">
          {isStart ? "Date de départ" : "Date de retour"}
        </div>
        <span className="text-base text-foreground font-medium">
          {value || placeholder}
        </span>
      </div>
    </div>
    {time && (
      <div className="flex items-center gap-2 ml-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-medium text-foreground">{time}</span>
      </div>
    )}
  </button>
));

CustomInput.displayName = "CustomInput";

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: DateRangePickerProps) {
  const [focusedInput, setFocusedInput] = useState<'start' | 'end' | null>(null);

  return (
    <div className="flex flex-col md:flex-row gap-0 rounded-full overflow-hidden shadow-lagoon">
      {/* Date de départ */}
      <div className="flex-1">
        <LazyDatePicker
          selected={startDate}
          onChange={(date) => {
            onStartDateChange(date);
            if (date && !endDate) {
              setFocusedInput('end');
            }
          }}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          minDate={new Date()}
          dateFormat="EEE d MMM"
          locale={fr}
          customInput={
            <CustomInput
              placeholder="mer 1 oct."
              isStart={true}
              time={startTime}
            />
          }
          calendarClassName="airbnb-calendar"
          dayClassName={(date) => {
            const isInRange = startDate && endDate && date >= startDate && date <= endDate;
            const isStartDate = startDate && date.toDateString() === startDate.toDateString();
            const isEndDate = endDate && date.toDateString() === endDate.toDateString();
            
            if (isStartDate || isEndDate) {
              return "bg-primary text-white font-bold rounded-full hover:bg-primary/90";
            }
            if (isInRange) {
              return "bg-primary/10 text-primary font-semibold";
            }
            return "hover:bg-primary/20 transition-colors duration-200";
          }}
          onCalendarOpen={() => setFocusedInput('start')}
        />
      </div>

      {/* Date de retour */}
      <div className="flex-1">
        <LazyDatePicker
          selected={endDate}
          onChange={(date) => {
            onEndDateChange(date);
            setFocusedInput(null);
          }}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate || new Date()}
          dateFormat="EEE d MMM"
          locale={fr}
          customInput={
            <CustomInput
              placeholder="dim 19 oct."
              isStart={false}
              time={endTime}
            />
          }
          calendarClassName="airbnb-calendar"
          dayClassName={(date) => {
            const isInRange = startDate && endDate && date >= startDate && date <= endDate;
            const isStartDate = startDate && date.toDateString() === startDate.toDateString();
            const isEndDate = endDate && date.toDateString() === endDate.toDateString();
            
            if (isStartDate || isEndDate) {
              return "bg-primary text-white font-bold rounded-full hover:bg-primary/90";
            }
            if (isInRange) {
              return "bg-primary/10 text-primary font-semibold";
            }
            return "hover:bg-primary/20 transition-colors duration-200";
          }}
          onCalendarOpen={() => setFocusedInput('end')}
          highlightDates={startDate && !endDate ? [startDate] : []}
        />
      </div>
    </div>
  );
}

