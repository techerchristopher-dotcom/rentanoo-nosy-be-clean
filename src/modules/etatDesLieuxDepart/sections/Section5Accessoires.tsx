import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Shield, Triangle, Circle, Wrench, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { saveStep5Draft } from "@/services/checkinDepartService";

interface Section5AccessoiresProps {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (checkinId: string) => void;
  onComplete?: () => void;
}

export default function Section5Accessoires({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  onComplete,
}: Section5AccessoiresProps) {
  const { control, getValues } = useFormContext();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * ⭐ CTA global : Terminer les accessoires et passer à la validation finale
   * Pattern aligné sur Step 3/Step 4 : validation → toast → save → navigation
   */
  const handleCompleteStep5AndGoNext = async () => {
    setIsSaving(true);
    try {
      // Récupérer les données du formulaire
      const formValues = getValues();
      const accessoires = formValues.accessoires || {};

      // Construire le payload Step 5
      const step5Payload = {
        completedAt: new Date().toISOString(), // ⭐ Pour la progression
        accessoires: {
          gilet: accessoires.gilet || false,
          triangle: accessoires.triangle || false,
          roueSecours: accessoires.roueSecours || false,
          cric: accessoires.cric || false,
          commentaire: accessoires.commentaire || undefined,
        },
      };

      const result = await saveStep5Draft({
        bookingId,
        ownerId,
        renterId,
        checkinId: checkinId || null,
        step5: step5Payload,
      });

      // Propager le checkinId
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
      }

      toast.success('✅ Accessoires sauvegardés !', {
        description: 'Vos données ont été enregistrées avec succès.',
      });

      // Navigation vers l'étape suivante
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('[Step5] ❌ Erreur sauvegarde:', error);
      toast.error('❌ Erreur lors de la sauvegarde', {
        description: error.message || 'Vos données n\'ont pas été perdues, vous pouvez réessayer.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const accessoires = [
    {
      name: "gilet",
      label: "Gilet de sécurité",
      icon: Shield,
    },
    {
      name: "triangle",
      label: "Triangle de signalisation",
      icon: Triangle,
    },
    {
      name: "roueSecours",
      label: "Roue de secours",
      icon: Circle,
    },
    {
      name: "cric",
      label: "Cric",
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Accessoires & Équipements
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Vérifiez la présence des accessoires et équipements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventaire des accessoires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accessoires.map((accessoire) => {
              const Icon = accessoire.icon;
              return (
                <FormField
                  key={accessoire.name}
                  control={control}
                  name={`accessoires.${accessoire.name}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <FormLabel className="cursor-pointer">
                          {accessoire.label}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Commentaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="accessoires.commentaire"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commentaire sur les accessoires (facultatif)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ajoutez un commentaire sur les accessoires présents ou manquants..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* ⭐ CTA global : Terminer les accessoires et passer à la validation finale */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleCompleteStep5AndGoNext}
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
              <span className="hidden sm:inline">Terminer les accessoires et passer à la validation & signature</span>
              <span className="sm:hidden">Valider & continuer</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
