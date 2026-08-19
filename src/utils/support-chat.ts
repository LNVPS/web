import { SupportChatEvent } from "../api";

/** A rendered line in the support chat transcript. */
export interface ChatMessage {
  id: number;
  role: "user" | "agent";
  text: string;
  /** Agent turn still streaming tokens — no terminal frame has arrived yet. */
  streaming?: boolean;
  /** Turn ended with an `error` frame; rendered in the danger tone. */
  failed?: boolean;
}

/**
 * Everything the chat UI derives from the socket. Kept as one value so the
 * frame reducer is a pure function and can be tested without a DOM.
 */
export interface ChatState {
  messages: Array<ChatMessage>;
  /** Tool names the agent is currently running (admins only receive these). */
  activeTools: Array<string>;
  /** True between sending a message and its terminal `final`/`error` frame. */
  awaitingReply: boolean;
  /** Monotonic id source for message keys. */
  nextId: number;
}

export const emptyChatState: ChatState = {
  messages: [],
  activeTools: [],
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
    activeTools: [],
  };
}

/**
 * Apply one frame from `/api/v1/support/chat`.
 *
 * `token` appends to the in-flight agent turn (creating it on the first
 * token); `final` replaces the accumulated text with the authoritative reply,
 * which the server guarantees equals the concatenated tokens. Unknown frame
 * types are ignored on purpose — the server may add more, and a client that
 * treats an unrecognised frame as an error breaks on a server upgrade.
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
        activeTools: [],
      };
    case "error":
      return { ...applyError(state, ev.message), awaitingReply: false };
    case "tool_start":
      return { ...state, activeTools: [...state.activeTools, ev.name] };
    case "tool_done": {
      const i = state.activeTools.indexOf(ev.name);
      if (i === -1) return state;
      return {
        ...state,
        activeTools: [
          ...state.activeTools.slice(0, i),
          ...state.activeTools.slice(i + 1),
        ],
      };
    }
    default:
      return state;
  }
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
        activeTools: [],
        nextId: state.nextId + 1,
      };
    }
    messages.push({ ...last, ...failure, id: last.id, streaming: false });
    return { ...state, messages, activeTools: [] };
  }

  return {
    ...state,
    messages: [...state.messages, failure],
    activeTools: [],
    nextId: state.nextId + 1,
  };
}
