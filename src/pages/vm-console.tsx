import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import useLogin from "../hooks/login";
import { VmInstance } from "../api";
import { WebglAddon } from "@xterm/addon-webgl";
import { AttachAddon } from "@xterm/addon-attach";

const fit = new FitAddon();

export function VmConsolePage() {

    const { state } = useLocation() as { state?: VmInstance };
    const login = useLogin();
    const [term, setTerm] = useState<Terminal>();
    const termRef = useRef<HTMLDivElement | null>(null);

    async function openTerminal() {
        if (!login?.api || !state) return;
        const ws = await login.api.connect_terminal(state.id);
        const te = new Terminal();
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => {
            webgl.dispose();
        });
        te.loadAddon(webgl);
        te.loadAddon(fit);
        te.onResize(({ cols, rows }) => {
            //ws.send(`${cols}:${rows}`);
        });
        const attach = new AttachAddon(ws);
        attach.activate(te);
        setTerm((t) => {
            if (t) {
                t.dispose();
            }
            return te
        });
    }

    useEffect(() => {
        if (term && termRef.current) {
            termRef.current.innerHTML = "";
            term.open(termRef.current);
            term.focus();
            fit.fit();
        }
    }, [termRef, term]);

    useEffect(() => {
        openTerminal();
    }, []);

    return <div className="flex flex-col gap-4">
        <div className="text-xl">VM #{state?.id} Terminal:</div>
        {term && <div className="border p-2" ref={termRef}></div>}
    </div>
}