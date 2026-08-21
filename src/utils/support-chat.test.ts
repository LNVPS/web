import { afterEach, describe, expect, test } from "bun:test";
import {
  appendUserMessage,
  applyChatEvent,
  ChatState,
  emptyChatState,
  clearGuestSessionId,
  isThinking,
  loadGuestSessionId,
  saveGuestSessionId,
  stallTurn,
} from "./support-chat";

function run(events: Parameters<typeof applyChatEvent>[1][]): ChatState {
  return runFrom(emptyChatState, events);
}

function runFrom(
  from: ChatState,
  events: Parameters<typeof applyChatEvent>[1][],
): ChatState {
  return events.reduce(applyChatEvent, from);
}

describe("support chat reducer", () => {
  test("tokens accumulate into one streaming message", () => {
    const s = run([
      { type: "token", text: "Hel" },
      { type: "token", text: "lo" },
    ]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({
      role: "agent",
      text: "Hello",
      streaming: true,
    });
  });

  test("final replaces the accumulated text and ends the turn", () => {
    const s = run([
      { type: "token", text: "Hel" },
      { type: "final", text: "Hello there" },
    ]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({
      text: "Hello there",
      streaming: false,
    });
    expect(s.awaitingReply).toBe(false);
  });

  test("final with no preceding token still produces a message", () => {
    const s = run([{ type: "final", text: "Done" }]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ text: "Done", streaming: false });
  });

  test("a new turn starts a new message rather than extending the last", () => {
    const s = run([
      { type: "final", text: "First" },
      { type: "token", text: "Second" },
    ]);
    expect(s.messages.map((m) => m.text)).toEqual(["First", "Second"]);
  });

  test("error before any token replaces the empty placeholder", () => {
    const s = run([{ type: "error", message: "boom" }]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ text: "boom", failed: true });
    expect(s.awaitingReply).toBe(false);
  });

  test("error after partial content keeps what streamed", () => {
    const s = run([
      { type: "token", text: "partial" },
      { type: "error", message: "boom" },
    ]);
    expect(s.messages).toHaveLength(2);
    expect(s.messages[0]).toMatchObject({ text: "partial", streaming: false });
    expect(s.messages[0].failed).toBeUndefined();
    expect(s.messages[1]).toMatchObject({ text: "boom", failed: true });
  });

  test("tool frames track in-flight lookups on the turn", () => {
    const started = run([
      { type: "tool_start", name: "list_vms" },
      { type: "tool_start", name: "get_account" },
    ]);
    expect(started.messages).toHaveLength(1);
    expect(started.messages[0].tools).toEqual([
      { name: "list_vms", running: true },
      { name: "get_account", running: true },
    ]);

    const done = applyChatEvent(started, {
      type: "tool_done",
      name: "list_vms",
    });
    expect(done.messages[0].tools).toEqual([
      { name: "list_vms", running: false },
      { name: "get_account", running: true },
    ]);

    // A tool_done for something never started is a no-op, not a crash.
    const unknown = applyChatEvent(done, { type: "tool_done", name: "nope" });
    expect(unknown).toBe(done);
  });

  test("a tool_done with no turn open is ignored", () => {
    const s = applyChatEvent(emptyChatState, {
      type: "tool_done",
      name: "list_vms",
    });
    expect(s).toBe(emptyChatState);
  });

  test("the same tool run twice closes the newest call first", () => {
    const s = run([
      { type: "tool_start", name: "list_vms" },
      { type: "tool_start", name: "list_vms" },
      { type: "tool_done", name: "list_vms" },
    ]);
    expect(s.messages[0].tools).toEqual([
      { name: "list_vms", running: true },
      { name: "list_vms", running: false },
    ]);
  });

  // Regression: tool frames used to live outside the transcript. Opening a
  // message of their own would end the streaming turn, so `final` — which
  // carries the whole visible reply — would land in a second bubble and the
  // narration streamed before the tool call would be shown twice.
  test("tools annotate the streamed turn instead of splitting it", () => {
    const s = run([
      { type: "token", text: "Let me check. " },
      { type: "tool_start", name: "list_vms" },
      { type: "tool_done", name: "list_vms" },
      { type: "token", text: "You have one VM." },
      { type: "final", text: "Let me check. You have one VM." },
    ]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({
      text: "Let me check. You have one VM.",
      streaming: false,
    });
    expect(s.messages[0].tools).toEqual([{ name: "list_vms", running: false }]);
  });

  test("a turn that fails after a lookup keeps the lookup", () => {
    const s = run([
      { type: "tool_start", name: "list_vms" },
      { type: "error", message: "boom" },
    ]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ text: "boom", failed: true });
    expect(s.messages[0].tools).toEqual([{ name: "list_vms", running: true }]);
  });

  test("unknown frame types are ignored", () => {
    const s = applyChatEvent(emptyChatState, {
      // The server may add frame types; a client must not break on them.
      type: "something_new",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(s).toBe(emptyChatState);
  });

  test("sending a message marks the turn in flight and gives unique ids", () => {
    const s = appendUserMessage(appendUserMessage(emptyChatState, "a"), "b");
    expect(s.awaitingReply).toBe(true);
    expect(s.messages.map((m) => m.role)).toEqual(["user", "user"]);
    expect(new Set(s.messages.map((m) => m.id)).size).toBe(2);
  });

  test("ids stay unique across user and agent messages", () => {
    const sent = appendUserMessage(emptyChatState, "hi");
    const s = applyChatEvent(sent, { type: "final", text: "hello" });
    expect(new Set(s.messages.map((m) => m.id)).size).toBe(s.messages.length);
  });

  test("ids stay unique when a tool frame opens the turn", () => {
    const sent = appendUserMessage(emptyChatState, "hi");
    const s = runFrom(sent, [
      { type: "tool_start", name: "list_vms" },
      { type: "final", text: "hello" },
    ]);
    expect(new Set(s.messages.map((m) => m.id)).size).toBe(s.messages.length);
  });
});

describe("thinking indicator", () => {
  test("shows while a turn has produced nothing visible", () => {
    const sent = appendUserMessage(emptyChatState, "hi");
    expect(isThinking(sent)).toBe(true);
    expect(
      isThinking(applyChatEvent(sent, { type: "tool_start", name: "x" })),
    ).toBe(true);
  });

  test("stops once tokens are arriving, and when the turn ends", () => {
    const sent = appendUserMessage(emptyChatState, "hi");
    const streaming = applyChatEvent(sent, { type: "token", text: "He" });
    expect(isThinking(streaming)).toBe(false);
    expect(
      isThinking(applyChatEvent(streaming, { type: "final", text: "Hey" })),
    ).toBe(false);
    expect(isThinking(emptyChatState)).toBe(false);
  });
});

describe("stalled turns", () => {
  // Regression: a turn whose terminal frame never arrives (agent hung upstream,
  // or a half-open socket that never fires `close`) left `awaitingReply` true
  // forever, which disables the composer — the chat would sit on "Thinking…"
  // and refuse to send anything else, with nothing on screen explaining why.
  test("give the user back the composer and say what happened", () => {
    const sent = appendUserMessage(emptyChatState, "hi");
    const s = stallTurn(sent, "no reply");
    expect(s.awaitingReply).toBe(false);
    expect(s.messages[s.messages.length - 1]).toMatchObject({
      text: "no reply",
      failed: true,
    });
  });

  test("partial output is kept when the rest never arrives", () => {
    const s = stallTurn(
      runFrom(appendUserMessage(emptyChatState, "hi"), [
        { type: "token", text: "Your VM is" },
      ]),
      "no reply",
    );
    expect(s.messages.map((m) => m.text)).toEqual([
      "hi",
      "Your VM is",
      "no reply",
    ]);
  });

  // The deadline fires on a timer, so it can land after the reply did.
  test("a stall after the turn completed changes nothing", () => {
    const done = runFrom(appendUserMessage(emptyChatState, "hi"), [
      { type: "final", text: "all good" },
    ]);
    expect(stallTurn(done, "no reply")).toBe(done);
  });
});

/**
 * The guest session id is what makes a logged-out conversation survive
 * anything: a dropped socket mid-answer, a refresh, closing the tab. The
 * server replays the transcript to the model from this id alone, so losing it
 * silently starts a new conversation with no sign that anything was lost.
 */
describe("guest session id", () => {
  const realLocalStorage = globalThis.localStorage;

  function fakeStorage(initial?: Record<string, string>) {
    const map = new Map(Object.entries(initial ?? {}));
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    };
  }

  function useStorage(storage: unknown) {
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => useStorage(realLocalStorage));

  test("survives the page it was issued on", () => {
    useStorage(fakeStorage());
    saveGuestSessionId("abc123");
    expect(loadGuestSessionId()).toBe("abc123");
  });

  test("nothing stored means a fresh conversation, not an empty id", () => {
    useStorage(fakeStorage());
    expect(loadGuestSessionId()).toBeUndefined();
  });

  test("starting over drops the id so the server issues a new one", () => {
    useStorage(fakeStorage({ "lnvps:support-chat-guest": "abc123" }));
    clearGuestSessionId();
    expect(loadGuestSessionId()).toBeUndefined();
  });

  // There is no storage during SSR, and a browser with storage blocked throws
  // on access rather than returning null. Chat still works without it — the
  // visitor just cannot resume — so neither may propagate.
  test("no storage at all is survivable", () => {
    useStorage(undefined);
    expect(loadGuestSessionId()).toBeUndefined();
    expect(() => saveGuestSessionId("abc123")).not.toThrow();
    expect(() => clearGuestSessionId()).not.toThrow();
  });

  test("storage that throws is survivable", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    useStorage({ getItem: boom, setItem: boom, removeItem: boom });
    expect(loadGuestSessionId()).toBeUndefined();
    expect(() => saveGuestSessionId("abc123")).not.toThrow();
    expect(() => clearGuestSessionId()).not.toThrow();
  });
});
