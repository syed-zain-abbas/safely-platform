import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL("./popup.html", import.meta.url)),
        options: fileURLToPath(new URL("./options.html", import.meta.url)),
        blocked: fileURLToPath(new URL("./blocked.html", import.meta.url)),
        warning: fileURLToPath(new URL("./warning.html", import.meta.url)),
        "service-worker": fileURLToPath(new URL("./src/background/service-worker.ts", import.meta.url)),
        "content-script": fileURLToPath(new URL("./src/content/content-script.ts", import.meta.url))
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
