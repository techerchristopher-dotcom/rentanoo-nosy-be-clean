import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary React pour capturer les erreurs de rendu et éviter les écrans blancs
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  componentDidMount() {
    // Capturer les erreurs globales non catchées
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    
    // Capturer les erreurs de chargement de ressources (404, etc.)
    window.addEventListener('error', this.handleResourceError, true);
  }

  componentWillUnmount() {
    // Nettoyer les listeners
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleResourceError, true);
  }

  handleWindowError = (event: ErrorEvent) => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[ErrorBoundary] ❌ Erreur globale capturée (window.onerror)');
    console.error('[ErrorBoundary] 📦 Message:', event.message);
    console.error('[ErrorBoundary] 📋 Source:', event.filename, 'ligne', event.lineno);
    console.error('[ErrorBoundary] 📋 Erreur:', event.error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Créer une erreur à partir de l'événement
    const error = event.error || new Error(event.message || 'Erreur inconnue');
    this.setState({
      hasError: true,
      error,
      errorInfo: null,
    });
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[ErrorBoundary] ❌ Promesse rejetée non catchée (unhandledrejection)');
    console.error('[ErrorBoundary] 📦 Raison:', event.reason);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Créer une erreur à partir de la raison du rejet
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason || 'Promesse rejetée'));
    
    this.setState({
      hasError: true,
      error,
      errorInfo: null,
    });
  };

  handleResourceError = (event: ErrorEvent) => {
    // Capturer uniquement les erreurs de chargement de ressources (404, etc.)
    if (!event.target || !(event.target as HTMLElement).tagName) return;

    const target = event.target as HTMLElement;
    const tagName = target.tagName.toUpperCase();

    // Ignorer IMG : les composants ont déjà onError/fallback, évite de spammer la console
    if (tagName === 'IMG') return;

    // Ignorer LINK rel=icon / apple-touch-icon (icônes favicon)
    if (tagName === 'LINK') {
      const rel = (target as HTMLLinkElement).rel?.toLowerCase() || '';
      if (rel.includes('icon') || rel.includes('apple-touch-icon')) return;
    }

    // Vérifier si c'est une ressource (link, script, style)
    const tagLower = tagName.toLowerCase();
    if (!['link', 'script', 'style'].includes(tagLower)) return;

    const src = (target as HTMLImageElement).src ||
                (target as HTMLLinkElement).href ||
                (target as HTMLScriptElement).src || '';

    // Ignorer gtag/GA4/Google Ads : échec = best-effort, ne jamais bloquer l'app
    if (tagName === 'SCRIPT' && src && /googletagmanager\.com/.test(src)) return;

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[ErrorBoundary] ❌ Erreur de chargement de ressource');
    console.error('[ErrorBoundary] 📦 Type:', tagLower);
    console.error('[ErrorBoundary] 📦 URL:', src);
    console.error('[ErrorBoundary] 📦 Message:', event.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const error = new Error(
      `Ressource non trouvée (404): ${tagName} - ${src || 'URL inconnue'}`
    );
    this.setState({
      hasError: true,
      error,
      errorInfo: null,
    });
  };

  static getDerivedStateFromError(error: Error): State {
    // Met à jour l'état pour que le prochain rendu affiche l'UI de fallback
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log l'erreur dans la console pour le debugging
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[ErrorBoundary] ❌ Erreur capturée par ErrorBoundary');
    console.error('[ErrorBoundary] 📦 Erreur:', error);
    console.error('[ErrorBoundary] 📋 Stack:', error.stack);
    console.error('[ErrorBoundary] 📋 Component Stack:', errorInfo.componentStack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Affiche l'UI de fallback personnalisée
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Erreur dans l'état des lieux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Une erreur est survenue lors du chargement de l'application. 
                {this.state.error?.message?.includes('PGRST116') || this.state.error?.message?.includes('not found') ? (
                  <span className="block mt-2 text-destructive font-semibold">
                    ⚠️ L'état des lieux semble avoir été supprimé de la base de données.
                  </span>
                ) : this.state.error?.message?.includes('404') || this.state.error?.message?.includes('Ressource non trouvée') ? (
                  <span className="block mt-2 text-destructive font-semibold">
                    ⚠️ Une ressource (image, fichier CSS ou JS) est introuvable. Vérifiez la console pour plus de détails.
                  </span>
                ) : null}
                Veuillez rafraîchir la page ou contacter le support si le problème persiste.
              </p>

              {this.state.error && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Message d'erreur :</p>
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.message || 'Erreur inconnue'}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                        Voir la stack trace
                      </summary>
                      <pre className="text-xs mt-2 overflow-auto max-h-48 text-muted-foreground whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline">
                  Réessayer
                </Button>
                <Button onClick={this.handleReload}>
                  Rafraîchir la page
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                L'erreur a été loggée dans la console du navigateur (F12 → Console) pour faciliter le diagnostic.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
