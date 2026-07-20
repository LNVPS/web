# Billing Design System

A small, shared vocabulary for every surface that shows the state of a paid
thing — VMs, subscriptions, payment history. The goal is that a lease looks and
behaves **identically wherever it appears**: overview list, VM billing page,
subscription detail, subscription list. Reuse these pieces instead of hand-rolling
new billing chrome.

## Where it lives

| File | Contents |
|---|---|
| `src/components/billing.tsx` | The system: tones, status logic, and the composite billing components. |
| `src/components/card.tsx` | `Card` / `CardHeader` / `CardBody` — the terminal-panel shell everything sits in. |
| `src/components/cost.tsx` | `CostLabel` / `CostAmount` / `IntervalSuffix` — money + interval formatting. |

Consumers (good references): `pages/vm-billing.tsx`, `pages/account-subscription.tsx`,
`pages/account-subscriptions.tsx`, `components/vps-instance.tsx`, `pages/account.tsx`.

---

## 1. Philosophy

- **One status language.** Every paid thing is described by a _tone_ (Active / Expiring / Expired / Pending) and a _lease meter_ (how much of the cycle is left). Derive both from one function (`expiryStatus`), never re-implement the thresholds.
- **Terminal-panel aesthetic.** Square corners (`rounded-sm`), hairline `cyber-border` rules, `bg-cyber-panel` bodies with `bg-cyber-panel-light` header strips. Neon glow (`shadow-neon-*`) is an accent, not a default.
- **Data reads like a console.** Numbers use `tabular-nums`; labels/eyebrows are uppercase with wide letter-spacing; identifiers use `font-mono`.
- **Urgency is structural.** Group by what needs action (Action required → Active → Expired), don't just color a flat list.
- **Copy is active and specific.** "Renew now", "Extend now", "Pay to bring it online" — name the action and the consequence (data loss on a date), never vague status.

---

## 2. Tokens

Colours come from the `cyber-*` theme (see `src/index.css`); they auto-swap for
light/dark. Never hard-code hex — always use the class.

### Status tones

`BillingTone = "primary" | "warning" | "danger" | "muted"`

| Tone | Meaning | Pill classes | Meter fill |
|---|---|---|---|
| `primary` | Active / healthy | `text-cyber-primary border-cyber-primary/50 bg-cyber-primary/10` | `bg-cyber-primary` |
| `warning` | Expiring soon / pending payment | `text-cyber-warning border-cyber-warning/50 bg-cyber-warning/10` | `bg-cyber-warning` |
| `danger` | Expired / in deletion grace | `text-cyber-danger border-cyber-danger/50 bg-cyber-danger/10` | `bg-cyber-danger` |
| `muted` | Not yet active / neutral | `text-cyber-muted border-cyber-border bg-cyber-panel-light` | `bg-cyber-muted` |

These are defined once as the `TONE` map in `billing.tsx`. If you need a toned
element that isn't a `StatusPill`, mirror those exact class strings.

### Surface tokens

| Role | Class |
|---|---|
| Card / panel background | `bg-cyber-panel` |
| Header strip / raised row | `bg-cyber-panel-light` |
| Hairline rule / border | `border-cyber-border` (dividers: `divide-cyber-border/60`) |
| Corner radius | `rounded-sm` everywhere (meters/pills use `rounded-full`) |
| Hover lift | `hover:border-cyber-primary hover:shadow-neon-sm transition-all duration-200` |
| Danger glow | `shadow-neon-danger` (also `-warning`, `-accent`, `-sm`, `-lg`) |

### Type conventions

| Role | Recipe |
|---|---|
| Eyebrow / section label | `text-[0.65rem] uppercase tracking-[0.25em] text-cyber-text` |
| Sub-label (in card) | `text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text` |
| Status pill text | `text-[0.65rem] uppercase tracking-[0.2em]` (built into `StatusPill`) |
| Headline number / price | `text-2xl leading-none text-cyber-text-bright tabular-nums` |
| Identifiers (`#12`, npub) | `font-mono text-xs text-cyber-muted` |
| Any figure that can change | add `tabular-nums` so digits don't jitter |

Letter-spacing convention: **`0.25em`** for top-level section eyebrows,
**`0.2em`** for labels inside a card. Keep it consistent.

---

## 3. The shell — `Card` / `CardHeader` / `CardBody`

The bordered container everything sits in. The caller supplies padding and
background so the same shell works as a status card, a settings section, or a table.

```tsx
<Card>
  <CardHeader strip className="flex items-center justify-between gap-2 px-4 py-2">
    <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-text">
      <FormattedMessage defaultMessage="Payment history" />
    </span>
  </CardHeader>
  <CardBody className="p-0">{/* rows */}</CardBody>
</Card>
```

- `Card` — `overflow-hidden rounded-sm border border-cyber-border`; pass `className` to override the default `bg-cyber-panel`.
- `CardHeader` — bottom rule included; `strip` adds the `bg-cyber-panel-light` treatment. Supply your own padding.
- `CardBody` — padding via `className` (`p-0` when it holds a divided list).

---

## 4. Status logic (the single source of truth)

### `expiryStatus(expires, cycleDays): ExpiryStatus`

Turn an ISO expiry date + cycle length into everything a surface needs:

