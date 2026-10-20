import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedDate, FormattedMessage, FormattedTime } from "react-intl";
import classNames from "classnames";
import {
  AccountCredit,
  AccountCreditEvent,
  AccountCreditEventKind,
  AccountCreditTopup,
  FixedFloatCoin,
} from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { CopyButton } from "../components/copy-button";
import { CostAmount } from "../components/cost";
import QrCode from "../components/qr";
import { PageHeader, SectionCard } from "../components/section";
import { showError } from "../toast";
import { coinTicker } from "../utils/currency";
import { depositOutpoint } from "../utils/deposit";

const PAGE_SIZE = 20;
const PRESET_SATS = [10_000, 50_000, 100_000, 500_000];
const MIN_TOPUP_SATS = 1;
const TOPUP_POLL_MS = 3_000;
const COINS: ReadonlyArray<string> = ["XMR", "LTC", "ETH", "USDTTRC"];

function EventKind({ kind }: { kind: AccountCreditEventKind }) {
  const label: Record<AccountCreditEventKind, React.ReactNode> = {
    topup: <FormattedMessage defaultMessage="Top-up" />,
    spend: <FormattedMessage defaultMessage="Spent" />,
    refund: <FormattedMessage defaultMessage="Refund" />,
    admin: <FormattedMessage defaultMessage="Adjustment" />,
  };
  return <span>{label[kind] ?? kind}</span>;
}

type TopupChoice =
  | { kind: "lightning" }
  | { kind: "onchain" }
  | { kind: "coin"; coin: FixedFloatCoin };

function choiceKey(c: TopupChoice) {
  return c.kind === "coin" ? c.coin : c.kind;
}

function choiceLabel(c: TopupChoice) {
  if (c.kind === "lightning")
    return <FormattedMessage defaultMessage="Lightning" />;
  if (c.kind === "onchain")
    return <FormattedMessage defaultMessage="On-chain" />;
  return coinTicker(c.coin);
}

