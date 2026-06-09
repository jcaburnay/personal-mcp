import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// MCP Apps widgets must be a single self-contained bundle inlined into the resource HTML, so we
// build in library mode (one ES module, React bundled in, dynamic imports inlined). The server
// reads dist-web/habits/habits.js and injects it as the resource's <script>.
export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "../../dist-web/habits",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: "src/main.tsx",
      formats: ["es"],
      fileName: () => "habits.js",
    },
  },
  root: "web/habits",
});
