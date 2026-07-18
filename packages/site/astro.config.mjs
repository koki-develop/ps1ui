// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { closePropsExtraction } from "./src/lib/props-close.ts";

// src/lib/props.ts keeps a long-lived tsgo child (TypeScript API) for the
// auto-generated props tables. It parks its shutdown hook on globalThis
// (see props-close.ts) because this config runs in a different module graph
// than the Vite-SSR page modules; closing here — before Astro calls
// process.exit — lets the child shut down cleanly instead of logging
// "context canceled" at exit.
/** @type {import("astro").AstroIntegration} */
const propsExtractionCleanup = {
  name: "props-extraction-cleanup",
  hooks: {
    "astro:build:done": closePropsExtraction,
    "astro:server:done": closePropsExtraction,
  },
};

export default defineConfig({
  site: "https://koki-develop.github.io",
  base: "/ps1ui",
  trailingSlash: "always",
  integrations: [react(), propsExtractionCleanup],
});
