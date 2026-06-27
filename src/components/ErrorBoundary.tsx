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
    // Ignorer les erreurs JS provenant de scripts tiers (tracking, ads, analytics)
    // Un script tiers cassé ne doit JAMAIS bloquer l'app
    if (event.filename) {
      try {
        const url = new URL(event.filename);
        if (url.hostname !== window.location.hostname) {
          console.warn(`[ErrorBoundary] Erreur JS tiers ignorée (${url.hostname}):`, event.message);
          return;
        }
      } catch {
        // URL relative ou invalide → traiter comme first-party
      }
    }

    // Script sans filename = extension browser ou context non identifiable → ignorer
    if (!event.filename) return;

    console.error('[ErrorBoundary] ❌ Erreur JS first-party (window.onerror):', event.message, event.filename, event.lineno);

    const error = event.error || new Error(event.message || 'Erreur inconnue');
    this.setState({ hasError: true, error, errorInfo: null });
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason || '');

    // Dynamic import échoué après déploiement (chunk périmé) : auto-reload silencieux une fois
    if (/Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(msg) ||
        (msg.includes('/assets/') && /\.(js|css)/.test(msg))) {
      const RELOAD_KEY = 'stale_chunk_reload';
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return;
      }
    }

    // Ignorer les erreurs réseau génériques (fetch bloqué par adblocker, CORS tiers, timeout)
    // Ces erreurs arrivent systématiquement avec des scripts de tracking bloqués
    if (
      msg === 'Failed to fetch' ||
      msg === 'Load failed' ||
      msg === 'NetworkError when attempting to fetch resource.' ||
      /network error|net::ERR_/i.test(msg) ||
      reason?.name === 'AbortError'
    ) {
      console.warn('[ErrorBoundary] Requête réseau échouée (ignorée, probable adblocker ou réseau) :', msg);
      return;
    }

    console.error('[ErrorBoundary] ❌ Promesse rejetée non catchée :', reason);

    const error = reason instanceof Error
      ? reason
      : new Error(String(reason || 'Promesse rejetée'));

    this.setState({ hasError: true, error, errorInfo: null });
  };

  handleResourceError = (event: ErrorEvent) => {
    if (!event.target || !(event.target as HTMLElement).tagName) return;

    const target = event.target as HTMLElement;
    const tagName = target.tagName.toUpperCase();

    // Images gérées par onError dans chaque composant — pas d'écran fatal
    if (tagName === 'IMG') return;

    // Favicons — non critiques
    if (tagName === 'LINK') {
      const rel = (target as HTMLLinkElement).rel?.toLowerCase() || '';
      if (rel.includes('icon') || rel.includes('apple-touch-icon')) return;
    }

    const tagLower = tagName.toLowerCase();
    if (!['link', 'script', 'style'].includes(tagLower)) return;

    const src = (target as HTMLImageElement).src ||
                (target as HTMLLinkElement).href ||
                (target as HTMLScriptElement).src || '';

    // CORRECTION CRITIQUE : ignorer TOUT script/style provenant d'un domaine tiers.
    // Les pixels de tracking (Doubleclick, Meta, GTM, Clarity, Hotjar, etc.) sont
    // optionnels par nature — leur échec (adblocker, Safari ITP, réseau entreprise)
    // ne doit JAMAIS provoquer un écran d'erreur fatal pour le visiteur.
    if (src) {
      try {
        const url = new URL(src);
        if (url.hostname !== window.location.hostname) {
          console.warn(`[ErrorBoundary] Ressource tierce non chargée (ignorée) : ${url.hostname}${url.pathname}`);
          return;
        }
      } catch {
        // URL sans hostname (chemin relatif) → first-party, on continue
      }
    }

    // Chunk Vite first-party périmé après déploiement : auto-reload silencieux une fois
    if (src && /\/assets\/[^/]+\.(js|css)(\?.*)?$/.test(src)) {
      const RELOAD_KEY = 'stale_chunk_reload';
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return;
      }
      // Déjà rechargé → afficher l'erreur normalement (vraie ressource manquante)
    }

    console.error(`[ErrorBoundary] ❌ Ressource first-party manquante : ${tagLower} ${src}`);
    const error = new Error(`Ressource non trouvée (404): ${tagName} - ${src || 'URL inconnue'}`);
    this.setState({ hasError: true, error, errorInfo: null });
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
