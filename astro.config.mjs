import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: true,
});
