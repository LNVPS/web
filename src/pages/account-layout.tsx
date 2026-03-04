import { Outlet } from "react-router-dom";
import AccountNav from "../components/account-nav";
import Seo from "../components/seo";

export default function AccountLayout() {
  return (
    <div className="flex gap-6 items-start">
      <Seo noindex={true} />
      <AccountNav />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
