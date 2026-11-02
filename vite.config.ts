import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  // Local .env config must not select development React for a production bundle.
  if (command === "build") process.env.NODE_ENV = "production";
  return {
  base: process.env.APP_BASE_PATH || "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
  build: { target: "es2020", outDir: "dist" },
  };
});
