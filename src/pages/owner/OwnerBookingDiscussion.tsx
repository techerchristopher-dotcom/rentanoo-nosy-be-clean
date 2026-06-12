import { getPublicListingPath } from "@/utils/vehicleType";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft,
  MapPin, 
  Euro, 
  Users,
  Calendar,
  Fuel,
  Settings,
  Wind,
  Clock,
  Info,
  CheckCircle,
  Car,
  Send,
  MessageCircle,
  User,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/layout/footer";
import { Vehicle, Photo, Message as MessageType, Conversation, User as AppUser } from "@/types";
import { VehiclesService, PhotosService, ConversationsService, MessagesService } from "@/services";
import { PhotoService } from "@/services/supabase/photos";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { ProfileService } from "@/services/supabase/profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";
import { calcRenterTotal } from "@/utils/serviceFees";

const OwnerBookingDiscussion = () => {
  console.log('🏠 [DEBUG] OwnerBookingDiscussion component rendering');
  
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { formatClient, formatClientInline } = useExchangeRate();
  
  console.log('🏠 [DEBUG] Conversation ID:', conversationId);
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleImageUrl, setVehicleImageUrl] = useState<string | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<{ [key: string]: Photo }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [renter, setRenter] = useState<AppUser | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [isConversationCancelled, setIsConversationCancelled] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      console.log('🏠 [DEBUG] ===== DÉBUT loadData =====');
      console.log('🏠 [DEBUG] Conversation ID:', conversationId);
      
      if (!conversationId) {
        console.log('❌ [DEBUG] Pas de conversation ID, redirection vers /me/owner/requests');
        navigate('/me/owner/requests');
        return;
      }

      try {
        // Charger l'utilisateur actuel (propriétaire)
        const profileResult = await ProfileService.getCurrentUserProfile();
        if (profileResult.error || !profileResult.data) {
          console.log('❌ [DEBUG] Utilisateur non connecté');
          toast({
            title: "Erreur",
            description: "Vous devez être connecté pour accéder à cette page",
            variant: "destructive",
          });
          navigate('/auth/login');
          return;
        }
        setCurrentUserId(profileResult.data.id);
        setCurrentUser(profileResult.data);

        // Récupérer la conversation
        const convResult = await ConversationsService.getConversationById(conversationId);
        if (convResult.error || !convResult.data) {
          console.log('❌ [DEBUG] Conversation non trouvée');
          toast({
            title: "Conversation non trouvée",
            description: "Cette conversation n'existe pas ou n'est plus disponible.",
            variant: "destructive",
          });
          navigate('/me/owner/requests');
          return;
        }

        setConversation(convResult.data);

        // Vérifier le statut de la réservation si conversation liée à un booking
        if (convResult.data.bookingId) {
          try {
            const { data: booking } = await supabase
              .from('bookings')
              .select('status')
              .eq('id', convResult.data.bookingId)
              .single();

            if (booking) {
              setBookingStatus(booking.status);
              setIsConversationCancelled(booking.status === 'cancelled' || booking.status === 'rejected');
            }
          } catch (error) {
            console.error('Erreur chargement statut réservation:', error);
          }
        }

        // Récupérer les détails du locataire
        const renterResult = await ProfileService.getUserProfile(convResult.data.renterId);
        if (!renterResult.error && renterResult.data) {
          setRenter(renterResult.data);
        }

        console.log('🚗 [DEBUG] Chargement du véhicule...');
        
        // Charger le véhicule
        const allVehicles = await SupabaseVehiclesService.getAvailableVehicles();
        const foundVehicle = allVehicles.find(v => v.id === convResult.data.vehicleId);
        
        if (!foundVehicle) {
          console.log('❌ [DEBUG] Véhicule non trouvé');
          toast({
            title: "Véhicule non trouvé",
            description: "Ce véhicule n'existe pas ou n'est plus disponible.",
            variant: "destructive",
          });
          navigate('/me/owner/requests');
          return;
        }

        // Convertir le véhicule Supabase vers l'interface Vehicle
        const mappedVehicle: Vehicle = {
          id: foundVehicle.id,
          ownerId: foundVehicle.owner_id || "",
          license: foundVehicle.id.substring(0, 8).toUpperCase(),
          brand: foundVehicle.brand,
          model: foundVehicle.model,
          color: foundVehicle.color || "Non spécifié",
          fuel: (foundVehicle.fuel_type as any) || "gasoline",
          year: foundVehicle.year,
          hasAC: true,
          doors: foundVehicle.seats || 5,
          transmission: (foundVehicle.transmission as any) || "manual",
          mileage: foundVehicle.mileage || 0,
          dailyPrice: foundVehicle.price_per_day,
          currency: "EUR",
          latitude: 0,
          longitude: 0,
          status: "available" as any,
          description: foundVehicle.description || undefined,
          location: foundVehicle.location || undefined,
          createdAt: foundVehicle.created_at || new Date().toISOString(),
          updatedAt: foundVehicle.updated_at || new Date().toISOString(),
          vehicleType: (foundVehicle.vehicle_type as Vehicle["vehicleType"]) ?? "car",
        };

        setVehicleImageUrl(foundVehicle.image_url || null);
        setVehicle(mappedVehicle);

        // Charger les photos du véhicule
        try {
          const vehiclePhotos = await PhotoService.getVehiclePhotos(foundVehicle.id);
          if (vehiclePhotos.data && vehiclePhotos.data.length > 0) {
            const primaryPhoto = vehiclePhotos.data.find(photo => photo.isPrimary) || vehiclePhotos.data[0];
            const convertedPhoto = {
              id: primaryPhoto.id,
              vehicleId: primaryPhoto.vehicleId,
              url: primaryPhoto.url,
              angle: primaryPhoto.photoType === 'frontLeft' ? 'front' :
                     primaryPhoto.photoType === 'profileLeft' ? 'side' :
                     primaryPhoto.photoType === 'interior' ? 'interior' : 'other',
              position: primaryPhoto.position,
              isPrimary: primaryPhoto.isPrimary,
              createdAt: new Date().toISOString()
            };
            setVehiclePhotos({ [foundVehicle.id]: convertedPhoto });
          }
        } catch (photoError) {
          console.error('📸 [DEBUG] Erreur PhotoService:', photoError);
        }

        // S'abonner aux changements de messages en temps réel (INSERT + DELETE) AVANT de charger les messages
        // Pour éviter d'écraser les nouveaux messages arrivés pendant le chargement
        console.log('📡 [OwnerBookingDiscussion] Abonnement temps réel pour conversation:', conversationId);
        const subscription = MessagesService.subscribeToMessagesWithCallbacks({
          conversationId: conversationId,
          onInsert: (newMessage) => {
            console.log('📩 [OwnerBookingDiscussion] Nouveau message reçu en temps réel:', newMessage);
            setMessages((prev) => {
              console.log('📝 [OwnerBookingDiscussion] État messages AVANT ajout:', prev.length);
              const updated = [...prev, newMessage];
              console.log('📝 [OwnerBookingDiscussion] État messages APRÈS ajout:', updated.length);
              return updated;
            });
          },
          onDelete: (deletedMessageId) => {
            // Retirer le message supprimé de la liste
            setMessages((prev) => prev.filter(msg => msg.id !== deletedMessageId));
            console.log('🗑️ [OwnerBookingDiscussion] Message supprimé en temps réel:', deletedMessageId);
          }
        });
        console.log('✅ [OwnerBookingDiscussion] Abonnement temps réel créé:', subscription);

        // Charger les messages existants APRÈS avoir créé la subscription
        const messagesResult = await MessagesService.getConversationMessages(conversationId);
        if (!messagesResult.error && messagesResult.data) {
          console.log('📥 [OwnerBookingDiscussion] Messages chargés depuis DB:', messagesResult.data.length);
          // Utiliser un callback pour éviter de perdre les messages arrivés pendant le chargement
          setMessages((prev) => {
            if (prev.length > 0) {
              // Si messages déjà reçus en temps réel, merger avec ceux de la DB
              const existingIds = new Set(prev.map(m => m.id));
              const newFromDB = messagesResult.data.filter(m => !existingIds.has(m.id));
              console.log('🔄 [OwnerBookingDiscussion] Merger messages DB avec temps réel:', prev.length, '→', prev.length + newFromDB.length);
              return [...prev, ...newFromDB];
            } else {
              console.log('📥 [OwnerBookingDiscussion] Première charge de messages depuis DB:', messagesResult.data.length);
              return messagesResult.data;
            }
          });
        }

        return () => {
          MessagesService.unsubscribe(subscription);
        };

      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les informations de la conversation.",
          variant: "destructive",
        });
        navigate('/me/owner/requests');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [conversationId, navigate]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation || !currentUserId) return;
    
    try {
      const result = await MessagesService.sendMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
        content: message.trim(),
        messageType: 'text',
      });

      if (result.error) {
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer le message",
          variant: "destructive",
        });
        return;
      }

      setMessage("");
      
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé au locataire",
      });
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleAcceptRequest = async () => {
    try {
      // TODO: Implémenter l'acceptation de la demande
      toast({
        title: "Demande acceptée",
        description: "Vous avez accepté la demande de location",
      });
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async () => {
    try {
      // TODO: Implémenter le refus de la demande
      toast({
        title: "Demande refusée",
        description: "Vous avez refusé la demande de location",
      });
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!vehicle || !conversation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">Conversation non trouvée</p>
              <Button onClick={() => navigate('/me/owner/requests')}>
                Retour aux demandes
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/me/owner/requests')}
            className="mr-4 hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux demandes
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              Discussion avec le locataire
            </h1>
            <Badge className="mt-2 bg-blue-600">
              <Car className="h-3 w-3 mr-1" />
              Vous êtes le propriétaire
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-sm">
            <TabsTrigger value="summary" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4" />
              Résumé
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <MessageCircle className="h-4 w-4" />
              Conversation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Interface de conversation style Messenger - INVERSÉE */}
            <div className="max-w-4xl mx-auto">
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="border-b bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-600 text-white font-semibold">
                        {renter?.firstName?.[0]}{renter?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {renter?.firstName} {renter?.lastName}
                      </h3>
                      <p className="text-sm text-slate-500">Locataire</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Message du locataire (GAUCHE) */}
                  <div className="flex justify-start mb-4">
                    <div className="max-w-xs lg:max-w-md">
                      <div className="bg-green-600 text-white rounded-2xl rounded-bl-md p-4 shadow-sm">
                        <p className="text-sm mb-3">
                          Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :
                        </p>
                        
                        {/* Récapitulatif dans la bulle */}
                        <div className="bg-white/10 rounded-lg p-3 space-y-3">
                          {/* Photo et infos véhicule */}
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-12 bg-white/20 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={vehicleImageUrl || `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=150&fit=crop&crop=center`}
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-semibold text-white">
                                {vehicle.brand} {vehicle.model}
                              </h4>
                              <p className="text-xs text-white/80">
                                {vehicle.color} • {vehicle.year} • ID: {vehicle.license}
                              </p>
                            </div>
                          </div>
                          
                          {/* Dates */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-white/80" />
                              <span className="text-xs text-white/90">
                                Du {formatDate(conversation.createdAt)} au {formatDate(conversation.updatedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-white/80" />
                              <span className="text-xs text-white/90">
                                Départ à {formatTime(conversation.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Prix */}
                          <div className="border-t border-white/20 pt-2">
                            <div className="flex justify-between items-end gap-3">
                              <div className="flex flex-col text-white/80">
                                <span className="text-xs">
                                  {formatClientInline(vehicle.dailyPrice)} × 2 jour(s)
                                </span>
                                <span className="text-[10px] mt-0.5 text-white/60">
                                  {formatClient(vehicle.dailyPrice).secondary} / jour
                                </span>
                              </div>
                              <ClientMgaPrice
                                amountMga={calcRenterTotal(vehicle.dailyPrice * 2)}
                                primaryClassName="font-bold text-lg text-white"
                                secondaryClassName="mt-0.5 text-xs tabular-nums text-white/70"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-white/80 mt-3">
                          Pouvez-vous confirmer la disponibilité ? Merci !
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions du propriétaire */}
                  <div className="border-t pt-4">
                    <div className="flex gap-3 mb-4">
                      <Button
                        onClick={handleAcceptRequest}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accepter la demande
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRejectRequest}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                    </div>
                    
                    {/* Zone de saisie */}
                    {conversation?.status === 'active' ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Tapez votre message..."
                            className="rounded-full border-0 bg-slate-100 pr-12 focus:bg-white focus:ring-2 focus:ring-primary/20"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                          />
                          <Button
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0"
                            onClick={() => setActiveTab("conversation")}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 py-3 rounded-lg">
                        Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversation" className="space-y-6">
            {/* Interface de conversation style Messenger */}
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-600 text-white">
                      {renter?.firstName?.[0]}{renter?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{renter?.firstName} {renter?.lastName}</h3>
                    <p className="text-sm text-muted-foreground">Locataire</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Zone des messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(() => {
                    console.log('🎨 [OwnerBookingDiscussion] RENDERING avec messages.length:', messages.length, messages);
                    return messages.length === 0;
                  })() ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun message pour le moment</p>
                      <p className="text-sm">Commencez la conversation avec le locataire</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isCurrentUser = msg.senderId === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-green-600 text-white'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              isCurrentUser ? 'text-primary-foreground/70' : 'text-white/70'
                            }`}>
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Zone de saisie */}
                {conversation?.status === 'active' ? (
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tapez votre message..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t p-4">
                    <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 py-3 rounded-lg">
                      Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Alerte conversation annulée sticky en bas */}
      {isConversationCancelled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-50 border-t border-orange-200 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">
                  Vous ne pouvez plus discuter. La demande de réservation a été annulée.
                </p>
              </div>
              <Button
                onClick={() => vehicle && navigate(getPublicListingPath(vehicle))}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Nouvelle réservation
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default OwnerBookingDiscussion;
