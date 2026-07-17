import { bech32ToHex } from "@snort/shared";
import { Nip46Signer, Nip7Signer } from "@snort/system";
import { useEffect, useState } from "react";
import { LoginState } from "../login";
import { AsyncButton } from "./button";
import OAuthButtons from "./oauth-buttons";
import PasskeyIcon from "./passkey-icon";
import NostrIcon from "./nostrich-icon";
import { OAuthProviders } from "../const";
import { waitForNostrExtension } from "../utils";
import {
  browserSupportsWebAuthn,
  isWebauthnCancellation,
  passkeyLogin,
} from "../webauthn";
import { FormattedMessage, useIntl } from "react-intl";

export default function Login({ onLogin }: { onLogin?: () => void }) {
  const { formatMessage } = useIntl();
  const [keyIn, setKeyIn] = useState("");
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  // Extensions inject window.nostr asynchronously; wait for it so the button
  // shows even on a direct page load.
  const [hasExtension, setHasExtension] = useState(
    typeof window !== "undefined" && !!window.nostr,
  );

  // Resolved after mount (client-only) to avoid an SSR hydration mismatch
  // (navigator.credentials doesn't exist during server render).
  const [hasPasskeys, setHasPasskeys] = useState(false);

  useEffect(() => {
    setHasPasskeys(browserSupportsWebAuthn());
    let active = true;
    waitForNostrExtension().then((found) => {
      if (active && found) setHasExtension(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function loginPasskey() {
    setError("");
    try {
      await passkeyLogin();
      onLogin?.();
    } catch (e) {
      if (isWebauthnCancellation(e)) return;
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({ defaultMessage: "Passkey sign-in failed" }),
      );
    }
  }

  async function loginKey() {
    setError("");
    try {
      if (keyIn.startsWith("nsec1")) {
        LoginState.loginPrivateKey(bech32ToHex(keyIn));
        onLogin?.();
      } else if (keyIn.startsWith("bunker://")) {
        const signer = new Nip46Signer(keyIn);
        await signer.init();
        const pubkey = await signer.getPubKey();
        LoginState.loginBunker(keyIn, signer.privateKey!, pubkey);
        onLogin?.();
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-[400px] mx-auto">
      {error && (
        <div className="text-cyber-danger text-sm border border-cyber-danger/40 bg-cyber-danger/5 rounded-sm px-3 py-2">
          {error}
        </div>
      )}

      {OAuthProviders.length > 0 && <OAuthButtons />}

      {hasPasskeys && (
        <AsyncButton onClick={loginPasskey} className="h-12">
          <span className="inline-flex items-center justify-center gap-2">
            <PasskeyIcon />
            <FormattedMessage defaultMessage="Sign in with a passkey" />
          </span>
        </AsyncButton>
      )}

      {hasExtension && (
        <AsyncButton
          onClick={async () => {
            const pk = await new Nip7Signer().getPubKey();
            LoginState.login(pk);
            onLogin?.();
          }}
          className="h-12"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <span className="text-cyber-primary">
              <NostrIcon height={16} />
            </span>
            <FormattedMessage defaultMessage="Nostr Extension" />
          </span>
        </AsyncButton>
      )}

      {(OAuthProviders.length > 0 || hasExtension || hasPasskeys) && (
        <div className="flex gap-3 items-center text-cyber-muted text-xs uppercase tracking-widest">
          <div className="h-px bg-cyber-border w-full" />
          <FormattedMessage defaultMessage="or" />
          <div className="h-px bg-cyber-border w-full" />
        </div>
      )}

      {!showKey ? (
        <button
          className="text-cyber-muted hover:text-cyber-primary text-sm text-left transition-colors"
          onClick={() => setShowKey(true)}
        >
          <FormattedMessage defaultMessage="Sign in with a Nostr key or bunker →" />
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-cyber-muted text-xs uppercase tracking-wider">
            <FormattedMessage defaultMessage="Nostr key" />
          </label>
          <input
            type="text"
            autoFocus
            placeholder={formatMessage({
              defaultMessage: "nsec1… or bunker://…",
            })}
            value={keyIn}
            onChange={(e) => setKeyIn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loginKey();
            }}
          />
          <AsyncButton
            onClick={loginKey}
            disabled={
              !keyIn.startsWith("nsec") && !keyIn.startsWith("bunker://")
            }
          >
            <FormattedMessage defaultMessage="Sign in" />
          </AsyncButton>
        </div>
      )}
    </div>
  );
}
