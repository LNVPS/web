import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { SnortContext } from "@snort/system-react";
import TranslationProvider from "./components/translation-provider.tsx";
import { routes } from "./routes.tsx";
import { createNostrSystem } from "./nostr-system.ts";

const system = createNostrSystem(true);

const router = createBrowserRouter(routes);

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <TranslationProvider>
      <SnortContext.Provider value={system}>
        <RouterProvider router={router} />
      </SnortContext.Provider>
    </TranslationProvider>
  </StrictMode>,
);
