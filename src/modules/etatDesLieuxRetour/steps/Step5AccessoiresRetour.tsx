import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepProps {
  departData: any;
  returnData: any;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
  bookingData?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string };
  vehicleType?: string | null;
}

// Configuration des accessoires RETOUR
// VOITURE : liste actuelle inchangée (ordre et labels identiques).
const RETURN_CAR_ACCESSORY_KEYS = [
  { key: "gilet", label: "Gilet" },
  { key: "triangle", label: "Triangle" },
  { key: "roueSecours", label: "Roue de secours" },
  { key: "cric", label: "Cric" },
  { key: "cle", label: "Clé" },
  { key: "cable", label: "Câble" },
  { key: "manuel", label: "Manuel" },
  { key: "carteCarburant", label: "Carte carburant" },
];

// MOTO : liste issue du départ moto (seule source disponible dans le repo).
// Source : src/modules/etatDesLieuxDepartMoto/sections/Section5AccessoiresMoto.tsx lignes 45-90
const RETURN_MOTO_ACCESSORY_KEYS = [
  { key: "casque", label: "Casque" },
  { key: "gants", label: "Gants" },
  { key: "cadenas", label: "Cadenas antivol" },
  { key: "support_telephone", label: "Support téléphone" },
  { key: "top_case", label: "Top case / Coffre" },
  { key: "prise_usb", label: "Prise USB" },
  { key: "gilet_jaune", label: "Gilet jaune / Réfléchissant" },
  { key: "autre", label: "Autre accessoire" },
];

export default function Step5AccessoiresRetour({ departData, setValue, watch, vehicleType }: StepProps) {
  const departAccessoires = departData?.step5?.accessoires || {};

  const accessoiresRetour = watch("returnData.step5.accessoiresRetour") || {};
  const isSameAsDepart = accessoiresRetour.isSameAsDepart;
  const accessoires = accessoiresRetour.accessoires || {};
  const commentaireRetour = accessoiresRetour.commentaire || "";
  // hasDifferences = true seulement si isSameAsDepart est explicitement false
  const hasDifferences = isSameAsDepart === false;
  // isIdentical = true seulement si isSameAsDepart est explicitement true
  const isIdentical = isSameAsDepart === true;

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      {/* En-tête - Typographie mobile-first */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight sm:leading-none tracking-tight flex items-center gap-2">
          <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">Accessoires retour</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Comparez l'état des accessoires par rapport au départ. Indiquez les différences s'il y en a.
        </p>
      </div>

      {/* Card : Accessoires au départ (lecture seule) */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Accessoires au départ (lecture seule)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-2 sm:space-y-3">
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            {(vehicleType === "moto" ? RETURN_MOTO_ACCESSORY_KEYS : RETURN_CAR_ACCESSORY_KEYS).map((acc) => (
              <div key={acc.key} className="flex justify-between items-center py-1">
                <span>{acc.label}</span>
                <span className="font-medium">
                  {departAccessoires?.[acc.key] === true
                    ? "Oui"
                    : departAccessoires?.[acc.key] === false
                      ? "Non"
                      : "—"}
                </span>
              </div>
            ))}
          </div>
          {departAccessoires?.commentaire && (
            <div className="pt-2 border-t text-xs sm:text-sm text-muted-foreground">
              <p className="font-medium mb-1">Commentaire départ :</p>
              <p className="italic">{departAccessoires.commentaire}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sélecteur Accessoires identiques : deux boutons Oui/Non */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="text-xs sm:text-sm font-medium">Accessoires identiques au départ ?</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              // "Oui" = identiques au départ → isSameAsDepart = true, clear data
              setValue("returnData.step5.accessoiresRetour.isSameAsDepart", true);
              setValue("returnData.step5.accessoiresRetour.accessoires", {});
              setValue("returnData.step5.accessoiresRetour.commentaire", "");
            }}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors border ${
              isIdentical
                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Oui
          </button>
          <button
            type="button"
            onClick={() => {
              // "Non" = il y a des différences → isSameAsDepart = false
              setValue("returnData.step5.accessoiresRetour.isSameAsDepart", false);
            }}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors border ${
              hasDifferences
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Non
          </button>
        </div>
      </div>

      {/* Formulaire différences */}
      {hasDifferences && (
        <Card className="border-dashed bg-muted/30">
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span>Accessoires au retour</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-medium">Cocher les accessoires présents au retour</p>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                {(vehicleType === "moto" ? RETURN_MOTO_ACCESSORY_KEYS : RETURN_CAR_ACCESSORY_KEYS)
                  .filter((acc) => {
                    // Afficher uniquement les accessoires qui étaient présents au départ
                    return departAccessoires?.[acc.key] === true;
                  })
                  .map((acc) => (
                    <label key={acc.key} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!accessoires?.[acc.key]}
                        onChange={(e) =>
                          setValue(
                            `returnData.step5.accessoiresRetour.accessoires.${acc.key}`,
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span>{acc.label}</span>
                    </label>
                  ))}
                {(vehicleType === "moto" ? RETURN_MOTO_ACCESSORY_KEYS : RETURN_CAR_ACCESSORY_KEYS).filter((acc) => departAccessoires?.[acc.key] === true).length === 0 && (
                  <p className="text-xs sm:text-sm text-muted-foreground italic py-2">
                    Aucun accessoire n'était présent au départ.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Commentaire retour</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                value={commentaireRetour}
                onChange={(e) =>
                  setValue("returnData.step5.accessoiresRetour.commentaire", e.target.value)
                }
                placeholder="Ex: Triangle manquant, Gilet non rendu..."
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
