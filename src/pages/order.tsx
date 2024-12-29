import { useLocation, useNavigate } from "react-router-dom";
import { VmOsImage, VmTemplate } from "../api";
import { useEffect, useState } from "react";
import CostLabel from "../components/cost";
import useLogin from "../hooks/login";
import { AsyncButton } from "../components/button";
import classNames from "classnames";
import VpsResources from "../components/vps-resources";
import OsImageName from "../components/os-image-name";
import SSHKeySelector from "../components/ssh-keys";

export default function OrderPage() {
  const { state } = useLocation();
  const login = useLogin();
  const navigate = useNavigate();
  const template = state as VmTemplate | undefined;
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
      const newVm = await login.api.orderVm(template.id, useImage, useSshKey);
      navigate("/vm/renew", {
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

  if (!template || !login) {
    return <h3>No order found</h3>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl">New Order</div>
      <div className="flex justify-between items-center rounded-xl bg-neutral-900 px-4 py-3">
        <div className="flex flex-col gap-1">
          <div>{template.name}</div>
          <VpsResources vm={template} />
        </div>
        {template.cost_plan && <CostLabel cost={template.cost_plan} />}
      </div>
      <hr />
      <div className="flex flex-col gap-2">
        <b>Select OS:</b>
        {sortedImages.map((a) => (
          <div
            className={classNames(
              "flex justify-between items-center rounded-xl px-4 py-3 cursor-pointer",
              {
                "bg-neutral-900": useImage !== a.id,
                "bg-neutral-700": useImage === a.id,
              },
            )}
            onClick={() => setUseImage(a.id)}
          >
            <OsImageName image={a} />
          </div>
        ))}
      </div>
      <hr />
      <SSHKeySelector selectedKey={useSshKey} setSelectedKey={setUseSshKey} />
      <AsyncButton
        disabled={useSshKey === -1 || useImage === -1}
        onClick={createOrder}
      >
        Create Order
      </AsyncButton>
      {orderError && <b className="text-red-500">{orderError}</b>}
    </div>
  );
}
