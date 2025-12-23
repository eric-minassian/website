# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev               # Start development server (localhost:4321)
pnpm build             # Type-check and build for production
pnpm preview           # Preview production build
pnpm test:visual       # Run visual regression tests
pnpm test:visual:update # Update visual regression snapshots
```

## Architecture

A minimalist personal website built with Astro 5, MDX, Tailwind CSS v4, and TypeScript.

### Pages

- `src/pages/index.mdx` - Home page with intro and links
- `src/pages/work.mdx` - Work experience page
- `src/pages/writing.astro` - Writing list page (queries content collection)
- `src/pages/writing/[...slug].astro` - Individual post pages
- `src/pages/404.astro` - 404 error page

### Content

- `src/content/writing/*.mdx` - Blog posts (MDX files with `title` and optional `description` frontmatter)
- `src/content.config.ts` - Content collection schema

### Components

- `src/layouts/Layout.astro` - Base HTML layout with meta tags
- `src/components/Link.astro` - Styled link with underline hover effect

### Styling

Tailwind CSS v4 via Vite plugin. Custom Geist font and base styles in `src/styles/globals.css`. Uses `@tailwindcss/typography` for prose styling. Supports light/dark themes via system preference.

### Testing

Playwright visual regression tests in `tests/visual.spec.ts`. Tests capture full-page screenshots of all pages across desktop and mobile viewports.

## CI/CD Workflows

- `.github/workflows/playwright.yml` - Runs visual regression tests on PRs and main branch pushes
- `.github/workflows/deploy.yml` - Deploys to GitHub Pages on main branch pushes
- `.github/workflows/update-snapshots.yml` - Manual workflow to update visual snapshots
- `.github/workflows/update-dependencies.yml` - Weekly automated dependency updates (runs every Monday at 2am UTC)
  - Updates all dependencies to latest versions using npm-check-updates
  - Runs build and visual tests
  - Auto-updates snapshots if visual changes occur
  - Creates a PR that auto-merges if all tests pass
