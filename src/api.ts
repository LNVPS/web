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

export interface AccountDetail {
  email?: string;
  contact_nip17: boolean;
  contact_email: boolean;
  country_code?: string;
  name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  tax_id?: string;
  nwc_connection_string?: string;
}

export interface VmCostPlan {
  id: number;
  name: string;
  amount: number;
  currency: string;
  interval_amount: number;
  interval_type: string;
}

export interface VmHostRegion {
  id: number;
  name: string;
}

export interface VmCustomTemplateParams {
  id: number;
  name: string;
  region: VmHostRegion;
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
  created: Date;
  expires?: Date;
  cpu: number;
  memory: number;
  disk_size: number;
  disk_type: DiskType;
  disk_interface: DiskInterface;
  cost_plan: VmCostPlan;
  region: VmHostRegion;
}

export interface VmStatus {
  state: "running" | "stopped";
  cpu_usage: number;
  mem_usage: number;
  uptime: number;
  net_in: number;
  net_out: number;
  disk_write: number;
  disk_read: number;
}

export interface VmIpAssignment {
  id: number;
  ip: string;
  gateway: string;
  forward_dns?: string;
  reverse_dns?: string;
}

export interface VmInstance {
  id: number;
  created: string;
  expires: string;
  status?: VmStatus;
  mac_address: string;
  template: VmTemplate;
  image: VmOsImage;
  ssh_key: UserSshKey;
  ip_assignments: Array<VmIpAssignment>;
  auto_renewal_enabled?: boolean;
}

export interface VmOsImage {
  id: number;
  distribution: string;
  flavour: string;
  version: string;
  release_date: string;
  default_username?: string;
}

export interface UserSshKey {
  id: number;
  name: string;
}

export type PaymentData =
  | { lightning: string }
  | { revolut: { token: string } };

export interface VmPayment {
  id: string;
  vm_id: number;
  created: string;
  expires: string;
  amount: number;
  tax: number;
  currency: string;
  is_paid: boolean;
  data: PaymentData;
  time: number;
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
  name: string;
  currencies: Array<string>;
  metadata?: Record<string, string>;
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
  created: Date;
  relays: Array<string>;
}

export interface NostrDomainHandle {
  id: number;
  domain_id: number;
  handle: string;
  created: Date;
  pubkey: string;
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
  currency: string;
  amount: number;
}

export interface VmUpgradeQuote {
  cost_difference: Price;
  new_renewal_cost: Price;
  discount: Price;
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
  name: string;
  description?: string;
  created: string;
  expires?: string;
  is_active: boolean;
  currency: string;
  interval_amount: number;
  interval_type: string;
  setup_fee: number;
  auto_renewal_enabled: boolean;
  line_items: Array<SubscriptionLineItem>;
}

export interface SubscriptionLineItem {
  id: number;
  subscription_id: number;
  name: string;
  description?: string;
  amount: number;
  setup_amount: number;
  configuration?: any;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: number;
  created: string;
  expires?: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_type: string;
  is_paid: boolean;
  rate?: number;
  time_value: number;
  tax: number;
  external_id?: string;
}

export interface SubscriptionSummary {
  active_subscriptions: number;
  total_monthly_cost: number;
  currency: string;
}

export type PaginatedResponse<T> = ApiResponseBase & {
  data: Array<T>;
  total: number;
  limit: number;
  offset: number;
};

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
    const { data } = await this.#handleResponse<ApiResponse<void>>(
      await this.#req("/api/v1/account", "PATCH", acc),
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

  async renewVm(vm_id: number, method: string) {
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/vm/${vm_id}/renew?method=${method}`, "GET"),
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
    const ws = new WebSocket(`${u}?auth=${auth_b64}`);
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

  async getVmHistory(id: number) {
    const { data } = await this.#handleResponse<ApiResponse<Array<VmHistory>>>(
      await this.#req(`/api/v1/vm/${id}/history`, "GET"),
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
  ) {
    const methodParam = method ? `?method=${method}` : "";
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/vm/${vm_id}/upgrade${methodParam}`, "POST", req),
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

  async #handleResponse<T extends ApiResponseBase>(rsp: Response) {
    if (rsp.ok) {
      return (await rsp.json()) as T;
    } else {
      const text = await rsp.text();
      try {
        const obj = JSON.parse(text) as ApiResponseBase;
        throw new Error(obj.error);
      } catch {
        throw new Error(text);
      }
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
    let timeoutId: number | undefined;

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
      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }
}
