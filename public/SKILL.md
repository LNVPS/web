---
name: lnvps-api
description: Create and manage VPS instances using the LNVPS customer API with Bitcoin Lightning Network payments. Use when building integrations that provision virtual machines, handle Lightning invoice payments, manage SSH keys, or automate VPS lifecycle operations.
metadata:
  author: lnvps
  version: "1.0"
compatibility: Requires network access to LNVPS API endpoints and a Nostr keypair for NIP-98 authentication.
---

# LNVPS Customer API

This skill enables interaction with the LNVPS customer-facing API to create and manage VPS instances paid via Bitcoin Lightning Network.

## Authentication

All API requests (except public endpoints) require **NIP-98 HTTP Authentication**.

### Creating a NIP-98 Auth Header

1. Create a Nostr event:
   - **Kind**: `27235` (HttpAuth)
   - **Tags**: `["u", "<full_url>"]` and `["method", "<HTTP_METHOD>"]`
   - **Created At**: Current Unix timestamp (valid for 600 seconds)
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

## VM Creation Flow

Creating a VM follows these steps:

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

**OS Images**: `GET /api/v1/image`

```json
{
  "data": [
    {
      "id": 1,
      "distribution": "ubuntu",
      "version": "24.04",
      "default_username": "ubuntu"
    }
  ]
}
```

**Templates**: `GET /api/v1/vm/templates`

```json
{
  "data": [
    {
      "id": 1,
      "name": "VPS-Small",
      "cpu": 1,
      "memory": 1073741824,
      "disk_size": 21474836480,
      "cost_plan": { "amount": 500, "currency": "EUR" }
    }
  ]
}
```

### Step 3: Create VM Order

```http
POST /api/v1/vm
Content-Type: application/json

{"template_id": 1, "image_id": 1, "ssh_key_id": 1}
```

The VM is created in an **unpaid state** (`expires = created`).

### Step 4: Generate Payment Invoice

```http
GET /api/v1/vm/{id}/renew?method=lightning
```

Response:

```json
{
  "data": {
    "id": "a1b2c3d4...",
    "amount": 21000,
    "currency": "BTC",
    "is_paid": false,
    "data": { "Lightning": "lnbc210u1pj..." },
    "time": 2592000
  }
}
```

- `amount` is in satoshis (for BTC) or cents (for fiat)
- `time` is seconds added to expiry upon payment
- Pay the invoice in `data.Lightning` with any Lightning wallet

### Step 5-7: Poll Until Ready

Poll `GET /api/v1/payment/{id}` until `is_paid: true`, then poll `GET /api/v1/vm/{id}` until `status.state: "running"`.

## Key Endpoints

| Action         | Method | Endpoint                     |
| -------------- | ------ | ---------------------------- |
| List VMs       | GET    | `/api/v1/vm`                 |
| Get VM         | GET    | `/api/v1/vm/{id}`            |
| Create VM      | POST   | `/api/v1/vm`                 |
| Start VM       | PATCH  | `/api/v1/vm/{id}/start`      |
| Stop VM        | PATCH  | `/api/v1/vm/{id}/stop`       |
| Restart VM     | PATCH  | `/api/v1/vm/{id}/restart`    |
| Reinstall VM   | PATCH  | `/api/v1/vm/{id}/re-install` |
| Renew VM       | GET    | `/api/v1/vm/{id}/renew`      |
| Update VM      | PATCH  | `/api/v1/vm/{id}`            |
| List SSH Keys  | GET    | `/api/v1/ssh-key`            |
| Add SSH Key    | POST   | `/api/v1/ssh-key`            |
| Get Account    | GET    | `/api/v1/account`            |
| Update Account | PATCH  | `/api/v1/account`            |

See [REFERENCE.md](REFERENCE.md) for complete endpoint documentation.

## Data Formats

**Sizes are in bytes:**

- 1 GB = `1073741824`
- 1 TB = `1099511627776`

**Amounts are in smallest currency unit:**

- BTC: satoshis
- EUR/USD: cents

**Enum values (lowercase):**

- Disk types: `hdd`, `ssd`
- Disk interfaces: `sata`, `scsi`, `pcie`
- VM states: `pending`, `running`, `stopped`, `failed`
- Payment methods: `lightning`, `revolut`

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

## Common Tasks

**Enable auto-renewal with NWC:**

```http
PATCH /api/v1/account
{"nwc_connection_string": "nostr+walletconnect://..."}
```

**Set reverse DNS:**

```http
PATCH /api/v1/vm/{id}
{"reverse_dns": "myserver.example.com"}
```

**Get upgrade quote:**

```http
POST /api/v1/vm/{id}/upgrade/quote
{"new_cpu": 4, "new_memory": 8589934592}
```

## CLI Usage with nak curl

LLMs and agents can call the LNVPS API directly from the command line using [nak](https://github.com/fiatjaf/nak). The `nak curl` subcommand works exactly like `curl` but automatically appends the NIP-98 Authorization header.

### Setup

```bash
# Install nak
go install github.com/fiatjaf/nak@latest

# Set your Nostr secret key as environment variable
export NOSTR_SECRET_KEY="nsec1..."
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
NOSTR_SECRET_KEY=$NSEC nak curl https://api.lnvps.net/api/v1/vm

# Add SSH key
NOSTR_SECRET_KEY=$NSEC nak curl -X POST -H "Content-Type: application/json" \
  -d '{"name": "my-key", "key_data": "ssh-ed25519 AAAAC3..."}' \
  https://api.lnvps.net/api/v1/ssh-key

# Create VM
NOSTR_SECRET_KEY=$NSEC nak curl -X POST -H "Content-Type: application/json" \
  -d '{"template_id": 1, "image_id": 1, "ssh_key_id": 1}' \
  https://api.lnvps.net/api/v1/vm

# Get Lightning invoice
NOSTR_SECRET_KEY=$NSEC nak curl "https://api.lnvps.net/api/v1/vm/123/renew?method=lightning"

# Check payment status
NOSTR_SECRET_KEY=$NSEC nak curl https://api.lnvps.net/api/v1/payment/PAYMENT_ID

# Start/Stop/Restart VM
NOSTR_SECRET_KEY=$NSEC nak curl -X PATCH https://api.lnvps.net/api/v1/vm/123/start
NOSTR_SECRET_KEY=$NSEC nak curl -X PATCH https://api.lnvps.net/api/v1/vm/123/stop
NOSTR_SECRET_KEY=$NSEC nak curl -X PATCH https://api.lnvps.net/api/v1/vm/123/restart

# Set reverse DNS
NOSTR_SECRET_KEY=$NSEC nak curl -X PATCH -H "Content-Type: application/json" \
  -d '{"reverse_dns": "myserver.example.com"}' \
  https://api.lnvps.net/api/v1/vm/123
```

### Notes

- **Use `NOSTR_SECRET_KEY` env var**, not `--sec` flag (the flag doesn't work correctly with `nak curl`)
- Public endpoints (`/api/v1/image`, `/api/v1/vm/templates`) work with regular `curl`
- Quote URLs containing `?` to avoid shell interpretation
- Poll `GET /api/v1/payment/{id}` until `is_paid: true` after paying
- Poll `GET /api/v1/vm/{id}` until `status.state: "running"` after payment
