import {
  LNVpsApi,
  SubscriptionPayment,
  VmInstance,
  VmPayment,
  VmUpgradeRequest,
} from "../api";
import { ApiUrl } from "../const";

/**
 * A "payment source" describes the one thing that differs between checkout
 * flows: how to create a payment and how to tell when it's paid. Everything
 * else (method selection, receipt, Lightning/card widgets, polling loop) is
 * shared by <PaymentFlow />.
 *
 * All sources normalise onto the flat {@link VmPayment} shape so the same
 * Lightning and Revolut widgets can render any of them.
 */
export interface PaymentSource {
  /** Create a payment for the chosen method. */
  createPayment: (
    method: string,
    opts: { saveCard?: boolean; paymentMethodId?: number; intervals?: number },
  ) => Promise<VmPayment>;
  /** Resolve true once the given payment has settled. */
  pollPaid: (paymentId: string) => Promise<boolean>;
  /** Optional interval (duration) selector for renewals. */
  duration?: {
    /** cost-plan interval type, e.g. "month" | "day" */
    intervalType: string;
    /** per-interval price used for the up-front receipt estimate */
    cost: { currency: string; amount: number };
    /** seller company id, to pick the applicable VAT rate from the account */
    taxCompanyId?: number;
  };
  /** Optional Lightning address (LNURL) the user can pay from any wallet. */
  lnurl?: { lud16: string };
  /**
   * Whether saved payment methods can be charged for this source. Off for
   * one-time upgrades, whose endpoint has no saved / off-session path. Defaults
   * to true.
   */
  allowSavedMethods?: boolean;
}

/** Flatten a SubscriptionPayment (Price objects) onto the VmPayment shape. */
export function subscriptionToVmPayment(p: SubscriptionPayment): VmPayment {
  return {
    id: p.id,
    vm_id: 0,
    created: p.created,
    expires: p.expires,
    amount: p.amount.amount,
    tax: p.tax.amount,
    processing_fee: p.processing_fee.amount,
    currency: p.amount.currency,
    is_paid: p.is_paid,
    paid_at: p.paid_at,
    data: p.data,
    time: 0,
    payment_method: p.payment_method,
  };
}

/** Renew a subscription (also the path for VMs, which are subscriptions). */
export function subscriptionRenewalSource(
  api: LNVpsApi,
  subscriptionId: number,
  extra?: Partial<Pick<PaymentSource, "duration" | "lnurl">>,
): PaymentSource {
  return {
    createPayment: async (method, opts) =>
      subscriptionToVmPayment(
        await api.renewSubscription(subscriptionId, method, {
          saveCard: opts.saveCard,
          paymentMethodId: opts.paymentMethodId,
          intervals: opts.intervals,
        }),
      ),
    pollPaid: async (paymentId) => {
      // The generic /payment/{id} status endpoint doesn't resolve every
      // subscription payment, so check the subscription's own payment list.
      const list = await api.listSubscriptionPayments(subscriptionId);
      return list.some((p) => p.id === paymentId && p.is_paid);
    },
    ...extra,
  };
}

/**
 * Find the subscription a VM is billed under. Prefers the `subscription_id`
 * exposed on the VM, and otherwise looks it up from the subscription list by
 * matching the VPS line item — so renewal works even against older API payloads
 * that don't include the id yet.
 */
export async function resolveVmSubscriptionId(
  api: LNVpsApi,
  vm: VmInstance,
): Promise<number | undefined> {
  if (vm.subscription_id !== undefined) return vm.subscription_id;
  const subs = await api.listSubscriptions();
  const match = subs.find((s) =>
    s.line_items?.some(
      (li) => li.resource?.type === "vps" && li.resource.vm_id === vm.id,
    ),
  );
  return match?.id;
}

/** Renew a VM by renewing the subscription it's billed under. */
export function vmRenewalSource(
  api: LNVpsApi,
  vm: VmInstance,
  subscriptionId: number,
): PaymentSource {
  const costPlan = vm.template.cost_plan;
  return subscriptionRenewalSource(api, subscriptionId, {
    duration: {
      intervalType: costPlan.interval_type,
      cost: { currency: costPlan.currency, amount: costPlan.amount },
      taxCompanyId: vm.template.region?.company_id,
    },
    lnurl: { lud16: `${vm.id}@${new URL(ApiUrl).host}` },
  });
}

/** Pay for a VM resource upgrade (one-time, not a subscription renewal). */
export function vmUpgradeSource(
  api: LNVpsApi,
  vm: VmInstance,
  upgradeRequest: VmUpgradeRequest,
): PaymentSource {
  return {
    // Upgrades now support saved methods off-session: method=nwc pays the
    // Lightning invoice via the saved NWC wallet, method=saved charges a saved
    // Revolut card (optionally a specific one via paymentMethodId).
    createPayment: (method, opts) =>
      api.createVmUpgradePayment(vm.id, upgradeRequest, method, {
        paymentMethodId: opts.paymentMethodId,
      }),
    pollPaid: async (paymentId) => {
      const st = await api.paymentStatus(paymentId);
      return st.is_paid;
    },
  };
}
