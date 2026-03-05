import type { LoaderFunctionArgs } from "react-router-dom";
import { EventKind, RequestBuilder, TaggedNostrEvent } from "@snort/system";
import {
  LNVpsApi,
  PaymentMethod,
  VmTemplateResponse,
  AvailableIpSpace,
} from "./api";
import { ApiUrl, NostrProfile } from "./const";
import { filterArticlesByLocale } from "./utils/news-locale";
import { detectLocale } from "./utils/locale";
import { serverSystem as loaderSystem } from "./nostr-system";

// ── In-process TTL cache shared across requests ───────────────────────────────

interface CacheEntry<T> {
  data: T;
  time: number;
}

const memCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// ── Shared Nostr request builders ─────────────────────────────────────────────

function buildNewsReq() {
  const req = new RequestBuilder("loader-news");
  req
    .withFilter()
    .kinds([EventKind.LongFormTextNote])
    .authors([NostrProfile.id])
    .limit(50);
  return req;
}

function buildStatusReq() {
  const req = new RequestBuilder("loader-status");
  req
    .withFilter()
    .kinds([30999 as number])
    .authors([NostrProfile.id])
    .limit(50);
  return req;
}

// ── Loader return types ───────────────────────────────────────────────────────

export interface HomeLoaderData {
  offers: VmTemplateResponse | undefined;
  ipSpaces: AvailableIpSpace[] | undefined;
  paymentMethods: PaymentMethod[] | undefined;
  latestNews: TaggedNostrEvent[];
}

export interface NewsLoaderData {
  articles: TaggedNostrEvent[];
}

export interface NewsPostLoaderData {
  article: TaggedNostrEvent | undefined;
}

export interface StatusLoaderData {
  events: TaggedNostrEvent[];
}

// ── Loader functions ──────────────────────────────────────────────────────────

export async function homeLoader({
  request,
}: LoaderFunctionArgs): Promise<HomeLoaderData> {
  const locale = detectLocale(
    request.headers.get("accept-language"),
    request.headers.get("cookie"),
  );
  const api = new LNVpsApi(ApiUrl ?? "", undefined, 5000);

  const [offers, ipSpaces, paymentMethods, rawNews] = await Promise.all([
    cached("offers", () => api.listOffers()),
    cached("ipSpaces", () => api.listAvailableIpSpace()),
    cached("payment_methods", () => api.getPaymentMethods()),
    cached("news", () => loaderSystem.Fetch(buildNewsReq())),
  ]);

  const latestNews =
    rawNews && rawNews.length > 0
      ? filterArticlesByLocale(rawNews, locale).slice(0, 1)
      : [];

  return { offers, ipSpaces, paymentMethods, latestNews };
}

export async function newsLoader({
  request,
}: LoaderFunctionArgs): Promise<NewsLoaderData> {
  const locale = detectLocale(
    request.headers.get("accept-language"),
    request.headers.get("cookie"),
  );

  const rawNews = await cached("news", () =>
    loaderSystem.Fetch(buildNewsReq()),
  );
  const articles =
    rawNews && rawNews.length > 0
      ? filterArticlesByLocale(rawNews, locale)
      : [];

  return { articles };
}

export async function newsPostLoader({
  params,
}: LoaderFunctionArgs): Promise<NewsPostLoaderData> {
  const dTag = params.id;
  if (!dTag) return { article: undefined };

  const req = new RequestBuilder("loader-news-post");
  req.withFilter().tag("d", [dTag]).authors([NostrProfile.id]).limit(1);

  try {
    const events = await loaderSystem.Fetch(req);
    return { article: events.at(0) };
  } catch {
    return { article: undefined };
  }
}

export async function statusLoader(): Promise<StatusLoaderData> {
  const events = await cached("status", () =>
    loaderSystem.Fetch(buildStatusReq()),
  );

  return { events: events ?? [] };
}
