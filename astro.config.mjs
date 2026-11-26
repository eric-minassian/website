// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField, fontProviders } from "astro/config";

export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [sitemap()],
  env: {
    schema: {
      // Where the home page's project list comes from at build time: an http(s) URL or a path to a
      // JSON file, relative to the project root.
      PROJECTS_SOURCE: envField.string({
        context: "server",
        access: "public",
        default: "https://platform.ericminassian.com/v1/public/apps",
      }),
    },
  },
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
