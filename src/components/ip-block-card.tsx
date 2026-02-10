import { AvailableIpSpace } from "../api";
import { IpSpacePricing } from "../api";
import { AsyncButton } from "./button";
import { useNavigate } from "react-router-dom";
import useLogin from "../hooks/login";
import CostLabel from "./cost";
import { useNavigateOrder } from "../hooks/order";

// CostAmount is no longer needed for simplified IP block card
// import { CostAmount } from "./cost";

export default function IpBlockCard({
  block,
  price,
}: {
  block: AvailableIpSpace;
  price: IpSpacePricing;
}) {
  const login = useLogin();
  const navigate = useNavigate();
  const order = useNavigateOrder();

  const classNames =
    "w-full text-center text-lg uppercase rounded-xl py-3 font-bold cursor-pointer select-none";

  return (
    <div className="rounded-xl border border-neutral-600 px-3 py-2 flex flex-col gap-1">
      <div className="text-xl">
        {block.registry.toUpperCase()}{" "}
        {block.ip_version === "ipv6" ? "IPv6" : "IPv4"} /{price.prefix_size}
      </div>
      <div className="text-lg">
        {price && (
          <CostLabel
            cost={{
              interval_type: "month",
              ...price.price,
              other_price: price.other_price,
            }}
          />
        )}
      </div>
      {price.setup_fee.amount !== 0 && (
        <div className="text-neutral-400">
          Setup fee:{" "}
          <CostLabel
            cost={{
              ...price.setup_fee,
              other_price: price.other_setup_fee,
            }}
          />
        </div>
      )}
      <div className="mt-2">
        {login ? (
          <AsyncButton
            className={`${classNames} bg-green-800`}
            onClick={() =>
              order({
                type: "ip_space",
                items: [{ ipBlock: block, pricing: price }],
              })
            }
          >
            Buy Now
          </AsyncButton>
        ) : (
          <AsyncButton
            className={`${classNames} bg-red-900`}
            onClick={() => navigate("/login")}
          >
            Login To Order
          </AsyncButton>
        )}
      </div>
    </div>
  );
}
