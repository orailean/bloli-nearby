import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["loo.localhost", "kippe.localhost", "kebab.localhost", "water.localhost"],
    proxy: { "/api": { target: "http://127.0.0.1:3100", changeOrigin: false } },
  },
});
