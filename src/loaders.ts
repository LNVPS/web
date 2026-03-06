import type { LoaderFunctionArgs } from "react-router-dom";
import type { TaggedNostrEvent } from "@snort/system";
import {
  LNVpsApi,
  PaymentMethod,
  VmTemplateResponse,
  AvailableIpSpace,
} from "./api";
import { ApiUrl, System } from "./const";
import { filterArticlesByLocale } from "./utils/news-locale";
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

export function getNews() {
  return System.GetQuery("server-news")?.snapshot;
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

  const [offers, ipSpaces, paymentMethods] = await Promise.all([
    cached("offers", () => api.listOffers()),
    cached("ipSpaces", () => api.listAvailableIpSpace()),
    cached("payment_methods", () => api.getPaymentMethods()),
  ]);

  const latestNews =
    news && news.length > 0
      ? filterArticlesByLocale(news, locale).slice(0, 1)
      : undefined;

  return { offers, ipSpaces, paymentMethods, latestNews };
}

export async function newsLoader({
  request,
}: LoaderFunctionArgs): Promise<NewsLoaderData> {
  const locale = detectLocale(
    request.headers.get("accept-language"),
    request.headers.get("cookie"),
  );

  const news = getNews();
  if (news) {
    return { articles: filterArticlesByLocale(news, locale) };
  } else {
    return { articles: undefined }
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
