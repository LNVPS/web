import { EventKind, EventPublisher } from "@snort/system";
import { base64 } from "@scure/base";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export interface ApiResponseBase {
  error?: string;
}

export type ApiResponse<T> = ApiResponseBase & {
  data: T;
};

/**
 * Short-lived credential for endpoints a browser cannot send an
 * `Authorization` header to (WebSocket handshakes, HTML navigations).
 *
 * Minted by `POST /api/v1/auth/ticket` and passed as `?ticket=`. Valid for one
 * use, for one path, for `expires_in` seconds — so a copy that ends up in an
 * access log or browser history is inert.
 */
export interface AuthTicket {
  ticket: string;
  /** Lifetime in seconds. */
  expires_in: number;
}

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
  ALMALINUX = "almalinux",
  ROCKYLINUX = "rockylinux",
  ALPINE = "alpine",
  NIXOS = "nixos",
  OPENBSD = "openbsd",
  NETBSD = "netbsd",
  GENTOO = "gentoo",
  VOIDLINUX = "voidlinux",
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
  | "lnurl"
  | "onchain";

export type PaymentTypeValue = "new" | "renew" | "upgrade";

export type PaymentTypeMethod = "Purchase" | "Renewal" | "Upgrade";

export interface AccountDetail {
  email?: string;
  email_verified?: boolean;
  /**
   * Read-only. Only 'nostr' accounts have a usable Nostr key — hide npub /
   * NIP-17 UI for 'oauth' and 'webauthn' (passkey) accounts. Defaults to
   * 'nostr' when omitted by older API versions.
   */
  account_type?: "nostr" | "oauth" | "webauthn";
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
  min_ip4: number;
  max_ip4: number;
  min_ip6: number;
  max_ip6: number;
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
  ip4_count?: number;
  ip6_count?: number;
}

export interface VmCustomPrice {
  currency: string;
  amount: number;
  interval_amount: number;
  interval_type: CostPlanIntervalType;
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
  ip4_count: number;
  ip6_count: number;
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
  /**
   * Set when the VM's host is being decommissioned — migrate before this date.
   * Renewals are blocked once `expires` reaches it. Omitted otherwise.
   */
  host_sunset_date?: string;
  /**
   * Max days this VM may be prepaid/renewed in advance. A renewal is rejected
   * once it would push `expires` beyond now + this window; cap the renewal
   * interval selector accordingly.
   */
  max_prepay_days?: number;
  /**
   * CPU architecture of the host this VM runs on. Unlike the optional
   * `template.cpu_arch` constraint, this is present whenever the host arch is
   * known — use it to filter OS images for a reinstall. Omitted if unknown.
   */
  cpu_arch?: CpuArch;
  /**
   * The VM's own SSH host keys, scanned from the guest after boot — for
   * verifying the host on first connect instead of trusting whatever key it
   * presents. Always an array, empty until the scan succeeds, and
   * re-captured after a reinstall. Not the same as `ssh_key`, the customer's
   * authorized key.
   */
  host_ssh_keys: Array<VmSshHostKey>;
}

