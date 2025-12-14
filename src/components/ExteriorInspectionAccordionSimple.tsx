import React, { useState, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { saveStep3Draft, saveStep3ZoneDraft } from '@/services/checkinDepartService'
import type { Step3Payload, ExteriorPhoto, ExteriorDamage } from '@/types/step3'
import { uploadZonePhoto, uploadWheelPhoto, uploadTrunkPhoto, uploadDamagePhoto } from '@/modules/etatDesLieuxDepart/helpers/step3Helpers'
import { ZoomableImage } from '@/components/ZoomableImage'

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
)

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
)

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
)

type StepDetails = {
  photoLabel: string
  helpText?: string
  extraWheels?: string[]
  checklist?: string[]
  damageQuestion: string
}

type InspectionStep = {
  id: number
  title: string
  subtitle: string
  details: StepDetails
}

const steps: InspectionStep[] = [
  {
    id: 1,
    title: 'Avant du véhicule',
    subtitle: 'Prenez une photo claire de l\'avant (pare-chocs, capot, phares).',
    details: {
      photoLabel: 'Photo de la zone',
      helpText: 'Prends une photo générale de cette zone du véhicule.',
      damageQuestion: 'Dégât visible ?',
    },
  },
  {
    id: 2,
    title: 'Côté droit',
    subtitle: 'Photo du côté droit (portes, aile, rétro). N\'oublie pas les jantes.',
    details: {
      photoLabel: 'Photo de la zone',
      helpText: 'Prends une photo générale de cette zone du véhicule.',
      extraWheels: ['Jante avant droite', 'Jante arrière droite'],
      damageQuestion: 'Dégât visible ?',
    },
  },
  {
    id: 3,
    title: 'Arrière du véhicule',
    subtitle: 'Photo de l\'arrière (pare-chocs arrière, coffre fermé, feux).',
    details: {
      photoLabel: 'Photo de la zone',
      helpText: 'Prends une photo générale de cette zone du véhicule.',
      damageQuestion: 'Dégât visible ?',
    },
  },
  {
    id: 4,
    title: 'Coffre & équipements',
    subtitle: 'Ouvrez le coffre et vérifiez les équipements obligatoires.',
    details: {
      photoLabel: 'Photo du coffre ouvert',
      checklist: ['Triangle', 'Gilet', 'Roue de secours / kit anti-crevaison'],
      damageQuestion: 'Tout l\'équipement obligatoire est-il présent ?',
    },
  },
  {
    id: 5,
    title: 'Côté gauche',
    subtitle: 'Photo du côté gauche (portes, aile, rétro). N\'oublie pas les jantes.',
    details: {
      photoLabel: 'Photo de la zone',
      helpText: 'Prends une photo générale de cette zone du véhicule.',
      extraWheels: ['Jante avant gauche', 'Jante arrière gauche'],
      damageQuestion: 'Dégât visible ?',
    },
  },
  {
    id: 6,
    title: 'Propreté extérieure',
    subtitle: 'Évaluez l\'état de propreté extérieur global du véhicule.',
    details: {
      photoLabel: 'Photo de l\'extérieur',
      helpText: 'Prends une photo générale de l\'extérieur du véhicule.',
      damageQuestion: '',
    },
  },
]

type DamageItem = {
  type: string
  description: string
  photos: File[]
}

type WheelDamageItem = {
  type: string
  description: string
  photos: File[]
}

const BODY_DAMAGE_TYPES = [
  "Rayure",
  "Bosse / enfoncement",
  "Frottement peinture",
  "Fissure / cassure plastique",
  "Phare / feu fissuré",
  "Pare-brise ou vitre impactée",
  "Autre"
]

const WHEEL_DAMAGE_TYPES = [
  "Rayure jante",
  "Jante frottée trottoir",
  "Fêlure / fissure jante",
  "Pneu abîmé",
  "Autre"
]

const TRUNK_ISSUE_TYPES = [
  "Tache / salissure",
  "Dommage au revêtement intérieur",
  "Mauvais fonctionnement d'ouverture / fermeture",
  "Équipement manquant (triangle, gilet, cric…)",
  "Équipement détérioré",
  "Bruit ou jeu anormal",
  "Autre anomalie"
]

/**
 * ⭐ Props pour Step3 (alignées sur Step1/Step2)
 */
interface ExteriorInspectionProps {
  bookingId: string;
  bookingReferenceNumber: number | null | undefined;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
  onComplete?: () => void;
}

