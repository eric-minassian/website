// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [sitemap()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      fallbacks: ["serif"],
      options: {
        variants: [
          {
            weight: "300 800",
            style: "normal",
            src: ["@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2"],
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
