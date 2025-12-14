"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { ZoneCard } from "./ZoneCard";
import { CoffreCard } from "./CoffreCard";
import { Car } from "lucide-react";

export function ExteriorInspectionSection() {
  const form = useFormContext();

  // helpers pour accéder proprement aux valeurs
  const avant = form.watch("inspection_exterieure.avant");
  const coteDroit = form.watch("inspection_exterieure.cote_droit");
  const arriere = form.watch("inspection_exterieure.arriere");
  const coffre = form.watch("inspection_exterieure.coffre");
  const coteGauche = form.watch("inspection_exterieure.cote_gauche");

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          🚗 État extérieur & Coffre
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Inspectez l'état extérieur du véhicule et du coffre.
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-6">
        {/* 1. Avant du véhicule */}
        <ZoneCard
          stepNumber={1}
          title="Avant du véhicule"
          subtitle="Prends une photo claire de l'avant (pare-chocs, capot, phares)."
          photosValue={avant?.photo_zone || []}
          onPhotosChange={(next) =>
            form.setValue("inspection_exterieure.avant.photo_zone", next, {
              shouldDirty: true,
            })
          }
          degatPresentValue={avant?.degat_present ?? null}
          onDegatPresentChange={(val) =>
            form.setValue("inspection_exterieure.avant.degat_present", val, {
              shouldDirty: true,
            })
          }
          degatDescriptionValue={avant?.degat_description}
          onDegatDescriptionChange={(txt) =>
            form.setValue("inspection_exterieure.avant.degat_description", txt, {
              shouldDirty: true,
            })
          }
          degatPhotosValue={avant?.degat_photos || []}
          onDegatPhotosChange={(next) =>
            form.setValue("inspection_exterieure.avant.degat_photos", next, {
              shouldDirty: true,
            })
          }
        />

        {/* Fil conducteur */}
        <div className="flex justify-center">
          <div className="h-8 w-px bg-gray-300" />
        </div>

        {/* 2. Côté droit */}
        <ZoneCard
          stepNumber={2}
          title="Côté droit"
          subtitle="Photo du côté droit (portes, aile, rétro). N'oublie pas les jantes."
          photosValue={coteDroit?.photo_zone || []}
          onPhotosChange={(next) =>
            form.setValue("inspection_exterieure.cote_droit.photo_zone", next, {
              shouldDirty: true,
            })
          }
          degatPresentValue={coteDroit?.degat_present ?? null}
          onDegatPresentChange={(val) =>
            form.setValue("inspection_exterieure.cote_droit.degat_present", val, {
              shouldDirty: true,
            })
          }
          degatDescriptionValue={coteDroit?.degat_description}
          onDegatDescriptionChange={(txt) =>
            form.setValue(
              "inspection_exterieure.cote_droit.degat_description",
              txt,
              { shouldDirty: true }
            )
          }
          degatPhotosValue={coteDroit?.degat_photos || []}
          onDegatPhotosChange={(next) =>
            form.setValue("inspection_exterieure.cote_droit.degat_photos", next, {
              shouldDirty: true,
            })
          }
          janteAvLabel="Jante avant droite"
          janteAvValue={coteDroit?.jante_av_droite || []}
          onJanteAvChange={(next) =>
            form.setValue(
              "inspection_exterieure.cote_droit.jante_av_droite",
              next,
              { shouldDirty: true }
            )
          }
          janteArLabel="Jante arrière droite"
          janteArValue={coteDroit?.jante_ar_droite || []}
          onJanteArChange={(next) =>
            form.setValue(
              "inspection_exterieure.cote_droit.jante_ar_droite",
              next,
              { shouldDirty: true }
            )
          }
        />

        {/* Fil conducteur */}
        <div className="flex justify-center">
          <div className="h-8 w-px bg-gray-300" />
        </div>

        {/* 3. Arrière du véhicule */}
        <ZoneCard
          stepNumber={3}
          title="Arrière du véhicule"
          subtitle="Photo de l'arrière (pare-chocs arrière, coffre fermé, feux)."
          photosValue={arriere?.photo_zone || []}
          onPhotosChange={(next) =>
            form.setValue("inspection_exterieure.arriere.photo_zone", next, {
              shouldDirty: true,
            })
          }
          degatPresentValue={arriere?.degat_present ?? null}
          onDegatPresentChange={(val) =>
            form.setValue("inspection_exterieure.arriere.degat_present", val, {
              shouldDirty: true,
            })
          }
          degatDescriptionValue={arriere?.degat_description}
          onDegatDescriptionChange={(txt) =>
            form.setValue(
              "inspection_exterieure.arriere.degat_description",
              txt,
              { shouldDirty: true }
            )
          }
          degatPhotosValue={arriere?.degat_photos || []}
          onDegatPhotosChange={(next) =>
            form.setValue("inspection_exterieure.arriere.degat_photos", next, {
              shouldDirty: true,
            })
          }
        />

        {/* Fil conducteur */}
        <div className="flex justify-center">
          <div className="h-8 w-px bg-gray-300" />
        </div>

        {/* 4. Coffre & équipements */}
        <CoffreCard
          stepNumber={4}
          photoCoffre={coffre?.photo_coffre_ouvert || []}
          onPhotoCoffreChange={(next) =>
            form.setValue(
              "inspection_exterieure.coffre.photo_coffre_ouvert",
              next,
              { shouldDirty: true }
            )
          }
          giletTrianglePresent={coffre?.gilet_triangle_present ?? null}
          onGiletTriangleChange={(val) =>
            form.setValue(
              "inspection_exterieure.coffre.gilet_triangle_present",
              val,
              { shouldDirty: true }
            )
          }
          roueSecours={coffre?.roue_secours ?? null}
          onRoueSecoursChange={(val) =>
            form.setValue("inspection_exterieure.coffre.roue_secours", val, {
              shouldDirty: true,
            })
          }
          cableRechargePresent={coffre?.cable_recharge_present ?? null}
          onCableRechargeChange={(val) =>
            form.setValue(
              "inspection_exterieure.coffre.cable_recharge_present",
              val,
              { shouldDirty: true }
            )
          }
          photosAccessoires={coffre?.photos_accessoires || []}
          onPhotosAccessoiresChange={(next) =>
            form.setValue(
              "inspection_exterieure.coffre.photos_accessoires",
              next,
              { shouldDirty: true }
            )
          }
        />

        {/* Fil conducteur */}
        <div className="flex justify-center">
          <div className="h-8 w-px bg-gray-300" />
        </div>

        {/* 5. Côté gauche */}
        <ZoneCard
          stepNumber={5}
          title="Côté gauche"
          subtitle="Photo du côté gauche (portes, aile, rétro). N'oublie pas les jantes."
          photosValue={coteGauche?.photo_zone || []}
          onPhotosChange={(next) =>
            form.setValue("inspection_exterieure.cote_gauche.photo_zone", next, {
              shouldDirty: true,
            })
          }
          degatPresentValue={coteGauche?.degat_present ?? null}
          onDegatPresentChange={(val) =>
            form.setValue("inspection_exterieure.cote_gauche.degat_present", val, {
              shouldDirty: true,
            })
          }
          degatDescriptionValue={coteGauche?.degat_description}
          onDegatDescriptionChange={(txt) =>
            form.setValue(
              "inspection_exterieure.cote_gauche.degat_description",
              txt,
              { shouldDirty: true }
            )
          }
          degatPhotosValue={coteGauche?.degat_photos || []}
          onDegatPhotosChange={(next) =>
            form.setValue(
              "inspection_exterieure.cote_gauche.degat_photos",
              next,
              { shouldDirty: true }
            )
          }
          janteAvLabel="Jante avant gauche"
          janteAvValue={coteGauche?.jante_av_gauche || []}
          onJanteAvChange={(next) =>
            form.setValue(
              "inspection_exterieure.cote_gauche.jante_av_gauche",
              next,
              { shouldDirty: true }
            )
          }
          janteArLabel="Jante arrière gauche"
          janteArValue={coteGauche?.jante_ar_gauche || []}
          onJanteArChange={(next) =>
            form.setValue(
              "inspection_exterieure.cote_gauche.jante_ar_gauche",
              next,
              { shouldDirty: true }
            )
          }
        />
      </div>
    </div>
  );
}
