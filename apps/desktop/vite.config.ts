import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@payguard/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url)
      )
    }
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist"
  }
});