export interface VmSshHostKey {
  /** Key algorithm, e.g. "ssh-ed25519". */
  key_type: string;
  /** Base64 key blob, without the algorithm prefix or a comment. */
  public_key: string;
  /**
   * `SHA256:…` fingerprint over the decoded key blob — the form
   * `ssh-keygen -lf` prints and the one a client shows on an unknown host.
   */
  fingerprint_sha256: string;
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
  /** Fraction (0.0–1.0) of active VMs currently using this image. */
  popularity?: number;
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
  | { stripe: { session_id: string } }
  | {
      onchain: {
        address: string;
        /**
         * "{txid}:{vout}", set as soon as a deposit is seen in the mempool
         * (0-conf) before it confirms — lets the UI show "received, waiting
         * for confirmation". Absent until a deposit is detected; confirmed
         * once `is_paid` is true.
         */
        outpoint?: string;
      };
    };

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

/** Public exchange-rate snapshot (issue #230). */
export interface ExchangeRates {
  /** ISO 8601 server read time (rates refresh on a ~5 min cache). */
  updated: string;
  /** Base currency; `rates` excludes it (implicit rate 1). */
  base: string;
  /** `1 unit of base = rates[X] units of X` (standard units). */
  rates: Record<string, number>;
}

export interface PaymentMethod {
  name: PaymentMethodType;
  metadata?: Record<string, string>;
  currencies: Array<"BTC" | "EUR" | "USD">;
  processing_fee_rate?: number;
  processing_fee_base?: number;
  processing_fee_currency?: string;
  /** Minimum processable amount in smallest currency units; payments below
   * this are rejected for this method. */
  min_amount?: number;
  /** Currency for `min_amount` (e.g. "EUR"). */
  min_amount_currency?: string;
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
  /** Seller company; match against `account.tax[].company_id` for the VAT rate. */
  company_id: number;
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
  | { type: "ip_range"; ip_range_subscription_id: number }
  | { type: "asn"; asn_subscription_id: number }
  | { type: "app"; app_deployment_id: number };

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

/** A predefined, Docker-deployed app from the managed catalog. */
export interface App {
  id: number;
  /** URL/DNS-safe slug. */
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  /** docker-compose-style YAML; the config form (ports/env) is rendered from this. */
  compose: string;
  /** Canonical source repository URL (e.g. https://github.com/owner/repo). */
  repo_url?: string;
  /** Recurring price in smallest currency units. */
  amount: number;
  currency: string;
  interval_amount: number;
  interval_type: CostPlanIntervalType;
  /** One-off setup fee in smallest currency units (0 = none). */
  setup_amount: number;
  /** Total requested CPU in millicores (Σ service resources). */
  cpu_milli: number;
  /** Total requested memory in bytes. */
  memory_bytes: number;
  /** Total persistent storage in bytes (Σ volume sizes). */
  storage_bytes: number;
  /** Per-service footprint breakdown (sums to the totals above). */
  services: Array<AppServiceResources>;
  /**
   * Per-volume storage breakdown, summing to `storage_bytes` (LNVPS/api#260).
   *
   * Optional because an API older than that release does not send it at all —
   * not because an app may have no volumes, which arrives as `[]`.
   */
  volumes?: Array<AppVolume>;
  /**
   * Class of software, sentence case — "Nostr relay" (LNVPS/api#241). Always
   * sent by that release and later; optional here only for an older build.
   */
  category?: string;
  /** Per-app override for the page `<title>`; null for almost every app. */
  seo_title?: string;
  /** Per-app override for the meta description; null for almost every app. */
  seo_description?: string;
  /**
   * Grouping labels for filtering and tag landing pages (LNVPS/api#258). An
   * app carrying none arrives as `[]`; optional here only for an API build
   * older than that release.
   */
  tags?: Array<AppTag>;
}

/** A grouping label as it appears on an app. */
export interface AppTag {
  /** URL-safe; also the value to send back as `?tag=`. */
  slug: string;
  /** Ready to render. Never derived from `slug` — `nip-96` is `NIP-96`. */
  display_name: string;
}

/** One persistent volume of an app (LNVPS/api#260). */
export interface AppVolume {
  /** Compose service it belongs to; a volume name is only unique within one. */
  service: string;
  /** Compose volume name — internal plumbing. Render `label`, not this. */
  name: string;
  /**
   * What the buyer gets from it: `events`, `media`, `database`. Authored per
   * app, so it arrives over the wire in English and is never translated.
   * Absent for volumes nobody shops for (`run`, `packs`).
   */
  label?: string;
  /** Size in bytes. These sum to `storage_bytes`. */
  size_bytes: number;
}

/** One service's share of an app's resource footprint. */
export interface AppServiceResources {
  name: string;
  cpu_milli: number;
  memory_bytes: number;
  storage_bytes: number;
}

export interface CreateAppDeploymentRequest {
  app_id: number;
  /** DNS-safe label (lowercase letters/digits/hyphens, ≤40); becomes the subdomain. */
  name: string;
  /** Region to deploy in; a cluster there with capacity is chosen. */
  region_id: number;
  /** Values for the app's compose `config` fields. */
  config?: Record<string, string>;
}

/** A region an app can be deployed into. */
export interface AppRegion {
  id: number;
  name: string;
  /** Whether a cluster in this region currently has free capacity for the app. */
  available: boolean;
  /** Wildcard base domain; a deployment's host is `{name}.{ingress_domain}`. */
  ingress_domain: string;
}

export type AppDeploymentState = "running" | "stopped";
export type AppDeploymentStatus =
  | "pending"
  | "running"
  | "stopped"
  | "error"
  | "deleting";

/**
 * Billing verdict on a deployment's subscription (LNVPS/api#253).
 *
 * `unpaid` is "the first payment has never been confirmed", not "overdue" —
 * a subscription never paid for reports `unpaid` whatever its expiry says,
 * because asking someone to renew what they never bought is worse than asking
 * them to buy it.
 */
export type AppDeploymentBillingState = "unpaid" | "active" | "expired";

/** One service's share of a deployment's observed CPU and memory. */
export interface AppDeploymentServiceUsage {
  /** Compose service name. */
  service: string;
  cpu_milli: number;
  memory_bytes: number;
}

/** One volume's observed use. */
export interface AppDeploymentVolumeUsage {
  /** Compose service this volume belongs to. */
  service: string;
  /** Compose volume name. */
  name: string;
  storage_bytes: number;
}

/**
 * Live resource usage the cluster reports for a deployment. Sampled on the
 * operator's reconcile interval, not on request — always somewhat stale, so
 * render it with the age of the reading.
 */
export interface AppDeploymentUsage {
  cpu_milli: number;
  memory_bytes: number;
  /** Total volume usage; absent when no volumes exist or kubelet stats are unavailable. */
  storage_bytes?: number;
  /** When the reading was taken. */
  collected: string;
  /**
   * Per-service CPU and memory behind the totals. Absent on readings taken
   * before the operator reported the breakdown, so render it defensively.
   */
  services?: AppDeploymentServiceUsage[];
  /** Per-volume storage behind the total. Absent like `services`. */
  volumes?: AppDeploymentVolumeUsage[];
}

/** A user's running instance of a catalog app. */
export interface AppDeployment {
  id: number;
  /** Catalog app being run. */
  app_id: number;
  /** The user's instance name. */
  name: string;
  /** Public endpoint host once assigned (absent until reconciled, or if the app has no ingress). */
  hostname?: string;
  /** Customer-owned domain CNAME'd at `hostname`, served alongside it with its own TLS cert. */
  custom_domain?: string;
  desired_state: AppDeploymentState;
  status: AppDeploymentStatus;
  /** Operator status/error detail when present. */
  status_message?: string;
  /** Subscription this deployment is billed under (renew via the subscription endpoints). */
  subscription_id?: number;
  /**
   * Whether the subscription behind this deployment has ever been paid, and
   * whether it has lapsed (LNVPS/api#253).
   *
   * Independent of `status` and `desired_state` on purpose: a never-paid
   * deployment is written back by the operator as `stopped`, so status alone
   * cannot tell "never paid for" from "the customer stopped it".
   *
   * `null`/absent means the subscription could not be resolved — the same
   * condition that leaves `subscription_id` unset. That is an operational
   * fault, not a billing verdict: treat it as unknown, never as `unpaid`, or
   * a paying customer gets asked for money again.
   */
  billing_state?: AppDeploymentBillingState | null;
  /**
   * Size as a multiple of the catalog app's base footprint and price; `1` is
   * the base app. Raised via the upgrade endpoints, never lowered.
   */
  resource_multiplier: number;
  /**
   * Effective resources with `resource_multiplier` already applied — the API
   * pre-multiplies so the UI never has to. Showing the catalog app's figures
   * for an upgraded deployment displays a size the customer is not running.
   */
  cpu_milli: number;
  memory_bytes: number;
  storage_bytes: number;
  /** Live resource usage, absent for a deployment that has not been measured yet. */
  usage?: AppDeploymentUsage;
  /** Current customer-supplied config field values (secrets never exposed). */
  config?: Record<string, string>;
  created: string;
}

/** Resize a deployment to a larger multiple of its app's base size. */
export interface AppUpgradeRequest {
  resource_multiplier: number;
}

/**
 * Largest size a deployment may be upgraded to, as a multiple of the base app.
 * Mirrors `MAX_RESOURCE_MULTIPLIER` in the API (`lnvps_api/src/api/apps.rs`),
 * which rejects anything above it with a 400.
 */
export const MAX_RESOURCE_MULTIPLIER = 16;

export interface AppUpgradeQuote {
  /** Net pro-rated amount payable now (before tax/fees) for the rest of the period. */
  cost_difference: Price;
  /** What a full period costs at the new size, from the next renewal. */
  new_renewal_cost: Price;
  /** Credit for time already paid for at the current size. */
  discount: Price;
  tax: Price;
  processing_fee: Price;
}

/** Update a deployment's name, custom domain and/or config (config replaces wholesale). */
export interface PatchAppDeploymentRequest {
  name?: string;
  config?: Record<string, string>;
  /** Customer-owned hostname; `""`/`null` clears it, omit to leave unchanged. */
  custom_domain?: string | null;
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
  | "account_credit"
  | "on_chain";

export interface Referral {
  code: string;
  /**
   * Payout target address; its type is implied by `mode`: a Lightning address
   * for `lightning_address`, an on-chain Bitcoin (mainnet) address for
   * `on_chain`, absent for `nwc`.
   */
  address?: string;
  /** Payout method: `lightning_address`, `nwc`, `account_credit`, or `on_chain`. */
  mode: ReferralPayoutMode;
  /**
   * Chosen minimum accrued commission (in **satoshis**) before an automated
   * payout is made — raise it to avoid many tiny payouts (useful on-chain).
   * `null`/undefined uses the system minimum; effective threshold is
   * `max(system minimum, this value)`.
   */
  payout_threshold?: number | null;
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
  /**
   * How this payout was made; tells you how to interpret `output`:
   * `lightning_address`/`nwc` → BOLT11 invoice, `on_chain` → outpoint.
   */
  mode: ReferralPayoutMode;
  /**
   * Payout output reference: a BOLT11 invoice for a Lightning payout, or the
   * on-chain outpoint "{txid}:{vout}" for an on-chain payout (batches share the
   * txid, distinct vouts).
   */
  output?: string;
  /** Payment preimage (hex), present once a Lightning payout has settled. */
  pre_image?: string;
  /**
   * Network/routing fee charged to the referrer for this payout (smallest
   * currency unit), debited from the balance alongside `amount`. On-chain
   * payout batches split the transaction fee proportionally.
   */
  fee: number;
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
  /**
   * Payout target address, validated according to `mode`: a Lightning address
   * for `lightning_address`, an on-chain Bitcoin address for `on_chain`. Not
   * needed for `nwc`.
   */
  address?: string;
  /** Payout method: `lightning_address` (default), `nwc`, or `on_chain`. */
  mode?: ReferralPayoutMode;
  /**
   * Minimum accrued commission (satoshis) before an automated payout. Must be
   * at least the system minimum. Omit to use the system minimum.
   */
  payout_threshold?: number;
}

export interface ReferralPatchRequest {
  /**
   * Set (string) or clear (null) the payout address; omit to leave unchanged.
   * Validated against the effective `mode`.
   */
  address?: string | null;
  /** Payout method: `lightning_address`, `nwc`, or `on_chain`. */
  mode?: ReferralPayoutMode;
  /**
   * Set (sats) or clear (null) the minimum-payout threshold; omit to leave
   * unchanged. When set it must be at least the system minimum.
   */
  payout_threshold?: number | null;
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

/** WebAuthn ceremony options returned by a `.../start` endpoint. */
export interface WebauthnRegisterStart {
  challenge: { publicKey: PublicKeyCredentialCreationOptionsJSON };
  state: string;
}

export interface WebauthnLoginStart {
  challenge: { publicKey: PublicKeyCredentialRequestOptionsJSON };
  state: string;
}

/** Session token issued by a passkey register/login `finish` endpoint. */
export interface WebauthnToken {
  token: string;
  token_type: string;
  expires_in: number;
}

/** A passkey (WebAuthn credential) registered to an account. */
export interface Passkey {
  id: number;
  name?: string;
  created: string;
  last_used?: string;
}

export class LNVpsApi {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher | undefined,
    readonly timeout?: number,
    /** OAuth session JWT. When set, requests use `Authorization: Bearer <token>`. */
    readonly token?: string,
  ) {}

