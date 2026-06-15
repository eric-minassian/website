/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** OIDC client_id for this site. Defaults to "website" when unset. */
  readonly PUBLIC_AUTH_CLIENT_ID?: string;
  /** OIDC issuer override (e.g. a local auth stack). Defaults to the SDK's production issuer. */
  readonly PUBLIC_AUTH_ISSUER?: string;
}
