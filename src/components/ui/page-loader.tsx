/**
 * Composant de chargement simple pour Suspense fallbacks
 * Utilisé lors du lazy-loading des routes
 */
import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

