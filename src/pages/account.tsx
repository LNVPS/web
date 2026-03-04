import { useEffect, useState } from "react";
import { LNVpsApi, VmInstance } from "../api";
import useLogin from "../hooks/login";
import VpsInstanceRow from "../components/vps-instance";
import { AccountNostrDomains } from "../components/account-domains";
import { Link } from "react-router-dom";
import { FormattedMessage } from "react-intl";

export default function AccountPage() {
  const login = useLogin();
  const [vms, setVms] = useState<Array<VmInstance>>([]);

  async function loadVms(api: LNVpsApi) {
    const vms = await api.listVms();
    setVms(vms);
  }

  useEffect(() => {
    if (login?.api) {
      loadVms(login.api);
      const t = setInterval(() => {
        loadVms(login.api);
      }, 5_000);
      return () => clearInterval(t);
    }
  }, [login]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cyber-text-bright">
            <FormattedMessage defaultMessage="Virtual Machines" />
          </h2>
          <Link
            to="/"
            className="text-sm text-cyber-primary hover:shadow-neon-sm transition-all"
          >
            <FormattedMessage defaultMessage="+ Deploy new" />
          </Link>
        </div>
        {vms.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 rounded-sm border border-dashed border-cyber-border text-center">
            <p className="text-cyber-muted text-sm">
              <FormattedMessage defaultMessage="You have no virtual machines yet." />
            </p>
            <Link
              to="/"
              className="py-2 px-4 rounded-sm border border-cyber-primary text-cyber-primary text-sm hover:shadow-neon-sm transition-all"
            >
              <FormattedMessage defaultMessage="Deploy your first VPS" />
            </Link>
          </div>
        ) : (
          vms.map((a) => (
            <VpsInstanceRow
              key={a.id}
              vm={a}
              onReload={() => {
                if (login?.api) {
                  loadVms(login.api);
                }
              }}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-cyber-text-bright">
          <FormattedMessage defaultMessage="Nostr Domains" />
        </h2>
        <AccountNostrDomains />
      </section>
    </div>
  );
}
