import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { NostrSystem } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import Layout from "./pages/layout.tsx";
import HomePage from "./pages/home.tsx";
import OrderPage from "./pages/order.tsx";
import VmPage from "./pages/vm.tsx";
import AccountPage from "./pages/account.tsx";
import SignUpPage from "./pages/sign-up.tsx";
import { TosPage } from "./pages/terms.tsx";
import { StatusPage } from "./pages/status.tsx";
import { AccountSettings } from "./pages/account-settings.tsx";
import { VmBillingPage } from "./pages/vm-billing.tsx";
import { VmGraphsPage } from "./pages/vm-graphs.tsx";
import { NewsPage } from "./pages/news.tsx";
import { NewsPost } from "./pages/news-post.tsx";
import { VmConsolePage } from "./pages/vm-console.tsx";
import { AccountNostrDomainPage } from "./pages/account-domain.tsx";

const system = new NostrSystem({
  automaticOutboxModel: false,
  buildFollowGraph: false,
});
[
  "wss://relay.snort.social/",
  "wss://relay.damus.io/",
  "wss://relay.nostr.band/",
  "wss://nos.lol/",
].forEach((a) => system.ConnectToRelay(a, { read: true, write: true }));

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/login",
        element: <SignUpPage />,
      },
      {
        path: "/account",
        element: <AccountPage />,
      },
      {
        path: "/account/settings",
        element: <AccountSettings />,
      },
      {
        path: "/account/nostr-domain",
        element: <AccountNostrDomainPage />,
      },
      {
        path: "/order",
        element: <OrderPage />,
      },
      {
        path: "/vm",
        element: <VmPage />,
      },
      {
        path: "/vm/billing/:action?",
        element: <VmBillingPage />,
      },
      {
        path: "/vm/graphs",
        element: <VmGraphsPage />,
      },
      {
        path: "/vm/console",
        element: <VmConsolePage />,
      },
      {
        path: "/tos",
        element: <TosPage />,
      },
      {
        path: "/status",
        element: <StatusPage />,
      },
      {
        path: "/news",
        element: <NewsPage />,
      },
      {
        path: "/news/:id",
        element: <NewsPost />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SnortContext.Provider value={system}>
      <RouterProvider router={router} />
    </SnortContext.Provider>
  </StrictMode>,
);
