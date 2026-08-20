/**
 * Raw markdown sources for pages that are backed 1:1 by a markdown document.
 *
 * These are imported with `?raw` so the exact same text is used by the React
 * page (rendered via `<Markdown/>`) and by the SSR servers, which serve the
 * raw markdown directly when a client asks for `text/markdown` (see
 * `server/markdown-negotiation.ts`). The map is exported from
 * `src/entry-server.tsx` so the production Bun server — which only ships
 * `dist/` and `server/`, not `src/` — can reach it through the SSR bundle.
 */
import TOS from "./tos.md?raw";

export const MarkdownDocuments: Record<string, string> = {
  "/tos": TOS,
};
