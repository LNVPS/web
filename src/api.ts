export interface MachineSpec {
  id: string;
  cpu: number;
  ram: number;
  disk: {
    type: DiskType;
    size: number;
  };
  cost: {
    interval: CostInterval;
    count: number;
    currency: CostCurrency;
  };
}

export enum DiskType {
  HDD,
  SSD,
}

export enum CostInterval {
  Hour,
  Day,
  Month,
  Year,
}

export type CostCurrency = "EUR" | "USD" | "BTC";
