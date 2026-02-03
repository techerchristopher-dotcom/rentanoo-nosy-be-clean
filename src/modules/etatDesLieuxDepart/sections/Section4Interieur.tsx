import React, { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Car, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveStep4Draft, saveStep4SectionDraft } from "@/services/checkinDepartService";
import { ZoomableImage } from "@/components/ZoomableImage";
import { uploadInteriorSeatsPhoto, uploadInteriorCleanlinessPhoto, uploadInteriorDamagePhoto } from "@/modules/etatDesLieuxDepart/helpers/step4Helpers";
import { compressImage } from "@/utils/imageCompression";
import type { InteriorPhoto } from "@/types/step4";

const CameraIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const SEAT_ISSUE_TYPES = [
  "Tache / salissure",
  "Déchirure / trou",
  "Brûlure (cigarette)",
  "Couture abîmée",
  "Usure importante",
  "Siège déformé / affaissé",
  "Mécanisme cassé",
  "Autre"
];

type InteriorSectionKey = "sieges" | "propreteGenerale" | "equipements";

interface InteriorSection {
  id: number;
  key: InteriorSectionKey;
  title: string;
}

interface InteriorSectionValidation {
  isValid: boolean;
  errors: string[];
  detailedErrors: { field: string; message: string }[];
}

const interiorSections: InteriorSection[] = [
  { id: 1, key: "sieges", title: "Sièges" },
  { id: 2, key: "propreteGenerale", title: "Propreté intérieure" },
  { id: 3, key: "equipements", title: "Équipements intérieurs" },
];

// ⭐ Compression + upload (optimisé mobile)
const PHOTO_COMPRESSION = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.72,
  maxSizeMB: 0.3,
} as const;

const UPLOAD_CONCURRENCY = 2;

async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

type Section4InterieurProps = {
  onComplete?: () => void;
  bookingId?: string;
  bookingReferenceNumber?: number | null;
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
};

