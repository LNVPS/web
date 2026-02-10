import { Link, Outlet } from "react-router-dom";
import LoginButton from "../components/login-button";
import { saveRefCode } from "../ref";

export default function Layout() {
  saveRefCode();
  return (
    <div className="max-w-6xl mx-auto m-2 p-2">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyber-border">
        <Link
          to="/"
          className="text-2xl text-cyber-primary animate-flicker hover:shadow-neon-lg transition-all"
          style={{ textShadow: "0 0 10px #39ff14, 0 0 20px #39ff1444" }}
        >
          LNVPS
        </Link>
        <LoginButton />
      </div>

      <Outlet />
    </div>
  );
}
