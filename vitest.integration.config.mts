import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

// 実際の Jev API を呼ぶテスト（npm run test:integration）。APIキーがなければ自動でスキップする。
export default defineConfig({
  resolve: {
    alias: {
      "@/": root,
      "server-only": fileURLToPath(
        new URL("./tests/support/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/load-env.ts"],
    testTimeout: 30_000,
  },
});
