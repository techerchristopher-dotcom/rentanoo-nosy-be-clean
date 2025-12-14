import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentCountdownProps {
  confirmedAt: Date;
  deadlineHours?: number;
  className?: string;
}

export function PaymentCountdown({ 
  confirmedAt, 
  deadlineHours = 24,
  className 
}: PaymentCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const deadline = new Date(confirmedAt.getTime() + deadlineHours * 60 * 60 * 1000);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, expired: false });
    };

    // Calculer immédiatement
    calculateTimeRemaining();

    // Mettre à jour toutes les secondes
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [confirmedAt, deadlineHours]);

  if (timeRemaining.expired) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
        "bg-destructive/10 text-destructive border border-destructive/20",
        className
      )}>
        <Clock className="h-3 w-3" />
        <span>Délai dépassé</span>
      </div>
    );
  }

  // Couleur basée sur le temps restant
  const isUrgent = timeRemaining.hours < 4;
  const bgColor = isUrgent 
    ? "bg-red-50 text-red-700 border-red-200" 
    : "bg-orange-50 text-orange-700 border-orange-200";

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border",
      bgColor,
      className
    )}>
      <Clock className="h-3.5 w-3.5 animate-pulse" />
      <span>
        {String(timeRemaining.hours).padStart(2, '0')}:
        {String(timeRemaining.minutes).padStart(2, '0')}:
        {String(timeRemaining.seconds).padStart(2, '0')}
      </span>
      <span className="text-[10px] font-normal opacity-75">restantes</span>
    </div>
  );
}
