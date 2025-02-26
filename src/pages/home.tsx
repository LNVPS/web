import { useState, useEffect } from "react";
import { VmTemplate, LNVpsApi } from "../api";
import Profile from "../components/profile";
import VpsCard from "../components/vps-card";
import { ApiUrl, NostrProfile } from "../const";
import { Link } from "react-router-dom";

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
        <div className="flex flex-col gap-6">
          <a target="_blank" href={`https://snort.social/${NostrProfile.encode()}`}>
            <Profile link={NostrProfile} />
          </a>
          <div className="text-center">
            <a target="_blank" href="http://speedtest.v0l.io">
              Speedtest
            </a>
            {" | "}
            <a href="/lnvps.asc">PGP</a>
            {" | "}
            <a href="https://lnvps1.statuspage.io/" target="_blank">Status</a>
            {" | "}
            <Link to="/tos">Terms</Link>
          </div>
          <div className="text-xs text-center text-neutral-400">
            LNVPS is a trading name of Apex Strata Ltd, a company registered in Ireland.
            <br />
            Comany Number: 702423,
            Address: Suite 10628, 26/27 Upper Pembroke Street, Dublin 2, D02 X361, Ireland
          </div>
        </div>

      </div>
    </>
  );
}
