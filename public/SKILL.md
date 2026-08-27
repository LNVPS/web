---
name: lnvps-api
description: Create and manage VPS instances using the LNVPS customer API with Bitcoin Lightning Network payments. Use when building integrations that provision virtual machines, handle Lightning invoice payments, manage SSH keys, or automate VPS lifecycle operations.
metadata:
  author: lnvps
  version: "1.1"
compatibility: Requires network access to LNVPS API endpoints and a Nostr keypair for NIP-98 authentication (or an OAuth/passkey session token).
---

# LNVPS Customer API

> **Latest version of this skill:** https://lnvps.net/SKILL.md
> To ensure you have the most up-to-date API information, fetch the latest version before use.

This skill enables interaction with the LNVPS customer-facing API to create and manage VPS instances paid via Bitcoin Lightning Network.

**Base URL:** `https://api.lnvps.net`

## Authentication

Authenticated endpoints accept **either** scheme, never both on one request:

- **Nostr (NIP-98):** `Authorization: Nostr <base64 event>`, for Nostr-key accounts.
- **Session token:** `Authorization: Bearer <jwt>`, issued by the OAuth login flow
  (`GET /api/v1/oauth/{google|github|facebook|apple}/login`) or a passkey/WebAuthn
  login (`POST /api/v1/webauthn/login/start` → `/finish`).

### Creating a NIP-98 Auth Header

1. Create a Nostr event:
   - **Kind**: `27235` (HttpAuth)
   - **Tags**: `["u", "<full_url>"]` and `["method", "<HTTP_METHOD>"]`
   - **Created At**: Current Unix timestamp
   - **Content**: Empty string
   - Sign the event with your Nostr private key

2. Base64-encode the JSON event

3. Send as: `Authorization: Nostr <base64_encoded_event>`

Example event:

```json
{
  "kind": 27235,
  "created_at": 1704067200,
  "tags": [
    ["u", "https://api.lnvps.net/api/v1/vm"],
    ["method", "POST"]
  ],
  "content": "",
  "pubkey": "<your_nostr_pubkey>",
  "id": "<event_id>",
  "sig": "<signature>"
}
```

### NIP-98 validation rules (stricter than they used to be)

- **Sign a fresh event per request.** Each event id is accepted **once**, and replay is rejected. Never cache or reuse an auth event.
- **`created_at` must be within 60 seconds** of server time (was 600). Fix client clock skew.
- **`method` tag must match** the request method.
- **`payload` tag is optional but verified when present**: lowercase hex SHA-256 of the exact request body. Recommended for `POST`/`PATCH`; omitting it is still accepted.

### Auth tickets (WebSockets and HTML pages)

Endpoints a browser cannot send an `Authorization` header to take a **ticket** in the query string instead:

```http
POST /api/v1/auth/ticket
{"path": "/api/v1/vm/7/console"}

→ {"data": {"ticket": "...", "expires_in": 30}}
```

Single-use, path-scoped, 30 seconds. Valid only for:
`/api/v1/vm/{id}/console`, `/api/v1/payment/{id}/invoice`, `/api/v1/support/chat`
(and `/api/admin/v1/jobs/feedback` on the admin API).

Use as `?ticket=<ticket>`. The legacy `?auth=<base64_nip98_event>` form still works but is **deprecated**. A ticket does not grant access. The endpoint still checks ownership.

### Sessions

`DELETE /api/v1/account/sessions` invalidates every outstanding Bearer token for the account ("log out everywhere"). NIP-98 auth is unaffected.

## Rate Limiting

| Bucket  | Limit          | Endpoints                                                                                                              |
| ------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| General | 600 req/min/IP | Everything else                                                                                                        |
| Strict  | 10 req/min/IP  | WebAuthn register/login, OAuth login/callback, email verification, WhatsApp verify/confirm, contact form, LNURL-pay endpoints |

Exceeding a limit returns `429 Too Many Requests` with a `Retry-After` header (seconds). Back off and retry.

## VM Creation Flow

```
1. Add SSH key         POST /api/v1/ssh-key
2. List resources      GET  /api/v1/image, GET /api/v1/vm/templates
3. Create VM order     POST /api/v1/vm
4. Get invoice         GET  /api/v1/vm/{id}/renew?method=lightning
5. Pay Lightning invoice
6. Poll payment        GET  /api/v1/payment/{id} until is_paid=true
7. Poll VM status      GET  /api/v1/vm/{id} until status.state=running
8. Connect via SSH
```

### Step 1: Add SSH Key

