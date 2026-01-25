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

A minimalist personal website built with Astro 5, MDX, React, Tailwind CSS v4, and TypeScript.

### Pages

- `src/pages/index.mdx` - Home page with intro and links
- `src/pages/work.astro` - Work listing page (queries content collection)
- `src/pages/work/[...slug].astro` - Individual project pages
- `src/pages/404.astro` - 404 error page

### Content

- `src/content/work/*.mdx` - Project pages (MDX files with `title`, `description`, `github`, `date`, and `tags` frontmatter)
- `src/content.config.ts` - Content collection schema

### Components

- `src/layouts/Layout.astro` - Base HTML layout with meta tags and SEO
- `src/components/ThemeToggle.astro` - Theme toggle button (system/dark/light)
- `src/components/diagrams/*.tsx` - React components for interactive project diagrams
- `src/components/icons/*.astro` - Icon components

### Styling

Tailwind CSS v4 via Vite plugin. Custom Newsreader font and base styles in `src/styles/globals.css`. Supports light/dark themes via system preference with manual override.

### Testing

Playwright visual regression tests in `tests/visual.spec.ts`. Tests capture full-page screenshots of all pages across desktop and mobile viewports.

## CI/CD

- `.github/workflows/playwright.yml` - Runs visual regression tests on PRs and main branch pushes
- `.github/workflows/deploy.yml` - Deploys to GitHub Pages on main branch pushes
- `.github/workflows/update-snapshots.yml` - Manual workflow to update visual snapshots
- `.github/dependabot.yml` - Automated weekly dependency updates for npm and GitHub Actions
