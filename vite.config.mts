import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import builtins from "builtin-modules";
import path from "node:path";

// vite build always sets NODE_ENV=production, so use --watch presence to detect dev mode.
// Dev (watch): rebuilds into a live Obsidian plugins/smart-typography-refresh/ directory so changes
//   land in the vault immediately. Prefers $PLUGINS_DIR (typically set via direnv
//   from .envrc — see .envrc.example) and falls back to the in-repo test vault.
// Prod: outputs to ./dist next to main.js + a freshly-copied manifest.json,
//   ready to be zipped as a release artifact.
const isWatch = process.argv.includes("--watch");

function devOutDir(): string {
  const pluginsDir = process.env.PLUGINS_DIR?.trim();
  if (pluginsDir) {
    return path.join(pluginsDir, "smart-typography-refresh");
  }
  return "test-vault/.obsidian/plugins/smart-typography-refresh";
}

const outDir = isWatch ? devOutDir() : "dist";

// Copy manifest.json alongside main.js after every build so the output directory
// is a complete, loadable plugin. In watch mode the live vault (or test vault
// fallback) stays loadable after every rebuild without manual intervention.
function copyManifest(): Plugin {
  return {
    name: "copy-manifest",
    apply: "build",
    closeBundle() {
      const src = path.resolve("manifest.json");
      const dest = path.resolve(outDir, "manifest.json");
      if (!existsSync(path.dirname(dest))) {
        mkdirSync(path.dirname(dest), { recursive: true });
      }
      copyFileSync(src, dest);
      if (isWatch) {
        console.log(`[smart-typography-refresh] Deployed to ${outDir}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [copyManifest()],

  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["cjs"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      // Provided by the Obsidian runtime — never bundle these.
      external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
        ...builtins,
      ],
      output: {
        entryFileNames: "main.js",
      },
    },
    outDir,
    emptyOutDir: !isWatch,
    sourcemap: isWatch ? "inline" : false,
    minify: !isWatch,
    copyPublicDir: false,
  },
});
