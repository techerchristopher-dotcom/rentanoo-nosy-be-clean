import * as React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  highlighted?: boolean; // 🎯 Nouvelle prop pour la surbrillance
}

export function TimePicker({ value, onChange, highlighted = false }: TimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );
  
  const minutes = ['00', '15', '30', '45'];

  const [hour, minute] = value.split(':');

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour}:${newMinute}`);
  };

  return (
    <div className={`flex items-center space-x-2 p-3 border-t transition-all duration-500 ${
      highlighted ? 'bg-primary/10 ring-2 ring-primary/30' : ''
    }`}>
      <span className={`text-sm font-medium transition-colors duration-300 ${
        highlighted ? 'text-primary animate-pulse' : ''
      }`}>Heure :</span>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className={`w-16 transition-all duration-300 ${
          highlighted ? 'ring-2 ring-primary/50 bg-primary/10 animate-pulse' : ''
        }`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className={highlighted ? 'text-primary animate-pulse' : ''}>:</span>
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className={`w-16 transition-all duration-300 ${
          highlighted ? 'ring-2 ring-primary/50 bg-primary/10 animate-pulse' : ''
        }`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}