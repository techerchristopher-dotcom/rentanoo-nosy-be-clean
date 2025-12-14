import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Calendar, Car, Star, Shield } from "lucide-react";
import { VehicleOwnerService, VehicleWithOwner } from "@/services/supabase/vehicleOwner";
import { cn } from "@/lib/utils";

interface VehicleOwnerCardProps {
  vehicleId: string;
  className?: string;
}

export default function VehicleOwnerCard({ vehicleId, className }: VehicleOwnerCardProps) {
  const [ownerData, setOwnerData] = useState<VehicleWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOwnerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: ownerError } = await VehicleOwnerService.getVehicleOwnerInfo(vehicleId);
        
        if (ownerError) {
          setError(ownerError);
        } else if (data) {
          setOwnerData(data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données du propriétaire:', err);
        setError('Erreur lors du chargement des informations');
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      loadOwnerData();
    }
  }, [vehicleId]);

  if (loading) {
    return (
      <Card className={cn("bg-white/90 backdrop-blur-sm border-primary-soft/20 shadow-soft", className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !ownerData) {
    return (
      <Card className={cn("bg-white/90 backdrop-blur-sm border-red-200 shadow-soft", className)}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Impossible de charger les informations du propriétaire</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { owner, vehicle } = ownerData;

  return (
    <Card className={cn("bg-white/95 backdrop-blur-sm border-primary-soft/20 shadow-soft hover:shadow-lg transition-all duration-300 overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
        <CardTitle className="flex items-center text-lg font-semibold text-primary">
          <User className="w-5 h-5 mr-2" />
          Propriétaire
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Informations du propriétaire - Layout compact */}
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12 ring-2 ring-primary-soft/30 flex-shrink-0">
            <AvatarImage 
              src={owner.avatarUrl} 
              alt={`${owner.firstName} ${owner.lastName}`}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary-soft text-primary font-semibold text-sm">
              {owner.firstName.charAt(0)}{owner.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 truncate text-sm">
                {owner.firstName} {owner.lastName}
              </h3>
              <Badge 
                variant={owner.kycStatus === 'verified' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs px-2 py-0.5",
                  owner.kycStatus === 'verified' 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                )}
              >
                <Shield className="w-3 h-3 mr-1" />
                {owner.kycStatus === 'verified' ? 'Vérifié' : 'En attente'}
              </Badge>
            </div>
            
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <Calendar className="w-3 h-3 mr-1" />
              Membre depuis {owner.memberSince}
            </div>
          </div>
        </div>

        {/* Statistiques compactes */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gray-50/50 rounded-lg">
            <Car className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-sm font-bold text-primary">{owner.totalVehicles}</div>
            <div className="text-xs text-gray-600">Véhicules</div>
          </div>
          
          <div className="text-center p-2 bg-gray-50/50 rounded-lg">
            <Star className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-sm font-bold text-primary">{owner.totalRentals}</div>
            <div className="text-xs text-gray-600">Locations</div>
          </div>

          <div className="text-center p-2 bg-primary-soft/20 rounded-lg">
            <Car className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-sm font-bold text-primary">{vehicle.rental_count}</div>
            <div className="text-xs text-gray-600">Cette voiture</div>
          </div>
        </div>

        {/* Bio du propriétaire - Plus compact */}
        {owner.bio && (
          <div className="bg-gradient-to-r from-gray-50/50 to-primary-soft/5 p-3 rounded-lg border-l-3 border-primary-soft">
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-medium text-gray-900">"{owner.bio}"</span>
            </p>
          </div>
        )}

        {/* Message d'accueil compact */}
        <div className="text-xs text-gray-600 bg-blue-50/30 p-2 rounded-lg">
          <p>
            <strong>Récupération des clés :</strong> Directement auprès de {owner.firstName} pour obtenir tous les conseils.
          </p>
        </div>

        {/* Bouton d'action compact */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-xs border-primary-soft text-primary hover:bg-primary-soft/20 h-8"
        >
          Comment ça marche ?
        </Button>
      </CardContent>
    </Card>
  );
}
