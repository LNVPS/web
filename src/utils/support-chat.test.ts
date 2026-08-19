import { describe, expect, test } from "bun:test";
import {
  appendUserMessage,
  applyChatEvent,
  ChatState,
  emptyChatState,
} from "./support-chat";

function run(events: Parameters<typeof applyChatEvent>[1][]): ChatState {
  return events.reduce(applyChatEvent, emptyChatState);
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
    expect(s.activeTools).toEqual([]);
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

  test("tool frames track in-flight lookups", () => {
    const started = run([
      { type: "tool_start", name: "list_vms" },
      { type: "tool_start", name: "get_account" },
    ]);
    expect(started.activeTools).toEqual(["list_vms", "get_account"]);

    const done = applyChatEvent(started, {
      type: "tool_done",
      name: "list_vms",
    });
    expect(done.activeTools).toEqual(["get_account"]);

    // A tool_done for something never started is a no-op, not a crash.
    const unknown = applyChatEvent(done, { type: "tool_done", name: "nope" });
    expect(unknown).toBe(done);
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
});
