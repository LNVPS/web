import { ReactNode, useState } from "react";
import {
  CostPlanIntervalType,
  DiskType,
  PaymentMethod,
  SavedPaymentMethod,
  VmInstance,
  VmPayment,
} from "../api";
import { GiB } from "../const";
import {
  AutoRenewCard,
  BillingPaymentsTable,
  BillingStatusCard,
  DeletionWarning,
  StatusPill,
  SunsetWarning,
  type BillingTone,
  type PaymentRow,
} from "../components/billing";
import {
  ProviderMethodRow,
  SavedMethodRow,
} from "../components/checkout-method-rows";
import VpsInstanceRow from "../components/vps-instance";
import OnChainPayment from "../components/onchain-payment";
import VpsPayment from "../components/vps-payment";
import { RevolutPayWidget } from "../components/revolut";
import QrCode from "../components/qr";
import { LNURL } from "@snort/shared";
import { Icon } from "../components/icon";
import Seo from "../components/seo";
import { FormattedMessage } from "react-intl";
import type { AccountDetail } from "../api";

/**
 * Dev-only visual catalogue of every billing/checkout component in each of its
 * states, so they can be eyeballed without walking a real VM through the full
 * payment flow. Not linked from anywhere — reach it at /gallery.
 *
 * Every mock uses `as` casts against the API types: the components only read a
 * handful of fields, so filling the whole shape would be noise.
 */

const DAY = 86_400_000;
const now = Date.now();
const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString();

