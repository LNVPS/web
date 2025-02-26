import { useState, useEffect } from "react";
import { VmTemplate, LNVpsApi } from "../api";
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
      <div className="flex flex-col gap-4">
        <div className="text-2xl">VPS Offers</div>
        <div>
        Virtual Private Server hosting with flexible plans, high uptime, and dedicated support, tailored to your needs.
        </div>
        <div className="grid grid-cols-3 gap-2">
          {offers.map((a) => (
            <VpsCard spec={a} key={a.id} />
          ))}
        </div>

        <small className="text-neutral-400">
          All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic
        </small>
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <a href="/lnvps.asc">PGP</a>
            {" | "}
            <Link to="/status">Status</Link>
            {" | "}
            <Link to="/tos">Terms</Link>
            {" | "}
            <a href={`https://snort.social/${NostrProfile.encode()}`} target="_blank">
              Nostr
            </a>
            {" | "}
            <a href="https://git.v0l.io/LNVPS" target="_blank">
              Git
            </a>
            {" | "}
            <a href="https://speedtest.v0l.io" target="_blank">
              Speedtest
            </a>
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
