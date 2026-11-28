# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                # Start development server (localhost:4321)
pnpm build              # Type-check and build for production
pnpm typecheck          # Type-check with astro check
pnpm preview            # Preview production build
pnpm lint               # Lint with oxlint
pnpm lint:fix           # Lint and auto-fix with oxlint
pnpm format             # Format with oxfmt
pnpm format:check       # Check formatting with oxfmt
pnpm og:generate        # Generate OG image (requires Playwright browsers)
pnpm test:visual        # Run visual regression tests
pnpm test:visual:update # Update visual regression snapshots
pnpm test:e2e           # Test a deployed stage (BASE_URL=https://website.ericminassian.com)
pnpm exec plat build    # Build what the platform deploys, into .plat/build
```

## Architecture

A minimalist personal website built with Astro, Tailwind CSS v4, and TypeScript.

### Pages

- `src/pages/index.astro` - Home page: intro, links, the projects key beside them, and the traffic horizon below
- `src/pages/projects.astro` - The apps running on my platform (`Projects.astro`)
- `src/pages/404.astro` - 404 error page

### Components

- `src/layouts/Layout.astro` - Base HTML layout with meta tags and SEO, and the masthead every page shares: the name (with the page's own heading after it) and the theme toggle
- `src/components/ThemeToggle.astro` - Theme toggle: flips light/dark, following the system until flipped (`src/scripts/theme.ts`)
- `src/components/ProjectsKey.astro` - The home page's way into /projects: the apps with their page views, a key to the horizon
- `src/components/TrafficHorizon.astro` - The projects' traffic as halftone strata in the page's column, on a ground row of dots that spans the window
- `src/scripts/traffic.ts` - Fills the key and draws the horizon once the directory loads, through each day's exact count; pointing at (or tapping) a day reads it out
- `src/components/Projects.astro` - Ledger of the apps on my platform: name, description, last deploy, a 30-day page-view sparkline and total
- `src/lib/projects.ts` - Fetches and checks the platform's public directory in the browser (`PROJECTS_URL` in `astro.config.mjs`, `SITE.projectsUrl` by default), so the list is live without a deploy; shared formatting of days and totals. Lighthouse CI builds against `tests/fixtures/projects.json`, which `scripts/run-lighthouse.mjs` serves
- `src/scripts/projects.ts` - Renders the ledger once the directory loads, busiest first; pointing at (or tapping) a sparkline reads out a day
- `src/lib/site.ts` - Shared site metadata

### Styling

Tailwind CSS v4 via Vite plugin. Newsreader is self-hosted through Astro's Fonts API (`fonts` in `astro.config.mjs`, `<Font />` in `Layout.astro`). Semantic tokens (`canvas`, `ink`, `muted`, `faint`, `alert`, and the chart's `band-1`…`band-3`) and the `page` column live in `src/styles/globals.css`. Dark mode is a class variant; token values swap on `.dark`.

### Linting & Formatting

[Oxc](https://oxc.rs/) toolchain: `oxlint` for linting (`.oxlintrc.json`) and `oxfmt` for formatting (`.oxfmtrc.json`). Both run in CI in the platform's pipeline (`.github/workflows/platform.yml`), with `pnpm typecheck`.

### Testing

Playwright visual regression tests in `tests/visual.spec.ts`. Tests capture full-page screenshots of the home page (light/dark/system themes), the projects page (light/dark), and the 404 page, and check the theme toggle, the projects key, horizon and list, including their readouts and their since-counting, failed-load and empty states. Tests answer the platform's directory request with `tests/fixtures/projects.json`, and `PORT` moves Playwright's dev server off 4321. The time zone is pinned and reduced motion skips the fades.

Browser tests of a deployed stage in `e2e/` (own config; `BASE_URL` required), against the live directory: the pages render and their projects load, `/projects` answers with and without its slash, an unknown path gets the 404 page with a 404, and `/_astro/` files are cached as immutable.

## CI/CD

The site is the app `website` on my platform ([eric-minassian/platform](https://github.com/eric-minassian/platform)), declared in `plat.config.ts`: the static `dist` Astro builds, `www.ericminassian.com` in production.

- `.github/workflows/platform.yml` - The platform's pipeline: typecheck, lint and format check, then a preview per PR (`https://website--pr-<n>.ericminassian.com`, removed when it closes) and production on main branch pushes, each followed by `pnpm test:e2e` against it
- `.github/workflows/playwright.yml` - Runs visual regression tests on PRs and main branch pushes
- `.github/workflows/lighthouse.yml` - Runs Lighthouse against a fixture-backed build on PRs and main branch pushes
- `.github/workflows/update-snapshots.yml` - Manual workflow to update visual snapshots
- `.github/dependabot.yml` - Automated weekly dependency updates for npm and GitHub Actions
