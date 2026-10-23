import { useNavigate } from "react-router-dom";
import {
  AccountDetail,
  CpuArch,
  LNVpsApi,
  VmCustomPrice,
  VmCustomTemplateParams,
  VmOsImage,
  VmTemplate,
} from "../../api";
import { useEffect, useMemo, useState } from "react";
import ResourceSlider from "../../components/resource-slider";
import {
  OrderAddons,
  addonsFor,
  hasAddons,
  NETWORK_STEP_MBPS,
  TRANSFER_STEP_GB,
  withAddons,
} from "../../utils/order-addons";
import CostLabel from "../../components/cost";
import useLogin from "../../hooks/login";
import { AsyncButton } from "../../components/button";
import SpecSheet from "../../components/spec-sheet";
import OsImagePicker from "../../components/os-image-picker";
import { sortOsImages } from "../../os-images";
import SSHKeySelector from "../../components/ssh-keys";
import { clearRefCode, getRefCode } from "../../ref";
import { ApiUrl } from "../../const";
import { EmailVerification } from "../../components/email-verification";
import HourlyCreditPanel from "../../components/hourly-credit";
import {
  useAccountCredit,
  useCreditReadiness,
} from "../../hooks/account-credit";
import { accountTaxRate } from "../../utils";
import { grossTotal, isHourly } from "../../utils/hourly";
import { FormattedMessage } from "react-intl";
import { ReactNode } from "react";
import classNames from "classnames";
import OsImageName from "../../components/os-image-name";

/**
 * One step of the provisioning sequence.
 *
 * The order really is ordered — an image and a key have to exist before the
 * machine can be created — so the numbers carry information rather than
 * decorating the page. A finished step keeps its choice visible on the right,
 * which is what a buyer scans for before committing.
 */
