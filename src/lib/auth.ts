import { createAuthClient, type AuthClient } from "@ericminassian/auth/client";

/** Path of the OIDC redirect callback page (see src/pages/auth/callback.astro). */
export const CALLBACK_PATH = "/auth/callback";

let client: AuthClient | undefined;

/**
 * The site's OIDC client against auth.ericminassian.com, created lazily on
 * first use.
 *
 * Browser-only: the redirect URI is derived from the current origin, so the
 * same build works locally (http://localhost:4321) and in production
 * (https://www.ericminassian.com). Both callback URLs must be registered as
 * `redirect_uris` for this client in the auth provider's config/clients.json.
 */
export function getAuthClient(): AuthClient {
  if (typeof window === "undefined") {
    throw new Error("getAuthClient() must be called in the browser");
  }
  if (!client) {
    const issuer = import.meta.env.PUBLIC_AUTH_ISSUER;
    client = createAuthClient({
      clientId: import.meta.env.PUBLIC_AUTH_CLIENT_ID ?? "website",
      redirectUri: new URL(CALLBACK_PATH, window.location.origin).href,
      ...(issuer ? { issuer } : {}),
    });
  }
  return client;
}
