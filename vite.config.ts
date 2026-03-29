import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Porta fixa: o OAuth do Google exige a mesma URL nas "Origens JavaScript autorizadas"
  // (ex.: http://localhost:5173). Se 5173 estiver ocupada, strictPort evita subir em 5174+.
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        cookieDomainRewrite: "",
        cookiePathRewrite: "/",
      },
      "/uploads": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