export default function Section4Interieur({
  onComplete,
  bookingId = "",
  bookingReferenceNumber = null,
  ownerId = null,
  renterId = null,
  checkinId = null,
  onCheckinIdChange,
}: Section4InterieurProps) {
  const { setValue, getValues, watch } = useFormContext();

  // ⭐ States pour l'accordion
  const [openSectionIndex, setOpenSectionIndex] = useState<number | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [invalidSections, setInvalidSections] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // ⭐ States locaux pour les sections (utilisent InteriorPhoto[] au lieu de File[])
  const [cleanlinessPhotos, setCleanlinessPhotos] = useState<InteriorPhoto[]>([]);
  const [cleanlinessLevel, setCleanlinessLevel] = useState<"" | "Excellent" | "Bon" | "Moyen" | "Sale">("");
  const [cleanlinessNotes, setCleanlinessNotes] = useState("");

  const [seatsPhotos, setSeatsPhotos] = useState<InteriorPhoto[]>([]);
  const [seatsHasDamage, setSeatsHasDamage] = useState(false);

  type SeatsReport = {
    types: string[];
    notes: string;
    photos: InteriorPhoto[];
  };

  const [seatsReport, setSeatsReport] = useState<SeatsReport>({
    types: [],
    notes: "",
    photos: []
  });

  const [radioOk, setRadioOk] = useState<boolean>(true);
  const [acOk, setAcOk] = useState<boolean>(true);
  const [centralLockOk, setCentralLockOk] = useState<boolean>(true);
  const [windowsOk, setWindowsOk] = useState<boolean>(true);

  /**
   * ⭐ VALIDATION GRANULAIRE PAR SECTION
   */
  const validateInteriorSection = (sectionKey: InteriorSectionKey): InteriorSectionValidation => {
    const errors: string[] = [];
    const detailedErrors: { field: string; message: string }[] = [];
    const values = getValues();
    const interior = values.interiorInspection || {};

    switch (sectionKey) {
      case "sieges": {
        const sieges = interior.sieges || {};
        const photos = sieges.photos || [];
        const hasDamage = sieges.hasDamage;

        if (!photos.length) {
          const msg = "Au moins une photo des sièges est obligatoire";
          errors.push(msg);
          detailedErrors.push({ field: "sieges.photos", message: msg });
        }

        if (hasDamage) {
          const damages = sieges.damages || [];
          if (!damages.length) {
            const msg = "Veuillez sélectionner au moins un type de dégât";
            errors.push(msg);
            detailedErrors.push({ field: "sieges.damages", message: msg });
          }
        }

        break;
      }

      case "propreteGenerale": {
        const proprete = interior.propreteGenerale || {};

        if (!proprete.level) {
          const msg = "Le niveau de propreté intérieure est obligatoire";
          errors.push(msg);
          detailedErrors.push({ field: "propreteGenerale.level", message: msg });
        }

        const photos = proprete.photos || [];
        if (!photos.length) {
          const msg = "Au moins une photo de l'intérieur est obligatoire";
          errors.push(msg);
          detailedErrors.push({ field: "propreteGenerale.photos", message: msg });
        }

        break;
      }

      case "equipements": {
        const eq = interior.equipements || {};
        const fields: Array<{ key: string; label: string }> = [
          { key: "radioOk", label: "Radio / multimédia" },
          { key: "acOk", label: "Climatisation" },
          { key: "centralLockOk", label: "Verrouillage centralisé" },
          { key: "windowsOk", label: "Vitres électriques" },
        ];

        const missing: string[] = [];
        fields.forEach((f) => {
          if (typeof eq[f.key] === "undefined") {
            missing.push(f.label);
          }
        });

        if (missing.length > 0) {
          const msg = `Veuillez indiquer l'état des équipements : ${missing.join(", ")}`;
          errors.push(msg);
          detailedErrors.push({ field: "equipements", message: msg });
        }

        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      detailedErrors,
    };
  };

  /**
   * ⭐ Recalculer les sections complètes depuis les valeurs hydratées
   */
  useEffect(() => {
    const sections: InteriorSectionKey[] = ["sieges", "propreteGenerale", "equipements"];
    const nextCompleted = new Set<string>();
    const nextInvalid = new Set<string>();

    sections.forEach((s) => {
      const res = validateInteriorSection(s);
      if (res.isValid) {
        nextCompleted.add(s);
      } else {
        nextInvalid.add(s);
      }
    });

    setCompletedSections(nextCompleted);
    setInvalidSections(nextInvalid);

    // Ouvrir la première section incomplète si l'actuelle est nulle
    if (openSectionIndex === null) {
      const firstIncompleteIdx = sections.findIndex((s) => !nextCompleted.has(s));
      if (firstIncompleteIdx >= 0) {
        setOpenSectionIndex(firstIncompleteIdx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(watch("interiorInspection.sieges") || {}),
    JSON.stringify(watch("interiorInspection.propreteGenerale") || {}),
    JSON.stringify(watch("interiorInspection.equipements") || {}),
  ]);

  /**
   * ⭐ Hydratation des states locaux depuis les valeurs persistées du formulaire
   */
  useEffect(() => {
    const interior = watch("interiorInspection") || {};
    
    // Hydrater les photos des sièges
    const siegesPhotos = interior.sieges?.photos || [];
    if (Array.isArray(siegesPhotos) && siegesPhotos.length > 0) {
      // Vérifier si ce sont des InteriorPhoto (avec publicUrl) ou des File
      const photos = siegesPhotos.filter((p: any) => {
        if (p instanceof File) return false; // Ignorer les File temporaires
        return p?.publicUrl || p?.storagePath; // Garder les InteriorPhoto persistées
      }) as InteriorPhoto[];
      if (photos.length > 0) {
        setSeatsPhotos(photos);
      }
    }
    
    // Hydrater le toggle hasDamage des sièges
    if (typeof interior.sieges?.hasDamage === "boolean") {
      setSeatsHasDamage(interior.sieges.hasDamage);
    }
    
    // Hydrater les dégâts des sièges
    if (interior.sieges?.damages) {
      setSeatsReport(prev => ({
        ...prev,
        types: interior.sieges.damages || []
      }));
    }
    if (interior.sieges?.notes) {
      setSeatsReport(prev => ({
        ...prev,
        notes: interior.sieges.notes || ""
      }));
    }
    // Photos de dégâts des sièges
    const damagePhotos = interior.sieges?.damagePhotos || [];
    if (Array.isArray(damagePhotos) && damagePhotos.length > 0) {
      const photos = damagePhotos.filter((p: any) => p?.publicUrl || p?.storagePath) as InteriorPhoto[];
      if (photos.length > 0) {
        setSeatsReport(prev => ({
          ...prev,
          photos
        }));
      }
    }
    
    // Hydrater les photos de propreté
    const propretePhotos = interior.propreteGenerale?.photos || [];
    if (Array.isArray(propretePhotos) && propretePhotos.length > 0) {
      const photos = propretePhotos.filter((p: any) => p?.publicUrl || p?.storagePath) as InteriorPhoto[];
      if (photos.length > 0) {
        setCleanlinessPhotos(photos);
      }
    }
    
    // Hydrater le niveau de propreté
    if (interior.propreteGenerale?.level) {
      setCleanlinessLevel(interior.propreteGenerale.level);
    }
    
    // Hydrater les notes de propreté
    if (interior.propreteGenerale?.notes) {
      setCleanlinessNotes(interior.propreteGenerale.notes);
    }
    
    // Hydrater les équipements
    if (interior.equipements) {
      if (typeof interior.equipements.radioOk === "boolean") {
        setRadioOk(interior.equipements.radioOk);
      }
      if (typeof interior.equipements.acOk === "boolean") {
        setAcOk(interior.equipements.acOk);
      }
      if (typeof interior.equipements.centralLockOk === "boolean") {
        setCentralLockOk(interior.equipements.centralLockOk);
      }
      if (typeof interior.equipements.windowsOk === "boolean") {
        setWindowsOk(interior.equipements.windowsOk);
      }
    }
  }, [watch("interiorInspection")]);

  /**
   * ⭐ Helpers de scroll
   */
  const scrollToInteriorSectionIndex = (index: number) => {
    if (index < 0) return;
    setTimeout(() => {
      const element = document.querySelector(`[data-interior-section-index="${index}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const scrollToInteriorSubsection = (field: string) => {
    if (!field) return;
    setTimeout(() => {
      const element = document.querySelector(`[data-interior-subsection="${field}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  /**
   * ⭐ Scroll vers la carte récap intérieure
   */
  const scrollToInteriorSummary = () => {
    setTimeout(() => {
      const element = document.querySelector('[data-interior-summary="true"]');
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  /**
   * ⭐ Helper de nettoyage des données dépendantes (dégâts)
   */
  const cleanupInteriorDamage = (sectionKey: InteriorSectionKey) => {
    if (sectionKey === "sieges") {
      // Nettoyer les dégâts des sièges
      setSeatsReport({
        types: [],
        notes: "",
        photos: []
      });
      setValue("interiorInspection.sieges.damages", [], { shouldDirty: true });
      setValue("interiorInspection.sieges.notes", "", { shouldDirty: true });
      // Les photos de dégâts sont dans seatsReport.photos, déjà nettoyées ci-dessus
      setValue("interiorInspection.sieges.damagePhotos", [], { shouldDirty: true });
      console.log("[NETTOYAGE] Dégâts sièges supprimés (toggle → false)");
    }
    // Pour les autres sections, ajouter le nettoyage si nécessaire
  };

  /**
   * ⭐ Sauvegarde partielle d'une section
   */
  const saveInteriorSectionDraft = async (sectionKey: InteriorSectionKey) => {
    const values = getValues();
    const interior = values.interiorInspection || {};

    // Construire le payload avec les données synchronisées
    let payload: any = {};
    
    if (sectionKey === "sieges") {
      payload.sieges = {
        photos: seatsPhotos,
        hasDamage: seatsHasDamage,
        damages: seatsReport.types,
        notes: seatsReport.notes,
        damagePhotos: seatsReport.photos,
      };
    } else if (sectionKey === "propreteGenerale") {
      payload.propreteGenerale = {
        photos: cleanlinessPhotos,
        level: cleanlinessLevel || undefined,
        notes: cleanlinessNotes || undefined,
      };
    } else if (sectionKey === "equipements") {
      payload.equipements = {
        radioOk,
        acOk,
        centralLockOk,
        windowsOk,
      };
    }

    return saveStep4SectionDraft({
      bookingId,
      ownerId,
      renterId,
      checkinId: checkinId || null,
      sectionKey,
      ...payload,
    });
  };

  /**
   * ⭐ NAVIGATION VERS LA SECTION SUIVANTE avec validation stricte
   */
  const handleCompleteInteriorSectionAndGoNext = async (
    currentSection: InteriorSection,
    currentIdx: number
  ) => {
    const sectionKey = currentSection.key;
    const validation = validateInteriorSection(sectionKey);

    if (!validation.isValid) {
      // Blocage strict : afficher les erreurs
      toast.error("Section intérieure incomplète", {
        description: validation.errors.slice(0, 2).join(". ") +
          (validation.errors.length > 2 ? `... (+${validation.errors.length - 2} autre(s))` : "")
      });

      // Marquer visuellement la section comme invalide
      setInvalidSections((prev) => {
        const next = new Set(prev);
        next.add(sectionKey);
        return next;
      });

      // Ouvrir la section invalide + scroll
      setOpenSectionIndex(currentIdx);
      const firstDetailed = validation.detailedErrors[0];
      if (firstDetailed) {
        scrollToInteriorSubsection(firstDetailed.field);
      } else {
        scrollToInteriorSectionIndex(currentIdx);
      }
      return;
    }

    // Section valide : sauvegarde incrémentale + marquer comme complète
    try {
      const result = await saveInteriorSectionDraft(sectionKey);

      // Propager un éventuel checkinId créé
      if (!checkinId && result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
      }

      // Marquer la section complète localement
      setCompletedSections((prev) => new Set(prev).add(sectionKey));
      setInvalidSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionKey);
        return next;
      });
    } catch (error: any) {
      console.error('[Step4] ❌ Erreur sauvegarde partielle:', error);
      toast.error('❌ Sauvegarde de la section impossible', {
        description: error?.message || "Réessayez ou terminez l'inspection intérieure pour sauvegarder.",
      });
      return;
    }

    // Toast de succès
    toast.success(`✓ ${currentSection.title} terminé`, {
      description: "Passage à la section suivante"
    });

    // Passer à la section suivante
    const nextIndex = currentIdx + 1;
    if (nextIndex < interiorSections.length) {
      setOpenSectionIndex(nextIndex);
      scrollToInteriorSectionIndex(nextIndex);
    } else {
      // Dernière section : fermer tout
      setOpenSectionIndex(null);
    }
  };

  /**
   * ⭐ CTA global : Terminer l'inspection intérieure et passer à la validation finale
   */
  const handleCompleteInteriorAndGoNext = async () => {
    const sections: InteriorSectionKey[] = ["sieges", "propreteGenerale", "equipements"];
    const invalid: string[] = [];

    sections.forEach((s) => {
      const res = validateInteriorSection(s);
      if (!res.isValid) invalid.push(s);
    });

    if (invalid.length > 0) {
      // Marquer toutes les sections invalides + Toast
      setInvalidSections((prev) => {
        const next = new Set(prev);
        invalid.forEach((s) => next.add(s));
        return next;
      });
      toast.error("Inspection intérieure incomplète", {
        description: `Sections à compléter : ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`
      });
      // Ouvrir et scroller vers la première section invalide
      const first = invalid[0];
      const idx = sections.indexOf(first as InteriorSectionKey);
      if (idx >= 0) {
        setOpenSectionIndex(idx);
        scrollToInteriorSectionIndex(idx);
      } else {
        // Si aucune section trouvée, scroller vers le récap
        scrollToInteriorSummary();
      }
      return;
    }

    // Toutes les sections sont valides → snapshot global + navigation
    setIsSaving(true);
    try {
      // Construire le payload avec les données synchronisées depuis les states locaux
      const step4Payload = {
        completedAt: new Date().toISOString(), // ⭐ Ajout de completedAt pour la progression
        sieges: {
          photos: seatsPhotos,
          hasDamage: seatsHasDamage,
          damages: seatsReport.types,
          notes: seatsReport.notes,
          damagePhotos: seatsReport.photos,
        },
        propreteGenerale: {
          photos: cleanlinessPhotos,
          level: cleanlinessLevel || undefined,
          notes: cleanlinessNotes || undefined,
        },
        equipements: {
          radioOk,
          acOk,
          centralLockOk,
          windowsOk,
        },
      };

      const result = await saveStep4Draft({
        bookingId,
        ownerId,
        renterId,
        checkinId: checkinId || null,
        step4: step4Payload,
      });

      // Propager le checkinId
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
      }

      toast.success('✅ Inspection intérieure sauvegardée !', {
        description: 'Vos données ont été enregistrées avec succès.',
      });

      // Navigation vers l'étape suivante
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('[Step4] ❌ Erreur sauvegarde:', error);
      toast.error('❌ Erreur lors de la sauvegarde', {
        description: error.message || 'Vos données n\'ont pas été perdues, vous pouvez réessayer.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ⭐ Génère le texte du bouton de navigation pour chaque section
   */
  const getNavigationButtonText = (section: InteriorSection, idx: number): string => {
    const nextSectionMap: Record<string, string> = {
      'sieges': 'à la propreté intérieure',
      'propreteGenerale': 'aux équipements intérieurs',
      'equipements': 'à la validation finale'
    };

    const nextSection = nextSectionMap[section.key];

    if (idx === interiorSections.length - 1) {
      return "Terminer l'inspection intérieure ✅";
    }

    return `Terminer l'inspection ${section.key === "sieges" ? "des sièges" : section.key === "propreteGenerale" ? "de la propreté intérieure" : "des équipements"} et passer ${nextSection} →`;
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          État intérieur
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Inspectez l'état intérieur du véhicule
        </p>
      </div>

      {interiorSections.map((section, idx) => {
        const isOpen = openSectionIndex === idx;
        const sectionKey = section.key;
        const isSectionComplete = completedSections.has(sectionKey);
        const isSectionInvalid = invalidSections.has(sectionKey);

        return (
          <Collapsible
            key={section.id}
            open={isOpen}
            onOpenChange={(open) => setOpenSectionIndex(open ? idx : null)}
          >
            <Card
              data-interior-section-index={idx}
              className={cn(
                'transition-all duration-300 overflow-hidden bg-white shadow-sm',
                'hover:shadow-md',
                isSectionComplete && 'border-l-4 border-l-success',
                isSectionInvalid && 'border-destructive bg-destructive/5'
              )}
            >
              <CollapsibleTrigger asChild>
                <CardContent className="p-4 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium flex-shrink-0",
                        isSectionComplete ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                      )}>
                        {isSectionComplete ? <CheckCircle2 className="h-4 w-4" /> : section.id}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn(
                            "font-semibold text-base",
                            isSectionInvalid ? "text-destructive" : "text-foreground"
                          )}>
                            {section.title}
                          </div>
                          {isSectionComplete && (
                            <span className="bg-success/10 text-success text-xs font-medium px-2 py-0.5 rounded-full">
                              Complète
                            </span>
                          )}
                          {isSectionInvalid && !isSectionComplete && (
                            <span className="bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5 rounded-full">
                              À compléter
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isOpen ? (
                          <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="p-4 pt-0 space-y-4">
                  {/* Section Sièges */}
                  {sectionKey === "sieges" && (
                    <>
                      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4" data-interior-subsection="sieges.photos">
                        <div className="font-medium text-gray-900 mb-1 text-sm">
                          Photos des sièges
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          {seatsPhotos.length === 0
                            ? "Appuyez pour prendre ou ajouter une photo"
                            : "Vous pouvez remplacer ou supprimer la photo principale"}
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="seats-photo-input"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;

                            setIsUploadingPhoto(true);

                            try {
                              const currentPhotos = seatsPhotos;
                              const uploadedResults = await mapLimit(files, UPLOAD_CONCURRENCY, async (file) => {
                                const compressed = await compressImage(file, PHOTO_COMPRESSION);
                                const base64 = await fileToBase64(compressed);
                                return uploadInteriorSeatsPhoto(base64, bookingId, bookingReferenceNumber);
                              });
                              const uploadedPhotos = uploadedResults.filter(
                                (p): p is InteriorPhoto => p !== null
                              );

                              if (uploadedPhotos.length > 0) {
                                // Si aucune photo existante, ajouter normalement
                                // Si photos existent, remplacer la première par la nouvelle (comme Step 3)
                                const allPhotos = currentPhotos.length === 0
                                  ? [...currentPhotos, ...uploadedPhotos]
                                  : [uploadedPhotos[0], ...currentPhotos.slice(1), ...uploadedPhotos.slice(1)];
                                setSeatsPhotos(allPhotos);
                                // Synchroniser avec RHF
                                setValue("interiorInspection.sieges.photos", allPhotos, { shouldDirty: true });
                                toast.success(
                                  currentPhotos.length === 0
                                    ? `✅ ${uploadedPhotos.length} photo(s) de sièges uploadée(s)`
                                    : `✅ Photo remplacée`
                                );
                              }
                            } catch (error: any) {
                              console.error('[Step4] ❌ Erreur upload photo sièges:', error);
                              toast.error('❌ Erreur lors de l\'upload des photos');
                            } finally {
                              setIsUploadingPhoto(false);
                              e.target.value = '';
                            }
                          }}
                        />

                        {seatsPhotos.length === 0 ? (
                          // Cas A — aucune photo : bouton "Ajouter une photo"
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('seats-photo-input')?.click();
                              }}
                              disabled={isUploadingPhoto}
                              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              <CameraIcon className="h-4 w-4" />
                              <span className="ml-1">
                                {isUploadingPhoto ? "Upload en cours..." : "Ajouter une photo"}
                              </span>
                            </button>
                          </div>
                        ) : (
                          // Cas B — au moins une photo : affichage en grand (EXACTEMENT comme Step 3)
                          <div className="relative">
                            <div
                              className="group cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('seats-photo-input')?.click();
                              }}
                            >
                              <img
                                src={seatsPhotos[0].publicUrl}
                                alt="Photo principale des sièges"
                                className="w-full max-w-[900px] mx-auto aspect-[16/9] object-cover rounded-lg border"
                              />
                            </div>
                            {/* Bouton supprimer (overlay discret en haut à droite) */}
                            <button
                              type="button"
                              aria-label="Supprimer la photo principale"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = seatsPhotos.slice(1);
                                setSeatsPhotos(updated);
                                setValue("interiorInspection.sieges.photos", updated, { shouldDirty: true });
                              }}
                              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
                            >
                              ×
                            </button>
                            {/* Bouton changer (discret sous la photo) */}
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById('seats-photo-input')?.click();
                                }}
                                className="mt-3 text-xs text-blue-700 hover:text-blue-800 underline"
                              >
                                Changer la photo
                              </button>
                            </div>
                            
                            {/* Autres photos en mini-vignettes (si plusieurs) */}
                            {seatsPhotos.length > 1 && (
                              <div className="mt-3">
                                <div className="text-xs text-gray-600 mb-2">
                                  {seatsPhotos.length - 1} autre{seatsPhotos.length > 2 ? "s" : ""} photo{seatsPhotos.length > 2 ? "s" : ""}
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                  {seatsPhotos.slice(1).map((photo, photoIdx) => (
                                    <div key={photoIdx + 1} className="relative">
                                      <ZoomableImage
                                        src={photo.publicUrl}
                                        alt={`siege-${photoIdx + 1}`}
                                        className="h-16 w-16 rounded-md border border-gray-300 object-cover cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => {
                                          // Promouvoir cette photo en photo principale
                                          const reordered = [photo, ...seatsPhotos.filter((_, i) => i !== photoIdx + 1)];
                                          setSeatsPhotos(reordered);
                                          setValue("interiorInspection.sieges.photos", reordered, { shouldDirty: true });
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextPhotos = seatsPhotos.filter((_, i) => i !== photoIdx + 1);
                                          setSeatsPhotos(nextPhotos);
                                          setValue("interiorInspection.sieges.photos", nextPhotos, { shouldDirty: true });
                                        }}
                                        className="absolute -top-2 -right-2 bg-white text-gray-700 rounded-full border border-gray-300 w-5 h-5 text-xs flex items-center justify-center shadow-sm z-10"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border border-gray-200 rounded-md bg-white p-3">
                        <div className="text-sm font-medium text-gray-900">
                          Dégâts visibles sur les sièges ?
                        </div>
                        <button
                          type="button"
                          aria-pressed={seatsHasDamage}
                          onClick={() => {
                            const nextValue = !seatsHasDamage;
                            setSeatsHasDamage(nextValue);
                            setValue("interiorInspection.sieges.hasDamage", nextValue, { shouldDirty: true });

                            if (nextValue === false) {
                              cleanupInteriorDamage("sieges");
                            }
                          }}
                          className={cn(
                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                            seatsHasDamage ? "bg-green-600 border-green-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                              seatsHasDamage ? "translate-x-5" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>

                      {seatsHasDamage && (
                        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 space-y-4" data-interior-subsection="sieges.damages">
                          <div className="font-semibold text-red-900">
                            Dégâts sur les sièges signalés
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-medium text-red-900">
                              Sélectionne tout ce qui s'applique :
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {SEAT_ISSUE_TYPES.map((t) => {
                                const selected = seatsReport.types.includes(t);

                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      setSeatsReport(prev => {
                                        const already = prev.types.includes(t);
                                        const nextTypes = already
                                          ? prev.types.filter(x => x !== t)
                                          : [...prev.types, t];

                                        setValue("interiorInspection.sieges.damages", nextTypes);
                                        return { ...prev, types: nextTypes };
                                      });
                                    }}
                                    className={cn(
                                      "px-2 py-1 rounded-full border text-xs font-medium",
                                      selected
                                        ? "bg-red-600 text-white border-red-600"
                                        : "bg-white text-red-700 border-red-300"
                                    )}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <textarea
                              className="w-full rounded-md border border-red-300 bg-white p-2 text-sm text-gray-800 placeholder:text-gray-400"
                              placeholder="Précisions (ex: brûlure siège passager, couture déchirée...)"
                              rows={2}
                              value={seatsReport.notes}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSeatsReport(prev => {
                                  setValue("interiorInspection.sieges.notes", value);
                                  return { ...prev, notes: value };
                                });
                              }}
                            />
                          </div>

                          <div className="rounded-md border border-dashed border-red-300 bg-red-50 p-3 text-center">
                            <div className="text-sm font-medium text-red-900 mb-2">
                              Photos des dégâts sur les sièges
                            </div>

                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              id="seats-damage-photo-input"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;

                                setIsUploadingPhoto(true);

                                try {
                                  const currentPhotos = seatsReport.photos;

                                  const uploadedResults = await mapLimit(files, UPLOAD_CONCURRENCY, async (file) => {
                                    const compressed = await compressImage(file, PHOTO_COMPRESSION);
                                    const base64 = await fileToBase64(compressed);
                                    return uploadInteriorDamagePhoto(
                                      base64,
                                      bookingId,
                                      bookingReferenceNumber,
                                      "sieges"
                                    );
                                  });
                                  const uploadedPhotos = uploadedResults.filter(
                                    (p): p is InteriorPhoto => p !== null
                                  );

                                  if (uploadedPhotos.length > 0) {
                                    const allPhotos = [...currentPhotos, ...uploadedPhotos];
                                    setSeatsReport((prev) => ({
                                      ...prev,
                                      photos: allPhotos,
                                    }));
                                    // Synchroniser avec RHF
                                    setValue("interiorInspection.sieges.damagePhotos", allPhotos, {
                                      shouldDirty: true,
                                    });
                                    toast.success(
                                      `✅ ${uploadedPhotos.length} photo(s) de dégât uploadée(s)`
                                    );
                                  }
                                } catch (error: any) {
                                  console.error("[Step4] ❌ Erreur upload photo dégât:", error);
                                  toast.error('❌ Erreur lors de l\'upload des photos');
                                } finally {
                                  setIsUploadingPhoto(false);
                                  e.target.value = '';
                                }
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById('seats-damage-photo-input')?.click();
                              }}
                              disabled={isUploadingPhoto}
                              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              <CameraIcon className="h-4 w-4" />
                              <span className="ml-2">
                                {isUploadingPhoto ? "Upload en cours..." : "Ajouter des photos"}
                              </span>
                            </button>

                            {seatsReport.photos.length > 0 && (() => {
                              const main = seatsReport.photos[0];
                              const others = seatsReport.photos.slice(1);
                              return (
                                <div className="mt-3 space-y-3">
                                  {/* Grande photo principale (EXACTEMENT comme Step 3) */}
                                  <div className="relative">
                                    <img
                                      src={main.publicUrl}
                                      alt="Photo principale du dégât siège"
                                      className="w-full max-w-[900px] mx-auto aspect-[16/9] object-cover rounded-lg border border-red-300"
                                    />
                                    {/* Supprimer la photo principale */}
                                    <button
                                      type="button"
                                      aria-label="Supprimer la photo principale"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nextPhotos = seatsReport.photos.slice(1);
                                        setSeatsReport(prev => ({
                                          ...prev,
                                          photos: nextPhotos
                                        }));
                                        setValue("interiorInspection.sieges.damagePhotos", nextPhotos, { shouldDirty: true });
                                      }}
                                      className="absolute top-2 right-2 bg-red-600/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {/* Autres photos en mini-vignettes (si plusieurs) */}
                                  {others.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                      {others.map((photo: InteriorPhoto, idx: number) => (
                                        <div key={idx} className="relative">
                                          <img
                                            src={photo.publicUrl}
                                            alt={`degat-siege-thumb-${idx}`}
                                            className="h-16 w-16 rounded-md object-cover border border-red-300 cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => {
                                              // Promouvoir cette photo en photo principale
                                              const reordered = [photo, ...others.filter((_, j) => j !== idx)];
                                              setSeatsReport(prev => ({
                                                ...prev,
                                                photos: reordered
                                              }));
                                              setValue("interiorInspection.sieges.damagePhotos", reordered, { shouldDirty: true });
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const nextPhotos = [main, ...others.filter((_, j) => j !== idx)];
                                              setSeatsReport(prev => ({
                                                ...prev,
                                                photos: nextPhotos
                                              }));
                                              setValue("interiorInspection.sieges.damagePhotos", nextPhotos, { shouldDirty: true });
                                            }}
                                            className="absolute -top-2 -right-2 bg-white text-red-700 rounded-full border border-red-300 w-5 h-5 text-xs flex items-center justify-center shadow-sm"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Bouton pour ajouter d'autres photos (réutilise l'input existant via le bouton au-dessus) */}
                                  <div className="flex justify-center">
                                    <span className="text-[11px] text-red-700/80">
                                      Utilisez "Ajouter des photos" ci-dessus pour compléter le dossier
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* CTA section Sièges */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteInteriorSectionAndGoNext(section, idx);
                          }}
                          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {getNavigationButtonText(section, idx)}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Section Propreté intérieure */}
                  {sectionKey === "propreteGenerale" && (
                    <>
                      <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4" data-interior-subsection="propreteGenerale.photos">
                        <div className="font-medium text-gray-900 mb-1 text-sm">
                          Photos de l'intérieur (vue générale)
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          {cleanlinessPhotos.length === 0
                            ? "Appuyez pour prendre ou ajouter une photo"
                            : "Vous pouvez remplacer ou supprimer la photo principale"}
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="cleanliness-photo-input"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;

                            setIsUploadingPhoto(true);

                            try {
                              const currentPhotos = cleanlinessPhotos;
                              const uploadedResults = await mapLimit(files, UPLOAD_CONCURRENCY, async (file) => {
                                const compressed = await compressImage(file, PHOTO_COMPRESSION);
                                const base64 = await fileToBase64(compressed);
                                return uploadInteriorCleanlinessPhoto(base64, bookingId, bookingReferenceNumber);
                              });
                              const uploadedPhotos = uploadedResults.filter(
                                (p): p is InteriorPhoto => p !== null
                              );

                              if (uploadedPhotos.length > 0) {
                                // Si aucune photo existante, ajouter normalement
                                // Si photos existent, remplacer la première par la nouvelle (comme Step 3)
                                const allPhotos = currentPhotos.length === 0
                                  ? [...currentPhotos, ...uploadedPhotos]
                                  : [uploadedPhotos[0], ...currentPhotos.slice(1), ...uploadedPhotos.slice(1)];
                                setCleanlinessPhotos(allPhotos);
                                // Synchroniser avec RHF
                                setValue("interiorInspection.propreteGenerale.photos", allPhotos, { shouldDirty: true });
                                toast.success(
                                  currentPhotos.length === 0
                                    ? `✅ ${uploadedPhotos.length} photo(s) de propreté uploadée(s)`
                                    : `✅ Photo remplacée`
                                );
                              }
                            } catch (error: any) {
                              console.error('[Step4] ❌ Erreur upload photo propreté:', error);
                              toast.error('❌ Erreur lors de l\'upload des photos');
                            } finally {
                              setIsUploadingPhoto(false);
                              e.target.value = '';
                            }
                          }}
                        />

                        {cleanlinessPhotos.length === 0 ? (
                          // Cas A — aucune photo : bouton "Ajouter une photo"
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('cleanliness-photo-input')?.click();
                              }}
                              disabled={isUploadingPhoto}
                              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              <CameraIcon className="h-4 w-4" />
                              <span className="ml-1">
                                {isUploadingPhoto ? "Upload en cours..." : "Ajouter une photo"}
                              </span>
                            </button>
                          </div>
                        ) : (
                          // Cas B — au moins une photo : affichage en grand (EXACTEMENT comme Step 3)
                          <div className="relative">
                            <div
                              className="group cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById('cleanliness-photo-input')?.click();
                              }}
                            >
                              <img
                                src={cleanlinessPhotos[0].publicUrl}
                                alt="Photo principale de propreté intérieure"
                                className="w-full max-w-[900px] mx-auto aspect-[16/9] object-cover rounded-lg border"
                              />
                            </div>
                            {/* Bouton supprimer (overlay discret en haut à droite) */}
                            <button
                              type="button"
                              aria-label="Supprimer la photo principale"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = cleanlinessPhotos.slice(1);
                                setCleanlinessPhotos(updated);
                                setValue("interiorInspection.propreteGenerale.photos", updated, { shouldDirty: true });
                              }}
                              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
                            >
                              ×
                            </button>
                            {/* Bouton changer (discret sous la photo) */}
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById('cleanliness-photo-input')?.click();
                                }}
                                className="mt-3 text-xs text-blue-700 hover:text-blue-800 underline"
                              >
                                Changer la photo
                              </button>
                            </div>
                            
                            {/* Autres photos en mini-vignettes (si plusieurs) */}
                            {cleanlinessPhotos.length > 1 && (
                              <div className="mt-3">
                                <div className="text-xs text-gray-600 mb-2">
                                  {cleanlinessPhotos.length - 1} autre{cleanlinessPhotos.length > 2 ? "s" : ""} photo{cleanlinessPhotos.length > 2 ? "s" : ""}
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                  {cleanlinessPhotos.slice(1).map((photo, photoIdx) => (
                                    <div key={photoIdx + 1} className="relative">
                                      <ZoomableImage
                                        src={photo.publicUrl}
                                        alt={`interieur-${photoIdx + 1}`}
                                        className="h-16 w-16 rounded-md border border-gray-300 object-cover cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => {
                                          // Promouvoir cette photo en photo principale
                                          const reordered = [photo, ...cleanlinessPhotos.filter((_, i) => i !== photoIdx + 1)];
                                          setCleanlinessPhotos(reordered);
                                          setValue("interiorInspection.propreteGenerale.photos", reordered, { shouldDirty: true });
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextPhotos = cleanlinessPhotos.filter((_, i) => i !== photoIdx + 1);
                                          setCleanlinessPhotos(nextPhotos);
                                          setValue("interiorInspection.propreteGenerale.photos", nextPhotos, { shouldDirty: true });
                                        }}
                                        className="absolute -top-2 -right-2 bg-white text-gray-700 rounded-full border border-gray-300 w-5 h-5 text-xs flex items-center justify-center shadow-sm z-10"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2" data-interior-subsection="propreteGenerale.level">
                        <div className="text-sm font-medium text-gray-900">
                          Niveau de propreté
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {["Excellent", "Bon", "Moyen", "Sale"].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => {
                                const value = level as "Excellent" | "Bon" | "Moyen" | "Sale";
                                setCleanlinessLevel(value);
                                setValue("interiorInspection.propreteGenerale.level", value);
                              }}
                              className={cn(
                                "px-3 py-2 rounded-md border text-sm font-medium",
                                cleanlinessLevel === level
                                  ? (
                                    level === "Sale"
                                      ? "bg-red-600 text-white border-red-600"
                                      : "bg-teal-600 text-white border-teal-600"
                                  )
                                  : "bg-white text-gray-800 border-gray-300"
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          Remarques (optionnel)
                        </div>
                        <textarea
                          className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-800 placeholder:text-gray-400"
                          placeholder="Ex: tapis sale côté passager, odeur tabac légère..."
                          rows={2}
                          value={cleanlinessNotes}
                          onChange={(e) => {
                            const text = e.target.value;
                            setCleanlinessNotes(text);
                            setValue("interiorInspection.propreteGenerale.notes", text);
                          }}
                        />
                      </div>

                      {/* CTA section Propreté */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteInteriorSectionAndGoNext(section, idx);
                          }}
                          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {getNavigationButtonText(section, idx)}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Section Équipements */}
                  {sectionKey === "equipements" && (
                    <>
                      <div className="space-y-4" data-interior-subsection="equipements">
                        <div className="flex items-center justify-between border border-gray-200 rounded-md bg-white p-3">
                          <div className="text-sm font-medium text-gray-900">
                            Radio / multimédia fonctionnel ?
                          </div>
                          <button
                            type="button"
                            aria-pressed={radioOk}
                            onClick={() => {
                              const nextValue = !radioOk;
                              setRadioOk(nextValue);
                              setValue("interiorInspection.equipements.radioOk", nextValue);
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                              radioOk ? "bg-green-600 border-green-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                radioOk ? "translate-x-5" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border border-gray-200 rounded-md bg-white p-3">
                          <div className="text-sm font-medium text-gray-900">
                            Climatisation fonctionnelle ?
                          </div>
                          <button
                            type="button"
                            aria-pressed={acOk}
                            onClick={() => {
                              const nextValue = !acOk;
                              setAcOk(nextValue);
                              setValue("interiorInspection.equipements.acOk", nextValue);
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                              acOk ? "bg-green-600 border-green-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                acOk ? "translate-x-5" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border border-gray-200 rounded-md bg-white p-3">
                          <div className="text-sm font-medium text-gray-900">
                            Verrouillage centralisé fonctionne ?
                          </div>
                          <button
                            type="button"
                            aria-pressed={centralLockOk}
                            onClick={() => {
                              const nextValue = !centralLockOk;
                              setCentralLockOk(nextValue);
                              setValue("interiorInspection.equipements.centralLockOk", nextValue);
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                              centralLockOk ? "bg-green-600 border-green-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                centralLockOk ? "translate-x-5" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border border-gray-200 rounded-md bg-white p-3">
                          <div className="text-sm font-medium text-gray-900">
                            Vitres électriques fonctionnent ?
                          </div>
                          <button
                            type="button"
                            aria-pressed={windowsOk}
                            onClick={() => {
                              const nextValue = !windowsOk;
                              setWindowsOk(nextValue);
                              setValue("interiorInspection.equipements.windowsOk", nextValue);
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                              windowsOk ? "bg-green-600 border-green-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                windowsOk ? "translate-x-5" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      {/* CTA section Équipements */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteInteriorSectionAndGoNext(section, idx);
                          }}
                          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {getNavigationButtonText(section, idx)}
                        </button>
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* ⭐ CTA global : Terminer l'inspection intérieure */}
      <Card className="mt-6 border-2 border-primary/20 shadow-lg" data-interior-summary="true">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Inspection intérieure complète
            </h3>
            <p className="text-sm text-muted-foreground">
              Vous avez terminé l'inspection intérieure. Cliquez pour sauvegarder et passer à la validation finale.
            </p>
            <Button
              type="button"
              onClick={handleCompleteInteriorAndGoNext}
              disabled={isSaving}
              className="w-full md:w-auto bg-gradient-lagoon hover:opacity-90 text-white font-semibold px-8 py-6 text-base shadow-lagoon"
            >
              {isSaving ? (
                <>🔄 Sauvegarde en cours...</>
              ) : (
                <>
                  Terminer l'inspection intérieure
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
