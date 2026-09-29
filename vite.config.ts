import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Vite refuse par défaut les requêtes dont l'en-tête Host n'est pas reconnu,
// pour empêcher le rebinding DNS vers un serveur de développement.
// Les environnements distants (bac à sable Vercel, tunnels) servent le site
// sous un domaine généré : il faut donc l'autoriser explicitement.
// Un point en préfixe couvre le domaine et tous ses sous-domaines.
// VITE_ALLOWED_HOSTS permet d'en ajouter d'autres sans toucher au code.
const allowedHosts = [
  ".vercel.run",   // bacs à sable et aperçus Vercel
  ".vercel.app",   // déploiements Vercel
  "localhost",
  ...(process.env.VITE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` applique le même contrôle d'hôte que le serveur de dev.
  preview: {
    host: "::",
    port: 4173,
    allowedHosts,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
