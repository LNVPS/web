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
- [Public Endpoints](#public-endpoints)

---

## Authentication

All endpoints except those marked "Public" require NIP-98 HTTP Authentication.

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

- `created_at` must be within 600 seconds of server time
- `u` tag must exactly match the request URL
- `method` tag must match the HTTP method (GET, POST, PATCH, etc.)
- Signature must be valid

**Header format:**

```
Authorization: Nostr <base64_encoded_event_json>
```

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
    "contact_email": true,
    "contact_nip17": false,
    "country_code": "DE",
    "name": "John Doe",
    "address_1": "123 Main St",
    "address_2": null,
    "city": "Berlin",
    "state": null,
    "postcode": "10115",
    "tax_id": null
  }
}
```

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
  "tax_id": "DE123456789",
  "nwc_connection_string": "nostr+walletconnect://..."
}
```

**Note:** Setting `nwc_connection_string` enables automatic renewal payments via Nostr Wallet Connect.

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
      "auto_renewal_enabled": false
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

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

**Important:** The VM is created with `expires = created` (unpaid state). Call `/api/v1/vm/{id}/renew` to generate a payment invoice.

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
```

**Warning:** This destroys all data on the VM and reinstalls the OS.

### Renew VM

```http
GET /api/v1/vm/{id}/renew
```

**Query parameters:**
| Parameter | Type | Values | Default |
|-----------|------|--------|---------|
| `method` | string | `lightning`, `revolut`, `paypal`, `stripe`, `nwc` | `lightning` |
| `intervals` | number | Number of billing intervals to pay for | `1` |

**Response:**

```json
{
  "data": {
    "id": "a1b2c3d4e5f6...",
    "vm_id": 123,
    "created": "2024-01-01T12:00:00Z",
    "expires": "2024-01-01T12:15:00Z",
    "amount": 21000,
    "tax": 0,
    "currency": "BTC",
    "is_paid": false,
    "data": {
      "lightning": "lnbc210u1pj..."
    },
    "time": 2592000,
    "is_upgrade": false,
    "upgrade_params": null
  }
}
```

**Notes:**

- `amount` is in satoshis (BTC) or cents (fiat)
- `time` is seconds added to expiry upon payment
- `expires` on the payment is invoice expiry (typically 15 minutes)
- `data.Lightning` contains the BOLT11 invoice

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

All fields are optional. Only include resources you want to change.

**Response:**

```json
{
  "data": {
    "upgrade_cost": {
      "amount": 5000,
      "currency": "EUR"
    },
    "new_renewal_cost": {
      "amount": 1500,
      "currency": "EUR"
    },
    "discount": 0
  }
}
```

### Upgrade VM

```http
POST /api/v1/vm/{id}/upgrade
Content-Type: application/json
```

**Request body:** Same as upgrade quote.

**Response:** Payment object (same as Renew VM).

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
      "metadata": {}
    }
  ]
}
```

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
    "amount": 21000,
    "tax": 0,
    "currency": "BTC",
    "is_paid": true,
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
GET /api/v1/payment/{id}/invoice
```

Returns HTML invoice suitable for printing/PDF generation.

---

## Image Endpoints

### List Images

```http
GET /api/v1/image
```

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
      "default_username": "ubuntu"
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

- `ubuntu`, `debian`, `centos`, `fedora`
- `freebsd`, `opensuse`, `archlinux`, `redhatenterprise`

---

## Template Endpoints

### List Templates

```http
GET /api/v1/vm/templates
```

Returns both standard templates and custom pricing options.

**Response:**

```json
{
  "data": [
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
      "cost_plan": {
        "amount": 500,
        "currency": "EUR",
        "interval_amount": 1,
        "interval_type": "month"
      },
      "region": {
        "id": 1,
        "name": "EU-West"
      }
    }
  ]
}
```

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

**Response:**

```json
{
  "data": {
    "cost_difference": {
      "amount": 5000,
      "currency": "EUR"
    },
    "new_renewal_cost": {
      "amount": 1500,
      "currency": "EUR"
    },
    "discount": {
      "amount": 500,
      "currency": "EUR"
    }
  }
}
```

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
      "currency": "EUR",
      "interval_amount": 1,
      "interval_type": "month",
      "setup_fee": 0,
      "auto_renewal_enabled": true,
      "line_items": [
        {
          "id": 1,
          "subscription_id": 1,
          "name": "IPv4 /24",
          "description": null,
          "amount": 1000,
          "setup_amount": 500,
          "configuration": null
        }
      ]
    }
  ]
}
```

### Create Subscription

```http
POST /api/v1/subscriptions
Content-Type: application/json
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
GET /api/v1/subscriptions/{id}/renew
```

---

## Public Endpoints

These endpoints do not require authentication.

### List IP Spaces

```http
GET /api/v1/ip_space
```

Returns available regions with pricing information.

### Get IP Space

```http
GET /api/v1/ip_space/{id}
```

### LNURL-pay Endpoint

```http
GET /.well-known/lnurlp/{vm_id}
```

LNURL-pay compatible endpoint for ad-hoc VM extension payments.

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
| 404  | Resource not found                           |
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

| State     | Description           |
| --------- | --------------------- |
| `pending` | Being provisioned     |
| `running` | Online and accessible |
| `stopped` | Powered off           |
| `failed`  | Error state           |

### Payment Methods

| Value       | Description               |
| ----------- | ------------------------- |
| `lightning` | Bitcoin Lightning Network |
| `revolut`   | Fiat via Revolut          |

### Cost Plan Interval Types

| Value   | Description     |
| ------- | --------------- |
| `day`   | Daily billing   |
| `month` | Monthly billing |
| `year`  | Yearly billing  |
