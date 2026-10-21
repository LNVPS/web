import { ReactNode, useCallback, useEffect, useState } from "react";
import { FormattedDate, FormattedMessage } from "react-intl";
import { Link, useParams } from "react-router-dom";
import { AbuseActionKind, AbuseCaseDetail } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import { PageHeader, SectionCard } from "../components/section";
import { BillingTone, StatusPill } from "../components/billing";
import { showError } from "../toast";
import { canChallenge, challengeWindowClosed } from "../utils/abuse";

const ACTION_TONE: Record<AbuseActionKind, BillingTone> = {
  forwarded: "muted",
  restricted: "warning",
  suspended: "danger",
  terminated: "danger",
  reinstated: "primary",
  no_action: "muted",
};

function actionLabel(kind: AbuseActionKind): ReactNode {
  switch (kind) {
    case "forwarded":
      return <FormattedMessage defaultMessage="Report forwarded to you" />;
    case "restricted":
      return <FormattedMessage defaultMessage="Service restricted" />;
    case "suspended":
      return <FormattedMessage defaultMessage="Service suspended" />;
    case "terminated":
      return <FormattedMessage defaultMessage="Service terminated" />;
    case "reinstated":
      return <FormattedMessage defaultMessage="Service restored" />;
    case "no_action":
      return <FormattedMessage defaultMessage="No action taken" />;
  }
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
        {label}
      </div>
      <div className="whitespace-pre-wrap text-sm text-cyber-text-bright">
        {children}
      </div>
    </div>
  );
}

function ChallengeForm({
  caseId,
  actionId,
  onDone,
}: {
  caseId: number;
  actionId: number;
  onDone: () => void;
}) {
  const { api } = useLogin() ?? {};
  const [message, setMessage] = useState("");

  async function submit() {
    if (!api || message.trim() === "") return;
    try {
      await api.challengeAbuseDecision(caseId, actionId, message.trim());
      setMessage("");
      onDone();
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`challenge-${actionId}`}
        className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text"
      >
        <FormattedMessage defaultMessage="Challenge this decision" />
      </label>
      <textarea
        id={`challenge-${actionId}`}
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full"
      />
      <div>
        <AsyncButton disabled={message.trim() === ""} onClick={submit}>
          <FormattedMessage defaultMessage="Send challenge" />
        </AsyncButton>
      </div>
    </div>
  );
}

export function AccountAbuseCasePage() {
  const { api } = useLogin() ?? {};
  const { id } = useParams();
  const caseId = Number(id);
  const [detail, setDetail] = useState<AbuseCaseDetail>();
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    if (!api || !Number.isInteger(caseId)) return;
    try {
      setDetail(await api.getAbuseCase(caseId));
    } catch {
      setMissing(true);
    }
  }, [api, caseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={<FormattedMessage defaultMessage="Report not found" />}
        />
        <Link to="/account/abuse" className="text-cyber-accent underline">
          <FormattedMessage defaultMessage="Back to your reports" />
        </Link>
      </div>
    );
  }

  if (!detail) {
    return <div className="text-cyber-muted">…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <FormattedMessage
            defaultMessage="Report #{id}"
            values={{ id: detail.id }}
          />
        }
        description={detail.summary}
        actions={
          <StatusPill tone={detail.closed_at ? "muted" : "warning"}>
            {detail.closed_at ? (
              <FormattedMessage defaultMessage="Closed" />
            ) : (
              <FormattedMessage defaultMessage="Open" />
            )}
          </StatusPill>
        }
      />

      {detail.actions.length === 0 && (
        <SectionCard title={<FormattedMessage defaultMessage="Decisions" />}>
          <div className="text-sm text-cyber-muted">
            <FormattedMessage defaultMessage="We have not made a decision on this report yet." />
          </div>
        </SectionCard>
      )}

      {detail.actions.map((action) => {
        const challenges = detail.challenges.filter(
          (c) => c.action_id === action.id,
        );
        return (
          <SectionCard
            key={action.id}
            title={actionLabel(action.kind)}
            actions={
              <StatusPill tone={ACTION_TONE[action.kind]}>
                <FormattedDate value={action.created} dateStyle="medium" />
              </StatusPill>
            }
          >
            <div className="flex flex-col gap-4">
              <Field
                label={
                  <FormattedMessage defaultMessage="What it was based on" />
                }
              >
                {action.facts}
              </Field>
              <Field label={<FormattedMessage defaultMessage="Reason" />}>
                {action.reason}
              </Field>
              <Field
                label={
                  <FormattedMessage defaultMessage="Law or Terms section" />
                }
              >
                {action.legal_basis ?? (
                  <FormattedMessage defaultMessage="Section 6 of our Terms of Service" />
                )}
              </Field>
              <Field
                label={<FormattedMessage defaultMessage="How we found it" />}
              >
                {action.followed_report ? (
                  <FormattedMessage defaultMessage="Following a report we received" />
                ) : (
                  <FormattedMessage defaultMessage="We found it ourselves" />
                )}
              </Field>

              {challenges.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-sm border border-cyber-border bg-cyber-panel-light p-3"
                >
                  <Field
                    label={<FormattedMessage defaultMessage="Your challenge" />}
                  >
                    {c.message}
                  </Field>
                  {c.outcome ? (
                    <Field
                      label={
                        c.outcome === "reversed" ? (
                          <FormattedMessage defaultMessage="Our reply: decision reversed" />
                        ) : (
                          <FormattedMessage defaultMessage="Our reply: decision upheld" />
                        )
                      }
                    >
                      {c.response}
                    </Field>
                  ) : (
                    <div className="text-sm text-cyber-muted">
                      <FormattedMessage defaultMessage="A person will review this and reply by email." />
                    </div>
                  )}
                </div>
              ))}

              {canChallenge(action) && (
                <ChallengeForm
                  caseId={detail.id}
                  actionId={action.id}
                  onDone={load}
                />
              )}
              {challengeWindowClosed(action) && (
                <div className="text-xs text-cyber-muted">
                  <FormattedMessage defaultMessage="The six month window to challenge this decision has closed." />
                </div>
              )}
              {canChallenge(action) && (
                <div className="text-xs text-cyber-muted">
                  <FormattedMessage
                    defaultMessage="You can challenge this until {date}. You also keep any right you have to go to court."
                    values={{
                      date: (
                        <FormattedDate
                          value={action.challenge_until}
                          dateStyle="medium"
                        />
                      ),
                    }}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}
