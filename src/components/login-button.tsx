import { SnortContext } from "@snort/system-react";
import { useContext } from "react";
import { AsyncButton } from "./button";
import { loginNip7 } from "../login";
import useLogin from "../hooks/login";
import Profile from "./profile";
import { NostrLink } from "@snort/system";
import { Link } from "react-router-dom";

export default function LoginButton() {
  const system = useContext(SnortContext);
  const login = useLogin();

  return !login ? (
    <AsyncButton
      onClick={async () => {
        await loginNip7(system);
      }}
    >
      Sign In
    </AsyncButton>
  ) : (
    <Link to="/account">
      <Profile link={NostrLink.publicKey(login.pubkey)} />
    </Link>
  );
}
