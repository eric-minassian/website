# ericminassian.com

Personal website built with Astro 5, MDX, and Tailwind CSS v4.

## Development

```bash
pnpm dev               # Start development server (localhost:4321)
pnpm build             # Type-check and build for production
pnpm preview           # Preview production build
pnpm test:visual       # Run visual regression tests
pnpm test:visual:update # Update visual regression snapshots
```

## Structure

- `src/pages/index.mdx` - Home page
- `src/pages/work.mdx` - Work experience page
- `src/pages/404.astro` - 404 error page
- `src/layouts/Layout.astro` - Base HTML layout
- `src/components/` - Reusable components
- `src/styles/globals.css` - Global styles and Tailwind config

## Tech Stack

- [Astro 5](https://astro.build) - Static site generator
- [MDX](https://mdxjs.com) - Markdown with JSX
- [Tailwind CSS v4](https://tailwindcss.com) - Styling
- [Playwright](https://playwright.dev) - Visual regression testing
