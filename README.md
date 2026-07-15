# LNVPS Web

Web frontend for [LNVPS](https://lnvps.net) — a Bitcoin Lightning Network VPS provider.

A server-side rendered React app running on [Bun](https://bun.sh), with client-side hydration.

## Features

- **Nostr Authentication** — Sign in with your Nostr identity (NIP-07 browser extension or nsec), no email required
- **VM Management** — Order, start, stop, restart, reinstall, and upgrade virtual machines
- **Web Terminal** — Access your VMs from the browser via WebSocket console (xterm.js)
- **Resource Monitoring** — CPU, memory, network, and disk usage graphs
- **Firewall** — Manage per-VM firewall rules
- **Lightning Payments** — Pay with Bitcoin over the Lightning Network
- **Fiat Payments** — Card payments via Revolut, with saved-card renewals
- **Auto-Renewal** — Automatic renewals using Nostr Wallet Connect (NWC)
- **Custom VPS** — Configure custom VM specs (CPU, RAM, disk)
- **Domains** — Manage DNS zones and records
- **Subscriptions** — Browse and subscribe to recurring services (e.g. IP space)
- **Referral Program** — Earn rewards by referring new users
- **Encrypted Messaging** — Contact support via NIP-17 Nostr DMs
- **i18n** — Translated into 11 languages
- **News & Status** — Service announcements and infrastructure status pages

## Tech Stack

| | |
|---|---|
| Runtime | Bun (dev + production server) |
| UI | React 19 + TypeScript |
| Build | Vite 7 (client + SSR bundles) |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Nostr | @snort/system |
| Terminal | @xterm/xterm |
| Charts | Recharts |
| i18n | react-intl / FormatJS |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.x

### Development

```bash
# Install dependencies
bun install

# Start dev server (Express + Vite middleware, HMR + SSR)
bun run dev
```

The app is served at `http://localhost:3000` (override with `PORT`).

### Production Build

```bash
# Build client + SSR bundles, compile locales, generate skill index
bun run build

# Build and serve with the production server (Bun.serve)
bun run serve
```

### Other Commands

```bash
bun run lint              # ESLint
bun run locale:extract    # Extract translation strings to src/locales/en.json
bun run locale:compile    # Compile translations to dist/client/locales
bun run locale:translate  # Machine-translate locales via Ollama (ollama_intl)
```

## Project Structure

```
server/
├── dev.ts                # Dev server (Express + Vite middleware mode)
├── prod.ts               # Production server (Bun.serve, static + SSR)
├── ssr-render.ts         # Shared SSR page rendering
└── gen-skill-index.ts    # Generates the agent skill index

src/
├── entry-client.tsx      # Client entry (hydration)
├── entry-server.tsx      # SSR entry
├── routes.tsx            # Route definitions
├── api.ts                # LNVpsApi REST client + all API types
├── login.ts              # Auth/session state (ExternalStore)
├── nostr-system.ts       # Nostr system init
├── components/           # Reusable UI components
├── pages/                # Route page components
├── hooks/                # Custom React hooks
└── locales/              # Translations (en, de, es, fr, pt, ja, zh, ru, ar, tr, ko)
```

## Environment Variables

Vite mode env files: `.env` (default), `.env.development`, `.env.production`, `.env.uat`.

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (e.g. `https://api.lnvps.net`) |
| `VITE_NOSTR_PROFILE` | Nostr profile (nprofile) of the service, used for support DMs |
| `VITE_CONTACT_EMAIL` | Public contact email |
| `VITE_FOOTER_NOTE_1` / `VITE_FOOTER_NOTE_2` | Company info lines shown in the footer |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (sign-up captcha) |
| `VITE_REVOLUT_MODE` | Revolut checkout mode (`sandbox` for testing) |
| `PORT` | Server listen port (runtime, default `3000`) |

## Deployment

Docker multi-stage build (see `Dockerfile`):

1. **Builder** — `oven/bun` installs dependencies and builds client + SSR bundles (`MODE` build arg selects the env file, default `production`)
2. **Runner** — `oven/bun:1-alpine` runs `server/prod.ts`, serving static assets and SSR on port 3000

CI/CD via GitHub Actions builds and pushes images to `registry.v0l.io`.

## API Documentation

Backend API docs: https://github.com/LNVPS/api/blob/master/API_DOCUMENTATION.md

## License

[MIT](LICENSE)
