import type { LoaderFunctionArgs } from "react-router-dom";
import type { TaggedNostrEvent } from "@snort/system";
import {
  LNVpsApi,
  PaymentMethod,
  VmTemplateResponse,
  VmCustomPrice,
  AvailableIpSpace,
  App,
  VpnService,
} from "./api";
import { regionCustomTemplate, regionEntrySpec } from "./utils/regions";
import { findApp } from "./utils/apps";
import { ApiUrl, BlossomAppId, System } from "./const";
import { filterArticlesByLocale } from "./utils/news-locale";
import { mergeNewsWithArchive } from "./utils/news-archive";
import { detectLocale } from "./utils/locale";

// ── In-process TTL cache shared across requests ──────────────────────────────

interface CacheEntry<T> {
  data: T;
  time: number;
}

const memCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000;

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const entry = memCache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  try {
    const data = await loader();
    memCache.set(key, { data, time: Date.now() });
    return data;
  } catch (e) {
    console.warn(`Loader fetch failed for ${key}:`, (e as Error).message);
    return entry?.data ?? (undefined as T);
  }
}

export interface HomeLoaderData {
  offers?: VmTemplateResponse;
  ipSpaces?: AvailableIpSpace[];
  paymentMethods?: PaymentMethod[];
  latestNews?: TaggedNostrEvent[];
  apps?: App[];
  vpn?: VpnService[];
}

export interface NewsLoaderData {
  articles?: TaggedNostrEvent[];
}

export interface NewsPostLoaderData {
  article?: TaggedNostrEvent;
}

export interface StatusLoaderData {
  events?: TaggedNostrEvent[];
}

export interface AppLoaderData {
  app?: App;
}

export interface AppsLoaderData {
  apps?: App[];
}

export interface VpnLoaderData {
  vpn?: VpnService[];
}

export interface RegionLoaderData {
  /** The whole catalog: the Bitcoin page names every region, not just one. */
  offers?: VmTemplateResponse;
  /** Entry price for this region's smallest build, ex-VAT and unconverted. */
  from?: VmCustomPrice;
  apps?: App[];
}

export function getNews() {
  return mergeNewsWithArchive(System.GetQuery("server-news")?.snapshot);
}

export function getStatus() {
  return System.GetQuery("server-status")?.snapshot;
}

export async function homeLoader({
  request,
}: LoaderFunctionArgs): Promise<HomeLoaderData> {
  const locale = detectLocale(
    request.headers.get("accept-language"),
    request.headers.get("cookie"),
  );
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);

  const news = getNews();

  // IP ranges are not production-ready yet, so don't fetch available IP space
  // (or render it — see IpSpaceSection in home.tsx).
  // The app catalog is a public browse surface (like VM templates), fetched
  // unauthenticated here for SSR on the homepage.
  const [offers, paymentMethods, apps, vpn] = await Promise.all([
    cached("offers", () => api.listOffers()),
    cached("payment_methods", () => api.getPaymentMethods()),
    cached("apps", () => api.listApps()),
    // Public like the other catalogs, so the plans are in the server-rendered
    // HTML rather than appearing after hydration.
    cached("vpn_services", () => api.listVpnServices()),
  ]);

  const latestNews =
    news && news.length > 0
      ? filterArticlesByLocale(news, locale).slice(0, 1)
      : undefined;

  return { offers, paymentMethods, latestNews, apps, vpn };
}

/**
 * Loader for `/vpn`, the public VPN page.
 *
 * Shares the `vpn_services` cache entry with `homeLoader`, which fetches the
 * same unauthenticated list.
 */
export async function vpnLoader(): Promise<VpnLoaderData> {
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const vpn = await cached("vpn_services", () => api.listVpnServices());
  return { vpn };
}

export async function newsLoader({
  request,
}: LoaderFunctionArgs): Promise<NewsLoaderData> {
  const locale = detectLocale(
    request.headers.get("accept-language"),
    request.headers.get("cookie"),
  );

  // An empty `articles` would stick: the page hook prefers loader data over its
  // own subscription, so hand back undefined and let the client fetch.
  const news = getNews();
  if (news.length > 0) {
    return { articles: filterArticlesByLocale(news, locale) };
  } else {
    return { articles: undefined };
  }
}

