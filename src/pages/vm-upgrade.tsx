import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { VmInstance, VmUpgradeRequest, VmUpgradeQuote } from "../api";
import { AsyncButton } from "../components/button";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import VpsInstanceRow from "../components/vps-instance";
import VmPaymentFlow from "../components/vm-payment-flow";
import { CostAmount } from "../components/cost";

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

  // Form state
  const [upgradeCpu, setUpgradeCpu] = useState<number>(state?.template.cpu ?? 1);
  const [upgradeMemory, setUpgradeMemory] = useState<number>(
    (state?.template.memory ?? 1024 * 1024 * 1024) / (1024 * 1024 * 1024)
  );
  const [upgradeDisk, setUpgradeDisk] = useState<number>(
    (state?.template.disk_size ?? 20 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024)
  );

  // Set default payment method when methods are loaded
  useEffect(() => {
    if ((paymentMethods?.length ?? 0) > 0 && selectedMethod === "lightning") {
      setSelectedMethod(paymentMethods![0].name);
    }
  }, [paymentMethods, selectedMethod]);

  if (!state) {
    return <h2>No VM selected</h2>;
  }

  // Check if VM uses standard template (required for upgrades)
  const isStandardTemplate = !state?.template.pricing_id;

  if (!isStandardTemplate) {
    return (
      <div className="flex flex-col gap-4">
        <Link to={"/vm"} state={state}>&lt; Back to VM</Link>
        <VpsInstanceRow vm={state} actions={false} />
        <div className="bg-yellow-900 text-yellow-100 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Upgrade Not Available</h3>
          <p>This VM uses a custom template and cannot be upgraded. Only VMs using standard templates support upgrades.</p>
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
    (upgradeCpu > currentCpu || upgradeMemory > currentMemoryGB || upgradeDisk > currentDiskGB);

  async function getQuote() {
    if (!login?.api || !hasValidUpgrade) return;

    setLoading(true);
    setError(undefined);
    setQuote(undefined);

    try {
      const request: VmUpgradeRequest = {};
      if (upgradeCpu > currentCpu) request.cpu = upgradeCpu;
      if (upgradeMemory > currentMemoryGB) request.memory = upgradeMemory * 1024 * 1024 * 1024;
      if (upgradeDisk > currentDiskGB) request.disk = upgradeDisk * 1024 * 1024 * 1024;

      const result = await login.api.getVmUpgradeQuote(state!.id, request, selectedMethod);
      setQuote(result);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function getUpgradeRequest(): VmUpgradeRequest {
    const request: VmUpgradeRequest = {};
    if (upgradeCpu > currentCpu) request.cpu = upgradeCpu;
    if (upgradeMemory > currentMemoryGB) request.memory = upgradeMemory * 1024 * 1024 * 1024;
    if (upgradeDisk > currentDiskGB) request.disk = upgradeDisk * 1024 * 1024 * 1024;
    return request;
  }

  // Show payment flow when user clicks "Proceed to Payment"
  if (showPaymentFlow && state && quote) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPaymentFlow(false)}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            &lt; Back to Upgrade
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
            // Could show success message or redirect
          }}
          onCancel={() => setShowPaymentFlow(false)}
        />
      </div>
    );
  }

  // Show upgrade configuration form
  return (
    <div className="flex flex-col gap-4">
      <Link to={"/vm"} state={state}>&lt; Back to VM</Link>
      <VpsInstanceRow vm={state} actions={false} />

      <div className="text-xl">Upgrade VM Specifications</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-900 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Current Specifications</h3>
          <div className="space-y-2">
            <div>CPU: {currentCpu} cores</div>
            <div>Memory: {currentMemoryGB} GB</div>
            <div>Disk: {currentDiskGB} GB {state.template.disk_type.toUpperCase()}</div>
          </div>
        </div>

        <div className="bg-neutral-900 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Upgrade To</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">CPU Cores</label>
              <input
                type="number"
                min={currentCpu}
                value={upgradeCpu}
                onChange={(e) => setUpgradeCpu(parseInt(e.target.value) || currentCpu)}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-700 focus:border-blue-500"
              />
              <small className="text-neutral-400">Minimum: {currentCpu} cores</small>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Memory (GB)</label>
              <input
                type="number"
                min={currentMemoryGB}
                value={upgradeMemory}
                onChange={(e) => setUpgradeMemory(parseInt(e.target.value) || currentMemoryGB)}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-700 focus:border-blue-500"
              />
              <small className="text-neutral-400">Minimum: {currentMemoryGB} GB</small>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Disk (GB)</label>
              <input
                type="number"
                min={currentDiskGB}
                value={upgradeDisk}
                onChange={(e) => setUpgradeDisk(parseInt(e.target.value) || currentDiskGB)}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-700 focus:border-blue-500"
              />
              <small className="text-neutral-400">
                Minimum: {currentDiskGB} GB {state.template.disk_type.toUpperCase()}
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Payment Method</h3>
        {methodsLoading ? (
          <div className="text-neutral-400">Loading payment methods...</div>
        ) : (
          <div>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                // Clear quote when payment method changes
                setQuote(undefined);
              }}
              className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-700 focus:border-blue-500"
            >
              {paymentMethods?.map((method) => (
                <option key={method.name} value={method.name}>
                  {method.name.charAt(0).toUpperCase() + method.name.slice(1)}
                  {method.currencies.length > 0 &&
                    ` (${method.currencies.join(", ")})`
                  }
                </option>
              ))}
            </select>
            <small className="text-neutral-400 mt-2 block">
              Payment method affects the currency used for the quote and payment.
            </small>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900 text-red-100 p-4 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {quote && (
        <div className="bg-green-900 text-green-100 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Upgrade Quote</h3>
          <div className="space-y-3">
            <div className="bg-green-800/50 p-3 rounded">
              <h4 className="font-semibold mb-2">Cost Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Value of remaining time at old rate:</span>
                  <span><CostAmount cost={quote.discount} converted={false} /></span>
                </div>
                <div className="flex justify-between">
                  <span>Cost at new rate for remaining time:</span>
                  <span><CostAmount cost={{
                    currency: quote.cost_difference.currency,
                    amount: quote.cost_difference.amount + quote.discount.amount
                  }} converted={false} /></span>
                </div>
                <hr className="border-green-700 my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Pro-rated upgrade cost:</span>
                  <span><CostAmount cost={quote.cost_difference} converted={false} /></span>
                </div>
              </div>
            </div>
            <p className="font-semibold">
              New monthly renewal cost: {" "}
              <strong><CostAmount cost={quote.new_renewal_cost} converted={false} /></strong>
            </p>
          </div>
          <p className="text-sm mt-3 opacity-90">
            The upgrade cost is calculated as: (new rate × remaining time) - (old rate × remaining time).
            After upgrade, your VM will renew at the new monthly rate shown above.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <AsyncButton
          onClick={getQuote}
          disabled={!hasValidUpgrade || loading}
        >
          Get Quote
        </AsyncButton>

        {quote && (
          <AsyncButton
            onClick={() => setShowPaymentFlow(true)}
            disabled={loading}
          >
            Proceed to Payment
          </AsyncButton>
        )}
      </div>

      {!hasValidUpgrade && (
        <div className="text-yellow-400 text-sm">
          Please specify upgrade values that are greater than or equal to current values, with at least one value being greater than current.
        </div>
      )}
    </div>
  );
}