import { useLocation } from "react-router-dom";
import { VmTemplate, AvailableIpSpace, IpSpacePricing } from "../../api";
import OrderVmPage from "./vm";
import useLogin from "../../hooks/login";
import LoginButton from "../../components/login-button";
import { FormattedMessage } from "react-intl";

export interface OrderCart {
  type: "vm" | "ip_space";
  template?: VmTemplate;
  items?: Array<{ ipBlock?: AvailableIpSpace; pricing?: IpSpacePricing }>;
}

export function OrderPage() {
  const { state } = useLocation();
  const login = useLogin();
  const cart = state as OrderCart | undefined;

  function inner() {
    if (!cart) return;
    switch (cart.type) {
      case "vm": {
        return <OrderVmPage template={cart.template!} />;
      }
      case "ip_space": {
        return (
          <div>
            <FormattedMessage defaultMessage="IP Space ordering coming soon" />
          </div>
        );
      }
    }
  }
  return (
    <div className="flex flex-col gap-12">
      {login === undefined && (
        <div className="flex flex-col gap-2">
          <div>
            <FormattedMessage defaultMessage="Please login first before making a purchase" />
          </div>
          <LoginButton />
        </div>
      )}
      {inner()}
    </div>
  );
}
