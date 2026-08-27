# LNVPS API Reference

Complete endpoint documentation for the LNVPS customer-facing API.

## Table of Contents

- [Authentication](#authentication)
- [Account Endpoints](#account-endpoints)
- [VM Endpoints](#vm-endpoints)
- [SSH Key Endpoints](#ssh-key-endpoints)
- [Payment Endpoints](#payment-endpoints)
- [Image Endpoints](#image-endpoints)
- [Template Endpoints](#template-endpoints)
- [Custom VM Endpoints](#custom-vm-endpoints)
- [Subscription Endpoints](#subscription-endpoints)
- [Firewall Endpoints](#firewall-endpoints)
- [WebSocket Endpoints](#websocket-endpoints)
- [Public Endpoints](#public-endpoints)

---

## Authentication

All endpoints except those marked "Public" require authentication with **either**:

- `Authorization: Nostr <base64_encoded_event_json>`: NIP-98 (Nostr accounts)
- `Authorization: Bearer <jwt>`: session token from OAuth (`GET /api/v1/oauth/{provider}/login`) or passkey/WebAuthn login (`POST /api/v1/webauthn/login/start` → `/finish`)

### NIP-98 Event Structure

```json
{
  "kind": 27235,
  "created_at": <unix_timestamp>,
  "tags": [
    ["u", "<full_request_url>"],
    ["method", "<HTTP_METHOD>"]
  ],
  "content": "",
  "pubkey": "<nostr_pubkey_hex>",
  "id": "<event_id>",
  "sig": "<schnorr_signature>"
}
```

**Validation rules:**

- `created_at` must be within **60 seconds** of server time
- Each event id may be used **once**. Sign a fresh event per request, never reuse
- `u` tag must match the request path
- `method` tag must match the HTTP method (GET, POST, PATCH, etc.)
- `payload` tag is optional, but when present must be the lowercase hex SHA-256 of the exact request body
- Signature must be valid

**Header format:**

```
Authorization: Nostr <base64_encoded_event_json>
```

### Auth Tickets

WebSocket and HTML endpoints cannot receive an `Authorization` header, so they take a single-use, path-scoped, 30-second ticket in the query string.

```http
POST /api/v1/auth/ticket
Content-Type: application/json

{"path": "/api/v1/vm/7/console"}
```

**Response:**

```json
{ "data": { "ticket": "...", "expires_in": 30 } }
```

Tickets may only be minted for `/api/v1/vm/{id}/console`, `/api/v1/payment/{id}/invoice` and `/api/v1/support/chat`. Pass as `?ticket=<ticket>`. The legacy `?auth=<base64_nip98_event>` form still works but is **deprecated**.

### Rate Limiting

| Bucket  | Limit          | Endpoints                                                                                                                     |
| ------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| General | 600 req/min/IP | Everything else                                                                                                               |
| Strict  | 10 req/min/IP  | WebAuthn register/login, OAuth login/callback, email verification, WhatsApp verify/confirm, contact form, LNURL-pay endpoints |

Exceeding a limit returns `429 Too Many Requests` with a `Retry-After` header.

---

## Account Endpoints

### Get Account

```http
GET /api/v1/account
```

**Response:**

```json
{
  "data": {
    "email": "user@example.com",
    "email_verified": true,
    "contact_email": true,
    "contact_nip17": false,
    "country_code": "DE",
    "name": "John Doe",
    "address_1": "123 Main St",
    "address_2": null,
    "city": "Berlin",
    "state": null,
    "postcode": "10115",
    "tax_id": null,
    "account_type": "nostr",
    "tax": [
      {
        "company_id": 1,
        "company_name": "LNVPS",
        "rate": 23.0,
        "country_code": "IRL",
        "treatment": "domestic"
      }
    ]
  }
}
```

`email_verified` is `true` once the user has confirmed their email address.
`account_type` is one of `nostr`, `oauth`, `webauthn` (read-only; only `nostr` accounts have a usable Nostr key, so `contact_nip17` is rejected for the others).
`tax` is read-only and lists the VAT rate currently applicable per seller company.

### Update Account

```http
PATCH /api/v1/account
Content-Type: application/json
```

**Request body (all fields optional):**

```json
{
  "email": "user@example.com",
  "contact_email": true,
  "contact_nip17": false,
  "country_code": "DE",
  "name": "John Doe",
  "address_1": "123 Main St",
  "address_2": "Apt 4",
  "city": "Berlin",
  "state": "Berlin",
  "postcode": "10115",
  "tax_id": "DE123456789"
}
```

**Note:** NWC connection strings are **no longer stored on the account**: add one via `POST /api/v1/payment-methods` (see [Saved Payment Methods](#saved-payment-methods)), then set `auto_renewal_enabled: true` on each VM you want auto-renewed.

### Verify Email

```http
GET /api/v1/account/verify-email?token=<token>
```

Confirms an email verification token sent by the server after a `PATCH /api/v1/account` with an `email` value.

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `token`   | string | Yes      | Verification token from the email link |

**Response:** `200 OK` with no body on success.

**Flow:**

1. `PATCH /api/v1/account` with `{"email": "user@example.com"}`. The server sends a verification email.
2. User clicks link in email containing `?token=<token>`.
3. `GET /api/v1/account/verify-email?token=<token>`: confirms the token (**links expire after 24 hours**).
4. `GET /api/v1/account` now returns `email_verified: true`.

### Revoke All Sessions

```http
DELETE /api/v1/account/sessions
```

Invalidates every outstanding `Bearer` session token for the account ("log out everywhere"), including the caller's own. NIP-98 auth is unaffected.

---

## VM Endpoints

### List VMs

```http
GET /api/v1/vm
```

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | u64 | Max results (default: 20) |
| `offset` | u64 | Pagination offset |

**Response:**

```json
{
  "data": [
    {
      "id": 123,
      "created": "2024-01-01T12:00:00Z",
      "expires": "2024-02-01T12:00:00Z",
      "mac_address": "BC:24:11:00:00:7B",
      "image": {
        "id": 1,
        "distribution": "ubuntu",
        "flavour": "server",
        "version": "24.04",
        "default_username": "ubuntu"
      },
      "template": {
        "id": 1,
        "name": "VPS-Small",
        "cpu": 1,
        "memory": 1073741824,
        "disk_size": 21474836480,
        "disk_type": "ssd",
        "disk_interface": "scsi",
        "ip4_count": 1,
        "ip6_count": 1,
        "cost_plan": {
          "id": 1,
          "name": "Monthly",
          "amount": 500,
          "currency": "EUR",
          "interval_amount": 1,
          "interval_type": "month"
        },
        "region": {
          "id": 1,
          "name": "EU-West"
        }
      },
      "ssh_key": {
        "id": 1,
        "name": "my-key"
      },
      "ip_assignments": [
        {
          "id": 1,
          "ip": "203.0.113.45/24",
          "gateway": "203.0.113.1",
          "forward_dns": "45.113.0.203.in-addr.arpa",
          "reverse_dns": "myserver.example.com"
        }
      ],
      "status": {
        "state": "running",
        "cpu_usage": 0.5,
        "mem_usage": 0.25,
        "uptime": 3600,
        "net_in": 1048576,
        "net_out": 524288,
        "disk_read": 0,
        "disk_write": 0
      },
      "auto_renewal_enabled": false,
      "deleting_on": "2024-02-15T12:00:00Z",
      "subscription_id": 42,
      "max_prepay_days": 365,
      "cpu_arch": "x86_64",
      "host_ssh_keys": [
        {
          "key_type": "ssh-ed25519",
          "public_key": "AAAAC3NzaC1lZDI1NTE5...",
          "fingerprint_sha256": "SHA256:..."
        }
      ]
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Notes:**

- `expires` is absent for VMs that have never been paid for
- `deleting_on` is the date the VM is deleted if not renewed (expiry + grace period)
- `subscription_id` is the subscription this VM is billed under
- `max_prepay_days` caps how far ahead the VM may be renewed
- `host_sunset_date` (when present) means the host is being decommissioned; renewals are blocked once `expires` reaches it
- `host_ssh_keys` are the VM's own SSH host keys, for verifying the host on first connect (empty until captured after first boot)

### Get VM

```http
GET /api/v1/vm/{id}
```

**Response:** Same structure as single item in List VMs.

### Create VM

```http
POST /api/v1/vm
Content-Type: application/json
```

**Request body:**

```json
{
  "template_id": 1,
  "image_id": 1,
  "ssh_key_id": 1,
  "ref_code": "FRIEND123"
}
```

| Field         | Type   | Required | Description                             |
| ------------- | ------ | -------- | --------------------------------------- |
| `template_id` | u64    | Yes      | Template ID from `/api/v1/vm/templates` |
| `image_id`    | u64    | Yes      | Image ID from `/api/v1/image`           |
| `ssh_key_id`  | u64    | Yes      | SSH key ID from `/api/v1/ssh-key`       |
| `ref_code`    | string | No       | Referral code for discounts             |

**Response:** VM object (same as Get VM)

**Important:** The VM is created unpaid (no `expires`). Call `/api/v1/vm/{id}/renew` to generate a payment invoice.

### Update VM

```http
PATCH /api/v1/vm/{id}
Content-Type: application/json
```

**Request body (all fields optional):**

```json
{
  "ssh_key_id": 2,
  "reverse_dns": "myserver.example.com",
  "auto_renewal_enabled": true
}
```

### Start VM

```http
PATCH /api/v1/vm/{id}/start
```

### Stop VM

```http
PATCH /api/v1/vm/{id}/stop
```

### Restart VM

```http
PATCH /api/v1/vm/{id}/restart
```

### Reinstall VM

```http
PATCH /api/v1/vm/{id}/re-install
Content-Type: application/json

{"image_id": 7}
```

The body is optional. Omit it to reinstall the VM's current image, or pass `image_id` to switch OS.

**Warning:** This destroys all data on the VM and reinstalls the OS.

**Errors:** `402` if the VM is expired (renew first), `403` if the VM is not yours or the image is unavailable, `404` if the VM or image does not exist.

### Renew VM

```http
GET /api/v1/vm/{id}/renew
```

**Query parameters:**
| Parameter | Type | Values | Default |
|-----------|------|--------|---------|
| `method` | string | `lightning`, `onchain`, `revolut`, `paypal`, `stripe`, `nwc` | `lightning` |
| `intervals` | number | Billing intervals to pay for (`1` to `120`) | `1` |

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4e5f6...",
    "vm_id": 123,
    "created": "2024-01-01T12:00:00Z",
    "expires": "2024-01-01T12:15:00Z",
    "amount": 21000000,
    "tax": 0,
    "processing_fee": 0,
    "currency": "BTC",
    "is_paid": false,
    "data": {
      "lightning": "lnbc210u1pj..."
    },
    "time": 2592000,
    "is_upgrade": false,
    "is_refund": false,
    "upgrade_params": null
  }
}
```

**Notes:**

- `amount`, `tax` and `processing_fee` are in the smallest currency unit: **millisatoshis** for BTC, cents for fiat
- `time` is seconds added to expiry upon payment
- `expires` on the payment is invoice expiry (typically 15 minutes)
- `data.lightning` (lowercase) contains the BOLT11 invoice. Other variants: `{"onchain": {"address": "bc1...", "outpoint": "txid:vout"}}`, `{"revolut": {"token": "..."}}`, `{"stripe": {"session_id": "..."}}`
- `paid_at` is present once `is_paid` is true; `is_refund: true` rows are money returned to the customer
- A renewal is **rejected** if it would push `expires` beyond `now + max_prepay_days` or beyond the host's sunset date

### Renew VM via LNURL

```http
GET /api/v1/vm/{id}/renew-lnurlp
```

Returns LNURL-pay compatible response for ad-hoc payments.

### Get VM Time Series

```http
GET /api/v1/vm/{id}/time-series
```

Returns historical metrics (CPU, memory, network usage).

### List VM Payments

```http
GET /api/v1/vm/{id}/payments
```

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | u64 | Max results |
| `offset` | u64 | Pagination offset |

### List VM History

```http
GET /api/v1/vm/{id}/history
```

Returns audit log of VM actions (created, started, stopped, etc.).

### Get Upgrade Quote

```http
POST /api/v1/vm/{id}/upgrade/quote
Content-Type: application/json
```

**Request body:**

```json
{
  "cpu": 4,
  "memory": 8589934592,
  "disk": 107374182400
}
```

All fields are optional, but the request must keep every resource at or above its current value **and strictly increase at least one** of `cpu`/`memory`/`disk`. Shrinking or no-op requests are rejected. Downgrade by reinstalling onto a smaller template.

**Query parameters:** `method`: `lightning` (default), `revolut`, `paypal`; determines the quote currency.

**Response:**

```json
{
  "data": {
    "cost_difference": { "amount": 5000, "currency": "EUR" },
    "new_renewal_cost": { "amount": 1500, "currency": "EUR" },
    "discount": { "amount": 500, "currency": "EUR" },
    "tax": { "amount": 1150, "currency": "EUR" },
    "processing_fee": { "amount": 0, "currency": "EUR" }
  }
}
```

### Upgrade VM

```http
POST /api/v1/vm/{id}/upgrade?method=lightning
Content-Type: application/json
```

**Request body:** Same as upgrade quote.

**Query parameters:** `method`: `lightning` (default), `revolut`, `nwc`, `saved`; plus `payment_method_id` for `method=saved`. With `nwc`/`saved` the request briefly waits for settlement, so the returned payment may already be `is_paid: true`.

**Response:** Payment object (same as Renew VM).

**Important:** Running VMs are stopped and restarted to apply hardware changes.

---

## SSH Key Endpoints

### List SSH Keys

```http
GET /api/v1/ssh-key
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "my-laptop",
      "created": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Add SSH Key

```http
POST /api/v1/ssh-key
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "my-laptop",
  "key_data": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@laptop"
}
```

| Field      | Type   | Required | Description               |
| ---------- | ------ | -------- | ------------------------- |
| `name`     | string | Yes      | Friendly name for the key |
| `key_data` | string | Yes      | Full SSH public key       |

### Delete SSH Key

```http
DELETE /api/v1/ssh-key/{id}
```

---

## Payment Endpoints

### List Payment Methods

```http
GET /api/v1/payment/methods
```

**Response:**

```json
{
  "data": [
    {
      "name": "lightning",
      "currencies": ["BTC"],
      "metadata": {}
    },
    {
      "name": "revolut",
      "currencies": ["EUR", "USD"],
      "metadata": {},
      "processing_fee_rate": 1.0,
      "min_amount": 100,
      "min_amount_currency": "EUR"
    }
  ]
}
```

Method names: `lightning`, `onchain`, `revolut`, `paypal`, `stripe`, `nwc`, `lnurl`.

### Saved Payment Methods

Wallets/cards used for automatic renewals and referral payouts. Provider tokens and NWC connection strings are **never** returned.

```http
GET    /api/v1/payment-methods
POST   /api/v1/payment-methods
PATCH  /api/v1/payment-methods/{id}
DELETE /api/v1/payment-methods/{id}
```

**Add an NWC wallet:**

```json
{ "nwc_connection_string": "nostr+walletconnect://...", "name": "My wallet" }
```

The connection is validated (must expose `pay_invoice`); the first method added becomes the default.

**Response:**

```json
{
  "data": {
    "id": 1,
    "provider": "nwc",
    "name": "My wallet",
    "created": "2024-01-01T00:00:00Z",
    "is_default": true,
    "enabled": true
  }
}
```

`PATCH` accepts `is_default`, `enabled` and `name` (send `null` to clear the label). Setting `is_default: true` clears it on the other methods.

### Exchange Rates

```http
GET /api/v1/exchange-rate?base=BTC
```

Public. Returns `{ "updated", "base", "rates": { "EUR": 95000.0, ... } }` where 1 unit of `base` = `rates[X]` units of X (standard units). Convert A→B as `rates[B] / rates[A]`. Prefer this over the deprecated `other_price[]` fields.

### Get Payment

```http
GET /api/v1/payment/{id}
```

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4e5f6...",
    "vm_id": 123,
    "created": "2024-01-01T12:00:00Z",
    "expires": "2024-01-01T12:15:00Z",
    "amount": 21000000,
    "tax": 0,
    "processing_fee": 0,
    "currency": "BTC",
    "is_paid": true,
    "paid_at": "2024-01-01T12:03:00Z",
    "data": {
      "lightning": "lnbc210u1pj..."
    },
    "time": 2592000,
    "is_upgrade": false,
    "upgrade_params": null
  }
}
```

### Get Invoice

```http
GET /api/v1/payment/{id}/invoice?ticket=<ticket>
```

Returns HTML invoice suitable for printing/PDF generation. Authenticated by an [auth ticket](#auth-tickets) (the legacy `?auth=` form is deprecated).

---

## Image Endpoints

### List Images

```http
GET /api/v1/image?arch=x86_64
```

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `arch` | string | Optional CPU architecture filter (`x86_64`/`amd64`, `arm64`/`aarch64`). Returns matching plus architecture-agnostic images. Unknown value → `400` |

Use `VmStatus.cpu_arch` to pick the right `arch` when listing images for a reinstall.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "distribution": "ubuntu",
      "flavour": "server",
      "version": "24.04",
      "release_date": "2024-04-25T00:00:00Z",
      "cpu_arch": "x86_64",
      "default_username": "ubuntu",
      "popularity": 0.42
    },
    {
      "id": 2,
      "distribution": "debian",
      "flavour": "standard",
      "version": "12",
      "release_date": "2023-06-10T00:00:00Z",
      "default_username": "debian"
    }
  ]
}
```

**Distributions:**

- `ubuntu`, `debian`, `centos`, `fedora`, `freebsd`, `opensuse`, `archlinux`
- `redhatenterprise`, `almalinux`, `rockylinux`, `alpine`, `nixos`, `openbsd`, `netbsd`, `gentoo`, `voidlinux`

`popularity` is the fraction (0.0 to 1.0) of active VMs using the image.

---

## Template Endpoints

### List Templates

```http
GET /api/v1/vm/templates
```

Returns both standard templates and custom pricing options. Note the payload is an **object**, not an array.

**Response:**

```json
{
  "data": {
    "templates": [
      {
        "id": 1,
        "name": "VPS-Small",
        "created": "2024-01-01T00:00:00Z",
        "expires": null,
        "cpu": 1,
        "memory": 1073741824,
        "disk_size": 21474836480,
        "disk_type": "ssd",
        "disk_interface": "scsi",
        "ip4_count": 1,
        "ip6_count": 1,
        "cost_plan": {
          "amount": 500,
          "currency": "EUR",
          "interval_amount": 1,
          "interval_type": "month"
        },
        "region": {
          "id": 1,
          "name": "EU-West",
          "company_id": 1
        }
      }
    ],
    "custom_template": [
      {
        "id": 1,
        "name": "Custom",
        "region": { "id": 1, "name": "EU-West", "company_id": 1 },
        "min_cpu": 1,
        "max_cpu": 8,
        "min_memory": 1073741824,
        "max_memory": 34359738368,
        "min_ip4": 1,
        "max_ip4": 4,
        "min_ip6": 0,
        "max_ip6": 8,
        "disks": [
          {
            "min_disk": 21474836480,
            "max_disk": 1099511627776,
            "disk_type": "ssd",
            "disk_interface": "pcie"
          }
        ]
      }
    ]
  }
}
```

`ip4_count` / `ip6_count` state how many addresses the offer includes (a VM may hold more than one per family).

---

## Custom VM Endpoints

### Get Custom Template Price

```http
POST /api/v1/vm/custom-template/price
Content-Type: application/json
```

**Request body:**

```json
{
  "pricing_id": 1,
  "cpu": 2,
  "memory": 4294967296,
  "disk": 53687091200,
  "disk_type": "ssd",
  "disk_interface": "scsi"
}
```

| Field            | Type   | Required | Description               |
| ---------------- | ------ | -------- | ------------------------- |
| `pricing_id`     | u64    | Yes      | Custom pricing plan ID    |
| `cpu`            | u16    | Yes      | Number of CPU cores       |
| `memory`         | u64    | Yes      | Memory in bytes           |
| `disk`           | u64    | Yes      | Disk size in bytes        |
| `disk_type`      | string | Yes      | `hdd` or `ssd`            |
| `disk_interface` | string | Yes      | `sata`, `scsi`, or `pcie` |
| `ip4_count`      | u16    | No       | IPv4 addresses (default `1`) |
| `ip6_count`      | u16    | No       | IPv6 addresses (default `1`) |

**Response:**

```json
{
  "data": {
    "currency": "EUR",
    "amount": 1500,
    "interval_amount": 1,
    "interval_type": "month",
    "other_price": [{ "currency": "BTC", "amount": 1500000 }]
  }
}
```

Custom builds renew monthly, so `interval_amount`/`interval_type` are always `1`/`"month"`. `other_price` is deprecated, use `GET /api/v1/exchange-rate` instead.

### Create Custom VM

```http
POST /api/v1/vm/custom-template
Content-Type: application/json
```

**Request body:**

```json
{
  "pricing_id": 1,
  "cpu": 2,
  "memory": 4294967296,
  "disk": 53687091200,
  "disk_type": "ssd",
  "disk_interface": "scsi",
  "image_id": 1,
  "ssh_key_id": 1,
  "ref_code": null
}
```

**Response:** VM object (same as Create VM).

---

## Subscription Endpoints

### List Subscriptions

```http
GET /api/v1/subscriptions
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "My Subscription",
      "description": null,
      "created": "2024-01-01T00:00:00Z",
      "expires": "2024-02-01T00:00:00Z",
      "is_active": true,
      "auto_renewal_enabled": true,
      "company_id": 1,
      "line_items": [
        {
          "id": 1,
          "subscription_id": 1,
          "name": "IPv4 /24",
          "description": null,
          "price": { "currency": "EUR", "amount": 1000 },
          "setup_fee": { "currency": "EUR", "amount": 500 },
          "configuration": null,
          "resource": { "type": "vps", "vm_id": 123 }
        }
      ]
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

`resource` is a tagged union linking the line item to what it bills for: `{"type": "vps", "vm_id": n}` or `{"type": "ip_range", "ip_range_subscription_id": n}` (null when there is no linked resource).

### Create Subscription

```http
POST /api/v1/subscriptions
Content-Type: application/json

{
  "name": "My IP Block Subscription",
  "currency": "USD",
  "auto_renewal_enabled": true,
  "line_items": [{ "type": "ip_range", "ip_space_pricing_id": 5 }]
}
```

Line item types: `ip_range` (`ip_space_pricing_id`), `asn_sponsoring` (`asn`, not yet implemented), `dns_hosting` (`domain`, not yet implemented).

The subscription is created **inactive**; resources are allocated only after the first payment via `GET /api/v1/subscriptions/{id}/renew`.

### Update Subscription

```http
PATCH /api/v1/subscriptions/{id}
Content-Type: application/json

{"auto_renewal_enabled": false}
```

### Get Subscription

```http
GET /api/v1/subscriptions/{id}
```

**Response:** Same structure as single item in List Subscriptions.

### List Subscription Payments

```http
GET /api/v1/subscriptions/{id}/payments
```

### Renew Subscription

```http
GET /api/v1/subscriptions/{id}/renew?method=lightning
```

`method` is one of `lightning` (default), `revolut`, `paypal`, `stripe`. The first payment includes setup fees plus the recurring cost; later renewals charge only the recurring cost.

---

## Firewall Endpoints

Per-VM ACCEPT/DROP/REJECT rules, evaluated in `priority` order (lower first) before the default policy. Default limit is **20 rules per VM**; any change queues an asynchronous re-apply on the host. Anti-spoofing is always enforced regardless of user rules.

```http
GET    /api/v1/vm/{id}/firewall
POST   /api/v1/vm/{id}/firewall
PATCH  /api/v1/vm/{id}/firewall/{rule_id}
DELETE /api/v1/vm/{id}/firewall/{rule_id}
GET    /api/v1/vm/{id}/firewall/policy
PATCH  /api/v1/vm/{id}/firewall/policy
```

**Rule:**

```json
{
  "id": 1,
  "priority": 10,
  "direction": "inbound",
  "protocol": "tcp",
  "action": "accept",
  "src_cidr": null,
  "dst_port_start": 22,
  "dst_port_end": 22,
  "enabled": true
}
```

`direction`: `inbound`/`outbound`. `protocol`: `any`/`tcp`/`udp`/`icmp`. `action`: `accept`/`drop`/`reject`. Send `null` for `src_cidr`/`dst_port_*` to mean "any". Ports are 1-65535 with `dst_port_start <= dst_port_end`.

**Policy:**

```json
{ "policy_in": "drop", "policy_out": null }
```

`null` inherits the host default (allow-all). On `PATCH`, omit a field to leave it unchanged.

---

## WebSocket Endpoints

Both authenticate with `?ticket=<ticket>` from [Auth Tickets](#auth-tickets) (legacy `?auth=<base64_nip98_event>` deprecated).

### VM Serial Console

```
WS /api/v1/vm/{id}/console?ticket=<ticket>
```

Raw bidirectional relay to the VM's serial port.

### Support Chat

```
WS /api/v1/support/chat?ticket=<ticket>
```

Send each message as one text frame. Replies stream back as JSON text frames:

```json
{ "type": "token", "text": "..." }
{ "type": "final", "text": "..." }
{ "type": "error", "message": "..." }
```

Exactly one terminal `final`/`error` per message sent. Limits: 4000 chars per message, 50 messages per connection (reconnect to continue; history is preserved). The agent can read your account, VMs, payments and history and can start/stop/restart VMs, but it cannot extend, refund or delete a VM. Ignore unrecognised frame types.

---

## Public Endpoints

These endpoints do not require authentication.

### List IP Spaces

```http
GET /api/v1/ip_space?limit=50&offset=0
```

Returns available (non-reserved) IP space with per-prefix-size pricing:
`{ id, min_prefix_size, max_prefix_size, registry, ip_version, pricing[] }` where `registry` is `ARIN|RIPE|APNIC|LACNIC|AFRINIC` and `ip_version` is `ipv4|ipv6`.

### Get IP Space

```http
GET /api/v1/ip_space/{id}
```

### LNURL-pay Endpoint

```http
GET /.well-known/lnurlp/{vm_id}
```

LNURL-pay compatible endpoint for ad-hoc VM extension payments. Invoices are generated by `GET /api/v1/vm/{id}/renew-lnurlp?amount=<millisats>` (minimum 1000 msat). Both sit in the strict rate-limit bucket.

### Contact Form

```http
POST /api/v1/contact
Content-Type: application/json
```

Requires Cloudflare Turnstile captcha token.

---

## Error Responses

All errors return:

```json
{
  "error": "Description of the error"
}
```

**HTTP Status Codes:**

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 200  | Success                                      |
| 400  | Bad request (invalid parameters)             |
| 401  | Unauthorized (invalid/missing NIP-98 auth)   |
| 403  | Forbidden (resource belongs to another user) |
| 402  | Payment required (e.g. VM expired)           |
| 404  | Resource not found                           |
| 429  | Rate limited, retry after `Retry-After` s   |
| 500  | Internal server error                        |

---

## Data Type Reference

### Size Units (bytes)

| Unit | Bytes             |
| ---- | ----------------- |
| 1 KB | 1,024             |
| 1 MB | 1,048,576         |
| 1 GB | 1,073,741,824     |
| 1 TB | 1,099,511,627,776 |

### Disk Types

| Value | Description       |
| ----- | ----------------- |
| `hdd` | Hard disk drive   |
| `ssd` | Solid state drive |

### Disk Interfaces

| Value  | Description                  |
| ------ | ---------------------------- |
| `sata` | SATA interface               |
| `scsi` | SCSI interface (recommended) |
| `pcie` | PCIe/NVMe (fastest)          |

### VM States

| State      | Description                                             |
| ---------- | ------------------------------------------------------- |
| `unknown`  | Not yet known (default before first poll)                |
| `creating` | First payment received; being provisioned for the first time |
| `running`  | Online and accessible                                    |
| `stopped`  | Powered off                                              |

### Payment Methods

| Value       | Description                              |
| ----------- | ---------------------------------------- |
| `lightning` | Bitcoin Lightning Network                |
| `onchain`   | On-chain Bitcoin (BTC only)              |
| `revolut`   | Card/fiat via Revolut                    |
| `paypal`    | Fiat via PayPal                          |
| `stripe`    | Card/fiat via Stripe                     |
| `nwc`       | Saved Nostr Wallet Connect wallet        |
| `lnurl`     | LNURL-pay                                |

### Currency Units

| Currency  | Smallest unit             |
| --------- | ------------------------- |
| `BTC`     | millisatoshis (1 sat = 1000) |
| `EUR`/`USD` | cents                   |

### Account Types

| Value      | Description                                            |
| ---------- | ------------------------------------------------------ |
| `nostr`    | Nostr key account (NIP-98 auth, npub/NIP-17 available)  |
| `oauth`    | Google/GitHub/Facebook/Apple login (Bearer token)       |
| `webauthn` | Passkey account (Bearer token)                          |

### Cost Plan Interval Types

| Value   | Description     |
| ------- | --------------- |
| `day`   | Daily billing   |
| `month` | Monthly billing |
| `year`  | Yearly billing  |
