import { useLocation } from "react-router-dom";
import { VmTemplate } from "../../api"
import OrderVmPage from "./vm";
import useLogin from "../../hooks/login";
import Login from "../../components/login";

export interface NewSubscriptionLineItem { }

export interface OrderCart {
    type: "vm" | "ip_space"
    template?: VmTemplate
    items?: Array<NewSubscriptionLineItem>
}


export function OrderPage() {
    const { state } = useLocation();
    const login = useLogin();
    const cart = state as OrderCart | undefined;

    function inner() {
        if (!cart) return;
        switch (cart.type) {
            case "vm": {
                return <OrderVmPage template={cart.template!} />
            }
        }
    }
    return <div className="flex flex-col gap-12">
        {login === undefined && <div className="flex flex-col gap-2">
            <h1>Login</h1>
            <small>Please login first before making a purchase</small>
            <Login />
        </div>}
        {inner()}
    </div>
}