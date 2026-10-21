import { useCallback, useEffect, useState } from "react";
import { FormattedDate, FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { AbuseCase } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { PageHeader, SectionCard } from "../components/section";
import { StatusPill } from "../components/billing";
import { showError } from "../toast";

const PAGE_SIZE = 20;

export function AccountAbusePage() {
  const { api } = useLogin() ?? {};
  const [cases, setCases] = useState<Array<AbuseCase>>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(
    async (offset: number) => {
      if (!api) return;
      const page = await api.listAbuseCases(PAGE_SIZE, offset);
      setCases((prev) => (offset === 0 ? page.data : [...prev, ...page.data]));
      setTotal(page.total);
      setLoaded(true);
    },
    [api],
  );

  useEffect(() => {
    load(0).catch(showError);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={<FormattedMessage defaultMessage="Abuse Reports" />}
        description={
          <FormattedMessage defaultMessage="Reports we received about your services and what we decided." />
        }
      />
      <SectionCard
        title={
          <FormattedMessage defaultMessage="Reports about your services" />
        }
        description={
          <FormattedMessage
            defaultMessage="If we restrict or suspend a service, the decision appears here with the facts and reasons behind it. You can challenge any decision for six months. See section 6.1 of the {terms}."
            values={{
              terms: (
                <Link to="/tos" className="text-cyber-accent underline">
                  <FormattedMessage defaultMessage="Terms of Service" />
                </Link>
              ),
            }}
          />
        }
      >
        {loaded && cases.length === 0 ? (
          <div className="text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="There are no reports about your services." />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-cyber-border/60">
            {cases.map((c) => (
              <Link
                key={c.id}
                to={`/account/abuse/${c.id}`}
                className="flex flex-wrap items-center gap-3 py-3 hover:text-cyber-primary"
              >
                <span className="font-mono text-xs text-cyber-muted">
                  #{c.id}
                </span>
                <span className="flex-1 min-w-0 truncate">{c.summary}</span>
                {c.vm_id != null && (
                  <span className="font-mono text-xs text-cyber-muted">
                    <FormattedMessage
                      defaultMessage="VM #{id}"
                      values={{ id: c.vm_id }}
                    />
                  </span>
                )}
                <StatusPill tone={c.closed_at ? "muted" : "warning"}>
                  {c.closed_at ? (
                    <FormattedMessage defaultMessage="Closed" />
                  ) : (
                    <FormattedMessage defaultMessage="Open" />
                  )}
                </StatusPill>
                <span className="text-xs text-cyber-muted tabular-nums">
                  <FormattedDate value={c.created} dateStyle="medium" />
                </span>
              </Link>
            ))}
          </div>
        )}
        {cases.length < total && (
          <div className="mt-4">
            <AsyncButton
              onClick={async () => {
                try {
                  await load(cases.length);
                } catch (e) {
                  showError(e);
                }
              }}
            >
              <FormattedMessage defaultMessage="Load more" />
            </AsyncButton>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
