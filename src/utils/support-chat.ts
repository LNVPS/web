import { SupportChatEvent } from "../api";

/**
 * An internal lookup the agent ran while answering.
 *
 * Only privileged callers receive the frames these are built from, so a
 * customer's transcript never has any.
 */
export interface ToolCall {
  name: string;
  /** Still executing — no `tool_done` frame for it yet. */
  running: boolean;
}

/** A rendered line in the support chat transcript. */
export interface ChatMessage {
  id: number;
  role: "user" | "agent";
  text: string;
  /** Agent turn still streaming tokens — no terminal frame has arrived yet. */
  streaming?: boolean;
  /** Turn ended with an `error` frame; rendered in the danger tone. */
  failed?: boolean;
  /**
   * Lookups the agent ran to produce this turn, in the order they started.
   *
   * Attached to the turn rather than held as a separate "currently running"
   * list: what the agent did is part of the answer and stays worth seeing once
   * it has finished, and a transient line that vanishes on completion leaves no
   * record of why a reply took as long as it did.
   */
  tools?: Array<ToolCall>;
}

/**
 * Everything the chat UI derives from the socket. Kept as one value so the
 * frame reducer is a pure function and can be tested without a DOM.
 */
export interface ChatState {
  messages: Array<ChatMessage>;
  /** True between sending a message and its terminal `final`/`error` frame. */
  awaitingReply: boolean;
  /** Monotonic id source for message keys. */
  nextId: number;
}

export const emptyChatState: ChatState = {
  messages: [],
  awaitingReply: false,
  nextId: 1,
};

/** Append a message the user just sent and mark the turn as in flight. */
export function appendUserMessage(state: ChatState, text: string): ChatState {
  return {
    ...state,
    messages: [...state.messages, { id: state.nextId, role: "user", text }],
    nextId: state.nextId + 1,
    awaitingReply: true,
  };
}

/**
 * Abandon a turn that has gone silent, so the composer unlocks.
 *
 * A stalled agent is indistinguishable from a working one from the browser:
 * the server pings the socket every 20s regardless of whether the turn is
 * making progress, and a half-open connection reports itself as open until TCP
 * eventually gives up. Without this the UI waits for a terminal frame that is
 * never coming and refuses to send anything else — the reported "stuck on
 * Thinking… forever".
 *
 * A no-op unless a turn is actually in flight, so a late-firing timer cannot
 * inject an error into a conversation that already completed.
 */
export function stallTurn(state: ChatState, message: string): ChatState {
  if (!state.awaitingReply) return state;
  return applyChatEvent(state, { type: "error", message });
}

/**
 * Apply one frame from `/api/v1/support/chat`.
 *
 * `token` appends to the in-flight agent turn (creating it on the first
 * token); `final` replaces the accumulated text with the authoritative reply,
 * which the server guarantees equals the concatenated tokens. `tool_start` /
 * `tool_done` annotate that same turn rather than producing lines of their own.
 * Unknown frame types are ignored on purpose — the server may add more, and a
 * client that treats an unrecognised frame as an error breaks on a server
 * upgrade.
 */
export function applyChatEvent(
  state: ChatState,
  ev: SupportChatEvent,
): ChatState {
  switch (ev.type) {
    case "token":
      return appendToStream(state, ev.text, false);
    case "final":
      return {
        ...appendToStream(state, ev.text, true),
        awaitingReply: false,
      };
    case "error":
      return { ...applyError(state, ev.message), awaitingReply: false };
    case "tool_start":
      // Opens the turn if the agent called a tool before saying anything,
      // which is the common shape of a lookup question.
      return openTurn(state, (m) => ({
        ...m,
        tools: [...(m.tools ?? []), { name: ev.name, running: true }],
      }));
    case "tool_done":
      return updateTurn(state, (m) => {
        const tools = m.tools ?? [];
        // Newest matching call first: the same tool can run more than once in a
        // turn and the frames carry no call id to pair them up.
        let i = tools.length - 1;
        while (i >= 0 && !(tools[i].running && tools[i].name === ev.name)) i--;
        if (i === -1) return m;
        return {
          ...m,
          tools: [
            ...tools.slice(0, i),
            { ...tools[i], running: false },
            ...tools.slice(i + 1),
          ],
        };
      });
    default:
      return state;
  }
}

