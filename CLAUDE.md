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
- `src/components/icons/*.astro` - Icon components

### Styling

Tailwind CSS v4 via Vite plugin. Custom Newsreader font and base styles in `src/styles/globals.css`. Supports light/dark themes via system preference with manual override.

### Linting & Formatting

[Oxc](https://oxc.rs/) toolchain: `oxlint` for linting (`.oxlintrc.json`) and `oxfmt` for formatting (`.oxfmtrc.json`). Both run in CI via `.github/workflows/lint.yml`.

### Testing

Playwright visual regression tests in `tests/visual.spec.ts`. Tests capture full-page screenshots of the home page (light/dark/system themes), theme toggle cycling, and 404 page.

## CI/CD

- `.github/workflows/playwright.yml` - Runs visual regression tests on PRs and main branch pushes
- `.github/workflows/lint.yml` - Runs oxlint and oxfmt checks on PRs and main branch pushes
- `.github/workflows/deploy.yml` - Deploys to GitHub Pages on main branch pushes
- `.github/workflows/update-snapshots.yml` - Manual workflow to update visual snapshots
- `.github/dependabot.yml` - Automated weekly dependency updates for npm and GitHub Actions
