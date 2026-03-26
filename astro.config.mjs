import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
