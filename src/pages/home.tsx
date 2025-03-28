import { useState, useEffect } from "react";
import { LNVpsApi, VmHostRegion, VmTemplateResponse } from "../api";
import VpsCard from "../components/vps-card";
import { ApiUrl, NostrProfile } from "../const";
import { Link } from "react-router-dom";
import { VpsCustomOrder } from "../components/vps-custom";
import { LatestNews } from "../components/latest-news";
import { FilterButton } from "../components/button-filter";
import { dedupe } from "@snort/shared";
import useLogin from "../hooks/login";

export default function HomePage() {
  const login = useLogin();
  const [offers, setOffers] = useState<VmTemplateResponse>();
  const [region, setRegion] = useState<Array<number>>([]);

  const regions = (offers?.templates.map((t) => t.region) ?? []).reduce((acc, v) => {
    if (acc[v.id] === undefined) {
      acc[v.id] = v;
    }
    return acc;
  }, {} as Record<number, VmHostRegion>);

  useEffect(() => {
    const api = new LNVpsApi(ApiUrl, undefined);
    api.listOffers().then((o) => {
      setOffers(o)
      setRegion(dedupe(o.templates.map((z) => z.region.id)));
    });
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4">
        <LatestNews />
        <div className="text-2xl">VPS Offers</div>
        <div>
          Virtual Private Server hosting with flexible plans, high uptime, and
          dedicated support, tailored to your needs.
        </div>
        {Object.keys(regions).length > 1 && <div className="flex gap-2 items-center">
          Regions:
          {Object.values(regions).map((r) => {
            return <FilterButton
              active={region.includes(r.id)}
              onClick={() => setRegion(x => {
                if (x.includes(r.id)) {
                  return x.filter(y => y != r.id);
                } else {
                  return [...x, r.id];
                }
              })}>
              {r.name}
            </FilterButton>;
          })}
        </div>}
        <div className="grid grid-cols-3 gap-2">
          {offers?.templates.filter((t) => region.includes(t.region.id)).sort((a, b) => a.cost_plan.amount - b.cost_plan.amount).map((a) => <VpsCard spec={a} key={a.id} />)}
          {offers?.templates !== undefined && offers.templates.length === 0 && (
            <div className="text-red-500 bold text-xl uppercase">
              No offers available
            </div>
          )}
        </div>
        {offers?.custom_template && (
          <VpsCustomOrder templates={offers.custom_template} />
        )}
        <small className="text-neutral-400 text-center">
          All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic, all prices are excluding taxes.
        </small>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <a href="/lnvps.asc">PGP</a>
            {" | "}
            <Link to="/status">Status</Link>
            {" | "}
            <Link to="/tos">Terms</Link>
            {" | "}
            <Link to="/news">News</Link>
            {" | "}
            <a
              href={`https://snort.social/${NostrProfile.encode()}`}
              target="_blank"
            >
              Nostr
            </a>
            {" | "}
            <a href="https://github.com/LNVPS" target="_blank">
              Git
            </a>
            {" | "}
            <a href="http://speedtest.v0l.io" target="_blank">
              Speedtest
            </a>
          </div>
          {import.meta.env.VITE_FOOTER_NOTE_1 && <div className="text-xs text-center text-neutral-400">
            {import.meta.env.VITE_FOOTER_NOTE_1}
          </div>}
          {import.meta.env.VITE_FOOTER_NOTE_2 && <div className="text-xs text-center text-neutral-400">
            {import.meta.env.VITE_FOOTER_NOTE_2}
          </div>}
          <div className="text-sm text-center">
            Currency:
            {" "}
            <select value={login?.currency ?? "EUR"}
              onChange={(e) => login?.update(s => s.currency = e.target.value)}>
              {["BTC", "EUR", "USD", "GBP", "AUD", "CAD", "CHF", "JPY"].map((a) => <option>{a}</option>)}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
