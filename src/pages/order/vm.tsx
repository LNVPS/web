import { useNavigate } from "react-router-dom";
import { CpuArch, LNVpsApi, VmOsImage, VmTemplate } from "../../api";
import { useEffect, useState } from "react";
import CostLabel from "../../components/cost";
import useLogin from "../../hooks/login";
import { AsyncButton } from "../../components/button";
import VpsResources from "../../components/vps-resources";
import OsImagePicker from "../../components/os-image-picker";
import { sortOsImages } from "../../os-images";
import SSHKeySelector from "../../components/ssh-keys";
import { clearRefCode, getRefCode } from "../../ref";
import { ApiUrl } from "../../const";
import { EmailVerification } from "../../components/email-verification";
import { FormattedMessage } from "react-intl";

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
      .listOsImages(
        templateArch !== CpuArch.UNKNOWN ? templateArch : undefined,
      )
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

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">
        <FormattedMessage defaultMessage="New Order" />
      </div>
      <div className="flex justify-between items-center rounded-sm bg-cyber-panel px-4 py-3">
        <div className="flex flex-col gap-1">
          <div>{template.name}</div>
          <VpsResources vm={template} />
        </div>
        {template.cost_plan && <CostLabel cost={template.cost_plan} />}
      </div>
      <hr />
      {login && (
        <>
          <EmailVerification />
          <div className="flex flex-col gap-2">
            <b>
              <FormattedMessage defaultMessage="Select OS:" />
            </b>
            <OsImagePicker
              images={images}
              selected={useImage}
              onSelect={setUseImage}
            />
          </div>
          <hr />
          <SSHKeySelector
            selectedKey={useSshKey}
            setSelectedKey={setUseSshKey}
          />
        </>
      )}
      <AsyncButton
        disabled={useSshKey === -1 || useImage === -1}
        onClick={createOrder}
      >
        <FormattedMessage defaultMessage="Create Order" />
      </AsyncButton>
      {orderError && <b className="text-cyber-danger">{orderError}</b>}
    </div>
  );
}
