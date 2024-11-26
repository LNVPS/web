import { EventKind, EventPublisher } from "@snort/system";
import { base64 } from "@scure/base";

export interface ApiResponseBase {
  error?: string;
}

export type ApiResponse<T> = ApiResponseBase & {
  data: T;
};

export interface VmCostPlan {
  id: number;
  name: string;
  created: Date;
  amount: number;
  currency: "EUR" | "BTC";
  interval_amount: number;
  interval_type: string;
}

export interface VmHostRegion {
  id: number;
  name: string;
  enabled: boolean;
}

export interface VmTemplate {
  id: number;
  name: string;
  enabled: boolean;
  created: Date;
  expires?: Date;
  cpu: number;
  memory: number;
  disk_size: number;
  disk_type: string;
  disk_interface: string;
  cost_plan_id: number;
  region_id: number;

  cost_plan?: VmCostPlan;
  region?: VmHostRegion;
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

export interface VmInstance {
  id: number;
  host_id: number;
  user_id: number;
  image_id: number;
  template_id: number;
  ssh_key_id: number;
  created: Date;
  expires: Date;
  cpu: number;
  memory: number;
  disk_size: number;
  disk_id: number;
  status?: VmStatus;

  template?: VmTemplate;
  image?: VmOsImage;
  ssh_key?: UserSshKey;
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
  invoice: string;
  created: string;
  expires: string;
  amount: number;
  is_paid: boolean;
}

export class LNVpsApi {
  constructor(
    readonly url: string,
    readonly publisher: EventPublisher | undefined,
  ) {}

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

  async listOffers() {
    const { data } = await this.#handleResponse<ApiResponse<Array<VmTemplate>>>(
      await this.#req("/api/v1/vm/templates", "GET"),
    );
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

  async orderVm(template_id: number, image_id: number, ssh_key_id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmInstance>>(
      await this.#req("/api/v1/vm", "POST", {
        template_id,
        image_id,
        ssh_key_id,
      }),
    );
    return data;
  }

  async renewVm(vm_id: number) {
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/vm/${vm_id}/renew`, "GET"),
    );
    return data;
  }

  async paymentStatus(id: string) {
    const { data } = await this.#handleResponse<ApiResponse<VmPayment>>(
      await this.#req(`/api/v1/payment/${id}`, "GET"),
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

  async #req(path: string, method: "GET" | "POST" | "DELETE", body?: object) {
    const auth = async (url: string, method: string) => {
      const auth = await this.publisher?.generic((eb) => {
        return eb
          .kind(EventKind.HttpAuthentication)
          .tag(["u", url])
          .tag(["method", method]);
      });
      if (auth) {
        return `Nostr ${base64.encode(
          new TextEncoder().encode(JSON.stringify(auth)),
        )}`;
      }
    };

    const u = `${this.url}${path}`;
    return await fetch(u, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: (await auth(u, method)) ?? "",
      },
    });
  }
}
