import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Car } from "lucide-react";

export default function Callback() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          toast({
            title: "Erreur de connexion",
            description: "Une erreur s'est produite lors de la connexion",
            variant: "destructive",
          });
          navigate("/auth/login");
          return;
        }

        if (session?.user) {
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur MayCar !",
          });
          navigate("/");
        } else {
          toast({
            title: "Erreur",
            description: "Aucune session trouvée",
            variant: "destructive",
          });
          navigate("/auth/login");
        }
      } catch (error) {
        console.error("Unexpected auth error:", error);
        toast({
          title: "Erreur",
          description: "Une erreur inattendue s'est produite",
          variant: "destructive",
        });
        navigate("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-lagoon rounded-2xl shadow-lagoon mb-4 animate-pulse">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connexion en cours...
          </h2>
          <p className="text-muted-foreground">
            Veuillez patienter pendant que nous finalisons votre connexion
          </p>
        </div>
      </div>
    );
  }

  return null;
}