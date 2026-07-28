import { describe, expect, test } from "bun:test";
import { createIntl } from "react-intl";
import { CostPlanIntervalType, type App } from "../api";
import { GiB } from "../const";
import { appSeoDescription, appSeoTitle } from "./app-seo";

const intl = createIntl({ locale: "en", messages: {} });

function app(over: Partial<App> = {}): App {
  return {
    id: 1,
    name: "strfry",
    display_name: "Strfry",
    compose: "",
    amount: 150,
    currency: "EUR",
    interval_amount: 1,
    interval_type: CostPlanIntervalType.MONTH,
    setup_amount: 0,
    cpu_milli: 500,
    memory_bytes: 512 * 1024 * 1024,
    storage_bytes: 5 * GiB,
    services: [],
    category: "Nostr relay",
    ...over,
  };
}

describe("appSeoTitle", () => {
  test("falls back to the display name without a category", () => {
    expect(appSeoTitle(app({ category: undefined }), intl)).toBe("Strfry");
  });
});

describe("appSeoDescription", () => {
  test("drops the storage clause below 1 GiB", () => {
    const text = appSeoDescription(app({ storage_bytes: 512 * 1024 }), intl);
    expect(text).not.toContain("storage");
    expect(text).toContain("no server to patch.");
  });

  test("quotes payment options rather than a price on a yearly plan", () => {
    const text = appSeoDescription(
      app({ interval_type: CostPlanIntervalType.YEAR }),
      intl,
    );
    expect(text).toContain("Pay with Lightning, Bitcoin, or card.");
    expect(text).not.toContain("/month");
  });
});
