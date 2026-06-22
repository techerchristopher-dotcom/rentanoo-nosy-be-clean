import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "@/i18n/config";
import { initLcpLogger } from "@/utils/lcpLogger";
import { setupRemoveChildDiagnostic } from "@/utils/removeChildDiagnostic";

// Filet de sécurité : si un chunk lazy échoue à charger (cas typique d'un
// index.html en cache navigateur référençant un ancien hash après redéploiement),
// on force un reload une seule fois pour récupérer la nouvelle version.
const CHUNK_RELOAD_KEY = "rentanoo:chunk-reload-attempt";
const isChunkLoadError = (msg?: string) =>
  !!msg &&
  (msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    /Importing a module script failed/i.test(msg));

const handleChunkError = (rawMessage?: string) => {
  if (!isChunkLoadError(rawMessage)) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    // sessionStorage indisponible (Safari privé) : on tente quand même un reload
  }
  console.warn("[chunk-reload] Asset stale détecté, reload forcé:", rawMessage);
  window.location.reload();
  return true;
};

window.addEventListener("error", (event) => {
  handleChunkError(event?.message);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  const msg =
    typeof reason === "string"
      ? reason
      : reason?.message || reason?.toString?.() || "";
  handleChunkError(msg);
});

initLcpLogger();

// ⭐ Diagnostic removeChild (dev only)
if (import.meta.env.DEV) {
  setupRemoveChildDiagnostic();
}

const rootEl = document.getElementById("root")!;
const app = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Le HTML pré-rendu par generate-static-pages.js n'injecte qu'un bloc SEO
// caché (aria-hidden, hors écran) pour les crawlers — sa structure ne
// correspond jamais à l'arbre React réel. hydrateRoot ne peut donc que
// échouer (mismatch garanti) et faisait planter l'app via l'ErrorBoundary.
// On monte toujours via createRoot ; le contenu SEO statique reste lisible
// par les crawlers avant l'exécution du JS, puis est simplement remplacé.
createRoot(rootEl).render(app);
