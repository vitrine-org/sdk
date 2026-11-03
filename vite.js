// Vite configuration for Vitrine widget bundles.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import solid from "vite-plugin-solid";

const sdkRoot = dirname(fileURLToPath(import.meta.url));

/** Vite plugins that compile JSX for the Vitrine renderer. */
export function vitrinePlugins() {
  return [solid({ solid: { generate: "universal", moduleName: "@vitrine/sdk/renderer" } })];
}

/**
 * Builds one widget entry into `<outDir>/index.js` as a single classic script.
 * @param {{ root: string, entry: string, outDir: string, watch?: boolean, minify?: boolean }} opts
 */
export async function buildWidget({ root, entry, outDir, watch = false, minify = true }) {
  const { build } = await import("vite");
  return build({
    root,
    configFile: false,
    logLevel: "warn",
    plugins: vitrinePlugins(),
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    resolve: {
      // Always build against this SDK copy and a single Solid runtime.
      alias: [
        { find: /^@vitrine\/sdk\/renderer$/, replacement: resolve(sdkRoot, "src/renderer.ts") },
        { find: /^@vitrine\/sdk$/, replacement: resolve(sdkRoot, "src/index.ts") },
      ],
      dedupe: ["solid-js"],
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2020",
      minify: minify ? "esbuild" : false,
      sourcemap: false,
      // Images imported from code become data: URIs inside the bundle.
      assetsInlineLimit: 64 * 1024 * 1024,
      lib: { entry: resolve(root, entry), formats: ["iife"], name: "__vitrineWidget", fileName: () => "index.js" },
      rollupOptions: { output: { inlineDynamicImports: true } },
      watch: watch ? {} : null,
    },
  });
}
