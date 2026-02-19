import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useLogin from "../hooks/login";
import { VmInstance } from "../api";
import { WebglAddon } from "@xterm/addon-webgl";
import { AttachAddon } from "@xterm/addon-attach";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function VmConsolePage() {
  const { state } = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const navigate = useNavigate();
  const termRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termObjRef = useRef<Terminal | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  function cleanup() {
    wsRef.current?.close();
    wsRef.current = null;
    termObjRef.current?.dispose();
    termObjRef.current = null;
  }

  async function openTerminal() {
    if (!login?.api || !state || !termRef.current) return;

    cleanup();
    setStatus("connecting");

    const ws = await login.api.connect_terminal(state.id);

    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("disconnected");

    // If the socket is already open by the time we attach the handler, set it now
    if (ws.readyState === WebSocket.OPEN) {
      setStatus("connected");
    }

    const te = new Terminal();
    termObjRef.current = te;

    // AttachAddon must be loaded before open() so no data is lost
    te.loadAddon(new AttachAddon(ws));

    termRef.current.innerHTML = "";
    // open() attaches the terminal to the DOM — renderer addons need this first
    te.open(termRef.current);

    const fit = new FitAddon();
    te.loadAddon(fit);
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => {
      webgl.dispose();
    });
    te.loadAddon(webgl);
    fit.fit();
    te.focus();
  }

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!login?.api || !state || !termRef.current) return;

      cleanup();
      setStatus("connecting");

      const ws = await login.api.connect_terminal(state.id);

      if (cancelled) {
        ws.close();
        return;
      }

      wsRef.current = ws;

      ws.onopen = () => setStatus("connected");
      ws.onclose = () => setStatus("disconnected");
      ws.onerror = () => setStatus("disconnected");

      if (ws.readyState === WebSocket.OPEN) {
        setStatus("connected");
      }

      const te = new Terminal();
      termObjRef.current = te;

      te.loadAddon(new AttachAddon(ws));

      termRef.current.innerHTML = "";
      te.open(termRef.current);

      const fit = new FitAddon();
      te.loadAddon(fit);
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        webgl.dispose();
      });
      te.loadAddon(webgl);
      fit.fit();
      te.focus();
    }

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [login]);

  const statusColor =
    status === "connected"
      ? "text-green-500"
      : status === "disconnected"
        ? "text-red-500"
        : "text-yellow-500";

  const statusLabel =
    status === "connected"
      ? "Connected"
      : status === "disconnected"
        ? "Disconnected"
        : "Connecting...";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="text-sm px-3 py-1 border rounded hover:bg-neutral-800"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <div className="text-xl">VM #{state?.id} Terminal:</div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          {status === "disconnected" && (
            <button
              className="text-sm px-3 py-1 border rounded hover:bg-neutral-800"
              onClick={openTerminal}
            >
              Reconnect
            </button>
          )}
        </div>
      </div>
      <div className="border p-2" ref={termRef}></div>
    </div>
  );
}
