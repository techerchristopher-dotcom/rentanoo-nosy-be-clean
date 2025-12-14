import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import dotenv from "dotenv";

// Charge .env.local pour les variables process.env lors du chargement de la config Vite
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// Permet de choisir un port custom (ex: 3006) via VITE_DEV_PORT ou PORT
const devPort = Number(process.env.VITE_DEV_PORT || process.env.PORT || 3002);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: devPort,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
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
}));
