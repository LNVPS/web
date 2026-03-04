import { useState, useEffect, useMemo, useRef } from "react";
import { EventKind, RequestBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { NostrProfile } from "../const";
import { LoginState } from "../login";
import { AsyncButton } from "./button";
import useLogin from "../hooks/login";
import { FormattedMessage, useIntl } from "react-intl";

interface DecryptedMessage {
  id: string;
  content: string;
  created_at: number;
  fromMe: boolean;
}

function dmCacheKey(pubkey: string) {
  return `nip17-dm:${pubkey}`;
}

function loadDmCache(pubkey: string): DecryptedMessage[] {
  try {
    const raw = window.localStorage.getItem(dmCacheKey(pubkey));
    if (!raw) return [];
    return JSON.parse(raw) as DecryptedMessage[];
  } catch {
    return [];
  }
}

function saveDmCache(pubkey: string, messages: DecryptedMessage[]) {
  window.localStorage.setItem(dmCacheKey(pubkey), JSON.stringify(messages));
}

export default function Nip17DM() {
  const login = useLogin();
  const { formatMessage, locale } = useIntl();
  const [messages, setMessages] = useState<DecryptedMessage[]>(() =>
    login?.publicKey ? loadDmCache(login.publicKey) : [],
  );
  const [messageInput, setMessageInput] = useState("");
  // processedIds is seeded from the cache so already-decrypted wraps are skipped
  const processedIds = useRef<Set<string>>(new Set(messages.map((m) => m.id)));
  const scrollRef = useRef<HTMLDivElement>(null);

  const supportPubkey = NostrProfile.id;

  const since = useMemo(() => {
    if (messages.length === 0) return undefined;
    return Math.max(...messages.map((m) => m.created_at));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only computed once from the initial cache

  const req = useMemo(() => {
    if (!login?.publicKey) return new RequestBuilder("nip17-dm-empty");
    const builder = new RequestBuilder(
      `nip17-dm:${login.publicKey.slice(0, 12)}`,
    );
    const filter = builder
      .withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([EventKind.GiftWrap])
      .tag("p", [login.publicKey]);
    if (since !== undefined) {
      filter.since(since);
    }
    return builder;
  }, [login?.publicKey, since]);

  const giftWraps = useRequestBuilder(req);

  useEffect(() => {
    if (!login?.publicKey) return;

    const newWraps = giftWraps.filter((ev) => !processedIds.current.has(ev.id));
    if (newWraps.length === 0) return;

    newWraps.forEach((ev) => processedIds.current.add(ev.id));

    Promise.all(
      newWraps.map(async (ev) => {
        try {
          const signer = LoginState.getSigner();
          const sealed = await signer.unwrapGift(ev);
          const rumor = await signer.unsealRumor(sealed);

          const participants = rumor.tags
            .filter((t) => t[0] === "p")
            .map((t) => t[1]);

          const isFromSupport = rumor.pubkey === supportPubkey;
          const isToSupport = participants.includes(supportPubkey);

          if (!isFromSupport && !isToSupport) return null;

          return {
            id: ev.id,
            content: rumor.content,
            created_at: rumor.created_at,
            fromMe: !isFromSupport,
          } as DecryptedMessage;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      const valid = results.filter(Boolean) as DecryptedMessage[];
      if (valid.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = valid.filter((m) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          const next = [...prev, ...newMsgs].sort(
            (a, b) => a.created_at - b.created_at,
          );
          saveDmCache(login.publicKey, next);
          return next;
        });
      }
    });
  }, [giftWraps, login?.publicKey, supportPubkey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!messageInput.trim() || !login?.publicKey) return;

    const signer = LoginState.getSigner();
    const myPubkey = login.publicKey;
    const content = messageInput.trim();

    const rumor = signer.createUnsigned(EventKind.ChatRumor, content, (eb) =>
      eb.tag(["p", supportPubkey]),
    );

    const sealedForSupport = await signer.sealRumor(rumor, supportPubkey);
    const wrapForSupport = await signer.giftWrap(
      sealedForSupport,
      supportPubkey,
    );

    const sealedForSelf = await signer.sealRumor(rumor, myPubkey);
    const wrapForSelf = await signer.giftWrap(sealedForSelf, myPubkey);

    login.system.BroadcastEvent(wrapForSupport);
    login.system.BroadcastEvent(wrapForSelf);

    const tempId = wrapForSelf.id;
    processedIds.current.add(tempId);

    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: tempId,
          content,
          created_at: rumor.created_at,
          fromMe: true,
        },
      ].sort((a, b) => a.created_at - b.created_at);
      saveDmCache(myPubkey, next);
      return next;
    });

    setMessageInput("");
  }

  if (!login) return null;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollRef}
        className="border border-cyber-border rounded-sm h-[calc(100vh-20rem)] min-h-96 overflow-y-auto p-3 flex flex-col gap-2 bg-cyber-panel"
      >
        {messages.length === 0 ? (
          <p className="text-cyber-muted text-sm text-center m-auto">
            <FormattedMessage defaultMessage="No messages yet. Start a conversation below." />
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`min-w-0 w-full max-w-prose px-3 py-2 rounded-sm text-sm ${
                  msg.fromMe
                    ? "bg-cyber-primary/20 border border-cyber-primary/30 text-cyber-text-bright"
                    : "bg-cyber-panel-light border border-cyber-border text-cyber-text"
                }`}
              >
                <div className="break-words whitespace-pre-wrap">
                  {msg.content}
                </div>
                <div className="text-xs text-cyber-muted mt-1">
                  {new Date(msg.created_at * 1000).toLocaleString(locale)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 bg-cyber-panel-light rounded-sm p-3 text-sm"
          placeholder={formatMessage({
            defaultMessage: "Type your message...",
          })}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <AsyncButton onClick={sendMessage} disabled={!messageInput.trim()}>
          <FormattedMessage defaultMessage="Send" />
        </AsyncButton>
      </div>
    </div>
  );
}
