import { createContext, useContext, useEffect } from "react";

export interface HeadTags {
  title?: string;
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: string[];
}

export interface HeadContextValue {
  /** Push head tags from a component. Last call wins for title. */
  set(tags: HeadTags): void;
  /** Read collected tags (server only). */
  get(): HeadTags;
}

const emptyTags = (): HeadTags => ({ meta: [], links: [], scripts: [] });

/** Create a mutable store for one render pass. */
export function createHeadStore(): HeadContextValue {
  let tags = emptyTags();
  return {
    set(t) {
      if (t.title) tags.title = t.title;
      tags.meta.push(...t.meta);
      tags.links.push(...t.links);
      tags.scripts.push(...t.scripts);
    },
    get() {
      return tags;
    },
  };
}

const noop: HeadContextValue = {
  set() {},
  get: emptyTags,
};

export const HeadContext = createContext<HeadContextValue>(noop);

/**
 * Hook used by `<Seo>` to register head tags.
 *
 * On the server the tags are collected into the context store.
 * On the client the tags are applied directly to document.head.
 */
export function useHead(tags: HeadTags) {
  const ctx = useContext(HeadContext);

  // Server: push into context synchronously during render.
  if (typeof document === "undefined") {
    ctx.set(tags);
    return;
  }

  // Client: apply to DOM via useEffect.
  useEffect(() => {
    if (tags.title) document.title = tags.title;

    const elements: HTMLElement[] = [];
    for (const attrs of tags.meta) {
      const el = document.createElement("meta");
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.head.appendChild(el);
      elements.push(el);
    }
    for (const attrs of tags.links) {
      const el = document.createElement("link");
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.head.appendChild(el);
      elements.push(el);
    }
    for (const json of tags.scripts) {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.textContent = json;
      document.head.appendChild(el);
      elements.push(el);
    }

    return () => {
      for (const el of elements) el.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tags)]);
}

/** Serialize collected head tags to an HTML string for SSR injection. */
export function serializeHead(tags: HeadTags): string {
  const parts: string[] = [];

  if (tags.title) {
    parts.push(`<title>${escapeHtml(tags.title)}</title>`);
  }
  for (const attrs of tags.meta) {
    const a = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(" ");
    parts.push(`<meta ${a}/>`);
  }
  for (const attrs of tags.links) {
    const a = Object.entries(attrs)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(" ");
    parts.push(`<link ${a}/>`);
  }
  for (const json of tags.scripts) {
    parts.push(`<script type="application/ld+json">${json}</script>`);
  }

  return parts.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
