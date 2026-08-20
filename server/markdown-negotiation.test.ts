import { describe, expect, test } from "bun:test";
import {
  markdownFor,
  normalizePath,
  parseAccept,
  prefersMarkdown,
} from "./markdown-negotiation";

const DOCS = { "/tos": "# Terms" };

describe("parseAccept", () => {
  test("returns empty for missing header", () => {
    expect(parseAccept(null)).toEqual([]);
    expect(parseAccept(undefined)).toEqual([]);
    expect(parseAccept("")).toEqual([]);
  });

  test("parses types and q-values", () => {
    expect(parseAccept("text/html, text/markdown;q=0.8")).toEqual([
      { type: "text/html", q: 1 },
      { type: "text/markdown", q: 0.8 },
    ]);
  });

  test("ignores malformed q params", () => {
    expect(parseAccept("text/markdown;q=abc;charset=utf-8")).toEqual([
      { type: "text/markdown", q: 1 },
    ]);
  });
});

describe("prefersMarkdown", () => {
  test("true for explicit markdown", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
    expect(prefersMarkdown("text/x-markdown")).toBe(true);
    expect(prefersMarkdown("text/markdown, */*;q=0.1")).toBe(true);
  });

  test("true when markdown outranks html", () => {
    expect(prefersMarkdown("text/markdown;q=0.9, text/html;q=0.8")).toBe(true);
  });

  test("false when html outranks markdown", () => {
    expect(prefersMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
  });

  test("false for browsers and wildcards", () => {
    expect(
      prefersMarkdown("text/html,application/xhtml+xml,*/*;q=0.8"),
    ).toBe(false);
    expect(prefersMarkdown("*/*")).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
  });
});

describe("normalizePath", () => {
  test("strips query, hash and trailing slash", () => {
    expect(normalizePath("/tos?x=1")).toBe("/tos");
    expect(normalizePath("/tos#a")).toBe("/tos");
    expect(normalizePath("/tos/")).toBe("/tos");
    expect(normalizePath("/")).toBe("/");
  });
});

describe("markdownFor", () => {
  test("returns the document when markdown is preferred", () => {
    expect(markdownFor("/tos", "text/markdown", DOCS)).toBe("# Terms");
    expect(markdownFor("/tos/?x=1", "text/markdown", DOCS)).toBe("# Terms");
  });

  test("returns undefined for html clients, unknown paths, no docs", () => {
    expect(markdownFor("/tos", "text/html", DOCS)).toBeUndefined();
    expect(markdownFor("/about", "text/markdown", DOCS)).toBeUndefined();
    expect(markdownFor("/tos", "text/markdown", undefined)).toBeUndefined();
  });
});
