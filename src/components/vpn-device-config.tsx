import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import type { VpnDevice, VpnDeviceConfig } from "../api";
import useLogin from "../hooks/login";
import { FilterButton } from "./button-filter";
import { CopyButton } from "./copy-button";
import { AsyncButton } from "./button";
import Spinner from "./spinner";
import QrCode from "./qr";
import RegionName from "./region-name";
import { applyPrivateKey, configFileName } from "../utils/wireguard";
import { recallPrivateKey } from "../utils/vpn-keys";

/** Hand the rendered config to the browser as a `.conf` download. */
function download(filename: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * A device's tunnel configuration, one region at a time.
 *
 * Region is a client-side choice, not an allocation: every config a device is
 * given shares an identical `[Interface]` block and differs only in the peer it
 * dials. Switching region is editing two lines, which is why they are tabs on
 * one config rather than separate downloads to keep track of.
 *
 * The private key is filled in from this tab's store when it has it. When it
 * does not (the device was registered in an earlier session), the placeholder
 * is left in place and said out loud, because a config that silently carries an
 * unusable key is worse than one that admits what is missing.
 */
export default function VpnDeviceConfigPanel({
  device,
}: {
  device: VpnDevice;
}) {
  const login = useLogin();
  const [configs, setConfigs] = useState<Array<VpnDeviceConfig>>();
  const [regionId, setRegionId] = useState<number>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!login?.api) return;
    login.api
      .getVpnDeviceConfigs(device.id)
      .then((c) => {
        setConfigs(c);
        setRegionId((r) => r ?? c[0]?.region_id);
      })
      .catch((e) => e instanceof Error && setError(e.message));
  }, [login?.api, device.id]);

  if (error) return <b className="text-cyber-danger">{error}</b>;
  if (!configs) {
    return (
      <div className="flex justify-center py-6">
        <Spinner width={20} height={20} />
      </div>
    );
  }
  if (configs.length === 0) {
    return (
      <div className="text-sm text-cyber-muted">
        <FormattedMessage defaultMessage="No exit regions are available right now." />
      </div>
    );
  }

  const selected = configs.find((c) => c.region_id === regionId) ?? configs[0];
  const privateKey = recallPrivateKey(device.public_key);
  const config = applyPrivateKey(selected.config, privateKey);

  return (
    <div className="flex flex-col gap-3">
      {configs.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
            <FormattedMessage defaultMessage="Exit region" />
          </span>
          <div className="flex flex-wrap gap-2">
            {configs.map((c) => (
              <FilterButton
                key={c.region_id}
                active={c.region_id === selected.region_id}
                onClick={() => setRegionId(c.region_id)}
              >
                <RegionName region={{ name: c.region_name }} />
              </FilterButton>
            ))}
          </div>
        </div>
      )}

      {!privateKey && (
        <div className="rounded-sm border border-cyber-warning/40 bg-cyber-warning/10 px-3 py-2 text-xs text-cyber-warning">
          <FormattedMessage defaultMessage="This device's private key was generated in another browser session, so it cannot be filled in here. Paste the key you saved over the placeholder, or remove the device and register a new one." />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <pre className="m-0 min-w-0 flex-1 overflow-x-auto rounded-sm border border-cyber-border bg-cyber-darker p-3 font-mono text-xs text-cyber-text">
          {config}
        </pre>
        <div className="flex shrink-0 flex-col items-center gap-2">
          {/* WireGuard's mobile apps import a tunnel by scanning the file. */}
          <QrCode data={config} width={180} height={180} />
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-muted">
            <FormattedMessage defaultMessage="Scan in the app" />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <AsyncButton
          onClick={() =>
            download(configFileName(device.name, selected.region_name), config)
          }
        >
          <FormattedMessage defaultMessage="Download .conf" />
        </AsyncButton>
        <CopyButton text={config} />
      </div>

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-cyber-muted sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-wider">
            <FormattedMessage defaultMessage="Endpoint" />
          </dt>
          <dd className="m-0 text-cyber-text">{selected.endpoint}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider">
            <FormattedMessage defaultMessage="Address" />
          </dt>
          <dd className="m-0 text-cyber-text">
            {selected.address.join(", ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider">
            <FormattedMessage defaultMessage="DNS" />
          </dt>
          <dd className="m-0 text-cyber-text">
            {selected.dns.join(", ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider">
            <FormattedMessage defaultMessage="MTU" />
          </dt>
          <dd className="m-0 text-cyber-text">{selected.mtu}</dd>
        </div>
      </dl>
    </div>
  );
}