```http
POST /api/v1/ssh-key
Content-Type: application/json

{"name": "my-key", "key_data": "ssh-ed25519 AAAAC3..."}
```

Response:

```json
{ "data": { "id": 1, "name": "my-key", "created": "2024-01-01T00:00:00Z" } }
```

### Step 2: List Available Resources

**OS Images**: `GET /api/v1/image` (optional `?arch=x86_64|arm64`)

```json
{
  "data": [
    {
      "id": 1,
      "distribution": "ubuntu",
      "version": "24.04",
      "default_username": "ubuntu",
      "popularity": 0.42
    }
  ]
}
```

**Templates**: `GET /api/v1/vm/templates`. Note the response is an **object**, not a list:

```json
{
  "data": {
    "templates": [
      {
        "id": 1,
        "name": "VPS-Small",
        "cpu": 1,
        "memory": 1073741824,
        "disk_size": 21474836480,
        "ip4_count": 1,
        "ip6_count": 1,
        "cost_plan": {
          "amount": 500,
          "currency": "EUR",
          "interval_amount": 1,
          "interval_type": "month"
        }
      }
    ],
    "custom_template": [{ "id": 1, "min_cpu": 1, "max_cpu": 8, "...": "..." }]
  }
}
```

### Step 3: Create VM Order

```http
POST /api/v1/vm
Content-Type: application/json

{"template_id": 1, "image_id": 1, "ssh_key_id": 1}
```

The VM is created in an **unpaid state** (no `expires`).

### Step 4: Generate Payment Invoice

```http
GET /api/v1/vm/{id}/renew?method=lightning&intervals=1
```

Response:

```json
{
  "data": {
    "id": "a1b2c3d4...",
    "amount": 21000000,
    "currency": "BTC",
    "tax": 0,
    "processing_fee": 0,
    "is_paid": false,
    "data": { "lightning": "lnbc210u1pj..." },
    "time": 2592000
  }
}
```

- `amount` is in the **smallest currency unit**: **millisatoshis** for BTC, cents for fiat
- `time` is seconds added to expiry upon payment
- `intervals` must be `1..=120`, and a renewal is rejected if it would push `expires` past `now + max_prepay_days` (see `VmStatus.max_prepay_days`) or past `host_sunset_date`
- Pay the invoice in `data.lightning` (lowercase key) with any Lightning wallet

### Step 5-7: Poll Until Ready

Poll `GET /api/v1/payment/{id}` until `is_paid: true`, then poll `GET /api/v1/vm/{id}` until `status.state: "running"`.

## Key Endpoints

| Action                  | Method | Endpoint                            |
| ----------------------- | ------ | ----------------------------------- |
| List VMs                | GET    | `/api/v1/vm`                        |
| Get VM                  | GET    | `/api/v1/vm/{id}`                   |
| Create VM               | POST   | `/api/v1/vm`                        |
| Create custom VM        | POST   | `/api/v1/vm/custom-template`        |
| Custom VM price         | POST   | `/api/v1/vm/custom-template/price`  |
| Start VM                | PATCH  | `/api/v1/vm/{id}/start`             |
| Stop VM                 | PATCH  | `/api/v1/vm/{id}/stop`              |
| Restart VM              | PATCH  | `/api/v1/vm/{id}/restart`           |
| Reinstall VM            | PATCH  | `/api/v1/vm/{id}/re-install`        |
| Renew VM                | GET    | `/api/v1/vm/{id}/renew`             |
| Update VM               | PATCH  | `/api/v1/vm/{id}`                   |
| Upgrade quote           | POST   | `/api/v1/vm/{id}/upgrade/quote`     |
| Upgrade VM              | POST   | `/api/v1/vm/{id}/upgrade`           |
| VM payments             | GET    | `/api/v1/vm/{id}/payments`          |
| VM history              | GET    | `/api/v1/vm/{id}/history`           |
| VM time series          | GET    | `/api/v1/vm/{id}/time-series`       |
| Serial console (WS)     | WS     | `/api/v1/vm/{id}/console?ticket=`   |
| Firewall rules          | GET/POST | `/api/v1/vm/{id}/firewall`        |
| Firewall rule           | PATCH/DELETE | `/api/v1/vm/{id}/firewall/{rule_id}` |
| Firewall policy         | GET/PATCH | `/api/v1/vm/{id}/firewall/policy` |
| List SSH Keys           | GET    | `/api/v1/ssh-key`                   |
| Add SSH Key             | POST   | `/api/v1/ssh-key`                   |
| Delete SSH Key          | DELETE | `/api/v1/ssh-key/{id}`              |
| Get Account             | GET    | `/api/v1/account`                   |
| Update Account          | PATCH  | `/api/v1/account`                   |
| Log out everywhere      | DELETE | `/api/v1/account/sessions`          |
| Verify Email            | GET    | `/api/v1/account/verify-email`      |
| Notification channels   | GET    | `/api/v1/notification/channels`     |
| Link Telegram           | POST   | `/api/v1/account/telegram/link`     |
| WhatsApp verify/confirm | POST   | `/api/v1/account/whatsapp/{verify,confirm}` |
| Auth ticket             | POST   | `/api/v1/auth/ticket`               |
| Saved payment methods   | GET/POST | `/api/v1/payment-methods`         |
| Update/delete saved     | PATCH/DELETE | `/api/v1/payment-methods/{id}` |
| Payment methods offered | GET    | `/api/v1/payment/methods`           |
| Get Payment             | GET    | `/api/v1/payment/{id}`              |
| Payment invoice (HTML)  | GET    | `/api/v1/payment/{id}/invoice?ticket=` |
| Exchange rates          | GET    | `/api/v1/exchange-rate`             |
| List Subscriptions      | GET    | `/api/v1/subscriptions`             |
| Create Subscription     | POST   | `/api/v1/subscriptions`             |
| Renew Subscription      | GET    | `/api/v1/subscriptions/{id}/renew`  |
| Managed apps catalog    | GET    | `/api/v1/apps`                      |
| App deployments         | POST   | `/api/v1/app-deployments`           |
| Support chat (WS)       | WS     | `/api/v1/support/chat?ticket=`      |
| List IP Spaces          | GET    | `/api/v1/ip_space`                  |
| Nostr domains (NIP-05)  | GET    | `/api/v1/nostr/domain`              |
| Contact form            | POST   | `/api/v1/contact`                   |