  async getAccount() {
    const { data } = await this.#handleResponse<ApiResponse<AccountDetail>>(
      await this.#req("/api/v1/account", "GET"),
    );
    return data;
  }

  /** Public exchange rates. Convert A→B as `rates[B] / rates[A]` (base = 1). */
  async getExchangeRates(base?: string) {
    const q = base ? `?base=${encodeURIComponent(base)}` : "";
    const { data } = await this.#handleResponse<ApiResponse<ExchangeRates>>(
      await this.#req(`/api/v1/exchange-rate${q}`, "GET"),
    );
    return data;
  }

  /** Managed app catalog (read-only). */
  async listApps() {
    const { data } = await this.#handleResponse<ApiResponse<Array<App>>>(
      await this.#req("/api/v1/apps", "GET"),
    );
    return data;
  }

  async getApp(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<App>>(
      await this.#req(`/api/v1/apps/${id}`, "GET"),
    );
    return data;
  }

  /** Regions an app can deploy in; `available` reflects current free capacity. */
  async listAppRegions(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<Array<AppRegion>>>(
      await this.#req(`/api/v1/apps/${id}/regions`, "GET"),
    );
    return data;
  }

  /** The caller's app deployments (most recent first). */
  async listAppDeployments() {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<AppDeployment>>
    >(await this.#req("/api/v1/app-deployments", "GET"));
    return data;
  }

  async getAppDeployment(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<AppDeployment>>(
      await this.#req(`/api/v1/app-deployments/${id}`, "GET"),
    );
    return data;
  }

  /**
   * Order an app deployment. Returns the deployment in `pending` state with a
   * billing subscription — pay the subscription to activate it.
   */
  async createAppDeployment(req: CreateAppDeploymentRequest) {
    const { data } = await this.#handleResponse<ApiResponse<AppDeployment>>(
      await this.#req("/api/v1/app-deployments", "POST", req),
    );
    return data;
  }

