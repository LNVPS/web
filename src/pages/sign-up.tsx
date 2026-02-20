import { EventPublisher, PrivateKeySigner } from "@snort/system";
import { AsyncButton } from "../components/button";
import { useContext, useState } from "react";
import { hexToBech32 } from "@snort/shared";
import { openFile } from "../utils";
import { SnortContext } from "@snort/system-react";
import { Blossom } from "../blossom";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginState } from "../login";
import Login from "../components/login";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File>();
  const [key, setKey] = useState<PrivateKeySigner>();
  const location = useLocation();
  const system = useContext(SnortContext);
  const navigate = useNavigate();

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
      // upload picture
      const b = new Blossom("https://nostr.download", pub);
      const up = await b.upload(file);
      if (up.url) {
        pic = up.url;
      } else {
        setError("Upload filed");
        return;
      }
    }
    const ev = await pub.metadata({
      name: name,
      picture: pic,
    });
    system.BroadcastEvent(ev);
    LoginState.loginPrivateKey(key.privateKey);
    const backState = location.state;
    navigate(-1, { state: backState });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <b className="text-cyber-danger">{error}</b>}
      <h1>Login</h1>

      <Login
        onLogin={() => {
          const backState = location.state;
          navigate(-1, { state: backState });
        }}
      />

      <div className="flex gap-4 items-center my-6">
        <div className="text-xl">OR</div>
        <div className="h-[1px] bg-cyber-border w-full"></div>
      </div>

      <h1>Create Account</h1>

      <p>
        LNVPS uses nostr accounts,{" "}
        <a
          href="https://nostr.how/en/what-is-nostr"
          target="_blank"
          className="underline"
        >
          what is nostr?
        </a>
      </p>
      <div className="flex flex-col gap-2">
        <div>Avatar</div>
        <div
          className="w-40 h-40 bg-cyber-panel rounded-sm relative cursor-pointer overflow-hidden"
          onClick={uploadImage}
        >
          <div className="absolute bg-cyber-darker/70 w-full h-full hover:opacity-90 opacity-0 flex items-center justify-center">
            Upload
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
        <div>Name</div>
        <div>
          <input
            type="text"
            placeholder="Display name"
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
        Create Account
      </AsyncButton>

      {key && (
        <>
          <div className="flex flex-col gap-2">
            <h3>Your new key:</h3>
            <div className="font-monospace select-all">
              {hexToBech32("nsec", key.privateKey)}
            </div>
            <b>Please save this key, it CANNOT be recovered</b>
          </div>
          <AsyncButton onClick={spawnAccount}>Login</AsyncButton>
        </>
      )}
    </div>
  );
}
