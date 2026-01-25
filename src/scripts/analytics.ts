/**
 * Google Analytics 4 integration
 * Handles page view tracking with Astro view transitions
 */

/**
 * Inline script to initialize gtag before page render.
 * Disables automatic page views since we track manually.
 */
export const getAnalyticsScript = (measurementId: string): string => `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: false });
`;

/**
 * Track a page view event
 */
const trackPageView = (): void => {
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }
};

/**
 * Initialize analytics - call once on initial page load.
 * Sets up view transition listener for SPA-style navigation.
 */
export const initAnalytics = (): void => {
  trackPageView();
  document.addEventListener("astro:page-load", trackPageView);
};
