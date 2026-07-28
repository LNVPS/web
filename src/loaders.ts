import type { LoaderFunctionArgs } from "react-router-dom";
import type { TaggedNostrEvent } from "@snort/system";
import {
  LNVpsApi,
  PaymentMethod,
  VmTemplateResponse,
  AvailableIpSpace,
  App,
} from "./api";
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
  const [offers, paymentMethods, apps] = await Promise.all([
    cached("offers", () => api.listOffers()),
    cached("payment_methods", () => api.getPaymentMethods()),
    cached("apps", () => api.listApps()),
  ]);

  const latestNews =
    news && news.length > 0
      ? filterArticlesByLocale(news, locale).slice(0, 1)
      : undefined;

  return { offers, paymentMethods, latestNews, apps };
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
 * `/apps/:id` is the public product page for an orderable managed app, so it
 * has to server-render a real title and h1 rather than fetch the app in an
 * effect. The catalog is public, so fetch unauthenticated — the same client the
 * homepage uses for its app section.
 */
export async function appLoader({
  params,
}: LoaderFunctionArgs): Promise<AppLoaderData> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return { app: undefined };

  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const app = await cached(`app_${id}`, () => api.getApp(id));
  return { app };
}

/**
 * `/apps` is the public catalog listing, so like `/apps/:id` it has to
 * server-render its content rather than fetch in an effect. Shares the `apps`
 * cache entry with `homeLoader`, which fetches the same unauthenticated list.
 */
export async function appsLoader(): Promise<AppsLoaderData> {
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const apps = await cached("apps", () => api.listApps());
  return { apps };
}

/**
 * `/blossom-server-hosting` sells one app, so it fetches that app alone —
 * only to build its `Product`/`Offer` schema from the real price rather than a
 * hardcoded one. The page's copy is static, so an undefined app costs the
 * structured data and nothing else.
 *
 * Shares the `app_2` cache entry with `appLoader`, which fetches the same
 * unauthenticated record for `/apps/2`.
 */
export async function blossomHostingLoader(): Promise<AppLoaderData> {
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);
  const app = await cached(`app_${BlossomAppId}`, () =>
    api.getApp(BlossomAppId),
  );
  return { app };
}
