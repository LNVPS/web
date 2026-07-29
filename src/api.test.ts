import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LNVpsApi } from "./api";

describe("LNVpsApi#req content-type", () => {
  const realFetch = globalThis.fetch;
  let lastInit: RequestInit | undefined;

  beforeEach(() => {
    lastInit = undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      lastInit = init;
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("omits content-type when no body is sent", async () => {
    const api = new LNVpsApi("http://test", undefined, undefined, "token");
    // reinstallVm with no image_id sends no body (re-install with current image)
    await api.reinstallVm(1);

    expect(lastInit?.body).toBeUndefined();
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers["content-type"]).toBeUndefined();
  });

  test("sets content-type when a body is sent", async () => {
    const api = new LNVpsApi("http://test", undefined, undefined, "token");
    await api.reinstallVm(1, 5);

    expect(lastInit?.body).toBe(JSON.stringify({ image_id: 5 }));
    const headers = lastInit?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
  });
});
