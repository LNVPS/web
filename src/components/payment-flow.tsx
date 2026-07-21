import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  AccountDetail,
  PaymentMethod,
  SavedPaymentMethod,
  VmPayment,
} from "../api";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import { CostAmount, IntervalSuffix } from "./cost";
import { RevolutPayWidget } from "./revolut";
import type { Mode } from "@revolut/checkout";
import QrCode from "./qr";
import { LNURL } from "@snort/shared";
import Spinner from "./spinner";
import { AsyncButton } from "./button";
import { FormattedMessage, useIntl } from "react-intl";
import { accountTaxRate, processingFeeEstimate } from "../utils";
import VpsPayment from "./vps-payment";
import OnChainPayment from "./onchain-payment";
import {
  SectionLabel,
  ReceiptSummary,
  CheckoutHeader,
  type ReceiptLine,
} from "./checkout";
import {
  BITCOIN_METHODS,
  ProviderMethodRow,
  SavedMethodRow,
  shouldShowMethod,
} from "./checkout-method-rows";
import { PaymentSource } from "./payment-sources";

interface PaymentFlowProps {
  /** Heading shown at every step, e.g. "Renew VPS #12". */
  title: ReactNode;
  /** How to create and poll the payment (see PaymentSource). */
  source: PaymentSource;
  /** Preselect a method and create the payment immediately (skip selection). */
  presetMethod?: string;
  /**
   * Resume an existing unpaid payment: open directly at the payment screen
   * (QR / widget) instead of creating a new payment. Backing out leaves the
   * flow entirely.
   */
  initialPayment?: VmPayment;
  onPaymentComplete: () => void;
  onCancel?: () => void;
}

/**
 * One checkout flow for VMs, subscriptions, upgrades and IP space. The only
 * difference between them is the {@link PaymentSource}; the method selection,
 * up-front receipt, Lightning/card widgets and polling live here.
 */
