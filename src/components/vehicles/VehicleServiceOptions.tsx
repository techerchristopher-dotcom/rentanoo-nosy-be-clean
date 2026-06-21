import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plane, Ship, Home, Baby, UserPlus, Building2, Tag } from "lucide-react";
import { Vehicle } from "@/services/supabaseVehiclesService";
import {
  updateBookingOptions,
  getBookingDraft,
  BookingOption,
} from "@/services/localStorage/bookingStorage";
import {
  LEGACY_AIRPORT_OPTION_ID_MAP,
  isPlatformPickupOption,
  isPlatformReturnOption,
  resolvePickupExclusion,
  resolveReturnExclusion,
} from "@/constants/platformBookingOptions";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useBookingOptionsCatalog } from "@/hooks/useBookingOptionsCatalog";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";

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

function readSelectedServiceIdsFromDraft(): string[] {
  const draft = getBookingDraft();
  if (!draft?.selectedOptions?.length) return [];
  return draft.selectedOptions
    .filter((opt) => opt.selected)
    .map((opt) => LEGACY_AIRPORT_OPTION_ID_MAP[opt.id] ?? opt.id);
}

export function VehicleServiceOptions({ vehicle, rentalDays }: VehicleServiceOptionsProps) {
  const [selectedServices, setSelectedServices] = useState(readSelectedServiceIdsFromDraft);
  const { formatClient } = useExchangeRate();
  const { options: catalogOptions } = useBookingOptionsCatalog(vehicle.vehicleType);
  const formatDualLabel = (amountMga: number) => {
    const { primary, secondary } = formatClient(amountMga);
    return `${primary} (${secondary})`;
  };
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONSTRUIRE LA LISTE DES SERVICES DEPUIS LES DONNÉES DU VÉHICULE
  // Ordre spécifique demandé par le client
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const buildAvailableServices = (): ServiceOption[] => {
    const services: ServiceOption[] = [];
    
    // Catalogue d'options admin, filtré par catégorie du véhicule
    // (panel admin /admin/settings/pricing)
    for (const opt of catalogOptions) {
      const isHotel = opt.id.includes("hotel");
      const isAirport = opt.id.includes("airport");
      const isPerDay = opt.pricingMode === "per_day";
      services.push({
        id: opt.id,
        name: opt.name,
        description: opt.description ?? "",
        icon: isHotel ? Building2 : isAirport ? Plane : Tag,
        type: isPerDay ? "per_day" : "flat_rate",
        pricePerDay: isPerDay ? opt.priceMga : 0,
        totalPrice: isPerDay ? Math.round(opt.priceMga * rentalDays * 100) / 100 : opt.priceMga,
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
      servicesList: services.map(s => `${s.name} (${s.isFree ? 'Gratuit' : formatDualLabel(s.totalPrice)})`)
    });

    return services;
  };

  const availableServices = useMemo(
    () => buildAvailableServices(),
    [vehicle, rentalDays, catalogOptions]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GÉRER LA SÉLECTION/DÉSÉLECTION D'UN SERVICE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleToggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const isSelected = prev.includes(serviceId);
      if (isSelected) {
        return prev.filter((id) => id !== serviceId);
      }
      let next = [...prev, serviceId];
      if (isPlatformPickupOption(serviceId)) {
        next = resolvePickupExclusion(serviceId, next);
      }
      if (isPlatformReturnOption(serviceId)) {
        next = resolveReturnExclusion(serviceId, next);
      }
      return next;
    });
  };
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // METTRE À JOUR LOCALSTORAGE À CHAQUE CHANGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
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
    
    updateBookingOptions(selectedOptionsData);
  }, [selectedServices, availableServices]);

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
                  {service.type === "per_day" ? (
                    <>
                      {formatDualLabel(service.pricePerDay)}/jour × {rentalDays}{" "}
                      {rentalDays === 1 ? "jour" : "jours"}
                    </>
                  ) : (
                    "Forfait unique"
                  )}
                </p>
                              </div>
              
              {/* Prix */}
              <div className="shrink-0 text-right">
                {service.isFree ? (
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    Gratuit
                  </Badge>
                ) : (
                  <ClientMgaPrice
                    amountMga={service.totalPrice}
                    prefix="+"
                    primaryClassName="font-bold tabular-nums leading-none text-primary text-lg"
                  />
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
              <ClientMgaPrice
                amountMga={availableServices
                  .filter((s) => selectedServices.includes(s.id))
                  .reduce((sum, s) => sum + s.totalPrice, 0)}
                prefix="+"
                primaryClassName="font-bold tabular-nums leading-none text-primary text-xl"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

