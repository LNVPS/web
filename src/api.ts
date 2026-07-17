import { EventKind, EventPublisher } from "@snort/system";
import { base64 } from "@scure/base";

export interface ApiResponseBase {
  error?: string;
}

export type ApiResponse<T> = ApiResponseBase & {
  data: T;
};

export enum DiskType {
  SSD = "ssd",
  HDD = "hdd",
}

export enum DiskInterface {
  SATA = "sata",
  SCSI = "scsi",
  PCIe = "pcie",
}

export enum CostPlanIntervalType {
  DAY = "day",
  MONTH = "month",
  YEAR = "year",
}

export enum OsDistribution {
  UBUNTU = "ubuntu",
  DEBIAN = "debian",
  CENTOS = "centos",
  FEDORA = "fedora",
  FREEBSD = "freebsd",
  OPENSUSE = "opensuse",
  ARCHLINUX = "archlinux",
  REDHATENTERPRISE = "redhatenterprise",
}

export enum CpuMfg {
  UNKNOWN = "unknown",
  INTEL = "intel",
  AMD = "amd",
  APPLE = "apple",
  NVIDIA = "nvidia",
  ARM = "arm",
}

export enum CpuArch {
  UNKNOWN = "unknown",
  X86_64 = "x86_64",
  ARM64 = "arm64",
}

export enum CpuFeature {
  SSE = "SSE",
  SSE2 = "SSE2",
  SSE3 = "SSE3",
  SSSE3 = "SSSE3",
  SSE4_1 = "SSE4_1",
  SSE4_2 = "SSE4_2",
  AVX = "AVX",
  AVX2 = "AVX2",
  FMA = "FMA",
  F16C = "F16C",
  AVX512F = "AVX512F",
  AVX512VNNI = "AVX512VNNI",
  AVX512BF16 = "AVX512BF16",
  AVXVNNI = "AVXVNNI",
  NEON = "NEON",
  SVE = "SVE",
  SVE2 = "SVE2",
  AES = "AES",
  SHA = "SHA",
  SHA512 = "SHA512",
  PCLMULQDQ = "PCLMULQDQ",
  RNG = "RNG",
  GFNI = "GFNI",
  VAES = "VAES",
  VPCLMULQDQ = "VPCLMULQDQ",
  VMX = "VMX",
  NestedVirt = "NestedVirt",
  AMX = "AMX",
  SME = "SME",
  SGX = "SGX",
  SEV = "SEV",
  TDX = "TDX",
  EncodeH264 = "EncodeH264",
  EncodeHEVC = "EncodeHEVC",
  EncodeAV1 = "EncodeAV1",
  EncodeVP9 = "EncodeVP9",
  EncodeJPEG = "EncodeJPEG",
  DecodeH264 = "DecodeH264",
  DecodeHEVC = "DecodeHEVC",
  DecodeAV1 = "DecodeAV1",
  DecodeVP9 = "DecodeVP9",
  DecodeJPEG = "DecodeJPEG",
  DecodeMPEG2 = "DecodeMPEG2",
  DecodeVC1 = "DecodeVC1",
  VideoScaling = "VideoScaling",
  VideoDeinterlace = "VideoDeinterlace",
  VideoCSC = "VideoCSC",
  VideoComposition = "VideoComposition",
}

export type VmState = "unknown" | "running" | "stopped" | "creating";

export type PaymentMethodType =
  | "lightning"
  | "revolut"
  | "paypal"
  | "stripe"
  | "nwc"
  | "lnurl";

export type PaymentTypeValue = "new" | "renew" | "upgrade";

export type PaymentTypeMethod = "Purchase" | "Renewal" | "Upgrade";

export interface AccountDetail {
  email?: string;
  email_verified?: boolean;
  contact_nip17: boolean;
  contact_email: boolean;
  contact_telegram: boolean;
  /** Whether a Telegram chat is linked (read-only) */
  telegram_linked?: boolean;
  contact_whatsapp: boolean;
  /** The verified WhatsApp number, if any (read-only) */
  whatsapp_number?: string;
  /** Whether the WhatsApp number is verified (read-only) */
  whatsapp_verified?: boolean;
  country_code?: string;
  name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  tax_id?: string;
  /**
   * Read-only (GET only): the VAT that will currently be charged to the user,
   * one entry per seller company. Determined from the user's billing info
   * (VAT number, declared country, IP-derived country). Ignored on PATCH.
   */
  tax?: Array<AccountTaxInfo>;
}

