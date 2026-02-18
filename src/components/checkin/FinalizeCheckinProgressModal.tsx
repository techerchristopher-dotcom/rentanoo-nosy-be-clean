import "@/styles/modal-animations.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface FinalizeCheckinProgressModalProps {
  open: boolean;
  progress: number; // 0 → 100 (réel, piloté par parent)
  label: string; // Texte de l'étape
  error?: string | null;
  onClose?: () => void; // Optionnel pour erreur uniquement
}

// ⭐ Étapes de finalisation avec seuils
const FINALIZE_STEPS = [
  { key: "prepare", label: "Préparation des données", threshold: 10 },
  { key: "signatures", label: "Enregistrement des signatures", threshold: 30 },
  { key: "snapshot", label: "Création du snapshot légal", threshold: 60 },
  { key: "pdf", label: "Génération des documents", threshold: 90 },
];

// ⭐ Seuil de détection de stall (ms)
const STALL_THRESHOLD_MS = 1500;
// ⭐ Vitesse de micro-creep (par seconde)
const CREEP_SPEED_PER_SEC = 0.5; // 0.5% par seconde max

export function FinalizeCheckinProgressModal({
  open,
  progress,
  label,
  error,
  onClose,
}: FinalizeCheckinProgressModalProps) {
  const isComplete = progress === 100 && !error;
  const hasError = !!error;
  
  // ⭐ États pour anti-stall
  const [displayProgress, setDisplayProgress] = useState(0); // Progress affiché (animé)
  const [isBusy, setIsBusy] = useState(false); // Mode "busy" si stall détecté
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // ⭐ Refs pour détecter les stalls
  const lastProgressChangeTs = useRef<number>(Date.now());
  const lastProgressValue = useRef<number>(progress);
  const creepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ⭐ Détecter les changements de progress réel
  useEffect(() => {
    if (!open) {
      setDisplayProgress(0);
      setIsBusy(false);
      setCompletedSteps(new Set());
      lastProgressChangeTs.current = Date.now();
      lastProgressValue.current = 0;
      if (creepIntervalRef.current) {
        clearInterval(creepIntervalRef.current);
        creepIntervalRef.current = null;
      }
      return;
    }

    // Si progress a changé
    if (progress !== lastProgressValue.current) {
      lastProgressChangeTs.current = Date.now();
      lastProgressValue.current = progress;
      setIsBusy(false);
    }
  }, [progress, open]);

  // ⭐ Animation fluide de displayProgress vers progress réel
  useEffect(() => {
    if (!open) return;

    const duration = 500; // ms pour animation plus douce
    const startProgress = displayProgress;
    const targetProgress = progress;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      // Easing cubic-bezier(.22,1,.36,1) - effet inertiel premium
      const eased = ratio < 1 
        ? 1 - Math.pow(1 - ratio, 3) * (1 - ratio * 0.22)
        : 1;
      const current = startProgress + (targetProgress - startProgress) * eased;
      setDisplayProgress(current);

      if (ratio < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [progress, open]);

  // ⭐ Détecter les stalls et activer mode busy
  useEffect(() => {
    if (!open || hasError || isComplete) {
      setIsBusy(false);
      if (creepIntervalRef.current) {
        clearInterval(creepIntervalRef.current);
        creepIntervalRef.current = null;
      }
      return;
    }

    const checkStall = () => {
      const timeSinceLastChange = Date.now() - lastProgressChangeTs.current;
      const shouldBeBusy = timeSinceLastChange > STALL_THRESHOLD_MS && progress < 95;
      
      if (shouldBeBusy && !isBusy) {
        setIsBusy(true);
      } else if (!shouldBeBusy && isBusy) {
        setIsBusy(false);
      }
    };

    const interval = setInterval(checkStall, 250);
    return () => clearInterval(interval);
  }, [open, hasError, isComplete, progress, isBusy]);

  // ⭐ Micro-creep contrôlé quand busy
  useEffect(() => {
    if (!open || hasError || isComplete || !isBusy) {
      if (creepIntervalRef.current) {
        clearInterval(creepIntervalRef.current);
        creepIntervalRef.current = null;
      }
      return;
    }

    // Trouver le prochain seuil
    const nextStep = FINALIZE_STEPS.find(step => step.threshold > progress);
    const cap = nextStep 
      ? nextStep.threshold - 1 
      : Math.min(95, progress + 5);

    creepIntervalRef.current = setInterval(() => {
      setDisplayProgress((current) => {
        // Ne jamais dépasser le cap ni le progress réel
        const maxAllowed = Math.min(cap, progress);
        if (current >= maxAllowed) {
          return current;
        }
        // Micro-creep : 0.5% par seconde = 0.125% toutes les 250ms
        const increment = (CREEP_SPEED_PER_SEC * 250) / 1000;
        return Math.min(current + increment, maxAllowed);
      });
    }, 250);

    return () => {
      if (creepIntervalRef.current) {
        clearInterval(creepIntervalRef.current);
        creepIntervalRef.current = null;
      }
    };
  }, [open, hasError, isComplete, isBusy, progress]);

  // Détecter les nouvelles étapes complétées pour animation
  useEffect(() => {
    const newCompleted = new Set(completedSteps);
    FINALIZE_STEPS.forEach((step) => {
      if (progress >= step.threshold && !completedSteps.has(step.key)) {
        newCompleted.add(step.key);
      }
    });
    if (newCompleted.size !== completedSteps.size) {
      setCompletedSteps(newCompleted);
    }
  }, [progress, completedSteps]);

  // Calcul du cercle SVG (stroke-dashoffset) - utiliser displayProgress
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayProgress / 100) * circumference;

  // Déterminer quelle étape est active
  const activeStepIndex = FINALIZE_STEPS.findIndex(
    (step, index) => progress >= step.threshold && (index === FINALIZE_STEPS.length - 1 || progress < FINALIZE_STEPS[index + 1].threshold)
  );
  const activeStep = activeStepIndex >= 0 ? FINALIZE_STEPS[activeStepIndex] : null;

  return (
    <Dialog open={open} modal={true}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="space-y-6 py-4">
          {/* Titre */}
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {hasError ? "Erreur lors de la finalisation" : "Finalisation de l'état des lieux"}
            </h2>
          </div>

          {/* Contenu selon l'état */}
          {hasError ? (
            // État erreur
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              {onClose && (
                <div className="flex justify-center pt-2">
                  <Button onClick={onClose} variant="default" className="w-full">
                    Retour aux réservations
                  </Button>
                </div>
              )}
            </div>
          ) : isComplete ? (
            // ⭐ État succès final (avant redirection) - Animation premium
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="relative">
                {/* Cercle de succès avec glow */}
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-green-100"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    className="text-green-600 transition-all duration-500"
                    style={{
                      filter: "drop-shadow(0 0 16px hsl(142 76% 36% / 0.8))",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-green-600 p-3 shadow-[0_0_24px_hsl(142_76%_36%_/_0.8)] animate-scale-in">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-green-700">
                  État des lieux finalisé avec succès
                </p>
                <p className="text-sm text-muted-foreground">Redirection en cours…</p>
              </div>
            </div>
          ) : (
            // ⭐ État en cours avec cercle animé premium et étapes
            <div className="space-y-6">
              {/* Cercle SVG animé avec glow */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Cercle de fond (track) */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-gray-200 dark:text-gray-800"
                    />
                    {/* Cercle de progression avec glow */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      className={cn(
                        "text-primary transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
                        displayProgress < 100 && (isBusy ? "animate-pulse-glow-busy" : "animate-pulse-glow")
                      )}
                      style={{
                        filter: displayProgress < 100 
                          ? isBusy
                            ? "drop-shadow(0 0 16px hsl(var(--primary) / 0.8))"
                            : "drop-shadow(0 0 12px hsl(var(--primary) / 0.6))"
                          : "none",
                      }}
                    />
                    {/* ⭐ Shimmer discret en arrière-plan si busy */}
                    {isBusy && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-primary/10 animate-shimmer"
                        style={{
                          strokeDasharray: `${circumference * 0.3} ${circumference * 0.7}`,
                          strokeDashoffset: offset * 0.5,
                        }}
                      />
                    )}
                  </svg>
                  {/* Pourcentage au centre */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary tabular-nums">
                      {Math.round(displayProgress)}%
                    </span>
                  </div>
                  {/* ⭐ Anneau "busy" en rotation si stall détecté */}
                  {isBusy && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="w-32 h-32 transform -rotate-90 animate-spin-slow" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r={radius + 4}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="8 16"
                          className="text-primary/20"
                          style={{
                            transformOrigin: "60px 60px",
                          }}
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Étapes avec checks animés */}
              <ul className="space-y-3">
                {FINALIZE_STEPS.map((step) => {
                  const isCompleted = progress >= step.threshold;
                  const isActive = activeStep?.key === step.key && !isCompleted;
                  const justCompleted = completedSteps.has(step.key) && isCompleted;

                  return (
                    <li
                      key={step.key}
                      className={cn(
                        "flex items-center gap-3 text-sm transition-all duration-500",
                        isCompleted ? "opacity-100" : isActive ? "opacity-100" : "opacity-50"
                      )}
                    >
                      {/* Icône étape avec animation scale-in */}
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-500 flex-shrink-0",
                          isCompleted
                            ? "bg-primary text-white scale-110 shadow-[0_0_12px_hsl(var(--primary)/0.7)] border-primary"
                            : isActive
                            ? "border-primary"
                            : "border-gray-300"
                        )}
                        style={
                          justCompleted
                            ? {
                                animation: "scale-in 0.4s ease-out forwards",
                              }
                            : undefined
                        }
                      >
                        {isCompleted ? (
                          <Check className="h-3 w-3" style={{ animation: "scale-in 0.4s ease-out forwards" }} />
                        ) : isActive ? (
                          <Loader2 className="h-3 w-3 text-primary animate-spin" />
                        ) : null}
                      </span>

                      {/* Label étape */}
                      <span
                        className={cn(
                          "transition-colors duration-500",
                          isCompleted
                            ? "text-primary font-medium"
                            : isActive
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Label actuel ou message busy */}
              <div className="text-center animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                {isBusy ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-primary">
                      Toujours en cours — traitement en arrière-plan
                      <span className="inline-block ml-1 animate-dots">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Cette étape peut prendre quelques secondes.
                    </p>
                  </div>
                ) : activeStep ? (
                  <p className="text-sm font-medium text-primary">{label}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
        {/* Bouton fermer conditionnel (uniquement en erreur) */}
        {hasError && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

