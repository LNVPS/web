# AGENTS.md

## Project Overview

LNVPS Web is a React SPA for a Bitcoin Lightning Network VPS provider. Users authenticate via Nostr protocol, manage virtual machines (order, start/stop/restart, reinstall, upgrade), access a web terminal, view resource graphs, and pay with Bitcoin Lightning or Revolut.

**Stack:** React 18 + TypeScript 5.5 + Vite 6 + Tailwind CSS 3

## Build & Development Commands

```bash
# Package manager: Yarn 4 (Berry with PnP). Always use yarn, never npm.
yarn                    # Install dependencies
yarn dev                # Start dev server (Vite)
yarn build              # Type-check (tsc -b) then build for production
yarn build --mode lnvps # Build with .env.lnvps
yarn lint               # Run ESLint
yarn preview            # Preview production build locally
```

### Type Checking

`yarn build` runs `tsc -b` first, which type-checks the entire project. There is no separate `typecheck` script; use `tsc -b` directly if you only want type checking without building.

### Testing

There is **no test framework** configured. No test files, no test runner, no test scripts. If you need to verify changes, use `yarn build` (which includes type-checking) and `yarn lint`.

## API Documentation

The backend API docs are at `../lnvps/API_DOCUMENTATION.md` or:
https://raw.githubusercontent.com/LNVPS/api/refs/heads/master/API_DOCUMENTATION.md

The API client class is in `src/api.ts` (`LNVpsApi`). All API types/interfaces are defined at the top of that file.

## Project Structure

```
src/
  main.tsx              # Entry point, router setup, Nostr system init
  api.ts                # LNVpsApi class (REST client + all API types)
  login.ts              # LoginStore (ExternalStore) - session/auth management
  const.ts              # Constants (API URL, byte sizes, Nostr profile)
  utils.ts              # Utility functions
  blossom.ts            # Blossom file upload protocol client
  ref.ts                # Referral code handling
  index.css             # Global CSS (Tailwind directives + base styles)
  components/           # Reusable UI components
  pages/                # Route page components
  hooks/                # Custom React hooks
  utils/                # Utility modules (dns-resolver.ts)
```

## Code Style Guidelines

### Formatting (Prettier defaults)

- **Indentation:** 2 spaces
- **Quotes:** Double quotes (`"`) for all strings
- **Semicolons:** Always
- **Trailing commas:** Always in multi-line constructs
- **Line width:** Prettier default (80 chars)

### File Naming

- **kebab-case** for all files: `vps-card.tsx`, `vm-payment-flow.tsx`, `account-settings.tsx`
- Components and pages: `.tsx`
- Hooks and utilities without JSX: `.ts`

### Imports

- No enforced grouping or blank-line separation between groups
- General tendency: CSS imports first, then external libraries, then local modules
- No alphabetical ordering enforced

### Components

- Use **`function` declarations**, not arrow functions:

  ```tsx
  // Correct
  export default function VpsCard({ spec }: { spec: VmTemplate }) {

  // Avoid
  const VpsCard = ({ spec }: { spec: VmTemplate }) => {
  ```

- Pages and single-export components use `export default function`
- Secondary exports from a file use named `export`

### Types and Interfaces

- **PascalCase**, no prefix (no `I` for interfaces, no `T` for types)
- `interface` for object shapes, `type` for unions/intersections/simpler prop types
- Both are acceptable; no strict rule between them
  ```tsx
  interface ModalProps { ... }
  type AsyncButtonProps = { ... }
  type PaymentFlowType = "lightning" | "revolut";
  ```

### Enums

- PascalCase name, PascalCase members, string values in lowercase:
  ```tsx
  enum DiskType {
    SSD = "ssd",
    HDD = "hdd",
  }
  ```

### State Management

- **Global state:** Custom `ExternalStore` (from `@snort/shared`) + `useSyncExternalStore`. Singleton `LoginState` in `src/login.ts`.
- **Local state:** Plain `useState` hooks
- **No Redux, Zustand, or other state libraries**
- **Nostr context:** `SnortContext.Provider` from `@snort/system-react` in `main.tsx`

### API Calls

- Use the `LNVpsApi` class from `src/api.ts`
- Authenticated calls via login hook: `login?.api.someMethod()`
- Unauthenticated calls: `new LNVpsApi(ApiUrl, undefined)`
- Data fetching in `useEffect` or via the `useCached` hook
- No React Query, SWR, or other data-fetching libraries

### Custom Hooks

- `use` prefix, function declarations, placed in `src/hooks/`
- Return objects with named fields (not tuples/arrays):
  ```tsx
  export function useCached<T>(...): { data: T | undefined; loading: boolean; error: string | undefined; reloadNow: () => void }
  ```

### Error Handling

- `try/catch` with `instanceof Error` check, store message in `useState<string>`:
  ```tsx
  try {
    await login?.api.someAction();
  } catch (e) {
    if (e instanceof Error) {
      setError(e.message);
    }
  }
  ```
- Display errors inline: `{error && <b className="text-red-500">{error}</b>}`
- Non-critical errors: `console.error(e)` in catch block
- The API class throws `new Error(message)` on non-OK responses

### Null/Undefined Handling

- Use optional chaining (`?.`) and nullish coalescing (`??`) extensively
- Early returns for missing data:
  ```tsx
  if (!state) return <h2>No VM selected</h2>;
  if (!login?.api) return;
  ```
- Non-null assertion (`!`) used sparingly, only when guaranteed

### Styling

- **Tailwind CSS** utility classes inline in JSX
- `classnames` library (imported as `classNames`) for conditional classes
- No CSS modules, no styled-components
- Dark theme: `bg-neutral-900`, `bg-neutral-800`, `text-neutral-400`, etc.
- Only custom CSS file: `src/components/spinner.css`

### Routing

- `react-router-dom` v7 with `createBrowserRouter` in `main.tsx`
- State-based navigation (passing objects via `navigate("/path", { state })`)
- Access state via `useLocation()` with type assertion:
  ```tsx
  const location = useLocation() as { state?: VmInstance };
  ```

### Comments

- Minimal commenting; no JSDoc
- Brief `//` comments only when context is needed
- No block comment documentation

### Private Class Members

- Use ES private fields (`#field`, `#method()`) not TypeScript `private` keyword:
  ```tsx
  class LNVpsApi {
    #url: string;
    async #handleResponse<T>(rsp: Response): Promise<T> { ... }
  }
  ```

## Deployment

- Docker multi-stage build: Node builder -> Nginx runner
- CI: GitHub Actions builds and pushes to `registry.v0l.io`
- Build modes: `production` (default), `lnvps`, `uat`
- Corresponding env files: `.env`, `.env.lnvps`, `.env.uat`
