import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Car, Calendar, CreditCard, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersService, VehiclesService, BookingsService } from "@/services";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    publishedVehicles: 0,
    pendingBookings: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersResult, vehiclesResult, bookingsResult] = await Promise.all([
        UsersService.getAllUsers(),
        VehiclesService.getAllVehicles(),
        BookingsService.getAllBookings(),
      ]);

      const publishedVehicles = vehiclesResult.data.filter((v) => v.status === "published");
      const pendingBookings = bookingsResult.data.filter((b) => b.status === "pending");

      setStats({
        users: usersResult.data.length,
        publishedVehicles: publishedVehicles.length,
        pendingBookings: pendingBookings.length,
        totalBookings: bookingsResult.data.length,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Administration</h1>
        <p className="text-muted-foreground">Tableau de bord et gestion de la plateforme Rentanoo</p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link to="/admin/bookings/new" className="text-primary font-medium hover:underline">
            Nouvelle réservation (agence)
          </Link>
          <span className="mx-2 text-border">·</span>
          <Link to="/admin/drafts" className="text-primary font-medium hover:underline">
            Mes brouillons
          </Link>
          <span className="mx-2 text-border">·</span>
          <Link to="/admin/planning" className="text-primary font-medium hover:underline">
            Planning
          </Link>
          <span className="mx-2 text-border">·</span>
          <Link to="/admin/bookings" className="text-primary font-medium hover:underline">
            Toutes les réservations
          </Link>
          <span className="mx-2 text-border">·</span>
          <span>Flux métier branché au bloc 2</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">Total des comptes créés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Véhicules publiés</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedVehicles}</div>
            <p className="text-xs text-muted-foreground">Disponibles à la location</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations en attente</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">À traiter par les propriétaires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total réservations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">Depuis le lancement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/users">
          <Card className="hover:shadow-soft transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Utilisateurs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestion des utilisateurs, vérification KYC</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/vehicles">
          <Card className="hover:shadow-soft transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-primary" />
                <span>Véhicules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Modération et gestion des véhicules</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/bookings">
          <Card className="hover:shadow-soft transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Réservations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Suivi et gestion des réservations</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/payments">
          <Card className="hover:shadow-soft transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Paiements</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Transactions et remboursements</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
