import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";
import {
  type SupportChatEvent,
  SUPPORT_CHAT_MAX_MESSAGE_LENGTH,
  SUPPORT_CHAT_MAX_MESSAGES_PER_CONNECTION,
} from "../api";
import Markdown from "../components/markdown";
import { PageHeader } from "../components/section";
import Seo from "../components/seo";
import Spinner from "../components/spinner";
import useLogin from "../hooks/login";
import useSupportChatAvailable from "../hooks/support-chat";
import {
  appendUserMessage,
  applyChatEvent,
  type ChatMessage,
  emptyChatState,
  isThinking,
  stallTurn,
  type ToolCall,
} from "../utils/support-chat";

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

/**
 * Backoff between reconnect attempts, in ms; the last value repeats.
 *
 * A drop is expected rather than exceptional: an agent turn can run for minutes
 * (model latency plus tool calls) and emits nothing over the socket while it
 * does, so anything between the browser and the API that times out an idle
 * connection will cut it mid-answer. Conversation history is stored per account
 * server-side, so reconnecting resumes where it left off.
 */
const RECONNECT_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000];

/**
 * How long a turn may produce nothing at all before it is treated as dead.
 *
 * Silence is not evidence of a dead connection here: the server pings every
 * 20s whether or not the turn is progressing, so a socket whose agent task has
 * hung looks exactly like a healthy one, and a half-open TCP connection reports
 * `OPEN` long after the peer stopped listening. Neither produces a `close`
 * event, so without a deadline the composer waits forever for a terminal frame.
 *
 * Generous, because a legitimate turn can be slow: the model streams tokens as
 * it generates, so two minutes of *total* silence means something upstream
 * stopped, not that the answer is long.
 */
const TURN_STALL_MS = 120_000;

/**
 * Live chat with the AI support agent (`WebSocket /api/v1/support/chat`).
 *
 * The agent can read the caller's account, VMs, payments and VM history, and
 * can start/stop/restart VMs. It deliberately cannot extend, refund or delete —
 * those go to the contact form on /account/support.
 */