export default function ExteriorInspectionAccordionSimple({
  bookingId,
  bookingReferenceNumber,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  onComplete,
}: ExteriorInspectionProps) {
  const { setValue, watch, getValues } = useFormContext()
  const damageReports = watch("damageReports") || []
  const zonesHasDamage = watch("exteriorInspection.zonesHasDamage") || {}
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  
  // State pour tracker les zones complètes (feedback visuel)
  const [completedZones, setCompletedZones] = useState<Set<string>>(new Set())
  // State pour mettre en avant les zones invalides (bordures/badges)
  const [invalidZones, setInvalidZones] = useState<Set<string>>(new Set())
  
  // ⭐ État pour le loader de sauvegarde
  const [isSaving, setIsSaving] = useState(false)
  
  // ⭐ État pour les uploads en cours
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // ⭐ SUPPRIMÉ : trunkReport (state local non synchronisé)
  // → Remplacé par le pattern standard damageReports (RHF) avec side: "coffre"

  type TrunkEquipmentState = {
    triangle: boolean
    gilet: boolean
    spareKit: boolean
  }

  const [trunkEquipment, setTrunkEquipment] = useState<Record<number, TrunkEquipmentState>>({
    0: { triangle: false, gilet: false, spareKit: false },
    1: { triangle: false, gilet: false, spareKit: false },
    2: { triangle: false, gilet: false, spareKit: false },
    3: { triangle: false, gilet: false, spareKit: false },
    4: { triangle: false, gilet: false, spareKit: false },
  })

  // ⭐ States pour la propreté extérieure (notes + niveau uniquement, pas de photos dédiées)
  const [exteriorCleanlinessLevel, setExteriorCleanlinessLevel] = useState<"" | "Excellent" | "Bon" | "Moyen" | "Sale">("");
  const [exteriorCleanlinessNotes, setExteriorCleanlinessNotes] = useState("");

  /**
   * ⭐ CORRECTION BUG : Utilisation de clés normalisées SANS accent
   * pour garantir la cohérence entre étape 3 (création) et étape 6 (récap)
   */
  const getSideForStep = (step: InspectionStep): "avant" | "droit" | "arriere" | "gauche" | "coffre" | null => {
    if (step.title === 'Avant du véhicule') return "avant"
    if (step.title === 'Côté droit') return "droit"
    if (step.title === 'Arrière du véhicule') return "arriere"  // ✅ SANS accent
    if (step.title === 'Coffre & équipements') return "coffre"
    if (step.title === 'Côté gauche') return "gauche"
    return null
  }

  const getZoneKeyForStep = (step: InspectionStep): "avant" | "droit" | "arriere" | "gauche" | "coffre" | null => {
    return getSideForStep(step)  // ✅ Réutilisation pour éviter duplication
  }

  /**
   * ⭐ Retourne les types de dégâts selon la zone
   * Coffre → TRUNK_ISSUE_TYPES
   * Autres zones → BODY_DAMAGE_TYPES
   */
  const getDamageTypesForSide = (side: string): string[] => {
    return side === "coffre" ? TRUNK_ISSUE_TYPES : BODY_DAMAGE_TYPES;
  }

  const addDamage = (side: "avant" | "droit" | "arriere" | "gauche" | "coffre") => {
    const newDamage = {
      side,
      typeDegats: [],
      commentaire: "",
      photos: [],
    }
    setValue("damageReports", [...damageReports, newDamage])
  }

  const updateDamage = (index: number, field: string, value: any) => {
    const updated = [...damageReports]
    updated[index][field] = value
    setValue("damageReports", updated)
  }

  const removeDamage = (index: number) => {
    const updated = damageReports.filter((_: any, i: number) => i !== index)
    setValue("damageReports", updated)
  }

  /**
   * ⭐ VALIDATION PAR ZONE - Règles strictes pour valeur juridique
   * Retourne { isValid: boolean, errors: string[] }
   */
  type ZoneValidationError = { field: string; message: string }
  const validateZone = (zoneKey: string): { isValid: boolean; errors: string[]; detailedErrors: ZoneValidationError[] } => {
    const errors: string[] = []
    const detailedErrors: ZoneValidationError[] = []
    const values = getValues()
    const zonesPhotos = values.exteriorInspection?.zonesPhotos || {}
    const zonesHasDamage = values.exteriorInspection?.zonesHasDamage || {}
    const allDamageReports = values.damageReports || []

    // === VALIDATION PROPRETÉ EXTÉRIEURE ===
    if (zoneKey === "propreteExterieure") {
      const propreteExterieure = values.exteriorInspection?.propreteExterieure;
      if (!propreteExterieure?.level) {
        errors.push("Le niveau de propreté extérieure est obligatoire");
        detailedErrors.push({ field: "propreteExterieure.level", message: "Le niveau de propreté extérieure est obligatoire" });
      }
      return { isValid: errors.length === 0, errors, detailedErrors }
    }

    // === VALIDATION COFFRE ===
    if (zoneKey === "coffre") {
      // Photo coffre obligatoire
      if (!zonesPhotos.coffre || zonesPhotos.coffre.length === 0) {
        errors.push("Au moins 1 photo du coffre ouvert est obligatoire")
      }

      // Équipements : vérifier qu'ils sont renseignés (true ou false, peu importe)
      // On considère qu'ils sont renseignés s'ils existent dans l'objet
      // (le composant les initialise déjà)

      // Validation des dégâts coffre si toggle = OUI
      const hasDamageToggle = zonesHasDamage.coffre
      if (hasDamageToggle === true) {
        const coffreDamages = allDamageReports.filter((d: any) => d.side === "coffre")
        if (coffreDamages.length === 0) {
          const msg = "Si des dégâts sont signalés, au moins 1 dégât doit être créé"
          errors.push(msg)
          detailedErrors.push({ field: "coffre", message: msg })
        } else {
          // Vérifier chaque dégât
          coffreDamages.forEach((damage: any, idx: number) => {
            if (!damage.typeDegats || damage.typeDegats.length === 0) {
              const msg = `Dégât #${idx + 1} : Type de dégât obligatoire`
              errors.push(msg)
              detailedErrors.push({ field: "coffre", message: msg })
            }
            if (!damage.photos || damage.photos.length === 0) {
              const msg = `Dégât #${idx + 1} : Au moins 1 photo obligatoire`
              errors.push(msg)
              detailedErrors.push({ field: "coffre", message: msg })
            }
          })
        }
      }

      return { isValid: errors.length === 0, errors, detailedErrors }
    }

    // === VALIDATION ZONES STANDARDS (avant, droit, arriere, gauche) ===
    
    // 1. Photo de zone obligatoire
    if (!zonesPhotos[zoneKey] || zonesPhotos[zoneKey].length === 0) {
      const msg = "Au moins 1 photo de la zone est obligatoire"
      errors.push(msg)
      detailedErrors.push({ field: zoneKey, message: msg })
    }

    // 2. Validation photos de jantes (pour côtés droit et gauche)
    if (zoneKey === "droit") {
      if (!zonesPhotos.janteAvDroit || zonesPhotos.janteAvDroit.length === 0) {
        const msg = "Photo de la jante avant droite obligatoire"
        errors.push(msg)
        detailedErrors.push({ field: "janteAvDroit", message: msg })
      }
      if (!zonesPhotos.janteArDroit || zonesPhotos.janteArDroit.length === 0) {
        const msg = "Photo de la jante arrière droite obligatoire"
        errors.push(msg)
        detailedErrors.push({ field: "janteArDroit", message: msg })
      }
    }
    if (zoneKey === "gauche") {
      if (!zonesPhotos.janteAvGauche || zonesPhotos.janteAvGauche.length === 0) {
        const msg = "Photo de la jante avant gauche obligatoire"
        errors.push(msg)
        detailedErrors.push({ field: "janteAvGauche", message: msg })
      }
      if (!zonesPhotos.janteArGauche || zonesPhotos.janteArGauche.length === 0) {
        const msg = "Photo de la jante arrière gauche obligatoire"
        errors.push(msg)
        detailedErrors.push({ field: "janteArGauche", message: msg })
      }
    }

    // 3. Validation des dégâts si toggle = OUI
    const hasDamageToggle = zonesHasDamage[zoneKey]
    if (hasDamageToggle === true) {
      const zoneDamages = allDamageReports.filter((d: any) => d.side === zoneKey)
      
      if (zoneDamages.length === 0) {
        const msg = "Si des dégâts sont signalés, au moins 1 dégât doit être créé"
        errors.push(msg)
        detailedErrors.push({ field: zoneKey, message: msg })
      } else {
        // Vérifier chaque dégât de cette zone
        zoneDamages.forEach((damage: any, idx: number) => {
          if (!damage.typeDegats || damage.typeDegats.length === 0) {
            const msg = `Dégât #${idx + 1} : Type de dégât obligatoire`
            errors.push(msg)
            detailedErrors.push({ field: zoneKey, message: msg })
          }
          if (!damage.photos || damage.photos.length === 0) {
            const msg = `Dégât #${idx + 1} : Au moins 1 photo obligatoire`
            errors.push(msg)
            detailedErrors.push({ field: zoneKey, message: msg })
          }
        })
      }
    }

    return { isValid: errors.length === 0, errors, detailedErrors }
  }

  /**
   * ⭐ Recalculer les zones complètes depuis les valeurs hydratées (durable)
   * - Appelé quand les valeurs RHF pertinentes changent (photos, toggles, dommages)
   */
  React.useEffect(() => {
    const zones: string[] = ["avant", "droit", "arriere", "coffre", "gauche", "propreteExterieure"];
    const nextCompleted = new Set<string>();
    const nextInvalid = new Set<string>();
    zones.forEach((z) => {
      const res = validateZone(z);
      if (res.isValid) nextCompleted.add(z);
      else nextInvalid.add(z);
    });
    setCompletedZones(nextCompleted);
    setInvalidZones(nextInvalid);
    // Ouvrir la première zone incomplète si l'actuelle est nulle
    if (openIndex === null) {
      const firstIncompleteIdx = zones.findIndex((z) => !nextCompleted.has(z));
      if (firstIncompleteIdx >= 0) setOpenIndex(firstIncompleteIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(watch("exteriorInspection.zonesPhotos") || {}),
    JSON.stringify(watch("exteriorInspection.zonesHasDamage") || {}),
    JSON.stringify(watch("damageReports") || []),
    JSON.stringify(watch("exteriorInspection.propreteExterieure") || {}),
  ]);

  /**
   * ⭐ NAVIGATION VERS LA ZONE SUIVANTE avec validation stricte
   */
  const handleCompleteZoneAndGoNext = async (currentStep: InspectionStep, currentIdx: number) => {
    const zoneKey = currentIdx === 5 ? "propreteExterieure" : getZoneKeyForStep(currentStep) || "unknown"
    
    // Validation de la zone actuelle
    const validation = validateZone(zoneKey)
    
    if (!validation.isValid) {
      // Blocage strict : afficher les erreurs
      toast.error("Zone incomplète", {
        description: validation.errors.slice(0, 2).join(". ") + 
                    (validation.errors.length > 2 ? `... (+${validation.errors.length - 2} autre(s))` : "")
      })
      // Marquer visuellement la zone comme invalide
      setInvalidZones(prev => {
        const next = new Set(prev)
        next.add(zoneKey)
        return next
      })
      // Ouvrir la zone invalide si nécessaire
      const zonesOrder: string[] = ["avant", "droit", "arriere", "coffre", "gauche", "propreteExterieure"]
      const zoneIdx = zonesOrder.indexOf(zoneKey)
      if (zoneIdx >= 0) {
        setOpenIndex(zoneIdx)
        // Scroll vers la première sous-zone manquante si disponible, sinon vers la carte
        const firstDetailed = validation.detailedErrors?.[0]
        if (firstDetailed?.field) {
          scrollToSubzone(firstDetailed.field)
        } else {
          scrollToZoneIndex(zoneIdx)
        }
      }
      return
    }

    // Zone valide : sauvegarde incrémentale + marquer comme complète
    try {
      const values = getValues();
      
      // 🆕 Sauvegarde pour Propreté extérieure
      if (zoneKey === "propreteExterieure") {
        const proprete = values?.exteriorInspection?.propreteExterieure || {};
        const propretePatch = {
          level: proprete.level,
          notes: proprete.notes,
          photos: proprete.photos || [],
        };

        const result = await saveStep3ZoneDraft({
          bookingId,
          ownerId,
          renterId,
          checkinId: checkinId || null,
          zoneKey: zoneKey as any,
          propreteExterieure: propretePatch,
        });

        // Propager un éventuel checkinId créé
        if (!checkinId && result.checkinId && onCheckinIdChange) {
          onCheckinIdChange(result.checkinId);
        }
      } else {
        // Sauvegarde pour les zones "standard" (avant, droit, arrière, coffre, gauche)
        const zonePhotos = values?.exteriorInspection?.zonesPhotos?.[zoneKey] || [];
        const zoneToggle = values?.exteriorInspection?.zonesHasDamage?.[zoneKey];
        // Préparer le patch de photos pour couvrir le scope complet de la zone (incl. jantes)
        const photosPatch: Record<string, any[]> = {};
        const scopeSides: string[] = [];
        if (zoneKey === "droit") {
          const av = values?.exteriorInspection?.zonesPhotos?.janteAvDroit || [];
          const ar = values?.exteriorInspection?.zonesPhotos?.janteArDroit || [];
          photosPatch["janteAvDroit"] = av;
          photosPatch["janteArDroit"] = ar;
          scopeSides.push("droit", "janteAvDroit", "janteArDroit");
        } else if (zoneKey === "gauche") {
          const av = values?.exteriorInspection?.zonesPhotos?.janteAvGauche || [];
          const ar = values?.exteriorInspection?.zonesPhotos?.janteArGauche || [];
          photosPatch["janteAvGauche"] = av;
          photosPatch["janteArGauche"] = ar;
          scopeSides.push("gauche", "janteAvGauche", "janteArGauche");
        } else {
          scopeSides.push(zoneKey);
        }
        // Dégâts: inclure ceux des côtés couverts par le scope
        const allDamages = (values?.damageReports || []);
        const zoneDamages = allDamages.filter((d: any) => scopeSides.includes(d?.side));

        const result = await saveStep3ZoneDraft({
          bookingId,
          ownerId,
          renterId,
          checkinId: checkinId || null,
          zoneKey: zoneKey as any,
          zonePhotos,
          photosPatch,
          zoneHasDamage: typeof zoneToggle === "boolean" ? zoneToggle : undefined,
          zoneDamageReports: zoneDamages,
          scopeSides,
        });

        // Propager un éventuel checkinId créé
        if (!checkinId && result.checkinId && onCheckinIdChange) {
          onCheckinIdChange(result.checkinId);
        }
      }

      // Marquer la zone complète localement
      setCompletedZones(prev => new Set(prev).add(zoneKey))
    } catch (error: any) {
      console.error('[Step3] ❌ Erreur sauvegarde partielle:', error);
      toast.error('❌ Sauvegarde de la zone impossible', {
        description: error?.message || "Réessayez ou terminez l\\'inspection extérieure pour sauvegarder.",
      });
      // On n'arrête pas la navigation, mais on ne marque pas completed si l'on veut forcer la sauvegarde
      // return;
    }
    
    // Toast de succès
    toast.success(`✓ ${currentStep.title} terminé`, {
      description: zoneKey === "propreteExterieure" ? "Inspection de la propreté extérieure terminée" : "Passage à la zone suivante"
    })

    // 🆕 Navigation spécifique pour Propreté extérieure (dernière zone)
    if (zoneKey === "propreteExterieure") {
      // Fermer l'accordion et scroller vers la carte récap
      setOpenIndex(null);
      scrollToExteriorSummary();
    } else {
      // Passer à la zone suivante pour les autres zones
      const nextIndex = currentIdx + 1
      if (nextIndex < steps.length) {
        setOpenIndex(nextIndex)
        // Scroll automatique vers la zone suivante (helper factorisé)
        scrollToZoneIndex(nextIndex)
      } else {
        // Dernière zone : fermer tout
        setOpenIndex(null)
      }
    }
  }

  /**
   * ⭐ CORRECTION BUG : Nettoyage automatique des dégâts quand toggle passe à NON
   * 
   * Quand l'utilisateur désactive "Dégâts visibles sur [zone]", on supprime
   * automatiquement TOUS les dégâts associés à cette zone pour garantir
   * la cohérence entre l'étape 3 (formulaire) et l'étape 6 (récap).
   */
  const setZoneHasDamage = (zoneKey: string, value: boolean) => {
    const current = watch("exteriorInspection.zonesHasDamage") || {}
    setValue("exteriorInspection.zonesHasDamage", {
      ...current,
      [zoneKey]: value,
    }, { shouldDirty: true })

    // ⭐ NETTOYAGE : Si toggle passe à NON, supprimer tous les dégâts de cette zone
    if (value === false) {
      const currentDamageReports = watch("damageReports") || []
      const cleanedDamageReports = currentDamageReports.filter((d: any) => d.side !== zoneKey)
      
      if (cleanedDamageReports.length !== currentDamageReports.length) {
        setValue("damageReports", cleanedDamageReports, { shouldDirty: true })
        console.log(`[NETTOYAGE] Suppression de ${currentDamageReports.length - cleanedDamageReports.length} dégât(s) pour la zone "${zoneKey}"`)
      }
    }
  }

  /**
   * Utilitaire: scroller vers une zone par son index visuel (data-zone-index)
   */
  const scrollToZoneIndex = (index: number) => {
    if (index < 0) return;
    // Laisser un délai pour que l'ouverture/MAJ de l'accordion soit reflétée dans le layout
    setTimeout(() => {
      const element = document.querySelector(`[data-zone-index="${index}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  /**
   * Utilitaire: scroller vers une sous-zone ciblée par un field (data-subzone)
   */
  const scrollToSubzone = (field: string) => {
    if (!field) return;
    setTimeout(() => {
      const element = document.querySelector(`[data-subzone="${field}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  /**
   * 🆕 Utilitaire: scroller vers la carte "Inspection extérieure complète"
   */
  const scrollToExteriorSummary = () => {
    setTimeout(() => {
      const element = document.querySelector('[data-exterior-summary="true"]');
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  /**
   * ⭐ Zones avec multi-sélection de types de dégâts
   * Jantes + Coffre → plusieurs types possibles en même temps
   * Autres zones → sélection unique
   */
  const isMultiSelectForSide = (side: string) => {
    const multiSides = [
      "janteAvDroit",
      "janteArDroit",
      "janteAvGauche",
      "janteArGauche",
      "coffre",  // ⭐ AJOUTÉ : le coffre peut avoir plusieurs anomalies
    ]
    return multiSides.includes(side)
  }

  const getZoneName = (step: InspectionStep) => {
    if (step.title === 'Avant du véhicule') return "l'avant"
    if (step.title === 'Côté droit') return "le côté droit"
    if (step.title === 'Arrière du véhicule') return "l'arrière"
    if (step.title === 'Coffre & équipements') return "le coffre"
    if (step.title === 'Côté gauche') return "le côté gauche"
    return "la zone"
  }

  const getPhotoLabel = (step: InspectionStep) => {
    if (step.title === 'Avant du véhicule') return "Photo d'ensemble de l'avant"
    if (step.title === 'Côté droit') return "Photo d'ensemble du côté droit"
    if (step.title === 'Arrière du véhicule') return "Photo d'ensemble de l'arrière"
    if (step.title === 'Coffre & équipements') return "Photo d'ensemble du coffre"
    if (step.title === 'Côté gauche') return "Photo d'ensemble du côté gauche"
    return "Photo d'ensemble de la zone"
  }

  const getWheelsForStep = (step: InspectionStep) => {
    if (step.title.toLowerCase().includes('droit')) {
      return [
        { key: 'frontRight', label: 'Jante avant droite', zoneKey: 'janteAvDroit' },
        { key: 'rearRight', label: 'Jante arrière droite', zoneKey: 'janteArDroit' },
      ]
    }
    if (step.title.toLowerCase().includes('gauche')) {
      return [
        { key: 'frontLeft', label: 'Jante avant gauche', zoneKey: 'janteAvGauche' },
        { key: 'rearLeft', label: 'Jante arrière gauche', zoneKey: 'janteArGauche' },
      ]
    }
    return []
  }

  /**
   * ⭐ Génère le texte du bouton de navigation pour chaque zone
   */
  const getNavigationButtonText = (step: InspectionStep): string => {
    const nextZoneMap: Record<string, string> = {
      'Avant du véhicule': 'au côté droit',
      'Côté droit': 'à l\'arrière du véhicule',
      'Arrière du véhicule': 'au coffre & équipements',
      'Coffre & équipements': 'au côté gauche',
      'Côté gauche': 'à la propreté extérieure',
      'Propreté extérieure': '' // Dernier
    }

    const nextZone = nextZoneMap[step.title]
    
    if (step.title === 'Propreté extérieure') {
      return "Terminer l'inspection extérieure ✅"
    }
    
    return `Terminer l'inspection de ${getZoneName(step)} et passer ${nextZone} →`
  }

  /**
   * ⭐ HANDLER FIN D'ÉTAPE 3 - Construire payload + sauvegarder
   * 
   * Pattern aligné sur Step1/Step2 :
   * 1. Récupérer toutes les données du form
   * 2. Construire Step3Payload
   * 3. Appeler saveStep3Draft
   * 4. Gérer checkinId + navigation
   */
  const handleCompleteExteriorInspection = async () => {
    console.log('[Step3] 🚀 Début de la sauvegarde Step3');
    setIsSaving(true);

    try {
      // ✅ Récupérer les données du formulaire
      const formValues = getValues();
      const exteriorInspection = formValues.exteriorInspection || {};
      const damageReports = formValues.damageReports || [];

      // ✅ Les photos sont déjà uploadées via les helpers (ExteriorPhoto avec publicUrl)
      const zonesPhotos = exteriorInspection.zonesPhotos || {};
      
      const step3Payload: Step3Payload = {
        completedAt: new Date().toISOString(),
        zonesPhotos: {
          avant: zonesPhotos.avant || [],
          droit: zonesPhotos.droit || [],
          arriere: zonesPhotos.arriere || [],
          gauche: zonesPhotos.gauche || [],
          coffre: zonesPhotos.coffre || [],
          janteAvDroit: zonesPhotos.janteAvDroit || [],
          janteArDroit: zonesPhotos.janteArDroit || [],
          janteAvGauche: zonesPhotos.janteAvGauche || [],
          janteArGauche: zonesPhotos.janteArGauche || [],
        },
        zonesHasDamage: exteriorInspection.zonesHasDamage || {
          avant: false,
          droit: false,
          arriere: false,
          gauche: false,
          coffre: false,
        },
        damageReports: damageReports.map((damage: any) => ({
          side: damage.side || damage.zone,
          typeDegats: damage.typeDegats || [],
          commentaire: damage.commentaire || damage.notes || '',
          photos: damage.photos || [],
        })),
        coffreEquipements: exteriorInspection.coffreEquipements || {
          triangle: false,
          gilet: false,
          roueSecours: false,
          kitAntiCrevaison: false,
        },
        propreteExterieure: {
          level: exteriorInspection.propreteExterieure?.level || 'Bon',
          notes: exteriorInspection.propreteExterieure?.notes || '',
          photos: exteriorInspection.propreteExterieure?.photos || [],
        },
      };

      console.log('[Step3] 📦 Step3Payload construit:', {
        completedAt: step3Payload.completedAt,
        photosCount: Object.values(step3Payload.zonesPhotos).flat().length,
        damagesCount: step3Payload.damageReports.length,
      });

      // ✅ Sauvegarde via le service
      const result = await saveStep3Draft({
        bookingId,
        ownerId,
        renterId,
        checkinId: checkinId || null,
        step3: step3Payload,
      });

      console.log('[Step3] ✅ Sauvegarde réussie:', result);
      console.log('[Step3] 🔍 Mode opération:', checkinId ? 'UPDATE' : 'INSERT (première fois)');

      // ⭐ FIX : Propager le checkinId AVANT de naviguer (même pattern que Step1/Step2)
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
        console.log('[Step3] ✅ Propagation checkinId au parent:', result.checkinId);
        
        // ⭐ Attendre un cycle de rendu React pour garantir la propagation
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // ✅ Toast de succès
      toast.success('✅ Inspection extérieure sauvegardée !', {
        description: 'Vos données ont été enregistrées avec succès.',
      });

      // ✅ Navigation vers l'étape suivante
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('[Step3] ❌ Erreur sauvegarde:', error);
      toast.error('❌ Erreur lors de la sauvegarde', {
        description: error.message || 'Vos données n\'ont pas été perdues, vous pouvez réessayer.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ⭐ CTA global : Terminer l'inspection extérieure et passer à l'intérieur
   * - Valide toutes les zones
   * - Si invalide: toast + marquage + ouverture/scroll première zone invalide
   * - Si valide: déclenche la sauvegarde globale puis navigation (via onComplete)
   */
  const handleCompleteExteriorAndGoNext = async () => {
    const zones: string[] = ["avant", "droit", "arriere", "coffre", "gauche", "propreteExterieure"];
    const invalid: string[] = [];
    zones.forEach((z) => {
      const res = validateZone(z);
      if (!res.isValid) invalid.push(z);
    });

    if (invalid.length > 0) {
      // Marquer toutes les zones invalides + Toast
      setInvalidZones(prev => {
        const next = new Set(prev);
        invalid.forEach(z => next.add(z));
        return next;
      });
      toast.error("Inspection extérieure incomplète", {
        description: `Zones à compléter : ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`
      });
      // Ouvrir et scroller vers la première zone invalide
      const zonesOrder = zones;
      const first = invalid[0];
      const idx = zonesOrder.indexOf(first);
      if (idx >= 0) {
        setOpenIndex(idx);
        scrollToZoneIndex(idx);
      }
      return;
    }

    // Toutes les zones sont valides → snapshot global + navigation
    await handleCompleteExteriorInspection();
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4">
      {steps.map((step, idx) => {
        const isOpen = openIndex === idx
        const zoneName = getZoneName(step)
        const wheels = getWheelsForStep(step)
        const isTrunkStep = step.title.toLowerCase().includes("coffre")
        const isCleanlinessStep = step.id === 6
        const sideValue = getSideForStep(step)
        const zoneKey = isCleanlinessStep ? "propreteExterieure" : (getZoneKeyForStep(step) || "unknown")

        const damagesForThisSide = damageReports
          .map((d: any, globalIndex: number) => ({ ...d, indexGlobal: globalIndex }))
          .filter((d: any) => d.side === sideValue)

        // Vérifier si la zone est complète
        const isZoneComplete = completedZones.has(zoneKey)

        return (
          <Collapsible
            key={step.id}
            open={isOpen}
            onOpenChange={(open) => setOpenIndex(open ? idx : null)}
          >
            <Card
              data-zone-index={idx}
              className={cn(
                'transition-all duration-300 overflow-hidden bg-white shadow-sm',
                'hover:shadow-md',
                isZoneComplete && 'border-l-4 border-l-success',
                (() => {
                  const key = getZoneKeyForStep(step)
                  return key && invalidZones.has(key) ? 'border-destructive bg-destructive/5' : ''
                })()
              )}
            >
              <CollapsibleTrigger asChild>
                <CardContent className="p-4 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium flex-shrink-0",
                        isZoneComplete ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                      )}>
                        {isZoneComplete ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn(
                            "font-semibold text-base",
                            (() => {
                              const key = getZoneKeyForStep(step)
                              return key && invalidZones.has(key) ? "text-destructive" : "text-foreground"
                            })()
                          )}>
                            {step.title}
                          </div>
                          {isZoneComplete && (
                            <span className="bg-success/10 text-success text-xs font-medium px-2 py-0.5 rounded-full">
                              Complète
                            </span>
                          )}
                          {(() => {
                            const key = getZoneKeyForStep(step)
                            const isInvalid = key ? invalidZones.has(key) : false
                            const isComplete = isZoneComplete
                            if (isInvalid && !isComplete) {
                              return (
                                <span className="bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5 rounded-full">
                                  À compléter
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {step.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 ml-2">
                      {isOpen ? (
                        <ChevronUpIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="pt-4 space-y-4">
                    {isCleanlinessStep ? (
                      <>
                        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm space-y-4">
                          <div className="text-lg font-semibold text-gray-900">
                            Propreté extérieure
                          </div>

                          <div className="text-sm text-gray-600 mb-4">
                            Évaluez l'état de propreté extérieur global du véhicule. Les photos globales sont gérées dans les sections précédentes.
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-900">
                              Niveau de propreté extérieure
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {["Excellent", "Bon", "Moyen", "Sale"].map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const value = level as "Excellent" | "Bon" | "Moyen" | "Sale";
                                    setExteriorCleanlinessLevel(value);
                                    setValue("exteriorInspection.propreteExterieure.level", value);
                                  }}
                                  className={[
                                    "px-3 py-2 rounded-md border text-sm font-medium",
                                    exteriorCleanlinessLevel === level
                                      ? (
                                        level === "Sale"
                                          ? "bg-red-600 text-white border-red-600"
                                          : "bg-teal-600 text-white border-teal-600"
                                      )
                                      : "bg-white text-gray-800 border-gray-300"
                                  ].join(" ")}
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
                              placeholder="Ex: véhicule poussiéreux, traces de boue sur les portières, moustiques sur le pare-choc..."
                              rows={2}
                              value={exteriorCleanlinessNotes}
                              onChange={(e) => {
                                const text = e.target.value;
                                setExteriorCleanlinessNotes(text);
                                setValue("exteriorInspection.propreteExterieure.notes", text);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCompleteExteriorAndGoNext()
                            }}
                            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            Terminer l&apos;inspection extérieure et passer à l’intérieur →
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Photo globale */}
                        {(() => {
                          const zonePhotoInputRef = useRef<HTMLInputElement | null>(null)
                          const currentZoneKey = zoneKey || (isTrunkStep ? "coffre" : null)
                          const zonePhotos = currentZoneKey ? (watch(`exteriorInspection.zonesPhotos.${currentZoneKey}`) || []) : []
                          const main = zonePhotos[0] as any
                          const mainUrl: string | undefined = typeof main === 'string' ? main : main?.publicUrl
                          
                          // Handler commun d'upload (vide ou remplacement)
                          const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, replaceFirst: boolean) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length === 0 || !currentZoneKey) return;

                            setIsUploadingPhoto(true);
                            
                            try {
                              const current = watch(`exteriorInspection.zonesPhotos.${currentZoneKey}`) || []
                              const uploadedPhotos: ExteriorPhoto[] = [];
                              
                              // Convertir et uploader chaque fichier
                              for (const file of files) {
                                const base64 = await new Promise<string>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onload = () => resolve(reader.result as string);
                                  reader.onerror = reject;
                                  reader.readAsDataURL(file);
                                });
                                
                                const uploaded = await uploadZonePhoto(
                                  base64,
                                  bookingId,
                                  bookingReferenceNumber,
                                  currentZoneKey
                                );
                                
                                if (uploaded) uploadedPhotos.push(uploaded);
                              }
                              
                              if (uploadedPhotos.length > 0) {
                                if (replaceFirst) {
                                  // Remplacer la photo principale par la première uploadée
                                  const rest = current.slice(1);
                                  setValue(
                                    `exteriorInspection.zonesPhotos.${currentZoneKey}`,
                                    [uploadedPhotos[0], ...rest],
                                    { shouldDirty: true }
                                  );
                                  toast.success(`✅ Photo remplacée`);
                                } else {
                                  // Ajout en mode vide (comportement existant)
                                  setValue(
                                    `exteriorInspection.zonesPhotos.${currentZoneKey}`,
                                    [...current, ...uploadedPhotos],
                                    { shouldDirty: true }
                                  );
                                  toast.success(`✅ ${uploadedPhotos.length} photo(s) uploadée(s)`);
                                }
                              }
                            } catch (error: any) {
                              console.error('[Step3] ❌ Erreur upload photo zone:', error);
                              toast.error('❌ Erreur lors de l\'upload des photos');
                            } finally {
                              setIsUploadingPhoto(false);
                              e.target.value = '';
                            }
                          };

                          return (
                            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4" data-subzone={currentZoneKey || undefined}>
                              <div className="font-medium text-gray-900 mb-1 text-sm">
                                {getPhotoLabel(step)}
                              </div>
                              <div className="text-xs text-gray-500 mb-3">
                                {zonePhotos.length === 0
                                  ? "Appuyez pour prendre ou ajouter une photo"
                                  : "Vous pouvez remplacer ou supprimer la photo principale"}
                              </div>
                              
                              <input
                                ref={zonePhotoInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={(e) => handleUpload(e, /* replaceFirst */ zonePhotos.length > 0)}
                              />

                              {zonePhotos.length === 0 ? (
                                // Cas A — aucune photo : UI actuelle
                                <div className="text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      zonePhotoInputRef.current?.click()
                                    }}
                                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                                  >
                                    <CameraIcon className="h-4 w-4" />
                                    <span className="ml-1">Ajouter une photo</span>
                                  </button>
                                </div>
                              ) : (
                                // Cas B — au moins une photo : affichage en grand
                                <div className="relative">
                                  <div
                                    className="group cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // choix simple: cliquer sur la photo ouvre le sélecteur pour remplacer
                                      zonePhotoInputRef.current?.click()
                                    }}
                                  >
                                    <img
                                      src={mainUrl}
                                      alt={`zone-${currentZoneKey}-main`}
                                      className="w-full max-w-[900px] mx-auto aspect-[16/9] object-cover rounded-lg border"
                                    />
                                  </div>
                                  {/* Bouton supprimer (overlay discret en haut à droite) */}
                                  <button
                                    type="button"
                                    aria-label="Supprimer la photo"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (!currentZoneKey) return
                                      const updated = zonePhotos.slice(1) // retirer la principale
                                      setValue(
                                        `exteriorInspection.zonesPhotos.${currentZoneKey}`,
                                        updated,
                                        { shouldDirty: true }
                                      )
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
                                        e.stopPropagation()
                                        zonePhotoInputRef.current?.click()
                                      }}
                                      className="mt-3 text-xs text-blue-700 hover:text-blue-800 underline"
                                    >
                                      Changer la photo
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* ⭐ Switch "Dégâts visibles ?" - UNIFIÉ pour toutes les zones (y compris coffre) */}
                        {sideValue && zoneKey && (
                          <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2.5">
                            <span className="text-sm font-medium text-gray-800">
                              {isTrunkStep ? "Anomalies visibles dans le coffre ?" : `Dégâts visibles sur ${zoneName} ?`}
                            </span>
                            <button
                              type="button"
                              aria-pressed={!!zonesHasDamage[zoneKey]}
                              onClick={(e) => {
                                e.stopPropagation()
                                const nextValue = !zonesHasDamage[zoneKey]
                                setZoneHasDamage(zoneKey, nextValue)
                                
                                if (nextValue) {
                                  const alreadyHas = damageReports.some((d: any) => d.side === sideValue)
                                  if (!alreadyHas) {
                                    addDamage(sideValue)
                                  }
                                }
                              }}
                              className={cn(
                                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border transition-colors',
                                zonesHasDamage[zoneKey]
                                  ? 'bg-green-600 border-green-600'
                                  : 'bg-gray-200 border-gray-300'
                              )}
                            >
                              <span
                                className={cn(
                                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                                  zonesHasDamage[zoneKey] ? 'translate-x-5' : 'translate-x-0.5'
                                )}
                              />
                            </button>
                          </div>
                        )}

                        {/* Dégâts centralisés - affichés seulement si switch ON */}
                        {sideValue && zoneKey && zonesHasDamage[zoneKey] && (
                          <>
                            <div className="space-y-3">
                              {damagesForThisSide.map((damage: any) => {
                                const DamagePhotoInput = () => {
                                  const fileInputRef = useRef<HTMLInputElement | null>(null)
                                  
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          fileInputRef.current?.click()
                                        }}
                                        className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
                                      >
                                        <CameraIcon className="h-4 w-4" />
                                        <span className="ml-1">Ajouter des photos</span>
                                      </button>
                                      <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={async (e) => {
                                          const files = Array.from(e.target.files || []);
                                          if (files.length === 0) return;

                                          setIsUploadingPhoto(true);

                                          try {
                                            const currentPhotos = damage.photos || [];
                                            const uploadedPhotos: ExteriorPhoto[] = [];

                                            // ⭐ Upload chaque fichier vers Storage
                                            for (const file of files) {
                                              // Convertir File → base64
                                              const base64 = await new Promise<string>((resolve, reject) => {
                                                const reader = new FileReader();
                                                reader.onload = () => resolve(reader.result as string);
                                                reader.onerror = reject;
                                                reader.readAsDataURL(file);
                                              });

                                              // Upload via helper avec zone + index du dégât
                                              const uploaded = await uploadDamagePhoto(
                                                base64,
                                                bookingId,
                                                bookingReferenceNumber,
                                                damage.side, // zone (avant, droit, arriere, gauche, coffre)
                                                damage.indexGlobal
                                              );

                                              if (uploaded) {
                                                uploadedPhotos.push(uploaded);
                                              }
                                            }

                                            if (uploadedPhotos.length > 0) {
                                              updateDamage(damage.indexGlobal, "photos", [...currentPhotos, ...uploadedPhotos]);
                                              toast.success(`✅ ${uploadedPhotos.length} photo(s) de dégât uploadée(s)`);
                                            }
                                          } catch (error: any) {
                                            console.error('[Step3] ❌ Erreur upload photo dégât:', error);
                                            toast.error('❌ Erreur lors de l\'upload des photos');
                                          } finally {
                                            setIsUploadingPhoto(false);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                    </>
                                  )
                                }
                                
                                return (
                                  <div key={damage.indexGlobal} className="bg-red-50 border border-red-300 rounded-md p-3 text-sm text-red-900 space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="font-semibold text-red-900">
                                        Dégât #{damage.indexGlobal + 1}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removeDamage(damage.indexGlobal)
                                        }}
                                        className="text-xs text-red-700 underline"
                                      >
                                        Supprimer
                                      </button>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="text-xs font-medium text-red-900">
                                        Type {damage.side === "coffre" ? "d'anomalie" : "de dégât"} {!isMultiSelectForSide(damage.side) && <span className="text-xs font-normal text-gray-600">(sélection unique)</span>}
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        {getDamageTypesForSide(damage.side).map((t) => {
                                          const multiSelect = isMultiSelectForSide(damage.side)
                                          const isSelected = multiSelect 
                                            ? (Array.isArray(damage.typeDegats) && damage.typeDegats.includes(t))
                                            : (Array.isArray(damage.typeDegats) && damage.typeDegats.length > 0 && damage.typeDegats[0] === t)
                                          
                                          return (
                                            <button
                                              key={t}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (multiSelect) {
                                                  const types = damage.typeDegats.includes(t)
                                                    ? damage.typeDegats.filter((type: string) => type !== t)
                                                    : [...damage.typeDegats, t]
                                                  updateDamage(damage.indexGlobal, "typeDegats", types)
                                                } else {
                                                  updateDamage(damage.indexGlobal, "typeDegats", [t])
                                                }
                                              }}
                                              className={[
                                                "px-2 py-1 rounded-full border text-xs font-medium",
                                                isSelected
                                                  ? "bg-red-600 text-white border-red-600"
                                                  : "bg-white text-red-700 border-red-300"
                                              ].join(" ")}
                                            >
                                              {t}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    <textarea
                                      className="w-full rounded-md border border-red-300 bg-white p-2 text-sm text-gray-800 placeholder:text-gray-400"
                                      placeholder={damage.side === "coffre" ? "Ex: tache sur revêtement, équipement manquant..." : "Ex: rayure pare-choc avant droit"}
                                      rows={2}
                                      value={damage.commentaire}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        updateDamage(damage.indexGlobal, "commentaire", e.target.value)
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />

                                    <div className="rounded-md border border-dashed border-red-300 bg-red-50 p-3 text-center space-y-2">
                                      <div className="text-sm font-medium text-red-900 mb-2">
                                        Photos du dégât
                                      </div>
                                      <DamagePhotoInput />

                                      {damage.photos && damage.photos.length > 0 && (() => {
                                        const main = damage.photos[0] as any;
                                        const mainUrl: string | undefined = typeof main === 'string' ? main : main?.publicUrl;
                                        const others = damage.photos.slice(1) as ExteriorPhoto[];
                                        return (
                                          <div className="mt-3 space-y-3">
                                            {/* Grande photo principale */}
                                            <div className="relative">
                                              <img
                                                src={mainUrl}
                                                alt={`degat-${damage.indexGlobal}-main`}
                                                className="w-full max-w-[900px] mx-auto aspect-[16/9] object-cover rounded-lg border border-red-300"
                                              />
                                              {/* Supprimer la photo principale */}
                                              <button
                                                type="button"
                                                aria-label="Supprimer la photo principale"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const photos = damage.photos.slice(1);
                                                  updateDamage(damage.indexGlobal, "photos", photos);
                                                }}
                                                className="absolute top-2 right-2 bg-red-600/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                                              >
                                                ×
                                              </button>
                                            </div>
                                            {/* Autres photos en mini-vignettes */}
                                            {others.length > 0 && (
                                              <div className="flex flex-wrap gap-2 justify-center">
                                                {others.map((p: ExteriorPhoto, idx: number) => (
                                                  <div key={idx} className="relative">
                                                    <img
                                                      src={p.publicUrl}
                                                      alt={`degat-${damage.indexGlobal}-thumb-${idx}`}
                                                      className="h-16 w-16 rounded-md object-cover border border-red-300 cursor-pointer hover:scale-105 transition-transform"
                                                      onClick={() => window.open(p.publicUrl, '_blank')}
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const photos = [main, ...others.filter((_, j) => j !== idx)];
                                                        updateDamage(damage.indexGlobal, "photos", photos);
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
                                        )
                                      })()}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (sideValue) addDamage(sideValue)
                              }}
                              className="w-full rounded-md border border-dashed border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 text-center hover:bg-red-50"
                            >
                              ➕ Ajouter {isTrunkStep ? "une anomalie dans le coffre" : `un dégât sur ${zoneName}`}
                            </button>
                          </>
                        )}
                      

                    {/* Équipements obligatoires - uniquement pour le coffre */}
                    {isTrunkStep && (
                      <div className="mt-4 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-900 shadow-sm">
                        <div className="font-semibold text-gray-900 mb-3">
                          Équipements obligatoires
                        </div>

                        <div className="space-y-3">
                          {/* Triangle */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">Triangle</span>
                            <button
                              type="button"
                              aria-pressed={trunkEquipment[idx].triangle}
                              onClick={(e) => {
                                e.stopPropagation()
                                const nextValue = !trunkEquipment[idx].triangle;
                                setTrunkEquipment(prev => ({
                                  ...prev,
                                  [idx]: {
                                    ...prev[idx],
                                    triangle: nextValue,
                                  }
                                }));
                                setValue("exteriorInspection.coffreEquipements.triangle", nextValue);
                              }}
                              className={[
                                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                                trunkEquipment[idx].triangle ? "bg-green-600 border-green-600" : "bg-gray-200"
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                  trunkEquipment[idx].triangle ? "translate-x-5" : "translate-x-1"
                                ].join(" ")}
                              />
                            </button>
                          </div>

                          {/* Gilet */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">Gilet</span>
                            <button
                              type="button"
                              aria-pressed={trunkEquipment[idx].gilet}
                              onClick={(e) => {
                                e.stopPropagation()
                                const nextValue = !trunkEquipment[idx].gilet;
                                setTrunkEquipment(prev => ({
                                  ...prev,
                                  [idx]: {
                                    ...prev[idx],
                                    gilet: nextValue,
                                  }
                                }));
                                setValue("exteriorInspection.coffreEquipements.gilet", nextValue);
                              }}
                              className={[
                                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                                trunkEquipment[idx].gilet ? "bg-green-600 border-green-600" : "bg-gray-200"
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                  trunkEquipment[idx].gilet ? "translate-x-5" : "translate-x-1"
                                ].join(" ")}
                              />
                            </button>
                          </div>

                          {/* Roue de secours / kit anti-crevaison */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-800">Roue de secours / kit anti-crevaison</span>
                            <button
                              type="button"
                              aria-pressed={trunkEquipment[idx].spareKit}
                              onClick={(e) => {
                                e.stopPropagation()
                                const nextValue = !trunkEquipment[idx].spareKit;
                                setTrunkEquipment(prev => ({
                                  ...prev,
                                  [idx]: {
                                    ...prev[idx],
                                    spareKit: nextValue,
                                  }
                                }));
                                setValue("exteriorInspection.coffreEquipements.roueSecours", nextValue);
                                setValue("exteriorInspection.coffreEquipements.kitAntiCrevaison", nextValue);
                              }}
                              className={[
                                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-gray-300 transition-colors",
                                trunkEquipment[idx].spareKit ? "bg-green-600 border-green-600" : "bg-gray-200"
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                  trunkEquipment[idx].spareKit ? "translate-x-5" : "translate-x-1"
                                ].join(" ")}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Jantes */}
                    {wheels.length > 0 &&
                      wheels.map((wheel) => {
                        const wheelSide = wheel.key === 'frontRight' ? 'janteAvDroit' :
                                         wheel.key === 'rearRight' ? 'janteArDroit' :
                                         wheel.key === 'frontLeft' ? 'janteAvGauche' :
                                         'janteArGauche'

                        const damagesForThisWheel = damageReports
                          .map((d: any, globalIndex: number) => ({ ...d, indexGlobal: globalIndex }))
                          .filter((d: any) => d.side === wheelSide)

                        return (
                          <div key={wheel.key} className="space-y-3" data-subzone={wheelSide}>
                            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
                              <div className="font-medium text-gray-900 text-sm mb-2">
                                {wheel.label}
                              </div>
                              
                              {(() => {
                                const wheelPhotoInputRef = useRef<HTMLInputElement | null>(null)
                                const wheelPhotos = watch(`exteriorInspection.zonesPhotos.${wheelSide}`) || []
                                
                                return (
                                  <>
                                    <input
                                      ref={wheelPhotoInputRef}
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      multiple
                                      className="hidden"
                                      onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;

                                        setIsUploadingPhoto(true);

                                        try {
                                          const current = watch(`exteriorInspection.zonesPhotos.${wheelSide}`) || [];
                                          const uploadedPhotos: ExteriorPhoto[] = [];

                                          // ⭐ Upload chaque fichier vers Storage
                                          for (const file of files) {
                                            // Convertir File → base64
                                            const base64 = await new Promise<string>((resolve, reject) => {
                                              const reader = new FileReader();
                                              reader.onload = () => resolve(reader.result as string);
                                              reader.onerror = reject;
                                              reader.readAsDataURL(file);
                                            });

                                            // Upload via helper
                                            const uploaded = await uploadWheelPhoto(
                                              base64,
                                              bookingId,
                                              bookingReferenceNumber,
                                              wheelSide // janteAvDroit, janteArDroit, etc.
                                            );

                                            if (uploaded) {
                                              uploadedPhotos.push(uploaded);
                                            }
                                          }

                                          if (uploadedPhotos.length > 0) {
                                            setValue(
                                              `exteriorInspection.zonesPhotos.${wheelSide}`,
                                              [...current, ...uploadedPhotos],
                                              { shouldDirty: true }
                                            );
                                            toast.success(`✅ ${uploadedPhotos.length} photo(s) de jante uploadée(s)`);
                                          }
                                        } catch (error: any) {
                                          console.error('[Step3] ❌ Erreur upload photo jante:', error);
                                          toast.error('❌ Erreur lors de l\'upload des photos');
                                        } finally {
                                          setIsUploadingPhoto(false);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                    
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        wheelPhotoInputRef.current?.click()
                                      }}
                                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors mb-3"
                                    >
                                      <CameraIcon className="h-4 w-4" />
                                      <span className="ml-1">Ajouter une photo</span>
                                    </button>

                                    {wheelPhotos.length > 0 && (
                                      <div className="mt-2 mb-3 flex flex-wrap gap-2">
                                        {wheelPhotos.map((photo: ExteriorPhoto, photoIdx: number) => (
                                          <div key={photoIdx} className="relative">
                                            <ZoomableImage
                                              src={photo.publicUrl}
                                              alt={`${wheel.label} - photo ${photoIdx + 1}`}
                                              className="h-16 w-16 rounded-md border object-cover hover:scale-105 transition-transform"
                                            />
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                const updated = wheelPhotos.filter((_: ExteriorPhoto, i: number) => i !== photoIdx)
                                                setValue(
                                                  `exteriorInspection.zonesPhotos.${wheelSide}`,
                                                  updated,
                                                  { shouldDirty: true }
                                                )
                                              }}
                                              className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )
                              })()}

                              {/* Toggle dégâts jante */}
                              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2.5">
                                <span className="text-sm font-medium text-gray-800">
                                  Dégâts visibles sur cette jante ?
                                </span>
                                <button
                                  type="button"
                                  aria-pressed={!!zonesHasDamage[wheelSide]}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const nextValue = !zonesHasDamage[wheelSide]
                                    setZoneHasDamage(wheelSide, nextValue)
                                    
                                    if (nextValue) {
                                      const alreadyHas = damageReports.some((d: any) => d.side === wheelSide)
                                      if (!alreadyHas) {
                                        addDamage(wheelSide as any)
                                      }
                                    }
                                  }}
                                  className={cn(
                                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border transition-colors',
                                    zonesHasDamage[wheelSide]
                                      ? 'bg-green-600 border-green-600'
                                      : 'bg-gray-200 border-gray-300'
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                                      zonesHasDamage[wheelSide] ? 'translate-x-5' : 'translate-x-0.5'
                                    )}
                                  />
                                </button>
                              </div>

                              {/* Blocs dégâts jante - affichés seulement si switch ON */}
                              {zonesHasDamage[wheelSide] && (
                                <>
                                  <div className="space-y-3 mt-3">
                                    {damagesForThisWheel.map((damage: any) => {
                                      const WheelPhotoInput = () => {
                                        const fileInputRef = useRef<HTMLInputElement | null>(null)
                                        
                                        return (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                fileInputRef.current?.click()
                                              }}
                                              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
                                            >
                                              <CameraIcon className="h-4 w-4" />
                                              <span className="ml-1">Ajouter des photos</span>
                                            </button>
                                            <input
                                              ref={fileInputRef}
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              className="hidden"
                                              onChange={async (e) => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length === 0) return;

                                                setIsUploadingPhoto(true);

                                                try {
                                                  const currentPhotos = damage.photos || [];
                                                  const uploadedPhotos: ExteriorPhoto[] = [];

                                                  // ⭐ Upload chaque fichier vers Storage
                                                  for (const file of files) {
                                                    // Convertir File → base64
                                                    const base64 = await new Promise<string>((resolve, reject) => {
                                                      const reader = new FileReader();
                                                      reader.onload = () => resolve(reader.result as string);
                                                      reader.onerror = reject;
                                                      reader.readAsDataURL(file);
                                                    });

                                                    // Upload via helper avec zone + index du dégât
                                                    const uploaded = await uploadDamagePhoto(
                                                      base64,
                                                      bookingId,
                                                      bookingReferenceNumber,
                                                      damage.side, // zone (avant, droit, arriere, gauche, coffre)
                                                      damage.indexGlobal
                                                    );

                                                    if (uploaded) {
                                                      uploadedPhotos.push(uploaded);
                                                    }
                                                  }

                                                  if (uploadedPhotos.length > 0) {
                                                    updateDamage(damage.indexGlobal, "photos", [...currentPhotos, ...uploadedPhotos]);
                                                    toast.success(`✅ ${uploadedPhotos.length} photo(s) de dégât uploadée(s)`);
                                                  }
                                                } catch (error: any) {
                                                  console.error('[Step3] ❌ Erreur upload photo dégât:', error);
                                                  toast.error('❌ Erreur lors de l\'upload des photos');
                                                } finally {
                                                  setIsUploadingPhoto(false);
                                                  e.target.value = '';
                                                }
                                              }}
                                            />
                                          </>
                                        )
                                      }
                                      
                                      return (
                                        <div key={damage.indexGlobal} className="bg-red-50 border border-red-300 rounded-md p-3 text-sm text-red-900 space-y-3">
                                          <div className="flex items-start justify-between">
                                            <div className="font-semibold text-red-900">
                                              Dégât jante #{damage.indexGlobal + 1}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                removeDamage(damage.indexGlobal)
                                              }}
                                              className="text-xs text-red-700 underline"
                                            >
                                              Supprimer
                                            </button>
                                          </div>

                                          <div className="space-y-2">
                                            <div className="text-xs font-medium text-red-900">
                                              Type de dégât <span className="text-xs font-normal text-gray-600">(sélection multiple)</span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                              {WHEEL_DAMAGE_TYPES.map((t) => {
                                                const isSelected = Array.isArray(damage.typeDegats) && damage.typeDegats.includes(t)
                                                
                                                return (
                                                  <button
                                                    key={t}
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      const types = damage.typeDegats.includes(t)
                                                        ? damage.typeDegats.filter((type: string) => type !== t)
                                                        : [...damage.typeDegats, t]
                                                      updateDamage(damage.indexGlobal, "typeDegats", types)
                                                    }}
                                                    className={[
                                                      "px-2 py-1 rounded-full border text-xs font-medium",
                                                      isSelected
                                                        ? "bg-red-600 text-white border-red-600"
                                                        : "bg-white text-red-700 border-red-300"
                                                    ].join(" ")}
                                                  >
                                                    {t}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          </div>

                                          <textarea
                                            className="w-full rounded-md border border-red-300 bg-white p-2 text-sm text-gray-800 placeholder:text-gray-400"
                                            placeholder="Précisions (ex: rayure jante)"
                                            rows={2}
                                            value={damage.commentaire}
                                            onChange={(e) => {
                                              e.stopPropagation()
                                              updateDamage(damage.indexGlobal, "commentaire", e.target.value)
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          />

                                          <div className="rounded-md border border-dashed border-red-300 bg-red-50 p-3 text-center space-y-2">
                                            <div className="text-sm font-medium text-red-900 mb-2">
                                              Photos du dégât
                                            </div>
                                            <WheelPhotoInput />

                                            {damage.photos && damage.photos.length > 0 && (() => {
                                              const main = damage.photos[0] as any;
                                              const mainUrl: string | undefined = typeof main === 'string' ? main : main?.publicUrl;
                                              const others = damage.photos.slice(1) as ExteriorPhoto[];
                                              return (
                                                <div className="mt-3 space-y-3">
                                                  {/* Grande photo principale */}
                                                  <div className="relative">
                                                    <img
                                                      src={mainUrl}
                                                      alt={`jante-${damage.indexGlobal}-main`}
                                                      className="w-full max-w-[900px] mx-auto aspect-[16/9] object-cover rounded-lg border border-red-300"
                                                    />
                                                    <button
                                                      type="button"
                                                      aria-label="Supprimer la photo principale"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const photos = damage.photos.slice(1);
                                                        updateDamage(damage.indexGlobal, "photos", photos);
                                                      }}
                                                      className="absolute top-2 right-2 bg-red-600/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                                                    >
                                                      ×
                                                    </button>
                                                  </div>
                                                  {/* Autres photos */}
                                                  {others.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 justify-center">
                                                      {others.map((p: ExteriorPhoto, idx: number) => (
                                                        <div key={idx} className="relative">
                                                          <img
                                                            src={p.publicUrl}
                                                            alt={`jante-${damage.indexGlobal}-thumb-${idx}`}
                                                            className="h-16 w-16 rounded-md object-cover border border-red-300 cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => window.open(p.publicUrl, '_blank')}
                                                          />
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              const photos = [main, ...others.filter((_, j) => j !== idx)];
                                                              updateDamage(damage.indexGlobal, "photos", photos);
                                                            }}
                                                            className="absolute -top-2 -right-2 bg-white text-red-700 rounded-full border border-red-300 w-5 h-5 text-xs flex items-center justify-center shadow-sm"
                                                          >
                                                            ×
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  <div className="flex justify-center">
                                                    <span className="text-[11px] text-red-700/80">
                                                      Utilisez "Ajouter des photos" ci-dessus pour compléter le dossier
                                                    </span>
                                                  </div>
                                                </div>
                                              )
                                            })()}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      addDamage(wheelSide as any)
                                    }}
                                    className="w-full rounded-md border border-dashed border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 text-center hover:bg-red-50"
                                  >
                                    ➕ Ajouter un dégât sur {wheel.label.toLowerCase()}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}

                    {/* ⭐ BOUTON DE NAVIGATION PAR ZONE (toutes les zones) */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompleteZoneAndGoNext(step, idx)
                        }}
                        className={cn(
                          "w-full rounded-md px-4 py-3 text-sm font-semibold transition-all shadow-sm",
                          idx === 5 
                            ? "bg-success text-success-foreground hover:bg-success/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {getNavigationButtonText(step)}
                      </button>
                    </div>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}
      
      {/* ⭐ BOUTON FIN D'ÉTAPE 3 - Sauvegarde Step3 */}
      <Card className="mt-6 border-2 border-primary/20 shadow-lg" data-exterior-summary="true">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Inspection extérieure complète
            </h3>
            <p className="text-sm text-muted-foreground">
              Vous avez terminé l'inspection extérieure. Cliquez pour sauvegarder et passer à l'inspection intérieure.
            </p>
            <Button
              type="button"
              onClick={handleCompleteExteriorInspection}
              disabled={isSaving || isUploadingPhoto}
              className="w-full md:w-auto bg-gradient-lagoon hover:opacity-90 text-white font-semibold px-8 py-6 text-base shadow-lagoon"
            >
              {isUploadingPhoto ? (
                <>📤 Upload des photos en cours...</>
              ) : isSaving ? (
                <>🔄 Sauvegarde en cours...</>
              ) : (
                <>
                  Terminer l'inspection extérieure
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
