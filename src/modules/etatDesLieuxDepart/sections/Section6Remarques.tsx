import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { saveStep6Draft } from "@/services/checkinDepartService";

interface Section6RemarquesProps {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (checkinId: string) => void;
  onComplete?: () => void;
}

export default function Section6Remarques({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  onComplete,
}: Section6RemarquesProps) {
  const { control, getValues, trigger } = useFormContext();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * ⭐ CTA global : Terminer les remarques et passer à la validation finale
   * Pattern aligné sur Step 3/Step 4/Step 5 : validation → toast → save → navigation
   */
  const handleCompleteStep6AndGoNext = async () => {
    setIsSaving(true);
    try {
      // 1. Validation locale (optionnelle, car les remarques sont facultatives)
      await trigger("remarques.observations");
      
      // Récupérer les données du formulaire
      const formValues = getValues();
      const remarques = formValues.remarques || {};

      // 2. Construction du payload Step 6
      const step6Payload = {
        completedAt: new Date().toISOString(), // ⭐ Pour la progression
        remarques: {
          observations: remarques.observations || undefined,
        },
      };

      // 3. Appel du service de sauvegarde
      const result = await saveStep6Draft({
        bookingId,
        ownerId,
        renterId,
        checkinId: checkinId || null,
        step6: step6Payload,
      });

      // Propager le checkinId
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
      }

      toast.success("✅ Remarques sauvegardées !", {
        description: "Vos observations ont été enregistrées avec succès.",
      });

      // 4. Navigation vers Step 7
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error("[Step6] ❌ Erreur sauvegarde:", error);
      toast.error("❌ Erreur lors de la sauvegarde", {
        description: error.message || "Vos données n'ont pas été perdues, vous pouvez réessayer.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Remarques & Observations
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Ajoutez vos remarques et observations sur l'état du véhicule
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="remarques.observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarques</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez toute observation particulière sur l'état du véhicule..."
                    className="min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* ⭐ CTA global : Terminer les remarques et passer à la validation & signature */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleCompleteStep6AndGoNext}
          disabled={isSaving}
          className="bg-gradient-lagoon hover:opacity-90 text-white font-semibold shadow-lagoon flex items-center gap-2 w-full sm:w-auto"
          size="lg"
        >
          {isSaving ? (
            <>
              <span className="hidden sm:inline">⏳ Sauvegarde en cours...</span>
              <span className="sm:hidden">⏳ Sauvegarde...</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Terminer les remarques et passer à la validation & signature</span>
              <span className="sm:hidden">Valider & continuer</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

