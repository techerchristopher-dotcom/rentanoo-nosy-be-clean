import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZoomIn } from "lucide-react";
import type { ExteriorPhoto } from "@/types/step3";

/**
 * Formate le timestamp d'une photo pour affichage juridique français
 * Format : "07/11/2025 à 14:32"
 */
function formatPhotoTimestamp(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Erreur formatage timestamp photo:", error);
    return "";
  }
}

/**
 * Type pour une photo avec horodatage
 */
export type PhotoWithTimestamp = {
  file?: File;
  timestamp?: string;
} | File;

/**
 * Type accepté pour la photo principale de zone
 * - File (ancien flux)
 * - string URL
 * - ExteriorPhoto (nouveau flux Storage)
 * - objet { file, timestamp } (compat historique)
 */
type MainPhoto =
  | File
  | string
  | ExteriorPhoto
  | { file?: File; timestamp?: string }
  | undefined;

/**
 * Type pour un rapport de dégât
 */
export type DamageReport = {
  side?: string;
  typeDegats?: string[];
  commentaire?: string;
  photos?: (PhotoWithTimestamp | File | string)[]; // Support des 3 formats pour compatibilité
};

export type ExteriorZoneRecapCardProps = {
  zoneKey: string; // "avant", "droit", "arriere", "coffre", "gauche"
  zoneLabel: string; // "1. Avant du véhicule", "2. Côté droit", ...
  mainPhoto?: MainPhoto; // photo principale de la zone (si dispo)
  damages?: DamageReport[]; // liste des dégâts pour cette zone (0..n)
};

/**
 * Composant pour afficher une photo de dégât avec zoom au clic + horodatage
 */
