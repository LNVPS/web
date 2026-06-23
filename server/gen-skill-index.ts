/**
 * Generates the agent-skills discovery index (v0.2.0) from public/SKILL.md.
 *
 * The `skills` CLI (npx skills add https://lnvps.net) requires a discovery
 * index at /.well-known/agent-skills/index.json. The index pins the SKILL.md
 * content via a sha256 digest, so it must be regenerated whenever SKILL.md
 * changes. This script computes the digest and writes the index into public/
 * and any built output directories.
 *
 * Run via `bun server/gen-skill-index.ts` (wired into the build script).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const SKILL_PATH = join(ROOT, "public", "SKILL.md");
const PUBLIC_URL = "https://lnvps.net/SKILL.md";
const SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

const INDEX_REL = join(".well-known", "agent-skills", "index.json");
// Directories that should receive the generated index.
const OUT_DIRS = [
  join(ROOT, "public"),
  join(ROOT, "dist", "client"),
  join(ROOT, "dist", "server"),
];

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

const skill = readFileSync(SKILL_PATH);
const front = parseFrontmatter(skill.toString("utf8"));
const name = front.name;
const description = front.description;

if (!name || !description) {
  throw new Error("public/SKILL.md is missing a `name` or `description` in its frontmatter");
}

const digest = `sha256:${createHash("sha256").update(skill).digest("hex")}`;

const index = {
  $schema: SCHEMA,
  skills: [
    {
      name,
      type: "skill-md",
      description,
      url: PUBLIC_URL,
      digest,
    },
  ],
};

const json = `${JSON.stringify(index, null, 2)}\n`;

for (const dir of OUT_DIRS) {
  // Only write into dist dirs if they already exist (i.e. after a build).
  if (dir.includes(`${join("dist", "")}`) && !existsSync(dir)) continue;
  const dest = join(dir, INDEX_REL);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, json);
  console.log(`wrote ${dest}`);
}

console.log(`skill index generated for "${name}" (${digest})`);
