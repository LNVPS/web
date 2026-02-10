import { bech32ToHex } from "@snort/shared";
import { Nip46Signer, Nip7Signer } from "@snort/system";
import { useState } from "react";
import { LoginState } from "../login";
import { AsyncButton } from "./button";

export default function Login({ onLogin }: { onLogin?: () => void }) {
    const [keyIn, setKeyIn] = useState("");
    const [error, setError] = useState("");

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

    return <>
        {error && <b className="text-red-500">{error}</b>}
        <input
            type="text"
            placeholder="nsec/bunker"
            value={keyIn}
            onChange={(e) => setKeyIn(e.target.value)}
        />
        <AsyncButton
            onClick={loginKey}
            disabled={!keyIn.startsWith("nsec") && !keyIn.startsWith("bunker://")}
        >
            Login
        </AsyncButton>
        {window.nostr && (
            <div className="flex flex-col gap-4">
                Browser Extension:
                <AsyncButton
                    onClick={async () => {
                        const pk = await new Nip7Signer().getPubKey();
                        LoginState.login(pk);
                        onLogin?.();
                    }}
                >
                    Nostr Extension
                </AsyncButton>
            </div>
        )}
    </>
}