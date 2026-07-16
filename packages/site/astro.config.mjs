// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://koki-develop.github.io",
  base: "/ps1ui",
  trailingSlash: "always",
  integrations: [react()],
});
