# Code Style

## Formatting (Prettier defaults)

- **Indentation:** 2 spaces
- **Quotes:** Double quotes (`"`) for all strings
- **Semicolons:** Always
- **Trailing commas:** Always in multi-line constructs
- **Line width:** Prettier default (80 chars)

## File Naming

- **kebab-case** for all files: `vps-card.tsx`, `vm-payment-flow.tsx`, `account-settings.tsx`
- Components and pages: `.tsx`
- Hooks and utilities without JSX: `.ts`

## Imports

- No enforced grouping or blank-line separation between groups
- General tendency: CSS imports first, then external libraries, then local modules
- No alphabetical ordering enforced

## Components

Use **`function` declarations**, not arrow functions:

```tsx
// Correct
export default function VpsCard({ spec }: { spec: VmTemplate }) {

// Avoid
const VpsCard = ({ spec }: { spec: VmTemplate }) => {
```

- Pages and single-export components use `export default function`
- Secondary exports from a file use named `export`

## Types and Interfaces

- **PascalCase**, no prefix (no `I` for interfaces, no `T` for types)
- `interface` for object shapes, `type` for unions/intersections/simpler prop types
- Both are acceptable; no strict rule between them

```tsx
interface ModalProps { ... }
type AsyncButtonProps = { ... }
type PaymentFlowType = "lightning" | "revolut";
```

## Enums

PascalCase name, PascalCase members, string values in lowercase:

```tsx
enum DiskType {
  SSD = "ssd",
  HDD = "hdd",
}
```

## State Management

- **Global state:** Custom `ExternalStore` (from `@snort/shared`) + `useSyncExternalStore`. Singleton `LoginState` in `src/login.ts`.
- **Local state:** Plain `useState` hooks
- **No Redux, Zustand, or other state libraries**
- **Nostr context:** `SnortContext.Provider` from `@snort/system-react` in `main.tsx`

## API Calls

- Use the `LNVpsApi` class from `src/api.ts`
- Authenticated calls via login hook: `login?.api.someMethod()`
- Unauthenticated calls: `new LNVpsApi(ApiUrl, undefined)`
- Data fetching in `useEffect` or via the `useCached` hook
- No React Query, SWR, or other data-fetching libraries

## Custom Hooks

- `use` prefix, function declarations, placed in `src/hooks/`
- Return objects with named fields (not tuples/arrays):

```tsx
export function useCached<T>(...): { data: T | undefined; loading: boolean; error: string | undefined; reloadNow: () => void }
```

## Error Handling

`try/catch` with `instanceof Error` check, store message in `useState<string>`:

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

## Null/Undefined Handling

- Use optional chaining (`?.`) and nullish coalescing (`??`) extensively
- Early returns for missing data:

```tsx
if (!state) return <h2>No VM selected</h2>;
if (!login?.api) return;
```

- Non-null assertion (`!`) used sparingly, only when guaranteed

## Styling

- **Tailwind CSS** utility classes inline in JSX
- `classnames` library (imported as `classNames`) for conditional classes
- No CSS modules, no styled-components
- Dark theme: `bg-neutral-900`, `bg-neutral-800`, `text-neutral-400`, etc.
- Only custom CSS file: `src/components/spinner.css`

## Routing

- `react-router-dom` v7 with `createBrowserRouter` in `main.tsx`
- State-based navigation (passing objects via `navigate("/path", { state })`)
- Access state via `useLocation()` with type assertion:

```tsx
const location = useLocation() as { state?: VmInstance };
```

## Comments

- Minimal commenting; no JSDoc
- Brief `//` comments only when context is needed
- No block comment documentation

## Private Class Members

Use ES private fields (`#field`, `#method()`) not TypeScript `private` keyword:

```tsx
class LNVpsApi {
  #url: string;
  async #handleResponse<T>(rsp: Response): Promise<T> { ... }
}
```
