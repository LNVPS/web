# Build & Test

## Package Manager

Yarn 4 (Berry with PnP). Always use `yarn`, never `npm`.

## Commands

```bash
yarn                    # Install dependencies
yarn dev                # Start dev server (Vite)
yarn build              # Type-check (tsc -b) then build for production
yarn build --mode lnvps # Build with .env.lnvps
yarn lint               # Run ESLint
yarn preview            # Preview production build locally
```

## Type Checking

`yarn build` runs `tsc -b` first, which type-checks the entire project. There is no separate `typecheck` script; use `tsc -b` directly if you only want type checking without building.

## Testing

There is **no test framework** configured. No test files, no test runner, no test scripts. If you need to verify changes, use `yarn build` (which includes type-checking) and `yarn lint`.
