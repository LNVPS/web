import { AsyncButton } from "./button";
import useLogin from "../hooks/login";
import Profile from "./profile";
import { NostrLink } from "@snort/system";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function LoginButton() {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  return !login ? (
    <AsyncButton
      onClick={async () => {
        navigate("/login", { state: location.state });
      }}
      className="border-cyber-primary text-cyber-primary hover:shadow-neon"
    >
      Sign In
    </AsyncButton>
  ) : (
    <Link to="/account">
      <Profile link={NostrLink.publicKey(login.publicKey)} />
    </Link>
  );
}
