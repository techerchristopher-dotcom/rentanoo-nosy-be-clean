"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Métadonnées des étapes
const STEPS = [
  {
    index: 1,
    title: "Avant du véhicule",
    subtitle: "Prenez une photo claire de l'avant (pare-chocs, capot, phares).",
    nextStepLabel: "Passer à l'étape 2 : Côté droit",
  },
  {
    index: 2,
    title: "Côté droit",
    subtitle: "Photo du côté droit (portes, aile, rétro). N'oublie pas les jantes.",
    nextStepLabel: "Passer à l'étape 3 : Arrière du véhicule",
  },
  {
    index: 3,
    title: "Arrière du véhicule",
    subtitle: "Photo de l'arrière (pare-chocs arrière, coffre fermé, feux).",
    nextStepLabel: "Passer à l'étape 4 : Coffre & équipements",
  },
  {
    index: 4,
    title: "Coffre & équipements",
    subtitle: "Ouvrez le coffre et vérifiez les équipements obligatoires.",
    nextStepLabel: "Passer à l'étape 5 : Côté gauche",
  },
  {
    index: 5,
    title: "Côté gauche",
    subtitle: "Photo du côté gauche (portes, aile, rétro). N'oublie pas les jantes.",
    nextStepLabel: "Terminer l'inspection extérieure ✅",
  },
] as const;

// Types pour les états locaux
type DamageState = "yes" | "no" | null;

interface StepPanelProps {
  index: number;
  title: string;
  subtitle: string;
  isActive: boolean;
  isLast: boolean;
  onHeaderClick: () => void;
  onNext: () => void;
  headerRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
  nextStepLabel: string;
}

