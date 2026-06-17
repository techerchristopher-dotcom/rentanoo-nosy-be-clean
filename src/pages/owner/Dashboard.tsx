import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Car, 
  Calendar, 
  MessageCircle, 
  DollarSign,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/footer";
import { ProfileService } from "@/services/supabase/profile";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/types";
import { DualPrice } from "@/components/currency/DualPrice";
import { OwnerSidebar } from "@/features/owner-portal/components/OwnerSidebar";

interface DashboardStats {
  totalVehicles: number;
  activeBookings: number;
  monthlyRevenue: number;
  pendingRequests: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    activeBookings: 0,
    monthlyRevenue: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await ProfileService.getCurrentUserProfile();
      if (result.error || !result.data) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        navigate('/auth/login');
        return;
      }
      setCurrentUser(result.data);
      await loadDashboardStats(result.data.id, result.data.isAdmin === true);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async (ownerId: string, isAdmin: boolean) => {
    try {
      // 1. Compter les véhicules (admin → tous les véhicules de la plateforme)
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      let vehiclesQuery = supabase.from('vehicles').select('id');
      if (!isAdmin) {
        vehiclesQuery = vehiclesQuery.eq('owner_id', ownerId);
      }
      const { data: vehicles, error: vehiclesError } = await vehiclesQuery;

      if (vehiclesError) {
        console.error('Erreur récupération véhicules:', vehiclesError);
      }

      const vehicleIdList = vehicles?.map(v => v.id) || [];

      // 2. Compter les réservations actives (confirmed, active)
      // Admin : pas de filtre sur vehicle_id ; sinon : seulement sur les véhicules du propriétaire
      let activeBookingsQuery = supabase
        .from('bookings')
        .select('id, total_price, created_at')
        .in('status', ['confirmed', 'active']);
      if (!isAdmin) {
        activeBookingsQuery = activeBookingsQuery.in('vehicle_id', vehicleIdList);
      }
      const { data: activeBookings, error: bookingsError } = await activeBookingsQuery;

      if (bookingsError) {
        console.error('Erreur récupération réservations:', bookingsError);
      }

      // 3. Calculer le CA du mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let monthlyQuery = supabase
        .from('bookings')
        .select('total_price')
        .eq('status', 'confirmed')
        .gte('created_at', startOfMonth.toISOString());
      if (!isAdmin) {
        monthlyQuery = monthlyQuery.in('vehicle_id', vehicleIdList);
      }
      const { data: monthlyBookings, error: monthlyError } = await monthlyQuery;

      if (monthlyError) {
        console.error('Erreur récupération CA mensuel:', monthlyError);
      }

      // 4. Compter les demandes en attente
      let pendingQuery = supabase
        .from('bookings')
        .select('id')
        .eq('status', 'pending');
      if (!isAdmin) {
        pendingQuery = pendingQuery.in('vehicle_id', vehicleIdList);
      }
      const { data: pendingBookings, error: pendingError } = await pendingQuery;

      if (pendingError) {
        console.error('Erreur récupération demandes en attente:', pendingError);
      }

      setStats({
        totalVehicles: vehicles?.length || 0,
        activeBookings: activeBookings?.length || 0,
        monthlyRevenue: monthlyBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
        pendingRequests: pendingBookings?.length || 0
      });

    } catch (error) {
      console.error('Erreur chargement stats dashboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-6">
            <OwnerSidebar />
            <main className="flex-1 min-w-0 flex items-center justify-center h-64">
              <p className="text-muted-foreground">Chargement...</p>
            </main>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-6">
          <OwnerSidebar />
          <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Mon Dashboard
          </h1>
          <p className="text-muted-foreground">
            Gérez vos véhicules, réservations, litiges et commissions
          </p>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Total véhicules */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Véhicules en location
              </CardTitle>
              <Car className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalVehicles}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Véhicules publiés
              </p>
            </CardContent>
          </Card>

          {/* Réservations actives */}
          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Réservations actives
              </CardTitle>
              <Calendar className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                En cours ou confirmées
              </p>
            </CardContent>
          </Card>

          {/* Demandes en attente */}
          <Card className="border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Demandes en attente
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Nécessitent votre attention
              </p>
            </CardContent>
          </Card>

          {/* CA ce mois */}
          <Card className="border-l-4 border-l-success">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CA ce mois
              </CardTitle>
              <DollarSign className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <DualPrice
                amountMga={stats.monthlyRevenue}
                variant="admin"
                primaryClassName="text-3xl font-bold tabular-nums"
                secondaryClassName="text-sm text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Revenus du mois en cours
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Grid 4 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Mes véhicules */}
          <Card className="cursor-pointer hover:shadow-lagoon transition-all duration-300 group"
                onClick={() => navigate('/me/owner/vehicles')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl">Mes véhicules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gérez vos véhicules en location
              </p>
            </CardContent>
          </Card>

          {/* Mes réservations */}
          <Card className="cursor-pointer hover:shadow-lagoon transition-all duration-300 group"
                onClick={() => navigate('/me/owner/bookings')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-green-600/10 rounded-lg">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl">Mes réservations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consultez vos demandes de location
              </p>
            </CardContent>
          </Card>

          {/* Mes litiges */}
          <Card className="cursor-pointer hover:shadow-lagoon transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <MessageCircle className="h-8 w-8 text-warning" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-warning group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl">Mes litiges</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gérez vos conflits et réclamations
              </p>
            </CardContent>
          </Card>

          {/* Mes commissions */}
          <Card className="cursor-pointer hover:shadow-lagoon transition-all duration-300 group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-success/10 rounded-lg">
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-success group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-xl">Mes commissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consultez vos revenus et paiements
              </p>
            </CardContent>
          </Card>

        </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

