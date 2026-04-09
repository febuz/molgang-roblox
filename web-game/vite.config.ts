import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        join: resolve(__dirname, "join.html"),
      },
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to bridge worker in dev
    proxy: {
      "/v1": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  // Enable SharedArrayBuffer for potential WebGPU use
  headers: {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  },
});
