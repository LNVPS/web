import { useState, useEffect } from "react";
import { VmTemplate, LNVpsApi } from "../api";
import Profile from "../components/profile";
import VpsCard from "../components/vps-card";
import { ApiUrl, NostrProfile } from "../const";

export default function HomePage() {
  const [offers, setOffers] = useState<Array<VmTemplate>>([]);

  useEffect(() => {
    const api = new LNVpsApi(ApiUrl, undefined);
    api.listOffers().then((o) => setOffers(o));
  }, []);

  return (
    <>
      <h1>VPS Offers</h1>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {offers.map((a) => (
            <VpsCard spec={a} key={a.id} />
          ))}
        </div>

        <small>
          All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic
        </small>
        <div className="flex flex-col gap-4">
          <b>You can also find us on nostr: </b>
          <a target="_blank" href={`nostr:${NostrProfile.encode()}`}>
            <Profile link={NostrProfile} />
          </a>
          <div>
            <a target="_blank" href="http://speedtest.v0l.io">
              Speedtest
            </a>
            {" "}
            <a href="/lnvps.asc">PGP</a>
            {" "}
            <a href="https://lnvps1.statuspage.io/" target="_blank">Status</a>
          </div>
        </div>
      </div>
    </>
  );
}
