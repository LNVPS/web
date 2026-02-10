import { useNavigate } from "react-router-dom";
import { VmOsImage, VmTemplate } from "../../api";
import { useEffect, useState } from "react";
import CostLabel from "../../components/cost";
import useLogin from "../../hooks/login";
import { AsyncButton } from "../../components/button";
import classNames from "classnames";
import VpsResources from "../../components/vps-resources";
import OsImageName from "../../components/os-image-name";
import SSHKeySelector from "../../components/ssh-keys";
import { clearRefCode, getRefCode } from "../../ref";

export default function OrderVmPage({ template }: { template: VmTemplate }) {
  const login = useLogin();
  const navigate = useNavigate();
  const [useImage, setUseImage] = useState(-1);
  const [useSshKey, setUseSshKey] = useState(-1);
  const [images, setImages] = useState<Array<VmOsImage>>([]);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    if (!login?.api) return;
    login.api.listOsImages().then((a) => setImages(a));
  }, [login]);

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

  const sortedImages = images.sort(
    (a, b) =>
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime(),
  );

  if (!template) {
    return <h3>No order found</h3>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">New Order</div>
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
          <div className="flex flex-col gap-2">
            <b>Select OS:</b>
            {sortedImages.map((a) => (
              <div
                className={classNames(
                  "flex justify-between items-center rounded-sm px-4 py-3 cursor-pointer",
                  {
                    "bg-cyber-panel": useImage !== a.id,
                    "bg-cyber-panel-light": useImage === a.id,
                  },
                )}
                onClick={() => setUseImage(a.id)}
              >
                <OsImageName image={a} />
              </div>
            ))}
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
        Create Order
      </AsyncButton>
      {orderError && <b className="text-cyber-danger">{orderError}</b>}
    </div>
  );
}
