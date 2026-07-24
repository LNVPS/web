/**
 * Best-effort README loading from an app's source repo URL. GitHub's readme
 * API is CORS-enabled and resolves the default branch + README filename for us;
 * other hosts just get a "Source" link (returns undefined here).
 */

/** Parse `owner`/`repo` from a github.com URL, tolerating trailing bits. */
function parseGitHub(url: string): { owner: string; repo: string } | undefined {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      return undefined;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return undefined;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return undefined;
  }
}

/** Fetch a repo's README as raw markdown, or undefined if unavailable. */
export async function fetchReadme(
  repoUrl: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const gh = parseGitHub(repoUrl);
  if (!gh) return undefined;
  try {
    const rsp = await fetch(
      `https://api.github.com/repos/${gh.owner}/${gh.repo}/readme`,
      { headers: { Accept: "application/vnd.github.raw" }, signal },
    );
    if (!rsp.ok) return undefined;
    return await rsp.text();
  } catch {
    return undefined;
  }
}
