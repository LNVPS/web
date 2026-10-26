import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import {
  AccountDetail,
  Price,
  VmCustomTemplateParams,
  VmInstance,
  VmUpgradeQuote,
} from "../api";
import { accountTaxRate, processingFeeEstimate } from "../utils";
import { isHourly } from "../utils/hourly";
import { AsyncButton } from "../components/button";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import PaymentFlow from "../components/payment-flow";
import { vmUpgradeSource } from "../components/payment-sources";
import CostLabel, { CostAmount } from "../components/cost";
import Seo from "../components/seo";
import SpecSheet from "../components/spec-sheet";
import ResourceSlider from "../components/resource-slider";
import { Card, CardBody, CardTitle } from "../components/card";
import { StatusPill } from "../components/billing";
import { FilterButton } from "../components/button-filter";
import { formatTransferAllowance } from "../utils/bandwidth";
import { formatPortSpeed } from "../utils/plan-limits";
import { NETWORK_STEP_MBPS, TRANSFER_STEP_GB } from "../utils/order-addons";
import {
  UpgradeBounds,
  UpgradeSelection,
  currentSelection,
  upgradeBounds,
  upgradeEffect,
  upgradeRequest,
} from "../utils/upgrade";

const UPGRADE_METHODS = ["lightning", "revolut", "paypal", "stripe"];

