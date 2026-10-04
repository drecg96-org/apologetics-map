import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  output: "static",
  site: "https://drecg96-org.github.io",
  base: process.env.GITHUB_ACTIONS ? "/apologetics-map/" : "/",
  integrations: [react()],
});
