import { Link, Outlet } from "react-router-dom";
import LoginButton from "../components/login-button";
import { saveRefCode } from "../ref";

export default function Layout() {
  saveRefCode();
  return (
    <div className="max-w-6xl mx-auto m-2 p-2">
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="text-2xl">
          LNVPS
        </Link>
        <LoginButton />
      </div>

      <Outlet />
    </div>
  );
}
