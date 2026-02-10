import { useNavigate } from "react-router-dom";
import { OrderCart } from "../pages/order";

export function useNavigateOrder() {
  const navigate = useNavigate();
  return (cart: OrderCart) => {
    navigate("/order", {
      state: cart,
    });
  };
}
