import { CostInterval, DiskType, MachineSpec } from "./api"
import VpsCard from "./components/vps-card"
import { GiB } from "./const"

export default function App() {
  const offers: Array<MachineSpec> = [
    {
      id: "2x2x80",
      cpu: 2,
      ram: 2 * GiB,
      disk: {
        type: DiskType.SSD,
        size: 80 * GiB
      },
      cost: {
        interval: CostInterval.Month,
        count: 3,
        currency: "EUR",
      }
    },
    {
      id: "4x4x160",
      cpu: 4,
      ram: 4 * GiB,
      disk: {
        type: DiskType.SSD,
        size: 160 * GiB
      },
      cost: {
        interval: CostInterval.Month,
        count: 5,
        currency: "EUR",
      }
    },
    {
      id: "8x8x400",
      cpu: 8,
      ram: 8 * GiB,
      disk: {
        type: DiskType.SSD,
        size: 400 * GiB
      },
      cost: {
        interval: CostInterval.Month,
        count: 12,
        currency: "EUR",
      }
    }
  ]
  return (
    <div className="w-[700px] mx-auto m-2 p-2">
      <h1>LNVPS</h1>

      <h1>VPS</h1>
      <div className="grid grid-cols-3 gap-2">
        {offers.map(a => <VpsCard spec={a} />)}
      </div>
      <small>
        All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic.
      </small>
    </div>
  )
}
