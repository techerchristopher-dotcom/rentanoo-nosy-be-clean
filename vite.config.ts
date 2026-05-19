import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import dotenv from "dotenv";

// Charge .env.local pour les variables process.env lors du chargement de la config Vite
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// Port 3002 par défaut (VITE_DEV_PORT pour override)
const devPort = Number(process.env.VITE_DEV_PORT || 3002);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: devPort,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Fusionne automatiquement les chunks < 20 KB (currency.ts, icônes lucide
        // isolées comme arrow-right, badge, chevron-*, etc.) dans leurs parents.
        // Évite la prolifération de tout petits chunks volatiles qui produisent des
        // 404 quand Safari mobile garde un index.html en cache après redéploiement.
        // Cf. 404 sur /assets/currency-*.js.
        experimentalMinChunkSize: 20_000,
      },
    },
  },
}));
