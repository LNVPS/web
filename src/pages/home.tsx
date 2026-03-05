import { useState, useEffect, ReactNode } from "react";
import { DiskType, VmHostRegion } from "../api";
import VpsRow, { VpsTableHeader } from "../components/vps-card";
import { NostrProfile } from "../const";
import { Link, useLoaderData } from "react-router-dom";
import { VpsCustomOrder } from "../components/vps-custom";
import { LatestNews } from "../components/latest-news";
import { FilterButton } from "../components/button-filter";
import { appendDedupe, dedupe } from "@snort/shared";
import useLogin from "../hooks/login";
import Spinner from "../components/spinner";
import { Icon } from "../components/icon";
import IpBlockCard from "../components/ip-block-card";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import type { HomeLoaderData } from "../loaders";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LNVPS",
  url: "https://lnvps.net",
  logo: "https://lnvps.net/logo.jpg",
  description:
    "Bitcoin Lightning VPS provider — high-performance virtual private servers, no KYC, paid with Bitcoin Lightning.",
  sameAs: ["https://github.com/LNVPS"],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LNVPS",
  url: "https://lnvps.net",
};

export default function HomePage() {
  const login = useLogin();
  const { formatMessage } = useIntl();

  return (
    <>
      <Seo
        canonical="/"
        description={formatMessage({
          defaultMessage:
            "High-performance VPS powered by Bitcoin Lightning. No KYC, no fuss. Virtual private servers starting from a few sats per month.",
        })}
        jsonLd={[organizationSchema, webSiteSchema]}
      />
      <div className="flex flex-col gap-4">
        <LatestNews />
        <VpsOffersSection />
        <IpSpaceSection />
        <hr />
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <a href="/lnvps.asc">
              <FormattedMessage defaultMessage="PGP" />
            </a>
            {" | "}
            <Link to="/status">
              <FormattedMessage defaultMessage="Status" />
            </Link>
            {" | "}
            <Link to="/tos">
              <FormattedMessage defaultMessage="Terms" />
            </Link>
            {" | "}
            <Link to="/news">
              <FormattedMessage defaultMessage="News" />
            </Link>
            {" | "}
            <Link to="/contact">
              <FormattedMessage defaultMessage="Contact" />
            </Link>
            {" | "}
            <a
              href={`https://snort.social/${NostrProfile.encode()}`}
              target="_blank"
            >
              <FormattedMessage defaultMessage="Nostr" />
            </a>
            {" | "}
            <a href="https://github.com/LNVPS" target="_blank">
              <FormattedMessage defaultMessage="Git" />
            </a>
            {" | "}
            <a href="http://speedtest.v0l.io" target="_blank">
              <FormattedMessage defaultMessage="Speedtest" />
            </a>
            {" | "}
            <a href="SKILL.md" target="_blank">
              <FormattedMessage defaultMessage="SKILL.md" />
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
            <FormattedMessage defaultMessage="Display Currency:" />{" "}
            <select
              value={login?.currency ?? "EUR"}
              onChange={(e) =>
                login?.update((s) => (s.currency = e.target.value))
              }
            >
              {["BTC", "EUR", "USD", "GBP", "AUD", "CAD", "CHF", "JPY"].map(
                (a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
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
    <div className="flex flex-col gap-2 bg-cyber-panel px-3 py-2 rounded-sm">
      <div className="text-md text-cyber-muted">{header}</div>
      <div className="flex gap-2 items-center">{children}</div>
    </div>
  );
}

function PaymentMethodsFooter() {
  const { paymentMethods: methods } = useLoaderData<HomeLoaderData>();
  return (
    <div className="flex items-center gap-4 flex-wrap justify-center">
      {methods?.some((m) => m.name.toLowerCase().includes("revolut")) && (
        <>
          <Icon
            name="visa"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded-sm border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
          />
          <Icon
            name="mastercard"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded-sm border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
          />
          <Icon
            name="revolut"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded-sm border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
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
          className="opacity-60 hover:opacity-100 transition-all rounded-sm border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
        />
      )}
      {methods?.some((m) => m.name === "nwc") && (
        <a href="https://nwc.dev" target="_blank" title="NWC">
          <Icon
            name="nwc"
            size={48}
            className="opacity-60 hover:opacity-100 transition-all rounded-sm border border-cyber-border p-1 hover:border-cyber-primary hover:shadow-neon-sm"
          />
        </a>
      )}
    </div>
  );
}

function VpsOffersSection() {
  const { offers } = useLoaderData<HomeLoaderData>();
  const loading = false;
  const [region, setRegion] = useState<Array<number>>(() =>
    dedupe(offers?.templates.map((z) => z.region.id) ?? []),
  );
  const [diskType, setDiskType] = useState<Array<DiskType>>(() =>
    dedupe(offers?.templates.map((z) => z.disk_type) ?? []),
  );

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
      <div className="text-2xl">
        <FormattedMessage defaultMessage="VPS Offers" />
      </div>
      <div>
        <FormattedMessage defaultMessage="High-performance VPS powered by Bitcoin. No KYC, no fuss." />
      </div>
      <div className="flex gap-4 items-center">
        {Object.keys(regions).length > 1 && (
          <FilterSection header={<FormattedMessage defaultMessage="Region" />}>
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
          <FilterSection header={<FormattedMessage defaultMessage="Disk" />}>
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
            <span className="text-cyber-muted">
              <FormattedMessage defaultMessage="Loading VPS offers..." />
            </span>
          </div>
        </div>
      ) : offers?.templates !== undefined && offers.templates.length === 0 ? (
        <div className="text-cyber-danger bold text-xl uppercase">
          <FormattedMessage defaultMessage="No offers available" />
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
        <FormattedMessage defaultMessage="All VPS come with 1x IPv4 and 1x IPv6 address and unmetered traffic, all prices are excluding taxes." />
      </small>
    </>
  );
}

function IpSpaceSection() {
  const { ipSpaces } = useLoaderData<HomeLoaderData>();
  const ipLoading = false;

  if (!ipSpaces || ipSpaces.length === 0) return;

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="text-2xl">
        <FormattedMessage defaultMessage="Available IP Blocks" />
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {ipLoading ? (
          <div className="col-span-full text-center p-8">
            <div className="flex items-center justify-center gap-3">
              <Spinner width={24} height={24} />
              <span className="text-cyber-muted">
                <FormattedMessage defaultMessage="Loading IP blocks..." />
              </span>
            </div>
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
