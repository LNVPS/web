/**
 * Development server — Express + Vite middleware mode for HMR + SSR.
 */
import "./polyfill.ts";

import fs from "node:fs/promises";
import express from "express";
import { createServer as createViteServer } from "vite";
import { renderPage } from "./ssr-render.ts";
import { MARKDOWN_HEADERS, markdownFor } from "./markdown-negotiation.ts";
import { generateNewsArchive } from "./gen-news-archive.ts";

// The archive is generated, not committed, and `src/entry-server.tsx` imports
// it: without this a fresh checkout renders 500 until something runs a build.
console.log(`news archive: ${generateNewsArchive()} events`);

const port = Number(process.env.PORT) || 3000;
const base = process.env.BASE || "/";

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
  base,
});

const app = express();
app.use(vite.middlewares);

app.use("*all", async (req, res) => {
  try {
    const url = req.originalUrl;
    let template = await fs.readFile("./index.html", "utf-8");
    template = await vite.transformIndexHtml(url, template);

    const ssr = (await vite.ssrLoadModule(
      "/src/entry-server.tsx",
    )) as typeof import("../src/entry-server");

    const markdown = markdownFor(
      req.originalUrl,
      req.headers["accept"],
      ssr.MarkdownDocuments,
    );
    if (markdown !== undefined) {
      console.log(`[${req.method}] ${url} 200 (markdown)`);
      res.status(200).set(MARKDOWN_HEADERS).send(markdown);
      return;
    }

    const result = await renderPage(
      url,
      template,
      ssr,
      req.headers["accept-language"],
      req.headers["cookie"],
    );

    console.log(`[${req.method}] ${url} ${result.status}`);
    res
      .status(result.status)
      .set({ "Content-Type": "text/html", Vary: "Accept" })
      .send(result.html);
  } catch {
    console.error(`[${req.method}] ${req.originalUrl} 500`);
    res.status(500).end("Internal Server Error");
  }
});

const server = app.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