function Step({
  index,
  title,
  done,
  choice,
  last,
  children,
}: {
  index: number;
  title: ReactNode;
  done?: boolean;
  choice?: ReactNode;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
      <div className="flex flex-col items-center gap-2">
        <span
          className={classNames(
            "w-full rounded-sm border py-0.5 text-center text-[0.65rem] tabular-nums transition-colors duration-200",
            done
              ? "border-cyber-primary/50 bg-cyber-primary/10 text-cyber-primary"
              : "border-cyber-border text-cyber-muted",
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
        {!last && <span className="w-px flex-1 bg-cyber-border" />}
      </div>
      <div
        className={classNames("flex min-w-0 flex-col gap-3", !last && "pb-8")}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-text">
            {title}
          </span>
          {choice && (
            <span className="text-xs text-cyber-text-bright">{choice}</span>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function AddonsPanel({
  plan,
  addons,
  onChange,
}: {
  plan: VmCustomTemplateParams;
  addons: OrderAddons;
  onChange: (addons: OrderAddons) => void;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-cyber-border bg-cyber-panel">
      <div className="flex items-baseline gap-2 border-b border-cyber-border bg-cyber-panel-light px-4 py-2.5">
        <span className="text-sm text-cyber-text-bright">
          <FormattedMessage defaultMessage="Network" />
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.25em] text-cyber-muted">
          <FormattedMessage defaultMessage="Configure" />
        </span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {plan.max_ip4 > plan.min_ip4 && (
          <ResourceSlider
            label={<FormattedMessage defaultMessage="IPv4" />}
            unit="IPs"
            value={addons.ip4}
            min={plan.min_ip4}
            max={plan.max_ip4}
            onChange={(ip4) => onChange({ ...addons, ip4 })}
          />
        )}
        {plan.max_ip6 > plan.min_ip6 && (
          <ResourceSlider
            label={<FormattedMessage defaultMessage="IPv6" />}
            unit="IPs"
            value={addons.ip6}
            min={plan.min_ip6}
            max={plan.max_ip6}
            onChange={(ip6) => onChange({ ...addons, ip6 })}
          />
        )}
        {plan.transfer &&
          addons.transferGb !== undefined &&
          plan.transfer.max > plan.transfer.min && (
            <ResourceSlider
              label={<FormattedMessage defaultMessage="Transfer" />}
              unit="GB/mo"
              value={addons.transferGb}
              min={plan.transfer.min}
              max={plan.transfer.max}
              step={TRANSFER_STEP_GB}
              onChange={(transferGb) => onChange({ ...addons, transferGb })}
            />
          )}
        {plan.network &&
          addons.networkMbps !== undefined &&
          plan.network.max > plan.network.min && (
            <ResourceSlider
              label={<FormattedMessage defaultMessage="Port speed" />}
              unit="Mbps"
              value={addons.networkMbps}
              min={plan.network.min}
              max={plan.network.max}
              step={NETWORK_STEP_MBPS}
              onChange={(networkMbps) => onChange({ ...addons, networkMbps })}
            />
          )}
      </div>
    </div>
  );
}

export default function OrderVmPage({
  template: baseTemplate,
}: {
  template: VmTemplate;
}) {
  const login = useLogin();
  const navigate = useNavigate();
  const [useImage, setUseImage] = useState(-1);
  const [useSshKey, setUseSshKey] = useState(-1);
  const [images, setImages] = useState<Array<VmOsImage>>([]);
  const [orderError, setOrderError] = useState("");
  const [plan, setPlan] = useState<VmCustomTemplateParams>();
  const [addons, setAddons] = useState<OrderAddons>(() =>
    addonsFor(baseTemplate),
  );
  const [price, setPrice] = useState<VmCustomPrice>();
  const [account, setAccount] = useState<AccountDetail>();

  const pricingId = baseTemplate?.pricing_id;
  useEffect(() => {
    if (!pricingId) return;
    new LNVpsApi(ApiUrl, undefined).listOffers().then((offers) => {
      const found = offers.custom_template?.find((p) => p.id === pricingId);
      setPlan(found);
      if (found) setAddons(addonsFor(baseTemplate, found));
    });
  }, [pricingId, baseTemplate]);

  useEffect(() => {
    if (!pricingId || !plan) return;
    const t = setTimeout(() => {
      new LNVpsApi(ApiUrl, undefined)
        .customPrice({
          pricing_id: pricingId,
          cpu: baseTemplate.cpu,
          memory: baseTemplate.memory,
          disk: baseTemplate.disk_size,
          disk_type: baseTemplate.disk_type,
          disk_interface: baseTemplate.disk_interface,
          ip4_count: addons.ip4,
          ip6_count: addons.ip6,
          transfer_gb: addons.transferGb,
          network_mbps: addons.networkMbps,
        })
        .then(setPrice)
        .catch(() => setPrice(undefined));
    }, 500);
    return () => clearTimeout(t);
  }, [pricingId, plan, baseTemplate, addons]);

  const template = useMemo(
    () =>
      baseTemplate?.pricing_id
        ? withAddons(baseTemplate, addons, price)
        : baseTemplate,
    [baseTemplate, addons, price],
  );

  // An hourly order is paid from account credit only (the backend refuses to
  // invoice one), so it can't be placed unless the balance already covers the
  // first period. Checked here, before the order exists, rather than leaving
  // the customer to hit the refusal on the next screen.
  const hourly = isHourly(template?.cost_plan?.interval_type);
  const { credit, setCredit, reload: reloadCredit } = useAccountCredit(hourly);
  useEffect(() => {
    if (!hourly) return;
    login?.api
      ?.getAccount()
      .then(setAccount)
      .catch((e) => console.error("Failed to load account:", e));
  }, [hourly, login?.api]);
  const firstPeriod =
    hourly && template?.cost_plan
      ? grossTotal(
          template.cost_plan,
          1,
          accountTaxRate(account, template.region?.company_id),
        )
      : undefined;
  const creditReady = useCreditReadiness(credit, firstPeriod);

  // Fetch images without auth (public endpoint) to reduce signer burden.
  // When the template pins a CPU architecture, filter to compatible images so
  // we don't offer ones that would fail to provision (#183).
  const templateArch = template.cpu_arch;
  useEffect(() => {
    const api = new LNVpsApi(ApiUrl, undefined);
    api
      .listOsImages(templateArch !== CpuArch.UNKNOWN ? templateArch : undefined)
      .then((a) => {
        setImages(a);
        // Auto-select the first image in the canonical order.
        const sorted = sortOsImages(a);
        if (sorted.length > 0) {
          setUseImage(sorted[0].id);
        }
      });
  }, [templateArch]);

  async function createOrder() {
    if (!login?.api || !template) return;

    setOrderError("");
    try {
      const ref = getRefCode();
      const newVm = template.pricing_id
        ? await login.api.orderCustom(
            {
              cpu: template.cpu,
              memory: template.memory,
              disk: template.disk_size,
              disk_type: template.disk_type,
              disk_interface: template.disk_interface,
              pricing_id: template.pricing_id!,
              ip4_count: template.ip4_count,
              ip6_count: template.ip6_count,
              transfer_gb: template.transfer_gb,
              network_mbps: template.limits?.network_mbps,
            },
            useImage,
            useSshKey,
            ref?.code,
          )
        : await login.api.orderVm(template.id, useImage, useSshKey, ref?.code);
      clearRefCode();
      navigate("/vm/billing/renew", {
        state: newVm,
      });
    } catch (e) {
      if (e instanceof Error) {
        setOrderError(e.message);
      }
    }
  }

  if (!template) {
    return (
      <h3>
        <FormattedMessage defaultMessage="No order found" />
      </h3>
    );
  }

  const chosenImage = images.find((i) => i.id === useImage);
  const chosen = useSshKey !== -1 && useImage !== -1;
  const ready = chosen && (!hourly || !!creditReady?.ready);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-cyber-muted">
          <FormattedMessage defaultMessage="New order" />
        </span>
        <h1 className="m-0 text-2xl text-cyber-text-bright">
          <FormattedMessage defaultMessage="Review and launch" />
        </h1>
      </div>

      {/* The machine itself, caps included — everything the buyer is agreeing
          to, before a single choice is asked of them. */}
      <SpecSheet template={template} />

      {plan && hasAddons(plan) && (
        <AddonsPanel plan={plan} addons={addons} onChange={setAddons} />
      )}

      {login ? (
        <>
          {/* Outside the numbered sequence: it blocks the order rather than
              being a step of it, and inside the list it butted against the
              first step's marker with no room of its own. */}
          <EmailVerification />
          <div className="flex flex-col">
            <Step
              index={1}
              title={<FormattedMessage defaultMessage="Operating system" />}
              done={useImage !== -1}
              choice={chosenImage && <OsImageName image={chosenImage} />}
            >
              <OsImagePicker
                images={images}
                selected={useImage}
                onSelect={setUseImage}
              />
            </Step>
            <Step
              index={2}
              title={<FormattedMessage defaultMessage="SSH key" />}
              done={useSshKey !== -1}
            >
              <SSHKeySelector
                selectedKey={useSshKey}
                setSelectedKey={setUseSshKey}
                hideLabel
              />
            </Step>
            <Step
              index={3}
              title={<FormattedMessage defaultMessage="Launch" />}
              done={ready}
              last
            >
              <div className="flex flex-col gap-3 rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] text-cyber-muted">
                    <FormattedMessage defaultMessage="First payment" />
                  </span>
                  {template.cost_plan && (
                    <span className="text-xl leading-none text-cyber-text-bright">
                      <CostLabel
                        cost={template.cost_plan}
                        companyId={template.region?.company_id}
                      />
                    </span>
                  )}
                  <span className="text-[0.65rem] text-cyber-muted">
                    {hourly ? (
                      <FormattedMessage defaultMessage="Paid from your account credit. The machine boots once the first hour is taken from it." />
                    ) : (
                      <FormattedMessage defaultMessage="Pay on the next screen. The machine boots once the payment confirms." />
                    )}
                  </span>
                </div>
                <AsyncButton
                  className="sm:w-56"
                  disabled={!ready}
                  onClick={createOrder}
                >
                  <FormattedMessage defaultMessage="Create Order" />
                </AsyncButton>
              </div>
              {hourly && (
                <HourlyCreditPanel
                  className="mt-3"
                  credit={credit}
                  needed={firstPeriod}
                  perHour={firstPeriod}
                  onChange={(c) => {
                    setCredit(c);
                    reloadCredit();
                  }}
                />
              )}
              {orderError && <b className="text-cyber-danger">{orderError}</b>}
            </Step>
          </div>
        </>
      ) : (
        <div className="rounded-sm border border-cyber-border bg-cyber-panel px-4 py-3 text-xs text-cyber-muted">
          <FormattedMessage defaultMessage="Sign in to pick an operating system and an SSH key for this machine." />
        </div>
      )}
    </div>
  );
}
