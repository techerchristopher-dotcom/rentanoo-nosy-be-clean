import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePhotoUrl } from "@/utils/resolvePhotoUrl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Gauge, Camera, AlertCircle, CheckCircle2, AlertTriangle, Calendar, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface StepProps {
  departData: any;
  departStatus?: string;
  returnData: any;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
  bookingData?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string };
  onStartReturn?: () => void;
}

const zoneKeys = [
  { key: "avant", label: "Avant", icon: "🚗" },
  { key: "droit", label: "Côté droit", icon: "➡️" },
  { key: "arriere", label: "Arrière", icon: "🚗" },
  { key: "gauche", label: "Côté gauche", icon: "⬅️" },
  { key: "coffre", label: "Coffre", icon: "📦" },
  { key: "janteAvDroit", label: "Jante avant droite", icon: "⚙️" },
  { key: "janteArDroit", label: "Jante arrière droite", icon: "⚙️" },
  { key: "janteAvGauche", label: "Jante avant gauche", icon: "⚙️" },
  { key: "janteArGauche", label: "Jante arrière gauche", icon: "⚙️" },
];

/**
 * Composant de grille de photos réutilisable - Mobile-first
 * Grille 2 colonnes sur mobile, puis 3/4 sur desktop
 * Hauteur réduite sur mobile pour éviter le scroll excessif
 */
