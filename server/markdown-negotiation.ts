/**
 * Content negotiation for markdown-backed pages.
 *
 * Agents/CLIs that request `Accept: text/markdown` get the raw markdown source
 * of a page instead of the SSR'd HTML. Browsers (which send `text/html` with a
 * higher/equal q-value, or a wildcard) are unaffected.
 */

/** Media types treated as "the client wants markdown". */
const MARKDOWN_TYPES = new Set(["text/markdown", "text/x-markdown"]);

interface AcceptEntry {
  type: string;
  q: number;
}

/** Parse an Accept header into media types with their q-values. */
export function parseAccept(accept: string | null | undefined): AcceptEntry[] {
  if (!accept) return [];
  const out: AcceptEntry[] = [];
  for (const part of accept.split(",")) {
    const [rawType, ...params] = part.split(";");
    const type = rawType.trim().toLowerCase();
    if (!type) continue;
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=([0-9.]+)$/i);
      if (m) {
        const parsed = Number.parseFloat(m[1]);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    out.push({ type, q });
  }
  return out;
}

/** Highest q-value matching a predicate, or 0 when nothing matches. */
function bestQ(
  entries: AcceptEntry[],
  match: (type: string) => boolean,
): number {
  let best = 0;
  for (const e of entries) {
    if (e.q > best && match(e.type)) best = e.q;
  }
  return best;
}

/**
 * True when the client explicitly prefers markdown over HTML.
 *
 * Markdown must be listed explicitly (a bare wildcard never counts) and must
 * out-rank any HTML preference.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  const entries = parseAccept(accept);
  const markdownQ = bestQ(entries, (t) => MARKDOWN_TYPES.has(t));
  if (markdownQ <= 0) return false;
  const htmlQ = bestQ(
    entries,
    (t) => t === "text/html" || t === "application/xhtml+xml",
  );
  return markdownQ >= htmlQ;
}

/** Normalise a request path for lookup (strip query and trailing slash). */
export function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

/**
 * Return the raw markdown for a request, or `undefined` when the request
 * should fall through to normal SSR.
 */
export function markdownFor(
  pathname: string,
  accept: string | null | undefined,
  documents: Record<string, string> | undefined,
): string | undefined {
  if (!documents || !prefersMarkdown(accept)) return undefined;
  return documents[normalizePath(pathname)];
}

/** Headers to send with a raw markdown response. */
export const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept",
};
