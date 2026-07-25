import { ReactNode } from "react";

/**
 * Minimal YAML highlighter for rendering app compose specs. Not a full parser —
 * it tokenises the common shapes (comments, mapping keys, list markers, quoted
 * strings, ${…} interpolations, numbers/booleans) line by line, coloured with
 * the cyber theme. Good enough for read-only display of catalog composes.
 */

/** Index of an unquoted `#` comment start, or -1. */
function commentStart(line: string): number {
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = undefined;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
      return i;
    }
  }
  return -1;
}

const VALUE_RE =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\$\{[^}]*\})|\b(true|false|null|yes|no)\b|(-?\b\d[\d.]*\b)/g;

function highlightValue(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  VALUE_RE.lastIndex = 0;
  while ((m = VALUE_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const cls = m[1]
      ? "text-cyber-accent"
      : m[2]
        ? "text-cyber-warning"
        : "text-cyber-accent";
    out.push(
      <span key={`${keyBase}-${k++}`} className={cls}>
        {m[0]}
      </span>,
    );
    last = VALUE_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function highlightLine(line: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let code = line;
  let comment = "";
  const ci = commentStart(line);
  if (ci >= 0) {
    code = line.slice(0, ci);
    comment = line.slice(ci);
  }

  // `<indent>[- ]key: value`
  const m = code.match(/^(\s*(?:-\s+)?)([A-Za-z0-9_./-]+)(:)(\s?)([\s\S]*)$/);
  if (m) {
    const [, lead, key, colon, sp, val] = m;
    nodes.push(lead);
    nodes.push(
      <span key={`${keyBase}-key`} className="text-cyber-primary">
        {key}
      </span>,
      <span key={`${keyBase}-colon`} className="text-cyber-muted">
        {colon}
      </span>,
      sp,
      ...highlightValue(val, keyBase),
    );
  } else {
    nodes.push(...highlightValue(code, keyBase));
  }

  if (comment) {
    nodes.push(
      <span key={`${keyBase}-cmt`} className="italic text-cyber-muted">
        {comment}
      </span>,
    );
  }
  return nodes;
}

/** Render YAML source as highlighted React nodes (place inside a <pre>). */
export function highlightYaml(src: string): ReactNode {
  const lines = src.replace(/\n+$/, "").split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {highlightLine(line, String(i))}
      {i < lines.length - 1 ? "\n" : ""}
    </span>
  ));
}