function PhotosGrid({ photos, className = "" }: { photos: any[]; className?: string }) {
  if (!photos || photos.length === 0) {
    return (
      <div className="text-xs sm:text-sm text-muted-foreground italic py-2 sm:py-4 text-center border border-dashed rounded-md bg-muted/20">
        Aucune photo disponible
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 ${className}`}>
      {photos.map((p, idx) => {
        const photoUrl = resolvePhotoUrl(p);
        if (!photoUrl) return null;
        
        return (
          <div
            key={idx}
            className="group relative border rounded-md sm:rounded-lg overflow-hidden bg-muted/30 hover:shadow-md transition-shadow cursor-pointer active:opacity-80"
            onClick={() => {
              // Ouvrir l'image en grand dans un nouvel onglet
              window.open(photoUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={p?.storagePath || `photo-${idx}`}
              className="w-full h-20 sm:h-24 md:h-28 lg:h-32 object-cover group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Step1DepartRecap({
  departData,
  departStatus,
  bookingData,
  onStartReturn,
}: StepProps) {
  const vehiculeMarque = departData?.step2?.vehicule?.marque || "";
  const vehiculeModele = departData?.step2?.vehicule?.modele || "";
  const vehiculeImmat = departData?.step2?.vehicule?.immatriculation || "";

  const kilometrageDepart = departData?.step2?.releves?.kilometrage;
  const niveauCarburantDepart = departData?.step2?.releves?.niveauCarburant;
  const dashboardPhotos = departData?.step2?.releves?.dashboardPhotos || [];

  const zonesPhotos = departData?.step3?.zonesPhotos || {};
  const propreteExterieurePhotos = departData?.step3?.propreteExterieure?.photos || [];

  // Dégâts : on enrichit les damageReports avec les photos de zones ayant kind = "degat"
  // lorsqu'aucune photo n'est directement présente sur le dégât.
  const rawDamageReports = (departData?.step3?.damageReports || []) as any[];
  const allZonePhotos: any[] = Object.values(zonesPhotos || {}).reduce((acc: any[], photos: any) => {
    if (Array.isArray(photos)) {
      acc.push(...photos);
    }
    return acc;
  }, []);

  const damageReports = rawDamageReports.map((d, idx) => {
    if (d?.photos && Array.isArray(d.photos) && d.photos.length > 0) {
      return d;
    }

    const side = d?.side || d?.zone || null;

    const fallbackPhotos = allZonePhotos.filter((p: any) => {
      if (!p || typeof p !== "object") return false;
      // Photos marquées comme "degat" et associées à ce dégât via damageIndex
      if (p.damageIndex === idx && (p.kind === "degat" || !p.kind)) {
        return true;
      }
      return false;
    });

    // 1) Si on a des photos explicitement taggées pour ce dégât → on les utilise.
    if (fallbackPhotos.length > 0) {
      return {
        ...d,
        photos: fallbackPhotos,
      };
    }

    // 2) Fallback supplémentaire : si aucune photo spécifique trouvée mais qu'on connaît la zone
    //    et qu'il existe des photos pour cette zone, on les associe à ce dégât.
    if (side && zonesPhotos && Array.isArray((zonesPhotos as any)[side])) {
      const zonePhotos: any[] = (zonesPhotos as any)[side] || [];
      if (zonePhotos.length > 0) {
        const zoneDamagePhotos = zonePhotos.filter((p: any) => {
          if (!p || typeof p !== "object") return false;
          // Priorité aux photos marquées comme "degat" sur cette zone
          if (p.kind === "degat") return true;
          return false;
        });

        const photosToAttach = zoneDamagePhotos.length > 0 ? zoneDamagePhotos : zonePhotos;

        return {
          ...d,
          photos: photosToAttach,
        };
      }
    }

    return d;
  });

  const interieurPropretePhotos = departData?.step4?.propreteGenerale?.photos || [];
  const interieurSiegesPhotos = departData?.step4?.sieges?.photos || [];
  const interieurSiegesDamagePhotos = departData?.step4?.sieges?.damagePhotos || [];

  const isDepartCompleted = departStatus === "completed";

  // Compter le nombre total de photos extérieures pour affichage
  const totalExteriorPhotos = Object.values(zonesPhotos).reduce(
    (acc: number, photos: any) => acc + (Array.isArray(photos) ? photos.length : 0),
    0
  ) + propreteExterieurePhotos.length;

  // Formater les dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      const dateFormatted = date.toLocaleDateString("fr-FR", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (timeString) {
        return `${dateFormatted} à ${timeString}`;
      }
      return dateFormatted;
    } catch {
      return dateString;
    }
  };

  // Date et heure actuelles
  const now = new Date();
  const currentDateTime = now.toLocaleString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      {/* En-tête - Typographie mobile-first */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight sm:leading-none tracking-tight flex items-center gap-2">
          <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">État des lieux de départ – Récapitulatif</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Consultez les informations et photos du départ avant de commencer l'état des lieux de retour.
        </p>
      </div>

      {/* Card : Dates de la réservation */}
      {bookingData && (bookingData.startDate || bookingData.endDate) && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span>Dates de la réservation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Date de départ</span>
                </p>
                <p className="text-sm sm:text-base font-semibold break-words">
                  {formatDateTime(bookingData.startDate, bookingData.startTime)}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Date de retour</span>
                </p>
                <p className="text-sm sm:text-base font-semibold break-words">
                  {formatDateTime(bookingData.endDate, bookingData.endTime)}
                </p>
              </div>
            </div>
            <Separator className="my-3 sm:my-4" />
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Date et heure du jour</span>
              </p>
              <p className="text-sm sm:text-base font-semibold break-words">
                {currentDateTime}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning si départ non complété - Compact mobile */}
      {!isDepartCompleted && departStatus && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-amber-900">
                  État des lieux de départ non finalisé
                </p>
                <p className="text-xs sm:text-sm text-amber-700 flex items-center flex-wrap gap-1">
                  <span>Statut :</span>
                  <Badge variant="outline" className="text-xs">{departStatus}</Badge>
                </p>
                <p className="text-xs text-amber-600 mt-1.5 sm:mt-2 leading-snug">
                  Il est recommandé de finaliser l'état des lieux de départ avant de procéder au retour.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card : Infos véhicule - Layout mobile-first */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="break-words">Informations du véhicule</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Marque</p>
              <p className="text-sm sm:text-base font-semibold break-words">{vehiculeMarque || "—"}</p>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Modèle</p>
              <p className="text-sm sm:text-base font-semibold break-words">{vehiculeModele || "—"}</p>
            </div>
            <div className="space-y-0.5 sm:space-y-1 sm:col-span-2 md:col-span-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Immatriculation</p>
              <p className="text-sm sm:text-base font-semibold font-mono break-words">{vehiculeImmat || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card : Relevés de départ - Compact mobile */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Relevés de départ</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Kilométrage</p>
              <p className="text-base sm:text-lg font-semibold">
                {kilometrageDepart !== undefined && kilometrageDepart !== null
                  ? `${kilometrageDepart.toLocaleString("fr-FR")} km`
                  : "—"}
              </p>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Niveau de carburant</p>
              <p className="text-base sm:text-lg font-semibold">
                {niveauCarburantDepart !== undefined && niveauCarburantDepart !== null
                  ? `${niveauCarburantDepart}%`
                  : "—"}
              </p>
            </div>
          </div>

          {dashboardPhotos.length > 0 && (
            <>
              <Separator className="my-2 sm:my-3" />
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs sm:text-sm font-medium">Photos du tableau de bord</p>
                <PhotosGrid photos={dashboardPhotos} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card : Photos extérieures - Espacement réduit mobile */}
      {(totalExteriorPhotos > 0 || propreteExterieurePhotos.length > 0) && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span>État extérieur</span>
              {totalExteriorPhotos > 0 && (
                <Badge variant="secondary" className="text-xs ml-1 sm:ml-2">
                  {totalExteriorPhotos} photo{totalExteriorPhotos > 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4 md:space-y-6">
            {/* Zones principales */}
            {zoneKeys.map((zone) => {
              const photos = zonesPhotos?.[zone.key] || [];
              if (photos.length === 0) return null;

              return (
                <div key={zone.key} className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold">{zone.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {photos.length} photo{photos.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <PhotosGrid photos={photos} />
                </div>
              );
            })}

            {/* Propreté extérieure */}
            {propreteExterieurePhotos.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-semibold">Propreté extérieure</span>
                  <Badge variant="outline" className="text-xs">
                    {propreteExterieurePhotos.length} photo{propreteExterieurePhotos.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <PhotosGrid photos={propreteExterieurePhotos} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card : Photos intérieures - Espacement réduit mobile */}
      {(interieurPropretePhotos.length > 0 ||
        interieurSiegesPhotos.length > 0 ||
        interieurSiegesDamagePhotos.length > 0) && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span>État intérieur</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4 md:space-y-6">
            {interieurPropretePhotos.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-semibold">Propreté générale</span>
                  <Badge variant="outline" className="text-xs">
                    {interieurPropretePhotos.length} photo{interieurPropretePhotos.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <PhotosGrid photos={interieurPropretePhotos} />
              </div>
            )}

            {interieurSiegesPhotos.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-semibold">Sièges</span>
                  <Badge variant="outline" className="text-xs">
                    {interieurSiegesPhotos.length} photo{interieurSiegesPhotos.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <PhotosGrid photos={interieurSiegesPhotos} />
              </div>
            )}

            {interieurSiegesDamagePhotos.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
                    <span>Dégâts sièges</span>
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {interieurSiegesDamagePhotos.length} photo{interieurSiegesDamagePhotos.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <PhotosGrid photos={interieurSiegesDamagePhotos} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card : Dégâts présents au départ - Ultra-compact mobile */}
      {damageReports.length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
              <span>Dégâts présents au départ</span>
              <Badge variant="destructive" className="text-xs ml-1 sm:ml-2">
                {damageReports.length} dégât{damageReports.length > 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-2.5 sm:space-y-3 md:space-y-4">
            {damageReports.map((d: any, idx: number) => (
              <Card key={idx} className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-2.5 sm:p-3 md:p-4 md:pt-6">
                  <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold">Zone</span>
                          <Badge variant="outline" className="text-xs">{d?.side || d?.zone || "Non spécifiée"}</Badge>
                        </div>
                        {d?.typeDegats && (
                          <div className="flex items-start gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Type :</span>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(d.typeDegats) ? (
                                d.typeDegats.map((type: string, tIdx: number) => (
                                  <Badge key={tIdx} variant="secondary" className="text-xs">
                                    {type}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  {d.typeDegats}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {d?.commentaire && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 italic leading-snug break-words">
                            "{d.commentaire}"
                          </p>
                        )}
                      </div>
                    </div>
                    {d?.photos && d.photos.length > 0 && (
                      <div className="space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-2 border-t border-destructive/20">
                        <p className="text-xs font-medium text-muted-foreground">
                          Photos du dégât ({d.photos.length})
                        </p>
                        <PhotosGrid photos={d.photos} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bouton d'action - Toujours visible et accessible */}
      <div className="flex justify-end pt-3 sm:pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-sm pb-2 sm:pb-0">
        <Button
          type="button"
          onClick={onStartReturn}
          disabled={!isDepartCompleted}
          size="lg"
          className="w-full sm:w-auto text-sm sm:text-base"
        >
          {isDepartCompleted ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              <span className="whitespace-nowrap">Commencer l'état des lieux de retour</span>
            </>
          ) : (
            <>
              <AlertCircle className="mr-2 h-4 w-4" />
              <span className="whitespace-nowrap">Finaliser d'abord l'état des lieux de départ</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