function StepPanel({
  index,
  title,
  subtitle,
  isActive,
  isLast,
  onHeaderClick,
  onNext,
  headerRef,
  children,
  nextStepLabel,
}: StepPanelProps) {
  return (
    <div className="w-full">
      {/* HEADER - TOUJOURS RENDU */}
      <div
        ref={headerRef}
        role="button"
        tabIndex={0}
        aria-expanded={isActive}
        aria-controls={`step-content-${index}`}
        onClick={onHeaderClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onHeaderClick();
          }
        }}
        className={cn(
          "w-full rounded-2xl border bg-white p-4 shadow-sm",
          "flex items-start gap-3 cursor-pointer",
          "transition-colors hover:bg-gray-50 active:bg-gray-100"
        )}
      >
        {/* Badge numéro */}
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-600 text-white text-sm font-bold leading-none shrink-0">
          {index}
        </div>

        {/* Titre et sous-titre */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>

        {/* Chevron */}
        <div
          className={cn(
            "flex items-center justify-center shrink-0 transition-transform duration-300",
            isActive && "rotate-180"
          )}
        >
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* CONTENU DÉTAILLÉ - SEULEMENT SI ACTIF */}
      {isActive && (
        <div
          id={`step-content-${index}`}
          className="overflow-hidden transition-all duration-300 ease-in-out max-h-[2000px] opacity-100 mt-3"
          aria-hidden={false}
        >
          <Card className="rounded-2xl shadow-sm border">
            <CardContent className="p-4 space-y-4">
              {children}

              {/* Bouton CTA */}
              <Button
                onClick={onNext}
                size="lg"
                className="w-full mt-6"
              >
                {nextStepLabel}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Composant pour la question dégâts
function DamageQuestion({
  question,
}: {
  question: string;
}) {
  const [value, setValue] = useState<DamageState>(null);

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
      <label className="text-sm font-medium text-gray-900">{question}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setValue(value === "yes" ? null : "yes")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors",
            value === "yes"
              ? "bg-red-100 border-red-400 text-red-700"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          Oui, il y a un dégât
        </button>
        <button
          type="button"
          onClick={() => setValue(value === "no" ? null : "no")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-full border text-sm font-medium transition-colors",
            value === "no"
              ? "bg-green-100 border-green-400 text-green-700"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
        >
          Non, tout est OK
        </button>
      </div>
    </div>
  );
}

// Composant pour le bloc photo
function PhotoBlock({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-900">{label}</label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-3 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Camera className="w-4 h-4 text-gray-600" />
        <span>Prendre une photo</span>
      </button>
      <p className="text-xs text-gray-500">
        Aucune photo pour l'instant. Elle s'affichera ici.
      </p>
    </div>
  );
}

// Composant pour les jantes
function JantesBlock({ side }: { side: "droite" | "gauche" }) {
  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 pt-4">
      <PhotoBlock
        label={`Jante avant ${side}`}
        description="Zoome sur la jante avant"
      />
      <PhotoBlock
        label={`Jante arrière ${side}`}
        description="Zoome sur la jante arrière"
      />
    </div>
  );
}

export default function ExteriorInspectionAccordion() {
  // STATE UNIQUE - Source de vérité
  const [activeStep, setActiveStep] = useState<number>(1);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialiser les refs
  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, STEPS.length);
  }, []);

  // Scroll automatique vers l'étape active APRÈS le changement
  useEffect(() => {
    const currentRef = stepRefs.current[activeStep - 1];
    if (currentRef) {
      // Petit délai pour laisser le DOM se mettre à jour
      const timeoutId = setTimeout(() => {
        currentRef.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [activeStep]);

  // Handler pour clic sur header
  const handleHeaderClick = (stepIndex: number) => {
    setActiveStep(stepIndex);
  };

  // Handler pour CTA "Passer à l'étape suivante"
  const handleNext = (currentStep: number) => {
    if (currentStep < STEPS.length) {
      // Passage immédiat à l'étape suivante
      setActiveStep(currentStep + 1);
    } else {
      // Dernière étape : terminer
      console.log("Inspection extérieure terminée");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* En-tête de section */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          🚗 Inspection extérieure
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Parcourez le véhicule étape par étape
        </p>
      </div>

      {/* Liste des étapes - SEULE L'ÉTAPE ACTIVE A SON CONTENU MONTÉ */}
      <div className="space-y-2">
        {/* Étape 1: Avant du véhicule */}
        <StepPanel
          index={1}
          title={STEPS[0].title}
          subtitle={STEPS[0].subtitle}
          isActive={activeStep === 1}
          isLast={false}
          onHeaderClick={() => handleHeaderClick(1)}
          onNext={() => handleNext(1)}
          nextStepLabel={STEPS[0].nextStepLabel}
          headerRef={(el) => {
            stepRefs.current[0] = el;
          }}
        >
          <PhotoBlock
            label="Photo de la zone"
            description="Prends une photo générale de cette zone du véhicule."
          />
          <DamageQuestion question="Dégât visible ?" />
        </StepPanel>

        {/* Étape 2: Côté droit */}
        <StepPanel
          index={2}
          title={STEPS[1].title}
          subtitle={STEPS[1].subtitle}
          isActive={activeStep === 2}
          isLast={false}
          onHeaderClick={() => handleHeaderClick(2)}
          onNext={() => handleNext(2)}
          nextStepLabel={STEPS[1].nextStepLabel}
          headerRef={(el) => {
            stepRefs.current[1] = el;
          }}
        >
          <PhotoBlock
            label="Photo de la zone"
            description="Prends une photo générale de cette zone du véhicule."
          />
          <JantesBlock side="droite" />
          <DamageQuestion question="Dégât visible ?" />
        </StepPanel>

        {/* Étape 3: Arrière du véhicule */}
        <StepPanel
          index={3}
          title={STEPS[2].title}
          subtitle={STEPS[2].subtitle}
          isActive={activeStep === 3}
          isLast={false}
          onHeaderClick={() => handleHeaderClick(3)}
          onNext={() => handleNext(3)}
          nextStepLabel={STEPS[2].nextStepLabel}
          headerRef={(el) => {
            stepRefs.current[2] = el;
          }}
        >
          <PhotoBlock
            label="Photo de la zone"
            description="Prends une photo générale de cette zone du véhicule."
          />
          <DamageQuestion question="Dégât visible ?" />
        </StepPanel>

        {/* Étape 4: Coffre & équipements */}
        <StepPanel
          index={4}
          title={STEPS[3].title}
          subtitle={STEPS[3].subtitle}
          isActive={activeStep === 4}
          isLast={false}
          onHeaderClick={() => handleHeaderClick(4)}
          onNext={() => handleNext(4)}
          nextStepLabel={STEPS[3].nextStepLabel}
          headerRef={(el) => {
            stepRefs.current[3] = el;
          }}
        >
          <PhotoBlock
            label="Photo du coffre ouvert"
            description="Ouvrez le coffre et prenez une photo de l'intérieur"
          />
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900">
              Vérification des équipements obligatoires
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-gray-300 bg-white" />
                <span>Triangle de signalisation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-gray-300 bg-white" />
                <span>Gilet de sécurité</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-gray-300 bg-white" />
                <span>Roue de secours / Kit anti-crevaison</span>
              </div>
            </div>
          </div>
          <DamageQuestion question="Tout l'équipement obligatoire est-il présent ?" />
        </StepPanel>

        {/* Étape 5: Côté gauche */}
        <StepPanel
          index={5}
          title={STEPS[4].title}
          subtitle={STEPS[4].subtitle}
          isActive={activeStep === 5}
          isLast={true}
          onHeaderClick={() => handleHeaderClick(5)}
          onNext={() => handleNext(5)}
          nextStepLabel={STEPS[4].nextStepLabel}
          headerRef={(el) => {
            stepRefs.current[4] = el;
          }}
        >
          <PhotoBlock
            label="Photo de la zone"
            description="Prends une photo générale de cette zone du véhicule."
          />
          <JantesBlock side="gauche" />
          <DamageQuestion question="Dégât visible ?" />
        </StepPanel>
      </div>
    </div>
  );
}
