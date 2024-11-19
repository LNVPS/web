import { SnortContext } from "@snort/system-react";
import { CostInterval, DiskType, MachineSpec } from "./api";
import VpsCard from "./components/vps-card";
import { GiB, NostrProfile } from "./const";
import { NostrSystem } from "@snort/system";
import Profile from "./components/profile";
import LoginButton from "./components/login-button";

import pgp from "../public/lnvps.asc?url";

const Offers: Array<MachineSpec> = [
  {
    id: "2x2x80",
    location: "IE",
    active: true,
    cpu: 2,
    ram: 2 * GiB,
    disk: {
      type: DiskType.SSD,
      size: 80 * GiB,
    },
    cost: {
      interval: CostInterval.Month,
      count: 3,
      currency: "EUR",
    },
  },
  {
    id: "4x4x160",
    location: "IE",
    active: true,
    cpu: 4,
    ram: 4 * GiB,
    disk: {
      type: DiskType.SSD,
      size: 160 * GiB,
    },
    cost: {
      interval: CostInterval.Month,
      count: 5,
      currency: "EUR",
    },
  },
  {
    id: "8x8x400",
    location: "IE",
    active: true,
    cpu: 8,
    ram: 8 * GiB,
    disk: {
      type: DiskType.SSD,
      size: 400 * GiB,
    },
    cost: {
      interval: CostInterval.Month,
      count: 12,
      currency: "EUR",
    },
  },
];

const system = new NostrSystem({
  automaticOutboxModel: false,
  buildFollowGraph: false,
});
[
  "wss://relay.snort.social/",
  "wss://relay.damus.io/",
  "wss://relay.nostr.band/",
  "wss://nos.lol/",
].forEach((a) => system.ConnectToRelay(a, { read: true, write: true }));

export default function App() {
  return (
    <SnortContext.Provider value={system}>
      <div className="w-[700px] mx-auto m-2 p-2">
        <div className="flex items-center justify-between">
          LNVPS
          <LoginButton />
        </div>

        <h1>VPS Offers</h1>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {Offers.map((a) => (
              <VpsCard spec={a} key={a.id} />
            ))}
          </div>

          <small>
            All VPS come with 1x IPv4 and 1x IPv6 address and unmetered
            traffic
          </small>
          <div className="flex flex-col gap-4">
            <b>
              Please email <a href="mailto:sales@lnvps.net">sales</a> after
              paying the invoice with your order id, desired OS and ssh key.
            </b>
            <b>You can also find us on nostr: </b>
            <a target="_blank" href={`nostr:${NostrProfile.encode()}`}>
              <Profile link={NostrProfile} />
            </a>
            <div>
              <a target="_blank" href="http://speedtest.v0l.io">Speedtest</a> | <a href={pgp}>PGP</a>
            </div>
          </div>
        </div>
      </div>
    </SnortContext.Provider>
  );
}
