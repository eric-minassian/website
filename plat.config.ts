import { defineApp } from "@ericminassian/platform/config";

// What the platform runs: the static site Astro builds, and nothing else. `plat` evaluates this file.
const app = defineApp({
  name: "website",
  description: "My personal website",
  web: {
    static: "dist",
    build: "astro build",
    // Every page is a file of its own (Astro writes /projects as projects/index.html), so a path
    // without one is a 404, not the home page.
    spa: false,
  },
  // The projects pages list the platform's other apps, not this one.
  listed: false,
});

export default app;

declare module "@ericminassian/platform/config" {
  interface Register {
    app: typeof app;
  }
}
