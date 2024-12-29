import { AsyncButton } from "./button";
import useLogin from "../hooks/login";
import Profile from "./profile";
import { NostrLink } from "@snort/system";
import { Link, useNavigate } from "react-router-dom";

export default function LoginButton() {
  const login = useLogin();
  const navigate = useNavigate();

  return !login ? (
    <AsyncButton
      onClick={async () => {
        navigate("/login");
      }}
    >
      Sign In
    </AsyncButton>
  ) : (
    <Link to="/account">
      <Profile link={NostrLink.publicKey(login.publicKey)} />
    </Link>
  );
}
