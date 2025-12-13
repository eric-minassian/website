# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server (localhost:4321)
pnpm build        # Type-check and build for production
pnpm preview      # Preview production build
pnpm test:e2e     # Run Playwright e2e tests (starts dev server automatically)
```

## Architecture

This is a personal portfolio website built with Astro 5, Tailwind CSS v4, and TypeScript.

### Key Files

- `src/config.ts` - Site metadata and personal content (name, description, external links). The description uses markdown-style links `[text](url)` which are parsed into Badge components.
- `src/layouts/Layout.astro` - Base HTML layout with meta tags sourced from `siteConfig`
- `src/lib/utils.ts` - `parseDescription()` parses markdown links from config into structured chunks for rendering. Logo names are derived by removing spaces/commas from link text.
- `src/assets/logos/*.astro` - SVG logo components. Filename must match the processed link text (e.g., "University of California, Irvine" → `UniversityofCaliforniaIrvine.astro`)

### Styling

Tailwind CSS v4 configured via Vite plugin. Custom Geist font defined in `src/styles/globals.css`. Uses `@tailwindcss/typography` for prose styling.

### Testing

Playwright e2e tests in `tests/`. Tests run against dev server at localhost:4321 and cover multiple browsers/devices.
