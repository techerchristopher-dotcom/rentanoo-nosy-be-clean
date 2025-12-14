import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Car, Calendar, Settings, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProfileService } from "@/services/supabase/profile";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { Vehicle, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OwnerVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [pendingAvailabilityChange, setPendingAvailabilityChange] = useState<{vehicleId: string, newValue: boolean} | null>(null);
  const [updatingVehicle, setUpdatingVehicle] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const checkActiveReservations = async (vehicleId: string) => {
    try {
      // Vérifier s'il y a des réservations actives pour ce véhicule
      const { data, error } = await supabase
        .from('reservations')
        .select('id, status, start_date, end_date')
        .eq('vehicle_id', vehicleId)
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

      return hasActive;
    } catch (error) {
      console.error("Erreur lors de la vérification des réservations:", error);
      return false;
    }
  };

  const handleAvailabilityChange = async (vehicleId: string, newValue: boolean) => {
    // Si on désactive la disponibilité, demander confirmation
    if (!newValue) {
      const hasActive = await checkActiveReservations(vehicleId);
      
      if (hasActive) {
        toast({
          title: "Impossible de désactiver",
          description: "Ce véhicule a des réservations actives ou futures. Annulez d'abord les réservations.",
          variant: "destructive",
        });
        return;
      }

      setPendingAvailabilityChange({ vehicleId, newValue });
      setShowAvailabilityDialog(true);
    } else {
      // Si on active, pas de confirmation nécessaire
      await saveVehicleStatus(vehicleId, newValue);
    }
  };

  const saveVehicleStatus = async (vehicleId: string, isAvailable: boolean) => {
    setUpdatingVehicle(vehicleId);

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ available: isAvailable })
        .eq('id', vehicleId);

      if (error) {
        console.error("Erreur lors de la sauvegarde du statut:", error);
        toast({
          title: "Erreur",
          description: `Impossible de sauvegarder le statut: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      // Mettre à jour l'état local
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, status: isAvailable ? "active" : "inactive" }
          : vehicle
      ));

      toast({
        title: "Statut mis à jour",
        description: `Le véhicule est maintenant ${isAvailable ? 'disponible' : 'indisponible'}`,
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du statut:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setUpdatingVehicle(null);
    }
  };

  const confirmAvailabilityChange = async () => {
    if (pendingAvailabilityChange) {
      await saveVehicleStatus(pendingAvailabilityChange.vehicleId, pendingAvailabilityChange.newValue);
    }
    setShowAvailabilityDialog(false);
    setPendingAvailabilityChange(null);
  };

  const cancelAvailabilityChange = () => {
    setShowAvailabilityDialog(false);
    setPendingAvailabilityChange(null);
  };

  const handleAddVehicle = () => {
    // Rediriger vers le formulaire complet avec paramètre pour propriétaire existant
    navigate("/rent-my-car/register?existingOwner=true");
  };

  const loadData = async () => {
    try {
      const userResult = await ProfileService.getCurrentUserProfile();
      if (!userResult.data) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour accéder à cette page",
          variant: "destructive",
        });
        return;
      }

      setCurrentUser(userResult.data);
      
      const vehiclesResult = await SupabaseVehiclesService.getOwnerVehicles(userResult.data.id);
      if (vehiclesResult.error) {
        toast({
          title: "Erreur",
          description: vehiclesResult.error,
          variant: "destructive",
        });
        setVehicles([]);
      } else {
        // Mapper les véhicules Supabase vers le format de l'application
        const mappedVehicles = vehiclesResult.data.map(supabaseVehicle => ({
          id: supabaseVehicle.id,
          ownerId: supabaseVehicle.owner_id || "",
          license: supabaseVehicle.id.substring(0, 8).toUpperCase(), // Temporaire
          brand: supabaseVehicle.brand,
          model: supabaseVehicle.model,
          color: supabaseVehicle.color || "Non spécifié",
          fuel: (supabaseVehicle.fuel_type as any) || "gasoline",
          year: supabaseVehicle.year,
          hasAC: true, // À ajouter dans la DB plus tard
          doors: supabaseVehicle.seats || 5,
          transmission: (supabaseVehicle.transmission as any) || "manual",
          mileage: supabaseVehicle.mileage || 0,
          dailyPrice: supabaseVehicle.price_per_day,
          currency: "EUR" as const,
          latitude: 0, // À ajouter dans la DB plus tard
          longitude: 0, // À ajouter dans la DB plus tard
          status: supabaseVehicle.available ? "active" : "inactive",
          imageUrl: supabaseVehicle.image_url || null,
          createdAt: supabaseVehicle.created_at || new Date().toISOString(),
          updatedAt: supabaseVehicle.updated_at || new Date().toISOString(),
        }));
        setVehicles(mappedVehicles);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger vos véhicules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Accès refusé</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-4">Vous devez être connecté pour accéder à cette page.</p>
                <Link to="/auth/login">
                  <Button>Se connecter</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Mes véhicules</h1>
              <p className="text-muted-foreground">
                Gérez vos véhicules et vos réservations
              </p>
            </div>
          </div>

          {currentUser.kycStatus !== "verified" && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-amber-600" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-200">
                      Vérification KYC requise
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Pour publier vos véhicules, vous devez compléter votre vérification d'identité.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {vehicles.length === 0 ? (
            <Card className="max-w-lg mx-auto text-center">
              <CardContent className="pt-12 pb-12">
                <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucun véhicule</h3>
                <p className="text-muted-foreground mb-6">
                  Commencez par ajouter votre premier véhicule à la plateforme.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className="hover:shadow-xl hover:scale-105 transition-all duration-300 relative overflow-hidden group border-0 shadow-lg">
                  {/* Fond avec photo */}
                  {vehicle.imageUrl && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${vehicle.imageUrl})`,
                        opacity: '0.60'
                      }}
                    />
                  )}
                  
                  {/* Overlay avec dégradé moderne */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/70 to-white/90 group-hover:from-white/80 group-hover:via-white/65 group-hover:to-white/85 transition-all duration-300" />
                  
                  {/* Contenu de la carte */}
                  <div className="relative z-10 p-6">
                    {/* Header avec badge et toggle */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
                          {vehicle.brand} {vehicle.model}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">
                          {vehicle.license}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <StatusBadge status={vehicle.status} />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`availability-${vehicle.id}`}
                            checked={vehicle.status === 'active'}
                            onCheckedChange={(checked) => handleAvailabilityChange(vehicle.id, checked)}
                            disabled={updatingVehicle === vehicle.id}
                            className="data-[state=checked]:bg-green-500"
                          />
                          {updatingVehicle === vehicle.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informations du véhicule */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Prix/jour</p>
                        <p className="text-lg font-bold text-gray-900">{vehicle.dailyPrice} {vehicle.currency}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Année</p>
                        <p className="text-lg font-bold text-gray-900">{vehicle.year}</p>
                      </div>
                    </div>

                    {/* Carburant */}
                    <div className="mb-6">
                      <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Carburant</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{vehicle.fuel}</p>
                      </div>
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="space-y-3">
                      <Link to={`/me/owner/vehicles/${vehicle.id}/manage`}>
                        <Button 
                          variant="outline" 
                          className="w-full bg-white/90 hover:bg-white border-gray-300 hover:border-gray-400 hover:shadow-md transition-all duration-200 font-medium"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Gérer le véhicule
                        </Button>
                      </Link>
                      <Link to={`/vehicle/${vehicle.license}`}>
                        <Button 
                          variant="ghost" 
                          className="w-full bg-white/70 hover:bg-white/90 text-gray-700 hover:text-gray-900 hover:shadow-sm transition-all duration-200"
                        >
                          Voir la fiche publique
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Carte d'ajout de véhicule */}
              <Card 
                className="hover:shadow-xl hover:scale-105 transition-all duration-300 relative overflow-hidden group border-2 border-dashed border-gray-300 hover:border-primary/50 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer"
                onClick={handleAddVehicle}
              >
                <div className="relative z-10 p-6 h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="bg-white/80 rounded-full p-6 mb-4 group-hover:bg-white/90 transition-all duration-300">
                    <Plus className="h-12 w-12 text-gray-400 group-hover:text-primary transition-colors duration-300" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-700 mb-2 group-hover:text-gray-900 transition-colors">
                    Ajouter un véhicule
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-6 group-hover:text-gray-600 transition-colors max-w-xs">
                    Cliquez ici pour ajouter un nouveau véhicule à votre flotte et commencer à le louer
                  </p>
                  
                  <div className="bg-white/60 rounded-lg p-4 backdrop-blur-sm border border-white/50 w-full">
                    <div className="flex items-center justify-center space-x-2 text-gray-600">
                      <Car className="h-4 w-4" />
                      <span className="text-sm font-medium">Nouveau véhicule</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Fenêtre de confirmation pour la disponibilité */}
      <AlertDialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la modification de disponibilité</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                En désactivant la disponibilité de votre véhicule :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Il ne sera plus visible dans les résultats de recherche</li>
                <li>Les clients ne pourront plus effectuer de nouvelles réservations</li>
                <li>Les réservations existantes restent valides</li>
              </ul>
              <p className="font-medium">
                Êtes-vous sûr de vouloir continuer ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAvailabilityChange}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAvailabilityChange}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmer la désactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Footer />
    </>
  );
};

export default OwnerVehicles;