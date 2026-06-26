import "@/styles/preview-banner.css";
import "@/styles/manage-vehicle.css";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Zap, Shield, Clock, Star, Upload, Image as ImageIcon, Trash2, Plus, MapPin, Settings, Wind, Navigation, Gauge, Volume2, Bluetooth, Smartphone, Phone, Users, CalendarIcon, ChevronLeft, ChevronRight, UserCheck, Car, Camera, Plane, Ship, Home, Baby, UserPlus, ArrowDownToLine, ArrowUpFromLine, Gift, Euro, AlertTriangle, X, Waves, Umbrella, Wifi, Bath, ShoppingBag, Music, UtensilsCrossed, Sun, Sparkles, Shirt, Laptop, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { ProfileService } from "@/services/supabase/profile";
import { PickupZonesModal } from "@/components/ui/pickup-zones-modal";
import { Vehicle, User } from "@/types";
import { supabase } from "@/integrations/supabase/client";
// 🆕 REFACTO - Import du composant extrait
import { VehicleBasicInfoTab } from "@/features/vehicle-management/components/tabs/VehicleBasicInfoTab";
// 🆕 REFACTO Étape 2A - Import du hook pour gérer formData
import { useManageVehicle } from "@/features/vehicle-management/hooks/useManageVehicle";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";
import { DualPrice } from "@/components/currency/DualPrice";
import { OwnerDualCurrencyInput } from "@/components/currency/OwnerDualCurrencyInput";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useTranslation } from "react-i18next";
import { ListingOwnersService } from "@/services/supabase/listingOwners";
import { ListingOwnerAvatarsService } from "@/services/supabase/listingOwnerAvatars";
import { LocationAreaSelect } from "@/components/location/LocationAreaSelect";

