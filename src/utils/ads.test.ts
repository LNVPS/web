import { describe, expect, test } from "bun:test";
import {
  ConsentStorageKey,
  adsConfig,
  consentState,
  isFirstPayment,
  loadAds,
  pageLocation,
  recordConsent,
  storedConsent,
  trackPageView,
  trackPurchase,
} from "./ads";

function fakeWindow() {
  return { dataLayer: undefined } as unknown as Window;
}

function fakeDocument() {
  const appended: Array<{ src: string; async: boolean }> = [];
  const doc = {
    createElement: () => ({ src: "", async: false }),
    head: {
      appendChild: (el: { src: string; async: boolean }) => appended.push(el),
    },
  } as unknown as Document;
  return { doc, appended };
}

describe("adsConfig", () => {
  test("is off when no tag id is configured", () => {
    expect(adsConfig({})).toBeUndefined();
    expect(adsConfig({ VITE_GOOGLE_ADS_ID: "  " })).toBeUndefined();
  });

  test("reads the tag id and an optional purchase label", () => {
    expect(adsConfig({ VITE_GOOGLE_ADS_ID: "AW-1" })).toEqual({
      tagId: "AW-1",
      purchaseLabel: "",
    });
    expect(
      adsConfig({
        VITE_GOOGLE_ADS_ID: "AW-1",
        VITE_GOOGLE_ADS_PURCHASE_LABEL: "abc",
      }),
    ).toEqual({
      tagId: "AW-1",
      purchaseLabel: "abc",
    });
  });
});

describe("consent", () => {
  test("consentState sets all four signals", () => {
    expect(consentState("denied")).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  });

  test("storedConsent ignores anything but a recorded choice", () => {
    const store = (v: string | null) => ({ getItem: () => v });
    expect(storedConsent(store("granted"))).toBe("granted");
    expect(storedConsent(store("denied"))).toBe("denied");
    expect(storedConsent(store("maybe"))).toBeUndefined();
    expect(storedConsent(store(null))).toBeUndefined();
  });

  test("recordConsent stores the choice and only grants on accept", () => {
    const calls: unknown[][] = [];
    const saved: Record<string, string> = {};
    const win = { gtag: (...a: unknown[]) => calls.push(a) };
    const storage = { setItem: (k: string, v: string) => (saved[k] = v) };
    recordConsent("denied", win, storage);
    expect(saved[ConsentStorageKey]).toBe("denied");
    expect(calls).toEqual([]);
    recordConsent("granted", win, storage);
    expect(saved[ConsentStorageKey]).toBe("granted");
    expect(calls).toEqual([["consent", "update", consentState("granted")]]);
  });
});

describe("loadAds", () => {
  test("denies consent by default and defers the page view to the router", () => {
    const win = fakeWindow();
    const { doc, appended } = fakeDocument();
    loadAds({ tagId: "AW-9", purchaseLabel: "" }, win, doc, {
      getItem: () => null,
    });
    const layer = (win.dataLayer as unknown[][]).map((a) =>
      Array.from(a as ArrayLike<unknown>),
    );
    expect(layer[0]).toEqual(["consent", "default", consentState("denied")]);
    expect(layer.find((a) => a[0] === "config")).toEqual([
      "config",
      "AW-9",
      { send_page_view: false },
    ]);
    expect(layer.some((a) => a[0] === "consent" && a[1] === "update")).toBe(
      false,
    );
    expect(appended[0].src).toBe(
      "https://www.googletagmanager.com/gtag/js?id=AW-9",
    );
  });

  test("restores a previously granted choice and does not load twice", () => {
    const win = fakeWindow();
    const { doc, appended } = fakeDocument();
    const config = { tagId: "AW-9", purchaseLabel: "" };
    loadAds(config, win, doc, { getItem: () => "granted" });
    loadAds(config, win, doc, { getItem: () => "granted" });
    const layer = (win.dataLayer as unknown[][]).map((a) =>
      Array.from(a as ArrayLike<unknown>),
    );
    expect(
      layer.filter((a) => a[0] === "consent" && a[1] === "update"),
    ).toEqual([["consent", "update", consentState("granted")]]);
    expect(appended.length).toBe(1);
  });
});

describe("events", () => {
  test("pageLocation joins path and query", () => {
    expect(pageLocation("/vps-ireland", "?a=1")).toBe("/vps-ireland?a=1");
  });

  test("trackPageView sends the location and title", () => {
    const calls: unknown[][] = [];
    trackPageView({ gtag: (...a: unknown[]) => calls.push(a) }, "/x", "X");
    expect(calls).toEqual([
      ["event", "page_view", { page_location: "/x", page_title: "X" }],
    ]);
  });

  test("trackPurchase needs a label and fires nothing without one", () => {
    const calls: unknown[][] = [];
    const win = { gtag: (...a: unknown[]) => calls.push(a) };
    trackPurchase(undefined, win);
    trackPurchase({ tagId: "AW-1", purchaseLabel: "" }, win);
    expect(calls).toEqual([]);
    trackPurchase({ tagId: "AW-1", purchaseLabel: "lbl" }, win);
    expect(calls).toEqual([
      [
        "event",
        "conversion",
        {
          send_to: "AW-1/lbl",
          value: 1.0,
          currency: "EUR",
          transaction_id: "",
        },
      ],
    ]);
    calls.length = 0;
    trackPurchase({ tagId: "AW-1", purchaseLabel: "lbl" }, win, 42);
    expect((calls[0][2] as { transaction_id: string }).transaction_id).toBe(
      "42",
    );
  });
});

describe("isFirstPayment", () => {
  test("a VM with no expiry has never been paid for", () => {
    expect(isFirstPayment({})).toBe(true);
    expect(isFirstPayment({ expires: "2026-11-01T00:00:00Z" })).toBe(false);
    expect(isFirstPayment(undefined)).toBe(false);
  });
});