export function AccountSupportChatPage() {
  const login = useLogin();
  const { formatMessage } = useIntl();
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string>();
  const [chat, setChat] = useState(emptyChatState);
  const [input, setInput] = useState("");
  /** Messages sent on the current socket — the server caps this per connection. */
  const [sentCount, setSentCount] = useState(0);
  /** Bumped to force a reconnect. */
  const [attempt, setAttempt] = useState(0);
  /** Consecutive failed/dropped connections, for the backoff. Reset on open. */
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // undefined while probing: don't open a socket, and don't claim the feature
  // is missing, until we know.
  const chatAvailable = useSupportChatAvailable();

  /**
   * Bumped on every frame received. Restarts the stall deadline, so progress
   * of any kind (a token, a tool frame) counts as the turn being alive.
   */
  const [lastFrameAt, setLastFrameAt] = useState(0);

  const { messages, awaitingReply } = chat;

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!login?.api || !chatAvailable) return;

      setStatus("connecting");
      setError(undefined);

      let ws: WebSocket;
      try {
        // Connecting mints a single-use ticket over HTTP first, so this can
        // fail before a socket ever exists.
        ws = await login.api.connectSupportChat();
      } catch (e) {
        if (!cancelled) {
          setStatus("disconnected");
          setError(e instanceof Error ? e.message : String(e));
        }
        return;
      }

      if (cancelled) {
        ws.close();
        return;
      }

      wsRef.current = ws;
      setStatus("connected");
      setSentCount(0);
      retriesRef.current = 0;

      ws.onmessage = (e) => {
        if (typeof e.data !== "string") return;
        let parsed: SupportChatEvent;
        try {
          parsed = JSON.parse(e.data) as SupportChatEvent;
        } catch {
          // Not a frame we understand — ignore rather than break the session.
          return;
        }
        setLastFrameAt(Date.now());
        setChat((c) => applyChatEvent(c, parsed));
      };
      ws.onclose = () => {
        setChat((c) => {
          // A turn was in flight, so the reply is never coming: say so instead
          // of silently clearing the spinner and leaving the question looking
          // answered-but-empty.
          const next = c.awaitingReply
            ? applyChatEvent(c, {
                type: "error",
                message: formatMessage({
                  defaultMessage:
                    "The connection dropped before the reply finished. Reconnecting — ask again once it's back.",
                }),
              })
            : c;
          return { ...next, awaitingReply: false };
        });
        if (cancelled) return;

        // A drop is not the end of the conversation: history is kept per
        // account server-side, so reconnecting resumes it. Retry rather than
        // leaving the user looking at a dead page with a button to press.
        const delay =
          RECONNECT_BACKOFF_MS[
            Math.min(retriesRef.current, RECONNECT_BACKOFF_MS.length - 1)
          ];
        retriesRef.current += 1;
        setStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(
          () => setAttempt((a) => a + 1),
          delay,
        );
      };
      ws.onerror = () => setStatus("disconnected");
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [login, attempt, chatAvailable]);

  // Keep the newest message in view as tokens stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Give up on a turn that has gone completely silent, and take the socket down
  // with it: if the reply is missing because the connection is half-open, the
  // only way to find out is to build a new one.
  useEffect(() => {
    if (!awaitingReply) return;
    const timer = setTimeout(() => {
      setChat((c) =>
        stallTurn(
          c,
          formatMessage({
            defaultMessage:
              "No reply came back for that message. Reconnecting — please ask again.",
          }),
        ),
      );
      wsRef.current?.close();
    }, TURN_STALL_MS);
    return () => clearTimeout(timer);
  }, [awaitingReply, lastFrameAt, formatMessage]);

  const atMessageLimit = sentCount >= SUPPORT_CHAT_MAX_MESSAGES_PER_CONNECTION;
  const tooLong = input.length > SUPPORT_CHAT_MAX_MESSAGE_LENGTH;
  const canSend =
    status === "connected" &&
    !awaitingReply &&
    !atMessageLimit &&
    !tooLong &&
    input.trim().length > 0;

  function send() {
    const ws = wsRef.current;
    if (!canSend || !ws) return;
    // `send()` on a socket that is closing or closed discards the data silently
    // rather than throwing, so marking the turn in flight here would wait for a
    // reply to a message the server never received — the composer would lock up
    // with no error and no way back. Rebuild the connection instead, keeping
    // what was typed.
    if (ws.readyState !== WebSocket.OPEN) {
      setStatus("reconnecting");
      setAttempt((a) => a + 1);
      return;
    }
    const text = input.trim();
    ws.send(text);
    setLastFrameAt(Date.now());
    setChat((c) => appendUserMessage(c, text));
    setInput("");
    setSentCount((c) => c + 1);
  }

  const statusColor =
    status === "connected"
      ? "text-green-500"
      : status === "disconnected"
        ? "text-red-500"
        : "text-yellow-500";

  const statusLabel =
    status === "connected"
      ? formatMessage({ defaultMessage: "Connected" })
      : status === "disconnected"
        ? formatMessage({ defaultMessage: "Disconnected" })
        : status === "reconnecting"
          ? formatMessage({ defaultMessage: "Reconnecting..." })
          : formatMessage({ defaultMessage: "Connecting..." });

  // Reached by a stale link or a direct URL on a deployment that doesn't run
  // the agent: say so and point at email support, rather than sitting on
  // "Connecting..." against a route that returns 404.
  if (chatAvailable === false) {
    return (
      <div className="flex flex-col gap-4">
        <Seo noindex={true} />
        <PageHeader
          title={<FormattedMessage defaultMessage="Support Chat" />}
        />
        <div className="rounded-sm border border-cyber-border bg-cyber-panel p-4 text-sm text-cyber-muted">
          <FormattedMessage
            defaultMessage="Live chat isn't available right now. {link} and the team will get back to you."
            values={{
              link: (
                <Link
                  to="/account/support"
                  className="text-cyber-accent underline"
                >
                  <FormattedMessage defaultMessage="Send us a message" />
                </Link>
              ),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      <PageHeader
        title={<FormattedMessage defaultMessage="Support Chat" />}
        description={
          <FormattedMessage defaultMessage="Chat with the LNVPS support agent. It can look up your account, VMs and payments, and start, stop or restart a VM." />
        }
        actions={
          <div className="flex items-center gap-3">
            <span className={classNames("text-sm font-medium", statusColor)}>
              {statusLabel}
            </span>
            {(status === "disconnected" || status === "reconnecting") && (
              <button
                className="text-sm px-3 py-1 border border-cyber-border rounded-sm hover:border-cyber-primary hover:text-cyber-primary"
                onClick={() => setAttempt((a) => a + 1)}
              >
                <FormattedMessage defaultMessage="Reconnect" />
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="rounded-sm bg-cyber-danger/20 p-4 text-sm text-cyber-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col rounded-sm border border-cyber-border bg-cyber-panel">
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto p-4 h-[60vh]"
        >
          {messages.length === 0 && (
            <div className="m-auto max-w-md text-center text-sm text-cyber-muted">
              <FormattedMessage defaultMessage="Ask anything about your account — billing, a VM that won't boot, or what a charge was for. For refunds, extensions or deletions, use the contact form instead." />
            </div>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {isThinking(chat) && (
            <div className="flex items-center gap-2 text-xs text-cyber-muted italic">
              <Spinner width={12} height={12} />
              <FormattedMessage defaultMessage="Thinking…" />
            </div>
          )}
        </div>

        <div className="border-t border-cyber-border p-3">
          <textarea
            className="w-full resize-none rounded-sm border border-cyber-border bg-cyber-panel-light p-2 text-sm text-cyber-text outline-none focus:border-cyber-primary"
            rows={3}
            value={input}
            disabled={status !== "connected" || atMessageLimit}
            placeholder={formatMessage({
              defaultMessage: "Type a message…",
            })}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter inserts a newline.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-xs text-cyber-muted">
              {tooLong ? (
                <span className="text-cyber-danger">
                  <FormattedMessage
                    defaultMessage="Messages are limited to {max} characters."
                    values={{ max: SUPPORT_CHAT_MAX_MESSAGE_LENGTH }}
                  />
                </span>
              ) : atMessageLimit ? (
                <FormattedMessage defaultMessage="Message limit reached for this session — reconnect to continue. Your conversation history is kept." />
              ) : (
                <FormattedMessage defaultMessage="Enter to send, Shift+Enter for a new line." />
              )}
            </div>
            <button
              className="rounded-sm border border-cyber-border px-4 py-2 text-sm font-medium enabled:hover:border-cyber-primary enabled:hover:text-cyber-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSend}
              onClick={send}
            >
              <FormattedMessage defaultMessage="Send" />
            </button>
          </div>
        </div>
      </div>

      <p className="m-0 text-xs text-cyber-muted">
        <FormattedMessage
          defaultMessage="The agent can't extend, refund or delete a VM. For those, {link}."
          values={{
            link: (
              <Link
                to="/account/support"
                className="text-cyber-accent underline"
              >
                <FormattedMessage defaultMessage="contact support by email" />
              </Link>
            ),
          }}
        />
      </p>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={classNames("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={classNames(
          // min-w-0 so a long line inside can shrink the bubble instead of
          // widening it: a flex item's default min-width is its content, which
          // is what lets a code block push the whole column past the viewport.
          "max-w-[85%] min-w-0 overflow-hidden rounded-sm px-3 py-2 text-sm",
          isUser
            ? "bg-cyber-primary/15 text-cyber-text"
            : message.failed
              ? "bg-cyber-danger/20 text-cyber-danger"
              : "bg-cyber-panel-light text-cyber-text",
        )}
      >
        {message.tools && message.tools.length > 0 && (
          <ToolCalls tools={message.tools} />
        )}
        {message.text.length > 0 &&
          (isUser || message.failed ? (
            <span className="whitespace-pre-wrap">{message.text}</span>
          ) : (
            <Markdown content={message.text} />
          ))}
      </div>
    </div>
  );
}

/**
 * The lookups a turn ran, as one chip each.
 *
 * Kept in the transcript after they finish rather than shown as a line that
 * disappears: which tools a question triggered is what makes a slow or wrong
 * answer explicable afterwards. Only privileged accounts are sent these frames.
 */
function ToolCalls({ tools }: { tools: Array<ToolCall> }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {tools.map((tool, i) => (
        <span
          key={`${tool.name}-${i}`}
          className={classNames(
            "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] leading-5",
            tool.running
              ? "border-cyber-primary/40 text-cyber-primary"
              : "border-cyber-border text-cyber-muted",
          )}
        >
          {tool.running ? (
            <Spinner width={10} height={10} className="shrink-0" />
          ) : (
            <svg
              width={10}
              height={10}
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0"
              aria-hidden="true"
            >
              <path
                d="M3 8.5 6.5 12 13 4"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {tool.name}
        </span>
      ))}
    </div>
  );
}
