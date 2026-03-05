import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import Layout from "./pages/layout.tsx";
import HomePage from "./pages/home.tsx";
import { OrderPage } from "./pages/order";
import AccountPage from "./pages/account.tsx";
import SignUpPage from "./pages/sign-up.tsx";
import { TosPage } from "./pages/terms.tsx";
import { StatusPage } from "./pages/status.tsx";
import { AccountSettings } from "./pages/account-settings.tsx";
import { VmBillingPage } from "./pages/vm-billing.tsx";
import { VmGraphsPage } from "./pages/vm-graphs.tsx";
import { NewsPage } from "./pages/news.tsx";
import { NewsPost } from "./pages/news-post.tsx";
import { AccountNostrDomainPage } from "./pages/account-domain.tsx";
import { VmHistoryPage } from "./pages/vm-history.tsx";
import VmUpgradePage from "./pages/vm-upgrade.tsx";
import { AccountSupportPage } from "./pages/account-support.tsx";
import { AccountMessagesPage } from "./pages/account-messages.tsx";
import { ContactPage } from "./pages/contact.tsx";
import { AccountReferralPage } from "./pages/account-referral.tsx";
import AccountLayout from "./pages/account-layout.tsx";
import {
  homeLoader,
  newsLoader,
  newsPostLoader,
  statusLoader,
} from "./loaders.ts";

// Lazy-load pages that import browser-only libraries (xterm, qr-code-styling)
// so they are code-split out of the SSR bundle.
const VmPage = lazy(() => import("./pages/vm.tsx"));
const VmConsolePage = lazy(() =>
  import("./pages/vm-console.tsx").then((m) => ({ default: m.VmConsolePage })),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <HomePage />,
        loader: homeLoader,
      },
      {
        path: "/login",
        element: <SignUpPage />,
      },
      {
        path: "/account",
        element: <AccountLayout />,
        children: [
          {
            index: true,
            element: <AccountPage />,
          },
          {
            path: "settings",
            element: <AccountSettings />,
          },
          {
            path: "nostr-domain",
            element: <AccountNostrDomainPage />,
          },
          {
            path: "messages",
            element: <AccountMessagesPage />,
          },
          {
            path: "support",
            element: <AccountSupportPage />,
          },
          {
            path: "referral",
            element: <AccountReferralPage />,
          },
        ],
      },
      {
        path: "/contact",
        element: <ContactPage />,
      },
      {
        path: "/order",
        element: <OrderPage />,
      },
      {
        path: "/vm",
        element: (
          <Lazy>
            <VmPage />
          </Lazy>
        ),
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
        element: (
          <Lazy>
            <VmConsolePage />
          </Lazy>
        ),
      },
      {
        path: "/vm/history",
        element: <VmHistoryPage />,
      },
      {
        path: "/vm/upgrade",
        element: <VmUpgradePage />,
      },
      {
        path: "/tos",
        element: <TosPage />,
      },
      {
        path: "/status",
        element: <StatusPage />,
        loader: statusLoader,
      },
      {
        path: "/news",
        element: <NewsPage />,
        loader: newsLoader,
      },
      {
        path: "/news/:id",
        element: <NewsPost />,
        loader: newsPostLoader,
      },
    ],
  },
];
