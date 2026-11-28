# ericminassian.com

Personal website built with Astro, Tailwind CSS, and TypeScript.

## Development

```bash
pnpm dev                # Start development server (localhost:4321)
pnpm build              # Type-check and build for production
pnpm typecheck          # Type-check with astro check
pnpm preview            # Preview production build
pnpm lint               # Lint with oxlint
pnpm format             # Format with oxfmt
pnpm test:visual        # Run visual regression tests
pnpm test:visual:update # Update visual regression snapshots
pnpm test:e2e           # Test a deployed stage (BASE_URL)
```

## Structure

- `src/pages/index.astro` — Home page
- `src/pages/projects.astro` — Projects page
- `src/pages/404.astro` — 404 error page
- `src/layouts/Layout.astro` — Base HTML layout and SEO
- `src/components/ThemeToggle.astro` — Light / dark toggle that follows the system until flipped
- `src/components/ProjectsKey.astro` — The home page's key to the projects' traffic
- `src/components/TrafficHorizon.astro` — The projects' traffic as a halftone horizon
- `src/components/Projects.astro` — Apps running on my platform, with 30-day page views
- `src/lib/projects.ts` — Fetches the project list from the platform in the browser
- `src/styles/globals.css` — Global styles and Tailwind theme
- `src/lib/site.ts` — Site metadata
- `plat.config.ts` — How my platform builds and serves the site

## Tech Stack

- [Astro](https://astro.build) — Static site generator
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Playwright](https://playwright.dev) — Visual regression and deployment tests
- [My platform](https://github.com/eric-minassian/platform) — Hosting, with a preview per PR
