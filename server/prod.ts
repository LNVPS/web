/**
 * Production server — Bun.serve with static file serving + SSR.
 */
import "./polyfill.ts";

import { renderPage } from "./ssr-render.ts";

const port = Number(process.env.PORT) || 3000;

const templateHtml = await Bun.file("./dist/client/index.html").text();
const ssr: typeof import("../src/entry-server") =
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
      return new Response(result.html, {
        status: result.status,
        headers: { "Content-Type": "text/html" },
      });
    } catch (e) {
      console.error((e as Error).stack);
      return new Response((e as Error).stack, { status: 500 });
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
