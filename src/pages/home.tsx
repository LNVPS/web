import { useState, useEffect, ReactNode } from "react";
import { DiskType, LNVpsApi, VmHostRegion } from "../api";
import VpsCard from "../components/vps-card";
import { ApiUrl, NostrProfile } from "../const";
import { Link } from "react-router-dom";
import { VpsCustomOrder } from "../components/vps-custom";
import { LatestNews } from "../components/latest-news";
import { FilterButton } from "../components/button-filter";
import { appendDedupe, dedupe } from "@snort/shared";
import useLogin from "../hooks/login";
import usePaymentMethods from "../hooks/usePaymentMethods";
import Spinner from "../components/spinner";
import { Icon } from "../components/icon";
import { useCached } from "../hooks/useCached";

export default function HomePage() {
  const login = useLogin();
  const { data: methods } = usePaymentMethods();
  const {
    data: offers,
    loading,
    error: loadError,
  } = useCached("offers", async () => {
    const api = new LNVpsApi(ApiUrl, undefined, 5000);
    return await api.listOffers();
  });
  const [region, setRegion] = useState<Array<number>>([]);
  const [diskType, setDiskType] = useState<Array<DiskType>>([]);

  const regions = (offers?.templates.map((t) => t.region) ?? []).reduce(
    (acc, v) => {
      if (acc[v.id] === undefined) {
        acc[v.id] = v;
      }
      return acc;
    },
    {} as Record<number, VmHostRegion>,
  );
  const diskTypes = dedupe(offers?.templates.map((t) => t.disk_type) ?? []);

  useEffect(() => {
    if (offers) {
      setRegion(dedupe(offers.templates.map((z) => z.region.id)));
      setDiskType(dedupe(offers.templates.map((z) => z.disk_type)));
    }
  }, [offers]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <LatestNews />
        <div className="text-2xl">VPS Offers</div>
        <div>
          Virtual Private Server hosting with flexible plans, high uptime, and
          dedicated support, tailored to your needs.
        </div>
        <div className="flex gap-4 items-center">
          {Object.keys(regions).length > 1 && (
            <FilterSection header={"Region"}>
              {Object.values(regions).map((r) => {
                return (
                  <FilterButton
                    active={region.includes(r.id)}
                    onClick={() =>
                      setRegion((x) => {
                        if (x.includes(r.id)) {
                          return x.filter((y) => y != r.id);
                        } else {
                          return appendDedupe(x, [r.id]);
                        }
                      })
                    }
                  >
                    {r.name}
                  </FilterButton>
                );
              })}
            </FilterSection>
          )}
          {diskTypes.length > 1 && (
            <FilterSection header={"Disk"}>
              {diskTypes.map((d) => (
                <FilterButton
                  active={diskType.includes(d)}
                  onClick={() => {
                    setDiskType((s) => {
                      if (s?.includes(d)) {
                        return s.filter((y) => y !== d);
                      } else {
                        return appendDedupe(s, [d]);
                      }
                    });
                  }}
                >
                  {d.toUpperCase()}
                </FilterButton>
              ))}
            </FilterSection>
          )}
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {loading ? (
            <div className="col-span-full text-center p-8">
              <div className="flex items-center justify-center gap-3">
                <Spinner width={24} height={24} />
                <span className="text-neutral-400">Loading VPS offers...</span>
              </div>
            </div>
          ) : loadError ? (
            <div className="col-span-full text-center p-8 bg-red-900/20 border border-red-500 rounded-xl">
              <div className="text-red-500 bold text-xl uppercase mb-2">
                Failed to load VPS offers
              </div>
              <div className="text-neutral-400 mb-4">
                There may be a service issue. Check our status page for updates.
              </div>
              <Link
                to="/status"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                View Status Page
              </Link>
              <pre className="text-xs bg-red-600/50 mt-4 px-1 py-2 rounded-lg whitespace-pre">
                Error: {loadError.message}
              </pre>
            </div>
          ) : (
            <>
              {offers?.templates
                .filter(
                  (t) =>
                    region.includes(t.region.id) &&
                    diskType.includes(t.disk_type),
                )
                .sort((a, b) => a.cost_plan.amount - b.cost_plan.amount)
                .map((a) => (
                  <VpsCard spec={a} key={a.id} />
                ))}
              {offers?.templates !== undefined &&
                offers.templates.length === 0 && (
                  <div className="text-red-500 bold text-xl uppercase">
                    No offers available
                  </div>
                )}
            </>
          )}
        </div>
        {offers?.custom_template && (
          <VpsCustomOrder templates={offers.custom_template} />
        )}
        <small className="text-neutral-400 text-center">
          All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic,
          all prices are excluding taxes.
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
            <Link to="/contact">Contact</Link>
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
          {import.meta.env.VITE_FOOTER_NOTE_1 && (
            <div className="text-xs text-center text-neutral-400">
              {import.meta.env.VITE_FOOTER_NOTE_1}
            </div>
          )}
          {import.meta.env.VITE_FOOTER_NOTE_2 && (
            <div className="text-xs text-center text-neutral-400">
              {import.meta.env.VITE_FOOTER_NOTE_2}
            </div>
          )}
          <div className="text-sm text-center">
            Display Currency:{" "}
            <select
              value={login?.currency ?? "EUR"}
              onChange={(e) =>
                login?.update((s) => (s.currency = e.target.value))
              }
            >
              {["BTC", "EUR", "USD", "GBP", "AUD", "CAD", "CHF", "JPY"].map(
                (a) => (
                  <option>{a}</option>
                ),
              )}
            </select>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {methods?.some((m) => m.name.toLowerCase().includes("revolut")) && (
              <>
                <Icon
                  name="visa"
                  size={48}
                  className="opacity-80 hover:opacity-100 transition-opacity rounded-lg bg-white p-0.5"
                />
                <Icon
                  name="mastercard"
                  size={48}
                  className="opacity-80 hover:opacity-100 transition-opacity rounded-lg bg-white p-0.5"
                />
                <Icon
                  name="revolut"
                  size={48}
                  className="opacity-80 hover:opacity-100 transition-opacity rounded-lg bg-white p-0.5"
                />
              </>
            )}
            {methods?.some(
              (m) =>
                m.name.toLowerCase().includes("bitcoin") ||
                m.name.toLowerCase().includes("lightning") ||
                m.name.toLowerCase().includes("btc"),
            ) && (
              <Icon
                name="bitcoin"
                size={48}
                className="opacity-80 hover:opacity-100 transition-opacity rounded-lg bg-white p-0.5"
              />
            )}
            {methods?.some((m) => m.name === "nwc") && (
              <a href="https://nwc.dev" target="_blank" title="NWC">
                <Icon
                  name="nwc"
                  size={48}
                  className="opacity-80 hover:opacity-100 transition-opacity rounded-lg bg-white p-0.5"
                />
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FilterSection({
  header,
  children,
}: {
  header?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 bg-neutral-900 px-3 py-2 rounded-xl">
      <div className="text-md text-neutral-400">{header}</div>
      <div className="flex gap-2 items-center">{children}</div>
    </div>
  );
}