```ts
interface ExpiryStatus {
  isNew: boolean;       // no expiry yet (never paid / not provisioned)
  expired: boolean;     // past expiry
  expiringSoon: boolean;// within 3 days of expiry
  tone: BillingTone;    // primary | warning | danger | muted
  meterPct: number;     // 0–100 fill for the lease meter
  daysLeft: number;     // whole days remaining (0 when expired/new)
}
```

Thresholds live **only** here: expiring-soon = ≤3 days; expired meter pins to 100%.
Always drive pills, borders, meters and copy from this — never re-derive dates inline.

### `planCycleDays(plan: VmCostPlan): number`

Converts a cost plan's interval (`day`/`month`/`year` × amount) to days, so the
meter scales against the real billing cycle. Subscriptions bill monthly, so they
pass a literal `30`.

```ts
const st = expiryStatus(vm.expires, planCycleDays(vm.template.cost_plan));
```

### `subscriptionStatus(sub): { tone, label }`

Convenience wrapper that folds "pending payment" (not active but not expired)
into the tone/label pair, ready for a `StatusPill`.

---

## 5. Components

### `StatusPill`

Small tone-coloured status chip. The atom used on every billing surface.

```tsx
<StatusPill tone={st.tone}>
  <FormattedMessage defaultMessage="Active" />
</StatusPill>
```

### `BillingStatusCard`

The hero of a billing detail page: header strip + status pill, a price, a
next-payment date, the **lease meter**, an optional `warning`, and a full-width
primary CTA. It's fully slotted (`ReactNode` props) so VM and subscription pages
share one layout.

Key props: `eyebrow`, `statusLabel`, `tone`, `priceLabel`, `price`, `dateLabel`,
`date`, `meterPct`, `meterLeft`, `meterRight`, `warning?`, `cta{label,onClick,disabled}`.

The **lease meter** is the signature element: a thin `rounded-full` track with a
tone-coloured fill at `meterPct`, `meterLeft` (days left / "Lease expired") and a
uppercase `meterRight` (billing cadence).

### `DeletionWarning`

The red "you will lose this" notice, fed as `BillingStatusCard`'s `warning` (and
reused inline on VM rows). Switches copy automatically at the grace-period boundary:

- future `deletingOn` → "Renew before {date} or this and its data will be permanently deleted."
- past → "This is past its grace period and may be deleted at any time. Renew now to keep it."

Surfacing `deleting_on` is mandatory anywhere a lapsed lease is shown — it's the
single most consequential fact for the user.

### `AutoRenewCard`

Auto-renew toggle (accessible `role="switch"`) plus the default saved payment
method (or a "None set — add one" link to settings). Read-only when no `onToggle`
is passed. Use `savedMethodIcon` / `savedMethodLabel` for method display; both are
exported from `billing.tsx`.

### `BillingPaymentsTable`

Payment history inside a `Card`. Takes `rows: PaymentRow[]` and sorts newest-first.
Each row: date + time/method, amount (`CostAmount`), a `StatusPill` for paid/
unpaid/expired, and an optional action (e.g. the printer icon → `invoiceLink`).
Build rows by mapping your API payments into `PaymentRow` (see `vm-billing.tsx`).

---

## 6. Money — `cost.tsx`

- **`CostAmount`** — formats one `{ currency, amount }` (+ optional `interval_type`). Sats render as integer + " sats"; fiat via `FormattedNumber` currency style. `converted` prefixes `~`.
- **`CostLabel`** — shows the amount in the user's currency, falling back to the native currency in parentheses when a conversion exists.
- **`IntervalSuffix`** — pluralised day/month/year suffix.

Always render money through these; never format currency by hand.

---

## 7. Recurring patterns

**Detail page recipe** (VM billing / subscription):
`BillingStatusCard` → `AutoRenewCard` → (domain-specific cards, e.g. line items) →
`BillingPaymentsTable`. Wrap in `flex flex-col gap-4`.

**List row card** (`vps-instance.tsx`, `SubscriptionRow`):
`rounded-sm border bg-cyber-panel` clickable card; identity line (`#id` mono +
name) with a `StatusPill`; a specs/summary line in `text-xs text-cyber-muted`;
a footer that is either a hairline lease meter (healthy) or a toned notice
(expired/unpaid). Border tone tracks status; add keyboard access + focus ring
when the whole card is clickable.

**Grouping by urgency:** split lists into Action-required → Active → Expired with
uppercase eyebrow headers (`tracking-[0.2em]`), optionally collapsible for
secondary groups (`Group` in `account-subscriptions.tsx`).

**Fleet/summary line:** dense, `font-mono`, tone-coloured segments with status
dots (`● 3 running · ● 1 stopped · ⚠ 1 need renewal`) rather than a row of
big-number stat cards.

---

## 8. Checklist for a new billing surface

- [ ] Status comes from `expiryStatus(...)`, cycle from `planCycleDays(...)` (or `30` for subscriptions) — no inline date math.
- [ ] Status shown via `StatusPill` with the derived `tone`.
- [ ] Sits in a `Card` (or a bordered row that matches its chrome).
- [ ] Money rendered with `CostAmount` / `CostLabel`; figures use `tabular-nums`.
- [ ] Eyebrows uppercase, `tracking-[0.25em]` (section) / `tracking-[0.2em]` (in-card).
- [ ] A lapsed lease shows `deleting_on` via `DeletionWarning` (or an equivalent inline notice).
- [ ] Colours are `cyber-*` classes only; corners `rounded-sm`.
- [ ] Copy names the action and its consequence; wrapped in `<FormattedMessage>`.
