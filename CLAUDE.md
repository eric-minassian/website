# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                # Start development server (localhost:4321)
pnpm build              # Type-check and build for production
pnpm preview            # Preview production build
pnpm lint               # Lint with oxlint
pnpm lint:fix           # Lint and auto-fix with oxlint
pnpm fmt                # Format with oxfmt
pnpm fmt:check          # Check formatting with oxfmt
pnpm og:generate        # Generate OG image (requires Playwright browsers)
pnpm test:visual        # Run visual regression tests
pnpm test:visual:update # Update visual regression snapshots
```

## Architecture

A minimalist personal website built with Astro, Tailwind CSS v4, and TypeScript.

### Pages

- `src/pages/index.astro` - Home page: intro, links, and the projects corner
- `src/pages/projects.astro` - The apps running on my platform (`Projects.astro`)
- `src/pages/404.astro` - 404 error page

### Components

- `src/layouts/Layout.astro` - Base HTML layout with meta tags and SEO
- `src/components/ThemeToggle.astro` - Theme toggle button (system/dark/light)
- `src/components/ProjectsCorner.astro` - The home page's way into /projects: a key of the apps with their page views over halftone strata of that traffic; fixed in the bottom-right corner on wide, tall windows, after the links otherwise
- `src/scripts/projects-corner.ts` - Draws the corner's key and strata once the directory loads, and redraws on resize
- `src/components/Projects.astro` - Ledger of the apps on my platform: name, description, last deploy, a 30-day page-view sparkline and total
- `src/lib/projects.ts` - Fetches and checks the platform's public directory (`/v1/public/apps`) in the browser, so the list is live without a deploy; shared formatting of days and totals
- `src/scripts/projects.ts` - Renders the ledger once the directory loads
- `src/lib/site.ts` - Shared site metadata

### Styling

Tailwind CSS v4 via Vite plugin. Newsreader is self-hosted through Astro's Fonts API (`fonts` in `astro.config.mjs`, `<Font />` in `Layout.astro`). Semantic tokens (`canvas`, `ink`, `muted`, `faint`) live in `src/styles/globals.css`. Dark mode is a class variant; token values swap on `.dark`.

### Linting & Formatting

[Oxc](https://oxc.rs/) toolchain: `oxlint` for linting (`.oxlintrc.json`) and `oxfmt` for formatting (`.oxfmtrc.json`). Both run in CI via `.github/workflows/lint.yml`.

### Testing

Playwright visual regression tests in `tests/visual.spec.ts`. Tests capture full-page screenshots of the home page (light/dark/system themes), the projects page (light/dark), theme toggle cycling, and the 404 page, and check the projects corner and list, including their since-counting and failed-load states. Tests answer the platform's directory request with `tests/fixtures/projects.json`, and `PORT` moves Playwright's dev server off 4321. The time zone is pinned and reduced motion skips the fades.

## CI/CD

- `.github/workflows/playwright.yml` - Runs visual regression tests on PRs and main branch pushes
- `.github/workflows/lint.yml` - Runs oxlint and oxfmt checks on PRs and main branch pushes
- `.github/workflows/deploy.yml` - Deploys to GitHub Pages on main branch pushes
- `.github/workflows/update-snapshots.yml` - Manual workflow to update visual snapshots
- `.github/dependabot.yml` - Automated weekly dependency updates for npm and GitHub Actions
