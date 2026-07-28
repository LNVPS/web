import { afterEach, describe, expect, test } from "bun:test";
import type { NostrEvent } from "@snort/system";
import {
  getNewsArchive,
  mergeNewsWithArchive,
  setNewsArchive,
} from "./news-archive";

function article(d: string, over: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: `id-${d}`,
    pubkey: "pk",
    created_at: 1,
    kind: 30023,
    tags: [["d", d]],
    content: "archive",
    sig: "",
    ...over,
  } as NostrEvent;
}

afterEach(() => setNewsArchive([]));

describe("mergeNewsWithArchive", () => {
  test("returns the archive when the relays gave nothing", () => {
    setNewsArchive([article("a"), article("b")]);
    expect(mergeNewsWithArchive(undefined).map((e) => e.tags[0][1])).toEqual([
      "a",
      "b",
    ]);
  });

  test("the relay copy of an article wins over the bundled one", () => {
    setNewsArchive([article("a")]);
    const merged = mergeNewsWithArchive([article("a", { content: "relay" })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe("relay");
  });

  test("keeps articles only one side has", () => {
    setNewsArchive([article("a")]);
    const merged = mergeNewsWithArchive([article("b")]);
    expect(merged.map((e) => e.tags[0][1]).sort()).toEqual(["a", "b"]);
  });

  test("the archive is empty until the server entry sets it", () => {
    expect(getNewsArchive()).toEqual([]);
  });
});
