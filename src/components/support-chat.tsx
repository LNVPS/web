import classNames from "classnames";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  LNVpsApi,
  type SupportChatEvent,
  SUPPORT_CHAT_MAX_MESSAGE_LENGTH,
  SUPPORT_CHAT_MAX_MESSAGES_PER_CONNECTION,
  SUPPORT_CHAT_MAX_MESSAGES_PER_CONNECTION_ANONYMOUS,
} from "../api";
import { ApiUrl } from "../const";
import useLogin from "../hooks/login";
import {
  appendUserMessage,
  applyChatEvent,
  type ChatMessage,
  clearGuestSessionId,
  emptyChatState,
  isThinking,
  loadGuestSessionId,
  saveGuestSessionId,
  stallTurn,
  type ToolCall,
} from "../utils/support-chat";
import Markdown from "./markdown";
import Spinner from "./spinner";

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
 * connection will cut it mid-answer. Conversation history is stored server-side
 * — per account when logged in, per guest session id when not — so reconnecting
 * resumes where it left off.
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

export interface SupportChatProps {
  /**
   * Shown in the transcript before the first message, to set expectations
   * about what this particular chat can answer.
   */
  emptyState: ReactNode;
  /** Height of the scrolling transcript. */
  heightClass?: string;
}

/**
 * Live chat with the AI support agent (`WebSocket /api/v1/support/chat`).
 *
 * Serves both audiences from one component, picking the connection by whether
 * anyone is logged in. An authenticated session gets the account tools — the
 * agent can read the caller's account, VMs, payments and VM history, and can
 * start/stop/restart VMs (it deliberately cannot extend, refund or delete). A
 * logged-out visitor gets a guest session with the public catalogue only, which
 * is what makes the chat usable on the public contact page.
 *
 * The caller is responsible for having checked availability first: an
 * anonymous connection to a server with guest chat switched off is refused with
 * an `error` frame rather than served.
 */
export default function SupportChat({
  emptyState,
  heightClass = "h-[60vh]",
}: SupportChatProps) {
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
  /**
   * Guest session id, held in a ref rather than state: it changes as a result
   * of connecting, and driving it through state would tear the socket down and
   * rebuild it the moment the server told us which session we got.
   */
  const guestSessionRef = useRef<string | undefined>(undefined);
  /**
   * Whether this connection resumed a conversation from a previous visit.
   *
   * Worth saying out loud, because the server replays the transcript to the
   * *model* but not to the browser: the visitor would otherwise see an empty
   * box and an agent that inexplicably remembers what they said yesterday.
   */
  const [resumed, setResumed] = useState(false);

  const anonymous = !login?.api;

  /**
   * Bumped on every frame received. Restarts the stall deadline, so progress
   * of any kind (a token, a tool frame) counts as the turn being alive.
   */
  const [lastFrameAt, setLastFrameAt] = useState(0);

  const { messages, awaitingReply } = chat;

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      setStatus("connecting");
      setError(undefined);

      let ws: WebSocket;
      try {
        if (login?.api) {
          // Connecting mints a single-use ticket over HTTP first, so this can
          // fail before a socket ever exists.
          ws = await login.api.connectSupportChat();
        } else {
          // Resume the guest transcript if this tab already has one. An id the
          // server did not issue is ignored in favour of a fresh one, so a
          // stale value is harmless.
          const stored = guestSessionRef.current ?? loadGuestSessionId();
          guestSessionRef.current = stored;
          setResumed(stored !== undefined);
          ws = await new LNVpsApi(
            ApiUrl,
            undefined,
          ).connectAnonymousSupportChat(stored);
        }
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
        // Carries no transcript content, only the identity to reconnect with.
        if (parsed.type === "session") {
          guestSessionRef.current = parsed.id;
          saveGuestSessionId(parsed.id);
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

        // A drop is not the end of the conversation: history is kept
        // server-side, so reconnecting resumes it. Retry rather than leaving
        // the user looking at a dead page with a button to press.
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
  }, [login, attempt]);

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

  const maxMessages = anonymous
    ? SUPPORT_CHAT_MAX_MESSAGES_PER_CONNECTION_ANONYMOUS
    : SUPPORT_CHAT_MAX_MESSAGES_PER_CONNECTION;
  const atMessageLimit = sentCount >= maxMessages;
  const tooLong = input.length > SUPPORT_CHAT_MAX_MESSAGE_LENGTH;
  const canSend =
    status === "connected" &&
    !awaitingReply &&
    !atMessageLimit &&
    !tooLong &&
    input.trim().length > 0;

  /**
   * Abandon the stored guest conversation and reconnect into a fresh one.
   *
   * Clearing the id before the socket is rebuilt is what makes it a new
   * session: the server issues one on a connection that presents none.
   */
  function startOver() {
    clearGuestSessionId();
    guestSessionRef.current = undefined;
    setResumed(false);
    setChat(emptyChatState);
    setAttempt((a) => a + 1);
  }

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

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-sm bg-cyber-danger/20 p-4 text-sm text-cyber-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col rounded-sm border border-cyber-border bg-cyber-panel">
        <div className="flex items-center justify-end gap-3 border-b border-cyber-border px-4 py-2">
          {anonymous && (resumed || messages.length > 0) && (
            <button
              className="mr-auto text-xs text-cyber-muted underline hover:text-cyber-primary"
              onClick={startOver}
            >
              <FormattedMessage defaultMessage="Start a new conversation" />
            </button>
          )}
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

        <div
          ref={scrollRef}
          className={classNames(
            "flex flex-col gap-3 overflow-y-auto p-4",
            heightClass,
          )}
        >
          {messages.length === 0 && (
            <div className="m-auto max-w-md text-center text-sm text-cyber-muted">
              {resumed ? (
                <FormattedMessage defaultMessage="Picking up your earlier conversation — the agent still has the context, even though the messages above aren't shown again. Start a new one if you'd rather begin from scratch." />
              ) : (
                emptyState
              )}
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