/** Response body of `PATCH /api/v1/account`. */
export interface UpdateAccountResponse {
  /**
   * Non-fatal VIES warnings raised when saving billing details — e.g. the
   * name/address didn't match the VAT number's registered values. The account
   * is still saved; an invalid VAT number itself is a hard error instead.
   */
  warnings?: Array<string>;
}

/** The VAT that will be charged to the user for a given seller company. */
export interface AccountTaxInfo {
  company_id: number;
  company_name: string;
  /** VAT rate as a percentage, e.g. 23.0 for 23% */
  rate: number;
  /** Place-of-supply country (ISO 3166-1 alpha-3), if determined */
  country_code?: string;
  /** "domestic" | "oss_b2c" | "reverse_charge" | "out_of_scope" | "undetermined_default" */
  treatment: string;
}

/** A saved payment method for automatic renewals */
export interface SavedPaymentMethod {
  id: number;
  /** Payment processor: 'nwc' or 'revolut' */
  provider: string;
  /** Optional user-defined label */
  name?: string;
  created: string;
  card_brand?: string;
  card_last_four?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  enabled: boolean;
}

/** Which notification channels are configured on the server */
export interface NotificationChannels {
  nip17: boolean;
  email: boolean;
  telegram: boolean;
  whatsapp: boolean;
}

export interface TelegramLinkResponse {
  /** Deep link the user should open to link their Telegram chat */
  url: string;
  /** One-time token embedded in the deep link */
  token: string;
}

export interface VmCostPlan {
  id: number;
  name: string;
  currency: "BTC" | "EUR" | "USD";
  amount: number;
  other_price?: Array<Price>;
  interval_amount: number;
  interval_type: CostPlanIntervalType;
}

export interface VmHostRegion {
  id: number;
  name: string;
  /** Seller company id; match against account.tax[].company_id for the VAT rate */
  company_id: number;
}

export interface VmCustomTemplateParams {
  id: number;
  name: string;
  region: VmHostRegion;
  cpu_mfg?: CpuMfg;
  cpu_arch?: CpuArch;
  cpu_features?: Array<CpuFeature>;
  max_cpu: number;
  min_cpu: number;
  min_memory: number;
  max_memory: number;
  disks: Array<VmCustomTemplateDiskParams>;
}

export interface VmCustomTemplateDiskParams {
  min_disk: number;
  max_disk: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
}

export interface VmCustomTemplateRequest {
  pricing_id: number;
  cpu: number;
  memory: number;
  disk: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
}

export interface VmCustomPrice {
  currency: string;
  amount: number;
}

export interface VmTemplateResponse {
  templates: Array<VmTemplate>;
  custom_template?: Array<VmCustomTemplateParams>;
}

export interface VmTemplate {
  id: number;
  pricing_id?: number;
  name: string;
  created: string;
  expires?: string;
  cpu: number;
  cpu_mfg?: CpuMfg;
  cpu_arch?: CpuArch;
  cpu_features?: Array<CpuFeature>;
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  cost_plan: VmCostPlan;
  region: VmHostRegion;
}

/**
 * VM live running-state and metrics — the nested `status` field of a VM object
 * (see `VmInstance.status`). Metrics may be absent until the first poll.
 */
export interface VmRunningState {
  /** Unix timestamp when this state was collected. */
  timestamp?: number;
  state: VmState;
  cpu_usage?: number;
  mem_usage?: number;
  uptime?: number;
  net_in?: number;
  net_out?: number;
  disk_write?: number;
  disk_read?: number;
}

export interface VmInstance {
  id: number;
  created: string;
  expires?: string;
  status?: VmRunningState;
  mac_address: string;
  template: VmTemplate;
  image: VmOsImage;
  ssh_key: UserSshKey;
  ip_assignments: Array<VmIpAssignment>;
  auto_renewal_enabled?: boolean;
  /**
   * Date the VM will be deleted if not renewed (expiry + dynamic grace period).
   * Absent when the VM has no expiry (never paid).
   */
  deleting_on?: string;
  /** The subscription this VM is billed under; renew via renewSubscription. */
  subscription_id?: number;
}

export interface VmIpAssignment {
  id: number;
  ip: string;
  gateway: string;
  forward_dns?: string;
  reverse_dns?: string;
}

export interface VmOsImage {
  id: number;
  distribution: OsDistribution;
  flavour: string;
  version: string;
  release_date: string;
  default_username?: string;
}

