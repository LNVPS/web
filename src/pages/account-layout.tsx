import { Outlet } from "react-router-dom";
import AccountNav from "../components/account-nav";

export default function AccountLayout() {
  return (
    <div className="flex gap-6 items-start">
      <AccountNav />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
