import { EventPublisher, PrivateKeySigner } from "@snort/system";
import { AsyncButton } from "../components/button";
import { useContext, useState } from "react";
import { hexToBech32 } from "@snort/shared";
import { openFile } from "../utils";
import { SnortContext } from "@snort/system-react";
import { Blossom } from "../blossom";
import { LoginState } from "../login";
import Login from "../components/login";
import { FormattedMessage, useIntl } from "react-intl";
import Seo from "../components/seo";

export default function SignUpPage() {
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
    <div className="flex flex-col gap-4">
      <Seo noindex={true} />
      {error && <b className="text-cyber-danger">{error}</b>}
      <h1>
        <FormattedMessage defaultMessage="Login" />
      </h1>

      <Login
        onLogin={() => {
          window.history.back();
        }}
      />

      <div className="flex gap-4 items-center my-6">
        <div className="text-xl">
          <FormattedMessage defaultMessage="OR" />
        </div>
        <div className="h-[1px] bg-cyber-border w-full"></div>
      </div>

      <h1>
        <FormattedMessage defaultMessage="Create Account" />
      </h1>

      <p>
        <FormattedMessage
          defaultMessage="LNVPS uses nostr accounts, {link}"
          values={{
            link: (
              <a
                href="https://nostr.how/en/what-is-nostr"
                target="_blank"
                className="underline"
              >
                <FormattedMessage defaultMessage="what is nostr?" />
              </a>
            ),
          }}
        />
      </p>
      <div className="flex flex-col gap-2">
        <div>
          <FormattedMessage defaultMessage="Avatar" />
        </div>
        <div
          className="w-40 h-40 bg-cyber-panel rounded-sm relative cursor-pointer overflow-hidden"
          onClick={uploadImage}
        >
          <div className="absolute bg-cyber-darker/70 w-full h-full hover:opacity-90 opacity-0 flex items-center justify-center">
            <FormattedMessage defaultMessage="Upload" />
          </div>
          {file && (
            <img
              src={URL.createObjectURL(file)}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <FormattedMessage defaultMessage="Name" />
        </div>
        <div>
          <input
            type="text"
            placeholder={formatMessage({ defaultMessage: "Display name" })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <AsyncButton
        onClick={async () => {
          setKey(PrivateKeySigner.random());
        }}
      >
        <FormattedMessage defaultMessage="Create Account" />
      </AsyncButton>

      {key && (
        <>
          <div className="flex flex-col gap-2">
            <h3>
              <FormattedMessage defaultMessage="Your new key:" />
            </h3>
            <div className="font-monospace select-all">
              {hexToBech32("nsec", key.privateKey)}
            </div>
            <b>
              <FormattedMessage defaultMessage="Please save this key, it CANNOT be recovered" />
            </b>
          </div>
          <AsyncButton onClick={spawnAccount}>
            <FormattedMessage defaultMessage="Login" />
          </AsyncButton>
        </>
      )}
    </div>
  );
}
