import { useState, useEffect, ReactNode } from "react";
import { DiskType, LNVpsApi, VmHostRegion } from "../api";
import VpsRow, { VpsTableHeader } from "../components/vps-card";
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
import IpBlockCard from "../components/ip-block-card";

export default function HomePage() {
  const login = useLogin();

  return (
    <>
      <div className="flex flex-col gap-4">
        <LatestNews />
        <VpsOffersSection />
        <IpSpaceSection />
        <hr />
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
            <div className="text-xs text-center text-cyber-muted">
              {import.meta.env.VITE_FOOTER_NOTE_1}
            </div>
          )}
          {import.meta.env.VITE_FOOTER_NOTE_2 && (
            <div className="text-xs text-center text-cyber-muted">
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
          <PaymentMethodsFooter />
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
    <div className="flex flex-col gap-2 bg-cyber-panel px-3 py-2 rounded">
      <div className="text-md text-cyber-muted">{header}</div>
      <div className="flex gap-2 items-center">{children}</div>
    </div>
  );
}

function PaymentMethodsFooter() {
  const { data: methods } = usePaymentMethods();
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      {methods?.some((m) => m.name.toLowerCase().includes("revolut")) && (
        <>
          <Icon
            name="visa"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
          />
          <Icon
            name="mastercard"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
          />
          <Icon
            name="revolut"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
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
          className="opacity-60 hover:opacity-100 transition-all rounded border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
        />
      )}
      {methods?.some((m) => m.name === "nwc") && (
        <a href="https://nwc.dev" target="_blank" title="NWC">
          <Icon
            name="nwc"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
          />
        </a>
      )}
    </div>
  );
}

function VpsOffersSection() {
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
      <div className="text-2xl">VPS Offers</div>
      <div>High-performance VPS powered by Bitcoin. No KYC, no fuss.</div>
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
      {loading ? (
        <div className="text-center p-8">
          <div className="flex items-center justify-center gap-3">
            <Spinner width={24} height={24} />
            <span className="text-cyber-muted">Loading VPS offers...</span>
          </div>
        </div>
      ) : loadError ? (
        <div className="text-center p-8 bg-cyber-danger/10 border border-cyber-danger rounded">
          <div className="text-cyber-danger bold text-xl uppercase mb-2">
            Failed to load VPS offers
          </div>
          <div className="text-cyber-muted mb-4">
            There may be a service issue. Check our status page for updates.
          </div>
          <Link
            to="/status"
            className="text-cyber-accent hover:text-cyber-accent underline"
          >
            View Status Page
          </Link>
          <pre className="text-xs bg-cyber-danger/20 mt-4 px-1 py-2 rounded whitespace-pre">
            Error: {loadError.message}
          </pre>
        </div>
      ) : offers?.templates !== undefined && offers.templates.length === 0 ? (
        <div className="text-cyber-danger bold text-xl uppercase">
          No offers available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table>
            <VpsTableHeader />
            <tbody>
              {offers?.templates
                .filter(
                  (t) =>
                    region.includes(t.region.id) &&
                    diskType.includes(t.disk_type),
                )
                .sort((a, b) => a.cost_plan.amount - b.cost_plan.amount)
                .map((a) => (
                  <VpsRow spec={a} key={a.id} />
                ))}
            </tbody>
          </table>
        </div>
      )}

      {offers?.custom_template && offers?.custom_template.length > 0 && (
        <VpsCustomOrder templates={offers.custom_template} />
      )}
      <small className="text-cyber-muted text-center">
        All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic, all
        prices are excluding taxes.
      </small>
    </>
  );
}

function IpSpaceSection() {
  const {
    data: ipSpaces,
    loading: ipLoading,
    error: ipError,
  } = useCached("ipSpaces", async () => {
    const api = new LNVpsApi(ApiUrl, undefined, 5000);
    return await api.listAvailableIpSpace();
  });

  if (!ipSpaces || ipSpaces.length === 0) return;

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="text-2xl">Available IP Blocks</div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {ipLoading ? (
          <div className="col-span-full text-center p-8">
            <div className="flex items-center justify-center gap-3">
              <Spinner width={24} height={24} />
              <span className="text-cyber-muted">Loading IP blocks...</span>
            </div>
          </div>
        ) : ipError ? (
          <div className="col-span-full text-center p-8 bg-cyber-danger/10 border border-cyber-danger rounded">
            <div className="text-cyber-danger bold text-xl uppercase mb-2">
              Failed to load IP blocks
            </div>
            <pre className="text-xs bg-cyber-danger/20 mt-4 px-1 py-2 rounded whitespace-pre">
              Error: {ipError.message}
            </pre>
          </div>
        ) : (
          ipSpaces.flatMap((block) =>
            block.pricing.map((p) => (
              <IpBlockCard
                block={block}
                price={p}
                key={`${block.id}_${p.id}`}
              />
            )),
          )
        )}
      </div>
    </div>
  );
}
