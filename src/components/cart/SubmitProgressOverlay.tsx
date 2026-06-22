import { useEffect, useState } from "react";
import { Calendar, Check, Coins, FileText, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Vérification de la disponibilité…", Icon: Calendar },
  { label: "Calcul du tarif final…", Icon: Coins },
  { label: "Préparation de votre dossier…", Icon: FileText },
  { label: "Envoi au propriétaire…", Icon: Send },
] as const;

const REASSURANCE_MESSAGES = [
  "Ça y est presque…",
  "Plus que quelques secondes…",
  "On finalise tout pour vous…",
];

interface SubmitProgressOverlayProps {
  open: boolean;
  /** Index du dernier step atteint par le minuteur visuel (0..3). */
  stepIndex: number;
}

export function SubmitProgressOverlay({ open, stepIndex }: SubmitProgressOverlayProps) {
  const [reassuranceIndex, setReassuranceIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setReassuranceIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setReassuranceIndex((i) => (i + 1) % REASSURANCE_MESSAGES.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-lagoon/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm mx-4 rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <div className="flex flex-col items-center mb-5">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 animate-pulse">
            <span className="text-primary font-bold text-lg">R</span>
          </div>
          <p className="text-sm font-semibold text-foreground">Traitement de votre demande</p>
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ul className="space-y-3">
          {STEPS.map((step, i) => {
            const isDone = i < stepIndex;
            const isActive = i === stepIndex;
            const { Icon } = step;
            return (
              <li key={step.label} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                    isDone
                      ? "bg-success text-success-foreground"
                      : isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground/50"
                  )}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 animate-in zoom-in duration-300" />
                  ) : (
                    <Icon className={cn("h-3.5 w-3.5", isActive && "animate-pulse")} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm transition-colors duration-300",
                    isDone
                      ? "text-muted-foreground line-through"
                      : isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground/70 text-center mt-5 h-4">
          {stepIndex >= STEPS.length - 1 ? REASSURANCE_MESSAGES[reassuranceIndex] : ""}
        </p>
      </div>
    </div>
  );
}
