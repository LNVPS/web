import { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import { appJsonLd } from "../utils/app-seo";
import { faqJsonLd, type FaqItem } from "../utils/faq-seo";
import { formatPriceText } from "../utils/currency";
import { formatBytesText } from "../utils/bytes";
import type { AppLoaderData } from "../loaders";

/** Section heading in the site's eyebrow style, kept as an h2 for structure.
 * Mirrors `SectionHeading` in `home.tsx:172`. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyber-muted">
      <span className="h-px w-3 bg-cyber-border-bright" />
      {children}
    </h2>
  );
}

function Section({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

/**
 * `/blossom-server-hosting` — use-case landing page for Route96, the Blossom /
 * NIP-96 media server in the managed app catalog (`LNVPS/web#38`).
 *
 * The copy is fixed marketing prose, so the page renders in full even when the
 * catalog is unreachable — unlike `/apps/:slug` there is no slug to resolve and
 * no empty shell to keep out of the index. The loader exists only to supply the
 * app's real price to the `Product`/`Offer` schema; without it the page simply
 * ships no product markup.
 *
 * Every price on the page — title, meta description, h1, the Route96 line and
 * the CTA — is a `{price}` placeholder fed from the catalog, and there is no
 * constant behind it (`LNVPS/web#67`): with the catalog unreachable the page
 * makes no price claim at all rather than repeating a €3.50 that was written
 * here in April and cannot be checked. Same rule as the storage below. The
 * copy, the `Offer` markup and the `<title>` therefore cannot disagree, and no
 * locale file carries the number.
 *
 * "No setup fee" is its own claim and gated on `setup_amount` for the same
 * reason — it was asserted unconditionally, including for a render where the
 * catalog says there is one.
 *
 * Storage now works the same way (`LNVPS/web#60`). It could not before:
 * `storage_bytes` is only the 25 GiB total, and printing that where the copy
 * says "for your files" tells a buyer they have 25 GB of room for uploads when
 * they have 20. The split lives in the compose volumes, which the client is
 * not allowed to read. `LNVPS/api#260` fixed that at the source — each volume
 * now arrives with the purpose its app authored — so the page renders what the
 * catalog says and no locale file carries a size.
 *
 * Three states, in order:
 *
 * - **labelled volumes** — the total and the breakdown, e.g. "25GB of
 *   persistent storage — 20GB files and 5GB database".
 * - **no labels** (an app that authored none, or a catalog row not yet
 *   patched) — the plain total. Honest, less specific.
 * - **no catalog** (API unreachable) — no storage claim at all, rather than a
 *   size written into the front end.
 */
export function BlossomServerHostingPage() {
  const intl = useIntl();
  const { formatMessage } = intl;
  const { app } = useLoaderData<AppLoaderData>();

  // Ex-VAT and unconverted, matching the `Offer`'s `valueAddedTaxIncluded:
  // false` and what a crawler is served. `interval_type` is left off on
  // purpose: the period is part of the sentence around the placeholder, so
  // "/month" and "a month" stay translatable instead of being appended by
  // `CostAmount` in a fixed position.
  const price = app
    ? { currency: app.currency, amount: app.amount }
    : undefined;
  const priceText = price ? formatPriceText(intl, price) : undefined;
  const priceNode = price ? (
    <CostAmount cost={price} converted={false} />
  ) : null;
  const noSetupFee = app?.setup_amount === 0;

  // The catalog's storage, or no claim at all — there is no fallback constant,
  // because a size written into the front end is product data the client has
  // no business holding.
  const storage = app ? formatBytesText(intl, app.storage_bytes) : undefined;

  // Only volumes the app gave a purpose. An unlabelled one is still real
  // storage and still inside `storage_bytes`; it is simply not something to
  // name, so it is counted in the total and left out of the breakdown.
  // `label` is authored per app and arrives in English, which is why it is
  // interpolated rather than translated — the sizes around it are formatted
  // for the locale.
  const named = (app?.volumes ?? []).filter((v) => v.label);
  const breakdown = named.length
    ? intl.formatList(
        named.map((v) => `${formatBytesText(intl, v.size_bytes)} ${v.label}`),
        { type: "conjunction" },
      )
    : undefined;

  // Rendered as the FAQ block *and* handed to `faqJsonLd`, so the two can
  // never say different things. Answers ship as written — expanding one
  // usually costs `FAQPage` eligibility.
  //
  // The custom-domain question and the matching "What is included" bullet were
  // cut on web#38 while web#36 was open, then restored: `60a6d42` shipped the
  // UI (`account-app-deployment.tsx:40`, `:550`) and it is on `origin/main`.
  const faq: FaqItem[] = [
    {
      question: formatMessage({ defaultMessage: "What is Blossom?" }),
      answer: formatMessage({
        defaultMessage:
          "A protocol for storing and retrieving files addressed by their hash, designed to work with Nostr. NIP-96 is the older HTTP file-storage spec — Route96 speaks both.",
      }),
    },
    // The answer *is* the catalog's storage, so with the catalog unreachable
    // there is nothing honest to put in it and the question is not asked.
    // Dropping the item drops it from the rendered `<dl>` and from `faqJsonLd`
    // together, which is why the two share this array.
    ...(storage
      ? [
          {
            question: formatMessage({
              defaultMessage: "How much can I store?",
            }),
            answer: breakdown
              ? formatMessage(
                  {
                    defaultMessage:
                      "{breakdown}, {storage} in total. For a personal media server that is comfortable; if you need more, a VPS with Route96 installed yourself scales further.",
                  },
                  { breakdown, storage },
                )
              : formatMessage(
                  {
                    defaultMessage:
                      "{storage} in total. For a personal media server that is comfortable; if you need more, a VPS with Route96 installed yourself scales further.",
                  },
                  { storage },
                ),
          },
        ]
      : []),
    // "How large a file can I upload?" was asked and answered "Up to 100 MB
    // per upload." — Route96's own `max_upload_bytes`, true when it was written
    // and frozen since. It is gone for good (`LNVPS/web#66`), and deliberately
    // not replaced by a pending API field: a landing page states what LNVPS
    // sells — resources, price, region, support — and how the app is
    // configured is the app's business, not this FAQ's.
    {
      question: formatMessage({ defaultMessage: "Can I use my own domain?" }),
      answer: formatMessage({
        defaultMessage:
          "Yes — CNAME, and the certificate is issued automatically once DNS resolves.",
      }),
    },
    {
      question: formatMessage({ defaultMessage: "Where does it run?" }),
      answer: formatMessage({ defaultMessage: "Dublin, Ireland." }),
    },
  ];

  return (
    <>
      <Seo
        title={
          priceText
            ? formatMessage(
                {
                  defaultMessage:
                    "Blossom Media Server Hosting from {price}/month",
                },
                { price: priceText },
              )
            : formatMessage({
                defaultMessage: "Blossom Media Server Hosting — Route96",
              })
        }
        canonical="/blossom-server-hosting"
        description={
          priceText
            ? formatMessage(
                {
                  defaultMessage:
                    "Run your own Blossom and NIP-96 media server for {price}/month. Route96, up in minutes on its own hostname with persistent storage and TLS included.",
                },
                { price: priceText },
              )
            : formatMessage({
                defaultMessage:
                  "Run your own Blossom and NIP-96 media server. Route96, up in minutes on its own hostname with persistent storage and TLS included.",
              })
        }
        jsonLd={[...(app ? [appJsonLd(app, intl)] : []), faqJsonLd(faq)]}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">
            {priceNode ? (
              <FormattedMessage
                defaultMessage="Host your own media server — {price} a month"
                values={{ price: priceNode }}
              />
            ) : (
              <FormattedMessage defaultMessage="Host your own media server" />
            )}
          </h1>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Stop uploading your images and video to someone else's server. Route96 is a Blossom and NIP-96 media server, deployed on LNVPS in minutes, with storage and TLS included." />
          </p>
        </header>

        <Section title={<FormattedMessage defaultMessage="Route96" />}>
          {/*
            No size on this line: the "What is included" bullet three lines
            down states it, and a figure written in two slots is a figure that
            can be corrected in one of them.
          */}
          {/* With the catalog unreachable the line keeps its slot but drops
              every claim behind it — including "no setup fee", which is a
              statement about a row we could not read. */}
          <p className="m-0 font-bold text-cyber-primary">
            {priceNode ? (
              noSetupFee ? (
                <FormattedMessage
                  defaultMessage="{price}/month, no setup fee."
                  values={{ price: priceNode }}
                />
              ) : (
                <FormattedMessage
                  defaultMessage="{price}/month."
                  values={{ price: priceNode }}
                />
              )
            ) : (
              <FormattedMessage defaultMessage="Pay monthly with Lightning." />
            )}
          </p>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage
              defaultMessage="Route96 is a high-performance Blossom / NIP-96 server. It is <a>open source</a>, and it is ours — we wrote it and we run it. You are not trusting a black box; you can read every line, and you can leave with your data whenever you want."
              values={{
                a: (chunks) => (
                  <a
                    href="https://github.com/v0l/route96"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyber-primary hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              }}
            />
          </p>
        </Section>

        <Section title={<FormattedMessage defaultMessage="What is included" />}>
          <ul className="m-0 flex max-w-prose list-disc flex-col gap-1 pl-5 text-cyber-text">
            {storage ? (
              <li>
                {breakdown ? (
                  <FormattedMessage
                    defaultMessage="{storage} of persistent storage — {breakdown}"
                    values={{ storage, breakdown }}
                  />
                ) : (
                  <FormattedMessage
                    defaultMessage="{storage} of persistent storage"
                    values={{ storage }}
                  />
                )}
              </li>
            ) : null}
            {/* The per-upload cap was a bullet here — see the FAQ note above.
                It is Route96's setting, not something LNVPS sells, so the
                bullets list what we do sell and it is not coming back. */}
            <li>
              <FormattedMessage
                defaultMessage="Your own hostname — <code>your-name.ie.apps.lnvps.cloud</code> — with automatic TLS"
                values={{
                  code: (chunks) => (
                    <code className="font-mono text-cyber-accent">
                      {chunks}
                    </code>
                  ),
                }}
              />
            </li>
            <li>
              <FormattedMessage defaultMessage="Bring your own domain via CNAME — separate certificate issued automatically" />
            </li>
            <li>
              <FormattedMessage defaultMessage="Isolated environment with its own database" />
            </li>
            <li>
              <FormattedMessage defaultMessage="Stopping retains your uploads; only deleting removes them" />
            </li>
          </ul>
        </Section>

        <Section
          title={<FormattedMessage defaultMessage="Why self-host media" />}
        >
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Nostr keeps your identity portable. Media has been the part that is not — your images live on someone else's host, under someone else's terms, and disappear when they do. A Blossom server puts that back under your key." />
          </p>
        </Section>

        <Section title={<FormattedMessage defaultMessage="Pay how you like" />}>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Lightning, on-chain Bitcoin, or card. Log in with your Nostr key. No KYC." />
          </p>
        </Section>

        <Section title={<FormattedMessage defaultMessage="FAQ" />}>
          <dl className="m-0 flex max-w-prose flex-col gap-4">
            {faq.map((f) => (
              <div key={f.question} className="flex flex-col gap-1">
                <dt className="m-0 font-bold text-cyber-text-bright">
                  {f.question}
                </dt>
                <dd className="m-0 text-cyber-text">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div>
          <Link
            to={app ? `/apps/${app.name}` : "/apps"}
            className="inline-block rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-2 font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            {priceNode ? (
              <FormattedMessage
                defaultMessage="Deploy Route96 — {price}/month"
                values={{ price: priceNode }}
              />
            ) : (
              <FormattedMessage defaultMessage="Deploy Route96" />
            )}
          </Link>
        </div>
      </div>
    </>
  );
}
