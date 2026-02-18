# Project Overview

## Summary

LNVPS Web is a React SPA for a Bitcoin Lightning Network VPS provider. Users authenticate via Nostr protocol, manage virtual machines (order, start/stop/restart, reinstall, upgrade), access a web terminal, view resource graphs, and pay with Bitcoin Lightning or Revolut.

**Stack:** React 18 + TypeScript 5.5 + Vite 6 + Tailwind CSS 3

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

## API Documentation

The backend API docs are at `../lnvps/API_DOCUMENTATION.md` or:
https://raw.githubusercontent.com/LNVPS/api/refs/heads/master/API_DOCUMENTATION.md

The API client class is in `src/api.ts` (`LNVpsApi`). All API types/interfaces are defined at the top of that file.

## Deployment

- Docker multi-stage build: Node builder -> Nginx runner
- CI: GitHub Actions builds and pushes to `registry.v0l.io`
- Build modes: `production` (default), `lnvps`, `uat`
- Corresponding env files: `.env`, `.env.lnvps`, `.env.uat`
