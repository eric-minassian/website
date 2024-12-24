# ericminassian.com

Personal website with relevant information about me and my projects.

## Customization

The website can be easily customized by modifying the configuration in `src/config.ts`:

### Site Configuration

Update `siteConfig` with your website's basic information:

```typescript
export const siteConfig = {
  title: "Your Name",
  description: "Your meta description",
  author: "Your Name",
  url: "https://yourdomain.com",
  themeColor: "#111010",
};
```

### Personal Configuration

Modify `personalConfig` to customize your homepage:

```typescript
export const personalConfig = {
  name: "your name",
  emoji: "👋",
  description: `Your description here. You can include links with logos like this:
  [Company Name](https://company-url)`,
  externalLinks: [
    { href: "https://linkedin.com/in/yourprofile", text: "linkedin" },
    { href: "/your-resume.pdf", text: "resume" },
    // Add more links as needed
  ],
};
```

### Adding Company Logos

To add logos for companies mentioned in your description:

1. Create a new `.astro` file in `src/assets/logos/` with your company name (no spaces)
2. When you mention a company in the description using `[Company Name](url)`, the logo will automatically be loaded from `CompanyName.astro`

Example: `[Walmart Global Tech](https://tech.walmart.com)` will look for `WalmartGlobalTech.astro`
