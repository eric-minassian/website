import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://www.ericminassian.com",
  integrations: [tailwind(), sitemap()],
  devToolbar: { enabled: false },
});