function DamagePhotoWithZoom({
  photo,
  alt,
  damageIndex,
  photoIndex,
}: {
  photo: File | string | ExteriorPhoto | { file?: File; timestamp?: string } | undefined;
  alt: string;
  damageIndex: number;
  photoIndex: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Type guards
  const isExteriorPhoto = (value: unknown): value is ExteriorPhoto => {
    return !!value && typeof value === "object" && typeof (value as any).publicUrl === "string";
  };
  const isPhotoWithFileTimestamp = (
    value: unknown,
  ): value is { file?: File; timestamp?: string } => {
    if (!value || typeof value !== "object") return false;
    const v = value as any;
    return ("file" in v && v.file instanceof File) || "timestamp" in v;
  };

  // Normalisation de l'URL d'image + timestamp
  let imageUrl: string | undefined;
  let timestamp: string | undefined;

  if (typeof photo === "string") {
    // URL directe
    imageUrl = photo;
  } else if (photo instanceof File) {
    // Fichier local
    try {
      imageUrl = URL.createObjectURL(photo);
    } catch {
      imageUrl = undefined;
    }
  } else if (isExteriorPhoto(photo)) {
    // Photo storage (nouveau flux)
    imageUrl = photo.publicUrl;
    timestamp = photo.uploadedAt as any;
  } else if (isPhotoWithFileTimestamp(photo)) {
    // Ancien format { file?: File; timestamp?: string }
    if (photo.file instanceof File) {
      try {
        imageUrl = URL.createObjectURL(photo.file);
      } catch {
        imageUrl = undefined;
      }
    }
    timestamp = photo.timestamp;
  } else {
    // Format non supporté: ne pas crasher, on n'affiche pas d'image
    imageUrl = undefined;
    timestamp = undefined;
  }

  return (
    <div className="flex flex-col items-start space-y-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="relative group overflow-hidden rounded-lg border-2 border-orange-300 shadow-md hover:shadow-xl transition-all hover:scale-105"
            aria-label={`Voir ${alt} en grand`}
          >
            <img
              src={imageUrl}
              alt={alt}
              className="h-40 w-40 md:h-48 md:w-48 object-cover"
            />
            {/* Overlay avec icône zoom au hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white" />
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative overflow-auto">
            <img
              src={imageUrl}
              alt={alt}
              className="w-full h-auto rounded-lg object-contain"
              style={{ maxHeight: "85vh" }}
            />
            <div className="mt-2 text-center text-sm text-slate-600">
              {alt}
              {timestamp && (
                <div className="text-xs text-slate-500 mt-1">
                  Photo prise le {formatPhotoTimestamp(timestamp)}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Horodatage sous la miniature */}
      {timestamp ? (
        <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-600 leading-tight max-w-[160px] md:max-w-[192px]">
          <span className="font-medium">📅</span> {formatPhotoTimestamp(timestamp)}
          <span className="text-[9px] text-slate-400 block">(heure locale)</span>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 italic max-w-[160px] md:max-w-[192px]">
          Horodatage non disponible
        </div>
      )}
    </div>
  );
}

/**
 * Composant de récapitulatif unifié pour une zone extérieure :
 * - Photo principale + horodatage
 * - Liste des dégâts de cette zone
 */
export function ExteriorZoneRecapCard({
  zoneKey,
  zoneLabel,
  mainPhoto,
  damages = [],
}: ExteriorZoneRecapCardProps) {
  // Normalisation de la source image et de l'horodatage
  const isFile = mainPhoto instanceof File;
  const isString = typeof mainPhoto === "string";
  const isObject = !!mainPhoto && typeof mainPhoto === "object";
  // Type guards robustes
  const hasInnerFile = (() => {
    try {
      return isObject && "file" in (mainPhoto as any) && (mainPhoto as any).file instanceof File;
    } catch {
      return false;
    }
  })();
  const isExteriorPhoto = (() => {
    try {
      return isObject && typeof (mainPhoto as any).publicUrl === "string";
    } catch {
      return false;
    }
  })();

  const imageSrc = (() => {
    try {
      if (isFile) return URL.createObjectURL(mainPhoto as File);
      if (isString) return (mainPhoto as string) || undefined;
      if (hasInnerFile) return URL.createObjectURL((mainPhoto as any).file as File);
      if (isExteriorPhoto) return (mainPhoto as ExteriorPhoto).publicUrl || undefined;
    } catch {
      return undefined;
    }
    return undefined;
  })();

  const timestamp = (() => {
    try {
      if (isExteriorPhoto) return (mainPhoto as ExteriorPhoto).uploadedAt;
      if (isObject && "timestamp" in (mainPhoto as any)) return (mainPhoto as any).timestamp as string | undefined;
    } catch {
      return undefined;
    }
    return undefined;
  })();

  return (
    <div className="space-y-6 print:page-break-inside-avoid">
      {/* Titre de la zone avec style distinctif */}
      <div className="flex justify-center">
        <div className="bg-teal-50 border border-teal-200 rounded-full px-6 py-2 shadow-sm w-fit text-center">
          <h3 className="text-lg font-semibold text-teal-800 tracking-wide">
            {zoneLabel}
          </h3>
        </div>
      </div>

      <Card className="border-2 border-teal-100">
        <CardContent className="p-6 space-y-6">
          {/* 📸 Section Photo principale + horodatage */}
          {imageSrc ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Photo d'ensemble de la zone
              </h4>
              
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Image à gauche */}
                <div className="md:flex-1">
                  <img
                    src={imageSrc}
                    alt={`${zoneLabel} - Vue d'ensemble`}
                    className="rounded-xl shadow-lg border border-border object-cover print:max-w-full print:page-break-inside-avoid"
                    style={{
                      width: "100%",
                      maxWidth: "900px",
                      height: "auto",
                      aspectRatio: "16/9",
                    }}
                  />
                </div>

                {/* Horodatage à droite */}
                <div className="md:w-64 md:shrink-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm text-sm leading-relaxed">
                    <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-2">
                      Horodatage de la photo
                    </p>
                    {timestamp ? (
                      <p className="text-slate-600">
                        Photo prise le{" "}
                        <span className="font-medium text-slate-800">
                          {formatPhotoTimestamp(timestamp)}
                        </span>{" "}
                        <span className="text-xs text-slate-500">(heure locale)</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 italic text-xs">
                        Horodatage indisponible pour cette photo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <p className="text-sm text-slate-500">
                Aucune photo principale n'a été enregistrée pour cette zone.
              </p>
            </div>
          )}

          {/* 🚨 Section Dégâts sur cette zone */}
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Dégâts recensés sur cette zone
            </h4>

            {!damages || damages.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">
                  ✓ Aucun dégât signalé sur cette zone
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {damages.map((damage, idx) => (
                  <div
                    key={idx}
                    className="border border-orange-200 rounded-lg p-4 bg-orange-50/30 text-sm text-gray-800 space-y-2 transition-all"
                  >
                    <div className="font-semibold text-orange-800 flex items-center gap-2">
                      <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full text-xs">
                        Dégât #{idx + 1}
                      </span>
                    </div>

                    <div className="grid gap-2">
                      <div>
                        <span className="font-medium text-slate-700">Type :</span>{" "}
                        <span className="text-slate-800">
                          {Array.isArray(damage.typeDegats)
                            ? damage.typeDegats.join(", ")
                            : damage.typeDegats || "—"}
                        </span>
                      </div>

                      {damage.commentaire && (
                        <div>
                          <span className="font-medium text-slate-700">Commentaire :</span>{" "}
                          <span className="text-slate-800">{damage.commentaire}</span>
                        </div>
                      )}
                    </div>

                    {/* Photos du dégât (avec zoom + horodatage) */}
                    {damage.photos && damage.photos.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                          Photos du dégât ({damage.photos.length})
                        </p>
                        <div className="flex flex-wrap gap-4">
                          {damage.photos.map((photo, i) => (
                            <DamagePhotoWithZoom
                              key={i}
                              photo={photo}
                              alt={`Dégât ${idx + 1} - Photo ${i + 1}`}
                              damageIndex={idx}
                              photoIndex={i}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3 italic">
                          💡 Cliquez sur une photo pour l'agrandir et voir les détails
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

