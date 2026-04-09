import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/tests/**/*.test.ts"],
    // Use Cloudflare Workers polyfills for Web Crypto
    setupFiles: ["./src/tests/setup.ts"],
  },
});