export interface UserSshKey {
  id: number;
  name: string;
  created?: string;
  /** IDs of the user's active VMs currently using this SSH key */
  vms?: Array<number>;
}

export type PaymentData =
  | { lightning: string }
  | { revolut: { token: string } }
  | { stripe: { session_id: string } };

export interface VmPayment {
  id: string;
  vm_id: number;
  created: string;
  expires: string;
  amount: number;
  tax: number;
  processing_fee: number;
  currency: string;
  is_paid: boolean;
  paid_at?: string;
  data: PaymentData;
  time: number;
  is_upgrade?: boolean;
  upgrade_params?: VmUpgradeRequest | null;
  payment_method?: string;
}

export interface PatchVm {
  ssh_key_id?: number;
  reverse_dns?: string;
  auto_renewal_enabled?: boolean;
}

export interface TimeSeriesData {
  timestamp: number;
  cpu: number;
  memory: number;
  memory_size: number;
  net_in: number;
  net_out: number;
  disk_write: number;
  disk_read: number;
}

export interface PaymentMethod {
  name: PaymentMethodType;
  metadata?: Record<string, string>;
  currencies: Array<"BTC" | "EUR" | "USD">;
  processing_fee_rate?: number;
  processing_fee_base?: number;
  processing_fee_currency?: string;
}

export interface NostrDomainsResponse {
  domains: Array<NostrDomain>;
  cname: string;
}

export interface NostrDomain {
  id: number;
  name: string;
  enabled: boolean;
  handles: number;
  /** ISO 8601 datetime */
  created: string;
  relays: Array<string>;
  activation_hash?: string;
}

export interface NostrDomainHandle {
  id: number;
  domain_id: number;
  handle: string;
  /** ISO 8601 datetime */
  created: string;
  pubkey: string;
  /** Relay hints advertised for this handle */
  relays: Array<string>;
}

export interface VmHistory {
  id: number;
  vm_id: number;
  action_type: string;
  timestamp: string;
  initiated_by: "owner" | "system" | "other";
  previous_state?: string;
  new_state?: string;
  metadata?: string;
  description?: string;
}

export interface VmUpgradeRequest {
  cpu?: number;
  memory?: number;
  disk?: number;
}

export interface Price {
  currency: "BTC" | "EUR" | "USD";
  amount: number;
}

export interface VmUpgradeQuote {
  /** Net pro-rated upgrade cost (before tax/fees). */
  cost_difference: Price;
  new_renewal_cost: Price;
  discount: Price;
  /** VAT on the upgrade, when the server computes it (else estimated client-side). */
  tax?: Price;
  /** Payment processing fee, when the server computes it (else estimated client-side). */
  processing_fee?: Price;
}

export interface LnurlPayResponse {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
}

export interface ContactFormRequest {
  subject: string;
  message: string;
  email: string;
  name: string;
  user_pubkey?: string;
  timestamp: string;
  turnstile_token: string;
}

export type InternetRegistry = "arin" | "ripe" | "apnic" | "lacnic" | "afrinic";

export interface IpSpacePricing {
  id: number;
  prefix_size: number;
  price: Price;
  setup_fee: Price;
  other_price?: Array<Price>;
  other_setup_fee?: Array<Price>;
}

export interface AvailableIpSpace {
  id: number;
  ip_version: "ipv4" | "ipv6";
  min_prefix_size: number;
  max_prefix_size: number;
  registry: InternetRegistry;
  pricing: Array<IpSpacePricing>;
}

export interface IpRangeSubscription {
  id: number;
  cidr: string;
  is_active: boolean;
  started_at: string;
  ended_at?: string;
  parent_cidr: string;
}

export interface AddIpRangeToSubscriptionRequest {
  ip_space_pricing_id: number;
}

export interface Subscription {
  id: number;
  name?: string;
  description?: string;
  created: string;
  expires?: string;
  is_active: boolean;
  auto_renewal_enabled: boolean;
  line_items: Array<SubscriptionLineItem>;
}

export interface SubscriptionLineItem {
  id: number;
  subscription_id: number;
  name: string;
  description?: string;
  price: Price;
  setup_fee: Price;
  configuration?: unknown;
  resource?: SubscriptionLineItemResource;
}

// Typed reference to the resource a line item bills for, resolved server-side
// from the line item's subscription type (null when there is no linked resource).
export type SubscriptionLineItemResource =
  | { type: "vps"; vm_id: number }
  | { type: "ip_range"; ip_range_subscription_id: number };

