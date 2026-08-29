import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import type { VpnDevice, VpnPlan, VpnService } from "../api";
import { ApiError, LNVpsApi } from "../api";
import { ApiUrl } from "../const";
import useLogin from "../hooks/login";
import Seo from "../components/seo";
import Spinner from "../components/spinner";
import { Eyebrow, PageHeader } from "../components/section";
import { Card, CardBody, CardTitle } from "../components/card";
import { StatusPill, type BillingTone } from "../components/billing";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";
import VpnDeviceConfigPanel from "../components/vpn-device-config";
import VpnServiceCard from "../components/vpn-service-card";
import { generateWireGuardKeypair } from "../utils/wireguard";
import { forgetPrivateKey, rememberPrivateKey } from "../utils/vpn-keys";

/** Tone and label for a plan's billing state, wherever the plan is shown. */
function planStatus(plan: VpnPlan): { tone: BillingTone; label: string } {
  switch (plan.billing_state) {
    case "active":
      return { tone: "primary", label: "active" };
    case "expired":
      return { tone: "danger", label: "expired" };
    default:
      return { tone: "warning", label: "unpaid" };
  }
}

/** A registered device: what it is, whether it is on, and its configs. */
function DeviceRow({
  device,
  open,
  onToggleOpen,
  onSetEnabled,
  onDelete,
}: {
  device: VpnDevice;
  open: boolean;
  onToggleOpen: () => void;
  onSetEnabled: (enabled: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { formatDate } = useIntl();
  const addresses = [device.address4, device.address6].filter(Boolean);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate text-cyber-text-bright">
              {device.name}
            </span>
            {!device.enabled && (
              <StatusPill tone="muted">
                <FormattedMessage defaultMessage="Off" />
              </StatusPill>
            )}
          </div>
          <span className="truncate font-mono text-xs text-cyber-muted">
            {addresses.join(", ") || device.public_key}
            {" · "}
            {formatDate(new Date(device.created), {
              dateStyle: "medium",
            })}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <AsyncButton className="text-sm" onClick={onToggleOpen}>
            {open ? (
              <FormattedMessage defaultMessage="Hide config" />
            ) : (
              <FormattedMessage defaultMessage="Show config" />
            )}
          </AsyncButton>
          <AsyncButton
            className="text-sm"
            onClick={() => onSetEnabled(!device.enabled)}
          >
            {device.enabled ? (
              <FormattedMessage defaultMessage="Disable" />
            ) : (
              <FormattedMessage defaultMessage="Enable" />
            )}
          </AsyncButton>
          <AsyncButton
            className="text-sm hover:border-cyber-danger hover:text-cyber-danger"
            onClick={onDelete}
            title="Remove device"
          >
            <Icon name="delete" size={14} />
          </AsyncButton>
        </div>
      </div>
      {open && (
        <div className="border-t border-cyber-border/60 bg-cyber-panel-light/40 px-4 py-4">
          <VpnDeviceConfigPanel device={device} />
        </div>
      )}
    </div>
  );
}

export default function AccountVpnPage() {
  const login = useLogin();
  const { formatDate, formatMessage } = useIntl();
  const [services, setServices] = useState<Array<VpnService>>();
  // `null` after a load that found no plan, which is the ordinary state for an
  // account that has never bought one — distinct from `undefined`, "not loaded".
  const [plan, setPlan] = useState<VpnPlan | null>();
  const [devices, setDevices] = useState<Array<VpnDevice>>([]);
  const [newName, setNewName] = useState("");
  const [openDevice, setOpenDevice] = useState<number>();
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    // The catalog is public, so it loads the same way whether or not the
    // account has a plan; the plan call is the one that may 404.
    const api = login?.api ?? new LNVpsApi(ApiUrl, undefined);
    api
      .listVpnServices()
      .then(setServices)
      .catch(() => setServices([]));
    if (!login?.api) return;
    try {
      const p = await login.api.getVpnPlan();
      setPlan(p);
      // Devices only exist once a plan does, and the endpoint 404s without one.
      const d = await login.api.listVpnDevices().catch(() => []);
      setDevices(d);
    } catch (e) {
      // Only a 404 means "you have never bought one". Anything else is a fault,
      // and showing the sales catalog to someone who already pays for a plan
      // because one request failed would invite them to buy it twice.
      if (e instanceof ApiError && e.status === 404) {
        setPlan(null);
        setDevices([]);
      } else if (e instanceof Error) {
        setError(e.message);
      }
    }
  }, [login?.api]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function buy(service: VpnService) {
    if (!login?.api) return;
    setError(undefined);
    try {
      const p = await login.api.createVpnPlan(service.id);
      setPlan(p);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function addDevice() {
    if (!login?.api) return;
    const name = newName.trim();
    if (!name) return;
    setError(undefined);
    // The keypair is made here and the private half never leaves the browser:
    // that is the product's security claim, so it is not an optimisation to be
    // traded away later for a server-side "convenience" generator.
    const { privateKey, publicKey } = generateWireGuardKeypair();
    rememberPrivateKey(publicKey, privateKey);
    try {
      const device = await login.api.addVpnDevice({
        name,
        public_key: publicKey,
      });
      setNewName("");
      setDevices((d) => [...d.filter((x) => x.id !== device.id), device]);
      // Open the new device straight away: the config is the thing the customer
      // came for, and it is the one moment this tab certainly has the key.
      setOpenDevice(device.id);
      await reload();
    } catch (e) {
      // The key was never registered, so it is not worth keeping.
      forgetPrivateKey(publicKey);
      if (e instanceof Error) setError(e.message);
    }
  }

  async function setEnabled(device: VpnDevice, enabled: boolean) {
    if (!login?.api) return;
    setError(undefined);
    try {
      const updated = await login.api.setVpnDeviceEnabled(device.id, enabled);
      setDevices((d) => d.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  async function removeDevice(device: VpnDevice) {
    if (!login?.api) return;
    if (
      !confirm(
        formatMessage(
          {
            defaultMessage:
              "Remove {name}? Its key and address are released, and the config on that device stops working.",
          },
          { name: device.name },
        ),
      )
    ) {
      return;
    }
    setError(undefined);
    try {
      await login.api.deleteVpnDevice(device.id);
      forgetPrivateKey(device.public_key);
      setDevices((d) => d.filter((x) => x.id !== device.id));
      await reload();
    } catch (e) {
      if (e instanceof Error) setError(e.message);
    }
  }

  const header = (
    <PageHeader title={<FormattedMessage defaultMessage="VPN" />} />
  );

  if (plan === undefined || services === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <Seo noindex={true} />
        {header}
        {/* A load that failed leaves the plan unknown: say so rather than
            spinning forever or guessing that there is no plan. */}
        {error ? (
          <b className="text-cyber-danger">{error}</b>
        ) : (
          <div className="flex justify-center py-8">
            <Spinner width={24} height={24} />
          </div>
        )}
      </div>
    );
  }

  const status = plan ? planStatus(plan) : undefined;
  const atLimit = plan ? devices.length >= plan.device_limit : false;
  const service = services.find((s) => s.id === plan?.service_id);

  return (
    <div className="flex flex-col gap-6">
      <Seo noindex={true} />
      {header}

      {error && <b className="text-cyber-danger">{error}</b>}

      {plan === null ? (
        services.length === 0 ? (
          <div className="rounded-sm border border-dashed border-cyber-border bg-cyber-panel/40 px-4 py-10 text-center text-cyber-muted">
            <FormattedMessage defaultMessage="No VPN plans are on sale yet." />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Eyebrow>
              <FormattedMessage defaultMessage="Plans" />
            </Eyebrow>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <VpnServiceCard
                  key={s.id}
                  service={s}
                  action={
                    <AsyncButton
                      className="w-full justify-center bg-cyber-primary/20 border-cyber-primary text-cyber-primary font-bold hover:bg-cyber-primary/30 hover:shadow-neon"
                      onClick={() => buy(s)}
                    >
                      <FormattedMessage defaultMessage="Buy plan" />
                    </AsyncButton>
                  }
                />
              ))}
            </div>
          </div>
        )
      ) : (
        <>
          <Card>
            <CardTitle
              right={
                <StatusPill tone={status!.tone}>
                  {status!.label === "active" ? (
                    <FormattedMessage defaultMessage="Active" />
                  ) : status!.label === "expired" ? (
                    <FormattedMessage defaultMessage="Expired" />
                  ) : (
                    <FormattedMessage defaultMessage="Needs payment" />
                  )}
                </StatusPill>
              }
            >
              {service?.name ?? <FormattedMessage defaultMessage="VPN plan" />}
            </CardTitle>
            <CardBody className="flex flex-wrap items-end justify-between gap-4 px-4 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
                  <FormattedMessage defaultMessage="Devices" />
                </span>
                <span className="text-2xl leading-none text-cyber-text-bright tabular-nums">
                  {plan.device_count} / {plan.device_limit}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cyber-text">
                  {plan.billing_state === "expired" ? (
                    <FormattedMessage defaultMessage="Expired on" />
                  ) : (
                    <FormattedMessage defaultMessage="Renews" />
                  )}
                </span>
                <span className="text-cyber-text-bright">
                  {plan.expires
                    ? formatDate(new Date(plan.expires), {
                        dateStyle: "medium",
                      })
                    : "—"}
                </span>
              </div>
              <Link
                to={`/account/subscriptions/${plan.subscription_id}`}
                className="rounded-sm border border-cyber-primary bg-cyber-primary/20 px-3 py-2 text-sm font-bold text-cyber-primary transition-all duration-200 hover:bg-cyber-primary/30 hover:shadow-neon"
              >
                {plan.billing_state === "active" ? (
                  <FormattedMessage defaultMessage="Manage billing" />
                ) : (
                  <FormattedMessage defaultMessage="Pay subscription" />
                )}
              </Link>
            </CardBody>
          </Card>

          {plan.billing_state !== "active" ? (
            <div className="rounded-sm border border-cyber-warning/40 bg-cyber-warning/10 px-4 py-3 text-sm text-cyber-warning">
              <FormattedMessage defaultMessage="Devices can be registered once the subscription is paid. Nothing is configured on a route server before then." />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Eyebrow>
                <FormattedMessage defaultMessage="Devices" />
              </Eyebrow>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  maxLength={64}
                  placeholder={formatMessage({
                    defaultMessage: "Device name, e.g. Laptop",
                  })}
                  onChange={(e) => setNewName(e.target.value)}
                  className="min-w-0 flex-1"
                />
                <AsyncButton
                  disabled={atLimit || newName.trim().length === 0}
                  onClick={addDevice}
                >
                  <FormattedMessage defaultMessage="Add device" />
                </AsyncButton>
              </div>
              {atLimit && (
                <span className="text-xs text-cyber-muted">
                  <FormattedMessage defaultMessage="You have registered every device your plan allows. Remove one to free a slot." />
                </span>
              )}

              {devices.length === 0 ? (
                <div className="rounded-sm border border-dashed border-cyber-border bg-cyber-panel/40 px-4 py-10 text-center text-cyber-muted">
                  <FormattedMessage defaultMessage="No devices yet. Add one to get a config file." />
                </div>
              ) : (
                <div className="divide-y divide-cyber-border/60 overflow-hidden rounded-sm border border-cyber-border">
                  {devices.map((d) => (
                    <DeviceRow
                      key={d.id}
                      device={d}
                      open={openDevice === d.id}
                      onToggleOpen={() =>
                        setOpenDevice((x) => (x === d.id ? undefined : d.id))
                      }
                      onSetEnabled={(enabled) => setEnabled(d, enabled)}
                      onDelete={() => removeDevice(d)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
