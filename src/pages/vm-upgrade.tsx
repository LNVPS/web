import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { VmInstance, VmUpgradeRequest, VmUpgradeQuote } from "../api";
import { AsyncButton } from "../components/button";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import VpsInstanceRow from "../components/vps-instance";
import VmPaymentFlow from "../components/vm-payment-flow";
import { CostAmount } from "../components/cost";
import { FormattedMessage } from "react-intl";

export default function VmUpgradePage() {
  const location = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const { data: paymentMethods, loading: methodsLoading } = usePaymentMethods();
  const [state] = useState<VmInstance | undefined>(location?.state);
  const [error, setError] = useState<string>();
  const [quote, setQuote] = useState<VmUpgradeQuote>();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("lightning");
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);

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

  useEffect(() => {
    if ((paymentMethods?.length ?? 0) > 0 && selectedMethod === "lightning") {
      setSelectedMethod(paymentMethods![0].name);
    }
  }, [paymentMethods, selectedMethod]);

  if (!state) {
    return (
      <h2>
        <FormattedMessage defaultMessage="No VM selected" />
      </h2>
    );
  }

  const isStandardTemplate = !state?.template.pricing_id;

  if (!isStandardTemplate) {
    return (
      <div className="flex flex-col gap-4">
        <Link to={"/vm"} state={state}>
          &lt; <FormattedMessage defaultMessage="Back to VM" />
        </Link>
        <VpsInstanceRow vm={state} actions={false} />
        <div className="bg-cyber-warning/20 text-cyber-warning p-4 rounded-sm">
          <h3 className="text-lg font-bold mb-2">
            <FormattedMessage defaultMessage="Upgrade Not Available" />
          </h3>
          <p>
            <FormattedMessage defaultMessage="This VM uses a custom template and cannot be upgraded. Only VMs using standard templates support upgrades." />
          </p>
        </div>
      </div>
    );
  }

  const currentCpu = state.template.cpu;
  const currentMemoryGB = state.template.memory / (1024 * 1024 * 1024);
  const currentDiskGB = state.template.disk_size / (1024 * 1024 * 1024);

  const hasValidUpgrade =
    upgradeCpu >= currentCpu &&
    upgradeMemory >= currentMemoryGB &&
    upgradeDisk >= currentDiskGB &&
    (upgradeCpu > currentCpu ||
      upgradeMemory > currentMemoryGB ||
      upgradeDisk > currentDiskGB);

  async function getQuote() {
    if (!login?.api || !hasValidUpgrade) return;
    setLoading(true);
    setError(undefined);
    setQuote(undefined);
    try {
      const request: VmUpgradeRequest = {};
      if (upgradeCpu > currentCpu) request.cpu = upgradeCpu;
      if (upgradeMemory > currentMemoryGB)
        request.memory = upgradeMemory * 1024 * 1024 * 1024;
      if (upgradeDisk > currentDiskGB)
        request.disk = upgradeDisk * 1024 * 1024 * 1024;
      const result = await login.api.getVmUpgradeQuote(
        state!.id,
        request,
        selectedMethod,
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
    return request;
  }

  if (showPaymentFlow && state && quote) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaymentFlow(false)}
            className="text-cyber-accent hover:text-cyber-accent flex items-center gap-1"
          >
            &lt; <FormattedMessage defaultMessage="Back to Upgrade" />
          </button>
        </div>
        <VpsInstanceRow vm={state} actions={false} />
        <VmPaymentFlow
          vm={state}
          type="upgrade"
          upgradeRequest={getUpgradeRequest()}
          paymentMethod={selectedMethod}
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
      <Link to={"/vm"} state={state}>
        &lt; <FormattedMessage defaultMessage="Back to VM" />
      </Link>
      <VpsInstanceRow vm={state} actions={false} />

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
          </div>
        </div>
      </div>

      <div className="bg-cyber-panel p-4 rounded-sm">
        <h3 className="text-lg font-bold mb-4">
          <FormattedMessage defaultMessage="Payment Method" />
        </h3>
        {methodsLoading ? (
          <div className="text-cyber-muted">
            <FormattedMessage defaultMessage="Loading payment methods..." />
          </div>
        ) : (
          <div>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setQuote(undefined);
              }}
              className="w-full px-3 py-2 bg-cyber-panel-light rounded-sm border border-cyber-border focus:border-cyber-primary"
            >
              {paymentMethods?.map((method) => (
                <option key={method.name} value={method.name}>
                  {method.name.charAt(0).toUpperCase() + method.name.slice(1)}
                  {method.currencies.length > 0 &&
                    ` (${method.currencies.join(", ")})`}
                </option>
              ))}
            </select>
            <small className="text-cyber-muted mt-2 block">
              <FormattedMessage defaultMessage="Payment method affects the currency used for the quote and payment." />
            </small>
          </div>
        )}
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
                <div className="flex justify-between font-semibold">
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
