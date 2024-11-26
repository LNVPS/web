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
        path: "/account",
        element: <AccountPage />,
      },
      {
        path: "/order",
        element: <OrderPage />,
      },
      {
        path: "/vm/:action?",
        element: <VmPage />,
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
