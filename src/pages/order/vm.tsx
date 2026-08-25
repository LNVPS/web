import { useNavigate } from "react-router-dom";
import { CpuArch, LNVpsApi, VmOsImage, VmTemplate } from "../../api";
import { useEffect, useState } from "react";
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

export default function OrderVmPage({ template }: { template: VmTemplate }) {
  const login = useLogin();
  const navigate = useNavigate();
  const [useImage, setUseImage] = useState(-1);
  const [useSshKey, setUseSshKey] = useState(-1);
  const [images, setImages] = useState<Array<VmOsImage>>([]);
  const [orderError, setOrderError] = useState("");

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
  const ready = useSshKey !== -1 && useImage !== -1;

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
                    <FormattedMessage defaultMessage="Pay on the next screen. The machine boots once the payment confirms." />
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
