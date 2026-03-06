/**
 * Development server — Express + Vite middleware mode for HMR + SSR.
 */
import "./polyfill.ts";

import fs from "node:fs/promises";
import express from "express";
import { createServer as createViteServer } from "vite";
import { renderPage } from "./ssr-render.ts";

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

    const ssr = await vite.ssrLoadModule("/src/entry-server.tsx");
    const result = await renderPage(
      url,
      template,
      ssr as typeof import("../src/entry-server"),
      req.headers["accept-language"],
      req.headers["cookie"],
    );

    console.log(`[${req.method}] ${url} ${result.status}`);
    res
      .status(result.status)
      .set({ "Content-Type": "text/html" })
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