export interface SubscriptionPayment {
  id: string;
  subscription_id: number;
  created: string;
  expires: string;
  amount: Price;
  payment_method: PaymentMethodType;
  payment_type: PaymentTypeMethod;
  is_paid: boolean;
  paid_at?: string;
  tax: Price;
  processing_fee: Price;
  // Payment-method-specific data needed to complete the payment
  // (e.g. the Lightning invoice when payment_method === "lightning").
  data: PaymentData;
}

export interface SubscriptionSummary {
  active_subscriptions: number;
  total_monthly_cost: number;
  currency: string;
}

export interface CreateSubscriptionRequest {
  name?: string;
  description?: string;
  currency?: string;
  auto_renewal_enabled?: boolean;
  line_items: Array<CreateSubscriptionLineItemRequest>;
}

export type CreateSubscriptionLineItemRequest =
  | { type: "ip_range"; ip_space_pricing_id: number }
  | { type: "asn_sponsoring"; asn: number }
  | { type: "dns_hosting"; domain: string };

export type ReferralPayoutMode =
  | "lightning_address"
  | "nwc"
  | "account_credit";

export interface Referral {
  code: string;
  lightning_address?: string;
  /** Payout method: `lightning_address`, `nwc`, or `account_credit`. */
  mode: ReferralPayoutMode;
  /**
   * Per-referrer commission override, as a whole percentage of a referred VM's
   * first payment. `null`/undefined means the referred VM's company default
   * rate applies instead.
   */
  referral_rate?: number | null;
  /**
   * The rate that currently applies (whole %): the per-referrer override
   * (`referral_rate`) if set, otherwise the referred VM company's default rate.
   */
  effective_referral_rate?: number;
  created: string;
}

export interface ReferralEarning {
  currency: string;
  amount: number;
}

export interface ReferralPayout {
  id: number;
  amount: number;
  currency: string;
  created: string;
  is_paid: boolean;
  invoice?: string;
  /** Payment preimage (hex), present once the payout has settled. */
  pre_image?: string;
}

/** Per-referral breakdown of the commission earned from a first payment. */
export interface ReferralUsage {
  created: string;
  amount: number;
  currency: string;
  /** Effective commission rate applied (whole %). */
  effective_rate: number;
  /** Commission earned = amount * effective_rate% (smallest currency unit). */
  commission: number;
}

export interface ReferralState extends Referral {
  earned: Array<ReferralEarning>;
  payouts: Array<ReferralPayout>;
  referrals_success: number;
  referrals_failed: number;
}

export interface ReferralSignupRequest {
  lightning_address?: string;
  /** Payout method: `lightning_address` (default) or `nwc`. */
  mode?: ReferralPayoutMode;
}

export interface ReferralPatchRequest {
  lightning_address?: string | null;
  /** Payout method: `lightning_address`, `nwc`, or `account_credit`. */
  mode?: ReferralPayoutMode;
}

export type PaginatedResponse<T> = ApiResponseBase & {
  data: Array<T>;
  total: number;
  limit: number;
  offset: number;
};

export interface CreateSshKey {
  name: string;
  key_data: string;
}

export interface CustomVmRequest {
  pricing_id: number;
  cpu: number;
  memory: number;
  disk: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
}

export type CustomVmOrder = CustomVmRequest & {
  image_id: number;
  ssh_key_id: number;
  ref_code?: string;
};

export interface VmPatchRequest {
  ssh_key_id?: number;
  reverse_dns?: string;
  auto_renewal_enabled?: boolean;
}

export interface CreateVmRequest {
  template_id: number;
  image_id: number;
  ssh_key_id: number;
  ref_code?: string;
}

export enum FirewallDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

export enum FirewallProtocol {
  ANY = "any",
  TCP = "tcp",
  UDP = "udp",
  ICMP = "icmp",
}

export enum FirewallAction {
  ACCEPT = "accept",
  DROP = "drop",
  REJECT = "reject",
}

export interface FirewallRule {
  id: number;
  priority: number;
  direction: FirewallDirection;
  protocol: FirewallProtocol;
  action: FirewallAction;
  src_cidr?: string | null;
  dst_port_start?: number | null;
  dst_port_end?: number | null;
  enabled: boolean;
}

export interface CreateFirewallRule {
  priority?: number;
  direction: FirewallDirection;
  protocol: FirewallProtocol;
  action: FirewallAction;
  src_cidr?: string | null;
  dst_port_start?: number | null;
  dst_port_end?: number | null;
  enabled?: boolean;
}