export default function PaymentFlow({
  title,
  source,
  presetMethod,
  initialPayment,
  onPaymentComplete,
  onCancel,
}: PaymentFlowProps) {
  const login = useLogin();
  const { formatNumber } = useIntl();
  const { data: methods, loading: methodsLoading } = usePaymentMethods();

  const [payment, setPayment] = useState<VmPayment | undefined>(
    initialPayment,
  );
  const [showLnurl, setShowLnurl] = useState(false);
  // The chosen payment option. Selecting is instant; the charge happens from
  // the shared Pay button so the summary can reflect the method's fees first.
  const [selection, setSelection] = useState<
    { kind: "method"; name: string } | { kind: "saved"; id: number }
  >();
  // Set when charging a saved method off-session: the backend charges it
  // server-side, so there's no interactive widget even if the returned payment
  // still carries a revolut token.
  const [savedCharge, setSavedCharge] = useState(false);
  const [error, setError] = useState<string>();
  const [account, setAccount] = useState<AccountDetail>();
  const [hasNwc, setHasNwc] = useState(false);
  // Every enabled saved payment method (cards and NWC wallets alike).
  const [savedMethods, setSavedMethods] = useState<Array<SavedPaymentMethod>>(
    [],
  );
  // The account's default saved payment method, used to preselect it.
  const [defaultSaved, setDefaultSaved] = useState<SavedPaymentMethod>();
  // Whether the saved payment methods have finished loading, so the default
  // selection can wait for them and prefer a saved method.
  const [savedMethodsLoaded, setSavedMethodsLoaded] = useState(false);
  // Default to saving the card for future payments; user can opt out on the
  // card screen.
  const [saveCard, setSaveCard] = useState(true);
  const saveCardRef = useRef(saveCard);
  saveCardRef.current = saveCard;
  const [intervals, setIntervals] = useState(1);
  const intervalsRef = useRef(intervals);
  intervalsRef.current = intervals;

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .getAccount()
      .then(setAccount)
      .catch((e) => console.error("Failed to load account:", e));
    login.api
      .listPaymentMethods()
      .then((pms) => {
        setHasNwc(pms.some((x) => x.provider === "nwc" && x.enabled));
        setSavedMethods(pms.filter((x) => x.enabled));
        setDefaultSaved(pms.find((x) => x.is_default && x.enabled));
      })
      .catch((e) => console.error("Failed to load payment methods:", e))
      .finally(() => setSavedMethodsLoaded(true));
  }, [login?.api]);

  const createPayment = useCallback(
    async function (
      method: string,
      opts?: { saveCard?: boolean; paymentMethodId?: number },
    ) {
      setError(undefined);
      setSavedCharge(opts?.paymentMethodId !== undefined);
      try {
        const result = await source.createPayment(method, {
          saveCard: opts?.saveCard,
          paymentMethodId: opts?.paymentMethodId,
          intervals: intervalsRef.current,
        });
        setPayment(result);
      } catch (e) {
        if (e instanceof Error) setError(e.message);
      }
    },
    [source],
  );

  const handlePaymentComplete = useCallback(() => {
    setPayment(undefined);
    setShowLnurl(false);
    setSavedCharge(false);
    onPaymentComplete();
  }, [onPaymentComplete]);

  // When a method is preselected there is no in-flow selection screen to return
  // to, so backing out of the payment must leave the flow entirely. Otherwise
  // clearing the payment just re-triggers the preset auto-create below and traps
  // the user on the payment screen.
  const leavePayment = useCallback(() => {
    if (presetMethod || initialPayment) {
      onCancel?.();
      return;
    }
    setPayment(undefined);
    setSavedCharge(false);
  }, [presetMethod, initialPayment, onCancel]);

  // Off-session (saved-card) and other non-interactive charges have no widget:
  // poll until settled.
  const isOffSession =
    !!payment &&
    (savedCharge ||
      (!("lightning" in payment.data) &&
        !("revolut" in payment.data) &&
        !("onchain" in payment.data)));
  useEffect(() => {
    if (!payment || !isOffSession) return;
    const tx = setInterval(async () => {
      try {
        if (await source.pollPaid(payment.id)) {
          clearInterval(tx);
          handlePaymentComplete();
        }
      } catch (e) {
        console.error(e);
      }
    }, 2_000);
    return () => clearInterval(tx);
  }, [payment, isOffSession, source, handlePaymentComplete]);

  // Auto-create the payment for a preselected method exactly once. Guarding
  // with a ref (instead of re-running whenever `payment` clears) means backing
  // out of the payment doesn't immediately recreate it.
  const presetAttempted = useRef(false);
  useEffect(() => {
    if (presetMethod && !presetAttempted.current) {
      presetAttempted.current = true;
      createPayment(presetMethod);
    }
  }, [presetMethod, createPayment]);

  // Default the selection so the summary total and Pay button are meaningful
  // right away. Prefer the user's saved (default) card, falling back to the
  // first available provider method. Wait for saved methods to load first so we
  // don't briefly default to a provider and then not switch.
  useEffect(() => {
    if (selection || methodsLoading || !savedMethodsLoaded) return;

    // 1. A saved payment method (the account default, else the first saved).
    if (source.allowSavedMethods !== false && savedMethods.length > 0) {
      const chosen =
        defaultSaved && savedMethods.some((m) => m.id === defaultSaved.id)
          ? defaultSaved
          : savedMethods[0];
      setSelection({ kind: "saved", id: chosen.id });
      return;
    }

    // 2. First available provider method.
    const first = (methods ?? [])
      .filter((m) => shouldShowMethod(m, hasNwc))
      .filter((m) => m.name !== "lnurl" || !!source.lnurl)[0];
    if (first) setSelection({ kind: "method", name: first.name });
  }, [
    selection,
    methods,
    methodsLoading,
    hasNwc,
    source.lnurl,
    source.allowSavedMethods,
    savedMethods,
    defaultSaved,
    savedMethodsLoaded,
  ]);

  // Charge whatever is currently selected. LNURL just reveals its QR.
  async function paySelected() {
    if (!selection) return;
    if (selection.kind === "saved") {
      const m = savedMethods.find((x) => x.id === selection.id);
      // Saved NWC wallets are charged via method=nwc (the backend picks the
      // user's saved NWC); method=saved is Revolut-only server-side.
      if (m?.provider === "nwc") {
        await createPayment("nwc");
      } else {
        await createPayment("saved", { paymentMethodId: selection.id });
      }
      return;
    }
    if (selection.name === "lnurl") {
      setShowLnurl(true);
      return;
    }
    await createPayment(
      selection.name,
      selection.name === "revolut"
        ? { saveCard: saveCardRef.current }
        : undefined,
    );
  }

  // --- Loading / error --------------------------------------------------
  if (methodsLoading) {
    return (
      <div className="py-8 text-center text-cyber-muted">
        <FormattedMessage defaultMessage="Loading payment methods…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <CheckoutHeader title={title} onBack={onCancel} />
        <div className="rounded-sm bg-cyber-danger/20 p-4 text-cyber-danger">
          <strong>
            <FormattedMessage defaultMessage="Payment failed" />
          </strong>
          <div className="text-sm">{error}</div>
        </div>
        <button
          onClick={() => setError(undefined)}
          className="self-start text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
        >
          <FormattedMessage defaultMessage="Try again" />
        </button>
      </div>
    );
  }

  // --- Payment created: process it -------------------------------------
  if (payment) {
    const lines: Array<ReceiptLine> = [
      {
        label: <FormattedMessage defaultMessage="Subtotal" />,
        cost: { currency: payment.currency, amount: payment.amount },
      },
    ];
    if (payment.tax > 0) {
      lines.push({
        label: <FormattedMessage defaultMessage="VAT" />,
        cost: { currency: payment.currency, amount: payment.tax },
      });
    }
    if (payment.processing_fee > 0) {
      lines.push({
        label: <FormattedMessage defaultMessage="Processing fee" />,
        cost: { currency: payment.currency, amount: payment.processing_fee },
      });
    }
    const total = {
      currency: payment.currency,
      amount: payment.amount + payment.tax + payment.processing_fee,
    };

    return (
      <div className="flex flex-col gap-5">
        <CheckoutHeader title={title} onBack={leavePayment} />

        {"lightning" in payment.data ? (
          <VpsPayment payment={payment} onPaid={handlePaymentComplete} />
        ) : "onchain" in payment.data ? (
          <OnChainPayment
            payment={payment}
            pollPaid={source.pollPaid}
            pollDetected={source.pollDetected}
            onPaid={handlePaymentComplete}
            // On-chain confirmation takes 10+ minutes and is credited
            // server-side, so let the user leave instead of watching a
            // spinner. The pending payment shows up in billing history.
            onDone={onCancel ?? leavePayment}
          />
        ) : "revolut" in payment.data && !savedCharge ? (
          <div className="flex flex-col gap-4">
            <ReceiptSummary
              title={<FormattedMessage defaultMessage="Invoice" />}
              lines={lines}
              total={total}
            />
            <RevolutPayWidget
              mode={import.meta.env.VITE_REVOLUT_MODE as Mode | undefined}
              payment={payment}
              account={account}
              onPaid={handlePaymentComplete}
              saveCard={saveCard}
              onSaveCardChange={async (v) => {
                setSaveCard(v);
                await createPayment("revolut", { saveCard: v });
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ReceiptSummary
              title={<FormattedMessage defaultMessage="Invoice" />}
              lines={lines}
              total={total}
            />
            <div className="flex items-center justify-center gap-3 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 text-sm text-cyber-muted">
              <Spinner />
              {savedCharge ? (
                <FormattedMessage defaultMessage="Charging your saved payment method. This is applied automatically once it confirms." />
              ) : (
                <FormattedMessage defaultMessage="Waiting for payment. This is applied automatically once it confirms." />
              )}
            </div>
          </div>
        )}

        <button
          onClick={leavePayment}
          className="self-start text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
        >
          <FormattedMessage defaultMessage="Cancel payment" />
        </button>
      </div>
    );
  }

  // --- Lightning address (LNURL) ---------------------------------------
  if (showLnurl && source.lnurl) {
    const lud16 = source.lnurl.lud16;
    return (
      <div className="flex flex-col gap-5">
        <CheckoutHeader
          title={<FormattedMessage defaultMessage="LNURL" />}
          onBack={() => setShowLnurl(false)}
        />
        <div className="flex flex-col items-center gap-4 rounded-sm border border-cyber-border bg-cyber-panel p-4">
          <QrCode
            data={`lightning:${new LNURL(lud16).lnurl}`}
            width={512}
            height={512}
            avatar="/logo.jpg"
            className="cursor-pointer rounded-sm overflow-hidden"
          />
          <div className="select-all break-all text-center text-sm text-cyber-text">
            {lud16}
          </div>
          <div className="text-center text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Pay from any Lightning wallet to top up this subscription." />
          </div>
        </div>
      </div>
    );
  }

  // --- Preselected method: creating payment ----------------------------
  if (presetMethod) {
    return (
      <div className="flex flex-col gap-5">
        <CheckoutHeader title={title} />
        <div className="flex items-center justify-center gap-3 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-6 text-sm text-cyber-muted">
          <Spinner />
          <FormattedMessage defaultMessage="Creating payment…" />
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="self-start text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
          >
            <FormattedMessage defaultMessage="Cancel" />
          </button>
        )}
      </div>
    );
  }

  // --- Method selection (checkout) -------------------------------------
  const duration = source.duration;
  // Sensible renewal lengths per billing cadence — yearly plans renew one
  // year at a time (no slider), nobody needs to prepay 12 years ahead.
  const baseSteps =
    duration?.intervalType === "day"
      ? [1, 7, 14, 30]
      : duration?.intervalType === "year"
        ? [1]
        : [1, 3, 6, 12];
  // Cap to what the server will accept (prepay window / host sunset), always
  // leaving at least the single-cycle option.
  const maxIntervals = duration?.maxIntervals;
  const steps =
    maxIntervals !== undefined
      ? baseSteps.filter((s, i) => s <= maxIntervals || i === 0)
      : baseSteps;
  const currentIndex = Math.max(0, steps.indexOf(intervals));

  // A method is rejected server-side when the gross total (net + tax + its own
  // processing fee) is below its configured minimum. Mirror that here so we
  // never offer a method the payment would bounce on. We can only compare when
  // the minimum is quoted in the order currency; otherwise defer to the server.
  function meetsMinimum(m: PaymentMethod): boolean {
    if (m.min_amount === undefined || !duration) return true;
    if (m.min_amount_currency && m.min_amount_currency !== duration.cost.currency)
      return true;
    const subtotal = duration.cost.amount * intervals;
    const tax = Math.round(
      subtotal * accountTaxRate(account, duration.taxCompanyId),
    );
    const fee = processingFeeEstimate(m, duration.cost.currency, subtotal + tax);
    return subtotal + tax + fee >= m.min_amount;
  }

  const providerRows = (methods ?? [])
    .filter((m) => shouldShowMethod(m, hasNwc))
    // The LNURL row only makes sense when the source offers a Lightning address.
    .filter((m) => m.name !== "lnurl" || !!source.lnurl)
    // Drop methods whose minimum the order can't meet.
    .filter(meetsMinimum);

  // Group by settlement rail so the three bitcoin options read as variants of
  // one choice; within the group, fastest first.
  const bitcoinRows = providerRows
    .filter((m) => BITCOIN_METHODS.includes(m.name))
    .sort(
      (a, b) =>
        BITCOIN_METHODS.indexOf(a.name) - BITCOIN_METHODS.indexOf(b.name),
    );
  const cardRows = providerRows.filter(
    (m) => !BITCOIN_METHODS.includes(m.name),
  );

  // The provider method whose fee config applies to the current selection.
  // A saved revolut method bills through revolut; a saved NWC wallet as lightning.
  const selectedSaved =
    selection?.kind === "saved"
      ? savedMethods.find((m) => m.id === selection.id)
      : undefined;
  const selectedFeeMethod =
    selection?.kind === "saved"
      ? methods?.find(
          (m) =>
            m.name === (selectedSaved?.provider === "nwc" ? "lightning" : "revolut"),
        )
      : selection
        ? methods?.find((m) => m.name === selection.name)
        : undefined;
  const lnurlSelected =
    selection?.kind === "method" && selection.name === "lnurl";

  // Build the order summary, folding in the selected method's processing fee.
  let receipt: ReactNode = null;
  let orderTotal: { currency: string; amount: number } | undefined;
  if (duration) {
    const currency = duration.cost.currency;
    const taxRate = accountTaxRate(account, duration.taxCompanyId);
    const subtotal = duration.cost.amount * intervals;
    const taxAmount = Math.round(subtotal * taxRate);
    const fee = selectedFeeMethod
      ? processingFeeEstimate(selectedFeeMethod, currency, subtotal + taxAmount)
      : 0;
    orderTotal = { currency, amount: subtotal + taxAmount + fee };

    const receiptLines: Array<ReceiptLine> = [
      {
        label: <FormattedMessage defaultMessage="Subtotal" />,
        cost: { currency, amount: subtotal },
      },
      {
        label: (
          <FormattedMessage
            defaultMessage="VAT ({rate})"
            values={{
              rate: formatNumber(taxRate, {
                style: "percent",
                maximumFractionDigits: 1,
              }),
            }}
          />
        ),
        cost: { currency, amount: taxAmount },
      },
    ];
    if (fee > 0) {
      receiptLines.push({
        label: <FormattedMessage defaultMessage="Processing fee" />,
        cost: { currency, amount: fee },
      });
    }
    receipt = (
      <ReceiptSummary
        title={<FormattedMessage defaultMessage="Order summary" />}
        subtitle={
          <FormattedMessage
            defaultMessage="{n} {unit}"
            values={{
              n: intervals,
              unit: (
                <IntervalSuffix interval={duration.intervalType} n={intervals} />
              ),
            }}
          />
        }
        lines={receiptLines}
        total={orderTotal}
        note={
          account?.tax === undefined ? (
            <FormattedMessage defaultMessage="The exact tax is confirmed when you pay." />
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckoutHeader title={title} onBack={onCancel} />

      {duration && (
        <div className="flex flex-col gap-3">
          <SectionLabel>
            <FormattedMessage defaultMessage="Duration" />
          </SectionLabel>
          <div className="flex items-baseline justify-between">
            <span className="text-lg text-cyber-text-bright">
              {intervals}{" "}
              <IntervalSuffix interval={duration.intervalType} n={intervals} />
            </span>
            <CostAmount
              cost={{
                ...duration.cost,
                interval_type: duration.intervalType,
              }}
              converted={false}
              className="text-xs text-cyber-muted"
            />
          </div>
          {steps.length > 1 && (
            <>
              <input
                type="range"
                min={0}
                max={steps.length - 1}
                step={1}
                value={currentIndex}
                onChange={(e) => setIntervals(steps[e.target.valueAsNumber])}
              />
              <div className="flex justify-between text-xs text-cyber-muted">
                {steps.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {receipt}

      {source.allowSavedMethods !== false && savedMethods.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel>
            <FormattedMessage defaultMessage="Saved methods" />
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {savedMethods.map((m) => (
              <SavedMethodRow
                key={m.id}
                method={m}
                selected={
                  selection?.kind === "saved" && selection.id === m.id
                }
                onSelect={(x) => setSelection({ kind: "saved", id: x.id })}
              />
            ))}
          </div>
        </div>
      )}

      {bitcoinRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel>
            <FormattedMessage defaultMessage="Pay with Bitcoin" />
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {bitcoinRows.map((method) => (
              <ProviderMethodRow
                key={method.name}
                method={method}
                selected={
                  selection?.kind === "method" && selection.name === method.name
                }
                onSelect={(m) => setSelection({ kind: "method", name: m.name })}
              />
            ))}
          </div>
        </div>
      )}

      {cardRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel>
            <FormattedMessage defaultMessage="Pay by card" />
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {cardRows.map((method) => (
              <ProviderMethodRow
                key={method.name}
                method={method}
                selected={
                  selection?.kind === "method" && selection.name === method.name
                }
                onSelect={(m) => setSelection({ kind: "method", name: m.name })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AsyncButton
          onClick={paySelected}
          disabled={!selection}
          className="w-full justify-center bg-cyber-primary/20 text-base"
        >
          {lnurlSelected ? (
            <FormattedMessage defaultMessage="Show LNURL" />
          ) : orderTotal ? (
            <FormattedMessage
              defaultMessage="Pay {amount}"
              values={{
                amount: <CostAmount cost={orderTotal} converted={false} />,
              }}
            />
          ) : (
            <FormattedMessage defaultMessage="Pay" />
          )}
        </AsyncButton>
        {onCancel && (
          <button
            onClick={onCancel}
            className="self-center text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
          >
            <FormattedMessage defaultMessage="Cancel" />
          </button>
        )}
      </div>
    </div>
  );
}
