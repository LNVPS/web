import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  AccountDetail,
  LNVpsApi,
  VmCustomTemplateParams,
  VmInstance,
  VmUpgradeRequest,
  VmUpgradeQuote,
} from "../api";
import { ApiUrl } from "../const";
import {
  bandwidthUpgradeRange,
  formatTransferAllowance,
  upgradePlan,
  withBandwidthUpgrade,
} from "../utils/bandwidth";
import { formatPortSpeed } from "../utils/plan-limits";
import { NETWORK_STEP_MBPS, TRANSFER_STEP_GB } from "../utils/order-addons";
import { accountTaxRate, processingFeeEstimate } from "../utils";
import { AsyncButton } from "../components/button";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import PaymentFlow from "../components/payment-flow";
import { vmUpgradeSource } from "../components/payment-sources";
import { CostAmount } from "../components/cost";
import { FormattedMessage } from "react-intl";
import Seo from "../components/seo";

export default function VmUpgradePage() {
  const location = useLocation() as { state?: VmInstance };
  const login = useLogin();
  // Payment methods are only used to derive a default currency for the upgrade
  // quote; the actual method is chosen in the payment flow itself.
  const { data: paymentMethods } = usePaymentMethods();
  const [state] = useState<VmInstance | undefined>(location?.state);
  const [error, setError] = useState<string>();
  const [quote, setQuote] = useState<VmUpgradeQuote>();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [account, setAccount] = useState<AccountDetail>();
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  // Upgrade payments live on the VM's subscription; needed to poll settlement.
  const subscriptionId = state?.subscription_id;

  const [plans, setPlans] = useState<Array<VmCustomTemplateParams>>([]);
  useEffect(() => {
    new LNVpsApi(ApiUrl ?? "", undefined)
      .listOffers()
      .then((o) => setPlans(o.custom_template ?? []))
      .catch((e) => console.error("Failed to load plans:", e));
  }, []);

  useEffect(() => {
    login?.api
      ?.getAccount()
      .then(setAccount)
      .catch((e) => console.error("Failed to load account:", e));
  }, [login?.api]);

  // Only methods the upgrade endpoint can charge (Lightning, cards). NWC,
  // LNURL and saved methods have no interactive upgrade-payment path.
  const UPGRADE_METHODS = ["lightning", "revolut", "paypal", "stripe"];
  const upgradeMethods = paymentMethods?.filter((m) =>
    UPGRADE_METHODS.includes(m.name),
  );

  // Default the selection to a method that settles in the user's preferred
  // currency (so the quote shows in that currency), else the first available.
  useEffect(() => {
    if (selectedMethod || !upgradeMethods?.length) return;
    const match = upgradeMethods.find((m) =>
      (m.currencies as Array<string>).includes(login?.currency ?? ""),
    );
    setSelectedMethod((match ?? upgradeMethods[0]).name);
  }, [selectedMethod, upgradeMethods, login?.currency]);

  const [upgradeCpu, setUpgradeCpu] = useState<number>(
    state?.template.cpu ?? 1,
  );
  const [upgradeMemory, setUpgradeMemory] = useState<number>(
    (state?.template.memory ?? 1024 * 1024 * 1024) / (1024 * 1024 * 1024),
  );
  const [upgradeDisk, setUpgradeDisk] = useState<number>(
    (state?.template.disk_size ?? 20 * 1024 * 1024 * 1024) /
      (1024 * 1024 * 1024),
  );
  const currentTransferGb = state?.template.transfer_gb;
  const currentNetworkMbps = state?.template.limits?.network_mbps;
  const [upgradeTransferGb, setUpgradeTransferGb] = useState(currentTransferGb);
  const [upgradeNetworkMbps, setUpgradeNetworkMbps] =
    useState(currentNetworkMbps);

  if (!state) {
    return (
      <h2>
        <FormattedMessage defaultMessage="No VM selected" />
      </h2>
    );
  }

  const plan = upgradePlan(plans, state.template);
  const transferRange = bandwidthUpgradeRange(
    plan?.transfer,
    currentTransferGb,
  );
  const networkRange = bandwidthUpgradeRange(plan?.network, currentNetworkMbps);
  const transferUp =
    transferRange !== undefined &&
    upgradeTransferGb !== undefined &&
    upgradeTransferGb > transferRange.current;
  const networkUp =
    networkRange !== undefined &&
    upgradeNetworkMbps !== undefined &&
    upgradeNetworkMbps > networkRange.current;

  const currentCpu = state.template.cpu;
  const currentMemoryGB = state.template.memory / (1024 * 1024 * 1024);
  const currentDiskGB = state.template.disk_size / (1024 * 1024 * 1024);

  const hasValidUpgrade =
    upgradeCpu >= currentCpu &&
    upgradeMemory >= currentMemoryGB &&
    upgradeDisk >= currentDiskGB &&
    (upgradeCpu > currentCpu ||
      upgradeMemory > currentMemoryGB ||
      upgradeDisk > currentDiskGB ||
      transferUp ||
      networkUp);

  async function getQuote() {
    if (!login?.api || !hasValidUpgrade) return;
    setLoading(true);
    setError(undefined);
    setQuote(undefined);
    try {
      const result = await login.api.getVmUpgradeQuote(
        state!.id,
        getUpgradeRequest(),
        selectedMethod || undefined,
      );
      setQuote(result);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function getUpgradeRequest(): VmUpgradeRequest {
    const request: VmUpgradeRequest = {};
    if (upgradeCpu > currentCpu) request.cpu = upgradeCpu;
    if (upgradeMemory > currentMemoryGB)
      request.memory = upgradeMemory * 1024 * 1024 * 1024;
    if (upgradeDisk > currentDiskGB)
      request.disk = upgradeDisk * 1024 * 1024 * 1024;
    return withBandwidthUpgrade(
      request,
      transferRange ? upgradeTransferGb : undefined,
      currentTransferGb,
      networkRange ? upgradeNetworkMbps : undefined,
      currentNetworkMbps,
    );
  }

  // The upgrade charge is a payment on the VM's subscription.
  if (showPaymentFlow && state && quote && login?.api) {
    if (subscriptionId === undefined) {
      return (
        <div className="rounded-sm bg-cyber-danger/20 p-4 text-sm text-cyber-danger">
          <FormattedMessage defaultMessage="Couldn't find a subscription to bill this upgrade to." />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
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
            getUpgradeRequest(),
            subscriptionId,
          )}
          onPaymentComplete={() => {
            setShowPaymentFlow(false);
            setQuote(undefined);
          }}
          onCancel={() => setShowPaymentFlow(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />

      <div className="text-xl">
        <FormattedMessage defaultMessage="Upgrade VM Specifications" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-cyber-panel p-4 rounded-sm">
          <h3 className="text-lg font-bold mb-4">
            <FormattedMessage defaultMessage="Current Specifications" />
          </h3>
          <div className="space-y-2">
            <div>
              <FormattedMessage
                defaultMessage="CPU: {cores} cores"
                values={{ cores: currentCpu }}
              />
            </div>
            <div>
              <FormattedMessage
                defaultMessage="Memory: {gb} GB"
                values={{ gb: currentMemoryGB }}
              />
            </div>
            <div>
              <FormattedMessage
                defaultMessage="Disk: {gb} GB {type}"
                values={{
                  gb: currentDiskGB,
                  type: state.template.disk_type.toUpperCase(),
                }}
              />
            </div>
            <div>
              {currentTransferGb !== undefined && currentTransferGb > 0 ? (
                <FormattedMessage
                  defaultMessage="Transfer: {amount} per month"
                  values={{
                    amount: formatTransferAllowance(currentTransferGb),
                  }}
                />
              ) : (
                <FormattedMessage defaultMessage="Transfer: unmetered" />
              )}
            </div>
            <div>
              {formatPortSpeed(currentNetworkMbps) ? (
                <FormattedMessage
                  defaultMessage="Port speed: {speed}"
                  values={{ speed: formatPortSpeed(currentNetworkMbps) }}
                />
              ) : (
                <FormattedMessage defaultMessage="Port speed: uncapped" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-cyber-panel p-4 rounded-sm">
          <h3 className="text-lg font-bold mb-4">
            <FormattedMessage defaultMessage="Upgrade To" />
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                <FormattedMessage defaultMessage="CPU Cores" />
              </label>
              <input
                type="number"
                min={currentCpu}
                value={upgradeCpu}
                onChange={(e) =>
                  setUpgradeCpu(parseInt(e.target.value) || currentCpu)
                }
                className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
              />
              <small className="text-cyber-muted">
                <FormattedMessage
                  defaultMessage="Minimum: {min} cores"
                  values={{ min: currentCpu }}
                />
              </small>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <FormattedMessage defaultMessage="Memory (GB)" />
              </label>
              <input
                type="number"
                min={currentMemoryGB}
                value={upgradeMemory}
                onChange={(e) =>
                  setUpgradeMemory(parseInt(e.target.value) || currentMemoryGB)
                }
                className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
              />
              <small className="text-cyber-muted">
                <FormattedMessage
                  defaultMessage="Minimum: {min} GB"
                  values={{ min: currentMemoryGB }}
                />
              </small>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <FormattedMessage defaultMessage="Disk (GB)" />
              </label>
              <input
                type="number"
                min={currentDiskGB}
                value={upgradeDisk}
                onChange={(e) =>
                  setUpgradeDisk(parseInt(e.target.value) || currentDiskGB)
                }
                className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
              />
              <small className="text-cyber-muted">
                <FormattedMessage
                  defaultMessage="Minimum: {min} GB {type}"
                  values={{
                    min: currentDiskGB,
                    type: state.template.disk_type.toUpperCase(),
                  }}
                />
              </small>
            </div>

            {transferRange && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  <FormattedMessage defaultMessage="Monthly transfer (GB)" />
                </label>
                <input
                  type="number"
                  min={transferRange.current}
                  max={transferRange.max}
                  step={TRANSFER_STEP_GB}
                  value={upgradeTransferGb}
                  onChange={(e) =>
                    setUpgradeTransferGb(
                      Math.min(
                        transferRange.max,
                        parseInt(e.target.value) || transferRange.current,
                      ),
                    )
                  }
                  className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
                />
                <small className="text-cyber-muted">
                  <FormattedMessage
                    defaultMessage="Between {min} and {max} GB"
                    values={{
                      min: transferRange.current,
                      max: transferRange.max,
                    }}
                  />
                </small>
              </div>
            )}

            {networkRange && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  <FormattedMessage defaultMessage="Port speed (Mbit/s)" />
                </label>
                <input
                  type="number"
                  min={networkRange.current}
                  max={networkRange.max}
                  step={NETWORK_STEP_MBPS}
                  value={upgradeNetworkMbps}
                  onChange={(e) =>
                    setUpgradeNetworkMbps(
                      Math.min(
                        networkRange.max,
                        parseInt(e.target.value) || networkRange.current,
                      ),
                    )
                  }
                  className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
                />
                <small className="text-cyber-muted">
                  <FormattedMessage
                    defaultMessage="Between {min} and {max} Mbit/s"
                    values={{
                      min: networkRange.current,
                      max: networkRange.max,
                    }}
                  />
                </small>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-cyber-panel p-4 rounded-sm">
        <h3 className="text-lg font-bold mb-4">
          <FormattedMessage defaultMessage="Payment Method" />
        </h3>
        <select
          value={selectedMethod}
          onChange={(e) => {
            setSelectedMethod(e.target.value);
            setQuote(undefined);
          }}
          className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
        >
          {upgradeMethods?.map((method) => (
            <option key={method.name} value={method.name}>
              {method.name.charAt(0).toUpperCase() + method.name.slice(1)}
              {method.currencies.length > 0 &&
                ` (${method.currencies.join(", ")})`}
            </option>
          ))}
        </select>
        <small className="text-cyber-muted mt-2 block">
          <FormattedMessage defaultMessage="Sets the currency used for the quote and payment." />
        </small>
      </div>

      {error && (
        <div className="bg-cyber-danger/20 text-cyber-danger p-4 rounded-sm">
          <strong>
            <FormattedMessage defaultMessage="Error:" />
          </strong>{" "}
          {error}
        </div>
      )}

      {quote && (
        <div className="bg-cyber-primary/20 text-cyber-primary p-4 rounded-sm">
          <h3 className="text-lg font-bold mb-2">
            <FormattedMessage defaultMessage="Upgrade Quote" />
          </h3>
          <div className="space-y-3">
            <div className="bg-cyber-primary/10 p-3 rounded-sm">
              <h4 className="font-semibold mb-2">
                <FormattedMessage defaultMessage="Cost Breakdown" />
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>
                    <FormattedMessage defaultMessage="Value of remaining time at old rate:" />
                  </span>
                  <span>
                    <CostAmount cost={quote.discount} converted={false} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    <FormattedMessage defaultMessage="Cost at new rate for remaining time:" />
                  </span>
                  <span>
                    <CostAmount
                      cost={{
                        currency: quote.cost_difference.currency,
                        amount:
                          quote.cost_difference.amount + quote.discount.amount,
                      }}
                      converted={false}
                    />
                  </span>
                </div>
                <hr className="border-cyber-primary my-2" />
                <div className="flex justify-between">
                  <span>
                    <FormattedMessage defaultMessage="Pro-rated upgrade cost:" />
                  </span>
                  <span>
                    <CostAmount
                      cost={quote.cost_difference}
                      converted={false}
                    />
                  </span>
                </div>
                {(() => {
                  const currency = quote.cost_difference.currency;
                  const net = quote.cost_difference.amount;
                  // Prefer server-computed tax/fee; fall back to a client-side
                  // estimate so the breakdown is populated either way.
                  const taxRate = accountTaxRate(
                    account,
                    state.template.region?.company_id,
                  );
                  const tax =
                    quote.tax?.amount ?? Math.round(net * taxRate);
                  const method = upgradeMethods?.find(
                    (m) => m.name === selectedMethod,
                  );
                  const fee =
                    quote.processing_fee?.amount ??
                    (method
                      ? processingFeeEstimate(method, currency, net + tax)
                      : 0);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>
                          <FormattedMessage
                            defaultMessage="VAT ({rate}):"
                            values={{
                              rate: `${(taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 1)}%`,
                            }}
                          />
                        </span>
                        <CostAmount
                          cost={{ currency, amount: tax }}
                          converted={false}
                        />
                      </div>
                      {fee > 0 && (
                        <div className="flex justify-between">
                          <span>
                            <FormattedMessage defaultMessage="Processing fee:" />
                          </span>
                          <CostAmount
                            cost={{ currency, amount: fee }}
                            converted={false}
                          />
                        </div>
                      )}
                      <hr className="border-cyber-primary my-2" />
                      <div className="flex justify-between font-semibold text-base">
                        <span>
                          <FormattedMessage defaultMessage="Total due now:" />
                        </span>
                        <CostAmount
                          cost={{ currency, amount: net + tax + fee }}
                          converted={false}
                        />
                      </div>
                      {quote.tax === undefined && (
                        <div className="text-xs text-cyber-primary/70 pt-1">
                          <FormattedMessage defaultMessage="VAT and fees are estimated; the exact amount is confirmed at payment." />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <p className="font-semibold">
              <FormattedMessage
                defaultMessage="New monthly renewal cost: {cost}"
                values={{
                  cost: (
                    <strong>
                      <CostAmount
                        cost={quote.new_renewal_cost}
                        converted={false}
                      />
                    </strong>
                  ),
                }}
              />
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <AsyncButton onClick={getQuote} disabled={!hasValidUpgrade || loading}>
          <FormattedMessage defaultMessage="Get Quote" />
        </AsyncButton>
        {quote && (
          <AsyncButton
            onClick={() => setShowPaymentFlow(true)}
            disabled={loading}
          >
            <FormattedMessage defaultMessage="Proceed to Payment" />
          </AsyncButton>
        )}
      </div>

      {!hasValidUpgrade && (
        <div className="text-cyber-warning text-sm">
          <FormattedMessage defaultMessage="Please specify upgrade values that are greater than or equal to current values, with at least one value being greater than current." />
        </div>
      )}
    </div>
  );
}
