import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft, Car } from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const { t } = useTranslation("common");
  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Seo
        title={t("seo.notFound.title")}
        description={t("seo.notFound.description")}
      />
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 group">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-lagoon rounded-2xl shadow-lagoon group-hover:shadow-soft transition-shadow">
              <Car className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-lagoon bg-clip-text text-transparent">
              Rentanoo
            </span>
          </Link>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-8">
            {/* 404 Graphic */}
            <div className="mb-8">
              <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Page non trouvée
              </h1>
              <p className="text-muted-foreground">
                Oups ! Cette page n'existe pas ou a été déplacée.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <Link to="/" className="block">
                <Button className="w-full bg-gradient-lagoon hover:opacity-90 shadow-lagoon">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </Link>
              
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Page précédente
              </Button>
            </div>

            {/* Helpful Links */}
            <div className="mt-8 pt-6 border-t space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Pages utiles :
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <Link
                  to="/"
                  className="text-primary hover:underline"
                >
                  Rechercher un véhicule
                </Link>
                <Link
                  to="/auth/login"
                  className="text-primary hover:underline"
                >
                  Se connecter
                </Link>
                <Link
                  to="/auth/register"
                  className="text-primary hover:underline"
                >
                  Créer un compte
                </Link>
                <Link
                  to="/legal"
                  className="text-primary hover:underline"
                >
                  Mentions légales
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground mt-6">
          Rentanoo - Location de scooters à Nosy Be
        </p>
      </div>
    </div>
  );
};

export default NotFound;