import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProfileService } from "@/services/supabase/profile";
import { User as UserType } from "@/types";

export default function ProfileTest() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Début du chargement du profil...');
        setIsLoading(true);
        setError(null);

        const { data, error: profileError } = await ProfileService.getCurrentUserProfile();
        
        if (profileError) {
          console.error('Erreur lors du chargement:', profileError);
          setError(profileError);
          toast({
            title: "Erreur",
            description: `Erreur lors du chargement: ${profileError}`,
            variant: "destructive",
          });
        } else if (data) {
          console.log('Profil chargé avec succès:', data);
          setCurrentUser(data);
        } else {
          console.log('Aucun profil trouvé');
          setError('Aucun profil trouvé');
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        toast({
          title: "Erreur",
          description: "Une erreur inattendue s'est produite.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chargement du profil...</h1>
          <p className="text-gray-600">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Profil non trouvé</h1>
          <p className="text-gray-600">Aucun profil utilisateur trouvé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test du Profil</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Informations du profil</h2>
          
          <div className="space-y-3">
            <div>
              <strong>ID:</strong> {currentUser.id}
            </div>
            <div>
              <strong>Email:</strong> {currentUser.email}
            </div>
            <div>
              <strong>Prénom:</strong> {currentUser.firstName}
            </div>
            <div>
              <strong>Nom:</strong> {currentUser.lastName}
            </div>
            <div>
              <strong>Téléphone:</strong> {currentUser.phone || 'Non renseigné'}
            </div>
            <div>
              <strong>Bio:</strong> {currentUser.bio || 'Non renseignée'}
            </div>
            <div>
              <strong>Rôles:</strong> {currentUser.roles.join(', ')}
            </div>
            <div>
              <strong>Statut KYC:</strong> {currentUser.kycStatus}
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Recharger le test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
