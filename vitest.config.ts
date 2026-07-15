import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // `obsidian` ships only as a runtime module loaded by Obsidian itself;
      // unit tests stub it so files that import Plugin/Setting/etc. still load.
      obsidian: path.resolve("./test/__mocks__/obsidian.ts"),
    },
  },
  test: {
    globals: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
