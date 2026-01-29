import { useRef, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, User, Car, Gauge, Building2, PenTool, AlertCircle, CheckCircle, Calendar, ZoomIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExteriorZoneRecapCard, type DamageReport } from "../components/ExteriorZoneRecapCard";
import { EXTERIOR_ZONES, WHEEL_ZONES, type ExteriorZoneKey } from "../config/zones";
import { InteriorPhoto } from "@/types/step4";
import { finalizeCheckinDepart } from "@/services/checkinDepartService";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignatureCanvas } from "@/components/checkin/SignatureCanvas";

/**
 * Composant pour afficher une photo de dégât intérieur avec zoom au clic + horodatage
 */
function InteriorDamagePhotoWithZoom({
  photo,
  alt,
  photoIndex,
}: {
  photo: InteriorPhoto;
  alt: string;
  photoIndex: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timestamp = photo.uploadedAt || new Date().toISOString();

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
              src={photo.publicUrl}
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
              src={photo.publicUrl}
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

// SignatureCanvas est désormais un composant partagé dans "@/components/checkin/SignatureCanvas"

type Section8ValidationProps = {
  onInvalidStepsChange?: (steps: Set<number>) => void;
  onMissingFieldsChange?: (fields: string[]) => void;
  onNavigateToMissingField?: (target: { step: number; anchor?: string | null; fieldKey: string }) => void;
  bookingId?: string;
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (checkinId: string, status?: string) => void;
};

function computeInvalidStepsFromMissingFields(missing: string[]): Set<number> {
  const invalid = new Set<number>();
  for (const m of missing) {
    const label = m.toLowerCase();
    if (label.startsWith("conducteur") || label.startsWith("propriétaire")) {
      invalid.add(1); // Identification
    }
    if (label.startsWith("véhicule") || label.startsWith("relevés")) {
      invalid.add(2); // Relevés / véhicule
    }
    if (label.includes("signature")) {
      invalid.add(7); // Validation & Signature (Step 7 maintenant)
    }
  }
  return invalid;
}

export default function Section8Validation({ 
  onInvalidStepsChange,
  onMissingFieldsChange,
  onNavigateToMissingField,
  bookingId: bookingIdProp,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  isCheckinCompleted = false,
}: Section8ValidationProps) {
  const { watch, setValue } = useFormContext();
  // ⭐ Phase 1 : État de chargement pour empêcher le double clic
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Utiliser bookingId depuis props ou depuis le form
  const bookingIdFromForm = watch("bookingId");
  const bookingId = bookingIdProp || bookingIdFromForm;
  const driverData = watch("driver");
  const conducteurData = watch("conducteur");
  const owner = watch("owner");
  const vehicle = watch("vehicule");
  const readings = watch("releves");
  const exterior = watch("exteriorInspection");
  const interior = watch("interiorInspection");
  const ownerSignature = watch("ownerSignature");
  const driverSignature = watch("driverSignature");
  const damageReports = watch("damageReports") || [];
  const zonesPhotos = watch("exteriorInspection.zonesPhotos") || {};
  
  // ⭐ NOUVEAU : Commentaires Step 5 (Accessoires)
  const accessoires = watch("accessoires");
  const step5FromDraft = watch("step5");
  const step5Data = step5FromDraft || (accessoires?.commentaire ? { accessoires } : null);
  const accessoiresCommentaire = step5Data?.accessoires?.commentaire || accessoires?.commentaire;
  
  // ⭐ NOUVEAU : Remarques Step 6
  // Récupérer depuis le form (remarques.observations) ou depuis step6 (si chargé depuis draft)
  const remarques = watch("remarques");
  const step6FromDraft = watch("step6");
  const step6Data = step6FromDraft || (remarques?.observations ? { remarques } : null);
  
  // ⭐ NOUVEAU : Photos Step1 (permis) et Step2 (dashboard)
  const licensePhotoRecto = watch("conducteur.driver_license_photos_recto");
  const licensePhotoVerso = watch("conducteur.driver_license_photos_verso");
  const dashboardPhotosData = watch("releves.dashboardPhotosData") || [];
  
  // Données de réservation (dates de départ/retour + numéro lisible)
  const referenceNumber = watch("reservation.referenceNumber");
  const departureDate = watch("reservation.departureDate");
  const departureTime = watch("reservation.departureTime");
  const returnDate = watch("reservation.returnDate");
  const returnTime = watch("reservation.returnTime");
  const departureLocation = watch("reservation.departureLocation");
  const returnLocation = watch("reservation.returnLocation");
  
  // ⭐ NOUVEAU : Prioriser le snapshot si EDL est completed (pour affichage figé)
  const snapshotBooking = watch("snapshot_legal.booking") as
    | import("@/types/snapshot-legal").CheckinLegalSnapshotBooking
    | undefined;
  const finalDepartureLocation =
    snapshotBooking?.departureLocation ?? departureLocation;
  const finalReturnLocation =
    snapshotBooking?.returnLocation ?? returnLocation;

  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    missingFields: string[];
  }>({ isValid: true, missingFields: [] });
  const [autoNavigateActive, setAutoNavigateActive] = useState(false);
  const [lastNavigatedMissingKey, setLastNavigatedMissingKey] = useState<string | null>(null);

  const mapMissingFieldToTarget = (missing: string) => {
    const label = missing.toLowerCase();
    if (label.includes("kilométrage")) {
      return { step: 2, anchor: "field-kilometrage", fieldKey: missing };
    }
    if (label.includes("signature du propriétaire")) {
      return { step: 7, anchor: "field-signature-owner", fieldKey: missing };
    }
    if (label.includes("signature du locataire")) {
      return { step: 7, anchor: "field-signature-driver", fieldKey: missing };
    }
    if (label.includes("conducteur")) {
      return { step: 1, anchor: null, fieldKey: missing };
    }
    if (label.includes("propriétaire")) {
      return { step: 1, anchor: null, fieldKey: missing };
    }
    if (label.includes("véhicule")) {
      return { step: 2, anchor: null, fieldKey: missing };
    }
    return null;
  };

  const navigateToFirstMissing = (missing: string[]) => {
    if (!missing || missing.length === 0 || !onNavigateToMissingField) return;
    const first = missing[0];
    const target = mapMissingFieldToTarget(first);
    if (target) {
      onNavigateToMissingField(target);
      setLastNavigatedMissingKey(first);
      setAutoNavigateActive(true);
    }
  };

  // Fonction de vérification des données (sans toast automatique)
  const checkValidationData = (showToast: boolean = false) => {
    const missing: string[] = [];

    // Vérification du conducteur
    const driver = driverData || {
      nom: conducteurData?.nom || "",
      prenom: conducteurData?.prenom || "",
      permis: conducteurData?.numeroPermis || "",
      permisDelivreLe: conducteurData?.dateDelivrance || "",
      permisExpireLe: conducteurData?.dateExpiration || "",
      pays: conducteurData?.paysEmission || "",
      categorie: conducteurData?.categoriePermis || "",
      email: "",
      telephone: "",
    };

    if (!driver.nom || driver.nom === "Non renseigné") missing.push("Conducteur : Nom");
    if (!driver.prenom || driver.prenom === "Non renseigné") missing.push("Conducteur : Prénom");
    if (!driver.email || driver.email === "Non renseigné") missing.push("Conducteur : Email");
    if (!driver.telephone || driver.telephone === "Non renseigné") missing.push("Conducteur : Téléphone");
    if (!driver.permis || driver.permis === "Non renseigné") missing.push("Conducteur : N° Permis");

    // Vérification du propriétaire
    if (!owner?.nom || owner.nom === "Non renseigné") missing.push("Propriétaire : Nom");
    if (!owner?.prenom || owner.prenom === "Non renseigné") missing.push("Propriétaire : Prénom");
    if (!owner?.email || owner.email === "Non renseigné") missing.push("Propriétaire : Email");
    if (!owner?.telephone || owner.telephone === "Non renseigné") missing.push("Propriétaire : Téléphone");

    // Vérification du véhicule
    if (!vehicle?.marque || vehicle.marque === "Non renseigné") missing.push("Véhicule : Marque");
    if (!vehicle?.modele || vehicle.modele === "Non renseigné") missing.push("Véhicule : Modèle");
    if (!vehicle?.immatriculation || vehicle.immatriculation === "Non renseigné") missing.push("Véhicule : Immatriculation");

    // Vérification des relevés
    if (!readings?.kilometrage) missing.push("Relevés : Kilométrage");
    if (readings?.niveauCarburant === undefined || readings?.niveauCarburant === null) {
      missing.push("Relevés : Niveau de carburant");
    }

    // Vérification des signatures
    if (!ownerSignature) missing.push("Signature du propriétaire");
    if (!driverSignature) missing.push("Signature du locataire");

    const isValid = missing.length === 0;

    setValidationStatus({ isValid, missingFields: missing });
    if (onMissingFieldsChange) {
      onMissingFieldsChange(missing);
    }
    // Propager les steps invalides pour mise en avant dans le stepper
    if (onInvalidStepsChange) {
      onInvalidStepsChange(computeInvalidStepsFromMissingFields(missing));
    }

    // Afficher les toasts seulement si demandé (clic manuel)
    if (showToast) {
      if (isValid) {
        toast.success("Toutes les données sont bien chargées, prêtes pour validation ✅");
      } else {
        toast.error(`Validation incomplète : ${missing.length} champ(s) manquant(s)`, {
          description: missing.slice(0, 5).join(", ") + (missing.length > 5 ? "..." : ""),
        });
      }
    }

    return { isValid, missingFields: missing };
  };

  // Vérification automatique au chargement et à chaque changement (SANS toast)
  useEffect(() => {
    checkValidationData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverData, conducteurData, owner, vehicle, readings, ownerSignature, driverSignature]);

  // Navigation automatique en chaîne : dès qu'un champ manquant est résolu, on passe au suivant
  useEffect(() => {
    if (!autoNavigateActive) return;
    if (validationStatus.isValid) {
      setAutoNavigateActive(false);
      setLastNavigatedMissingKey(null);
      return;
    }
    const currentFirst = validationStatus.missingFields[0];
    if (!currentFirst) return;
    if (currentFirst === lastNavigatedMissingKey) return; // déjà sur ce champ
    navigateToFirstMissing(validationStatus.missingFields);
  }, [autoNavigateActive, validationStatus.missingFields, validationStatus.isValid, lastNavigatedMissingKey]);

  const ownerSignatureMissing = validationStatus.missingFields.includes("Signature du propriétaire");
  const driverSignatureMissing = validationStatus.missingFields.includes("Signature du locataire");

  /**
   * ⭐ CORRECTION BUG : Filtrage des dégâts vides/orphelins
   * 
   * Helper pour vérifier qu'un dégât est "valide" (a du contenu exploitable)
   * Un dégât est considéré valide s'il a au moins un type OU une photo.
   */
  const isDamageValid = (damage: any): boolean => {
    // Dégât valide si :
    // - Au moins 1 type de dégât renseigné
    // - OU au moins 1 photo (même sans type)
    const hasType = damage.typeDegats && Array.isArray(damage.typeDegats) && damage.typeDegats.length > 0
    const hasPhotos = damage.photos && Array.isArray(damage.photos) && damage.photos.length > 0
    
    return hasType || hasPhotos
  }

  // ⭐ Regroupement des dégâts par zone (clés normalisées)
  // + Filtrage automatique des dégâts vides/orphelins
  const groupedDamages: Record<ExteriorZoneKey, DamageReport[]> = {
    avant: [],
    droit: [],
    arriere: [],      // ✅ SANS accent (cohérence totale)
    coffre: [],
    gauche: [],
    janteAvDroit: [],
    janteArDroit: [],
    janteAvGauche: [],
    janteArGauche: [],
  };

  damageReports.forEach((d: any) => {
    // ⭐ FILTRAGE : Ignorer les dégâts vides (objets orphelins sans contenu)
    if (!isDamageValid(d)) {
      console.log(`[RÉCAP] Dégât orphelin ignoré pour side="${d.side}"`, d)
      return
    }

    if (d.side && groupedDamages[d.side as ExteriorZoneKey]) {
      groupedDamages[d.side as ExteriorZoneKey].push(d);
    }
  });

  const driver = driverData || {
    nom: conducteurData?.nom || "",
    prenom: conducteurData?.prenom || "",
    permis: conducteurData?.numeroPermis || "",
    permisDelivreLe: conducteurData?.dateDelivrance || "",
    permisExpireLe: conducteurData?.dateExpiration || "",
    pays: conducteurData?.paysEmission || "",
    categorie: conducteurData?.categoriePermis || "",
    email: "",
    telephone: "",
  };

  const safe = (val: any, fallback = "Non renseigné") =>
    val === undefined || val === null || val === "" ? fallback : val;

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-success" />
          Validation & Signature
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Vérifiez les informations avant de valider le formulaire
        </p>
      </div>

      {/* Indicateur d'état de validation */}
      <Card className={`border-2 ${validationStatus.isValid ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {validationStatus.isValid ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Données complètes ✅</p>
                  <p className="text-sm text-green-700">Toutes les informations sont renseignées, prêtes pour validation.</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-800">
                    Validation incomplète ({validationStatus.missingFields.length} champ(s) manquant(s))
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Champs manquants : {validationStatus.missingFields.slice(0, 3).join(", ")}
                    {validationStatus.missingFields.length > 3 && ` et ${validationStatus.missingFields.length - 3} autre(s)...`}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section Informations de la location */}
      <section className="space-y-6">
        {/* Bannière de section niveau 1 */}
        <div className="flex justify-start items-center">
          <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
            <h2 className="text-xl font-bold text-teal-900 tracking-wide">
              Informations de la location
            </h2>
            <p className="text-sm text-slate-600">
              Conducteur, propriétaire, réservation et véhicule
            </p>
          </div>
        </div>

        {/* Grille de cartes - 2 lignes pour hauteurs équilibrées */}
        <div className="space-y-6">
          {/* Ligne 1 : Conducteur + Propriétaire (même hauteur) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Conducteur (locataire)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 flex-1">
                <div><strong>Nom :</strong> {safe(driver?.nom)}</div>
                <div><strong>Prénom :</strong> {safe(driver?.prenom)}</div>
                <div><strong>Email :</strong> {safe(driver?.email)}</div>
                <div><strong>Téléphone :</strong> {safe(driver?.telephone)}</div>
                <div><strong>Permis n° :</strong> {safe(driver?.permis)}</div>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><strong>Date d'obtention :</strong> {safe(driver?.permisDelivreLe)}</div>
                  <div><strong>Date d'expiration :</strong> {safe(driver?.permisExpireLe)}</div>
                </div>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><strong>Pays :</strong> {safe(driver?.pays)}</div>
                  <div><strong>Catégorie :</strong> {safe(driver?.categorie)}</div>
                </div>

                {/* ⭐ NOUVEAU : Photos du permis de conduire */}
                {(licensePhotoRecto || licensePhotoVerso) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm font-semibold mb-2">Photos du permis de conduire</div>
                    <div className="grid grid-cols-2 gap-3">
                      {licensePhotoRecto && (
                        <div className="space-y-1">
                          <img
                            src={licensePhotoRecto}
                            alt="Permis recto"
                            className="w-full aspect-[3/2] object-cover rounded-lg border border-border hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => window.open(licensePhotoRecto, '_blank')}
                          />
                          <p className="text-xs text-muted-foreground text-center">Recto</p>
                        </div>
                      )}
                      {licensePhotoVerso && (
                        <div className="space-y-1">
                          <img
                            src={licensePhotoVerso}
                            alt="Permis verso"
                            className="w-full aspect-[3/2] object-cover rounded-lg border border-border hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => window.open(licensePhotoVerso, '_blank')}
                          />
                          <p className="text-xs text-muted-foreground text-center">Verso</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Propriétaire
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 flex-1">
                <div><strong>Nom :</strong> {safe(owner?.nom)}</div>
                <div><strong>Prénom :</strong> {safe(owner?.prenom)}</div>
                <div><strong>Email :</strong> {safe(owner?.email)}</div>
                <div><strong>Téléphone :</strong> {safe(owner?.telephone)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Ligne 2 : Réservation + Véhicule (même hauteur) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="flex flex-col h-full" data-booking-id={bookingId}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Réservation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 flex-1">
                <div>
                  <strong>Réservation n° :</strong>{" "}
                  {referenceNumber !== null && referenceNumber !== undefined
                    ? referenceNumber
                    : "Non renseigné"}
                </div>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <strong>Date de départ :</strong>{" "}
                    {departureDate || "Non renseignée"}
                  </div>
                  <div>
                    <strong>Heure de départ :</strong>{" "}
                    {departureTime || "Non renseignée"}
                  </div>
                </div>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <strong>Date de retour prévue :</strong>{" "}
                    {returnDate || "Non renseignée"}
                  </div>
                  <div>
                    <strong>Heure de retour prévue :</strong>{" "}
                    {returnTime || "Non renseignée"}
                  </div>
                </div>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <strong>Lieu de départ :</strong>{" "}
                    {finalDepartureLocation || "Non renseigné"}
                  </div>
                  <div>
                    <strong>Lieu de retour prévue :</strong>{" "}
                    {finalReturnLocation || "Non renseigné"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Véhicule
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 flex-1">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><strong>Marque :</strong> {safe(vehicle?.marque)}</div>
                  <div><strong>Modèle :</strong> {safe(vehicle?.modele)}</div>
                </div>
                
                <div><strong>Immatriculation :</strong> {safe(vehicle?.immatriculation)}</div>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <strong>Kilométrage :</strong>{" "}
                    {readings?.kilometrage ? `${readings.kilometrage} km` : "Non renseigné"}
                  </div>
                  <div>
                    <strong>Carburant :</strong>{" "}
                    {readings?.niveauCarburant !== undefined && readings?.niveauCarburant !== null
                      ? `${readings.niveauCarburant}%`
                      : "Non renseigné"}
                  </div>
                </div>

                {/* ⭐ NOUVEAU : Photos du tableau de bord */}
                {dashboardPhotosData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm font-semibold mb-2">
                      Photo{dashboardPhotosData.length > 1 ? 's' : ''} du tableau de bord
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dashboardPhotosData.map((photo: any, index: number) => (
                        <div key={photo.storagePath || index} className="space-y-1">
                          <img
                            src={photo.publicUrl}
                            alt={`Tableau de bord ${index + 1}`}
                            className="w-full aspect-[4/3] object-cover rounded-lg border border-border hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => window.open(photo.publicUrl, '_blank')}
                          />
                          <p className="text-xs text-muted-foreground">
                            Photo prise le {formatPhotoTimestamp(photo.uploadedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* NOUVELLE SECTION : Récapitulatif extérieur unifié (photo + dégâts)  */}
      {/* ===================================================================== */}
      <section className="space-y-8">
        {/* Bannière de section niveau 1 */}
        <div className="flex justify-start items-center">
          <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
            <h2 className="text-xl font-bold text-teal-900 tracking-wide">
              Récapitulatif extérieur : photos et dégâts par zone
            </h2>
            <p className="text-sm text-slate-600">
              Pour chaque zone, retrouvez la photo d'ensemble, l'horodatage et les dégâts signalés
            </p>
          </div>
        </div>

        {/* Boucle sur chaque zone extérieure (configuration centralisée) */}
        <div className="space-y-8">
          {EXTERIOR_ZONES.map((zone) => {
            const zonePhotos = zonesPhotos[zone.key];
            const mainPhoto = zonePhotos && zonePhotos.length > 0 ? zonePhotos[0] : undefined;
            const damages = groupedDamages[zone.key] || [];

            // Afficher la zone seulement si elle a une photo OU des dégâts
            if (!mainPhoto && damages.length === 0) return null;

            return (
              <ExteriorZoneRecapCard
                key={zone.key}
                zoneKey={zone.key}
                zoneLabel={zone.label}
                mainPhoto={mainPhoto}
                damages={damages}
              />
            );
          })}
        </div>

        {/* ===================================================================== */}
        {/* SECTION JANTES : Récapitulatif unifié (photo + horodatage + dégâts) */}
        {/* ===================================================================== */}
        {(zonesPhotos.janteAvDroit?.length > 0 ||
          zonesPhotos.janteArDroit?.length > 0 ||
          zonesPhotos.janteAvGauche?.length > 0 ||
          zonesPhotos.janteArGauche?.length > 0 ||
          groupedDamages.janteAvDroit?.length > 0 ||
          groupedDamages.janteArDroit?.length > 0 ||
          groupedDamages.janteAvGauche?.length > 0 ||
          groupedDamages.janteArGauche?.length > 0) && (
          <section className="space-y-8 mt-10 print:page-break-inside-avoid">
            {/* Bannière de section */}
            <div className="flex justify-start items-center">
              <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
                <h2 className="text-xl font-bold text-teal-900 tracking-wide">
                  Récapitulatif jantes : photos et dégâts
                </h2>
                <p className="text-sm text-slate-600">
                  Pour chaque jante, retrouvez la photo, l'horodatage et les dégâts signalés
                </p>
              </div>
            </div>

            {/* Grid 2x2 des jantes avec ExteriorZoneRecapCard (configuration centralisée) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {WHEEL_ZONES.map((wheel) => {
                const wheelPhotos = zonesPhotos[wheel.key];
                const mainPhoto = wheelPhotos && wheelPhotos.length > 0 ? wheelPhotos[0] : undefined;
                const damages = groupedDamages[wheel.key] || [];

                // Afficher la jante seulement si elle a une photo OU des dégâts
                if (!mainPhoto && damages.length === 0) return null;

                return (
                  <ExteriorZoneRecapCard
                    key={wheel.key}
                    zoneKey={wheel.key}
                    zoneLabel={wheel.label}
                    mainPhoto={mainPhoto}
                    damages={damages}
                  />
                );
              })}
            </div>
          </section>
        )}
      </section>

      {/* Section Photos intérieures */}
      {(interior?.propreteGenerale?.photos?.length > 0 || 
        (interior?.sieges?.photos?.length > 0 || 
         (interior?.sieges?.hasDamage && interior?.sieges?.damagePhotos?.length > 0))) && (
        <section className="space-y-6">
          <div className="flex justify-start items-center">
            <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
              <h2 className="text-xl font-bold text-teal-900 tracking-wide">
                Photos intérieur du véhicule
              </h2>
              <p className="text-sm text-slate-600">
                État de l'habitacle et des sièges
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* État intérieur – Vue générale */}
            {interior?.propreteGenerale?.photos && interior.propreteGenerale.photos.length > 0 && (
              <>
                {interior.propreteGenerale.photos.map((photo: InteriorPhoto, i: number) => {
                  const timestamp = photo.uploadedAt || new Date().toISOString();

                  return (
                    <div key={`interior-general-${i}`} className="w-full flex flex-col space-y-4">
                      <div className="flex justify-center">
                        <div className="bg-teal-50 border border-teal-200 rounded-full px-6 py-2 shadow-sm w-fit text-center">
                          <h4 className="text-lg font-semibold text-teal-800 tracking-wide">
                            État intérieur – Vue générale
                            {interior.propreteGenerale.photos.length > 1 &&
                              ` - Photo ${i + 1}/${interior.propreteGenerale.photos.length}`}
                          </h4>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="md:flex-1">
                          <img
                            src={photo.publicUrl}
                            alt={`Intérieur général - Photo ${i + 1}`}
                            className="rounded-xl shadow-lg border border-border object-cover"
                            style={{
                              width: "900px",
                              maxWidth: "100%",
                              height: "auto",
                              aspectRatio: "16/9",
                            }}
                          />
                        </div>
                        <div className="md:w-64 md:shrink-0">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm text-sm leading-relaxed">
                            <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide mb-2">
                              Horodatage de la photo
                            </p>
                            <p className="text-slate-600">
                              Photo prise le{" "}
                              <span className="font-medium text-slate-800">
                                {formatPhotoTimestamp(timestamp)}
                              </span>{" "}
                              <span className="text-xs text-slate-500">(heure locale)</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ⭐ État intérieur – Sièges (carte unifiée avec photo principale + dégâts) */}
            {(interior?.sieges?.photos?.length > 0 || 
              (interior?.sieges?.hasDamage && interior?.sieges?.damagePhotos?.length > 0)) && (
              <div className="space-y-6 print:page-break-inside-avoid">
                {/* Titre de la zone avec style distinctif */}
                <div className="flex justify-center">
                  <div className="bg-teal-50 border border-teal-200 rounded-full px-6 py-2 shadow-sm w-fit text-center">
                    <h3 className="text-lg font-semibold text-teal-800 tracking-wide">
                      État intérieur – Sièges
                    </h3>
                  </div>
                </div>

                <Card className="border-2 border-teal-100">
                  <CardContent className="p-6 space-y-6">
                    {/* 📸 Section Photo principale + horodatage */}
                    {interior?.sieges?.photos && interior.sieges.photos.length > 0 && (() => {
                      const mainPhoto = interior.sieges.photos[0];
                      const timestamp = mainPhoto.uploadedAt || new Date().toISOString();

                      return (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                            Photo d'ensemble de la zone
                          </h4>
                          
                          <div className="flex flex-col md:flex-row md:items-start gap-6">
                            {/* Image à gauche */}
                            <div className="md:flex-1">
                              <img
                                src={mainPhoto.publicUrl}
                                alt="Sièges - Vue d'ensemble"
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
                      );
                    })()}

                    {/* 🚨 Section Dégâts sur les sièges (EXACTEMENT comme ExteriorZoneRecapCard) */}
                    <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                        Dégâts recensés sur cette zone
                      </h4>

                      {!interior?.sieges?.hasDamage || 
                       !interior?.sieges?.damagePhotos || 
                       !Array.isArray(interior.sieges.damagePhotos) ||
                       interior.sieges.damagePhotos.length === 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ Aucun dégât signalé sur cette zone
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Dégât unique (les sièges n'ont qu'un seul "dégât" avec plusieurs types) */}
                          <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/30 text-sm text-gray-800 space-y-2 transition-all">
                            <div className="font-semibold text-orange-800 flex items-center gap-2">
                              <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full text-xs">
                                Dégât #1
                              </span>
                            </div>

                            <div className="grid gap-2">
                              <div>
                                <span className="font-medium text-slate-700">Type :</span>{" "}
                                <span className="text-slate-800">
                                  {Array.isArray(interior.sieges.damages) && interior.sieges.damages.length > 0
                                    ? interior.sieges.damages.join(", ")
                                    : "—"}
                                </span>
                              </div>

                              {interior.sieges.notes && (
                                <div>
                                  <span className="font-medium text-slate-700">Commentaire :</span>{" "}
                                  <span className="text-slate-800">{interior.sieges.notes}</span>
                                </div>
                              )}
                            </div>

                            {/* Photos du dégât (avec zoom + horodatage) */}
                            {interior.sieges.damagePhotos && interior.sieges.damagePhotos.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                                  Photos du dégât ({interior.sieges.damagePhotos.length})
                                </p>
                                <div className="flex flex-wrap gap-4">
                                  {interior.sieges.damagePhotos.map((photo: InteriorPhoto, i: number) => (
                                    <InteriorDamagePhotoWithZoom
                                      key={i}
                                      photo={photo}
                                      alt={`Dégât siège - Photo ${i + 1}`}
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
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ligne 1 : État extérieur + État intérieur (2 colonnes) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Colonne gauche : État extérieur (résumé) */}
        <section className="space-y-6">
          <div className="flex justify-start items-center">
            <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
              <h2 className="text-xl font-bold text-teal-900 tracking-wide">
                État extérieur (résumé)
              </h2>
            </div>
          </div>

          <Card>
            <CardContent className="text-sm space-y-3 p-6">
              <div>
                <strong>Propreté extérieure :</strong>{" "}
                {safe(exterior?.propreteExterieure?.level)}
              </div>

              {exterior?.propreteExterieure?.notes && (
                <p className="text-xs text-gray-600">
                  {exterior.propreteExterieure.notes}
                </p>
              )}

              <div className="pt-2">
                <strong>Équipements coffre :</strong>
                <ul className="list-disc list-inside text-xs text-gray-700">
                  <li>Triangle : {exterior?.coffreEquipements?.triangle ? "Oui" : "Non"}</li>
                  <li>Gilet : {exterior?.coffreEquipements?.gilet ? "Oui" : "Non"}</li>
                  <li>
                    Roue de secours : {exterior?.coffreEquipements?.roueSecours ? "Oui" : "Non"}
                  </li>
                  <li>
                    Kit anti-crevaison :{" "}
                    {exterior?.coffreEquipements?.kitAntiCrevaison ? "Oui" : "Non"}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Colonne droite : État intérieur (résumé) */}
        <section className="space-y-6">
          <div className="flex justify-start items-center">
            <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
              <h2 className="text-xl font-bold text-teal-900 tracking-wide">
                État intérieur (résumé)
              </h2>
            </div>
          </div>

          <Card>
            <CardContent className="text-sm space-y-4 p-6">
              <div className="space-y-1">
                <div>
                  <strong>Propreté générale :</strong>{" "}
                  {safe(interior?.propreteGenerale?.level)}
                </div>
                {interior?.propreteGenerale?.notes && (
                  <p className="text-xs text-gray-600">
                    {interior.propreteGenerale.notes}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div>
                  <strong>Sièges :</strong>{" "}
                  {interior?.sieges?.hasDamage ? "Dégâts signalés" : "RAS"}
                </div>

                {interior?.sieges?.hasDamage &&
                  Array.isArray(interior?.sieges?.damages) && (
                    <ul className="list-disc list-inside text-xs text-gray-700">
                      {interior.sieges.damages.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}

                {interior?.sieges?.notes && (
                  <p className="text-xs text-gray-600">{interior.sieges.notes}</p>
                )}

                {/* ⚠️ Note : Les photos de dégâts sièges sont maintenant affichées dans la carte unifiée "État intérieur – Sièges" ci-dessus */}
              </div>

              <div className="space-y-1">
                <strong>Équipements fonctionnels :</strong>
                <ul className="list-disc list-inside text-xs text-gray-700">
                  <li>
                    Radio / multimédia :{" "}
                    {interior?.equipements?.radioOk ? "OK" : "Non fonctionnel"}
                  </li>
                  <li>
                    Climatisation :{" "}
                    {interior?.equipements?.acOk ? "OK" : "Non fonctionnelle"}
                  </li>
                  <li>
                    Verrouillage centralisé :{" "}
                    {interior?.equipements?.centralLockOk ? "OK" : "Non fonctionnel"}
                  </li>
                  <li>
                    Vitres électriques :{" "}
                    {interior?.equipements?.windowsOk ? "OK" : "Non fonctionnelles"}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Ligne 2 : Accessoires & Équipements + Remarques & Observations (2 colonnes) */}
      {(accessoiresCommentaire || step6Data?.remarques?.observations || remarques?.observations) && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Colonne gauche : Accessoires & Équipements – Commentaires (Step 5) */}
          {accessoiresCommentaire && (
            <section className="space-y-6">
              <div className="flex justify-start items-center">
                <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
                  <h2 className="text-xl font-bold text-teal-900 tracking-wide flex items-center gap-2">
                    🧰 Accessoires & Équipements – Commentaires
                  </h2>
                </div>
              </div>

              <Card>
                <CardContent className="text-sm space-y-4 p-6">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">Commentaire sur les accessoires</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {accessoiresCommentaire}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Colonne droite : Remarques & Observations (Step 6) */}
          {(step6Data?.remarques?.observations || remarques?.observations) && (
            <section className="space-y-6">
              <div className="flex justify-start items-center">
                <div className="bg-teal-100 border-l-4 border-teal-500 rounded-md px-5 py-2 shadow-sm">
                  <h2 className="text-xl font-bold text-teal-900 tracking-wide">
                    Remarques & Observations
                  </h2>
                </div>
              </div>

              <Card>
                <CardContent className="text-sm space-y-4 p-6">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">Observations générales</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {step6Data?.remarques?.observations || remarques?.observations}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}

      {/* Section Validation & signatures */}
      <section className="space-y-6">
        {/* Bannière de section niveau 1 - style spécial pour conclusion */}
        <div className="flex justify-start items-center">
          <div className="bg-teal-200 border-l-4 border-teal-600 rounded-md px-5 py-2 shadow-md">
            <h2 className="text-xl font-bold text-teal-900 tracking-wide flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Validation & signatures
            </h2>
            <p className="text-sm text-slate-700">
              Merci de confirmer l'état du véhicule avant le départ
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-6 md:grid-cols-2 text-sm p-6">
            <div className={`space-y-2 ${ownerSignatureMissing ? "border border-destructive rounded-lg p-2" : ""}`} id="field-signature-owner">
              <div className="font-medium text-gray-900">
                Signature propriétaire
              </div>
              <SignatureCanvas
                value={ownerSignature}
                onChange={(dataUrl) => setValue("ownerSignature", dataUrl)}
                label="Signature du propriétaire"
              />
            </div>

            <div className={`space-y-2 ${driverSignatureMissing ? "border border-destructive rounded-lg p-2" : ""}`} id="field-signature-driver">
              <div className="font-medium text-gray-900">
                Signature locataire
              </div>
              <SignatureCanvas
                value={driverSignature}
                onChange={(dataUrl) => setValue("driverSignature", dataUrl)}
                label="Signature du locataire"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const result = checkValidationData(true);
              if (!result.isValid) {
                navigateToFirstMissing(result.missingFields);
              }
            }}
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Vérifier les données
          </Button>

          <button
            type="button"
            disabled={isCheckinCompleted || isFinalizing}
            onClick={async () => {
              // ⚠️ Protection anti double-clic : retour immédiat si déjà en cours
              if (isFinalizing) {
                return;
              }

              // ⚠️ Vérification supplémentaire côté UI
              if (isCheckinCompleted) {
                toast.error("État des lieux finalisé", {
                  description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
                });
                return;
              }

              const result = checkValidationData(false);
              if (!result.isValid) {
                toast.error("Impossible de valider", {
                  description:
                    "Veuillez remplir tous les champs obligatoires avant de valider.",
                });
                navigateToFirstMissing(result.missingFields);
                return;
              }

              // ⭐ FINALISATION COMPLÈTE : Step 7 + Snapshot légal + Status "completed"
              if (bookingId && checkinId) {
                // ⭐ Phase 1 : Activer l'état de chargement
                setIsFinalizing(true);

                try {
                  const formValues = watch();

                  const step7Payload = {
                    completedAt: new Date().toISOString(),
                    validation: {
                      ownerSignature: formValues.ownerSignature || undefined,
                      renterSignature: formValues.driverSignature || undefined,
                      validatedAt: new Date().toISOString(),
                    },
                  };

                  console.log("[Section8Validation] 🎯 Démarrage finalisation...");

                  const result = await finalizeCheckinDepart({
                    checkinId,
                    bookingId,
                    ownerId: ownerId || null,
                    renterId: renterId || null,
                    step7Payload,
                  });

                  if (result.error) {
                    console.error('[Section8Validation] ❌ Erreur finalisation:', result.error);
                    toast.error("Erreur lors de la finalisation", {
                      description: result.error,
                    });
                    return;
                  }

                  // ⭐ Phase 2 : Vérifier l'état du PDF
                  // 🔍 LOG DE DEBUG TRÈS VISIBLE
                  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  console.log("🔍 [DEBUG PHASE 2 FRONT] RÉSULTAT REÇU DU BACKEND:");
                  console.log("🔍 [DEBUG PHASE 2 FRONT] result.error:", result.error);
                  console.log("🔍 [DEBUG PHASE 2 FRONT] result.pdfError:", result.pdfError);
                  console.log("🔍 [DEBUG PHASE 2 FRONT] result.data?.legal_pdf_url:", result.data?.legal_pdf_url);
                  console.log("🔍 [DEBUG PHASE 2 FRONT] result.data?.status:", result.data?.status);
                  console.log("🔍 [DEBUG PHASE 2 FRONT] Type de result.pdfError:", typeof result.pdfError);
                  console.log("🔍 [DEBUG PHASE 2 FRONT] result.pdfError existe?", 'pdfError' in result);
                  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  
                  console.log('[Section8Validation] 📄 Résultat finalisation:', {
                    checkinId: result.data?.id,
                    status: result.data?.status,
                    legal_pdf_url: result.data?.legal_pdf_url,
                    pdfError: result.pdfError, // ⭐ Phase 2 : Afficher pdfError dans la console
                  });

                  // ⭐ Phase 1 : Mise à jour immédiate du statut si finalisation réussie
                  if (result.data?.id && result.data?.status === "completed") {
                    // Propager le checkinId ET le statut pour mise à jour immédiate
                    if (onCheckinIdChange) {
                      onCheckinIdChange(result.data.id, "completed");
                    }

                    // ⭐ Phase 2 : Toujours afficher le toast de succès si la finalisation est réussie
                    toast.success("État des lieux finalisé avec succès !", {
                      description: "Un snapshot légal a été enregistré. L'état des lieux est maintenant verrouillé.",
                    });

                    // ⭐ Phase 2 : En plus, afficher un toast d'avertissement si le PDF a échoué
                    if (result.pdfError) {
                      console.warn("[Section8Validation] ⚠️ PDF error during finalizeCheckinDepart:", result.pdfError);
                      toast.warning("État des lieux finalisé, mais le PDF n'a pas pu être généré.", {
                        description: "C'est normal tant que la Phase 3 n'est pas implémentée.",
                        duration: 8000, // Afficher plus longtemps pour que l'utilisateur le voie
                      });
                    }
                  } else if (result.data?.id && onCheckinIdChange) {
                    // Fallback : propager uniquement le checkinId si le statut n'est pas "completed"
                    onCheckinIdChange(result.data.id);
                  }
                } catch (error: any) {
                  console.error('[Section8Validation] ❌ Erreur finalisation:', error);
                  toast.error("Erreur lors de la finalisation", {
                    description: error.message || "Veuillez réessayer.",
                  });
                } finally {
                  // ⭐ Phase 1 : Toujours réinitialiser l'état de chargement, même en cas d'erreur
                  setIsFinalizing(false);
                }
              } else {
                toast.error("Impossible de finaliser", {
                  description: "Booking ID ou Check-in ID manquant.",
                });
              }
            }}
            className={`rounded-md px-6 py-2 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 ${
              isCheckinCompleted || isFinalizing
                ? "bg-gray-400 cursor-not-allowed"
                : validationStatus.isValid
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 hover:bg-gray-500 cursor-not-allowed"
            }`}
          >
            {isFinalizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Finalisation en cours...</span>
              </>
            ) : isCheckinCompleted ? (
              "État des lieux finalisé"
            ) : (
              "Valider et enregistrer l'état des lieux"
            )}
          </button>

          {isCheckinCompleted && (
            <p className="text-xs text-muted-foreground text-center max-w-md">
              ✅ Cet état des lieux a été finalisé et est maintenant verrouillé.
            </p>
          )}

          {!validationStatus.isValid && (
            <p className="text-xs text-orange-600 text-center max-w-md">
              ⚠️ Certains champs obligatoires sont manquants. Complétez le
              formulaire avant de valider.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
