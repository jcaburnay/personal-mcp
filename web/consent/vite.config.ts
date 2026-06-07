import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "web/consent",
  base: "/assets/consent/",
  build: {
    outDir: "../../dist-web/consent",
    emptyOutDir: true,
  },
});
