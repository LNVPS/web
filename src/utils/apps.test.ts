import { describe, expect, test } from "bun:test";
import { CostPlanIntervalType, type App } from "../api";
import { GiB } from "../const";
import { findApp } from "./apps";

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
    ...over,
  };
}

describe("findApp", () => {
  const strfry = app({ id: 1, name: "strfry" });
  const route96 = app({ id: 2, name: "route96" });
  const apps = [strfry, route96];

  test("matches the slug", () => {
    expect(findApp(apps, "route96")).toBe(route96);
  });

  test("matches the slug case-insensitively", () => {
    expect(findApp(apps, "Route96")).toBe(route96);
    expect(findApp(apps, "STRFRY")).toBe(strfry);
  });

  test("falls back to the numeric id an old sitemap entry still links to", () => {
    expect(findApp(apps, "2")).toBe(route96);
  });

  test("a numeric param that matches nobody's id or slug is undefined", () => {
    expect(findApp(apps, "99")).toBeUndefined();
  });

  test("a slug that merely looks close to another does not fall back", () => {
    expect(findApp(apps, "route97")).toBeUndefined();
  });

  test("undefined without a catalog", () => {
    expect(findApp(undefined, "strfry")).toBeUndefined();
  });
});
