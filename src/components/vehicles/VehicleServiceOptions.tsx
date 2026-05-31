import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plane, Ship, Home, Baby, UserPlus } from "lucide-react";
import { Vehicle } from "@/services/supabaseVehiclesService";
import { updateBookingOptions, getBookingDraft, BookingOption } from "@/services/localStorage/bookingStorage";
import {
  LEGACY_AIRPORT_OPTION_ID_MAP,
  PLATFORM_AIRPORT_OPTIONS,
} from "@/constants/platformBookingOptions";

interface VehicleServiceOptionsProps {
  vehicle: Vehicle;
  rentalDays: number;
}

// Type pour distinguer les services par jour vs forfait
type ServiceType = 'per_day' | 'flat_rate';

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  type: ServiceType;
  pricePerDay: number;
  totalPrice: number;
  isFree: boolean;
}

export function VehicleServiceOptions({ vehicle, rentalDays }: VehicleServiceOptionsProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INITIALISER LES SERVICES SÉLECTIONNÉS DEPUIS LE BROUILLON EXISTANT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    // Initialiser selectedServices depuis le brouillon existant
    const draft = getBookingDraft();
    console.log('🔍 [DEBUG] Initialisation - Brouillon trouvé:', draft);
    
    if (draft?.selectedOptions && draft.selectedOptions.length > 0) {
      const existingSelectedIds = draft.selectedOptions
        .filter(opt => opt.selected)
        .map(opt => LEGACY_AIRPORT_OPTION_ID_MAP[opt.id] ?? opt.id);
      
      console.log('🔄 [DEBUG] Initialisation selectedServices depuis le brouillon:', {
        allOptions: draft.selectedOptions,
        selectedOptions: existingSelectedIds
      });
      setSelectedServices(existingSelectedIds);
    } else {
      console.log('🔄 [DEBUG] Aucun brouillon existant ou pas d\'options, selectedServices reste vide');
      // Ne pas forcer à vide, laisser l'état initial
    }
  }, []); // Se déclenche seulement au montage
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONSTRUIRE LA LISTE DES SERVICES DEPUIS LES DONNÉES DU VÉHICULE
  // Ordre spécifique demandé par le client
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const buildAvailableServices = (): ServiceOption[] => {
    const services: ServiceOption[] = [];
    
    // Options aéroport plateforme (16 € fixes, tous véhicules)
    for (const opt of PLATFORM_AIRPORT_OPTIONS) {
      services.push({
        id: opt.id,
        name: opt.name,
        description: opt.description,
        icon: Plane,
        type: "flat_rate",
        pricePerDay: 0,
        totalPrice: opt.totalPrice,
        isFree: false,
      });
    }

    // Barge Grande Terre - Récupération (forfait)
    if (vehicle.barge_grande_terre_retrieval) {
      const price = vehicle.barge_grande_terre_retrieval_free ? 0 : (vehicle.barge_grande_terre_retrieval_price || 0);
      services.push({
        id: 'barge-grande-terre-retrieval',
        name: 'Récupération Barge Grande Terre',
        description: 'Le propriétaire vous amène le véhicule à la Barge de Grande Terre',
        icon: Ship,
        type: 'flat_rate',
        pricePerDay: 0,
        totalPrice: price,
        isFree: vehicle.barge_grande_terre_retrieval_free || false
      });
    }
    
    // 4️⃣ 🚢 Barge Grande Terre - Retour (forfait)
    if (vehicle.barge_grande_terre_return) {
      const price = vehicle.barge_grande_terre_return_free ? 0 : (vehicle.barge_grande_terre_return_price || 0);
      services.push({
        id: 'barge-grande-terre-return',
        name: 'Retour Barge Grande Terre',
        description: 'Vous rendez le véhicule directement à la Barge de Grande Terre',
        icon: Ship,
        type: 'flat_rate',
        pricePerDay: 0,
        totalPrice: price,
        isFree: vehicle.barge_grande_terre_return_free || false
      });
    }
    
    // 5️⃣ 🚢 Barge Petite Terre - Récupération (forfait)
    if (vehicle.barge_petite_terre_retrieval) {
      const price = vehicle.barge_petite_terre_retrieval_free ? 0 : (vehicle.barge_petite_terre_retrieval_price || 0);
      services.push({
        id: 'barge-petite-terre-retrieval',
        name: 'Récupération Barge Petite Terre',
        description: 'Le propriétaire vous amène le véhicule à la Barge de Petite Terre',
        icon: Ship,
        type: 'flat_rate',
        pricePerDay: 0,
        totalPrice: price,
        isFree: vehicle.barge_petite_terre_retrieval_free || false
      });
    }
    
    // 6️⃣ 🚢 Barge Petite Terre - Retour (forfait)
    if (vehicle.barge_petite_terre_return) {
      const price = vehicle.barge_petite_terre_return_free ? 0 : (vehicle.barge_petite_terre_return_price || 0);
      services.push({
        id: 'barge-petite-terre-return',
        name: 'Retour Barge Petite Terre',
        description: 'Vous rendez le véhicule directement à la Barge de Petite Terre',
        icon: Ship,
        type: 'flat_rate',
        pricePerDay: 0,
        totalPrice: price,
        isFree: vehicle.barge_petite_terre_return_free || false
      });
    }
    
    // 7️⃣ 🏠 Livraison à domicile - Aller (forfait)
    if (vehicle.home_delivery_pickup) {
      const price = vehicle.home_delivery_pickup_free ? 0 : (vehicle.home_delivery_pickup_price || 0);
      services.push({
        id: 'home-delivery-pickup',
        name: 'Livraison à domicile (aller)',
        description: 'Le propriétaire vous livre le véhicule à l\'adresse de votre choix',
        icon: Home,
        type: 'flat_rate',
        pricePerDay: 0,
        totalPrice: price,
        isFree: vehicle.home_delivery_pickup_free || false
      });
    }
    
    // 8️⃣ 🏠 Livraison à domicile - Retour (forfait)
      if (vehicle.home_delivery_return) {
      const price = vehicle.home_delivery_return_free ? 0 : (vehicle.home_delivery_return_price || 0);
      services.push({
        id: 'home-delivery-return',
        name: 'Livraison à domicile (retour)',
        description: 'Le propriétaire récupère le véhicule à l\'adresse de votre choix',
        icon: Home,
        type: 'flat_rate',
        pricePerDay: 0,
        totalPrice: price,
        isFree: vehicle.home_delivery_return_free || false
      });
    }
    
    // 9️⃣ 👶 Siège bébé (prix par jour)
    if (vehicle.baby_seat_service) {
      const pricePerDay = vehicle.baby_seat_free ? 0 : (vehicle.baby_seat_price || 0);
      services.push({
        id: 'baby-seat',
        name: 'Siège bébé',
        description: 'Siège auto pour enfant conforme aux normes de sécurité',
        icon: Baby,
        type: 'per_day',
        pricePerDay,
        totalPrice: Math.round(pricePerDay * rentalDays * 100) / 100,
        isFree: vehicle.baby_seat_free || false
      });
    }
    
    // 🔟 👨‍✈️ Conducteur additionnel (prix par jour)
    if (vehicle.additional_driver_service) {
      const pricePerDay = vehicle.additional_driver_free ? 0 : (vehicle.additional_driver_price || 0);
      services.push({
        id: 'additional-driver',
        name: 'Conducteur additionnel',
        description: 'Autorisation pour qu\'une autre personne conduise le véhicule',
        icon: UserPlus,
        type: 'per_day',
        pricePerDay,
        totalPrice: Math.round(pricePerDay * rentalDays * 100) / 100,
        isFree: vehicle.additional_driver_free || false
      });
    }
    
    console.log('📊 [VehicleServiceOptions] Services construits:', {
      totalServices: services.length,
      servicesList: services.map(s => `${s.name} (${s.isFree ? 'Gratuit' : s.totalPrice + '€'})`)
    });

    return services;
  };

  const availableServices = useMemo(() => buildAvailableServices(), [vehicle, rentalDays]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GÉRER LA SÉLECTION/DÉSÉLECTION D'UN SERVICE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleToggleService = (serviceId: string) => {
    console.log('🎯 [DEBUG] handleToggleService appelé avec serviceId:', serviceId);
    setSelectedServices(prev => {
      const newSelectedServices = prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      console.log('🎯 [DEBUG] selectedServices changé de', prev, 'vers', newSelectedServices);
      return newSelectedServices;
    });
  };
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // METTRE À JOUR LOCALSTORAGE À CHAQUE CHANGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect principal déclenché avec:', {
      selectedServices,
      availableServicesLength: availableServices.length,
      selectedServicesLength: selectedServices.length,
      timestamp: new Date().toISOString()
    });
    
    const selectedOptionsData: BookingOption[] = availableServices
      .filter(service => selectedServices.includes(service.id))
      .map(service => ({
        id: service.id,
        name: service.name,
        pricePerDay: service.pricePerDay,
        totalPrice: service.totalPrice,
        selected: true
      }));
    
    console.log('🔍 [DEBUG] Données avant filtrage:', {
      availableServices: availableServices.map(s => ({ id: s.id, name: s.name })),
      selectedServices,
      filteredCount: selectedOptionsData.length
    });
    
    // Mettre à jour localStorage
    console.log('🔄 [VehicleServiceOptions] Appel updateBookingOptions avec:', selectedOptionsData);
    updateBookingOptions(selectedOptionsData);
    
    console.log('✨ [VehicleServiceOptions] Services sélectionnés:', {
      count: selectedOptionsData.length,
      services: selectedOptionsData.map(s => `${s.name}: ${s.totalPrice}€`),
      total: selectedOptionsData.reduce((sum, s) => sum + s.totalPrice, 0)
    });
  }, [selectedServices, availableServices]);
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SURVEILLER LES CHANGEMENTS DU LOCALSTORAGE POUR SYNCHRONISER LES CHECKBOXES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    // Surveiller les changements du localStorage pour synchroniser les checkboxes
    const interval = setInterval(() => {
      const draft = getBookingDraft();
      if (draft?.selectedOptions) {
        // Récupérer les IDs des services sélectionnés depuis le localStorage
        const selectedIdsFromStorage = draft.selectedOptions
          .filter(opt => opt.selected)
          .map(opt => LEGACY_AIRPORT_OPTION_ID_MAP[opt.id] ?? opt.id);
        
        // Comparer avec l'état actuel
        const currentSelectedIds = selectedServices;
        
        // Vérifier s'il y a une différence
        const hasChanged = selectedIdsFromStorage.length !== currentSelectedIds.length ||
          !selectedIdsFromStorage.every(id => currentSelectedIds.includes(id));
        
        if (hasChanged) {
          console.log('🔄 [VehicleServiceOptions] Synchronisation depuis localStorage:', {
            fromStorage: selectedIdsFromStorage,
            current: currentSelectedIds
          });
          setSelectedServices(selectedIdsFromStorage);
        }
      }
    }, 200); // Vérifier toutes les 200ms
    
    return () => clearInterval(interval);
  }, []); // Pas de dépendances pour éviter les conflits avec le useEffect principal
  
  // Si aucun service n'est disponible pour ce véhicule, ne rien afficher
  if (availableServices.length === 0) {
    return null;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDU : AFFICHAGE DES SERVICES DISPONIBLES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          ✨ Services supplémentaires
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sélectionnez les services dont vous avez besoin
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {availableServices.map(service => {
          const Icon = service.icon;
          const isChecked = selectedServices.includes(service.id);
          
                  return (
                    <div 
                      key={service.id} 
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-all duration-300"
            >
              {/* Checkbox */}
              <Checkbox
                        id={service.id}
                checked={isChecked}
                onCheckedChange={() => handleToggleService(service.id)}
                className="mt-1"
              />
              
              {/* Contenu */}
              <div className="flex-1">
                <label 
                  htmlFor={service.id}
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Icon 
                    className={`h-5 w-5 text-primary flex-shrink-0 ${
                      service.id === "platform-airport-pickup" ? "rotate-180" : ""
                              }`} 
                            />
                  <span>{service.name}</span>
                </label>
                
                {/* Description explicative */}
                <p className="text-sm text-muted-foreground mt-1">
                  {service.description}
                </p>
                
                {/* Type de tarification */}
                <p className="text-xs text-muted-foreground mt-1">
                  {service.type === 'per_day' ? (
                    `${service.pricePerDay}€/jour × ${rentalDays} ${rentalDays === 1 ? 'jour' : 'jours'}`
                  ) : (
                    'Forfait unique'
                  )}
                                </p>
                              </div>
              
              {/* Prix */}
              <div className="text-right">
                {service.isFree ? (
                  <Badge variant="secondary" className="bg-success/10 text-success">
                                  Gratuit
                                </Badge>
                              ) : (
                  <>
                    <p className="font-bold text-primary text-lg">
                      +{service.totalPrice}€
                    </p>
                    {service.type === 'per_day' && (
                      <p className="text-xs text-muted-foreground">
                        {service.pricePerDay}€/jour
                      </p>
                    )}
                  </>
                      )}
                    </div>
                </div>
              );
            })}
        
        {/* Récapitulatif des services sélectionnés */}
        {selectedServices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-muted">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total options :</span>
              <span className="font-bold text-primary text-xl">
                +{availableServices
                  .filter(s => selectedServices.includes(s.id))
                  .reduce((sum, s) => sum + s.totalPrice, 0)}€
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