See [REFERENCE.md](REFERENCE.md) for complete endpoint documentation.

## Data Formats

**Sizes are in bytes:**

- 1 GB = `1073741824`
- 1 TB = `1099511627776`

**Amounts are in the smallest currency unit:**

- BTC: **millisatoshis** (1 sat = 1000)
- EUR/USD: cents

**Enum values (lowercase):**

- Disk types: `hdd`, `ssd`
- Disk interfaces: `sata`, `scsi`, `pcie`
- VM states: `unknown`, `creating`, `running`, `stopped`
- Payment methods: `lightning`, `onchain`, `revolut`, `paypal`, `stripe`, `nwc`, `lnurl`
- Cost plan intervals: `day`, `month`, `year`
- Account types: `nostr`, `oauth`, `webauthn` (only `nostr` has a usable Nostr key)

**Payment `data` is a lowercase-tagged union:**
`{"lightning": "lnbc..."}`, `{"onchain": {"address": "bc1...", "outpoint": "txid:vout"}}`,
`{"revolut": {"token": "..."}}`, `{"stripe": {"session_id": "..."}}`

## Response Format

Success:

```json
{"data": { ... }}
```

Paginated:

```json
{"data": [...], "total": 100, "limit": 20, "offset": 0}
```

Error:

```json
{ "error": "Description of the error" }
```

## Email Verification

LNVPS accounts require a verified email address. The verification flow works as follows:

1. **Set email on account**: `PATCH /api/v1/account` with `{"email": "user@example.com"}`. The server sends a verification link to that address.
2. **User clicks the link**: the link includes a `token` query parameter pointing to the API.
3. **Confirm the token**: `GET /api/v1/account/verify-email?token=<token>`. Returns `200 OK` on success. **Links expire after 24 hours.**
4. **Check status**: `GET /api/v1/account` returns `email_verified: true` once confirmed.

### Check if email is verified

```http
GET /api/v1/account
```

Look for `email_verified: true` in the response:

```json
{
  "data": {
    "email": "user@example.com",
    "email_verified": true,
    ...
  }
}
```

### Trigger verification email

```http
PATCH /api/v1/account
Content-Type: application/json

{"email": "user@example.com"}
```

Sending a `PATCH` with an email address causes the server to send a verification email. If the email is already set, send it again to re-trigger the email.

---

## Common Tasks

**Enable auto-renewal with NWC**: NWC connection strings are **no longer stored on the account**; add one as a saved payment method, then enable auto-renewal per VM:

```http
POST /api/v1/payment-methods
{"nwc_connection_string": "nostr+walletconnect://...", "name": "My wallet"}

PATCH /api/v1/vm/{id}
{"auto_renewal_enabled": true}
```

