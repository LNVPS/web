// SSR locale state — set by the server, read by the client during hydration.
let ssrLocale: string | undefined;
let ssrMessages: Record<string, string> | undefined;

/** Set the SSR locale + messages so they're included in the cache script. */
export function setSSRLocale(
  locale: string,
  messages: Record<string, string>,
): void {
  ssrLocale = locale;
  ssrMessages = messages;
}

/**
 * Generate a `<script>` tag that exposes the SSR locale as
 * `window.__SSR_LOCALE__` and messages as `window.__SSR_MESSAGES__` so the
 * client can read them during hydration.
 */
export function serializeCacheScript(): string {
  const parts: string[] = [];
  if (ssrLocale) {
    parts.push(
      `window.__SSR_LOCALE__=${JSON.stringify(ssrLocale).replace(/</g, "\\u003c")}`,
    );
  }
  if (ssrMessages && Object.keys(ssrMessages).length > 0) {
    parts.push(
      `window.__SSR_MESSAGES__=${JSON.stringify(ssrMessages).replace(/</g, "\\u003c")}`,
    );
  }
  if (parts.length === 0) return "";
  return `<script>${parts.join(";")}</script>`;
}
