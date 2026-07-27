import { ReactNode } from "react";
import { Link, useLoaderData } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";
import { CostAmount } from "../components/cost";
import { appJsonLd } from "../utils/app-seo";
import { faqJsonLd, type FaqItem } from "../utils/faq-seo";
import { formatPriceText } from "../utils/currency";
import { formatBytesText } from "../utils/bytes";
import { BlossomAppId } from "../const";
import type { AppLoaderData } from "../loaders";

/**
 * Route96's price as this page claims it, for the render where the catalog is
 * unreachable.
 *
 * The page has to keep its headline when the API is down (web#38), so the
 * price cannot be *only* derived — but it must not sit inside a translatable
 * string either, or eleven locale files end up carrying a number that only
 * `src/api.ts` should decide. So it lives here, once, in minor units, and is
 * painted by the same code that paints the live figure. `350` is €3.50.
 *
 * If Route96's catalog price changes this is the only line to change; the
 * copy, the `Offer` markup and the `<title>` all follow from it.
 */
const FALLBACK_PRICE = { currency: "EUR", amount: 350 };

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
 * catalog is unreachable — unlike `/apps/:id` there is no id to resolve and no
 * empty shell to keep out of the index. The loader exists only to supply the
 * app's real price to the `Product`/`Offer` schema; without it the page simply
 * ships no product markup.
 *
 * Every price on the page — title, meta description, h1, the Route96 line and
 * the CTA — is a `{price}` placeholder fed from the catalog, falling back to
 * `FALLBACK_PRICE` when the loader has nothing. So the copy, the `Offer`
 * markup and the `<title>` cannot disagree, and no locale file carries the
 * number.
 *
 * Storage is the same rule with no fallback (`LNVPS/web#60`): the total comes
 * off `app.storage_bytes` or the page does not claim a size. The 20GB files /
 * 5GB database split it used to print is not something the client can derive —
 * the volumes are `blobs` and `data` on two services and nothing in the API
 * says which is which — so the page states the total and `LNVPS/api#260` is
 * what would let it state the breakdown.
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
    : FALLBACK_PRICE;
  const priceText = formatPriceText(intl, price);
  const priceNode = <CostAmount cost={price} converted={false} />;

  // The catalog's figure or nothing — unlike the price there is no fallback
  // constant, because a storage size written into the front end is product
  // data the client has no business holding. With the API unreachable the two
  // slots below simply do not render; the rest of the page is unaffected.
  const storage = app ? formatBytesText(intl, app.storage_bytes) : undefined;

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
    // The answer *is* `storage_bytes`, so with the catalog unreachable there
    // is nothing honest to put in it and the question is not asked. Dropping
    // the item drops it from the rendered `<dl>` and from `faqJsonLd`
    // together, which is why the two share this array.
    ...(storage
      ? [
          {
            question: formatMessage({
              defaultMessage: "How much can I store?",
            }),
            answer: formatMessage(
              {
                defaultMessage:
                  "{storage} in total, shared between your files and the database. For a personal media server that is comfortable; if you need more, a VPS with Route96 installed yourself scales further.",
              },
              { storage },
            ),
          },
        ]
      : []),
    {
      question: formatMessage({
        defaultMessage: "How large a file can I upload?",
      }),
      answer: formatMessage({ defaultMessage: "Up to 100 MB per upload." }),
    },
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
        title={formatMessage(
          {
            defaultMessage: "Blossom Media Server Hosting from {price}/month",
          },
          { price: priceText },
        )}
        canonical="/blossom-server-hosting"
        description={formatMessage(
          {
            defaultMessage:
              "Run your own Blossom and NIP-96 media server for {price}/month. Route96, up in minutes on its own hostname with persistent storage and TLS included.",
          },
          { price: priceText },
        )}
        jsonLd={[...(app ? [appJsonLd(app)] : []), faqJsonLd(faq)]}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="m-0 text-3xl text-cyber-text-bright">
            <FormattedMessage
              defaultMessage="Host your own media server — {price} a month"
              values={{ price: priceNode }}
            />
          </h1>
          <p className="m-0 max-w-prose text-cyber-text">
            <FormattedMessage defaultMessage="Stop uploading your images and video to someone else's server. Route96 is a Blossom and NIP-96 media server, deployed on LNVPS in minutes, with storage and TLS included." />
          </p>
        </header>

        <Section title={<FormattedMessage defaultMessage="Route96" />}>
          {/*
            The size that used to close this line is now in the "What is
            included" bullet below, where it can be conditional on the catalog
            having answered. A bold headline sentence cannot be — it would
            need a second `defaultMessage` in eleven locales for the render
            where the API is down.
          */}
          <p className="m-0 font-bold text-cyber-primary">
            <FormattedMessage
              defaultMessage="{price}/month, no setup fee."
              values={{ price: priceNode }}
            />
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
                <FormattedMessage
                  defaultMessage="{storage} of persistent storage, shared between your files and the database"
                  values={{ storage }}
                />
              </li>
            ) : null}
            <li>
              <FormattedMessage defaultMessage="Uploads up to 100 MB each" />
            </li>
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
            to={`/apps/${BlossomAppId}`}
            className="inline-block rounded-sm border border-cyber-primary bg-cyber-primary/20 px-4 py-2 font-bold uppercase text-cyber-primary hover:bg-cyber-primary/30 hover:shadow-neon"
          >
            <FormattedMessage
              defaultMessage="Deploy Route96 — {price}/month"
              values={{ price: priceNode }}
            />
          </Link>
        </div>
      </div>
    </>
  );
}