function Line({
  label,
  children,
  strong,
}: {
  label: ReactNode;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex items-baseline justify-between gap-4 text-cyber-text-bright"
          : "flex items-baseline justify-between gap-4 text-sm text-cyber-text"
      }
    >
      <span>{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

function Change({ from, to }: { from: string; to: string }) {
  return (
    <span className="whitespace-nowrap">
      {from} <span className="text-cyber-muted">→</span>{" "}
      <span className="text-cyber-primary">{to}</span>
    </span>
  );
}

function ResizeCard({
  bounds,
  selection,
  onChange,
  effect,
}: {
  bounds: UpgradeBounds;
  selection: UpgradeSelection;
  onChange: (s: UpgradeSelection) => void;
  effect: ReturnType<typeof upgradeEffect>;
}) {
  const start = currentSelection(bounds);
  const pairs: Array<[string, string]> = [
    [`${start.cpu} vCPU`, `${selection.cpu} vCPU`],
    [`${start.memoryGb} GB`, `${selection.memoryGb} GB`],
    [`${start.diskGb} GB disk`, `${selection.diskGb} GB disk`],
  ];
  if (start.transferGb !== undefined && selection.transferGb !== undefined) {
    pairs.push([
      `${formatTransferAllowance(start.transferGb)}/mo`,
      `${formatTransferAllowance(selection.transferGb)}/mo`,
    ]);
  }
  if (start.networkMbps !== undefined && selection.networkMbps !== undefined) {
    pairs.push([
      formatPortSpeed(start.networkMbps) ?? "",
      formatPortSpeed(selection.networkMbps) ?? "",
    ]);
  }
  const changes = pairs.filter(([from, to]) => from !== to);

  return (
    <Card>
      <CardTitle
        right={
          effect === "restart" ? (
            <StatusPill tone="warning">
              <FormattedMessage defaultMessage="Restarts the VM" />
            </StatusPill>
          ) : effect === "live" ? (
            <StatusPill tone="primary">
              <FormattedMessage defaultMessage="No restart" />
            </StatusPill>
          ) : undefined
        }
      >
        <FormattedMessage defaultMessage="New size" />
      </CardTitle>
      <CardBody className="flex flex-col gap-3 px-4 py-4">
        <ResourceSlider
          label={<FormattedMessage defaultMessage="CPU cores" />}
          unit="vCPU"
          value={selection.cpu}
          min={bounds.cpu.min}
          max={bounds.cpu.max}
          onChange={(cpu) => onChange({ ...selection, cpu })}
        />
        <ResourceSlider
          label={<FormattedMessage defaultMessage="Memory" />}
          unit="GB"
          value={selection.memoryGb}
          min={bounds.memoryGb.min}
          max={bounds.memoryGb.max}
          onChange={(memoryGb) => onChange({ ...selection, memoryGb })}
        />
        <ResourceSlider
          label={<FormattedMessage defaultMessage="Storage" />}
          unit="GB"
          value={selection.diskGb}
          min={bounds.diskGb.min}
          max={bounds.diskGb.max}
          onChange={(diskGb) => onChange({ ...selection, diskGb })}
        />
        {bounds.transferGb && selection.transferGb !== undefined && (
          <ResourceSlider
            label={<FormattedMessage defaultMessage="Transfer" />}
            unit="GB/mo"
            scaledUnit={{ unit: "TB/mo", factor: 1000 }}
            value={selection.transferGb}
            min={bounds.transferGb.min}
            max={bounds.transferGb.max}
            step={TRANSFER_STEP_GB}
            onChange={(transferGb) => onChange({ ...selection, transferGb })}
          />
        )}
        {bounds.networkMbps && selection.networkMbps !== undefined && (
          <ResourceSlider
            label={<FormattedMessage defaultMessage="Port speed" />}
            unit="Mbps"
            value={selection.networkMbps}
            min={bounds.networkMbps.min}
            max={bounds.networkMbps.max}
            step={NETWORK_STEP_MBPS}
            onChange={(networkMbps) => onChange({ ...selection, networkMbps })}
          />
        )}
      </CardBody>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-cyber-border bg-cyber-panel-light px-4 py-2.5 font-mono text-xs text-cyber-text">
        {changes.length > 0 ? (
          changes.map(([from, to]) => <Change key={from} from={from} to={to} />)
        ) : (
          <span className="text-cyber-muted">
            <FormattedMessage defaultMessage="Move a slider to pick the new size." />
          </span>
        )}
      </div>
    </Card>
  );
}

function QuoteCard({
  quote,
  loading,
  error,
  current,
  tax,
  fee,
  taxRate,
  methods,
  method,
  onMethod,
  effect,
  onPay,
  hourly,
}: {
  /** Hourly: paid from account credit, so no payment method to choose. */
  hourly?: boolean;
  quote?: VmUpgradeQuote;
  loading: boolean;
  error?: string;
  current: ReactNode;
  tax: number;
  fee: number;
  taxRate: number;
  methods: Array<string>;
  method: string;
  onMethod: (m: string) => void;
  effect: ReturnType<typeof upgradeEffect>;
  onPay: () => void;
}) {
  const currency = quote?.cost_difference.currency;
  const money = (amount: number) =>
    currency && (
      <CostAmount cost={{ currency, amount } as Price} converted={false} />
    );
  const net = quote?.cost_difference.amount ?? 0;
  const creditUsed = quote?.credit?.amount ?? 0;

  return (
    <Card>
      <CardTitle
        right={
          loading && (
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-muted">
              <FormattedMessage defaultMessage="Pricing…" />
            </span>
          )
        }
      >
        <FormattedMessage defaultMessage="Payment" />
      </CardTitle>
      <CardBody className="flex flex-col gap-4 px-4 py-4">
        {!hourly && methods.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <FilterButton
                key={m}
                active={m === method}
                onClick={() => onMethod(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </FilterButton>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-sm border border-cyber-danger/50 bg-cyber-danger/10 px-3 py-2 text-sm text-cyber-danger">
            {error}
          </div>
        )}

        {quote ? (
          <div className="flex flex-col gap-1.5">
            <Line
              label={
                <FormattedMessage defaultMessage="New size for the rest of this period" />
              }
            >
              {money(net + quote.discount.amount)}
            </Line>
            <Line
              label={
                <FormattedMessage defaultMessage="Credit for the time already paid" />
              }
            >
              <span className="text-cyber-primary">
                −{money(quote.discount.amount)}
              </span>
            </Line>
            <Line
              label={
                <FormattedMessage
                  defaultMessage="VAT ({rate})"
                  values={{
                    rate: `${(taxRate * 100).toFixed((taxRate * 100) % 1 === 0 ? 0 : 1)}%`,
                  }}
                />
              }
            >
              {money(tax)}
            </Line>
            {fee > 0 && (
              <Line
                label={<FormattedMessage defaultMessage="Processing fee" />}
              >
                {money(fee)}
              </Line>
            )}
            {creditUsed > 0 && (
              <Line
                label={<FormattedMessage defaultMessage="Account credit" />}
              >
                <span className="text-cyber-primary">−{money(creditUsed)}</span>
              </Line>
            )}
            <div className="my-1 border-t border-cyber-border" />
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
                <FormattedMessage defaultMessage="Due now" />
              </span>
              <span className="text-2xl leading-none text-cyber-text-bright tabular-nums">
                {money(Math.max(0, net + tax + fee - creditUsed))}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm text-cyber-text">
              <span>
                {hourly ? (
                  <FormattedMessage defaultMessage="Then per hour" />
                ) : (
                  <FormattedMessage defaultMessage="Then per month" />
                )}
              </span>
              <span className="tabular-nums">
                <CostAmount cost={quote.new_renewal_cost} converted={false} />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-xs text-cyber-muted">
              <span>
                <FormattedMessage defaultMessage="Currently" />
              </span>
              <span className="tabular-nums">{current}</span>
            </div>
          </div>
        ) : (
          !error && (
            <p className="m-0 text-sm text-cyber-muted">
              <FormattedMessage defaultMessage="The price appears here once you pick a bigger size. You pay the difference for what's left of this billing period." />
            </p>
          )
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-cyber-muted">
            {effect === "restart" ? (
              <FormattedMessage defaultMessage="The VM restarts once the payment confirms, to apply the new CPU, memory or disk." />
            ) : effect === "live" ? (
              <FormattedMessage defaultMessage="Bandwidth changes apply as soon as the payment confirms, without a restart." />
            ) : null}
          </span>
          <AsyncButton
            className="sm:w-56"
            disabled={!quote || loading}
            onClick={onPay}
          >
            <FormattedMessage defaultMessage="Pay and upgrade" />
          </AsyncButton>
        </div>
      </CardBody>
    </Card>
  );
}

export default function VmUpgradePage() {
  const location = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const { data: paymentMethods } = usePaymentMethods();
  const [state] = useState<VmInstance | undefined>(location?.state);
  const [plan, setPlan] = useState<VmCustomTemplateParams>();
  const [planError, setPlanError] = useState<string>();
  const [selection, setSelection] = useState<UpgradeSelection>();
  const [quote, setQuote] = useState<VmUpgradeQuote>();
  const [quoteError, setQuoteError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [account, setAccount] = useState<AccountDetail>();
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);

  const upgradeMethods = useMemo(
    () =>
      (paymentMethods ?? []).filter((m) => UPGRADE_METHODS.includes(m.name)),
    [paymentMethods],
  );

  useEffect(() => {
    if (selectedMethod || upgradeMethods.length === 0) return;
    const match = upgradeMethods.find((m) =>
      (m.currencies as Array<string>).includes(login?.currency ?? ""),
    );
    setSelectedMethod((match ?? upgradeMethods[0]).name);
  }, [selectedMethod, upgradeMethods, login?.currency]);

  useEffect(() => {
    login?.api
      ?.getAccount()
      .then(setAccount)
      .catch((e) => console.error("Failed to load account:", e));
  }, [login?.api]);

  const vmId = state?.id;
  useEffect(() => {
    if (!login?.api || vmId === undefined) return;
    login.api
      .getVmUpgradeOptions(vmId)
      .then(setPlan)
      .catch((e) => setPlanError(e instanceof Error ? e.message : String(e)));
  }, [login?.api, vmId]);

  const bounds = useMemo(
    () => (state && plan ? upgradeBounds(state.template, plan) : undefined),
    [state, plan],
  );
  useEffect(() => {
    if (bounds) setSelection(currentSelection(bounds));
  }, [bounds]);

  const request = useMemo(
    () => (state && selection ? upgradeRequest(state.template, selection) : {}),
    [state, selection],
  );
  const effect = upgradeEffect(request);
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    setQuoteError(undefined);
    if (!login?.api || vmId === undefined || effect === "none") {
      setQuote(undefined);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      login.api
        .getVmUpgradeQuote(
          vmId,
          JSON.parse(requestKey),
          selectedMethod || undefined,
        )
        .then(setQuote)
        .catch((e) => {
          setQuote(undefined);
          setQuoteError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => setLoading(false));
    }, 500);
    return () => {
      clearTimeout(t);
      setLoading(false);
    };
  }, [login?.api, vmId, requestKey, selectedMethod, effect]);

  if (!state) {
    return (
      <h2>
        <FormattedMessage defaultMessage="No VM selected" />
      </h2>
    );
  }

  const subscriptionId = state.subscription_id;
  const hourly = isHourly(state.template.cost_plan.interval_type);
  if (showPaymentFlow && quote && login?.api) {
    if (subscriptionId === undefined) {
      return (
        <div className="rounded-sm bg-cyber-danger/20 p-4 text-sm text-cyber-danger">
          <FormattedMessage defaultMessage="Couldn't find a subscription to bill this upgrade to." />
        </div>
      );
    }
    return (
      <PaymentFlow
        title={
          <FormattedMessage
            defaultMessage="Upgrade VPS #{id}"
            values={{ id: state.id }}
          />
        }
        source={vmUpgradeSource(
          login.api,
          state,
          request,
          subscriptionId,
          hourly
            ? {
                due: {
                  currency: quote.cost_difference.currency,
                  amount:
                    quote.cost_difference.amount +
                    (quote.tax?.amount ??
                      Math.round(
                        quote.cost_difference.amount *
                          accountTaxRate(
                            account,
                            state.template.region?.company_id,
                          ),
                      )),
                },
              }
            : undefined,
        )}
        onPaymentComplete={() => {
          setShowPaymentFlow(false);
          setQuote(undefined);
        }}
        onCancel={() => setShowPaymentFlow(false)}
      />
    );
  }

  const taxRate = accountTaxRate(account, state.template.region?.company_id);
  const net = quote?.cost_difference.amount ?? 0;
  const tax = quote?.tax?.amount ?? Math.round(net * taxRate);
  const method = upgradeMethods.find((m) => m.name === selectedMethod);
  const fee =
    quote?.processing_fee?.amount ??
    (quote && method
      ? processingFeeEstimate(method, quote.cost_difference.currency, net + tax)
      : 0);

  return (
    <div className="flex flex-col gap-6">
      <Seo noindex={true} />
      <div className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-muted">
          <FormattedMessage defaultMessage="Upgrade" />
        </span>
        <h1 className="m-0 text-2xl text-cyber-text-bright">
          <FormattedMessage
            defaultMessage="Resize VPS #{id}"
            values={{ id: state.id }}
          />
        </h1>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-text">
          <FormattedMessage defaultMessage="Now" />
        </span>
        <SpecSheet template={state.template} />
      </div>

      {planError ? (
        <Card>
          <CardBody className="px-4 py-3 text-sm text-cyber-text">
            <FormattedMessage defaultMessage="This VM can't be resized online right now. Contact support and we'll sort it out." />
          </CardBody>
        </Card>
      ) : bounds && selection ? (
        <>
          <ResizeCard
            bounds={bounds}
            selection={selection}
            onChange={setSelection}
            effect={effect}
          />
          <QuoteCard
            quote={quote}
            loading={loading}
            error={quoteError}
            current={
              <CostLabel
                cost={state.template.cost_plan}
                companyId={state.template.region?.company_id}
              />
            }
            tax={tax}
            fee={fee}
            taxRate={taxRate}
            methods={upgradeMethods.map((m) => m.name)}
            method={selectedMethod}
            onMethod={setSelectedMethod}
            effect={effect}
            onPay={() => setShowPaymentFlow(true)}
            hourly={hourly}
          />
        </>
      ) : (
        <span className="text-sm text-cyber-muted">
          <FormattedMessage defaultMessage="Loading…" />
        </span>
      )}
    </div>
  );
}
