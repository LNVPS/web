/**
 * Production server — Bun.serve with static file serving + SSR.
 */
import "./polyfill.ts";

import { renderPage } from "./ssr-render.ts";

const port = Number(process.env.PORT) || 3000;

// Tor onion address of the web frontend. When set, clearnet responses advertise
// it via the `Onion-Location` header so Tor Browser can offer/redirect to the
// onion service. Configured via VITE_WEB_URL_ONION (shared with the client).
const onionWebUrl = process.env.VITE_WEB_URL_ONION?.replace(/\/$/, "") ?? "";

/**
 * Build the `Onion-Location` header value for a request, or `undefined` when it
 * should not be sent (no onion configured, or request already on the onion).
 */
function onionLocation(url: URL): string | undefined {
  if (!onionWebUrl) return undefined;
  if (url.hostname.endsWith(".onion")) return undefined;
  return `${onionWebUrl}${url.pathname}${url.search}`;
}

const templateHtml = await Bun.file("./dist/client/index.html").text();

const ssr: typeof import("../src/entry-server") =
  // @ts-ignore built SSR output has no declarations
  await import("../dist/server/entry-server.js");

const server = Bun.serve({
  port,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve static files from dist/client
    const staticFile = Bun.file(`./dist/client${pathname}`);
    if (pathname !== "/" && (await staticFile.exists())) {
      return new Response(staticFile, {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // SSR for everything else
    try {
      const result = await renderPage(
        url.pathname + url.search,
        templateHtml,
        ssr,
        req.headers.get("accept-language"),
        req.headers.get("cookie"),
      );
      const headers: Record<string, string> = {
        "Content-Type": "text/html",
      };
      const onion = onionLocation(url);
      if (onion) headers["Onion-Location"] = onion;
      return new Response(result.html, {
        status: result.status,
        headers,
      });
    } catch {
      console.error(`[${req.method}] ${pathname} 500`);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`Server running at http://localhost:${server.port}`);

function shutdown() {
  server.stop();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
