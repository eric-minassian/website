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

- `src/pages/index.astro` - Home page with intro and links
- `src/pages/404.astro` - 404 error page

### Components

- `src/layouts/Layout.astro` - Base HTML layout with meta tags and SEO
- `src/components/ThemeToggle.astro` - Theme toggle button (system/dark/light)
- `src/components/Moon.astro` - Halftone moon in the corner showing the real lunar phase; hover/focus reveals the caption, drag or arrow keys step through other nights
- `src/lib/moon.ts` - Lunar phase maths (Meeus ch. 48): illumination, phase name, age, next full/new moon
- `src/scripts/moon.ts` - Moon caption and interaction; lazy-loads the scene after the page is idle
- `src/scripts/moon-scene.ts` - three.js scene: NASA LRO albedo map (`public/textures/moon.jpg`) shaded and drawn through a halftone pass
- `src/lib/site.ts` - Shared site metadata

### Styling

Tailwind CSS v4 via Vite plugin. Newsreader is self-hosted through Astro's Fonts API (`fonts` in `astro.config.mjs`, `<Font />` in `Layout.astro`). Semantic tokens (`canvas`, `ink`, `muted`) live in `src/styles/globals.css`. Dark mode is a class variant; token values swap on `.dark`.

### Linting & Formatting

[Oxc](https://oxc.rs/) toolchain: `oxlint` for linting (`.oxlintrc.json`) and `oxfmt` for formatting (`.oxfmtrc.json`). Both run in CI via `.github/workflows/lint.yml`.

### Testing

Playwright visual regression tests in `tests/visual.spec.ts`. Tests capture full-page screenshots of the home page (light/dark/system themes), theme toggle cycling, the 404 page, and the moon caption. The clock, time zone, and reduced motion are pinned so the moon renders the same phase every run, and Desktop Chrome renders WebGL with SwiftShader.

## CI/CD

- `.github/workflows/playwright.yml` - Runs visual regression tests on PRs and main branch pushes
- `.github/workflows/lint.yml` - Runs oxlint and oxfmt checks on PRs and main branch pushes
- `.github/workflows/deploy.yml` - Deploys to GitHub Pages on main branch pushes
- `.github/workflows/update-snapshots.yml` - Manual workflow to update visual snapshots
- `.github/dependabot.yml` - Automated weekly dependency updates for npm and GitHub Actions
