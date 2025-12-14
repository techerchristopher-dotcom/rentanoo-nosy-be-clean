import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare } from "lucide-react";

interface StepProps {
  departData: any;
  returnData: any;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
  bookingData?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string };
}

export default function Step6RemarquesRetour({ departData, setValue, watch }: StepProps) {
  // Extraction des remarques départ
  const departRemarques = departData?.step6?.remarques || {};
  const departObservations = departRemarques.observations || "";
  const departOwnerRemarks = departRemarques.ownerRemarks || "";
  const departRenterRemarks = departRemarques.renterRemarks || "";

  // Extraction des remarques retour depuis RHF
  const remarquesRetour = watch("returnData.step6.remarquesRetour") || {};
  const observations = remarquesRetour.observations || "";
  const observationsOwner = remarquesRetour.observationsOwner || "";
  const observationsRenter = remarquesRetour.observationsRenter || "";

  // Vérifier s'il y a des remarques départ à afficher
  const hasDepartRemarks = !!departObservations || !!departOwnerRemarks || !!departRenterRemarks;

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      {/* En-tête - Typographie mobile-first */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight sm:leading-none tracking-tight flex items-center gap-2">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">Remarques retour</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Ajoutez des observations générales sur le retour du véhicule.
        </p>
      </div>

      {/* Card : Remarques au départ (lecture seule) */}
      {hasDepartRemarks ? (
        <Card className="bg-muted/30">
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span>Remarques au départ (lecture seule)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-2 sm:space-y-3">
            {departObservations && (
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Remarques générales (départ)</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {departObservations}
                </p>
              </div>
            )}
            {departOwnerRemarks && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Remarques propriétaire (départ)</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {departOwnerRemarks}
                </p>
              </div>
            )}
            {departRenterRemarks && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Remarques locataire (départ)</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {departRenterRemarks}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Aucune remarque n'a été saisie au départ.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card : Remarques retour (éditable) */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Remarques retour</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
          {/* Champ observations générales */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">Remarques générales retour</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm min-h-[100px] sm:min-h-[120px]"
              value={observations}
              onChange={(e) =>
                setValue("returnData.step6.remarquesRetour.observations", e.target.value)
              }
              placeholder="Décrivez toute observation particulière sur l'état du véhicule au retour..."
            />
          </div>

          {/* Champ observations propriétaire */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">Remarques propriétaire retour</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
              value={observationsOwner}
              onChange={(e) =>
                setValue("returnData.step6.remarquesRetour.observationsOwner", e.target.value)
              }
              placeholder="Remarques spécifiques du propriétaire..."
            />
          </div>

          {/* Champ observations locataire */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">Remarques locataire retour</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
              value={observationsRenter}
              onChange={(e) =>
                setValue("returnData.step6.remarquesRetour.observationsRenter", e.target.value)
              }
              placeholder="Remarques spécifiques du locataire..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
