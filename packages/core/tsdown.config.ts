import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  // One output module per source module. Enables per-component tree-shaking
  // (only CodeBlock's refractor module is marked side-effectful — see
  // package.json `sideEffects`) and keeps the `"use client"` directives at
  // the top of their own output modules (rolldown only guarantees directive
  // preservation under preserveModules). Both checked by check:dist.
  unbundle: true,
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
