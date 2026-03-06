import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router-dom";
import { SnortContext } from "@snort/system-react";
import { IntlProvider } from "react-intl";
import { LocaleContext } from "./components/translation-provider.tsx";
import { routes } from "./routes.tsx";
import localesMetadata from "./locales-metadata.json";
import { setSSRLocale, serializeCacheScript } from "./ssr-cache.ts";
import {
  HeadContext,
  createHeadStore,
  serializeHead,
} from "./components/head-context.tsx";
import { RequestBuilder, EventKind } from "@snort/system";
import { NostrProfile, System } from "./const.ts";

export function startPersistentQueries() {
  const newsReq = new RequestBuilder("server-news");
  newsReq
    .withOptions({ leaveOpen: true })
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id]);

  const statusReq = new RequestBuilder("server-status");
  statusReq
    .withOptions({ leaveOpen: true })
    .withFilter()
    .kinds([30999 as number])
    .authors([NostrProfile.id]);

  const newsQuery = System.Query(newsReq);
  newsQuery.start();
  const statusQuery = System.Query(statusReq);
  statusQuery.start();
}
startPersistentQueries();

/** Load and flatten translation messages for a locale. */
async function loadMessages(locale: string): Promise<Record<string, string>> {
  if (locale === "en") return {};
  try {
    const mod = await import(`./locales/${locale}.json`);
    const raw = mod.default as Record<
      string,
      string | { defaultMessage: string }
    >;
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      flat[k] = typeof v === "string" ? v : v.defaultMessage;
    }
    return flat;
  } catch {
    return {};
  }
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

/**
 * Render the app for a given URL.
 *
 * Loaders attached to routes are called automatically by createStaticHandler.
 * The Accept-Language header is forwarded so locale-aware loaders work correctly.
 */
export async function render(
  url: string,
  locale = "en",
  acceptLanguage?: string | null,
  cookie?: string | null,
): Promise<{
  html: string;
  head: string;
  cacheScript: string;
  lang: string;
  dir: string;
}> {
  const handler = createStaticHandler(routes);

  const headers: Record<string, string> = { accept: "text/html" };
  if (acceptLanguage) headers["accept-language"] = acceptLanguage;
  if (cookie) headers["cookie"] = cookie;

  const fetchRequest = new Request(`http://localhost${url}`, {
    method: "GET",
    headers,
  });

  const context = await handler.query(fetchRequest);

  if (context instanceof Response) {
    return { html: "", head: "", cacheScript: "", lang: locale, dir: "ltr" };
  }

  const router = createStaticRouter(handler.dataRoutes, context);
  const headStore = createHeadStore();
  const messages = await loadMessages(locale);
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  const html = renderToString(
    <StrictMode>
      <HeadContext.Provider value={headStore}>
        <LocaleContext.Provider
          value={{
            locale,
            setLocale: () => { },
            supportedLocales: localesMetadata,
          }}
        >
          <IntlProvider locale={locale} messages={messages} defaultLocale="en">
            <SnortContext.Provider value={System}>
              <StaticRouterProvider router={router} context={context} />
            </SnortContext.Provider>
          </IntlProvider>
        </LocaleContext.Provider>
      </HeadContext.Provider>
    </StrictMode>,
  );

  // Inject locale + messages into the page so the client hydrates with matching state.
  setSSRLocale(locale, messages);
  const cacheScript = serializeCacheScript();
  const head = serializeHead(headStore.get());

  return { html, head, cacheScript, lang: locale, dir };
}

export { detectLocale } from "./utils/locale.ts";
