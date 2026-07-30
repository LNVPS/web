import type { App } from "../api";

/**
 * Look up a catalog app by its slug (`app.name`, case-insensitive), falling
 * back to a numeric id when the param isn't anyone's slug.
 *
 * The sitemap published `/apps/<id>` for every app before `LNVPS/web#94`, so
 * those are the URLs already indexed. `app.tsx`'s canonical tag always points
 * at the slug, so a crawler that lands on an id link converges on the new URL
 * instead of the old one going missing outright.
 */
export function findApp(
  apps: Array<App> | undefined,
  param: string,
): App | undefined {
  const slug = param.toLowerCase();
  return (
    apps?.find((a) => a.name === slug) ??
    (/^\d+$/.test(param)
      ? apps?.find((a) => a.id === Number(param))
      : undefined)
  );
}
