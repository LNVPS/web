# Build & Test

## Package Manager

**Bun 1.x. Always use `bun`, never `yarn` or `npm`.**

The lockfile is `bun.lock` and it is the only lockfile in the repo. `Dockerfile` installs with `bun install --frozen-lockfile` in both the builder and the runner stage, so **any change to `package.json` must be committed together with the regenerated `bun.lock`** — otherwise CI fails with `lockfile had changes, but lockfile is frozen` and no image is published.

`package.json` carries a `packageManager` pin. It declares intent for tooling that reads it; it does not stop you running the wrong command, so the rule above is the one that matters.

## Commands

```bash
bun install               # Install dependencies
bun run dev               # Dev server (Express + Vite middleware, HMR + SSR) on :3000
bun run build             # Build client + SSR bundles, compile locales, generate skill index
bun run serve             # build, then run the production server (server/prod.ts)
bun run typecheck         # tsc --noEmit
bun run lint              # ESLint
bun run preview           # Vite preview of the built client
bun run locale:extract    # Extract translation strings to src/locales/en.json
bun run locale:compile    # Compile translations to dist/client/locales
```

`MODE` picks the env file for a build: the default is `production` (`.env.production`), and `MODE=uat bun run build` uses `.env.uat`. Both servers listen on 3000 unless `PORT` is set.

## Type Checking

**`bun run build` does not type-check.** The `build` script is `build:client && build:server && locale:compile && skill:index`; Vite transpiles without checking types, so a type error still produces a successful build.

Run `bun run typecheck` (`tsc --noEmit`) explicitly. `tsconfig.json` is a single non-composite project with `"noEmit": true`, so `tsc -b` is not the right invocation here — it does the same checking but leaves a `tsconfig.tsbuildinfo` artifact behind.

CI runs `typecheck` as its own job in `.github/workflows/build-deploy.yml`, separate from the Docker build.

## Linting

`bun run lint` reports **1 error and 21 warnings on `main`**, all pre-existing:

- `server/prod.ts:13` — `@typescript-eslint/ban-ts-comment` (`@ts-ignore` should be `@ts-expect-error`)
- the rest are `react-hooks/exhaustive-deps` and `react-refresh/only-export-components` warnings

Because that error predates every current branch, lint is **not** wired into CI — it would fail every PR for a reason unrelated to the PR. Run it locally and don't add to the count. Clearing the backlog so lint can be enforced is worth its own change.

## Testing

There is **no test framework** configured — no test files, no test runner, no test scripts. To verify a change: `bun run typecheck`, `bun run lint`, and `bun run build`.

For anything that renders server-side, check the real SSR output rather than the dev server, since they take different paths:

```bash
bun run build && bun server/prod.ts
curl -s localhost:3000/<route> | head -40
```
