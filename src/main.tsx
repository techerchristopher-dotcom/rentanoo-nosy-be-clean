import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/i18n/config";
import { setupRemoveChildDiagnostic } from "@/utils/removeChildDiagnostic";

// ⭐ Diagnostic removeChild (dev only)
if (import.meta.env.DEV) {
  setupRemoveChildDiagnostic();
}

createRoot(document.getElementById("root")!).render(<App />);