/**
 * Whether to show the "thinking" indicator.
 *
 * True only while a turn is in flight and has produced no visible text yet:
 * once tokens are landing, the reply itself is the progress indicator, and a
 * spinner underneath it just competes with the text arriving above it.
 */
export function isThinking(state: ChatState): boolean {
  return state.awaitingReply && (streamingTurn(state)?.text ?? "") === "";
}

/** The in-flight agent turn, if one is open. */
function streamingTurn(state: ChatState): ChatMessage | undefined {
  const last = state.messages[state.messages.length - 1];
  return last?.role === "agent" && last.streaming ? last : undefined;
}

/**
 * Apply `fn` to the in-flight agent turn, opening one if it hasn't started.
 *
 * Tool frames must not start a *message* of their own: `final` carries the
 * whole visible reply and replaces the open turn's text, so a tool frame that
 * closed the turn would leave the narration before it duplicated in the
 * transcript.
 */
function openTurn(
  state: ChatState,
  fn: (message: ChatMessage) => ChatMessage,
): ChatState {
  const open = streamingTurn(state);
  if (open) {
    return {
      ...state,
      messages: [...state.messages.slice(0, -1), fn(open)],
    };
  }
  return {
    ...state,
    messages: [
      ...state.messages,
      fn({ id: state.nextId, role: "agent", text: "", streaming: true }),
    ],
    nextId: state.nextId + 1,
  };
}

/**
 * Apply `fn` to the in-flight agent turn if there is one; otherwise a no-op.
 *
 * Returns the identical state when nothing changed, so a stray frame doesn't
 * re-render the transcript.
 */
function updateTurn(
  state: ChatState,
  fn: (message: ChatMessage) => ChatMessage,
): ChatState {
  const open = streamingTurn(state);
  if (!open) return state;
  const next = fn(open);
  if (next === open) return state;
  return { ...state, messages: [...state.messages.slice(0, -1), next] };
}

function appendToStream(
  state: ChatState,
  text: string,
  terminal: boolean,
): ChatState {
  const last = state.messages[state.messages.length - 1];
  if (last?.role === "agent" && last.streaming) {
    const messages = state.messages.slice(0, -1);
    messages.push({
      ...last,
      text: terminal ? text : last.text + text,
      streaming: !terminal,
    });
    return { ...state, messages };
  }
  return {
    ...state,
    messages: [
      ...state.messages,
      { id: state.nextId, role: "agent", text, streaming: !terminal },
    ],
    nextId: state.nextId + 1,
  };
}

/**
 * A turn that streamed some content and then failed keeps what arrived and the
 * error is added as its own line; a turn that failed before any token had the
 * placeholder replaced, so an empty bubble is never left behind.
 */
function applyError(state: ChatState, message: string): ChatState {
  const last = state.messages[state.messages.length - 1];
  const failure: ChatMessage = {
    id: state.nextId,
    role: "agent",
    text: message,
    failed: true,
  };

  if (last?.role === "agent" && last.streaming) {
    const messages = state.messages.slice(0, -1);
    if (last.text.length > 0) {
      messages.push({ ...last, streaming: false }, failure);
      return {
        ...state,
        messages,
        nextId: state.nextId + 1,
      };
    }
    // Spread order keeps `tools` from the placeholder: a turn that failed after
    // running lookups should still show which ones it ran.
    messages.push({ ...last, ...failure, id: last.id, streaming: false });
    return { ...state, messages };
  }

  return {
    ...state,
    messages: [...state.messages, failure],
    nextId: state.nextId + 1,
  };
}