Renewal is attempted 1 day before expiry, and only when both a valid saved NWC method exists and the VM has `auto_renewal_enabled: true`.

**Set reverse DNS:**

```http
PATCH /api/v1/vm/{id}
{"reverse_dns": "myserver.example.com"}
```

**Get upgrade quote:**

```http
POST /api/v1/vm/{id}/upgrade/quote?method=lightning
{"cpu": 4, "memory": 8589934592, "disk": 107374182400}
```

An upgrade must keep every resource **at or above** its current value and strictly increase at least one of CPU/memory/disk. Shrinking or no-op requests are rejected (downgrade = reinstall onto a smaller template). Running VMs are stopped and restarted to apply the change.

**Reinstall with a different OS image:**

```http
PATCH /api/v1/vm/{id}/re-install
{"image_id": 7}
```

**Firewall rule:**

```http
POST /api/v1/vm/{id}/firewall
{"direction": "inbound", "protocol": "tcp", "action": "accept",
 "dst_port_start": 22, "dst_port_end": 22, "priority": 10}
```

Default 20 rules per VM; policy defaults are set via `PATCH /api/v1/vm/{id}/firewall/policy`.

## CLI Usage with nak curl

LLMs and agents can call the LNVPS API directly from the command line using [nak](https://github.com/fiatjaf/nak). The `nak curl` subcommand works exactly like `curl` but automatically appends the NIP-98 Authorization header.

### Setup

```bash
# Install nak
go install github.com/fiatjaf/nak@latest

# Generate a new Nostr keypair if you don't have one
nak key generate | nak encode nsec  # outputs nsec1...

# Save your key securely
mkdir -p ~/.nostr && chmod 700 ~/.nostr
echo "nsec1..." > ~/.nostr/lnvps.nsec && chmod 600 ~/.nostr/lnvps.nsec
```

To view your public key (npub):

```bash
nak key public $(cat ~/.nostr/lnvps.nsec) | nak encode npub
```

### Usage

`nak curl` accepts all standard curl options. Set the `NOSTR_SECRET_KEY` environment variable and use `nak curl` like regular curl:

```bash
NOSTR_SECRET_KEY="nsec1..." nak curl [curl options] <url>
```

**Important:** Do NOT use `--sec` flag with `nak curl` - it doesn't work correctly. Always use the `NOSTR_SECRET_KEY` environment variable instead.

### Examples

```bash
# List VMs
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl https://api.lnvps.net/api/v1/vm

# Add SSH key
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl -X POST -H "Content-Type: application/json" \
  -d '{"name": "my-key", "key_data": "ssh-ed25519 AAAAC3..."}' \
  https://api.lnvps.net/api/v1/ssh-key

# Create VM
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl -X POST -H "Content-Type: application/json" \
  -d '{"template_id": 1, "image_id": 1, "ssh_key_id": 1}' \
  https://api.lnvps.net/api/v1/vm

# Get Lightning invoice
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl "https://api.lnvps.net/api/v1/vm/123/renew?method=lightning"

# Check payment status
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl https://api.lnvps.net/api/v1/payment/PAYMENT_ID

# Start/Stop/Restart VM
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl -X PATCH https://api.lnvps.net/api/v1/vm/123/start
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl -X PATCH https://api.lnvps.net/api/v1/vm/123/stop
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl -X PATCH https://api.lnvps.net/api/v1/vm/123/restart

# Set reverse DNS
NOSTR_SECRET_KEY=$(cat ~/.nostr/lnvps.nsec) nak curl -X PATCH -H "Content-Type: application/json" \
  -d '{"reverse_dns": "myserver.example.com"}' \
  https://api.lnvps.net/api/v1/vm/123
```

### Notes

- **Use `NOSTR_SECRET_KEY` env var inline**: do NOT use `--sec` flag (it doesn't work with `nak curl`) and do NOT `export` it (inline per-command prevents leaking into child processes)
- **One signed event per request**: `nak curl` signs a fresh event each invocation, which is required (events are single-use and valid for 60s)
- Public endpoints (`/api/v1/image`, `/api/v1/vm/templates`, `/api/v1/payment/methods`, `/api/v1/exchange-rate`, `/api/v1/ip_space`, `/api/v1/apps`) work with regular `curl`
- Quote URLs containing `?` to avoid shell interpretation
- Poll `GET /api/v1/payment/{id}` until `is_paid: true` after paying
- Poll `GET /api/v1/vm/{id}` until `status.state: "running"` after payment
- A `429` means you hit the per-IP rate limit, so sleep for `Retry-After` seconds
