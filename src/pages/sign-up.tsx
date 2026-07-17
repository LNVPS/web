import { EventPublisher, PrivateKeySigner } from "@snort/system";
import { AsyncButton } from "../components/button";
import { useContext, useEffect, useRef, useState } from "react";
import { hexToBech32 } from "@snort/shared";
import { openFile } from "../utils";
import { SnortContext } from "@snort/system-react";
import { Blossom } from "../blossom";
import { LoginState } from "../login";
import Login from "../components/login";
import PasskeyIcon from "../components/passkey-icon";
import {
  browserSupportsWebAuthn,
  isWebauthnCancellation,
  passkeyRegister,
} from "../webauthn";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";

type Mode = "signin" | "create";

/**
 * Types out a shell command one character at a time. Re-types whenever `text`
 * changes (e.g. switching Sign in / Create account). Respects reduced motion by
 * rendering the full command instantly.
 */
function TypedCommand({ text }: { text: string }) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(prefersReduced ? text : "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (prefersReduced) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const tick = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) {
        timer.current = setTimeout(tick, 55);
      }
    };
    timer.current = setTimeout(tick, 55);
    return () => clearTimeout(timer.current);
  }, [text, prefersReduced]);

  return <span className="text-cyber-primary">{shown}</span>;
}

export default function SignUpPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File>();
  const [key, setKey] = useState<PrivateKeySigner>();
  const system = useContext(SnortContext);
  const { formatMessage } = useIntl();

  async function uploadImage() {
    const f = await openFile();
    setFile(f);
  }

  async function registerPasskey() {
    setError("");
    try {
      await passkeyRegister(name || undefined);
      window.history.back();
    } catch (e) {
      if (isWebauthnCancellation(e)) return;
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({ defaultMessage: "Passkey registration failed" }),
      );
    }
  }

  async function spawnAccount() {
    if (!key) return;
    setError("");
    const pub = new EventPublisher(key, key.getPubKey());

    let pic = undefined;
    if (file) {
      const b = new Blossom("https://nostr.download", pub);
      const up = await b.upload(file);
      if (up.url) {
        pic = up.url;
      } else {
        setError(formatMessage({ defaultMessage: "Upload failed" }));
        return;
      }
    }
    const ev = await pub.metadata({
      name: name,
      picture: pic,
    });
    system.BroadcastEvent(ev);
    LoginState.loginPrivateKey(key.privateKey);
    window.history.back();
  }

  return (
    <div className="flex justify-center py-6 md:py-14">
      <Seo noindex={true} />
      <div className="w-full max-w-xl">
        {/* Terminal window — a VPS is something you shell into, so is the login */}
        <div className="rounded-md border border-cyber-border bg-cyber-panel/80 light:bg-white backdrop-blur-sm shadow-neon-lg light:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-cyber-border bg-cyber-darker/60 light:bg-black/[0.03]">
            <span className="w-3 h-3 rounded-full bg-cyber-danger/70" />
            <span className="w-3 h-3 rounded-full bg-cyber-warning/70" />
            <span className="w-3 h-3 rounded-full bg-cyber-primary/70" />
            <span className="ml-2 text-xs text-cyber-muted font-monospace tracking-wide">
              ssh auth@lnvps.net
            </span>
          </div>

          <div className="px-8 py-8 md:px-10 md:py-10 flex flex-col gap-6">
            <div className="font-monospace text-base text-cyber-primary">
              <span className="text-cyber-muted">lnvps:~$</span>{" "}
              <TypedCommand
                text={
                  mode === "signin"
                    ? formatMessage({ defaultMessage: "authenticate" })
                    : formatMessage({ defaultMessage: "generate" })
                }
              />
              <span className="inline-block w-2 h-4 -mb-0.5 ml-1 bg-cyber-primary animate-pulse" />
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-sm border border-cyber-border bg-cyber-darker/50 text-sm">
              <button
                className={
                  "py-1.5 rounded-sm transition-all " +
                  (mode === "signin"
                    ? "bg-cyber-panel text-cyber-primary shadow-neon-sm light:shadow-none light:border light:border-cyber-border"
                    : "text-cyber-muted hover:text-cyber-text")
                }
                onClick={() => setMode("signin")}
              >
                <FormattedMessage defaultMessage="Sign in" />
              </button>
              <button
                className={
                  "py-1.5 rounded-sm transition-all " +
                  (mode === "create"
                    ? "bg-cyber-panel text-cyber-primary shadow-neon-sm light:shadow-none light:border light:border-cyber-border"
                    : "text-cyber-muted hover:text-cyber-text")
                }
                onClick={() => setMode("create")}
              >
                <FormattedMessage defaultMessage="Create account" />
              </button>
            </div>

            {mode === "signin" ? (
              <Login
                onLogin={() => {
                  window.history.back();
                }}
              />
            ) : (
              <CreateAccount
                name={name}
                setName={setName}
                file={file}
                uploadImage={uploadImage}
                error={error}
                genKey={() => setKey(PrivateKeySigner.random())}
                spawnAccount={spawnAccount}
                registerPasskey={registerPasskey}
                hasPasskeys={browserSupportsWebAuthn()}
                theKey={key}
                formatMessage={formatMessage}
              />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-cyber-muted mt-16 md:mt-20 leading-relaxed">
          <FormattedMessage
            defaultMessage="LNVPS accounts use Nostr or a login provider. {link}"
            values={{
              link: (
                <a
                  href="https://nostr.how/en/what-is-nostr"
                  target="_blank"
                  className="underline"
                >
                  <FormattedMessage defaultMessage="What is Nostr?" />
                </a>
              ),
            }}
          />
        </p>
      </div>
    </div>
  );
}

function CreateAccount({
  name,
  setName,
  file,
  uploadImage,
  error,
  genKey,
  spawnAccount,
  registerPasskey,
  hasPasskeys,
  theKey,
  formatMessage,
}: {
  name: string;
  setName: (s: string) => void;
  file?: File;
  uploadImage: () => void;
  error: string;
  genKey: () => void;
  spawnAccount: () => Promise<void>;
  registerPasskey: () => Promise<void>;
  hasPasskeys: boolean;
  theKey?: PrivateKeySigner;
  formatMessage: ReturnType<typeof useIntl>["formatMessage"];
}) {
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="text-cyber-danger text-sm border border-cyber-danger/40 bg-cyber-danger/5 rounded-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Passwordless: a passkey IS the account (no key to store). */}
      {hasPasskeys && !theKey && (
        <>
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-cyber-primary">
              <FormattedMessage defaultMessage="Passwordless" />
            </div>
            <AsyncButton onClick={registerPasskey} className="h-12">
              <span className="inline-flex items-center justify-center gap-2">
                <PasskeyIcon />
                <FormattedMessage defaultMessage="Create a passkey account" />
              </span>
            </AsyncButton>
            <p className="text-xs text-cyber-muted">
              <FormattedMessage defaultMessage="Nothing to save — your device (Face ID, Touch ID, Windows Hello or a security key) secures the account." />
            </p>
          </div>
          <div className="flex gap-3 items-center text-cyber-muted text-xs uppercase tracking-widest">
            <div className="h-px bg-cyber-border w-full" />
            <FormattedMessage defaultMessage="or" />
            <div className="h-px bg-cyber-border w-full" />
          </div>
        </>
      )}

      {/* Nostr account: generates a Nostr keypair with optional profile. */}
      {hasPasskeys && (
        <div className="text-xs uppercase tracking-wider text-cyber-primary">
          <FormattedMessage defaultMessage="Nostr account" />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 shrink-0 bg-cyber-darker rounded-sm relative cursor-pointer overflow-hidden border border-cyber-border"
          onClick={uploadImage}
        >
          <div className="absolute bg-cyber-darker/70 w-full h-full hover:opacity-90 opacity-0 flex items-center justify-center text-xs text-cyber-primary transition-opacity">
            <FormattedMessage defaultMessage="Upload" />
          </div>
          {file && (
            <img
              src={URL.createObjectURL(file)}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-1 w-full">
          <label className="text-cyber-muted text-xs uppercase tracking-wider">
            <FormattedMessage defaultMessage="Display name" />
          </label>
          <input
            type="text"
            placeholder={formatMessage({ defaultMessage: "satoshi" })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      {!theKey ? (
        <AsyncButton onClick={async () => genKey()}>
          <FormattedMessage defaultMessage="Generate Nostr key" />
        </AsyncButton>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-cyber-muted text-xs uppercase tracking-wider">
              <FormattedMessage defaultMessage="Your new secret key" />
            </span>
            <div className="font-monospace text-sm select-all break-all border border-cyber-border bg-cyber-darker/60 rounded-sm px-3 py-2 text-cyber-accent">
              {hexToBech32("nsec", theKey.privateKey)}
            </div>
            <b className="text-cyber-warning text-xs">
              <FormattedMessage defaultMessage="Save this key now — it CANNOT be recovered." />
            </b>
          </div>
          <AsyncButton
            onClick={spawnAccount}
            className="bg-cyber-primary text-cyber-darker border-cyber-primary hover:shadow-neon"
          >
            <FormattedMessage defaultMessage="Continue" />
          </AsyncButton>
        </div>
      )}
    </div>
  );
}
