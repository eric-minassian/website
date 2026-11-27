// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField, fontProviders } from "astro/config";

import { SITE } from "./src/lib/site.ts";

export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [sitemap()],
  env: {
    schema: {
      // Where browsers read the project list. Lighthouse builds against a fixture its own server
      // answers (scripts/run-lighthouse.mjs), so CI doesn't depend on the live platform.
      PROJECTS_URL: envField.string({
        context: "client",
        access: "public",
        default: SITE.projectsUrl,
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
            src: ["@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2"],
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
