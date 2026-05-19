import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Car, 
  MessageCircle, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Euro,
  ArrowLeft,
  User,
  MapPin
} from "lucide-react";
import { ProfileService } from "@/services/supabase/profile";
import { ConversationsService } from "@/services/supabase/conversations";
import { MessagesService } from "@/services/supabase/messages";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { toast } from "@/hooks/use-toast";
import type { User as AppUser, Conversation, Message } from "@/types";

interface BookingRequest extends Conversation {
  renter?: AppUser;
  vehicle?: any;
  lastMessage?: Message;
  unreadCount?: number;
}

const OwnerBookingRequests = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Récupérer l'utilisateur connecté
      const profileResult = await ProfileService.getCurrentUserProfile();
      if (profileResult.error || !profileResult.data) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        navigate('/auth/login');
        return;
      }
      setCurrentUser(profileResult.data);
      const isAdmin = profileResult.data.isAdmin === true;

      // Récupérer les conversations du propriétaire (admin → toutes les conversations)
      const conversationsResult = await ConversationsService.getOwnerConversations(
        profileResult.data.id,
        { isAdmin }
      );
      if (conversationsResult.error) {
        console.error('Erreur lors du chargement des conversations:', conversationsResult.error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les demandes",
          variant: "destructive",
        });
        return;
      }

      // Enrichir les conversations avec les détails
      const enrichedRequests = await Promise.all(
        conversationsResult.data.map(async (conversation) => {
          try {
            // Récupérer les détails du locataire
            const renterResult = await ProfileService.getUserProfile(conversation.renterId);
            const renter = renterResult.error ? null : renterResult.data;

            // Récupérer les détails du véhicule
            const vehicles = await SupabaseVehiclesService.getAvailableVehicles();
            const vehicle = vehicles.find(v => v.id === conversation.vehicleId);

            // Récupérer le dernier message
            const messagesResult = await MessagesService.getConversationMessages(conversation.id);
            const lastMessage = messagesResult.error ? null : messagesResult.data[0];

            // Compter les messages non lus
            const unreadMessages = messagesResult.error ? [] : messagesResult.data.filter(m => !m.isRead && m.senderId !== currentUser?.id);
            const unreadCount = unreadMessages.length;

            return {
              ...conversation,
              renter,
              vehicle,
              lastMessage,
              unreadCount
            };
          } catch (error) {
            console.error('Erreur lors de l\'enrichissement de la conversation:', error);
            return {
              ...conversation,
              renter: null,
              vehicle: null,
              lastMessage: null,
              unreadCount: 0
            };
          }
        })
      );

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: BookingRequest) => {
    navigate(`/me/owner/requests/${request.id}/discussion`);
  };

  const handleAcceptRequest = async (request: BookingRequest) => {
    try {
      // TODO: Implémenter l'acceptation de la demande
      toast({
        title: "Demande acceptée",
        description: "La demande a été acceptée avec succès",
      });
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (request: BookingRequest) => {
    try {
      // TODO: Implémenter le refus de la demande
      toast({
        title: "Demande refusée",
        description: "La demande a été refusée",
      });
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive",
      });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Acceptée</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Refusée</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const filteredRequests = requests.filter(request => {
    switch (activeTab) {
      case 'pending':
        return request.status === 'active';
      case 'accepted':
        return request.status === 'closed';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-soft">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des demandes...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/me/owner/bookings')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux réservations
            </Button>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Demandes de location
            </h1>
            <p className="text-muted-foreground">
              Gérez les demandes de location de vos véhicules
            </p>
          </div>

          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Toutes ({requests.length})</TabsTrigger>
              <TabsTrigger value="pending">
                En attente ({requests.filter(r => r.status === 'active').length})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                Acceptées ({requests.filter(r => r.status === 'closed').length})
              </TabsTrigger>
            </TabsList>

            {/* Liste des demandes */}
            <TabsContent value={activeTab} className="mt-6">
              {filteredRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune demande</h3>
                    <p className="text-muted-foreground">
                      {activeTab === 'all' 
                        ? "Vous n'avez encore reçu aucune demande de location"
                        : `Aucune demande ${activeTab === 'pending' ? 'en attente' : 'acceptée'}`
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          {/* Informations du locataire */}
                          <div className="flex items-start space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={request.renter?.avatarUrl} />
                              <AvatarFallback>
                                {request.renter?.firstName?.[0] || 'L'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold">
                                  {request.renter?.firstName && request.renter?.lastName 
                                    ? `${request.renter.firstName} ${request.renter.lastName}`
                                    : 'Locataire'
                                  }
                                </h3>
                                {request.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {request.unreadCount} nouveau{request.unreadCount > 1 ? 'x' : ''}
                                  </Badge>
                                )}
                                {getStatusBadge(request.status)}
                              </div>
                              
                              {/* Véhicule */}
                              <div className="flex items-center space-x-2 mb-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {request.vehicle?.brand} {request.vehicle?.model}
                                </span>
                              </div>
                              
                              {/* Dernier message */}
                              {request.lastMessage && (
                                <div className="flex items-center space-x-2 mb-2">
                                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground truncate max-w-md">
                                    {request.lastMessage.content}
                                  </span>
                                </div>
                              )}
                              
                              {/* Date */}
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(request.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRequest(request)}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Voir
                            </Button>
                            
                            {request.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAcceptRequest(request)}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Accepter
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRejectRequest(request)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Refuser
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerBookingRequests;
