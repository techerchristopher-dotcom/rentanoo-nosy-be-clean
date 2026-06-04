import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Clock, Car } from 'lucide-react';
import { VehiclesService, UsersService, BookingsService } from '@/services';
import { ProfileService } from '@/services/supabase/profile';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle, User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { ClientMgaPrice } from '@/components/currency/ClientMgaPrice';

const MessageToOwners = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const vehicleIds = searchParams.get('vehicles')?.split(',') || [];
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';

  useEffect(() => {
    const loadData = async () => {
      try {
        // Récupérer l'utilisateur connecté
        console.log('🔍 Récupération de l\'utilisateur connecté...');
        
        const profileResult = await ProfileService.getCurrentUserProfile();
        
        if (profileResult.error || !profileResult.data) {
          console.error('Utilisateur non connecté:', profileResult.error);
          toast({
            title: "Erreur",
            description: "Vous devez être connecté pour faire une réservation",
            variant: "destructive",
          });
          navigate('/auth/login');
          return;
        }
        
        const currentUser = profileResult.data;
        setCurrentUser(currentUser);
        console.log('✅ Utilisateur connecté:', currentUser);

        // Récupérer tous les véhicules et utilisateurs
        const [vehiclesResponse, usersResponse] = await Promise.all([
          VehiclesService.getAllVehicles(),
          UsersService.getAllUsers()
        ]);

        // Filtrer les véhicules sélectionnés
        const selectedVehicles = vehiclesResponse.data.filter(v => 
          vehicleIds.includes(v.id)
        );

        // Récupérer les propriétaires uniques
        const ownerIds = [...new Set(selectedVehicles.map(v => v.ownerId))];
        const vehicleOwners = usersResponse.data.filter(u => 
          ownerIds.includes(u.id) && u.roles.includes('owner')
        );

        setVehicles(selectedVehicles);
        setOwners(vehicleOwners);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (vehicleIds.length > 0) {
      loadData();
    } else {
      navigate('/');
    }
  }, [vehicleIds, navigate]);

  const handleSendRequest = async () => {
    if (!message.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir un message pour les propriétaires",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Erreur",
        description: "Utilisateur non connecté",
        variant: "destructive",
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Erreur",
        description: "Dates de réservation manquantes",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      console.log('🚀 Création des réservations...');
      console.log('📝 Message pour les propriétaires:', message.trim());
      
      // Créer une réservation pour chaque véhicule sélectionné
      // Note: Le message sera intégré dans le système de notifications plus tard
      const bookingPromises = vehicles.map(async (vehicle) => {
        const bookingResult = await BookingsService.createBooking({
          vehicleId: vehicle.id,
          renterId: currentUser.id,
          startDate: startDate,
          endDate: endDate
        });
        
        if (!bookingResult.success) {
          console.error(`Erreur réservation véhicule ${vehicle.id}:`, bookingResult.message);
          throw new Error(`Erreur pour le véhicule ${vehicle.brand} ${vehicle.model}`);
        }
        
        return bookingResult.data;
      });

      // Attendre que toutes les réservations soient créées
      const bookings = await Promise.all(bookingPromises);
      
      console.log('✅ Réservations créées:', bookings);
      
      toast({
        title: "Réservations créées !",
        description: `${bookings.length} réservation${bookings.length > 1 ? 's' : ''} créée${bookings.length > 1 ? 's' : ''} avec succès pour ${currentUser.firstName} ${currentUser.lastName}`,
      });

      // Rediriger vers les réservations de l'utilisateur
      navigate('/me/renter/bookings');
    } catch (error) {
      console.error('Erreur lors de la création des réservations:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer les réservations",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Demande de location
            </h1>
            <h2 className="text-xl text-muted-foreground">
              Envoyer un message aux propriétaires
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Texte d'aide */}
              <Card>
                <CardContent className="p-6">
                  <p className="text-foreground leading-relaxed">
                    Êtes-vous flexible sur les horaires ? Est-ce que vous prenez l'avion ? 
                    Avez-vous une barge à prendre ? Accordez-vous avec le propriétaire sur 
                    le lieu et l'heure exacts de rendez-vous pour récupérer le véhicule.
                  </p>
                </CardContent>
              </Card>

              {/* Informations de l'utilisateur connecté */}
              {currentUser && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      👤 Utilisateur connecté
                    </h3>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-green-500 text-white font-semibold">
                          {currentUser.firstName[0]}{currentUser.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {currentUser.email}
                        </p>
                        <p className="text-sm text-green-600 font-medium">
                          Statut KYC: {currentUser.kycStatus}
                        </p>
                        <p className="text-xs text-green-600 font-medium mt-1">
                          ✅ Prêt à créer des réservations
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Zone de message */}
              <Card>
                <CardContent className="p-6">
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-3">
                    Votre message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Bonjour..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-sm text-muted-foreground mt-3">
                    Ce message sera envoyé à {owners.length} propriétaire{owners.length > 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              {/* Avatars des propriétaires */}
              {owners.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Propriétaires concernés
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {owners.map((owner) => (
                        <div key={owner.id} className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src="" alt={`${owner.firstName} ${owner.lastName}`} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {owner.firstName[0]}{owner.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {owner.firstName} {owner.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Propriétaire
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Colonne de droite - Récapitulatif */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Récapitulatif de la location
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Dates */}
                    <div className="flex items-start gap-3">
                      <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Début</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(startDate)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {formatTime(startDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-start gap-3">
                      <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Fin</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(endDate)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {formatTime(endDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Kilométrage */}
                    <div className="flex items-start gap-3">
                      <Car className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Kilométrage</p>
                        <p className="text-sm text-muted-foreground">
                          Kilométrage illimité
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des véhicules sélectionnés */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Véhicules sélectionnés
                  </h3>
                  <div className="space-y-3">
                    {vehicles.map((vehicle, index) => (
                      <div key={vehicle.id}>
                        {index > 0 && <Separator className="my-3" />}
                        <div className="text-sm">
                          <p className="font-medium text-foreground">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-muted-foreground">
                            {vehicle.year} • {vehicle.color}
                          </p>
                          <div className="mt-1">
                            <ClientMgaPrice
                              amountMga={vehicle.dailyPrice}
                              className="items-start text-left"
                              primaryClassName="text-primary font-semibold text-sm"
                              secondaryClassName="text-xs text-muted-foreground"
                              secondarySuffix=" / jour"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bouton d'envoi */}
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={handleSendRequest}
              disabled={sending || !message.trim()}
              size="lg"
              className="px-8"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Envoi en cours...
                </>
              ) : (
                'Envoyer la demande de location'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageToOwners;