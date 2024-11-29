import { EventPublisher, PrivateKeySigner } from "@snort/system";
import { AsyncButton } from "../components/button";
import { useContext, useState } from "react";
import { bech32ToHex, hexToBech32 } from "@snort/shared";
import { openFile } from "../utils";
import { SnortContext } from "@snort/system-react";
import { Blossom } from "../blossom";
import { loginPrivateKey } from "../login";
import { useNavigate } from "react-router-dom";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [keyIn, setKeyIn] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File>();
  const [key, setKey] = useState<PrivateKeySigner>();
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
    await loginPrivateKey(system, key);
    navigate("/");
  }

  async function loginKey() {
    setError("");
    try {
      const key = bech32ToHex(keyIn);
      await loginPrivateKey(system, new PrivateKeySigner(key));
      navigate("/");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <b className="text-red-500">{error}</b>}
      <h1>Login</h1>
      <input
        type="text"
        placeholder="nsec/bunker"
        value={keyIn}
        onChange={(e) => setKeyIn(e.target.value)}
      />
      <AsyncButton onClick={loginKey} disabled={!keyIn.startsWith("nsec")}>
        Login
      </AsyncButton>
      <div className="flex gap-4 items-center my-6">
        <div className="text-xl">OR</div>
        <div className="h-[1px] bg-neutral-800 w-full"></div>
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
          className="w-40 h-40 bg-neutral-900 rounded-xl relative cursor-pointer overflow-hidden"
          onClick={uploadImage}
        >
          <div className="absolute bg-black/50 w-full h-full hover:opacity-90 opacity-0 flex items-center justify-center">
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