/** A dropdown that drives one component section's displayed state. */
function StateSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<T>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** A titled section with its state dropdown on the right and the demo below. */
function Section({
  title,
  control,
  children,
}: {
  title: string;
  control?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border border-cyber-border rounded-sm bg-cyber-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm uppercase tracking-[0.2em] text-cyber-text-bright">
          {title}
        </h2>
        {control}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

const COST_PLAN = {
  id: 1,
  name: "monthly",
  currency: "EUR" as const,
  amount: 799,
  interval_amount: 1,
  interval_type: CostPlanIntervalType.MONTH,
  other_price: [{ currency: "USD", amount: 899 }],
};

function mkVm(over: Partial<VmInstance>): VmInstance {
  return {
    id: 42,
    created: iso(-40 * DAY),
    expires: iso(20 * DAY),
    status: { state: "running" },
    ip_assignments: [
      { id: 1, ip: "185.10.20.30", gateway: "", reverse_dns: "vm42.lnvps.net" },
    ],
    template: {
      id: 1,
      name: "Nano",
      created: iso(-400 * DAY),
      cpu: 2,
      memory: 4 * GiB,
      disk_size: 80 * GiB,
      disk_type: DiskType.SSD,
      region: { id: 1, name: "Helsinki" },
      cost_plan: COST_PLAN,
    },
    ...over,
  } as unknown as VmInstance;
}

// ---- VM list row states ---------------------------------------------------
const VM_STATES = [
  "active",
  "auto-renew on",
  "expiring soon",
  "new (unpaid)",
  "expired (in grace)",
  "expired (past grace)",
  "host retiring",
] as const;
type VmState = (typeof VM_STATES)[number];

function vmForState(s: VmState): VmInstance {
  switch (s) {
    case "active":
      return mkVm({ expires: iso(20 * DAY) });
    case "auto-renew on":
      return mkVm({ expires: iso(20 * DAY), auto_renewal_enabled: true });
    case "expiring soon":
      return mkVm({ expires: iso(2 * DAY) });
    case "new (unpaid)":
      return mkVm({ expires: undefined, status: undefined });
    case "expired (in grace)":
      return mkVm({ expires: iso(-2 * DAY), deleting_on: iso(5 * DAY) });
    case "expired (past grace)":
      return mkVm({ expires: iso(-10 * DAY), deleting_on: iso(-1 * DAY) });
    case "host retiring":
      return mkVm({ expires: iso(20 * DAY), host_sunset_date: iso(45 * DAY) });
  }
}

// ---- Billing status card states -------------------------------------------
const CARD_STATES = ["active", "expiring", "expired", "pending"] as const;
type CardState = (typeof CARD_STATES)[number];
const CARD_TONE: Record<CardState, BillingTone> = {
  active: "primary",
  expiring: "warning",
  expired: "danger",
  pending: "muted",
};

// ---- Auto-renew states ----------------------------------------------------
const RENEW_STATES = ["off", "on · no method", "on · card saved"] as const;
type RenewState = (typeof RENEW_STATES)[number];

const SAVED_CARD: SavedPaymentMethod = {
  id: 1,
  provider: "revolut",
  created: iso(-100 * DAY),
  card_brand: "visa",
  card_last_four: "4242",
  is_default: true,
  enabled: true,
};

// ---- Payment methods ------------------------------------------------------
const METHODS: Array<PaymentMethod> = [
  { name: "lightning", currencies: ["BTC"], processing_fee_rate: 0 },
  { name: "lnurl", currencies: ["BTC"] },
  {
    name: "onchain",
    currencies: ["BTC"],
    processing_fee_base: 500_000,
    processing_fee_currency: "BTC",
  },
  {
    name: "revolut",
    currencies: ["EUR", "USD"],
    processing_fee_rate: 1.5,
    processing_fee_base: 2000,
    processing_fee_currency: "EUR",
  },
];

// ---- Payment history rows -------------------------------------------------
const PAYMENT_ROWS: Array<PaymentRow> = [
  {
    id: "1",
    created: iso(-1 * DAY),
    amount: { currency: "EUR", amount: 799 },
    method: "revolut",
    status: <FormattedMessage defaultMessage="Paid" />,
    statusTone: "primary",
    action: <Icon name="printer" />,
  },
  {
    id: "2",
    created: iso(-2 * DAY),
    amount: { currency: "BTC", amount: 21_000_000 },
    method: "onchain",
    status: <FormattedMessage defaultMessage="Confirming" />,
    statusTone: "warning",
    action: <Icon name="qr" />,
  },
  {
    id: "3",
    created: iso(-3 * DAY),
    amount: { currency: "BTC", amount: 21_000_000 },
    method: "onchain",
    status: <FormattedMessage defaultMessage="Pending" />,
    statusTone: "warning",
  },
  {
    id: "4",
    created: iso(-4 * DAY),
    amount: { currency: "EUR", amount: 799 },
    method: "lightning",
    status: <FormattedMessage defaultMessage="Expired" />,
    statusTone: "danger",
  },
];

// ---- Payment flows --------------------------------------------------------
const FLOW_STATES = [
  "lightning",
  "lnurl",
  "on-chain · awaiting",
  "on-chain · received (0-conf)",
  "revolut (card)",
] as const;
type FlowState = (typeof FLOW_STATES)[number];

const DEMO_INVOICE =
  "lnbc210u1p3exampleonlydonotpay0000000000000000000000000000000000" +
  "0000000000000000000000000000000000000000000000000000000000000000";

function onchainPayment(zeroConf: boolean): VmPayment {
  return {
    id: "demo",
    vm_id: 42,
    created: iso(0),
    expires: iso(DAY),
    amount: 21_000_000,
    tax: 0,
    processing_fee: 0,
    currency: "BTC",
    is_paid: false,
    // Quote buys 30 days; on discovery the deposit is re-priced, so the 0-conf
    // state credits a subtly different span (rate drift / rounding) to show it.
    time: (zeroConf ? 28 : 30) * 86_400,
    data: {
      onchain: {
        address: "bc1qexampleaddressfordemodonotsend000000000",
        outpoint: zeroConf
          ? "3a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00:0"
          : undefined,
      },
    },
  } as unknown as VmPayment;
}

const lightningPayment = {
  id: "demo",
  vm_id: 42,
  created: iso(0),
  expires: iso(DAY),
  amount: 21_000_000,
  tax: 0,
  processing_fee: 0,
  currency: "BTC",
  is_paid: false,
  time: 30 * 86_400,
  data: { lightning: DEMO_INVOICE },
} as unknown as VmPayment;

const revolutPayment = {
  id: "demo",
  vm_id: 42,
  created: iso(0),
  expires: iso(DAY),
  amount: 799,
  tax: 0,
  processing_fee: 12,
  currency: "EUR",
  is_paid: false,
  time: 30 * 86_400,
  data: { revolut: { token: "demo_token" } },
} as unknown as VmPayment;

const DEMO_ACCOUNT = {
  email: "user@example.com",
  name: "Ada Lovelace",
  country_code: "FIN",
  postcode: "00100",
  city: "Helsinki",
} as unknown as AccountDetail;

const noop = async () => false;
const noDetect = async () => undefined;

/** Renders the checkout widget for the selected payment flow. */
function PaymentFlowDemo({ state }: { state: FlowState }) {
  switch (state) {
    case "lightning":
      return <VpsPayment payment={lightningPayment} />;
    case "lnurl":
      return (
        <div className="flex flex-col items-center gap-4 rounded-sm border border-cyber-border bg-cyber-panel p-4">
          <QrCode
            data={`lightning:${new LNURL("42@lnvps.net").lnurl}`}
            width={512}
            height={512}
            avatar="/logo.jpg"
            className="cursor-pointer rounded-sm overflow-hidden"
          />
          <div className="select-all break-all text-center text-sm text-cyber-text">
            42@lnvps.net
          </div>
          <div className="text-center text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Pay from any Lightning wallet to top up this subscription." />
          </div>
        </div>
      );
    case "on-chain · awaiting":
      return (
        <OnChainPayment
          key="awaiting"
          payment={onchainPayment(false)}
          pollPaid={noop}
          pollDetected={noDetect}
        />
      );
    case "on-chain · received (0-conf)":
      return (
        <OnChainPayment
          key="zeroconf"
          payment={onchainPayment(true)}
          pollPaid={noop}
          pollDetected={noDetect}
        />
      );
    case "revolut (card)":
      return (
        <RevolutPayWidget
          payment={revolutPayment}
          account={DEMO_ACCOUNT}
          mode="sandbox"
          onPaid={() => {}}
        />
      );
  }
}

export default function ComponentGalleryPage() {
  const [vmState, setVmState] = useState<VmState>("active");
  const [cardState, setCardState] = useState<CardState>("active");
  const [renewState, setRenewState] = useState<RenewState>("on · card saved");
  const [flowState, setFlowState] = useState<FlowState>("lightning");

  return (
    <div className="flex flex-col gap-6 py-6 max-w-2xl mx-auto">
      <Seo noindex title="Component gallery" />
      <h1 className="text-xl text-cyber-text-bright">
        Component gallery
        <span className="ml-2 text-xs text-cyber-muted">
          dev preview — not linked in nav
        </span>
      </h1>

      <Section title="Status pill">
        <div className="flex flex-wrap gap-2">
          {(["primary", "warning", "danger", "muted"] as const).map((t) => (
            <StatusPill key={t} tone={t}>
              {t}
            </StatusPill>
          ))}
        </div>
      </Section>

      <Section
        title="VM list row"
        control={
          <StateSelect
            value={vmState}
            options={VM_STATES}
            onChange={setVmState}
          />
        }
      >
        <VpsInstanceRow vm={vmForState(vmState)} actions={false} />
      </Section>

      <Section
        title="Billing status card"
        control={
          <StateSelect
            value={cardState}
            options={CARD_STATES}
            onChange={setCardState}
          />
        }
      >
        <BillingStatusCard
          eyebrow={<>Subscription · VPS #42</>}
          statusLabel={cardState}
          tone={CARD_TONE[cardState]}
          priceLabel="Renews at"
          price="€7.99"
          dateLabel={cardState === "expired" ? "Expired on" : "Next payment"}
          date="Mar 3, 2026"
          meterPct={
            cardState === "expired"
              ? 100
              : cardState === "expiring"
                ? 92
                : cardState === "pending"
                  ? 0
                  : 40
          }
          meterLeft={cardState === "expired" ? "Lease expired" : "18 days left"}
          meterRight="Billed every month"
          warning={
            cardState === "expired" ? (
              <DeletionWarning deletingOn={new Date(now + 5 * DAY)} />
            ) : undefined
          }
          cta={{ label: "Extend now", onClick: () => {} }}
        />
      </Section>

      <Section
        title="Auto-renew card"
        control={
          <StateSelect
            value={renewState}
            options={RENEW_STATES}
            onChange={setRenewState}
          />
        }
      >
        <AutoRenewCard
          enabled={renewState !== "off"}
          onToggle={() => {}}
          defaultMethod={
            renewState === "on · card saved" ? SAVED_CARD : undefined
          }
          description={
            renewState === "off"
              ? "Turn on to charge your default payment method automatically one day before expiry."
              : "Renews automatically one day before expiry using your default payment method."
          }
        />
      </Section>

      <Section title="Warnings">
        <DeletionWarning deletingOn={new Date(now + 5 * DAY)} />
        <DeletionWarning deletingOn={new Date(now - 1 * DAY)} />
        <SunsetWarning sunsetOn={new Date(now + 45 * DAY)} />
      </Section>

      <Section title="Payment method rows">
        {METHODS.map((m) => (
          <ProviderMethodRow key={m.name} method={m} onSelect={() => {}} />
        ))}
        <SavedMethodRow method={SAVED_CARD} onSelect={() => {}} />
      </Section>

      <Section title="Payment history table">
        <BillingPaymentsTable rows={PAYMENT_ROWS} />
      </Section>

      <Section
        title="Payment flow"
        control={
          <StateSelect
            value={flowState}
            options={FLOW_STATES}
            onChange={setFlowState}
          />
        }
      >
        <PaymentFlowDemo state={flowState} />
      </Section>
    </div>
  );
}
