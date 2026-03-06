import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { SnortContext } from "@snort/system-react";
import TranslationProvider from "./components/translation-provider.tsx";
import { routes } from "./routes.tsx";
import { System } from "./const.ts";

const router = createBrowserRouter(routes);

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <TranslationProvider>
      <SnortContext.Provider value={System}>
        <RouterProvider router={router} />
      </SnortContext.Provider>
    </TranslationProvider>
  </StrictMode>,
);
