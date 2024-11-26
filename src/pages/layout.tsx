import { Link, Outlet } from "react-router-dom";
import LoginButton from "../components/login-button";

export default function Layout() {
  return (
    <div className="w-[700px] mx-auto m-2 p-2">
      <div className="flex items-center justify-between mb-4">
        <Link to="/">LNVPS</Link>
        <LoginButton />
      </div>

      <Outlet />
    </div>
  );
}
