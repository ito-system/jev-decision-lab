import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/": root,
      // `server-only` throws outside React Server Components; unit tests run in plain Node.
      "server-only": fileURLToPath(
        new URL("./tests/support/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests that call the real Jev API live in tests/integration and run via `npm run test:integration`.
    exclude: ["tests/integration/**", "node_modules/**"],
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