  /** Update a deployment's name, custom domain and/or config; operator re-applies it. */
  async patchAppDeployment(id: number, req: PatchAppDeploymentRequest) {
    const { data } = await this.#handleResponse<ApiResponse<AppDeployment>>(
      await this.#req(`/api/v1/app-deployments/${id}`, "PATCH", req),
    );
    return data;
  }

  async startAppDeployment(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<AppDeployment>>(
      await this.#req(`/api/v1/app-deployments/${id}/start`, "PATCH"),
    );
    return data;
  }

  async stopAppDeployment(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<AppDeployment>>(
      await this.#req(`/api/v1/app-deployments/${id}/stop`, "PATCH"),
    );
    return data;
  }

  /**
   * Price a resize without charging anything. `method` sets the currency the
   * quote comes back in. Rejects a multiplier that is not strictly greater than
   * the current one, is above {@link MAX_RESOURCE_MULTIPLIER}, or belongs to a
   * deployment with no paid period to prorate against.
   */
  async getAppUpgradeQuote(
    id: number,
    req: AppUpgradeRequest,
    method?: string,
  ) {
    const methodParam = method ? `?method=${method}` : "";
    const { data } = await this.#handleResponse<ApiResponse<AppUpgradeQuote>>(
      await this.#req(
        `/api/v1/app-deployments/${id}/upgrade-quote${methodParam}`,
        "POST",
        req,
      ),
    );
    return data;
  }

  /**
   * Start a resize by creating its payment. The deployment is only resized once
   * this settles, so an abandoned upgrade leaves it untouched.
   */
  async createAppUpgradePayment(
    id: number,
    req: AppUpgradeRequest,
    method?: string,
    opts?: { paymentMethodId?: number },
  ) {
    const params = new URLSearchParams();
    if (method !== undefined) params.set("method", method);
    if (opts?.paymentMethodId !== undefined) {
      params.set("payment_method_id", opts.paymentMethodId.toString());
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const { data } = await this.#handleResponse<
      ApiResponse<SubscriptionPayment>
    >(
      await this.#req(
        `/api/v1/app-deployments/${id}/upgrade${query}`,
        "POST",
        req,
      ),
    );
    return data;
  }

  /** Stop billing and tear the deployment down (namespace + volumes removed). */
  async deleteAppDeployment(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<boolean>>(
      await this.#req(`/api/v1/app-deployments/${id}`, "DELETE"),
    );
    return data;
  }

  async updateAccount(acc: AccountDetail) {
    const { data } = await this.#handleResponse<
      ApiResponse<UpdateAccountResponse>
    >(await this.#req("/api/v1/account", "PATCH", acc));
    return data;
  }

  /**
   * Invalidate every outstanding session token for this account — "log out
   * everywhere".
   *
   * Only affects `Bearer` sessions (OAuth / passkey logins); a Nostr key has no
   * server-issued token to revoke. The caller's own token is invalidated too,
   * so the UI must drop the local session afterwards.
   */
  async revokeAllSessions() {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/account/sessions", "DELETE"),
    );
    return data;
  }

  // --- Passkey (WebAuthn) authentication -------------------------------------
  // The register/login ceremonies are unauthenticated: call them on a
  // token-less client (`new LNVpsApi(ApiUrl, undefined)`).

  /** Begin passkey registration for a NEW account. */
  async webauthnRegisterStart(name?: string) {
    const { data } = await this.#handleResponse<
      ApiResponse<WebauthnRegisterStart>
    >(
      await this.#req("/api/v1/webauthn/register/start", "POST", { name }),
    );
    return data;
  }

  /** Complete passkey registration; creates the account and returns a token. */
  async webauthnRegisterFinish(
    state: string,
    credential: RegistrationResponseJSON,
    name?: string,
  ) {
    const { data } = await this.#handleResponse<ApiResponse<WebauthnToken>>(
      await this.#req("/api/v1/webauthn/register/finish", "POST", {
        state,
        credential,
        name,
      }),
    );
    return data;
  }

  /** Begin usernameless passkey login. */
  async webauthnLoginStart() {
    const { data } = await this.#handleResponse<ApiResponse<WebauthnLoginStart>>(
      await this.#req("/api/v1/webauthn/login/start", "POST"),
    );
    return data;
  }

  /** Complete passkey login; returns a session token. */
  async webauthnLoginFinish(
    state: string,
    credential: AuthenticationResponseJSON,
  ) {
    const { data } = await this.#handleResponse<ApiResponse<WebauthnToken>>(
      await this.#req("/api/v1/webauthn/login/finish", "POST", {
        state,
        credential,
      }),
    );
    return data;
  }

  // --- Passkey management (authenticated) ------------------------------------

  /** List passkeys registered to the current account. */
  async listPasskeys() {
    const { data } = await this.#handleResponse<ApiResponse<Array<Passkey>>>(
      await this.#req("/api/v1/webauthn/credentials", "GET"),
    );
    return data;
  }

  /** Begin adding a passkey to the current account. */
  async addPasskeyStart(name?: string) {
    const { data } = await this.#handleResponse<
      ApiResponse<WebauthnRegisterStart>
    >(
      await this.#req("/api/v1/webauthn/credentials/start", "POST", { name }),
    );
    return data;
  }

  /** Complete adding a passkey; returns the created credential. */
  async addPasskeyFinish(
    state: string,
    credential: RegistrationResponseJSON,
    name?: string,
  ) {
    const { data } = await this.#handleResponse<ApiResponse<Passkey>>(
      await this.#req("/api/v1/webauthn/credentials/finish", "POST", {
        state,
        credential,
        name,
      }),
    );
    return data;
  }

  /** Remove a passkey from the current account. */
  async deletePasskey(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req(`/api/v1/webauthn/credentials/${id}`, "DELETE"),
    );
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

  async reinstallVm(id: number, image_id?: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req(
        `/api/v1/vm/${id}/re-install`,
        "PATCH",
        image_id !== undefined ? { image_id } : undefined,
      ),
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

  /**
   * List OS images. Pass `arch` to return only images compatible with that
   * CPU architecture (plus architecture-agnostic images).
   */
  async listOsImages(arch?: CpuArch) {
    const q =
      arch && arch !== CpuArch.UNKNOWN
        ? `?arch=${encodeURIComponent(arch)}`
        : "";
    const { data } = await this.#handleResponse<ApiResponse<Array<VmOsImage>>>(
      await this.#req(`/api/v1/image${q}`, "GET"),
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

  async invoiceLink(id: string) {
    const path = `/api/v1/payment/${id}/invoice`;
    const ticket = await this.#authTicket(path);
    return `${this.url}${path}?ticket=${encodeURIComponent(ticket)}`;
  }

  async getPaymentMethods() {
    const { data } = await this.#handleResponse<
      ApiResponse<Array<PaymentMethod>>
    >(await this.#req("/api/v1/payment/methods", "GET"));
    return data;
  }

  async connect_terminal(id: number) {
    const path = `/api/v1/vm/${id}/console`;
    const ticket = await this.#authTicket(path);
    // Rewrite http(s):// → ws(s):// so the URL is valid for WebSocket
    const wsUrl = `${this.url}${path}`.replace(/^http(s?):\/\//, "ws$1://");
    const ws = new WebSocket(`${wsUrl}?ticket=${encodeURIComponent(ticket)}`);
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

  /**
   * Fetch a single subscription payment — the item form of
   * `listSubscriptionPayments`, for polling a checkout awaiting settlement.
   */
  async getSubscriptionPayment(subscriptionId: number, paymentId: string) {
    const { data } = await this.#handleResponse<
      ApiResponse<SubscriptionPayment>
    >(
      await this.#req(
        `/api/v1/subscriptions/${subscriptionId}/payments/${paymentId}`,
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
    if (this.token) {
      return `Bearer ${this.token}`;
    }
    const auth = await this.#auth_event(url, method);
    if (auth) {
      return `Nostr ${base64.encode(
        new TextEncoder().encode(JSON.stringify(auth)),
      )}`;
    }
  }

  /**
   * Mint a single-use ticket for an endpoint that cannot receive an
   * `Authorization` header (the WebSocket console, the invoice page).
   *
   * `path` must be the exact path the ticket will be used on — the server binds
   * the ticket to it and refuses it anywhere else. Mint immediately before use:
   * tickets expire in ~30s and die on first use.
   *
   * This replaces the older `?auth=<base64 nip98 event>` scheme, which put a
   * signature made by the user's identity key into a URL, and which never
   * worked at all for OAuth/passkey sessions (the server only ever parsed that
   * parameter as a Nostr event, so a Bearer JWT was rejected).
   */
  async #authTicket(path: string) {
    const { data } = await this.#handleResponse<ApiResponse<AuthTicket>>(
      await this.#req("/api/v1/auth/ticket", "POST", { path }),
    );
    return data.ticket;
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
          ...(body ? { "content-type": "application/json" } : {}),
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
