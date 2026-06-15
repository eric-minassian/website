import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [sitemap({ filter: (page) => !page.includes("/auth/") })],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
