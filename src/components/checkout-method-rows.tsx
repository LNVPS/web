import { FormattedMessage, IntlShape, useIntl } from "react-intl";
import { PaymentMethod, SavedPaymentMethod } from "../api";
import { Icon } from "./icon";
import { PaymentOptionRow } from "./checkout";

/**
 * Generic provider methods the checkout renders as "new payment" options. NWC
 * is intentionally excluded: a usable NWC wallet is always a *saved* payment
 * method, so it's listed in the saved-methods section instead of here.
 */
const KNOWN_METHODS = ["lightning", "lnurl", "revolut", "onchain"];

/**
 * Whether a provider method should appear in the list. NWC is only useful once
 * the user has a saved NWC connection, and unknown providers are hidden.
 */
export function shouldShowMethod(
  method: PaymentMethod,
  hasNwc: boolean,
): boolean {
  if (!KNOWN_METHODS.includes(method.name)) return false;
  if (method.name === "nwc" && !hasNwc) return false;
  return true;
}

/**
 * Checkout groups methods by settlement rail so the three bitcoin options
 * read as variants of one choice, not unrelated products. Order = immediacy.
 */
export const BITCOIN_METHODS = ["lightning", "lnurl", "onchain"];

// Human-facing name for each provider, so rows read like choices a person
// recognizes rather than internal method ids.
function methodLabel(intl: IntlShape, name: string): string {
  switch (name) {
    case "lightning":
      return intl.formatMessage({ defaultMessage: "Lightning" });
    case "lnurl":
      return intl.formatMessage({ defaultMessage: "LNURL" });
    case "nwc":
      return intl.formatMessage({ defaultMessage: "Nostr Wallet Connect" });
    case "revolut":
      return intl.formatMessage({ defaultMessage: "Credit or debit card" });
    case "onchain":
      return intl.formatMessage({ defaultMessage: "On-chain Bitcoin" });
    default:
      return name.toUpperCase();
  }
}

// What actually happens when you pick this method — the differentiator the
// bare method names don't communicate.
function methodDescription(intl: IntlShape, m: PaymentMethod): string {
  switch (m.name) {
    case "lightning":
      return intl.formatMessage({
        defaultMessage: "Instant — scan or pay a one-time invoice",
      });
    case "lnurl":
      return intl.formatMessage({
        defaultMessage: "Pay any amount, whenever — time is added pro-rata",
      });
    case "onchain":
      return intl.formatMessage({
        defaultMessage: "Standard BTC transaction — credits after confirmation",
      });
    case "revolut":
      return intl.formatMessage({
        defaultMessage: "Visa or Mastercard, billed via Revolut",
      });
    default:
      return m.currencies.join(", ");
  }
}

// Card-brand / third-party marks must keep their own identity, not the app's
// green accent (recoloring the Revolut logo violates their brand terms). Render
// these monochrome against the panel instead.
const BRAND_ICONS = ["visa", "mastercard", "revolut"];
export function iconColorClass(iconName: string): string {
  return BRAND_ICONS.includes(iconName)
    ? "text-cyber-text-bright pointer-events-none"
    : "text-cyber-primary pointer-events-none";
}

function methodIconName(name: string): string {
  switch (name) {
    case "nwc":
      return "nwc";
    case "revolut":
      return "revolut";
    case "lightning":
    case "lnurl":
      return "zap";
    default:
      return "bitcoin";
  }
}

// Compact fee note shown under the method name, e.g. "1.5% + 30 sats".
function methodFee(intl: IntlShape, m: PaymentMethod): string | undefined {
  if (!(m.processing_fee_rate || m.processing_fee_base)) return undefined;
  const currency = m.processing_fee_currency?.toUpperCase();
  const feeParts: Array<string> = [];
  if (m.processing_fee_rate) {
    feeParts.push(
      intl.formatNumber(m.processing_fee_rate / 100, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    );
  }
  if (m.processing_fee_base) {
    if (currency === "BTC") {
      feeParts.push(
        `${intl.formatNumber(Math.floor(m.processing_fee_base / 1000))} sats`,
      );
    } else {
      feeParts.push(
        intl.formatNumber(m.processing_fee_base / 100, {
          style: "currency",
          currency: currency!,
        }),
      );
    }
  }
  return feeParts.join(" + ");
}

function methodSubtitle(intl: IntlShape, m: PaymentMethod): string {
  const description = methodDescription(intl, m);
  const fee = methodFee(intl, m);
  return fee
    ? `${description} · ${intl.formatMessage(
        { defaultMessage: "{fee} fee" },
        { fee },
      )}`
    : description;
}

/** One selectable provider payment method. */
export function ProviderMethodRow({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  selected?: boolean;
  onSelect: (m: PaymentMethod) => void;
}) {
  const intl = useIntl();
  return (
    <PaymentOptionRow
      icon={
        <Icon
          name={methodIconName(method.name)}
          size={18}
          className={iconColorClass(methodIconName(method.name))}
        />
      }
      title={methodLabel(intl, method.name)}
      subtitle={methodSubtitle(intl, method)}
      selected={selected}
      onSelect={() => onSelect(method)}
    />
  );
}

/** Human details for a saved method (card brand + last4, or wallet name). */
function savedMethodDetails(m: SavedPaymentMethod): {
  icon: string;
  details: string;
} {
  if (m.card_brand) {
    const last4 = m.card_last_four ? `•••• ${m.card_last_four}` : "";
    const brand = m.card_brand.toLowerCase();
    return {
      icon: brand === "visa" ? "visa" : brand === "mastercard" ? "mastercard" : "revolut",
      details: `${m.card_brand} ${last4}`.trim(),
    };
  }
  if (m.provider === "nwc") {
    return { icon: "nwc", details: "Nostr Wallet Connect" };
  }
  return { icon: "bitcoin", details: m.provider.toUpperCase() };
}

/** One saved payment method (card or wallet), styled like a provider method. */
export function SavedMethodRow({
  method,
  selected,
  onSelect,
}: {
  method: SavedPaymentMethod;
  selected?: boolean;
  onSelect: (m: SavedPaymentMethod) => void;
}) {
  const { icon, details } = savedMethodDetails(method);
  const label = method.name?.trim() || details;

  return (
    <PaymentOptionRow
      icon={<Icon name={icon} size={18} className={iconColorClass(icon)} />}
      title={
        <span className="flex items-center gap-2">
          {label}
          {method.is_default && (
            <span className="rounded-sm bg-cyber-primary/20 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-cyber-primary">
              <FormattedMessage defaultMessage="Default" />
            </span>
          )}
        </span>
      }
      subtitle={method.name?.trim() ? details : undefined}
      selected={selected}
      onSelect={() => onSelect(method)}
    />
  );
}
