import { Car, Bike, Hotel } from "lucide-react";
import { MdTerrain } from "react-icons/md";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VehicleTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCar: () => void;
  onSelectMoto: () => void;
  onSelectQuad: () => void;
  onSelectAccommodation: () => void;
}

export function VehicleTypeModal({
  open,
  onOpenChange,
  onSelectCar,
  onSelectMoto,
  onSelectQuad,
  onSelectAccommodation,
}: VehicleTypeModalProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(
              "ownerVehicles.vehicleTypeModal.title",
              "Quel type de véhicule souhaitez-vous ajouter ?"
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              "ownerVehicles.vehicleTypeModal.description",
              "Choisissez le type de véhicule que vous voulez publier sur la plateforme."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4 grid-cols-2 md:grid-cols-4">
          {/* Option Voiture */}
          <button
            type="button"
            onClick={onSelectCar}
            className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 px-4 py-6 text-center hover:border-primary hover:bg-background transition-colors"
          >
            <div className="mb-3 rounded-full bg-primary-soft/30 p-3">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div className="font-semibold">
              {t(
                "ownerVehicles.vehicleTypeModal.carLabel",
                "Voiture"
              )}
            </div>
          </button>

          {/* Option Moto / Scooter */}
          <button
            type="button"
            onClick={onSelectMoto}
            className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 px-4 py-6 text-center hover:border-primary hover:bg-background transition-colors"
          >
            <div className="mb-3 rounded-full bg-primary-soft/30 p-3">
              <Bike className="h-6 w-6 text-primary" />
            </div>
            <div className="font-semibold">
              {t(
                "ownerVehicles.vehicleTypeModal.motoLabel",
                "Moto / Scooter"
              )}
            </div>
          </button>

          {/* Option Quad / Buggy */}
          <button
            type="button"
            onClick={onSelectQuad}
            className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 px-4 py-6 text-center hover:border-primary hover:bg-background transition-colors"
          >
            <div className="mb-3 rounded-full bg-primary-soft/30 p-3">
              <MdTerrain className="h-6 w-6 text-primary" />
            </div>
            <div className="font-semibold">
              {t("ownerVehicles.vehicleTypeModal.quadLabel", "Quad / Buggy")}
            </div>
          </button>

          {/* Option Hébergement */}
          <button
            type="button"
            onClick={onSelectAccommodation}
            className="flex flex-col items-center justify-center rounded-lg border bg-muted/40 px-4 py-6 text-center hover:border-primary hover:bg-background transition-colors"
          >
            <div className="mb-3 rounded-full bg-primary-soft/30 p-3">
              <Hotel className="h-6 w-6 text-primary" />
            </div>
            <div className="font-semibold">
              {t(
                "ownerVehicles.vehicleTypeModal.accommodationLabel",
                "Hébergement"
              )}
            </div>
          </button>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="ml-auto"
            onClick={() => onOpenChange(false)}
          >
            {t("ownerVehicles.vehicleTypeModal.cancel", "Annuler")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


