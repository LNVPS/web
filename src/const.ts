import { NostrPrefix } from "@snort/shared";
import { NostrLink, NostrSystem } from "@snort/system";

export const KiB = 1024;
export const MiB = KiB * 1024;
export const GiB = MiB * 1024;
export const TiB = GiB * 1024;
export const PiB = TiB * 1024;

export const KB = 1000;
export const MB = KB * 1000;
export const GB = KB * 1000;
export const TB = GB * 1000;
export const PB = TB * 1000;

/**
 * Returns `true` when the app is being served from a Tor `.onion` hostname.
 * Always `false` during SSR where there is no `window`.
 */
export function isOnion(): boolean {
  if (import.meta.env.SSR || typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".onion");
}

/** Clearnet API base URL. Configured via `VITE_API_URL`. */
export const ClearnetApiUrl: string = import.meta.env.VITE_API_URL ?? "";

/** Tor `.onion` API base URL. Configured via `VITE_API_URL_ONION`. */
export const OnionApiUrl: string = import.meta.env.VITE_API_URL_ONION ?? "";

/** Tor `.onion` web (frontend) address. Configured via `VITE_WEB_URL_ONION`. */
export const OnionWebUrl: string = import.meta.env.VITE_WEB_URL_ONION ?? "";

/**
 * API base URL to use. When the page is served from a `.onion` origin and an
 * onion API URL is configured, requests are routed over the onion service to
 * keep traffic within the Tor network. Otherwise the clearnet API is used.
 */
export const ApiUrl: string =
  isOnion() && OnionApiUrl.length > 0 ? OnionApiUrl : ClearnetApiUrl;

/**
 * OAuth/OIDC providers enabled server-side, in the order they should appear on
 * the login page. Configured via `VITE_OAUTH_PROVIDERS` (comma-separated tags
 * matching the server config, e.g. "google,github"). Defaults to Google only.
 */
export const OAuthProviders: Array<string> = (
  import.meta.env.VITE_OAUTH_PROVIDERS ?? "google"
)
  .split(",")
  .map((s: string) => s.trim().toLowerCase())
  .filter((s: string) => s.length > 0);

/** Start the OAuth login redirect for the given provider tag. */
export function startOAuthLogin(provider: string) {
  // Tell the API where to send us back to (must be on the server's
  // `allowed_redirects` list). The API appends the token as `#token=<jwt>`, so
  // pass a plain path with no fragment of its own.
  const redirect = `${window.location.origin}/oauth/complete`;
  window.location.href = `${ApiUrl}/api/v1/oauth/${provider}/login?redirect=${encodeURIComponent(
    redirect,
  )}`;
}

export const Relays = [
  "wss://nos.lol/",
  "wss://relay.primal.net/",
  "wss://relay.damus.io/",
  "wss://relay.snort.social/",
];

/** Hex public key of the LNVPS support/sales account. */
export const SupportPubkey =
  "fcd818454002a6c47a980393f0549ac6e629d28d5688114bb60d831b5c1832a7";

export const NostrProfile = new NostrLink(
  NostrPrefix.Profile,
  SupportPubkey,
  undefined,
  undefined,
  Relays,
);

export const ServiceBirth = new Date("2024-06-05T00:00:00Z");

export const System = new NostrSystem({
  automaticOutboxModel: false,
  buildFollowGraph: false,
});
Relays.forEach((r) => System.ConnectToRelay(r, { read: true, write: false }));