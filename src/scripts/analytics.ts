/**
 * PostHog analytics integration
 * Handles page view tracking with Astro view transitions
 */

/**
 * Inline script to initialize PostHog before page render.
 * Uses the is:inline directive in Astro to prevent processing.
 */
export const getAnalyticsScript = (apiKey: string, apiHost: string): string => `
!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init ss us bi os hs es ns capture Bi calculateEventProperties cs register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty ps vs createPersonProfile gs Zr ys opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing ds debug O fs getPageViewId captureTraceFeedback captureTraceMetric Yr".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${apiKey}', {
  api_host: '${apiHost}',
  defaults: '2025-11-30',
  person_profiles: 'identified_only',
  capture_pageview: false,
  capture_pageleave: true,
});
`;

/**
 * Track a page view event
 */
const trackPageView = (): void => {
  if (typeof window.posthog?.capture === "function") {
    window.posthog.capture("$pageview");
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
