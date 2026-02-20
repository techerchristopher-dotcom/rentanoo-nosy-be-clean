import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MultiVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueWithOne: () => void;
  selectedVehicleImage?: string;
  selectedVehicleName?: string;
}

export const MultiVehicleModal: React.FC<MultiVehicleModalProps> = ({
  isOpen,
  onClose,
  onContinueWithOne,
  selectedVehicleImage,
  selectedVehicleName
}) => {
  console.log('🎭 [DEBUG] MultiVehicleModal rendering');
  console.log('🎭 [DEBUG] isOpen:', isOpen);
  console.log('🎭 [DEBUG] onContinueWithOne:', typeof onContinueWithOne);
  
  const navigate = useNavigate();

  const handleChooseMoreVehicles = () => {
    onClose();
    navigate("/");
  };

  const handleContinueWithOneVehicle = () => {
    console.log('🎭 [DEBUG] ===== DÉBUT handleContinueWithOneVehicle dans modal =====');
    console.log('🎭 [DEBUG] onContinueWithOne type:', typeof onContinueWithOne);
    onClose();
    console.log('🎭 [DEBUG] Appel onContinueWithOne...');
    onContinueWithOne();
    console.log('🎭 [DEBUG] ===== FIN handleContinueWithOneVehicle dans modal =====');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-lg w-full mx-4 p-0 gap-0 sm:rounded-2xl">
          <DialogTitle className="sr-only">Confirmez votre trajet plus vite en choisissant plus de véhicules</DialogTitle>
          <DialogDescription className="sr-only">
            Choisissez d'ajouter plus de véhicules pour augmenter vos chances d'acceptation ou envoyez directement votre demande pour le véhicule sélectionné.
          </DialogDescription>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 hover:bg-slate-200 p-2 transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>

          <div className="p-6 pb-8">
            {/* Visual Preview Section */}
            <div className="mb-8">
              <div className="flex justify-center gap-3 mb-6">
                {/* Selected vehicle */}
                <div className="relative">
                  <Card className="w-24 h-24 overflow-hidden border-2 border-primary">
                    {selectedVehicleImage ? (
                      <img 
                        src={selectedVehicleImage} 
                        alt={selectedVehicleName || "Véhicule sélectionné"}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary rounded"></div>
                      </div>
                    )}
                  </Card>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs text-primary-foreground font-bold">✓</span>
                  </div>
                </div>

                {/* Empty slots */}
                {[1, 2].map((index) => (
                  <Card key={index} className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                    <Plus className="h-6 w-6 text-muted-foreground/50" />
                  </Card>
                ))}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground mb-6 text-center leading-tight">
              Confirmez votre trajet plus vite en choisissant plus de véhicules
            </h2>

            {/* Explanatory text */}
            <div className="space-y-4 mb-8 text-muted-foreground">
              <p>
                Pour que votre trajet ait lieu, le propriétaire doit accepter votre demande de location.
              </p>
              
              <p>
                Augmentez vos chances que votre demande soit acceptée rapidement en ajoutant 2 véhicules de propriétaires différents.
              </p>
              
              <p className="text-sm text-muted-foreground/80">
                Quand un propriétaire acceptera, nous vous préviendrons pour que vous puissiez payer et ainsi confirmer la réservation.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleChooseMoreVehicles}
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-semibold py-3"
              >
                Choisir plus de véhicules
              </Button>
              
              <Button
                onClick={handleContinueWithOneVehicle}
                variant="outline"
                size="lg"
                className="w-full border-2 border-muted-foreground/20 text-muted-foreground hover:bg-muted/50 font-medium py-3"
              >
                Envoyer ma demande maintenant
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};