export async function newsPostLoader({
  params,
}: LoaderFunctionArgs): Promise<NewsPostLoaderData> {
  const dTag = params.id;
  if (!dTag) return { article: undefined };

  const news = getNews();
  const article = news?.find((e) =>
    e.tags.some((t) => t[0] === "d" && t[1] === dTag),
  );

  return { article };
}

export async function statusLoader(): Promise<StatusLoaderData> {
  const status = getStatus();
  return { events: status };
}

/**
 * `/apps/:slug` is the public product page for an orderable managed app,
 * addressed by `app.name` — the API's URL/DNS-safe slug (`LNVPS/web#94`) —
 * so it has to server-render a real title and h1 rather than fetch the app in
 * an effect. There is no by-slug endpoint, so this reads the same public
 * catalog `appsLoader` and the homepage already fetch and cache, and finds
 * the row there — one more app in the catalog costs no new request here.
 *
 * `findApp` also matches a numeric param against `id`, so a link off the old
 * (already-indexed) `/apps/<id>` sitemap entries still resolves instead of
 * turning into a crawled `noindex` at 200.
 */
export async function appLoader({
  params,
}: LoaderFunctionArgs): Promise<AppLoaderData> {
  const slug = params.slug;
  if (!slug) return { app: undefined };

  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const apps = await cached("apps", () => api.listApps());
  return { app: findApp(apps, slug) };
}

/**
 * `/apps` is the public catalog listing, so like `/apps/:slug` it has to
 * server-render its content rather than fetch in an effect. Shares the `apps`
 * cache entry with `homeLoader`, which fetches the same unauthenticated list.
 */
export async function appsLoader(): Promise<AppsLoaderData> {
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const apps = await cached("apps", () => api.listApps());
  return { apps };
}

/**
 * Loader for a region landing page (`/vps-ireland`, `/vps-london`,
 * `/vps-canada`) and for `/bitcoin-node-hosting`, which is Dublin's.
 *
 * These are SSR ranking surfaces, so the specs and the price have to be in the
 * server-rendered HTML rather than fetched in an effect. Two calls, both
 * cached: the catalog for the region's ranges, and one price for the smallest
 * machine that region can build.
 *
 * The price call is a POST, so it is not cacheable by URL — the entry spec is
 * derived from the same catalog row, so the request is identical for every
 * visitor and the response is cached per region like any other loader fetch.
 *
 * `apps` is fetched only for the page that cross-sells the managed apps, and
 * shares `appsLoader`'s cache entry.
 */
export function regionLoader(regionId: number, opts?: { apps?: boolean }) {
  return async function loadRegion(): Promise<RegionLoaderData> {
    const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
    const [offers, apps] = await Promise.all([
      cached("offers", () => api.listOffers()),
      opts?.apps ? cached("apps", () => api.listApps()) : undefined,
    ]);

    const spec = regionEntrySpec(regionCustomTemplate(offers, regionId));
    const from = spec
      ? await cached(`region_from_${regionId}`, () => api.customPrice(spec))
      : undefined;

    return { offers, from, apps };
  };
}

/**
 * `/blossom-server-hosting` sells one app, so it fetches that app alone —
 * only to build its `Product`/`Offer` schema from the real price rather than a
 * hardcoded one. The page's copy is static, so an undefined app costs the
 * structured data and nothing else.
 *
 * Its own `app_2` cache entry, not the catalog `appLoader` reads from
 * (`LNVPS/web#94`) — a single-app fetch by id, cheaper than filtering the
 * whole list for a page that only wants this one row.
 */
export async function blossomHostingLoader(): Promise<AppLoaderData> {
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const app = await cached(`app_${BlossomAppId}`, () =>
    api.getApp(BlossomAppId),
  );
  return { app };
}