export type UpdateFirewallRule = Partial<CreateFirewallRule>;

export interface FirewallPolicy {
  policy_in?: FirewallAction | null;
  policy_out?: FirewallAction | null;
}

export class LNVpsApi {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher | undefined,
    readonly timeout?: number,
  ) {}

  async getAccount() {
    const { data } = await this.#handleResponse<ApiResponse<AccountDetail>>(
      await this.#req("/api/v1/account", "GET"),
    );
    return data;
  }

  async updateAccount(acc: AccountDetail) {
    const { data } = await this.#handleResponse<
      ApiResponse<UpdateAccountResponse>
    >(await this.#req("/api/v1/account", "PATCH", acc));
    return data;
  }

  async listPaymentMethods() {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<SavedPaymentMethod>>
    >(await this.#req("/api/v1/payment-methods", "GET"));
    return data;
  }

  async addNwcPaymentMethod(nwc_connection_string: string, name?: string) {
    const { data } = await this.#handleResponse<ApiResponse<SavedPaymentMethod>>(
      await this.#req("/api/v1/payment-methods", "POST", {
        nwc_connection_string,
        name,
      }),
    );
    return data;
  }

  async updatePaymentMethod(
    id: number,
    patch: { is_default?: boolean; enabled?: boolean; name?: string | null },
  ) {
    const { data } = await this.#handleResponse<ApiResponse<SavedPaymentMethod>>(
      await this.#req(`/api/v1/payment-methods/${id}`, "PATCH", patch),
    );
    return data;
  }

  async deletePaymentMethod(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req(`/api/v1/payment-methods/${id}`, "DELETE"),
    );
    return data;
  }

  async listVms() {
    const { data } = await this.#handleResponse<ApiResponse<Array<VmInstance>>>(
      await this.#req("/api/v1/vm", "GET"),
    );
    return data;
  }

  async getVm(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req(`/api/v1/vm/${id}`, "GET"),
    );
    return data;
  }

  async getVmTimeSeries(id: number) {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<TimeSeriesData>>
    >(await this.#req(`/api/v1/vm/${id}/time-series`, "GET"));
    return data;
  }

  async patchVm(id: number, req: PatchVm) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req(`/api/v1/vm/${id}`, "PATCH", req),
    );
    return data;
  }

  async startVm(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req(`/api/v1/vm/${id}/start`, "PATCH"),
    );
    return data;
  }

  async stopVm(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req(`/api/v1/vm/${id}/stop`, "PATCH"),
    );
    return data;
  }

  async restartVm(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req(`/api/v1/vm/${id}/restart`, "PATCH"),
    );
    return data;
  }

  async reinstallVm(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req(`/api/v1/vm/${id}/re-install`, "PATCH"),
    );
    return data;
  }

  async listFirewallRules(id: number) {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<FirewallRule>>
    >(await this.#req(`/api/v1/vm/${id}/firewall`, "GET"));
    return data;
  }

  async createFirewallRule(id: number, req: CreateFirewallRule) {
    const { data } = await this.#handleResponse<ApiResponse<FirewallRule>>(
      await this.#req(`/api/v1/vm/${id}/firewall`, "POST", req),
    );
    return data;
  }

  async updateFirewallRule(
    id: number,
    rule_id: number,
    req: UpdateFirewallRule,
  ) {
    const { data } = await this.#handleResponse<ApiResponse<FirewallRule>>(
      await this.#req(`/api/v1/vm/${id}/firewall/${rule_id}`, "PATCH", req),
    );
    return data;
  }

  async deleteFirewallRule(id: number, rule_id: number) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req(`/api/v1/vm/${id}/firewall/${rule_id}`, "DELETE"),
    );
    return data;
  }

  async getFirewallPolicy(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<FirewallPolicy>>(
      await this.#req(`/api/v1/vm/${id}/firewall/policy`, "GET"),
    );
    return data;
  }

  async updateFirewallPolicy(id: number, req: FirewallPolicy) {
    const { data } = await this.#handleResponse<ApiResponse<FirewallPolicy>>(
      await this.#req(`/api/v1/vm/${id}/firewall/policy`, "PATCH", req),
    );
    return data;
  }

  async listOffers() {
    const { data } = await this.#handleResponse<
      ApiResponse<VmTemplateResponse>
    >(await this.#req("/api/v1/vm/templates", "GET"));
    return data;
  }

  async listOsImages() {
    const { data } = await this.#handleResponse<ApiResponse<Array<VmOsImage>>>(
      await this.#req("/api/v1/image", "GET"),
    );
    return data;
  }

  async listSshKeys() {
    const { data } = await this.#handleResponse<ApiResponse<Array<UserSshKey>>>(
      await this.#req("/api/v1/ssh-key", "GET"),
    );
    return data;
  }

  async addSshKey(name: string, key: string) {
    const { data } = await this.#handleResponse<ApiResponse<UserSshKey>>(
      await this.#req("/api/v1/ssh-key", "POST", {
        name,
        key_data: key,
      }),
    );
    return data;
  }

  async deleteSshKey(id: number) {
    await this.#handleResponse<ApiResponse<void>>(
      await this.#req(`/api/v1/ssh-key/${id}`, "DELETE"),
    );
  }

  async orderVm(
    template_id: number,
    image_id: number,
    ssh_key_id: number,
    ref_code?: string,
  ) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req("/api/v1/vm", "POST", {
        template_id,
        image_id,
        ssh_key_id,
        ref_code,
      }),
    );
    return data;
  }

  async customPrice(req: VmCustomTemplateRequest) {
    const { data } = await this.#handleResponse<ApiResponse<VmCustomPrice>>(
      await this.#req("/api/v1/vm/custom-template/price", "POST", req),
    );
    return data;
  }

  async orderCustom(
    req: VmCustomTemplateRequest,
    image_id: number,
    ssh_key_id: number,
    ref_code?: string,
  ) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req("/api/v1/vm/custom-template", "POST", {
        ...req,
        image_id,
        ssh_key_id,
        ref_code,
      }),
    );
    return data;
  }

  async renewVm(
    vm_id: number,
    method: string,
    intervals?: number,
    opts?: { saveCard?: boolean; paymentMethodId?: number },
  ) {
    const params = new URLSearchParams({ method });
    if (intervals !== undefined && intervals > 1) {
      params.set("intervals", intervals.toString());
    }
    // Explicitly tokenize the entered card as a reusable payment method,
    // independent of auto-renewal.
    if (opts?.saveCard) {
      params.set("save_card", "true");
    }
    // For method=saved off-session charges: select a specific saved payment method.
    if (opts?.paymentMethodId !== undefined) {
      params.set("payment_method_id", opts.paymentMethodId.toString());
    }
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/vm/${vm_id}/renew?${params.toString()}`, "GET"),
    );
    return data;
  }

  async paymentStatus(id: string) {
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/payment/${id}`, "GET"),
    );
    return data;
  }

  async invoiceLink(id: string) {
    const u = `${this.url}/api/v1/payment/${id}/invoice`;
    const auth = await this.#auth_event(u, "GET");
    const auth_b64 = base64.encode(
      new TextEncoder().encode(JSON.stringify(auth)),
    );
    return `${u}?auth=${auth_b64}`;
  }

  async listPayments(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<Array<VmPayment>>>(
      await this.#req(`/api/v1/vm/${id}/payments`, "GET"),
    );
    return data;
  }

  async getPaymentMethods() {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<PaymentMethod>>
    >(await this.#req("/api/v1/payment/methods", "GET"));
    return data;
  }

  async connect_terminal(id: number) {
    const u = `${this.url}/api/v1/vm/${id}/console`;
    const auth = await this.#auth_event(u, "GET");
    const auth_b64 = base64.encode(
      new TextEncoder().encode(JSON.stringify(auth)),
    );
    // Rewrite http(s):// → ws(s):// so the URL is valid for WebSocket
    const wsUrl = u.replace(/^http(s?):\/\//, "ws$1://");
    const ws = new WebSocket(`${wsUrl}?auth=${auth_b64}`);
    return await new Promise<WebSocket>((resolve, reject) => {
      ws.onopen = () => {
        resolve(ws);
      };
      ws.onerror = (e) => {
        reject(e);
      };
    });
  }

  async listDomains() {
    const { data } = await this.#handleResponse<
      ApiResponse<NostrDomainsResponse>
    >(await this.#req("/api/v1/nostr/domain", "GET"));
    return data;
  }

  async addDomain(domain: string) {
    const { data } = await this.#handleResponse<ApiResponse<NostrDomain>>(
      await this.#req("/api/v1/nostr/domain", "POST", { name: domain }),
    );
    return data;
  }

  async listDomainHandles(id: number) {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<NostrDomainHandle>>
    >(await this.#req(`/api/v1/nostr/domain/${id}/handle`, "GET"));
    return data;
  }

  async addDomainHandle(domain: number, name: string, pubkey: string) {
    const { data } = await this.#handleResponse<ApiResponse<NostrDomainHandle>>(
      await this.#req(`/api/v1/nostr/domain/${domain}/handle`, "POST", {
        name,
        pubkey,
      }),
    );
    return data;
  }

  async deleteDomainHandle(domain_id: number, handle_id: number) {
    await this.#handleResponse<ApiResponse<void>>(
      await this.#req(
        `/api/v1/nostr/domain/${domain_id}/handle/${handle_id}`,
        "DELETE",
      ),
    );
  }

  async getVmHistory(id: number, limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<ApiResponse<Array<VmHistory>>>(
      await this.#req(`/api/v1/vm/${id}/history${query}`, "GET"),
    );
    return data;
  }

  async getVmRenewLnurl(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<LnurlPayResponse>>(
      await this.#req(`/api/v1/vm/${id}/renew-lnurlp`, "GET"),
    );
    return data;
  }

  async getLnurlPay(vm_id: number) {
    const { data } = await this.#handleResponse<ApiResponse<LnurlPayResponse>>(
      await this.#req(`/.well-known/lnurlp/${vm_id}`, "GET"),
    );
    return data;
  }

  async getVmUpgradeQuote(
    vm_id: number,
    req: VmUpgradeRequest,
    method?: string,
  ) {
    const methodParam = method ? `?method=${method}` : "";
    const { data } = await this.#handleResponse<ApiResponse<VmUpgradeQuote>>(
      await this.#req(
        `/api/v1/vm/${vm_id}/upgrade/quote${methodParam}`,
        "POST",
        req,
      ),
    );
    return data;
  }

  async createVmUpgradePayment(
    vm_id: number,
    req: VmUpgradeRequest,
    method?: string,
    opts?: { paymentMethodId?: number },
  ) {
    const params = new URLSearchParams();
    if (method !== undefined) params.set("method", method);
    // For method=saved off-session charges: select a specific saved card.
    if (opts?.paymentMethodId !== undefined) {
      params.set("payment_method_id", opts.paymentMethodId.toString());
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/vm/${vm_id}/upgrade${query}`, "POST", req),
    );
    return data;
  }

  async submitContactForm(req: ContactFormRequest) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/contact", "POST", req),
    );
    return data;
  }

  async listAvailableIpSpace(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<
      PaginatedResponse<AvailableIpSpace>
    >(await this.#req(`/api/v1/ip_space${query}`, "GET"));
    return data;
  }

  async getIpSpace(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<AvailableIpSpace>>(
      await this.#req(`/api/v1/ip_space/${id}`, "GET"),
    );
    return data;
  }

  async listSubscriptionIpRanges(
    subscriptionId: number,
    limit?: number,
    offset?: number,
  ) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<
      PaginatedResponse<IpRangeSubscription>
    >(
      await this.#req(
        `/api/v1/subscriptions/${subscriptionId}/ip_ranges${query}`,
        "GET",
      ),
    );
    return data;
  }

  async addIpRangeToSubscription(
    subscriptionId: number,
    req: AddIpRangeToSubscriptionRequest,
  ) {
    const { data } = await this.#handleResponse<
      ApiResponse<IpRangeSubscription>
    >(
      await this.#req(
        `/api/v1/subscriptions/${subscriptionId}/ip_ranges`,
        "POST",
        req,
      ),
    );
    return data;
  }

  async listSubscriptions(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<
      PaginatedResponse<Subscription>
    >(await this.#req(`/api/v1/subscriptions${query}`, "GET"));
    return data;
  }

  async createSubscription(req: CreateSubscriptionRequest) {
    const { data } = await this.#handleResponse<ApiResponse<Subscription>>(
      await this.#req("/api/v1/subscriptions", "POST", req),
    );
    return data;
  }

  async getSubscription(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<Subscription>>(
      await this.#req(`/api/v1/subscriptions/${id}`, "GET"),
    );
    return data;
  }

  /** Toggle a subscription's automatic renewal. Returns the updated subscription. */
  async patchSubscription(
    id: number,
    req: { auto_renewal_enabled?: boolean },
  ) {
    const { data } = await this.#handleResponse<ApiResponse<Subscription>>(
      await this.#req(`/api/v1/subscriptions/${id}`, "PATCH", req),
    );
    return data;
  }

  async renewSubscription(
    subscriptionId: number,
    method?: string,
    opts?: { saveCard?: boolean; paymentMethodId?: number; intervals?: number },
  ) {
    const params = new URLSearchParams();
    if (method !== undefined) params.set("method", method);
    if (opts?.intervals !== undefined && opts.intervals > 1) {
      params.set("intervals", opts.intervals.toString());
    }
    // Explicitly tokenize the entered card as a reusable payment method,
    // independent of auto-renewal.
    if (opts?.saveCard) {
      params.set("save_card", "true");
    }
    // For method=saved off-session charges: select a specific saved payment method.
    if (opts?.paymentMethodId !== undefined) {
      params.set("payment_method_id", opts.paymentMethodId.toString());
    }
    const { data } = await this.#handleResponse<
      ApiResponse<SubscriptionPayment>
    >(
      await this.#req(
        `/api/v1/subscriptions/${subscriptionId}/renew?${params.toString()}`,
        "GET",
      ),
    );
    return data;
  }

  async listSubscriptionPayments(
    subscriptionId: number,
    limit?: number,
    offset?: number,
  ) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<
      PaginatedResponse<SubscriptionPayment>
    >(
      await this.#req(
        `/api/v1/subscriptions/${subscriptionId}/payments${query}`,
        "GET",
      ),
    );
    return data;
  }

  async enrollReferral(req: ReferralSignupRequest) {
    const { data } = await this.#handleResponse<ApiResponse<Referral>>(
      await this.#req("/api/v1/referral", "POST", req),
    );
    return data;
  }

  async getReferralState() {
    const { data } = await this.#handleResponse<ApiResponse<ReferralState>>(
      await this.#req("/api/v1/referral", "GET"),
    );
    return data;
  }

  async updateReferral(req: ReferralPatchRequest) {
    const { data } = await this.#handleResponse<ApiResponse<Referral>>(
      await this.#req("/api/v1/referral", "PATCH", req),
    );
    return data;
  }

  async leaveReferral() {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/referral", "DELETE"),
    );
    return data;
  }

  async getReferralUsage(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit.toString());
    if (offset !== undefined) params.set("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return await this.#handleResponse<PaginatedResponse<ReferralUsage>>(
      await this.#req(`/api/v1/referral/usage${query}`, "GET"),
    );
  }

  async verifyEmail(token: string) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req(`/api/v1/account/verify-email?token=${token}`, "GET"),
    );
    return data;
  }

  async notificationChannels() {
    const { data } = await this.#handleResponse<
      ApiResponse<NotificationChannels>
    >(await this.#req("/api/v1/notification/channels", "GET"));
    return data;
  }

  async telegramLink() {
    const { data } = await this.#handleResponse<
      ApiResponse<TelegramLinkResponse>
    >(await this.#req("/api/v1/account/telegram/link", "POST"));
    return data;
  }

  async telegramUnlink() {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/account/telegram/link", "DELETE"),
    );
    return data;
  }

  async whatsappVerify(number: string) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/account/whatsapp/verify", "POST", { number }),
    );
    return data;
  }

  async whatsappConfirm(code: string) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/account/whatsapp/confirm", "POST", { code }),
    );
    return data;
  }

  async whatsappUnlink() {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/account/whatsapp/verify", "DELETE"),
    );
    return data;
  }

  async #handleResponse<T extends ApiResponseBase>(rsp: Response) {
    if (rsp.ok) {
      return (await rsp.json()) as T;
    } else {
      const text = await rsp.text();
      try {
        const obj = JSON.parse(text) as ApiResponseBase;
        if (obj.error) {
          return Promise.reject(new Error(obj.error));
        }
      } catch {
        // JSON parse failed
      }
      return Promise.reject(new Error(text));
    }
  }

  async #auth_event(url: string, method: string) {
    return await this.publisher?.generic((eb) => {
      return eb
        .kind(EventKind.HttpAuthentication)
        .tag(["u", url])
        .tag(["method", method]);
    });
  }

  async #auth(url: string, method: string) {
    const auth = await this.#auth_event(url, method);
    if (auth) {
      return `Nostr ${base64.encode(
        new TextEncoder().encode(JSON.stringify(auth)),
      )}`;
    }
  }

  async #req(
    path: string,
    method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH",
    body?: object,
  ) {
    const u = `${this.url}${path}`;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (this.timeout) {
      timeoutId = setTimeout(() => controller.abort(), this.timeout);
    }

    try {
      const response = await fetch(u, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: (await this.#auth(u, method)) ?? "",
        },
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      console.log(`[${method}] ${u} => ${response.status}`);
      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }
}
