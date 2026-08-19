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

describe("LNVpsApi websocket auth", () => {
  const realFetch = globalThis.fetch;
  const realWebSocket = globalThis.WebSocket;
  let requested: Array<{ url: string; body?: string }> = [];
  let socketUrls: Array<string> = [];

  beforeEach(() => {
    requested = [];
    socketUrls = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      requested.push({ url, body: init?.body as string | undefined });
      return new Response(
        JSON.stringify({ data: { ticket: "tk 1", expires_in: 30 } }),
        { status: 200 },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    class FakeWebSocket {
      onopen?: () => void;
      onerror?: (e: unknown) => void;
      constructor(url: string) {
        socketUrls.push(url);
        // Resolve on the next tick so the caller can attach handlers first.
        setTimeout(() => this.onopen?.(), 0);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.WebSocket = FakeWebSocket as any;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    globalThis.WebSocket = realWebSocket;
  });

  test("support chat mints a path-scoped ticket and opens a ws:// socket", async () => {
    const api = new LNVpsApi("http://test", undefined, undefined, "token");
    await api.connectSupportChat();

    expect(requested[0].url).toBe("http://test/api/v1/auth/ticket");
    expect(requested[0].body).toBe(
      JSON.stringify({ path: "/api/v1/support/chat" }),
    );
    // The ticket is URL-encoded, not pasted in raw.
    expect(socketUrls[0]).toBe("ws://test/api/v1/support/chat?ticket=tk%201");
  });

  test("support chat is unavailable when the route is not mounted", async () => {
    globalThis.fetch = (async () =>
      new Response(null, { status: 404 })) as unknown as typeof fetch;
    const api = new LNVpsApi("http://test", undefined, undefined, "token");
    expect(await api.supportChatAvailable()).toBe(false);
  });

  test("a mounted route rejects the probe with 400 and counts as available", async () => {
    globalThis.fetch = (async () =>
      new Response(null, { status: 400 })) as unknown as typeof fetch;
    const api = new LNVpsApi("http://test", undefined, undefined, "token");
    expect(await api.supportChatAvailable()).toBe(true);
  });

  test("a network failure does not hide the feature", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const api = new LNVpsApi("http://test", undefined, undefined, "token");
    expect(await api.supportChatAvailable()).toBe(true);
  });

  test("console shares the same ticketed connect path", async () => {
    const api = new LNVpsApi("https://test", undefined, undefined, "token");
    await api.connect_terminal(7);

    expect(requested[0].body).toBe(
      JSON.stringify({ path: "/api/v1/vm/7/console" }),
    );
    expect(socketUrls[0]).toBe("wss://test/api/v1/vm/7/console?ticket=tk%201");
  });
});