function TopUpPayment({
  topup,
  onSettled,
  onClose,
}: {
  topup: AccountCreditTopup;
  onSettled: () => void;
  onClose: () => void;
}) {
  const { api } = useLogin() ?? {};
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;
  const [current, setCurrent] = useState(topup);
  const paid = current.is_paid;

  useEffect(() => {
    if (!api || paid) return;
    const tx = setInterval(async () => {
      try {
        const next = await api.getCreditTopup(topup.payment_hash);
        setCurrent(next);
        if (next.is_paid) {
          clearInterval(tx);
          settledRef.current();
        }
      } catch (e) {
        console.error(e);
      }
    }, TOPUP_POLL_MS);
    return () => clearInterval(tx);
  }, [api, topup.payment_hash, paid]);

  if (paid) {
    return (
      <div className="flex flex-col gap-4 items-start">
        <div className="text-cyber-primary">
          <FormattedMessage defaultMessage="Payment received. Your balance has been updated." />
        </div>
        <AsyncButton onClick={onClose}>
          <FormattedMessage defaultMessage="Done" />
        </AsyncButton>
      </div>
    );
  }

  const data = current.data;
  const lightning = typeof data === "object" && "lightning" in data;
  const onchain = typeof data === "object" && "onchain" in data;
  const swap = typeof data === "object" && "fixedfloat" in data;
  const outpoint = depositOutpoint(data);
  const txid = outpoint?.split(":")[0];

  let target = "";
  let link = "";
  if (lightning) {
    target = current.pr ?? "";
    link = `lightning:${target}`;
  } else if (onchain) {
    target = data.onchain.address;
    link = `bitcoin:${target}?amount=${(topup.amount / 1000 / 1e8).toFixed(8)}`;
  } else if (swap) {
    target = data.fixedfloat.address;
    link = target;
  }

  return (
    <div className="flex flex-col gap-4 items-center rounded-sm border border-cyber-border bg-cyber-panel p-3">
      {!outpoint && (
        <QrCode
          data={link}
          link={lightning || onchain ? link : undefined}
          width={512}
          height={512}
          avatar={lightning || onchain ? "/avatar.png" : undefined}
          className="cursor-pointer rounded-sm overflow-hidden"
        />
      )}
      {swap ? (
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-cyber-muted">
            <FormattedMessage defaultMessage="Send exactly" />
          </div>
          <div className="monospace select-all text-lg text-cyber-primary">
            {data.fixedfloat.amount} {coinTicker(data.fixedfloat.coin)}
          </div>
        </div>
      ) : (
        <div className="text-cyber-primary">
          <CostAmount
            cost={{ currency: current.currency, amount: current.amount }}
            converted={false}
          />
        </div>
      )}
      <div className="monospace select-all break-all text-center text-sm text-cyber-text">
        {target}
      </div>
      {outpoint ? (
        <div className="flex flex-col items-center gap-1.5 rounded-sm border border-cyber-primary/40 bg-cyber-primary/10 px-3 py-2 text-center text-xs text-cyber-primary">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyber-primary" />
            <FormattedMessage defaultMessage="Payment received, waiting for confirmation. You can safely leave this page." />
          </div>
          {txid && (
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono break-all underline decoration-dotted underline-offset-2 hover:text-cyber-text-bright"
            >
              <FormattedMessage defaultMessage="View transaction" />
              {" ↗"}
            </a>
          )}
        </div>
      ) : (
        <div className="text-xs text-cyber-muted text-center">
          {lightning && (
            <FormattedMessage defaultMessage="The invoice expires in 10 minutes. Your balance updates as soon as it is paid." />
          )}
          {onchain && (
            <FormattedMessage defaultMessage="Send any amount of on-chain Bitcoin to this address. Your balance is credited with what arrives once it confirms." />
          )}
          {swap && (
            <FormattedMessage
              defaultMessage="Send only {ticker} on the right network within 15 minutes. It is swapped to Bitcoin and your balance is credited with what arrives once that confirms."
              values={{ ticker: coinTicker(data.fixedfloat.coin) }}
            />
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <CopyButton text={target} />
        <button
          onClick={onClose}
          className="text-sm text-cyber-muted hover:text-cyber-primary transition-colors"
        >
          {onchain || swap ? (
            <FormattedMessage defaultMessage="I've sent the payment" />
          ) : (
            <FormattedMessage defaultMessage="Close" />
          )}
        </button>
      </div>
      {swap && (
        <div className="text-center text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="The exchange service is provided by FixedFloat. Creating an order confirms your agreement with the rules of FixedFloat." />{" "}
          <a
            href="https://ff.io/terms-of-service"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2"
          >
            ff.io/terms-of-service ↗
          </a>
        </div>
      )}
    </div>
  );
}

export function AccountCreditPage() {
  const login = useLogin();
  const api = login?.api;
  const [credit, setCredit] = useState<AccountCredit>();
  const [events, setEvents] = useState<Array<AccountCreditEvent>>([]);
  const [total, setTotal] = useState(0);
  const [loadedEvents, setLoadedEvents] = useState(false);
  const [sats, setSats] = useState("");
  const [topup, setTopup] = useState<AccountCreditTopup>();
  const [choices, setChoices] = useState<Array<TopupChoice>>([
    { kind: "lightning" },
  ]);
  const [choice, setChoice] = useState<TopupChoice>({ kind: "lightning" });
  const [error, setError] = useState<string>();

  const loadCredit = useCallback(async () => {
    if (!api) return;
    setCredit(await api.getAccountCredit());
  }, [api]);

  const loadEvents = useCallback(
    async (offset: number) => {
      if (!api) return;
      const page = await api.listCreditEvents(PAGE_SIZE, offset);
      setEvents((prev) => (offset === 0 ? page.data : [...prev, ...page.data]));
      setTotal(page.total);
      setLoadedEvents(true);
    },
    [api],
  );

  useEffect(() => {
    if (!api) return;
    api
      .getPaymentMethods()
      .then((methods) => {
        const next: Array<TopupChoice> = [{ kind: "lightning" }];
        if (methods.some((m) => m.name === "onchain"))
          next.push({ kind: "onchain" });
        const coins =
          methods.find((m) => m.name === "fixedfloat")?.currencies ?? [];
        for (const c of coins) {
          if (COINS.includes(c))
            next.push({ kind: "coin", coin: c as FixedFloatCoin });
        }
        setChoices(next);
      })
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    loadCredit().catch(showError);
    loadEvents(0).catch(showError);
  }, [loadCredit, loadEvents]);

  const amountSats = Number(sats);
  const validAmount =
    Number.isInteger(amountSats) && amountSats >= MIN_TOPUP_SATS;

  async function createTopup() {
    if (!api || !validAmount) return;
    setError(undefined);
    try {
      setTopup(
        await api.topUpCredit(
          amountSats * 1000,
          choice.kind === "coin" ? "fixedfloat" : choice.kind,
          choice.kind === "coin" ? choice.coin : undefined,
        ),
      );
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function toggleAutoApply(value: boolean) {
    if (!api) return;
    try {
      setCredit(await api.setCreditAutoApply(value));
    } catch (e) {
      showError(e);
    }
  }

  function refreshAfterTopup() {
    loadCredit().catch(showError);
    loadEvents(0).catch(showError);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={<FormattedMessage defaultMessage="Account Credit" />}
        description={
          <FormattedMessage defaultMessage="Top up a balance and spend it on new orders, renewals and upgrades." />
        }
      />

      <SectionCard title={<FormattedMessage defaultMessage="Balance" />}>
        <div className="flex flex-col gap-4">
          <div className="text-3xl text-cyber-text-bright tabular-nums">
            {credit ? (
              <CostAmount
                cost={{ currency: credit.currency, amount: credit.balance }}
                converted={false}
              />
            ) : (
              <span className="text-cyber-muted">…</span>
            )}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={credit?.auto_apply ?? false}
              disabled={!credit}
              onChange={(e) => toggleAutoApply(e.target.checked)}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm text-cyber-text-bright">
                <FormattedMessage defaultMessage="Spend my balance automatically" />
              </span>
              <span className="text-xs text-cyber-muted">
                <FormattedMessage defaultMessage="Every quote uses as much credit as the bill allows, and you pay the rest. Automatic renewals use credit when it covers the whole renewal." />
              </span>
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title={<FormattedMessage defaultMessage="Add credit" />}
        description={
          <FormattedMessage defaultMessage="Pay with Bitcoin or a supported coin and the amount is added to your balance." />
        }
      >
        {topup ? (
          <TopUpPayment
            topup={topup}
            onSettled={refreshAfterTopup}
            onClose={() => {
              setTopup(undefined);
              setSats("");
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {PRESET_SATS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSats(String(p))}
                  className={classNames(
                    "px-3 py-1.5 rounded-sm border text-sm tabular-nums transition-all duration-200",
                    sats === String(p)
                      ? "border-cyber-primary text-cyber-primary shadow-neon-sm"
                      : "border-cyber-border text-cyber-text hover:border-cyber-primary",
                  )}
                >
                  <CostAmount
                    cost={{ currency: "BTC", amount: p * 1000 }}
                    converted={false}
                  />
                </button>
              ))}
            </div>
            {choices.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {choices.map((c) => (
                  <button
                    key={choiceKey(c)}
                    onClick={() => setChoice(c)}
                    className={classNames(
                      "px-3 py-1.5 rounded-sm border text-sm transition-all duration-200",
                      choiceKey(c) === choiceKey(choice)
                        ? "border-cyber-primary text-cyber-primary shadow-neon-sm"
                        : "border-cyber-border text-cyber-text hover:border-cyber-primary",
                    )}
                  >
                    {choiceLabel(c)}
                  </button>
                ))}
              </div>
            )}
            <label className="flex flex-col gap-1.5 sm:max-w-xs">
              <span className="text-sm text-cyber-text">
                <FormattedMessage defaultMessage="Amount (sats)" />
              </span>
              <input
                type="number"
                min={MIN_TOPUP_SATS}
                step={1}
                value={sats}
                onChange={(e) => setSats(e.target.value)}
              />
            </label>
            {error && <b className="text-cyber-danger">{error}</b>}
            <AsyncButton
              className="self-start"
              disabled={!validAmount}
              onClick={createTopup}
            >
              <FormattedMessage defaultMessage="Continue" />
            </AsyncButton>
          </div>
        )}
      </SectionCard>

      <SectionCard title={<FormattedMessage defaultMessage="History" />}>
        {loadedEvents && events.length === 0 ? (
          <div className="text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="No credit activity yet." />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-cyber-border/60">
            {events.map((e, i) => (
              <div
                key={`${e.created}-${i}`}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-cyber-text-bright">
                    <EventKind kind={e.kind} />
                  </span>
                  <span className="text-xs text-cyber-muted">
                    <FormattedDate
                      value={new Date(e.created)}
                      dateStyle="medium"
                    />{" "}
                    <FormattedTime value={new Date(e.created)} />
                    {e.note && ` · ${e.note}`}
                  </span>
                </div>
                <span
                  className={classNames("tabular-nums shrink-0", {
                    "text-cyber-primary": e.amount > 0,
                    "text-cyber-text": e.amount <= 0,
                  })}
                >
                  {e.amount > 0 ? "+" : "−"}
                  <CostAmount
                    cost={{
                      currency: e.currency,
                      amount: Math.abs(e.amount),
                    }}
                    converted={false}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
        {events.length < total && (
          <AsyncButton
            className="mt-4"
            onClick={async () => {
              try {
                await loadEvents(events.length);
              } catch (e) {
                showError(e);
              }
            }}
          >
            <FormattedMessage defaultMessage="Load more" />
          </AsyncButton>
        )}
      </SectionCard>
    </div>
  );
}
