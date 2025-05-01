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
}

export interface VmOsImage {
  id: number;
  distribution: string;
  flavour: string;
  version: string;
  release_date: string;
}

export interface UserSshKey {
  id: number;
  name: string;
}

export interface VmPayment {
  id: string;
  created: string;
  expires: string;
  amount: number;
  currency: string;
  tax: number;
  is_paid: boolean;
  time: number;
  data: {
    lightning?: string;
    revolut?: {
      token: string;
    };
  };
}

export interface PatchVm {
  ssh_key_id?: number;
  reverse_dns?: string;
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

export class LNVpsApi {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher | undefined,
  ) { }

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

  async reisntallVm(id: number) {
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
    const ws = new WebSocket(
      `${u}?auth=${base64.encode(
        new TextEncoder().encode(JSON.stringify(auth)),
      )}`,
    );
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
    return await fetch(u, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: (await this.#auth(u, method)) ?? "",
      },
    });
  }
}
