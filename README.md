# ericminassian.com

Personal website built with Astro, Tailwind CSS, and TypeScript.

## Development

```bash
pnpm dev                # Start development server (localhost:4321)
pnpm build              # Type-check and build for production
pnpm preview            # Preview production build
pnpm lint               # Lint with oxlint
pnpm fmt                # Format with oxfmt
pnpm test:visual        # Run visual regression tests
pnpm test:visual:update # Update visual regression snapshots
```

## Structure

- `src/pages/index.astro` — Home page
- `src/pages/404.astro` — 404 error page
- `src/layouts/Layout.astro` — Base HTML layout and SEO
- `src/components/ThemeToggle.astro` — System / dark / light toggle
- `src/styles/globals.css` — Global styles and Tailwind theme
- `src/lib/site.ts` — Site metadata

## Tech Stack

- [Astro](https://astro.build) — Static site generator
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Playwright](https://playwright.dev) — Visual regression testing
