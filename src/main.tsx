import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "@/i18n/config";
import { initGtag } from "@/lib/gtag";
import { initLcpLogger } from "@/utils/lcpLogger";
import { setupRemoveChildDiagnostic } from "@/utils/removeChildDiagnostic";

initGtag();
initLcpLogger();

// ⭐ Diagnostic removeChild (dev only)
if (import.meta.env.DEV) {
  setupRemoveChildDiagnostic();
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
