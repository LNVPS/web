# LNVPS Web

A React single-page application for [LNVPS](https://lnvps.com) - a Bitcoin Lightning Network VPS provider.

## Features

- **Nostr Authentication** - Sign in using your Nostr identity (NIP-07 browser extension or nsec)
- **VM Management** - Order, start, stop, restart, reinstall, and upgrade virtual machines
- **Web Terminal** - Access your VMs directly from the browser via WebSocket console
- **Resource Monitoring** - View CPU, memory, network, and disk usage graphs
- **Lightning Payments** - Pay for VMs with Bitcoin Lightning Network
- **Fiat Payments** - Alternative payment via Revolut
- **Auto-Renewal** - Configure automatic renewals using Nostr Wallet Connect (NWC)
- **Custom VPS** - Configure custom VM specifications (CPU, RAM, disk)
- **Referral Program** - Earn rewards by referring new users
- **IP Space Management** - Browse and subscribe to IP address blocks

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5.5** - Type-safe JavaScript
- **Vite 6** - Build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **React Router 7** - Client-side routing
- **@snort/system** - Nostr protocol integration
- **xterm.js** - Web terminal emulator
- **Recharts** - Resource usage graphs
- **react-intl** - Internationalization

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 4 (Berry)

### Installation

```bash
# Install dependencies
yarn

# Start development server
yarn dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Production build
yarn build

# Build for specific environment
yarn build --mode lnvps
yarn build --mode uat
```

### Other Commands

```bash
# Run linter
yarn lint

# Preview production build
yarn preview

# Extract translation strings
yarn locale:extract

# Compile translations
yarn locale:compile
```

## Project Structure

```
src/
├── main.tsx              # Entry point, router setup
├── api.ts                # API client and types
├── login.ts              # Authentication state management
├── const.ts              # Constants and configuration
├── components/           # Reusable UI components
├── pages/                # Route page components
├── hooks/                # Custom React hooks
└── locales/              # Translation files
```

## Environment Variables

Configure the API endpoint and other settings via environment files:

- `.env` - Default/production
- `.env.lnvps` - LNVPS production
- `.env.uat` - User acceptance testing
- `.env.development` - Local development

Key variables:

- `VITE_API_URL` - Backend API URL
- `VITE_NOSTR_PUBKEY` - Nostr public key for the service

## Deployment

The project uses Docker multi-stage builds:

1. **Builder stage** - Node.js builds the static assets
2. **Runner stage** - Nginx serves the built files

CI/CD via GitHub Actions automatically builds and pushes to `registry.v0l.io`.

## API Documentation

The backend API documentation is available at:
https://github.com/LNVPS/api/blob/master/API_DOCUMENTATION.md

## License

MIT