// ── Description multilingue ──────────────────────────────────────────────────
const LANGS = [
  { code: "fr", label: "🇫🇷 Français" },
  { code: "en", label: "🇬🇧 English" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "it", label: "🇮🇹 Italiano" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];

function DescriptionTranslationBlock({
  valueFr, valueEn, valueDe, valueIt,
  onChangeFr, onChangeEn, onChangeDe, onChangeIt,
}: {
  valueFr: string; valueEn: string; valueDe: string; valueIt: string;
  onChangeFr: (v: string) => void; onChangeEn: (v: string) => void;
  onChangeDe: (v: string) => void; onChangeIt: (v: string) => void;
}) {
  const [activeLang, setActiveLang] = useState<LangCode>("fr");
  const [translating, setTranslating] = useState<LangCode | null>(null);

  const values: Record<LangCode, string> = { fr: valueFr, en: valueEn, de: valueDe, it: valueIt };
  const handlers: Record<LangCode, (v: string) => void> = { fr: onChangeFr, en: onChangeEn, de: onChangeDe, it: onChangeIt };
  const placeholders: Record<LangCode, string> = {
    fr: "Décrivez votre logement / véhicule...",
    en: "Describe your property / vehicle...",
    de: "Beschreiben Sie Ihre Unterkunft / Ihr Fahrzeug...",
    it: "Descrivi il tuo alloggio / veicolo...",
  };

  const handleAutoTranslate = async (targetLang: LangCode) => {
    if (!valueFr.trim()) return;
    setTranslating(targetLang);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: valueFr, targetLang }),
      });
      const data = await res.json() as { translated?: string; error?: string };
      if (data.translated) handlers[targetLang](data.translated);
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        Description *
        <CheckCircle className="h-4 w-4 text-green-500" />
      </Label>
      <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as LangCode)}>
        <TabsList className="w-full">
          {LANGS.map((l) => (
            <TabsTrigger key={l.code} value={l.code} className="flex-1 text-xs">
              {l.label}
              {l.code !== "fr" && values[l.code].trim() && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {LANGS.map((l) => (
          <TabsContent key={l.code} value={l.code} className="mt-2 space-y-2">
            {l.code !== "fr" && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!valueFr.trim() || translating === l.code}
                  onClick={() => handleAutoTranslate(l.code)}
                  className="text-xs gap-1"
                >
                  {translating === l.code ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Traduction...</>
                  ) : (
                    <>🔄 Traduire depuis le français</>
                  )}
                </Button>
              </div>
            )}
            <Textarea
              value={values[l.code]}
              onChange={(e) => handlers[l.code](e.target.value)}
              placeholder={placeholders[l.code]}
              className="min-h-[120px] w-full"
            />
            {l.code === "fr" && (
              <p className="text-xs text-muted-foreground">
                La description française est la source pour la traduction automatique.
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function ManageVehicle() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  console.log("[ManageVehicle] vehicleId from params =", vehicleId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("common");
  const { formatClient } = useExchangeRate();

  // const [loading, setLoading] = useState(false); // SUPPRIMÉ Étape 2B.1.2 - géré par useManageVehicle
  const [saving, setSaving] = useState(false);
  // const [vehicle, setVehicle] = useState<Vehicle | null>(null); // SUPPRIMÉ Étape 2B.1.2 - géré par useManageVehicle
  // const [hasChanges, setHasChanges] = useState(false); // SUPPRIMÉ - géré par useManageVehicle
  const [previewMode, setPreviewMode] = useState(false);
  // const [validationErrors, setValidationErrors] = useState<Record<string, string>>({}); // SUPPRIMÉ - géré par useManageVehicle
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingListingOwnerAvatar, setUploadingListingOwnerAvatar] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const listingOwnerAvatarInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [ownerProfile, setOwnerProfile] = useState<User | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [pendingAvailabilityChange, setPendingAvailabilityChange] = useState<boolean | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSecondDeleteDialog, setShowSecondDeleteDialog] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [hasActiveReservations, setHasActiveReservations] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  // ✅ LE PROFIL DU PROPRIÉTAIRE EST DÉJÀ CHARGÉ DANS ownerProfile
  // 🆕 ÉTAT POUR LE MODAL DES ZONES DE PICK-UP
  const [isPickupZonesModalOpen, setIsPickupZonesModalOpen] = useState(false);
  // 🆕 ÉTAT POUR LE MODAL DE CONFIRMATION DE SUPPRESSION DE ZONE
  const [showDeleteZoneDialog, setShowDeleteZoneDialog] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  // 🆕 ÉTAT POUR LE MODAL DE CONFIGURATION DE SERVICE
  const [showServiceConfigDialog, setShowServiceConfigDialog] = useState(false);
  const [serviceZoneToConfig, setServiceZoneToConfig] = useState<string | null>(null);
  const [pendingServiceZones, setPendingServiceZones] = useState<string[]>([]);
  const [pendingConfigurations, setPendingConfigurations] = useState<string[]>([]);
  const [showPendingConfigAlert, setShowPendingConfigAlert] = useState(false);
  
  // 🆕 ÉTAT POUR LE MODAL D'AVERTISSEMENT DE SORTIE
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  
  // 🆕 REFS POUR LE SCROLL AUTOMATIQUE VERS LES SECTIONS DE SERVICES
  const airportServiceRef = useRef<HTMLDivElement>(null);
  const bargePetiteTerreServiceRef = useRef<HTMLDivElement>(null);
  const bargeGrandeTerreServiceRef = useRef<HTMLDivElement>(null);
  const homeDeliveryServiceRef = useRef<HTMLDivElement>(null);
  const babySeatServiceRef = useRef<HTMLDivElement>(null);
  const additionalDriverServiceRef = useRef<HTMLDivElement>(null);

  // 🆕 REFACTO Étape 2A-2B.1.2 - Hook pour gérer formData, hasChanges, validationErrors, loadVehicle, vehicle, loading
  const {
    vehicle,     // 🆕 Étape 2B.1.2 - État vehicle maintenant du hook (fix "Véhicule non trouvé")
    loading,     // 🆕 Étape 2B.1.2 - État loading maintenant du hook
    formData,
    setFormData,
    hasChanges,
    setHasChanges,
    validationErrors,
    setValidationErrors,
    loadVehicle,
    vehicleType,
  } = useManageVehicle(vehicleId);
  
  console.log("[ManageVehicle] Hook states - vehicle =", vehicle, ", loading =", loading, ", formData.brand =", formData.brand);


  useEffect(() => {
    if (vehicleId) {
      // Charger le véhicule (maintenant dans le hook)
      loadVehicle().catch((error) => {
        // Erreurs déjà gérées dans le hook (toast + navigate)
        console.error("Erreur capturée dans le composant:", error);
      });
      
      // Chargements parallèles (inchangés)
      loadPhotos();
      loadOwnerProfile();
    }
  }, [vehicleId, loadVehicle]);

  // 🆕 Étape 2B.1.1 - useEffect dédié pour détecter les services non configurés
  // Réagit aux changements de formData (après chargement ou après modification)
  useEffect(() => {
    const pendingServices: string[] = [];
    
    // Vérifier depuis formData (qui vient du hook)
    if (formData.pickupZones?.includes('Aéroport') && 
        !formData.airportPickupRetrieval && 
        !formData.airportPickupReturn) {
      pendingServices.push('Aéroport');
    }
    if (formData.pickupZones?.includes('Barge Petite Terre') && 
        !formData.bargePetiteTerreRetrieval && 
        !formData.bargePetiteTerreReturn) {
      pendingServices.push('Barge Petite Terre');
    }
    if (formData.pickupZones?.includes('Barge Grande Terre') && 
        !formData.bargeGrandeTerreRetrieval && 
        !formData.bargeGrandeTerreReturn) {
      pendingServices.push('Barge Grande Terre');
    }
    if (formData.homeDeliveryService && 
        !formData.homeDeliveryPickup && 
        !formData.homeDeliveryReturn) {
      pendingServices.push('Livraison à domicile');
    }
    
    // Mettre à jour l'état (même si vide, pour être propre)
    setPendingConfigurations(pendingServices);
  }, [formData]);

  // 🆕 INTERCEPTER TOUS LES CLICS DE NAVIGATION GLOBALE
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Vérifier si le clic est sur un élément de navigation
      const isNavigationElement = (
        // Liens <a> avec href (mais pas les ancres)
        (target.tagName === 'A' && target.getAttribute('href') && !target.getAttribute('href')?.startsWith('#')) ||
        // Boutons avec des classes de navigation communes
        target.closest('a[href]:not([href^="#"])') ||
        target.closest('[data-navigation]') ||
        // Logo ou éléments spécifiques
        target.closest('.logo') ||
        target.closest('[data-logo]') ||
        target.closest('[data-testid*="logo"]') ||
        // Boutons de navigation dans la navbar
        target.closest('nav a[href]:not([href^="#"])') ||
        target.closest('nav button') ||
        // Éléments avec des classes de navigation communes
        target.closest('.nav-link') ||
        target.closest('.navigation-link') ||
        target.closest('.header-link') ||
        // Éléments React Router (si présents)
        target.closest('[data-router-link]') ||
        target.closest('.router-link')
      );

      if (isNavigationElement && hasChanges) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log("🚫 Navigation interceptée:", target);
        
        // Déterminer la destination
        let destination = "/";
        const link = target.closest('a[href]');
        if (link) {
          destination = link.getAttribute('href') || "/";
        } else {
          // Pour les boutons ou autres éléments, essayer de détecter la destination
          const button = target.closest('button');
          if (button) {
            // Vérifier s'il y a des attributs data-* qui indiquent la destination
            const dataHref = button.getAttribute('data-href');
            const dataTo = button.getAttribute('data-to');
            const dataPath = button.getAttribute('data-path');
            
            if (dataHref) destination = dataHref;
            else if (dataTo) destination = dataTo;
            else if (dataPath) destination = dataPath;
            else destination = "/"; // Page d'accueil par défaut
          }
        }
        
        console.log("🎯 Destination détectée:", destination);
        
        // Afficher la modal d'avertissement
        setPendingNavigation(() => () => navigate(destination));
        setShowExitWarning(true);
      }
    };

    // Ajouter l'écouteur global
    document.addEventListener('click', handleGlobalClick, true);
    
    // 🆕 INTERCEPTER LES ÉVÉNEMENTS DE NAVIGATION DU NAVIGATEUR
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?";
        return "Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?";
      }
    };

    // Ajouter l'écouteur pour beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Nettoyer les écouteurs
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges, navigate]);

  // ✅ SUPPRIMÉ - loadVehicle() maintenant dans useManageVehicle hook (Étape 2B.1)
  // La fonction a été déplacée avec tout son mapping (87 lignes) sans modification

  const handleInputChange = (field: string, value: any) => {
    // Détecter les nouvelles zones de pickup avec services associés
    if (field === 'pickupZones') {
      const previousZones = formData.pickupZones;
      const newZones = value as string[];
      
      // Zones qui nécessitent une configuration de service (Livraison à domicile est indépendant)
      const ZONES_WITH_SERVICES = ['Aéroport', 'Barge Petite Terre', 'Barge Grande Terre'];
      
      // 🆕 Retirer des configurations en attente les zones qui ont été supprimées
      const removedZones = previousZones.filter(zone => !newZones.includes(zone));
      removedZones.forEach(zone => {
        if (ZONES_WITH_SERVICES.includes(zone)) {
          markServiceAsConfigured(zone);
        }
      });
      
      // Trouver les nouvelles zones ajoutées qui ont des services
      const newZonesWithServices = newZones.filter(zone => 
        !previousZones.includes(zone) && ZONES_WITH_SERVICES.includes(zone)
      );
      
      // 🆕 Activer automatiquement les services correspondants aux nouvelles zones
      const serviceUpdates: any = {};
      newZonesWithServices.forEach(zone => {
        switch (zone) {
          case 'Aéroport':
            serviceUpdates.airportPickupService = true;
            
            // 🆕 Initialiser les valeurs par défaut pour les services Aéroport
            // UNIQUEMENT si c'est la première fois (pas déjà configuré)
            const isAlreadyConfigured = 
              formData.airportPickupRetrieval || 
              formData.airportPickupReturn;
            
            if (!isAlreadyConfigured) {
              // Activer les deux services par défaut
              serviceUpdates.airportPickupRetrieval = true;
              serviceUpdates.airportPickupReturn = true;
              
              // Mode PAYANT par défaut (pas gratuit)
              serviceUpdates.airportPickupRetrievalFree = false;
              serviceUpdates.airportPickupReturnFree = false;
              
              // Prix par défaut 25€ (seulement si pas déjà défini)
              serviceUpdates.airportPickupRetrievalPrice = formData.airportPickupRetrievalPrice || "25";
              serviceUpdates.airportPickupReturnPrice = formData.airportPickupReturnPrice || "25";
            }
            break;
          case 'Barge Petite Terre':
            serviceUpdates.bargePetiteTerreService = true;
            
            // 🆕 Initialiser les valeurs par défaut pour Barge Petite Terre
            // UNIQUEMENT si c'est la première fois (pas déjà configuré)
            const isPetiteTerreConfigured = 
              formData.bargePetiteTerreRetrieval || 
              formData.bargePetiteTerreReturn;
            
            if (!isPetiteTerreConfigured) {
              // Activer les deux services par défaut
              serviceUpdates.bargePetiteTerreRetrieval = true;
              serviceUpdates.bargePetiteTerreReturn = true;
              
              // Mode PAYANT par défaut (pas gratuit)
              serviceUpdates.bargePetiteTerreRetrievalFree = false;
              serviceUpdates.bargePetiteTerreReturnFree = false;
              
              // Prix par défaut 15€ (FORCER la valeur, pas de fallback sur formData existant)
              serviceUpdates.bargePetiteTerreRetrievalPrice = "15";
              serviceUpdates.bargePetiteTerreReturnPrice = "15";
            }
            break;
          case 'Barge Grande Terre':
            serviceUpdates.bargeGrandeTerreService = true;
            
            // 🆕 Initialiser les valeurs par défaut pour Barge Grande Terre
            // UNIQUEMENT si c'est la première fois (pas déjà configuré)
            const isGrandeTerreConfigured = 
              formData.bargeGrandeTerreRetrieval || 
              formData.bargeGrandeTerreReturn;
            
            if (!isGrandeTerreConfigured) {
              // Activer les deux services par défaut
              serviceUpdates.bargeGrandeTerreRetrieval = true;
              serviceUpdates.bargeGrandeTerreReturn = true;
              
              // Mode PAYANT par défaut (pas gratuit)
              serviceUpdates.bargeGrandeTerreRetrievalFree = false;
              serviceUpdates.bargeGrandeTerreReturnFree = false;
              
              // Prix par défaut 15€ (FORCER la valeur, pas de fallback sur formData existant)
              serviceUpdates.bargeGrandeTerreRetrievalPrice = "15";
              serviceUpdates.bargeGrandeTerreReturnPrice = "15";
            }
            break;
        }
      });
      
      // Appliquer les activations de services
      if (Object.keys(serviceUpdates).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...serviceUpdates
        }));
        setHasChanges(true);
      }
      
      // Si au moins une nouvelle zone avec service a été ajoutée, ouvrir la modal
      if (newZonesWithServices.length > 0) {
        setTimeout(() => {
          setPendingServiceZones(newZonesWithServices);
          setServiceZoneToConfig(newZonesWithServices[0]);
          setShowServiceConfigDialog(true);
        }, 300); // Petit délai pour que la modal de zones se ferme d'abord
      }
    }
    
    // 🆕 Détecter la configuration d'un service pour retirer la zone des configurations en attente
    if (field.startsWith('airport') && value === true) {
      markServiceAsConfigured('Aéroport');
    } else if (field.startsWith('bargePetiteTerre') && value === true) {
      markServiceAsConfigured('Barge Petite Terre');
    } else if (field.startsWith('bargeGrandeTerre') && value === true) {
      markServiceAsConfigured('Barge Grande Terre');
    } else if (field.startsWith('homeDelivery') && value === true) {
      markServiceAsConfigured('Livraison à domicile');
    } else if (field.startsWith('babySeat') && value === true) {
      markServiceAsConfigured('Siège bébé');
    } else if (field.startsWith('additionalDriver') && value === true) {
      markServiceAsConfigured('Conducteur additionnel');
    }
    
    // 🆕 Détecter l'activation du service "Livraison à domicile" pour l'ajouter aux configurations en attente
    if (field === 'homeDeliveryService' && value === true) {
      // Ajouter à la liste des configurations en attente si pas déjà présent
      setPendingConfigurations(prev => {
        if (!prev.includes('Livraison à domicile')) {
          return [...prev, 'Livraison à domicile'];
        }
        return prev;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
    
    // Validation en temps réel
    validateField(field, value);
  };

  // 🆕 FONCTION POUR CONFIGURER LE SERVICE MAINTENANT
  const handleConfigureNow = () => {
    const zoneToScroll = serviceZoneToConfig;
    
    // Retirer la zone de la liste des configurations en attente
    if (serviceZoneToConfig) {
      setPendingConfigurations(prev => prev.filter(zone => zone !== serviceZoneToConfig));
    }
    
    setShowServiceConfigDialog(false);
    setServiceZoneToConfig(null);
    setPendingServiceZones([]);
    setActiveTab('pricing');
    
    // Scroll automatique vers la section correspondante après changement d'onglet
    setTimeout(() => {
      let targetRef = null;
      
      switch (zoneToScroll) {
        case 'Aéroport':
          targetRef = airportServiceRef;
          break;
        case 'Barge Petite Terre':
          targetRef = bargePetiteTerreServiceRef;
          break;
        case 'Barge Grande Terre':
          targetRef = bargeGrandeTerreServiceRef;
          break;
        case 'Livraison à domicile':
          targetRef = homeDeliveryServiceRef;
          break;
      }
      
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Animation de highlight (flash)
        targetRef.current.classList.add('ring-4', 'ring-primary/30', 'transition-all', 'duration-500');
        setTimeout(() => {
          targetRef.current?.classList.remove('ring-4', 'ring-primary/30');
        }, 2000);
      }
    }, 100); // Petit délai pour que l'onglet change d'abord
    
    toast({
      title: "✅ Redirection vers la configuration",
      description: `Configurez maintenant le service "${zoneToScroll}" ci-dessous.`,
      duration: 3000,
    });
  };

  // 🆕 FONCTION POUR VALIDER LES CONFIGURATIONS DE SERVICES
  const validateServiceConfiguration = (serviceName: string) => {
    switch (serviceName) {
      case 'Aéroport':
        if (formData.airportPickupService && !formData.airportPickupRetrieval && !formData.airportPickupReturn) {
          return {
            isValid: false,
            message: "Vous devez activer au moins 'Retrait à l'aéroport' OU 'Restitution à l'aéroport'"
          };
        }
        if (formData.airportPickupRetrieval && formData.airportPickupRetrievalFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si le retrait à l'aéroport est gratuit ou payant"
          };
        }
        if (formData.airportPickupReturn && formData.airportPickupReturnFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si la restitution à l'aéroport est gratuite ou payante"
          };
        }
        break;

      case 'Barge Petite Terre':
        if (formData.bargePetiteTerreService && !formData.bargePetiteTerreRetrieval && !formData.bargePetiteTerreReturn) {
          return {
            isValid: false,
            message: "Vous devez activer au moins 'Retrait à la barge' OU 'Restitution à la barge'"
          };
        }
        if (formData.bargePetiteTerreRetrieval && formData.bargePetiteTerreRetrievalFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si le retrait à la barge est gratuit ou payant"
          };
        }
        if (formData.bargePetiteTerreReturn && formData.bargePetiteTerreReturnFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si la restitution à la barge est gratuite ou payante"
          };
        }
        break;

      case 'Barge Grande Terre':
        if (formData.bargeGrandeTerreService && !formData.bargeGrandeTerreRetrieval && !formData.bargeGrandeTerreReturn) {
          return {
            isValid: false,
            message: "Vous devez activer au moins 'Retrait à la barge' OU 'Restitution à la barge'"
          };
        }
        if (formData.bargeGrandeTerreRetrieval && formData.bargeGrandeTerreRetrievalFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si le retrait à la barge est gratuit ou payant"
          };
        }
        if (formData.bargeGrandeTerreReturn && formData.bargeGrandeTerreReturnFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si la restitution à la barge est gratuite ou payante"
          };
        }
        break;

      case 'Livraison à domicile':
        if (formData.homeDeliveryService && !formData.homeDeliveryPickup && !formData.homeDeliveryReturn) {
          return {
            isValid: false,
            message: "Vous devez activer au moins 'Livraison à domicile' OU 'Récupération à domicile'"
          };
        }
        if (formData.homeDeliveryPickup && formData.homeDeliveryPickupFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si la livraison à domicile est gratuite ou payante"
          };
        }
        if (formData.homeDeliveryReturn && formData.homeDeliveryReturnFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si la récupération à domicile est gratuite ou payante"
          };
        }
        break;

      case 'Siège bébé':
        if (formData.babySeatService && formData.babySeatFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si le siège bébé est gratuit ou payant"
          };
        }
        break;

      case 'Conducteur additionnel':
        if (formData.additionalDriverService && formData.additionalDriverFree === null) {
          return {
            isValid: false,
            message: "Vous devez choisir si le conducteur additionnel est gratuit ou payant"
          };
        }
        break;
    }
    
    return { isValid: true };
  };

  // 🆕 FONCTION POUR RETIRER UNE ZONE DES CONFIGURATIONS EN ATTENTE
  const markServiceAsConfigured = (zoneName: string) => {
    // Vérifier que le service est vraiment complet avant de le retirer
    const validation = validateServiceConfiguration(zoneName);
    if (validation.isValid) {
      setPendingConfigurations(prev => prev.filter(zone => zone !== zoneName));
    }
  };

  // 🆕 FONCTION POUR CONFIGURER LES SERVICES EN ATTENTE MAINTENANT
  const handleConfigurePendingNow = () => {
    setShowPendingConfigAlert(false);
    setActiveTab('pricing');
    
    // Scroll automatique vers le premier service en attente
    setTimeout(() => {
      const firstPendingZone = pendingConfigurations[0];
      let targetRef = null;
      
      switch (firstPendingZone) {
        case 'Aéroport': targetRef = airportServiceRef; break;
        case 'Barge Petite Terre': targetRef = bargePetiteTerreServiceRef; break;
        case 'Barge Grande Terre': targetRef = bargeGrandeTerreServiceRef; break;
        case 'Livraison à domicile': targetRef = homeDeliveryServiceRef; break;
        case 'Siège bébé': targetRef = babySeatServiceRef; break;
        case 'Conducteur additionnel': targetRef = additionalDriverServiceRef; break;
      }
      
      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Animation de highlight (flash)
        targetRef.current.classList.add('ring-4', 'ring-primary/30', 'transition-all', 'duration-500');
        setTimeout(() => {
          targetRef.current?.classList.remove('ring-4', 'ring-primary/30');
        }, 2000);
      }
    }, 100);
    
    toast({
      title: "✅ Redirection vers la configuration",
      description: `Configurez maintenant le service "${pendingConfigurations[0]}" ci-dessous.`,
      duration: 3000,
    });
  };

  // 🆕 FONCTION POUR ANNULER LA SAUVEGARDE
  const handleCancelSave = () => {
    setShowPendingConfigAlert(false);
    toast({
      title: "❌ Sauvegarde annulée",
      description: "Vous devez configurer vos services en attente avant de sauvegarder.",
      duration: 4000,
    });
  };

  // 🆕 FONCTION POUR CONFIGURER LE SERVICE PLUS TARD
  const handleConfigureLater = () => {
    // Ajouter la zone actuelle à la liste des configurations en attente
    if (serviceZoneToConfig) {
      setPendingConfigurations(prev => [...prev, serviceZoneToConfig]);
    }
    
    // Passer à la zone suivante s'il y en a
    const remainingZones = pendingServiceZones.slice(1);
    
    if (remainingZones.length > 0) {
      setServiceZoneToConfig(remainingZones[0]);
      setPendingServiceZones(remainingZones);
    } else {
      setShowServiceConfigDialog(false);
      setServiceZoneToConfig(null);
      setPendingServiceZones([]);
      
      toast({
        title: "⚠️ N'oubliez pas !",
        description: "Vous pourrez configurer vos services plus tard dans l'onglet 'Tarifs & conditions'.",
        duration: 5000,
      });
    }
  };

  // 🆕 FONCTION POUR DEMANDER LA CONFIRMATION DE SUPPRESSION D'UNE ZONE
  const removePickupZone = (zoneToRemove: string) => {
    setZoneToDelete(zoneToRemove);
    setShowDeleteZoneDialog(true);
  };

  // 🆕 FONCTION POUR CONFIRMER LA SUPPRESSION D'UNE ZONE
  const confirmDeleteZone = () => {
    if (zoneToDelete) {
      const updatedZones = formData.pickupZones.filter(zone => zone !== zoneToDelete);
      
      // Désactiver automatiquement les services associés à cette zone
      const updatedFormData: any = { pickupZones: updatedZones };
      
      // 🆕 Retirer la zone des configurations en attente
      setPendingConfigurations(prev => prev.filter(zone => zone !== zoneToDelete));
      
      switch (zoneToDelete) {
        case 'Aéroport':
          updatedFormData.airportPickupService = false;
          updatedFormData.airportPickupRetrieval = false;
          updatedFormData.airportPickupReturn = false;
          updatedFormData.airportPickupRetrievalFree = true; // Reset to default
          updatedFormData.airportPickupReturnFree = true; // Reset to default
          updatedFormData.airportPickupRetrievalPrice = 25; // Reset to default
          updatedFormData.airportPickupReturnPrice = 25; // Reset to default
          break;
        case 'Barge Petite Terre':
          updatedFormData.bargePetiteTerreService = false;
          updatedFormData.bargePetiteTerreRetrieval = false;
          updatedFormData.bargePetiteTerreReturn = false;
          updatedFormData.bargePetiteTerreRetrievalFree = true; // Reset to default
          updatedFormData.bargePetiteTerreReturnFree = true; // Reset to default
          updatedFormData.bargePetiteTerreRetrievalPrice = 15; // Reset to default
          updatedFormData.bargePetiteTerreReturnPrice = 15; // Reset to default
          break;
        case 'Barge Grande Terre':
          updatedFormData.bargeGrandeTerreService = false;
          updatedFormData.bargeGrandeTerreRetrieval = false;
          updatedFormData.bargeGrandeTerreReturn = false;
          updatedFormData.bargeGrandeTerreRetrievalFree = true; // Reset to default
          updatedFormData.bargeGrandeTerreReturnFree = true; // Reset to default
          updatedFormData.bargeGrandeTerreRetrievalPrice = 15; // Reset to default
          updatedFormData.bargeGrandeTerreReturnPrice = 15; // Reset to default
          break;
        // Note: Livraison à domicile est indépendant des zones de pickup
      }
      
      // Appliquer tous les changements en une seule fois
      setFormData(prev => ({
        ...prev,
        ...updatedFormData
      }));
      setHasChanges(true);
      
      setZoneToDelete(null);
    }
    setShowDeleteZoneDialog(false);
  };

  const handleAvailabilityChange = async (newValue: boolean) => {
    // Si on désactive la disponibilité, demander confirmation
    if (!newValue && formData.available) {
      setPendingAvailabilityChange(newValue);
      setShowAvailabilityDialog(true);
    } else {
      // Si on active, pas de confirmation nécessaire
      handleInputChange('available', newValue);
      
      // Sauvegarde automatique du statut
      const newStatus = newValue ? 'active' : 'inactive';
      await saveStatusOnly(newStatus);
    }
  };

  const confirmAvailabilityChange = async () => {
    if (pendingAvailabilityChange !== null) {
      handleInputChange('available', pendingAvailabilityChange);
      
      // Sauvegarde automatique du statut
      const newStatus = pendingAvailabilityChange ? 'active' : 'inactive';
      await saveStatusOnly(newStatus);
    }
    setShowAvailabilityDialog(false);
    setPendingAvailabilityChange(null);
  };

  const cancelAvailabilityChange = () => {
    setShowAvailabilityDialog(false);
    setPendingAvailabilityChange(null);
  };

  const checkActiveReservations = async () => {
    if (!vehicle) return;

    try {
      // Vérifier s'il y a des réservations actives pour ce véhicule
      const { data, error } = await supabase
        .from('reservations')
        .select('id, status, start_date, end_date')
        .eq('vehicle_id', vehicle.id)
        .in('status', ['confirmed', 'active', 'pending']);

      if (error) {
        console.error("Erreur lors de la vérification des réservations:", error);
        return false;
      }

      // Vérifier s'il y a des réservations futures ou en cours
      const now = new Date();
      const hasActive = data?.some(reservation => {
        const startDate = new Date(reservation.start_date);
        const endDate = new Date(reservation.end_date);
        return startDate <= now && endDate >= now;
      }) || false;

      setHasActiveReservations(hasActive);
      return hasActive;
    } catch (error) {
      console.error("Erreur lors de la vérification des réservations:", error);
      return false;
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicle) return;

    // Vérifier les réservations actives
    const hasActive = await checkActiveReservations();
    
    if (hasActive) {
      toast({
        title: "Impossible de supprimer",
        description: "Ce véhicule a des réservations actives ou futures. Annulez d'abord les réservations.",
        variant: "destructive",
      });
      return;
    }

    // Première confirmation
    setShowDeleteDialog(true);
  };

  const confirmFirstDelete = () => {
    setShowDeleteDialog(false);
    setShowSecondDeleteDialog(true);
  };

  const confirmSecondDelete = async () => {
    if (!vehicle) return;

    setDeletingVehicle(true);
    setShowSecondDeleteDialog(false);

    try {
      // Supprimer le véhicule
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) {
        console.error("Erreur lors de la suppression:", error);
        toast({
          title: "Erreur",
          description: `Impossible de supprimer le véhicule: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Véhicule supprimé",
        description: "Votre véhicule a été supprimé avec succès.",
      });

      // Rediriger vers la liste des véhicules
      navigate("/me/owner/vehicles");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
        variant: "destructive",
      });
    } finally {
      setDeletingVehicle(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setShowSecondDeleteDialog(false);
  };

  const saveStatusOnly = async (newStatus: 'active' | 'inactive') => {
    if (!vehicle) {
      console.error("Aucun véhicule sélectionné");
      return;
    }

    try {
      console.log("Sauvegarde automatique du statut:", newStatus);
      
      // Convertir le statut en boolean pour le champ available
      const isAvailable = newStatus === 'active';

      // Utiliser le client Supabase existant
      const { data, error } = await supabase
        .from('vehicles')
        .update({ available: isAvailable })
        .eq('id', vehicle.id);

      if (error) {
        console.error("Erreur lors de la sauvegarde du statut:", error);
        console.error("Détails de l'erreur:", error);
        toast({
          title: "Erreur",
          description: `Impossible de sauvegarder le statut: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log("Statut sauvegardé avec succès");
        toast({
          title: "Statut mis à jour",
          description: `Le véhicule est maintenant ${isAvailable ? 'disponible' : 'indisponible'}`,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du statut:", error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  const validateField = (field: string, value: any) => {
    let error = "";
    
    switch (field) {
      case "brand":
        if (!value || value.trim().length < 2) error = "La marque doit contenir au moins 2 caractères";
        break;
      case "model":
        if (!value || value.trim().length < 2) error = "Le modèle doit contenir au moins 2 caractères";
        break;
      case "year":
        const year = parseInt(value, 10); // Base 10 explicite
        console.log("🔍 DEBUG - Validation année ManageVehicle:", { value, year, isNaN: isNaN(year) });
        if (!value || isNaN(year) || year < 1990 || year > 2025) {
          error = "L'année doit être entre 1990 et 2025";
        }
        break;
      case "mileage":
        const mileage = parseInt(value);
        if (value && (isNaN(mileage) || mileage < 0)) {
          error = "Le kilométrage doit être un nombre positif";
        }
        break;
      case "pricePerDay":
        const price = parseFloat(value);
        if (!value || isNaN(price) || price < 1000) {
          error = "Le prix doit être d'au moins 1 000 Ar";
        }
        break;
      case "pricePerDayAgency": {
        const raw = typeof value === "string" ? value.trim() : "";
        if (!raw) break;
        const agency = parseFloat(raw);
        if (isNaN(agency) || agency < 1000) {
          error = "Le tarif agence doit être d'au moins 1 000 Ar, ou laissez vide";
        }
        break;
      }
      case "lowSeasonDiscount":
      case "highSeasonSurcharge":
      case "longDurationDiscount14":
      case "longDurationDiscount60":
        const discount = parseFloat(value);
        if (value && (isNaN(discount) || discount < 0 || discount > 100)) {
          error = "La remise doit être entre 0 et 100%";
        }
        break;
      case "depositAmount":
        if (value) {
          const deposit = parseFloat(value);
          if (isNaN(deposit) || deposit < 0) {
            error = "Le montant doit être un nombre ≥ 0";
          }
        }
        break;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const calculateCompletion = () => {
    const requiredFields = ["brand", "model", "year", "pricePerDay"];
    const filledFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData];
      return value && value.toString().trim().length > 0;
    });
    
    const percentage = Math.round((filledFields.length / requiredFields.length) * 100);
    // setCompletionPercentage(percentage); // Supprimé car la barre de progression n'est plus utilisée
  };

  const calculatePricing = () => {
    const basePrice = parseFloat(formData.pricePerDay) || 0;
    const lowSeasonDiscount = parseFloat(formData.lowSeasonDiscount) || 0;
    const highSeasonSurcharge = parseFloat(formData.highSeasonSurcharge) || 0;
    const longDurationDiscount14 = parseFloat(formData.longDurationDiscount14) || 0;
    const longDurationDiscount60 = parseFloat(formData.longDurationDiscount60) || 0;
    
    return {
      basePrice,
      lowSeasonPrice: basePrice * (1 - lowSeasonDiscount / 100),
      highSeasonPrice: basePrice * (1 + highSeasonSurcharge / 100),
      longDuration14Price: basePrice * (1 - longDurationDiscount14 / 100),
      longDuration60Price: basePrice * (1 - longDurationDiscount60 / 100),
    };
  };

  const togglePreviewMode = () => {
    if (previewMode) {
      // Retourner à l'édition
      setPreviewMode(false);
      setActiveTab("basic");
    } else {
      // Passer en mode aperçu
      setPreviewMode(true);
      setActiveTab("preview");
      setSelectedPhotoIndex(0); // Réinitialiser à la première photo
    }
  };

  const loadPhotos = async () => {
    if (!vehicleId) return;
    
    try {
      console.log("Chargement des photos pour le véhicule:", vehicleId);
      const { data, error } = await PhotoService.getVehiclePhotos(vehicleId);
      if (error) {
        console.error("Erreur lors du chargement des photos:", error);
        setPhotos([]);
      } else {
        console.log("Photos chargées:", data);
        setPhotos(data || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des photos:", error);
      setPhotos([]);
    }
  };

  const loadOwnerProfile = async () => {
    try {
      const { data, error } = await ProfileService.getCurrentUserProfile();
      if (error) {
        console.error("Erreur lors du chargement du profil propriétaire:", error);
      } else {
        setOwnerProfile(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du profil propriétaire:", error);
    }
  };

  const handlePhotoUpload = async (files: FileList) => {
    if (!vehicleId || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadPromises = Array.from(files).map((file, index) => 
        PhotoService.uploadPhoto({
          file,
          vehicleId,
          photoType: 'exterior',
          position: photos.length + index + 1
        })
      );

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => !result.error);
      const errors = results.filter(result => result.error).map(result => result.error);

      if (successfulUploads.length > 0) {
        toast({
          title: "Succès",
          description: `${successfulUploads.length} photo(s) uploadée(s) avec succès`,
        });
        loadPhotos(); // Recharger les photos
        
        // Mettre à jour l'image_url du véhicule si c'est la première photo
        if (photos.length === 0 && successfulUploads[0]) {
          try {
            await supabase
              .from('vehicles')
              .update({ image_url: successfulUploads[0].data?.url })
              .eq('id', vehicleId);
            console.log('Image principale mise à jour:', successfulUploads[0].data?.url);
          } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'image principale:', error);
          }
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Attention",
          description: `${errors.length} photo(s) n'ont pas pu être uploadées`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader les photos",
        variant: "destructive",
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Fonction pour déclencher la sélection de fichiers
  const triggerFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handlePhotoUpload(files);
      }
    };
    input.click();
  };

  const ensureListingOwnerRecord = async (): Promise<string | null> => {
    if (!vehicleId) return null;

    const displayName = formData.listingOwnerDisplayName.trim();
    if (!displayName) return null;

    const existingId = formData.listingOwnerId?.trim();
    if (existingId) return existingId;

    const { listingOwnerId, error } = await ListingOwnersService.syncForVehicle(vehicleId, {
      displayName,
      avatarUrl: formData.listingOwnerAvatarUrl,
      ownerType: formData.listingOwnerType,
      existingListingOwnerId: null,
    });

    if (error || !listingOwnerId) {
      throw new Error(error || "Impossible de créer le propriétaire affiché");
    }

    setFormData((prev) => ({ ...prev, listingOwnerId }));
    return listingOwnerId;
  };

  const handleListingOwnerAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !vehicleId) return;
    event.target.value = "";

    if (!formData.listingOwnerDisplayName.trim()) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "listingOwner.toasts.nameRequired",
          "Renseignez d'abord le nom affiché avant d'ajouter une photo."
        ),
        variant: "destructive",
      });
      return;
    }

    setUploadingListingOwnerAvatar(true);
    try {
      const listingOwnerId = await ensureListingOwnerRecord();
      if (!listingOwnerId) {
        throw new Error("Impossible de préparer le propriétaire affiché");
      }

      const { url, error: uploadError } = await ListingOwnerAvatarsService.uploadAvatar(
        listingOwnerId,
        file
      );

      if (uploadError || !url) {
        throw new Error(uploadError || "Upload impossible");
      }

      const { error: updateError } = await ListingOwnersService.update(listingOwnerId, {
        avatar_url: url,
      });

      if (updateError) {
        throw new Error(updateError);
      }

      setFormData((prev) => ({
        ...prev,
        listingOwnerId,
        listingOwnerAvatarUrl: url,
      }));
      setHasChanges(true);

      toast({
        title: t("common.success", "Succès"),
        description: t(
          "listingOwner.toasts.uploadSuccess",
          "Photo du propriétaire enregistrée."
        ),
      });
    } catch (error) {
      console.error("Erreur upload avatar propriétaire:", error);
      toast({
        title: t("common.error", "Erreur"),
        description:
          error instanceof Error
            ? error.message
            : t(
                "listingOwner.toasts.uploadError",
                "Impossible d'uploader la photo du propriétaire."
              ),
        variant: "destructive",
      });
    } finally {
      setUploadingListingOwnerAvatar(false);
    }
  };

  const handleListingOwnerAvatarRemove = async () => {
    const listingOwnerId = formData.listingOwnerId?.trim();

    if (listingOwnerId) {
      const { error } = await ListingOwnersService.update(listingOwnerId, {
        avatar_url: null,
      });

      if (error) {
        toast({
          title: t("common.error", "Erreur"),
          description: error,
          variant: "destructive",
        });
        return;
      }
    }

    setFormData((prev) => ({ ...prev, listingOwnerAvatarUrl: "" }));
    setHasChanges(true);

    toast({
      title: t("common.success", "Succès"),
      description: t(
        "listingOwner.toasts.removeSuccess",
        "Photo du propriétaire supprimée."
      ),
    });
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    setDeletingPhoto(photoUrl);
    try {
      const { success, error } = await PhotoService.deletePhoto(photoUrl);
      if (success) {
        toast({
          title: "Succès",
          description: "Photo supprimée avec succès",
        });
        
        // Recharger les photos
        await loadPhotos();
        
        // Si c'était la première photo, mettre à jour l'image_url du véhicule
        if (photos.length > 0 && photos[0].url === photoUrl) {
          const remainingPhotos = photos.filter(p => p.url !== photoUrl);
          if (remainingPhotos.length > 0) {
            try {
              await supabase
                .from('vehicles')
                .update({ image_url: remainingPhotos[0].url })
                .eq('id', vehicleId);
              console.log('Image principale mise à jour après suppression:', remainingPhotos[0].url);
            } catch (error) {
              console.error('Erreur lors de la mise à jour de l\'image principale:', error);
            }
          } else {
            // Plus de photos, mettre image_url à null
            try {
              await supabase
                .from('vehicles')
                .update({ image_url: null })
                .eq('id', vehicleId);
              console.log('Image principale supprimée (plus de photos)');
            } catch (error) {
              console.error('Erreur lors de la suppression de l\'image principale:', error);
            }
          }
        }
      } else {
        toast({
          title: "Erreur",
          description: error || "Impossible de supprimer la photo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo",
        variant: "destructive",
      });
    } finally {
      setDeletingPhoto(null);
    }
  };

  // 🆕 FONCTION POUR GÉRER LA NAVIGATION AVEC PROTECTION DES MODIFICATIONS
  const handleNavigation = (navigationFunction: () => void) => {
    if (hasChanges) {
      // Il y a des modifications non sauvegardées
      setPendingNavigation(() => navigationFunction);
      setShowExitWarning(true);
    } else {
      // Pas de modifications, navigation directe
      navigationFunction();
    }
  };

  // 🆕 FONCTION POUR ABANDONNER LES MODIFICATIONS ET NAVIGUER
  const handleAbandonChanges = () => {
    setShowExitWarning(false);
    setPendingNavigation(null);
    if (pendingNavigation) {
      pendingNavigation();
    }
  };

  // 🆕 FONCTION POUR SAUVEGARDER AVANT DE NAVIGUER
  const handleSaveAndNavigate = async () => {
    setShowExitWarning(false);
    const navigationFunction = pendingNavigation;
    setPendingNavigation(null);
    
    // Appeler handleSave qui va gérer les configurations en attente
    const saveSuccess = await handleSave();
    
    // Si la sauvegarde a réussi, naviguer
    if (saveSuccess && navigationFunction) {
      navigationFunction();
    }
  };

  const handleSave = async (): Promise<boolean> => {
    console.log("🚀 DÉBUT DE LA SAUVEGARDE");
    console.log("📊 État actuel de pendingConfigurations:", pendingConfigurations);
    console.log("📊 État actuel de formData:", formData);
    
    if (!vehicle) {
      console.error("Aucun véhicule sélectionné");
      return false;
    }

    const isAccommodationListing = vehicleType === "accommodation";
    if (isAccommodationListing && formData.available && !formData.locationAreaId) {
      setValidationErrors((prev) => ({
        ...prev,
        locationAreaId: t(
          "locationArea.errors.required",
          "Le quartier est obligatoire pour un hébergement disponible."
        ),
      }));
      toast({
        title: t("locationArea.errors.requiredTitle", "Quartier requis"),
        description: t(
          "locationArea.errors.required",
          "Le quartier est obligatoire pour un hébergement disponible."
        ),
        variant: "destructive",
      });
      setActiveTab("listing");
      return false;
    }

    // 🆕 Vérifier s'il y a des configurations en attente
    console.log("🔍 Vérification des configurations en attente:", pendingConfigurations);
    
    // 🆕 Vérification supplémentaire : détecter automatiquement les configurations en attente
    const detectedPendingConfigurations: string[] = [];
    
    // Vérifier les services des zones de pickup
    if (formData.pickupZones?.includes('Aéroport') && formData.airportPickupService && !formData.airportPickupRetrieval && !formData.airportPickupReturn) {
      detectedPendingConfigurations.push('Aéroport');
    }
    if (formData.pickupZones?.includes('Barge Petite Terre') && formData.bargePetiteTerreService && !formData.bargePetiteTerreRetrieval && !formData.bargePetiteTerreReturn) {
      detectedPendingConfigurations.push('Barge Petite Terre');
    }
    if (formData.pickupZones?.includes('Barge Grande Terre') && formData.bargeGrandeTerreService && !formData.bargeGrandeTerreRetrieval && !formData.bargeGrandeTerreReturn) {
      detectedPendingConfigurations.push('Barge Grande Terre');
    }
    if (formData.homeDeliveryService && !formData.homeDeliveryPickup && !formData.homeDeliveryReturn) {
      detectedPendingConfigurations.push('Livraison à domicile');
    }
    
    console.log("🔍 Configurations détectées automatiquement:", detectedPendingConfigurations);
    
    // Utiliser la liste la plus complète
    const allPendingConfigurations = [...new Set([...pendingConfigurations, ...detectedPendingConfigurations])];
    console.log("🔍 Toutes les configurations en attente:", allPendingConfigurations);
    
    if (allPendingConfigurations.length > 0) {
      console.log("⚠️ Configurations en attente détectées, affichage de la modal d'alerte");
      setPendingConfigurations(allPendingConfigurations); // Mettre à jour l'état
      setShowPendingConfigAlert(true);
      return false; // Empêcher la sauvegarde
    }

    // 🆕 Vérifier que tous les services actifs sont correctement configurés
    const validationErrors: string[] = [];
    
    // Vérifier les services des zones de pickup
    if (formData.pickupZones?.includes('Aéroport')) {
      const validation = validateServiceConfiguration('Aéroport');
      if (!validation.isValid) {
        validationErrors.push(`Aéroport: ${validation.message}`);
      }
    }
    
    if (formData.pickupZones?.includes('Barge Petite Terre')) {
      const validation = validateServiceConfiguration('Barge Petite Terre');
      if (!validation.isValid) {
        validationErrors.push(`Barge Petite Terre: ${validation.message}`);
      }
    }
    
    if (formData.pickupZones?.includes('Barge Grande Terre')) {
      const validation = validateServiceConfiguration('Barge Grande Terre');
      if (!validation.isValid) {
        validationErrors.push(`Barge Grande Terre: ${validation.message}`);
      }
    }
    
    // Vérifier les services indépendants
    const homeValidation = validateServiceConfiguration('Livraison à domicile');
    if (!homeValidation.isValid) {
      validationErrors.push(`Livraison à domicile: ${homeValidation.message}`);
    }
    
    const babyValidation = validateServiceConfiguration('Siège bébé');
    if (!babyValidation.isValid) {
      validationErrors.push(`Siège bébé: ${babyValidation.message}`);
    }
    
    const driverValidation = validateServiceConfiguration('Conducteur additionnel');
    if (!driverValidation.isValid) {
      validationErrors.push(`Conducteur additionnel: ${driverValidation.message}`);
    }
    
      // Si il y a des erreurs de validation, afficher une alerte
      if (validationErrors.length > 0) {
        toast({
          title: "❌ Configuration incomplète",
          description: validationErrors.join('\n'),
          variant: "destructive",
          duration: 8000,
        });
        return false; // Empêcher la sauvegarde
      }

    console.log("Début de la sauvegarde pour le véhicule:", vehicle.id);
    console.log("Données du formulaire:", formData);

    setSaving(true);
    try {
      // Préparer les données de base (toujours présentes dans la DB)
      const yearValue = parseInt(formData.year, 10); // Base 10 explicite
      console.log("🔍 DEBUG - Conversion année dans handleSave:", { 
        formDataYear: formData.year, 
        yearValue, 
        type: typeof formData.year 
      });
      
      const agencyRaw = formData.pricePerDayAgency?.trim() ?? "";
      const agencyNum = agencyRaw ? parseFloat(agencyRaw) : NaN;
      const price_per_day_agency =
        !agencyRaw || Number.isNaN(agencyNum) || agencyNum <= 0 ? null : agencyNum;

      const baseUpdateData = {
        brand: formData.brand,
        model: formData.model,
        color: formData.color,
        year: yearValue, // ✅ Année correctement convertie
        mileage: parseInt(formData.mileage, 10),
        fuel_type: formData.fuel,
        transmission: formData.transmission,
        seats: parseInt(formData.seats),
        price_per_day: parseFloat(formData.pricePerDay),
        price_per_day_agency,
        description: formData.description,
        description_en: formData.descriptionEn?.trim() || null,
        description_de: formData.descriptionDe?.trim() || null,
        description_it: formData.descriptionIt?.trim() || null,
        location: formData.location,
        available: formData.available,
        listing_owner_phone: formData.listingOwnerPhone?.trim() || null,
      };

      // Préparer les données optionnelles (peuvent ne pas exister encore)
      const optionalUpdateData = {
        doors: parseInt(formData.doors) || undefined,
        status: formData.status as 'active' | 'inactive' | 'review',
      };

      // Préparer les données de remises (nouvelles colonnes) + caution
      // deposit_amount : vide/NaN/<0 → 1000 (aligné DEFAULT DB), sinon parseFloat
      const depositRaw = formData.depositAmount?.trim();
      const parsed = depositRaw ? parseFloat(depositRaw) : NaN;
      const depositAmount = (!depositRaw || isNaN(parsed) || parsed < 0) ? 1000 : parsed;
      const pricingUpdateData = {
        low_season_discount: parseFloat(formData.lowSeasonDiscount) || undefined,
        high_season_surcharge: parseFloat(formData.highSeasonSurcharge) || undefined,
        long_duration_discount_14: parseFloat(formData.longDurationDiscount14) || undefined,
        long_duration_discount_60: parseFloat(formData.longDurationDiscount60) || undefined,
        deposit_amount: depositAmount,
      };

      console.log("Données à envoyer à Supabase (base):", baseUpdateData);
      let result = await SupabaseVehiclesService.updateVehicle(vehicle.id, baseUpdateData);

      if (result.error) {
        console.error("Erreur lors de la sauvegarde des champs de base:", result.error);
        throw new Error(`Erreur lors de la sauvegarde: ${result.error}`);
      }

      console.log("Champs de base sauvegardés avec succès");

      // Essayer de sauvegarder les champs optionnels
      try {
        const optionalResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, optionalUpdateData);
        if (optionalResult.error) {
          console.warn("Certains champs optionnels n'ont pas pu être sauvegardés:", optionalResult.error);
        } else {
          console.log("Champs optionnels sauvegardés avec succès");
        }
      } catch (optionalError) {
        console.warn("Erreur lors de la sauvegarde des champs optionnels:", optionalError);
      }

      // Essayer de sauvegarder les champs de remises
      try {
        const pricingResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, pricingUpdateData);
        if (pricingResult.error) {
          console.warn("Les champs de remises n'ont pas pu être sauvegardés:", pricingResult.error);
          toast({
            title: "Attention",
            description: "Les informations de base ont été sauvegardées, mais les remises n'ont pas pu être mises à jour. Veuillez appliquer la migration SQL pour activer cette fonctionnalité.",
            variant: "destructive",
          });
        } else {
          console.log("Champs de remises sauvegardés avec succès");
        }
      } catch (pricingError) {
        console.warn("Erreur lors de la sauvegarde des remises:", pricingError);
        toast({
          title: "Attention", 
          description: "Les informations de base ont été sauvegardées, mais les remises n'ont pas pu être mises à jour.",
          variant: "destructive",
        });
      }

      // Sauvegarder les équipements hébergement (colonnes existantes en base)
      try {
        const accommodationAmenitiesData = {
          has_ac: formData.hasAC,
          has_pool: formData.hasPool,
          near_beach: formData.nearBeach,
          has_wifi: formData.hasWifi,
          has_private_bathroom: formData.hasPrivateBathroom,
          has_security_guard: formData.hasSecurityGuard,
          near_shopping_center: formData.nearShoppingCenter,
          near_nightlife: formData.nearNightlife,
          has_equipped_kitchen: formData.hasEquippedKitchen,
          has_solar_panel: formData.hasSolarPanel,
          has_housekeeper: formData.hasHousekeeper,
          has_laundry: formData.hasLaundry,
          has_remote_work: formData.hasRemoteWork,
          has_canal_plus: formData.hasCanalPlus,
        };

        const amenitiesResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, accommodationAmenitiesData);
        if (amenitiesResult.error) {
          console.warn("Les équipements hébergement n'ont pas pu être sauvegardés:", amenitiesResult.error);
        } else {
          console.log("Équipements hébergement sauvegardés avec succès");
        }
      } catch (amenitiesError) {
        console.warn("Erreur lors de la sauvegarde des équipements hébergement:", amenitiesError);
      }

      // 🆕 Sauvegarder les zones de pick-up et conditions de réservation
      try {
        const bookingUpdateData = {
          pickup_zones: formData.pickupZones,
          location_area_id: formData.locationAreaId || null,
          min_advance_hours: parseInt(formData.minAdvanceHours) || undefined,
          min_rental_days: parseInt(formData.minRentalDays) || undefined,
          max_rental_days: formData.maxRentalDays ? parseInt(formData.maxRentalDays) : undefined,
        };

        const bookingResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, bookingUpdateData);
        if (bookingResult.error) {
          console.warn("Les conditions de réservation n'ont pas pu être sauvegardées:", bookingResult.error);
        } else {
          console.log("Conditions de réservation sauvegardées avec succès");
        }
      } catch (bookingError) {
        console.warn("Erreur lors de la sauvegarde des conditions de réservation:", bookingError);
      }

      // 🆕 Sauvegarder les services aéroport
      try {
        const airportUpdateData = {
          airport_pickup_service: formData.airportPickupService || null,
          airport_pickup_retrieval: formData.airportPickupRetrieval || null,
          airport_pickup_return: formData.airportPickupReturn || null,
          airport_pickup_retrieval_free: formData.airportPickupRetrievalFree ?? null,
          airport_pickup_retrieval_price: formData.airportPickupRetrievalPrice ? parseFloat(formData.airportPickupRetrievalPrice) : null,
          airport_pickup_return_free: formData.airportPickupReturnFree ?? null,
          airport_pickup_return_price: formData.airportPickupReturnPrice ? parseFloat(formData.airportPickupReturnPrice) : null,
        };

        const airportResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, airportUpdateData);
        if (airportResult.error) {
          console.warn("Les services aéroport n'ont pas pu être sauvegardés:", airportResult.error);
        } else {
          console.log("Services aéroport sauvegardés avec succès");
        }
      } catch (airportError) {
        console.warn("Erreur lors de la sauvegarde des services aéroport:", airportError);
      }

      // 🆕 Sauvegarder les services barge Petite Terre
      try {
        const bargePetiteTerreUpdateData = {
          barge_petite_terre_service: formData.bargePetiteTerreService || null,
          barge_petite_terre_retrieval: formData.bargePetiteTerreRetrieval || null,
          barge_petite_terre_return: formData.bargePetiteTerreReturn || null,
          barge_petite_terre_retrieval_free: formData.bargePetiteTerreRetrievalFree ?? null,
          barge_petite_terre_retrieval_price: formData.bargePetiteTerreRetrievalPrice ? parseFloat(formData.bargePetiteTerreRetrievalPrice) : null,
          barge_petite_terre_return_free: formData.bargePetiteTerreReturnFree ?? null,
          barge_petite_terre_return_price: formData.bargePetiteTerreReturnPrice ? parseFloat(formData.bargePetiteTerreReturnPrice) : null,
        };

        const bargePetiteTerreResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, bargePetiteTerreUpdateData);
        if (bargePetiteTerreResult.error) {
          console.warn("Les services barge Petite Terre n'ont pas pu être sauvegardés:", bargePetiteTerreResult.error);
        } else {
          console.log("Services barge Petite Terre sauvegardés avec succès");
        }
      } catch (bargePetiteTerreError) {
        console.warn("Erreur lors de la sauvegarde des services barge Petite Terre:", bargePetiteTerreError);
      }

      // 🆕 Sauvegarder les services barge Grande Terre
      try {
        const bargeGrandeTerreUpdateData = {
          barge_grande_terre_service: formData.bargeGrandeTerreService || null,
          barge_grande_terre_retrieval: formData.bargeGrandeTerreRetrieval || null,
          barge_grande_terre_return: formData.bargeGrandeTerreReturn || null,
          barge_grande_terre_retrieval_free: formData.bargeGrandeTerreRetrievalFree ?? null,
          barge_grande_terre_retrieval_price: formData.bargeGrandeTerreRetrievalPrice ? parseFloat(formData.bargeGrandeTerreRetrievalPrice) : null,
          barge_grande_terre_return_free: formData.bargeGrandeTerreReturnFree ?? null,
          barge_grande_terre_return_price: formData.bargeGrandeTerreReturnPrice ? parseFloat(formData.bargeGrandeTerreReturnPrice) : null,
        };

        const bargeGrandeTerreResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, bargeGrandeTerreUpdateData);
        if (bargeGrandeTerreResult.error) {
          console.warn("Les services barge Grande Terre n'ont pas pu être sauvegardés:", bargeGrandeTerreResult.error);
        } else {
          console.log("Services barge Grande Terre sauvegardés avec succès");
        }
      } catch (bargeGrandeTerreError) {
        console.warn("Erreur lors de la sauvegarde des services barge Grande Terre:", bargeGrandeTerreError);
      }

      // 🆕 Sauvegarder les services livraison à domicile
      try {
        const homeDeliveryUpdateData = {
          home_delivery_service: formData.homeDeliveryService || null,
          home_delivery_pickup: formData.homeDeliveryPickup || null,
          home_delivery_return: formData.homeDeliveryReturn || null,
          home_delivery_pickup_free: formData.homeDeliveryPickupFree ?? null,
          home_delivery_pickup_price: formData.homeDeliveryPickupPrice ? parseFloat(formData.homeDeliveryPickupPrice) : null,
          home_delivery_return_free: formData.homeDeliveryReturnFree ?? null,
          home_delivery_return_price: formData.homeDeliveryReturnPrice ? parseFloat(formData.homeDeliveryReturnPrice) : null,
        };

        const homeDeliveryResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, homeDeliveryUpdateData);
        if (homeDeliveryResult.error) {
          console.warn("Les services livraison à domicile n'ont pas pu être sauvegardés:", homeDeliveryResult.error);
        } else {
          console.log("Services livraison à domicile sauvegardés avec succès");
        }
      } catch (homeDeliveryError) {
        console.warn("Erreur lors de la sauvegarde des services livraison à domicile:", homeDeliveryError);
      }

      // 🆕 Sauvegarder les services siège bébé et conducteur additionnel
      try {
        const additionalServicesUpdateData = {
          baby_seat_service: formData.babySeatService || null,
          baby_seat_free: formData.babySeatFree ?? null,
          baby_seat_price: formData.babySeatPrice ? parseFloat(formData.babySeatPrice) : null,
          additional_driver_service: formData.additionalDriverService || null,
          additional_driver_free: formData.additionalDriverFree ?? null,
          additional_driver_price: formData.additionalDriverPrice ? parseFloat(formData.additionalDriverPrice) : null,
        };

        const additionalServicesResult = await SupabaseVehiclesService.updateVehicle(vehicle.id, additionalServicesUpdateData);
        if (additionalServicesResult.error) {
          console.warn("Les services additionnels n'ont pas pu être sauvegardés:", additionalServicesResult.error);
        } else {
          console.log("Services additionnels sauvegardés avec succès");
        }
      } catch (additionalServicesError) {
        console.warn("Erreur lors de la sauvegarde des services additionnels:", additionalServicesError);
      }

      const { listingOwnerId, error: listingOwnerError } =
        await ListingOwnersService.syncForVehicle(vehicle.id, {
          displayName: formData.listingOwnerDisplayName,
          avatarUrl: formData.listingOwnerAvatarUrl,
          ownerType: formData.listingOwnerType,
          existingListingOwnerId: formData.listingOwnerId?.trim() || null,
        });

      if (listingOwnerError) {
        throw new Error(listingOwnerError);
      }

      setFormData((prev) => ({
        ...prev,
        listingOwnerId: listingOwnerId || "",
      }));

      console.log("Sauvegarde terminée");

      console.log("Sauvegarde réussie!");
      setHasChanges(false); // Marquer qu'il n'y a plus de changements
      toast({
        title: "Succès",
        description: "Véhicule mis à jour avec succès",
      });

      // ✅ Sauvegarde réussie - pas de redirection, l'utilisateur reste sur la page
    } catch (error) {
      console.error("Erreur détaillée lors de la sauvegarde:", error);
      console.error("Type d'erreur:", typeof error);
      console.error("Message d'erreur:", error instanceof Error ? error.message : String(error));
      
      toast({
        title: "Erreur",
        description: `Impossible de sauvegarder les modifications: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
    
    return true; // Sauvegarde réussie
  };

  const getStatusBadge = (available: boolean) => {
    if (available) {
      return <Badge className="bg-green-500 text-white">Actif</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">Inactif</Badge>;
    }
  };

  if (loading) {
    return (
      <>
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!vehicle) {
    return (
      <>
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Véhicule non trouvé</h1>
            <Button onClick={() => handleNavigation(() => navigate("/me/owner/vehicles"))}>
              Retour à mes véhicules
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const pricing = calculatePricing();

  return (
    <>
      <div
        className={`container mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-20 sm:pt-24 max-w-6xl sm:pb-8 ${
          activeTab === "preview" && previewMode ? "pb-44" : "pb-28"
        }`}
      >
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigation(() => navigate("/me/owner/vehicles"))}
                className="hover:bg-gray-100 shrink-0 mt-0.5"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                  Gérer {vehicle.brand} {vehicle.model}
                </h1>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 mt-2">
                  <p className="text-sm sm:text-base text-gray-600 truncate">ID: {vehicle.license}</p>
                  <Badge variant="outline" className="text-xs w-fit">
                    <Clock className="h-3 w-3 mr-1 shrink-0" />
                    Mis à jour le {new Date(vehicle.updatedAt).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0 pl-11 sm:pl-0">
              {getStatusBadge(formData.available)}
              <Button
                variant="outline"
                onClick={togglePreviewMode}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                {previewMode ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
                <span className="truncate">{previewMode ? "Masquer l'aperçu" : "Aperçu"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Alert pour les modifications non sauvegardées */}
        {hasChanges && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Vous avez des modifications non sauvegardées. N'oubliez pas de sauvegarder vos changements.
            </AlertDescription>
          </Alert>
        )}

        {/* Contenu principal avec tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="-mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto manage-vehicle-tabs-scroll">
            <TabsList
              className={`inline-flex h-auto min-w-full w-max sm:w-full sm:grid gap-1 ${
                previewMode ? "sm:grid-cols-6" : "sm:grid-cols-5"
              } bg-gray-100 p-1 rounded-lg`}
            >
              <TabsTrigger
                value="vehicle-info"
                className="relative shrink-0 sm:shrink transition-all duration-300 ease-in-out hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
              >
                <span className="sm:hidden">Infos</span>
                <span className="hidden sm:inline">Informations véhicule</span>
              </TabsTrigger>
              <TabsTrigger
                value="listing"
                className="relative shrink-0 sm:shrink transition-all duration-300 ease-in-out hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
              >
                Annonce
              </TabsTrigger>
              <TabsTrigger
                value="listing-owner"
                className="relative shrink-0 sm:shrink transition-all duration-300 ease-in-out hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
              >
                <span className="sm:hidden">{t("listingOwner.tabShort", "Proprio")}</span>
                <span className="hidden sm:inline">{t("listingOwner.tab", "Propriétaire")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="relative shrink-0 sm:shrink transition-all duration-300 ease-in-out hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="sm:hidden">Tarifs</span>
                  <span className="hidden sm:inline">Tarifs & conditions</span>
                  {pendingConfigurations.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="bg-orange-500 text-white text-xs px-1.5 py-0 sm:px-2 animate-pulse border-0 shrink-0"
                    >
                      {pendingConfigurations.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="relative shrink-0 sm:shrink transition-all duration-300 ease-in-out hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
              >
                Photos
              </TabsTrigger>
              {previewMode && (
                <TabsTrigger
                  value="preview"
                  className="relative shrink-0 sm:shrink transition-all duration-300 ease-in-out hover:bg-white data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium"
                >
                  Aperçu
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Informations véhicule - Lecture seule */}
          {/* 🆕 REFACTO - Composant extrait pour meilleure modularité */}
          <TabsContent value="vehicle-info">
            <VehicleBasicInfoTab formData={formData} />
          </TabsContent>

          {/* Annonce - Champs modifiables */}
          <TabsContent value="listing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Annonce
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Modifiez les informations de votre annonce qui seront visibles par les locataires.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Description multilingue */}
              <DescriptionTranslationBlock
                valueFr={formData.description}
                valueEn={formData.descriptionEn}
                valueDe={formData.descriptionDe}
                valueIt={formData.descriptionIt}
                onChangeFr={(v) => handleInputChange("description", v)}
                onChangeEn={(v) => handleInputChange("descriptionEn", v)}
                onChangeDe={(v) => handleInputChange("descriptionDe", v)}
                onChangeIt={(v) => handleInputChange("descriptionIt", v)}
              />

                  <LocationAreaSelect
                    value={formData.locationAreaId}
                    onChange={(id) => handleInputChange("locationAreaId", id)}
                    required={vehicleType === "accommodation" && formData.available}
                  />
                  {validationErrors.locationAreaId && (
                    <p className="text-xs text-red-500">{validationErrors.locationAreaId}</p>
                  )}

                  {/* 🆕 VILLE PAR DÉFAUT DU PROPRIÉTAIRE */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Ville par défaut
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Label>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">
                        {ownerProfile?.city || "Ville non renseignée"}
                      </span>
                    </div>
                  </div>

                  {/* 🆕 ZONES DE PRISE EN CHARGE */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      Zones de prise en charge
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Label>
                    
                    {formData.pickupZones && formData.pickupZones.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {formData.pickupZones.map((zone, index) => (
                            <div key={index} className="flex items-center justify-between gap-2 p-2 bg-green-50 border border-green-200 rounded-lg transition-all duration-200 ease-in-out hover:bg-green-100 hover:border-green-300 hover:shadow-sm min-w-0">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-900">{zone}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePickupZone(zone)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 transition-all duration-200 ease-in-out hover:scale-110 hover:rotate-3 hover:shadow-md"
                              >
                                <Trash2 className="h-3 w-3 transition-transform duration-200 hover:scale-125" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        {/* Bouton pour ajouter plus de zones */}
                        {formData.pickupZones.length < 20 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPickupZonesModalOpen(true)}
                            className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-green-300 hover:text-green-700 group"
                          >
                            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                            Ajouter une zone
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="text-sm text-gray-600">
                            Aucune zone de prise en charge configurée
                          </span>
                        </div>
                        
                        {/* Bouton pour ajouter la première zone */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPickupZonesModalOpen(true)}
                          className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:border-green-300 hover:text-green-700 group"
                        >
                          <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                          Ajouter une zone de prise en charge
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability" className="flex items-center gap-2">
                      Disponibilité
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="availability"
                        checked={formData.available}
                        onCheckedChange={handleAvailabilityChange}
                      />
                      <Label htmlFor="availability" className={`text-sm ${formData.available ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.available ? 'Disponible à la location' : 'Non disponible'}
                      </Label>
                    </div>
                  </div>

                  {vehicleType === "accommodation" && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        Équipements hébergement
                      </Label>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Wind className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Climatisation</span>
                          </div>
                          <Switch
                            id="hasAC"
                            checked={formData.hasAC}
                            onCheckedChange={(v) => handleInputChange("hasAC", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Waves className="h-4 w-4 text-cyan-500" />
                            <span className="text-sm font-medium">Piscine</span>
                          </div>
                          <Switch
                            id="hasPool"
                            checked={formData.hasPool}
                            onCheckedChange={(v) => handleInputChange("hasPool", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Umbrella className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">Proche de la mer</span>
                          </div>
                          <Switch
                            id="nearBeach"
                            checked={formData.nearBeach}
                            onCheckedChange={(v) => handleInputChange("nearBeach", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-violet-500" />
                            <span className="text-sm font-medium">WiFi</span>
                          </div>
                          <Switch
                            id="hasWifi"
                            checked={formData.hasWifi}
                            onCheckedChange={(v) => handleInputChange("hasWifi", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Bath className="h-4 w-4 text-teal-500" />
                            <span className="text-sm font-medium">Salle de bain privative</span>
                          </div>
                          <Switch
                            id="hasPrivateBathroom"
                            checked={formData.hasPrivateBathroom}
                            onCheckedChange={(v) => handleInputChange("hasPrivateBathroom", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium">Gardien sur place</span>
                          </div>
                          <Switch
                            id="hasSecurityGuard"
                            checked={formData.hasSecurityGuard}
                            onCheckedChange={(v) => handleInputChange("hasSecurityGuard", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-medium">Proche centre commercial</span>
                          </div>
                          <Switch
                            id="nearShoppingCenter"
                            checked={formData.nearShoppingCenter}
                            onCheckedChange={(v) => handleInputChange("nearShoppingCenter", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4 text-rose-500" />
                            <span className="text-sm font-medium">Proche activités nocturnes</span>
                          </div>
                          <Switch
                            id="nearNightlife"
                            checked={formData.nearNightlife}
                            onCheckedChange={(v) => handleInputChange("nearNightlife", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium">Cuisine équipée</span>
                          </div>
                          <Switch
                            id="hasEquippedKitchen"
                            checked={formData.hasEquippedKitchen}
                            onCheckedChange={(v) => handleInputChange("hasEquippedKitchen", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">Panneau solaire</span>
                          </div>
                          <Switch
                            id="hasSolarPanel"
                            checked={formData.hasSolarPanel}
                            onCheckedChange={(v) => handleInputChange("hasSolarPanel", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-fuchsia-500" />
                            <span className="text-sm font-medium">Femme de ménage</span>
                          </div>
                          <Switch
                            id="hasHousekeeper"
                            checked={formData.hasHousekeeper}
                            onCheckedChange={(v) => handleInputChange("hasHousekeeper", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Shirt className="h-4 w-4 text-sky-500" />
                            <span className="text-sm font-medium">Blanchisserie</span>
                          </div>
                          <Switch
                            id="hasLaundry"
                            checked={formData.hasLaundry}
                            onCheckedChange={(v) => handleInputChange("hasLaundry", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium">Télétravail possible</span>
                          </div>
                          <Switch
                            id="hasRemoteWork"
                            checked={formData.hasRemoteWork}
                            onCheckedChange={(v) => handleInputChange("hasRemoteWork", v)}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Tv className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">Canal+</span>
                          </div>
                          <Switch
                            id="hasCanalPlus"
                            checked={formData.hasCanalPlus}
                            onCheckedChange={(v) => handleInputChange("hasCanalPlus", v)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* 🆕 MODAL POUR SÉLECTIONNER LES ZONES DE PICK-UP */}
            <PickupZonesModal
              selectedZones={formData.pickupZones}
              onZonesChange={(zones) => handleInputChange('pickupZones', zones)}
              open={isPickupZonesModalOpen}
              onOpenChange={setIsPickupZonesModalOpen}
            />

            {/* 🆕 MODAL DE CONFIRMATION POUR SUPPRIMER UNE ZONE - VERSION PERSONNALISÉE */}
            {showDeleteZoneDialog && (
              <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => {
                  setShowDeleteZoneDialog(false);
                  setZoneToDelete(null);
                }}
              >
                <div 
                  className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-semibold">Supprimer la zone de prise en charge</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Êtes-vous sûr de vouloir supprimer la zone <strong>"{zoneToDelete}"</strong> ?
                    <br />
                    <br />
                    Cette action supprimera définitivement cette zone de prise en charge de votre véhicule.
                    Les futurs locataires ne pourront plus choisir cette zone.
                  </p>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                    <Button
                      onClick={confirmDeleteZone}
                      className="bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md hover:border-gray-400 group"
                    >
                      <Trash2 className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                      Supprimer la zone
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDeleteZoneDialog(false);
                        setZoneToDelete(null);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:bg-red-700 group"
                    >
                      <span className="transition-transform duration-200 group-hover:scale-105">Annuler</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 🆕 MODAL DE CONFIGURATION DE SERVICE - VERSION FIXE CENTRÉE */}
            {showServiceConfigDialog && serviceZoneToConfig && (
              <div 
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
              >
                <div 
                  className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-md">
                      {serviceZoneToConfig === 'Aéroport' && <Plane className="h-6 w-6 text-primary" />}
                      {serviceZoneToConfig === 'Barge Petite Terre' && <Ship className="h-6 w-6 text-green-600" />}
                      {serviceZoneToConfig === 'Barge Grande Terre' && <Ship className="h-6 w-6 text-blue-600" />}
                      {serviceZoneToConfig === 'Livraison à domicile' && <Home className="h-6 w-6 text-purple-600" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Zone "{serviceZoneToConfig}" ajoutée !</h3>
                      <p className="text-sm text-gray-500">
                        {pendingServiceZones.length > 1 && `(${pendingServiceZones.length} zones à configurer)`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-blue-900">
                          Cette zone dispose de <strong>services optionnels</strong> que vous pouvez configurer :
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                          <li>Choix retrait/restitution du véhicule</li>
                          <li>Tarification : gratuit ou payant</li>
                          <li>Prix personnalisés pour chaque service</li>
                        </ul>
                        <p className="text-sm font-semibold text-blue-900 mt-3">
                          💡 Souhaitez-vous configurer ces options maintenant ?
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <Button
                      onClick={handleConfigureLater}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md group"
                    >
                      <Clock className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                      Configurer plus tard
                    </Button>
                    <Button
                      onClick={handleConfigureNow}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg group"
                    >
                      <Settings className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                      Configurer maintenant
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 🆕 MODAL D'ALERTE POUR CONFIGURATIONS EN ATTENTE LORS DE LA SAUVEGARDE */}
            {showPendingConfigAlert && (
              <div 
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                onClick={() => setShowPendingConfigAlert(false)}
              >
                <div 
                  className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-md">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">⚠️ Configurations en attente</h3>
                      <p className="text-sm text-gray-500">
                        {pendingConfigurations.length} service{pendingConfigurations.length > 1 ? 's' : ''} non configuré{pendingConfigurations.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-orange-900">
                          <strong>Impossible de sauvegarder</strong> tant que vos services ne sont pas configurés :
                        </p>
                        <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                          {pendingConfigurations.map((service, index) => (
                            <li key={index}><strong>{service}</strong></li>
                          ))}
                        </ul>
                        <p className="text-sm font-semibold text-orange-900 mt-3">
                          💡 Que souhaitez-vous faire ?
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <Button
                      onClick={handleCancelSave}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md group"
                    >
                      <X className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                      Annuler la sauvegarde
                    </Button>
                    <Button
                      onClick={handleConfigurePendingNow}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg group"
                    >
                      <Settings className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                      Configurer maintenant
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 🆕 MODAL D'AVERTISSEMENT DE SORTIE SANS SAUVEGARDE */}
            {showExitWarning && (
              <div 
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                onClick={() => setShowExitWarning(false)}
              >
                <div 
                  className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-md">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">⚠️ Modifications non sauvegardées</h3>
                      <p className="text-sm text-gray-500">Vous vous apprêtez à quitter cette page</p>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-900">
                          <strong>Attention !</strong> Vous avez des modifications non sauvegardées.
                        </p>
                        <p className="text-sm text-red-800">
                          Si vous quittez maintenant, toutes vos modifications seront perdues et ne seront pas enregistrées.
                        </p>
                        <p className="text-sm font-semibold text-red-900 mt-3">
                          💡 Que souhaitez-vous faire ?
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <Button
                      onClick={handleAbandonChanges}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md group"
                    >
                      <X className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                      Abandonner et quitter
                    </Button>
                    <Button
                      onClick={handleSaveAndNavigate}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg group"
                    >
                      <Save className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                      Sauvegarder avant de quitter
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Propriétaire affiché */}
          <TabsContent value="listing-owner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {t("listingOwner.tab", "Propriétaire")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "listingOwner.intro",
                    "Identité affichée publiquement sur la fiche. Laissez vide pour utiliser le profil du compte gestionnaire."
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="listingOwnerDisplayName">
                    {t("listingOwner.displayName", "Nom affiché")}
                  </Label>
                  <Input
                    id="listingOwnerDisplayName"
                    value={formData.listingOwnerDisplayName}
                    onChange={(e) => handleInputChange("listingOwnerDisplayName", e.target.value)}
                    placeholder={t(
                      "listingOwner.displayNamePlaceholder",
                      "Ex. Résidence Ambatoloaka, Jean Dupont…"
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="listingOwnerAvatar">
                    {t("listingOwner.photo", "Logo ou photo du propriétaire")}
                  </Label>

                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-primary-soft/30">
                      <AvatarImage
                        src={formData.listingOwnerAvatarUrl || undefined}
                        alt={formData.listingOwnerDisplayName || ""}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                        {formData.listingOwnerDisplayName.trim().charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <Input
                        ref={listingOwnerAvatarInputRef}
                        id="listingOwnerAvatar"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleListingOwnerAvatarUpload}
                        className="hidden"
                        disabled={uploadingListingOwnerAvatar}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingListingOwnerAvatar}
                          onClick={() => listingOwnerAvatarInputRef.current?.click()}
                        >
                          {uploadingListingOwnerAvatar ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t("listingOwner.uploading", "Upload en cours…")}
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              {t("listingOwner.chooseFile", "Choisir un fichier")}
                            </>
                          )}
                        </Button>
                        {formData.listingOwnerAvatarUrl.trim() && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingListingOwnerAvatar}
                            onClick={handleListingOwnerAvatarRemove}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("listingOwner.removePhoto", "Supprimer")}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "listingOwner.photoHelper",
                          "Formats acceptés : JPG, PNG, WebP. Taille max : 5 Mo"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listingOwnerType">
                    {t("listingOwner.ownerType", "Type de propriétaire")}
                  </Label>
                  <Select
                    value={formData.listingOwnerType}
                    onValueChange={(value) =>
                      handleInputChange(
                        "listingOwnerType",
                        value as typeof formData.listingOwnerType
                      )
                    }
                  >
                    <SelectTrigger id="listingOwnerType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        {t("listingOwner.types.individual", "Particulier")}
                      </SelectItem>
                      <SelectItem value="agency">
                        {t("listingOwner.types.agency", "Agence")}
                      </SelectItem>
                      <SelectItem value="residence">
                        {t("listingOwner.types.residence", "Résidence / hébergement")}
                      </SelectItem>
                      <SelectItem value="platform_managed">
                        {t("listingOwner.types.platformManaged", "Géré par la plateforme")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Téléphone du propriétaire — admin uniquement, jamais affiché aux clients */}
                <div className="space-y-2 rounded-lg border border-dashed border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4">
                  <Label htmlFor="listingOwnerPhone" className="flex items-center gap-2 text-orange-800 dark:text-orange-300 font-semibold">
                    🔒 Téléphone du propriétaire (usage interne)
                  </Label>
                  <Input
                    id="listingOwnerPhone"
                    type="tel"
                    value={formData.listingOwnerPhone}
                    onChange={(e) => handleInputChange("listingOwnerPhone", e.target.value)}
                    placeholder="Ex. +261 34 12 345 67"
                  />
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    Ce numéro est visible uniquement dans cet écran de gestion. Il n'est jamais affiché aux clients.
                  </p>
                </div>

                {formData.listingOwnerDisplayName.trim() && (
                  <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={formData.listingOwnerAvatarUrl || undefined} alt="" />
                      <AvatarFallback>
                        {formData.listingOwnerDisplayName.trim().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{formData.listingOwnerDisplayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("listingOwner.previewHint", "Aperçu du propriétaire affiché")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tarifs */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Tarifs & conditions
              </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configurez vos tarifs de location et les conditions.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 🆕 INDICATEUR DE CONFIGURATIONS EN ATTENTE */}
                {pendingConfigurations.length > 0 && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <strong>⚠️ Configurations en attente :</strong>
                          <span className="ml-0 sm:ml-2 block sm:inline mt-1 sm:mt-0">{pendingConfigurations.length} service{pendingConfigurations.length > 1 ? 's' : ''} à configurer</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-700 border-orange-300 hover:bg-orange-100 w-full sm:w-auto shrink-0"
                          onClick={() => {
                            setActiveTab('pricing');
                            setTimeout(() => {
                              const firstPendingZone = pendingConfigurations[0];
                              let targetRef = null;
                              
                              switch (firstPendingZone) {
                                case 'Aéroport': targetRef = airportServiceRef; break;
                                case 'Barge Petite Terre': targetRef = bargePetiteTerreServiceRef; break;
                                case 'Barge Grande Terre': targetRef = bargeGrandeTerreServiceRef; break;
                                case 'Livraison à domicile': targetRef = homeDeliveryServiceRef; break;
                                case 'Siège bébé': targetRef = babySeatServiceRef; break;
                                case 'Conducteur additionnel': targetRef = additionalDriverServiceRef; break;
                              }
                              
                              if (targetRef && targetRef.current) {
                                targetRef.current.scrollIntoView({ 
                                  behavior: 'smooth', 
                                  block: 'center' 
                                });
                              }
                            }, 100);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurer maintenant
                        </Button>
                      </div>
                      <div className="mt-2 text-sm">
                        Services reportés : <strong>{pendingConfigurations.join(', ')}</strong>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                {/* Prix de base */}
                <OwnerDualCurrencyInput
                  id="pricePerDay"
                  label="Prix journalier de base"
                  valueMga={formData.pricePerDay}
                  onChangeMga={(value) => handleInputChange("pricePerDay", value)}
                  required
                  minMga={1000}
                  showValidIcon
                  error={validationErrors.pricePerDay}
                  arPlaceholder="50000"
                  eurPlaceholder="10"
                />

                {/* Tarif agence (réservations passées en agence / admin) */}
                <OwnerDualCurrencyInput
                  id="pricePerDayAgency"
                  label="Tarif journalier agence"
                  valueMga={formData.pricePerDayAgency}
                  onChangeMga={(value) => handleInputChange("pricePerDayAgency", value)}
                  allowEmpty
                  minMga={1000}
                  showValidIcon
                  error={validationErrors.pricePerDayAgency}
                  arPlaceholder="40000"
                  eurPlaceholder="8"
                  hint="Utilisé pour les locations en agence (sans commission locataire de 15 % sur ce tarif). Laissez vide si identique au tarif internet ou non applicable."
                />

                {/* Montant caution */}
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Montant caution (€)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => handleInputChange("depositAmount", e.target.value)}
                    placeholder="1000"
                    min="0"
                    step="1"
                    className={validationErrors.depositAmount ? "border-red-500 focus:border-red-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground">Empreinte bancaire : 0€ = pas de caution.</p>
                  {validationErrors.depositAmount && (
                    <p className="text-xs text-red-500">{validationErrors.depositAmount}</p>
                  )}
                </div>

                {/* Remises et suppléments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Réductions et suppléments</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lowSeasonDiscount">Remise basse saison (%)</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id="lowSeasonDiscount"
                          type="number"
                          value={formData.lowSeasonDiscount}
                          onChange={(e) => handleInputChange("lowSeasonDiscount", e.target.value)}
                          placeholder="10"
                          min="0"
                          max="100"
                          step="0.1"
                          className="flex-1"
                        />
                        <span className="text-sm text-green-600 font-medium">
                        <DualPrice amountMga={Math.round(pricing.lowSeasonPrice)} variant="admin" inline className="text-sm text-green-600 font-medium" />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="highSeasonSurcharge">Supplément haute saison (%)</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id="highSeasonSurcharge"
                          type="number"
                          value={formData.highSeasonSurcharge}
                          onChange={(e) => handleInputChange("highSeasonSurcharge", e.target.value)}
                          placeholder="20"
                          min="0"
                          max="100"
                          step="0.1"
                          className="flex-1"
                        />
                        <span className="text-sm text-orange-600 font-medium">
                        <DualPrice amountMga={Math.round(pricing.highSeasonPrice)} variant="admin" inline className="text-sm text-orange-600 font-medium" />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Suppléments</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="longDurationDiscount14">Remise 14+ jours (%)</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id="longDurationDiscount14"
                          type="number"
                          value={formData.longDurationDiscount14}
                          onChange={(e) => handleInputChange("longDurationDiscount14", e.target.value)}
                          placeholder="15"
                          min="0"
                          max="100"
                          step="0.1"
                          className="flex-1"
                        />
                        <span className="text-sm text-green-600 font-medium">
                        <DualPrice amountMga={Math.round(pricing.longDuration14Price)} variant="admin" inline className="text-sm text-blue-600 font-medium" />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="longDurationDiscount60">Remise 60+ jours (%)</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id="longDurationDiscount60"
                          type="number"
                          value={formData.longDurationDiscount60}
                          onChange={(e) => handleInputChange("longDurationDiscount60", e.target.value)}
                          placeholder="25"
                          min="0"
                          max="100"
                          step="0.1"
                          className="flex-1"
                        />
                        <span className="text-sm text-green-600 font-medium">
                        <DualPrice amountMga={Math.round(pricing.longDuration60Price)} variant="admin" inline className="text-sm text-purple-600 font-medium" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditions de location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Conditions de location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minAdvanceHours" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Délai de réservation (heures)
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Label>
                      <Input
                        id="minAdvanceHours"
                        type="number"
                        value={formData.minAdvanceHours}
                        onChange={(e) => handleInputChange('minAdvanceHours', e.target.value)}
                        placeholder="24"
                        min="1"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Heures minimum avant le début de location</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minRentalDays" className="flex items-center gap-2">
                        Durée minimum (jours)
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Label>
                      <Input
                        id="minRentalDays"
                        type="number"
                        value={formData.minRentalDays}
                        onChange={(e) => handleInputChange('minRentalDays', e.target.value)}
                        placeholder="1"
                        min="1"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxRentalDays" className="flex items-center gap-2">
                        Durée maximum (jours)
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Label>
                      <Input
                        id="maxRentalDays"
                        type="number"
                        value={formData.maxRentalDays}
                        onChange={(e) => handleInputChange('maxRentalDays', e.target.value)}
                        placeholder="30"
                        min="1"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 🆕 SERVICES SUPPLÉMENTAIRES */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Services supplémentaires</h3>
                  <p className="text-sm text-gray-600">Configurez vos services optionnels et leurs tarifs</p>

                  {/* Service Aéroport */}
                  {formData.pickupZones?.includes("Aéroport") && (
                    <Card ref={airportServiceRef} className={`bg-white rounded-lg border shadow-sm transition-all duration-300 ${
                      pendingConfigurations.includes('Aéroport') 
                        ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' 
                        : 'border-border'
                    }`}>
                      {/* Section 1: Dépôt / Restitution Aéroport */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-success/10 rounded-md">
                            <Plane className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">Dépôt / Restitution Aéroport</h4>
                              {pendingConfigurations.includes('Aéroport') && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 animate-pulse">
                                  ⚠️ À configurer
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Service de prise en charge et retour à l'aéroport</p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.airportPickupService}
                          onCheckedChange={(checked) => {
                            handleInputChange('airportPickupService', checked);
                            if (!checked) {
                              handleInputChange('airportPickupRetrieval', false);
                              handleInputChange('airportPickupReturn', false);
                            }
                          }}
                          className="data-[state=checked]:bg-success"
                        />
                      </div>

                      {/* Sous-services - visibles seulement si le service principal est activé */}
                      {formData.airportPickupService && (
                        <>
                          {/* Section 2: Retrait à l'aéroport */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8 border-b border-border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowDownToLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Retrait à l'aéroport</h4>
                                <p className="text-xs text-muted-foreground">Le client récupère le véhicule</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.airportPickupRetrieval}
                              onCheckedChange={(checked) => handleInputChange('airportPickupRetrieval', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Retrait */}
                          {formData.airportPickupRetrieval && (
                            <div className="p-4 pl-4 sm:pl-8 border-b border-border bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.airportPickupRetrievalFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('airportPickupRetrievalFree', true)}
                                  className={formData.airportPickupRetrievalFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.airportPickupRetrievalFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('airportPickupRetrievalFree', false)}
                                  className={!formData.airportPickupRetrievalFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.airportPickupRetrievalFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.airportPickupRetrievalPrice}
                                      onChange={(e) => handleInputChange('airportPickupRetrievalPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="25"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.airportPickupRetrievalFree && parseFloat(formData.airportPickupRetrievalPrice) > 25 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 25€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 3: Restitution à l'aéroport */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowUpFromLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Restitution à l'aéroport</h4>
                                <p className="text-xs text-muted-foreground">Le client dépose le véhicule</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.airportPickupReturn}
                              onCheckedChange={(checked) => handleInputChange('airportPickupReturn', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Restitution */}
                          {formData.airportPickupReturn && (
                            <div className="p-4 pl-4 sm:pl-8 bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.airportPickupReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('airportPickupReturnFree', true)}
                                  className={formData.airportPickupReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.airportPickupReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('airportPickupReturnFree', false)}
                                  className={!formData.airportPickupReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.airportPickupReturnFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.airportPickupReturnPrice}
                                      onChange={(e) => handleInputChange('airportPickupReturnPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="25"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.airportPickupReturnFree && parseFloat(formData.airportPickupReturnPrice) > 25 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 25€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  )}

                  {/* Service Barge Petite Terre */}
                  {formData.pickupZones?.includes("Barge Petite Terre") && (
                    <Card ref={bargePetiteTerreServiceRef} className={`bg-white rounded-lg border shadow-sm transition-all duration-300 ${
                      pendingConfigurations.includes('Barge Petite Terre') 
                        ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' 
                        : 'border-border'
                    }`}>
                      {/* Section 1: Dépôt / Restitution Barge Petite Terre */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-success/10 rounded-md">
                            <Ship className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">Dépôt / Restitution Barge Petite Terre</h4>
                              {pendingConfigurations.includes('Barge Petite Terre') && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 animate-pulse">
                                  ⚠️ À configurer
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Service de prise en charge et retour à la barge Petite Terre</p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.bargePetiteTerreService}
                          onCheckedChange={(checked) => {
                            handleInputChange('bargePetiteTerreService', checked);
                            if (!checked) {
                              handleInputChange('bargePetiteTerreRetrieval', false);
                              handleInputChange('bargePetiteTerreReturn', false);
                            }
                          }}
                          className="data-[state=checked]:bg-success"
                        />
                      </div>

                      {/* Sous-services - visibles seulement si le service principal est activé */}
                      {formData.bargePetiteTerreService && (
                        <>
                          {/* Section 2: Retrait à la barge Petite Terre */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8 border-b border-border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowDownToLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Retrait à la barge Petite Terre</h4>
                                <p className="text-xs text-muted-foreground">Le client récupère le véhicule</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.bargePetiteTerreRetrieval}
                              onCheckedChange={(checked) => handleInputChange('bargePetiteTerreRetrieval', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Retrait */}
                          {formData.bargePetiteTerreRetrieval && (
                            <div className="p-4 pl-4 sm:pl-8 border-b border-border bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.bargePetiteTerreRetrievalFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargePetiteTerreRetrievalFree', true)}
                                  className={formData.bargePetiteTerreRetrievalFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.bargePetiteTerreRetrievalFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargePetiteTerreRetrievalFree', false)}
                                  className={!formData.bargePetiteTerreRetrievalFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.bargePetiteTerreRetrievalFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.bargePetiteTerreRetrievalPrice}
                                      onChange={(e) => handleInputChange('bargePetiteTerreRetrievalPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="15"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.bargePetiteTerreRetrievalFree && parseFloat(formData.bargePetiteTerreRetrievalPrice) > 15 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 15€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 3: Restitution à la barge Petite Terre */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowUpFromLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Restitution à la barge Petite Terre</h4>
                                <p className="text-xs text-muted-foreground">Le client dépose le véhicule</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.bargePetiteTerreReturn}
                              onCheckedChange={(checked) => handleInputChange('bargePetiteTerreReturn', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Restitution */}
                          {formData.bargePetiteTerreReturn && (
                            <div className="p-4 pl-4 sm:pl-8 bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.bargePetiteTerreReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargePetiteTerreReturnFree', true)}
                                  className={formData.bargePetiteTerreReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.bargePetiteTerreReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargePetiteTerreReturnFree', false)}
                                  className={!formData.bargePetiteTerreReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.bargePetiteTerreReturnFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.bargePetiteTerreReturnPrice}
                                      onChange={(e) => handleInputChange('bargePetiteTerreReturnPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="15"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.bargePetiteTerreReturnFree && parseFloat(formData.bargePetiteTerreReturnPrice) > 15 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 15€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  )}

                  {/* Service Barge Grande Terre */}
                  {formData.pickupZones?.includes("Barge Grande Terre") && (
                    <Card ref={bargeGrandeTerreServiceRef} className={`bg-white rounded-lg border shadow-sm transition-all duration-300 ${
                      pendingConfigurations.includes('Barge Grande Terre') 
                        ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' 
                        : 'border-border'
                    }`}>
                      {/* Section 1: Dépôt / Restitution Barge Grande Terre */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-success/10 rounded-md">
                            <Ship className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">Dépôt / Restitution Barge Grande Terre</h4>
                              {pendingConfigurations.includes('Barge Grande Terre') && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 animate-pulse">
                                  ⚠️ À configurer
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Service de prise en charge et retour à la barge Grande Terre</p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.bargeGrandeTerreService}
                          onCheckedChange={(checked) => {
                            handleInputChange('bargeGrandeTerreService', checked);
                            if (!checked) {
                              handleInputChange('bargeGrandeTerreRetrieval', false);
                              handleInputChange('bargeGrandeTerreReturn', false);
                            }
                          }}
                          className="data-[state=checked]:bg-success"
                        />
                      </div>

                      {/* Sous-services - visibles seulement si le service principal est activé */}
                      {formData.bargeGrandeTerreService && (
                        <>
                          {/* Section 2: Retrait à la barge Grande Terre */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8 border-b border-border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowDownToLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Retrait à la barge Grande Terre</h4>
                                <p className="text-xs text-muted-foreground">Le client récupère le véhicule</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.bargeGrandeTerreRetrieval}
                              onCheckedChange={(checked) => handleInputChange('bargeGrandeTerreRetrieval', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Retrait */}
                          {formData.bargeGrandeTerreRetrieval && (
                            <div className="p-4 pl-4 sm:pl-8 border-b border-border bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.bargeGrandeTerreRetrievalFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargeGrandeTerreRetrievalFree', true)}
                                  className={formData.bargeGrandeTerreRetrievalFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.bargeGrandeTerreRetrievalFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargeGrandeTerreRetrievalFree', false)}
                                  className={!formData.bargeGrandeTerreRetrievalFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.bargeGrandeTerreRetrievalFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.bargeGrandeTerreRetrievalPrice}
                                      onChange={(e) => handleInputChange('bargeGrandeTerreRetrievalPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="15"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.bargeGrandeTerreRetrievalFree && parseFloat(formData.bargeGrandeTerreRetrievalPrice) > 15 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 15€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 3: Restitution à la barge Grande Terre */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowUpFromLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Restitution à la barge Grande Terre</h4>
                                <p className="text-xs text-muted-foreground">Le client dépose le véhicule</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.bargeGrandeTerreReturn}
                              onCheckedChange={(checked) => handleInputChange('bargeGrandeTerreReturn', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Restitution */}
                          {formData.bargeGrandeTerreReturn && (
                            <div className="p-4 pl-4 sm:pl-8 bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.bargeGrandeTerreReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargeGrandeTerreReturnFree', true)}
                                  className={formData.bargeGrandeTerreReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.bargeGrandeTerreReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('bargeGrandeTerreReturnFree', false)}
                                  className={!formData.bargeGrandeTerreReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.bargeGrandeTerreReturnFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.bargeGrandeTerreReturnPrice}
                                      onChange={(e) => handleInputChange('bargeGrandeTerreReturnPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="15"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.bargeGrandeTerreReturnFree && parseFloat(formData.bargeGrandeTerreReturnPrice) > 15 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 15€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  )}

                  {/* Service Livraison à domicile */}
                  <Card ref={homeDeliveryServiceRef} className={`bg-white rounded-lg border shadow-sm transition-all duration-300 ${
                    pendingConfigurations.includes('Livraison à domicile') 
                      ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' 
                      : 'border-border'
                  }`}>
                      {/* Section 1: Livraison / Récupération à domicile */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-success/10 rounded-md">
                            <Home className="h-4 w-4 text-success" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">Livraison / Récupération à domicile</h4>
                              {pendingConfigurations.includes('Livraison à domicile') && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 animate-pulse">
                                  ⚠️ À configurer
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Service de livraison et récupération du véhicule à domicile</p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.homeDeliveryService}
                          onCheckedChange={(checked) => {
                            handleInputChange('homeDeliveryService', checked);
                            if (!checked) {
                              handleInputChange('homeDeliveryPickup', false);
                              handleInputChange('homeDeliveryReturn', false);
                            }
                          }}
                          className="data-[state=checked]:bg-success"
                        />
                      </div>

                      {/* Sous-services - visibles seulement si le service principal est activé */}
                      {formData.homeDeliveryService && (
                        <>
                          {/* Section 2: Livraison à domicile */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8 border-b border-border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowDownToLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Livraison à domicile</h4>
                                <p className="text-xs text-muted-foreground">Le véhicule est livré au client</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.homeDeliveryPickup}
                              onCheckedChange={(checked) => handleInputChange('homeDeliveryPickup', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Livraison */}
                          {formData.homeDeliveryPickup && (
                            <div className="p-4 pl-4 sm:pl-8 border-b border-border bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.homeDeliveryPickupFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('homeDeliveryPickupFree', true)}
                                  className={formData.homeDeliveryPickupFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.homeDeliveryPickupFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('homeDeliveryPickupFree', false)}
                                  className={!formData.homeDeliveryPickupFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.homeDeliveryPickupFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.homeDeliveryPickupPrice}
                                      onChange={(e) => handleInputChange('homeDeliveryPickupPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="20"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.homeDeliveryPickupFree && parseFloat(formData.homeDeliveryPickupPrice) > 20 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 20€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section 3: Récupération à domicile */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 pl-4 sm:pl-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-success/10 rounded-md">
                                <ArrowUpFromLine className="h-4 w-4 text-success" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Récupération à domicile</h4>
                                <p className="text-xs text-muted-foreground">Le véhicule est récupéré chez le client</p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.homeDeliveryReturn}
                              onCheckedChange={(checked) => handleInputChange('homeDeliveryReturn', checked)}
                              className="data-[state=checked]:bg-[#52B788]"
                            />
                          </div>

                          {/* Options de paiement pour Récupération */}
                          {formData.homeDeliveryReturn && (
                            <div className="p-4 pl-4 sm:pl-8 bg-muted/20">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant={formData.homeDeliveryReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('homeDeliveryReturnFree', true)}
                                  className={formData.homeDeliveryReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Gift className="h-3 w-3 mr-1" />
                                  Gratuit
                                </Button>
                                <Button
                                  type="button"
                                  variant={!formData.homeDeliveryReturnFree ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleInputChange('homeDeliveryReturnFree', false)}
                                  className={!formData.homeDeliveryReturnFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                                >
                                  <Euro className="h-3 w-3 mr-1" />
                                  Payant
                                </Button>
                                
                                {/* Champ de prix - à droite du bouton Payant */}
                                {!formData.homeDeliveryReturnFree && (
                                  <div className="flex items-center gap-2 ml-3">
                                    <Input
                                      type="number"
                                      value={formData.homeDeliveryReturnPrice}
                                      onChange={(e) => handleInputChange('homeDeliveryReturnPrice', e.target.value)}
                                      min="0"
                                      step="1"
                                      className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                      placeholder="20"
                                    />
                                    <span className="text-base font-bold text-primary">€</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Alerte dynamique pour prix élevé */}
                              {!formData.homeDeliveryReturnFree && parseFloat(formData.homeDeliveryReturnPrice) > 20 && (
                                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">
                                    Prix supérieur au tarif standard de 20€. Un prix trop élevé peut décourager les clients.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </Card>

                  {/* Service Siège bébé */}
                  <Card ref={babySeatServiceRef} className={`bg-white rounded-lg border shadow-sm transition-all duration-300 ${
                    pendingConfigurations.includes('Siège bébé') 
                      ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' 
                      : 'border-border'
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-md">
                          <Baby className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">Siège bébé</h4>
                            {pendingConfigurations.includes('Siège bébé') && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 animate-pulse">
                                ⚠️ À configurer
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Fourniture d'un siège bébé pour la location</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.babySeatService}
                        onCheckedChange={(checked) => handleInputChange('babySeatService', checked)}
                        className="data-[state=checked]:bg-success"
                      />
                    </div>

                    {formData.babySeatService && (
                      <div className="p-4 bg-muted/20">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={formData.babySeatFree ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInputChange('babySeatFree', true)}
                            className={formData.babySeatFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                          >
                            <Gift className="h-3 w-3 mr-1" />
                            Gratuit
                          </Button>
                          <Button
                            type="button"
                            variant={!formData.babySeatFree ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInputChange('babySeatFree', false)}
                            className={!formData.babySeatFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                          >
                            <Euro className="h-3 w-3 mr-1" />
                            Payant
                          </Button>
                          
                          {!formData.babySeatFree && (
                            <div className="flex items-center gap-2 ml-3">
                              <Input
                                type="number"
                                value={formData.babySeatPrice}
                                onChange={(e) => handleInputChange('babySeatPrice', e.target.value)}
                                min="0"
                                step="1"
                                className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                placeholder="1"
                              />
                              <span className="text-base font-bold text-primary">€/jour</span>
                            </div>
                          )}
                        </div>
                        
                        {!formData.babySeatFree && parseFloat(formData.babySeatPrice) > 1 && (
                          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Prix supérieur au tarif standard de 1€/jour. Un prix trop élevé peut décourager les clients.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Service Conducteur additionnel */}
                  <Card ref={additionalDriverServiceRef} className={`bg-white rounded-lg border shadow-sm transition-all duration-300 ${
                    pendingConfigurations.includes('Conducteur additionnel') 
                      ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' 
                      : 'border-border'
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-md">
                          <UserPlus className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-semibold text-foreground">Conducteur additionnel</h4>
                            {pendingConfigurations.includes('Conducteur additionnel') && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300 animate-pulse">
                                ⚠️ À configurer
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Ajout d'un conducteur supplémentaire à la location</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.additionalDriverService}
                        onCheckedChange={(checked) => handleInputChange('additionalDriverService', checked)}
                        className="data-[state=checked]:bg-success"
                      />
                    </div>

                    {formData.additionalDriverService && (
                      <div className="p-4 bg-muted/20">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={formData.additionalDriverFree ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInputChange('additionalDriverFree', true)}
                            className={formData.additionalDriverFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                          >
                            <Gift className="h-3 w-3 mr-1" />
                            Gratuit
                          </Button>
                          <Button
                            type="button"
                            variant={!formData.additionalDriverFree ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInputChange('additionalDriverFree', false)}
                            className={!formData.additionalDriverFree ? "bg-success text-white hover:bg-success/90" : "bg-white"}
                          >
                            <Euro className="h-3 w-3 mr-1" />
                            Payant
                          </Button>
                          
                          {!formData.additionalDriverFree && (
                            <div className="flex items-center gap-2 ml-3">
                              <Input
                                type="number"
                                value={formData.additionalDriverPrice}
                                onChange={(e) => handleInputChange('additionalDriverPrice', e.target.value)}
                                min="0"
                                step="1"
                                className="w-20 h-9 text-center text-base font-semibold border-2 border-primary/30 focus:border-primary bg-white shadow-sm"
                                placeholder="15"
                              />
                              <span className="text-base font-bold text-primary">€/jour</span>
                            </div>
                          )}
                        </div>
                        
                        {!formData.additionalDriverFree && parseFloat(formData.additionalDriverPrice) > 15 && (
                          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mt-2">
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Prix supérieur au tarif standard de 15€/jour. Un prix trop élevé peut décourager les clients.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Note informative */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Les remises et suppléments sont calculés automatiquement en fonction du prix de base.
                    Les prix affichés sont indicatifs et peuvent varier selon les conditions de location.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Photos
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gérez les photos de votre véhicule. Ajoutez jusqu'à 10 photos.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Zone de téléchargement avec drag & drop */}
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={triggerFileInput}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-primary/50', 'bg-primary/5');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary/50', 'bg-primary/5');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary/50', 'bg-primary/5');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handlePhotoUpload(files);
                    }
                  }}
                >
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ajouter des photos</h3>
                  <p className="text-muted-foreground mb-4">
                    Glissez-déposez vos photos ici ou cliquez pour sélectionner
                  </p>
                  <Button 
                    variant="outline" 
                    className="mb-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                    disabled={uploadingPhotos}
                  >
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Sélectionner des photos
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés: JPG, PNG (max 10MB par photo)
                  </p>
                </div>

                {/* Galerie de photos existantes */}
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Photos actuelles ({photos.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPhotos}
                      disabled={uploadingPhotos}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Actualiser
                    </Button>
                  </div>
                  
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo, index) => (
                        <div key={photo.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                            <img
                              src={photo.url}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeletePhoto(photo.url)}
                            disabled={deletingPhoto === photo.url}
                          >
                            {deletingPhoto === photo.url ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          {index === 0 && (
                            <Badge className="absolute top-2 left-2">
                              Principale
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune photo uploadée</p>
                      <p className="text-sm">Utilisez la zone ci-dessus pour ajouter des photos</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aperçu */}
          {previewMode && (
            <TabsContent value="preview">
              <div className="min-h-screen flex flex-col bg-background pb-20 lg:pb-0">
                <div className="flex-1 py-4 md:py-8">
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    {/* Bannière d'aperçu - Style Lagoon avec pulsation */}
                    <div className="mb-8 relative">
                      <div className="preview-banner relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-primary/20 shadow-lagoon">
                        {/* Gradient de fond Lagoon avec pulsation */}
                        <div className="absolute inset-0 bg-gradient-lagoon opacity-10 preview-banner-bg"></div>
                        
                        {/* Effet de brillance animé */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent preview-banner-shimmer"></div>
                        
                        {/* Effet de pulsation globale */}
                        <div className="absolute inset-0 bg-gradient-lagoon opacity-5 preview-banner-pulse"></div>
                        
                        <div className="relative p-6">
                          {/* Contenu principal */}
                          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:space-x-4 sm:gap-0 text-center sm:text-left">
                            {/* Icône avec style Lagoon et pulsation */}
                            <div className="flex-shrink-0">
                              <div className="relative">
                                <div className="absolute -inset-2 bg-gradient-lagoon rounded-2xl blur-sm opacity-40 preview-banner-icon-glow"></div>
                                <div className="relative bg-gradient-lagoon rounded-2xl p-3 shadow-lagoon preview-banner-icon">
                                  <Eye className="h-6 w-6 text-white preview-banner-eye" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Texte principal avec animation */}
                            <div className="text-center">
                              <h3 className="text-lg font-semibold text-foreground mb-1 preview-banner-title">
                                Mode Aperçu
                              </h3>
                              <p className="text-muted-foreground text-sm preview-banner-description">
                                Voici un aperçu de votre annonce telle qu'elle apparaîtra aux locataires
                              </p>
                            </div>
                            
                            {/* Badge de statut avec pulsation intense */}
                            <div className="flex-shrink-0">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-lagoon rounded-full blur-sm opacity-60 preview-banner-badge-glow"></div>
                                <div className="relative bg-gradient-lagoon text-white px-3 py-1 rounded-full text-xs font-medium shadow-soft preview-banner-badge">
                                  LIVE
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Barre de progression animée */}
                          <div className="absolute bottom-0 left-0 h-1 bg-gradient-lagoon opacity-60 preview-banner-progress"></div>
                          
                          {/* Indicateurs visuels avec pulsation */}
                          <div className="absolute top-4 right-4 flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full preview-banner-dot-1"></div>
                            <div className="w-2 h-2 bg-primary/70 rounded-full preview-banner-dot-2"></div>
                            <div className="w-2 h-2 bg-primary/50 rounded-full preview-banner-dot-3"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                      {/* Main Content */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Photos Gallery */}
                        <div className="space-y-4">
                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                            <img
                              src={photos[selectedPhotoIndex]?.url || "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop"}
                              alt={`${formData.brand} ${formData.model}`}
                              className="w-full h-full object-cover"
                            />
                            {photos.length > 1 && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur"
                                  onClick={() => setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur"
                                  onClick={() => setSelectedPhotoIndex((prev) => (prev + 1) % photos.length)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur rounded-md px-2 py-1 text-sm">
                              {selectedPhotoIndex + 1} / {photos.length || 1}
                            </div>
                          </div>
                          
                          {/* Photo Thumbnails */}
                          {photos.length > 1 && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {photos.slice(0, 6).map((photo, index) => (
                                <button
                                  key={photo.id}
                                  onClick={() => setSelectedPhotoIndex(index)}
                                  className={`aspect-square rounded-lg overflow-hidden transition-all ${
                                    selectedPhotoIndex === index 
                                      ? "ring-2 ring-primary" 
                                      : "hover:ring-2 hover:ring-primary/50"
                                  }`}
                                >
                                  <img
                                    src={photo.url}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Vehicle Title and Info */}
                        <div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <Badge variant="secondary" className="text-sm w-fit">{vehicle?.license}</Badge>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">5.0</span>
                              <span className="text-muted-foreground">(24 avis)</span>
                            </div>
                          </div>
                          
                  <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    {formData.brand} {formData.model} {formData.year}
                  </h1>
                          
                          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                            <span>{parseInt(formData.mileage || '0').toLocaleString()} km</span>
                            <span>•</span>
                            <span>{formData.year}</span>
                            <span>•</span>
                            <span>{formData.seats} places</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Parking réservé
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              {formData.transmission === 'manual' ? 'Manuelle' : formData.transmission === 'automatic' ? 'Automatique' : 'Non spécifiée'}
                            </Badge>
                          </div>
                        </div>


                        {/* Location Map */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Récupération du véhicule</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="font-medium">{formData.location || "Nosy Be, Madagascar"}</span>
                              </div>
                              <div className="h-24 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg flex items-center justify-center border border-muted/40">
                                <div className="text-center text-muted-foreground">
                                  <MapPin className="h-5 w-5 mx-auto mb-1" />
                                  <p className="text-sm">Carte interactive</p>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Vous récupérerez les clés directement auprès du propriétaire lors de votre arrivée.
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Owner and Description */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Propriétaire */}
                          <div className="max-w-md">
                            <Card>
                              <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={ownerProfile?.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"} />
                                    <AvatarFallback>
                                      {ownerProfile?.firstName?.[0] || ownerProfile?.lastName?.[0] || 'P'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h3 className="font-semibold">
                                      {ownerProfile?.firstName && ownerProfile?.lastName 
                                        ? `${ownerProfile.firstName} ${ownerProfile.lastName}`
                                        : ownerProfile?.firstName || 'Propriétaire'
                                      }
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Propriétaire vérifié</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-sm font-medium">5.0</span>
                                      <span className="text-xs text-muted-foreground">(24 avis)</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <UserCheck className="h-4 w-4" />
                                    <span>
                                      Membre depuis {ownerProfile?.createdAt 
                                        ? new Date(ownerProfile.createdAt).toLocaleDateString('fr-FR', { 
                                            year: 'numeric', 
                                            month: 'long' 
                                          })
                                        : '2023'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Description */}
                          {formData.description && (
                            <div className="max-w-md">
                              <Card className="h-full overflow-hidden">
                                <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Car className="h-5 w-5 text-primary" />
                                  Description du véhicule
                                </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 p-4">
                                  <p className="text-gray-700 leading-relaxed text-sm">
                                    {formData.description}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </div>

                        {/* Technical Specifications */}
                        <Card className="overflow-hidden">
                          <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                            <CardTitle className="text-lg">Caractéristiques techniques</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-600 mb-1">Moteur</div>
                                <div className="text-sm font-semibold text-primary">
                                  {formData.fuel === 'gasoline' ? 'Essence' : 
                                   formData.fuel === 'diesel' ? 'Diesel' : 
                                   formData.fuel === 'electric' ? 'Électrique' : 
                                   formData.fuel === 'hybrid' ? 'Hybride' : 'Non spécifié'}
                                </div>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-600 mb-1">Transmission</div>
                                <div className="text-sm font-semibold text-primary">
                                  {formData.transmission === 'manual' ? 'Manuelle' : formData.transmission === 'automatic' ? 'Automatique' : 'Non spécifiée'}
                                </div>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-600 mb-1">Kilométrage</div>
                                <div className="text-sm font-semibold text-primary">{parseInt(formData.mileage || '0').toLocaleString()} km</div>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-600 mb-1">Portes</div>
                                <div className="text-sm font-semibold text-primary">{formData.doors}</div>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-600 mb-1">Places</div>
                                <div className="text-sm font-semibold text-primary">{formData.seats}</div>
                              </div>
                              <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                                <div className="text-xs text-gray-600 mb-1">Couleur</div>
                                <div className="text-sm font-semibold text-primary">{formData.color}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Options and Accessories */}
                        <Card className="overflow-hidden">
                          <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                            <CardTitle className="text-lg">Options et accessoires</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                                <Wind className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <span className="text-xs font-medium">Climatisation</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                                <Navigation className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span className="text-xs font-medium">GPS</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                                <Gauge className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                <span className="text-xs font-medium">Régulateur</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                                <Volume2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                <span className="text-xs font-medium">Audio/iPod</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                                <Bluetooth className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-medium">Bluetooth</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                                <Smartphone className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                <span className="text-xs font-medium">CarPlay</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Reviews */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span>Évaluations</span>
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-lg font-bold">5.0</span>
                                </div>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-4 mb-6">
                              {[5, 4, 3, 2, 1].map((rating) => (
                                <div key={rating} className="flex items-center gap-3">
                                  <span className="text-sm w-3">{rating}</span>
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <Progress value={rating === 5 ? 90 : 0} className="flex-1" />
                                  <span className="text-sm text-muted-foreground w-8">{rating === 5 ? '22' : '0'}</span>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-4">
                              <div className="border-t pt-4">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face" />
                                    <AvatarFallback>M</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">Marie</span>
                                      <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                      Il y a 2 semaines • 3 jours de location
                                    </p>
                                    <p className="text-sm">
                                      Véhicule en parfait état, très propre. {ownerProfile?.firstName || 'Le propriétaire'} est un hôte attentionné et disponible. Je recommande vivement !
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="border-t pt-4">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" />
                                    <AvatarFallback>J</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">Jean</span>
                                      <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                      Il y a 1 mois • 5 jours de location
                                    </p>
                                    <p className="text-sm">
                                      Excellent véhicule pour découvrir l'île. Économique et fiable. Communication parfaite avec le propriétaire.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Insurance */}
                        <Card className="border-primary/20 bg-primary/5">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-primary" />
                              Assurance incluse
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span>Assurance multirisque fournie par AXA</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span>Assistance routière 24/7</span>
                              </div>

                              <Separator />

                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-medium mb-2">Ce que prend en charge l'assurance :</h4>
                                  <ul className="space-y-1 text-muted-foreground">
                                    <li>• Dommages collision</li>
                                    <li>• Vol et vandalisme</li>
                                    <li>• Bris de glace</li>
                                    <li>• Incendie</li>
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-2">Conditions :</h4>
                                  <ul className="space-y-1 text-muted-foreground">
                                    <li>• Âge minimum : 21 ans</li>
                                    <li>• Permis depuis 2 ans</li>
                                    <li>• Franchise : 800€</li>
                                    <li>• Caution : 1000€</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Benefits */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Avantages à chaque location</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span>Prolongation facile</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>30 minutes de marge pour les retours tardifs</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-purple-500" />
                                <span>Support client 7j/7</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Sticky Sidebar - Only visible on desktop */}
                      <div className="hidden lg:block">
                        <div className="sticky top-24 h-fit">
                          <Card className="shadow-lg">
                            <CardContent className="p-6">
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <ClientMgaPrice
                                      amountMga={parseFloat(formData.pricePerDay || "0") || 0}
                                      className="items-start text-left"
                                      primaryClassName="text-2xl font-bold text-primary"
                                      secondaryClassName="text-xs text-muted-foreground"
                                    />
                                    <span className="text-sm text-muted-foreground line-through">
                                      {formatClient(Math.round(parseFloat(formData.pricePerDay || "0") * 1.2)).primary}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">par jour</p>
                                </div>

                                <Button
                                  size="lg"
                                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
                                  disabled
                                >
                                  <CalendarIcon className="h-5 w-5 mr-2" />
                                  Envoyer une demande
                                </Button>

                                <Badge variant="secondary" className="w-full justify-center py-1">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Annulation gratuite
                                </Badge>
                              </div>

                              <Separator className="my-6" />

                              <div>
                                <h3 className="font-semibold mb-4">Inclus dans le prix</h3>
                                <div className="space-y-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-green-500" />
                                    <span>Assurance multirisque</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    <span>Assistance routière 24/7</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-purple-500" />
                                    <span>Conducteurs additionnels gratuits</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Sticky Bottom Price Card */}
                <div className="lg:hidden fixed left-0 right-0 z-30 bg-background border-t bottom-[calc(5.25rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 max-w-6xl mx-auto">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <ClientMgaPrice
                          amountMga={parseFloat(formData.pricePerDay || "0") || 0}
                          className="items-start text-left"
                          primaryClassName="text-xl font-bold text-primary"
                          secondaryClassName="text-xs text-muted-foreground"
                        />
                        <span className="text-sm text-muted-foreground line-through ml-2">
                          {formatClient(Math.round(parseFloat(formData.pricePerDay || "0") * 1.2)).primary}
                        </span>
                        <span className="text-sm text-muted-foreground">par jour</span>
                      </div>
                      <Button
                        size="default"
                        className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 w-full sm:w-auto shrink-0"
                        disabled
                      >
                        <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Envoyer une demande</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Actions — barre fixe sur mobile */}
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:static sm:mt-8 border-t sm:border-0 bg-background/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] p-3 sm:p-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] sm:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center max-w-6xl mx-auto">
            <Button
              variant="destructive"
              onClick={handleDeleteVehicle}
              disabled={deletingVehicle}
              className="flex items-center justify-center gap-2 w-full sm:w-auto order-2 sm:order-1"
              size="sm"
            >
              {deletingVehicle ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">Supprimer mon véhicule</span>
                </>
              )}
            </Button>
            <div className="flex gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleNavigation(() => navigate("/me/owner/vehicles"))}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2 shrink-0" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fenêtre de confirmation pour la disponibilité - VERSION PERSONNALISÉE */}
      {showAvailabilityDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setShowAvailabilityDialog(false);
            setPendingAvailabilityChange(null);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Confirmer la modification de disponibilité</h3>
            
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">
                En désactivant la disponibilité de votre véhicule :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Il ne sera plus visible dans les résultats de recherche</li>
                <li>Les clients ne pourront plus effectuer de nouvelles réservations</li>
                <li>Les réservations existantes restent valides</li>
              </ul>
              <p className="font-medium text-gray-800">
                Êtes-vous sûr de vouloir continuer ?
              </p>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button 
                onClick={confirmAvailabilityChange}
                className="bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md hover:border-gray-400 group"
              >
                <span className="transition-transform duration-200 group-hover:scale-105">Confirmer la désactivation</span>
              </Button>
              <Button
                onClick={cancelAvailabilityChange}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:bg-red-700 group"
              >
                <span className="transition-transform duration-200 group-hover:scale-105">Annuler</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Première fenêtre de confirmation pour la suppression - VERSION PERSONNALISÉE */}
      {showDeleteDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteDialog(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold">Supprimer le véhicule</h3>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer votre véhicule <strong>{vehicle?.brand} {vehicle?.model}</strong> ?
              </p>
              <p className="text-sm text-gray-500">
                Cette action supprimera définitivement toutes les données associées à ce véhicule.
              </p>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button 
                onClick={confirmFirstDelete}
                className="bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md hover:border-gray-400 group"
              >
                <span className="transition-transform duration-200 group-hover:scale-105">Oui, je suis sûr</span>
              </Button>
              <Button
                onClick={cancelDelete}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:bg-red-700 group"
              >
                <span className="transition-transform duration-200 group-hover:scale-105">Annuler</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deuxième fenêtre de confirmation pour la suppression - VERSION PERSONNALISÉE */}
      {showSecondDeleteDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setShowSecondDeleteDialog(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold">Confirmation finale</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="font-semibold text-red-600">
                Cette action est irréversible !
              </p>
              <p className="text-gray-600">
                Vous êtes sur le point de supprimer définitivement votre véhicule. 
                Toutes les données seront perdues et ne pourront pas être récupérées.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Cette action supprimera :
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• Toutes les informations du véhicule</li>
                  <li>• Toutes les photos associées</li>
                  <li>• L'historique des réservations</li>
                  <li>• Les données de tarification</li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button 
                onClick={confirmSecondDelete}
                className="bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md hover:border-gray-400 group"
              >
                <span className="transition-transform duration-200 group-hover:scale-105">Supprimer définitivement</span>
              </Button>
              <Button
                onClick={cancelDelete}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:bg-red-700 group"
              >
                <span className="transition-transform duration-200 group-hover:scale-105">Annuler</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  );
}
