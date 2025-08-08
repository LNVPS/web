import { useState, useEffect } from "react";
import { NostrDomainsResponse } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import Modal from "./modal";
import { DomainList } from "./domain-list";
import { resolveDnsRecords, DnsRecord } from "../utils/dns-resolver";

export function AccountNostrDomains() {
  const login = useLogin();
  const [domains, setDomains] = useState<NostrDomainsResponse>();
  const [addDomain, setAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState<string>();
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [showDnsDetails, setShowDnsDetails] = useState(false);

  useEffect(() => {
    if (login?.api) {
      login.api.listDomains().then(setDomains);
    }
  }, [login]);

  const handleMoreInfoClick = async () => {
    if (!showDnsDetails && domains?.cname && dnsRecords.length === 0) {
      // Resolve DNS records only when expanding details for the first time
      try {
        const records = await resolveDnsRecords(domains.cname);
        setDnsRecords(records);
      } catch (error) {
        console.error("Failed to resolve DNS records:", error);
      }
    }
    setShowDnsDetails(!showDnsDetails);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3>Nostr Domains</h3>
        <div className="bg-neutral-800 p-4 rounded-xl">
          <h4 className="text-lg font-medium mb-3">DNS Configuration</h4>
          <p className="text-sm text-neutral-300 mb-3">
            Free NIP-05 hosting, add a CNAME/A entry pointing to
            <code className="bg-neutral-900 px-2 py-1 rounded-full select-all">
              {domains?.cname}
            </code>
          </p>

          <button
            onClick={handleMoreInfoClick}
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            More Info
          </button>

          {showDnsDetails && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-neutral-300">
                Configure your domain's DNS with one of the following options:
              </p>

              <div className="space-y-3">
                {/* CNAME Option */}
                <div className="bg-neutral-700 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 font-mono text-sm bg-green-400/20 px-2 py-1 rounded">
                      CNAME
                    </span>
                    <span className="text-sm text-neutral-300">
                      (Recommended)
                    </span>
                  </div>
                  <div className="font-mono text-sm">
                    <div className="text-neutral-400">
                      Type: <span className="text-green-400">CNAME</span>, Name:{" "}
                      <span className="text-white">@</span>, Value:{" "}
                      <code className="bg-neutral-900 px-2 py-1 rounded select-all text-white">
                        {domains?.cname}
                      </code>
                    </div>
                  </div>
                </div>

                {/* A/AAAA Records Option */}
                {dnsRecords.length > 0 && (
                  <div className="bg-neutral-700 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400 font-mono text-sm bg-blue-400/20 px-2 py-1 rounded">
                        A / AAAA
                      </span>
                      <span className="text-sm text-neutral-300">
                        (Alternative)
                      </span>
                    </div>
                    <div className="font-mono text-sm space-y-1">
                      {dnsRecords
                        .filter((record) => record.type === "A")
                        .map((record, index) => (
                          <div key={`A-${index}`} className="text-neutral-400">
                            Type: <span className="text-blue-400">A</span>,
                            Name: <span className="text-white">@</span>, Value:{" "}
                            <code className="bg-neutral-900 px-2 py-1 rounded select-all text-white">
                              {record.value}
                            </code>
                          </div>
                        ))}
                      {dnsRecords
                        .filter((record) => record.type === "AAAA")
                        .map((record, index) => (
                          <div
                            key={`AAAA-${index}`}
                            className="text-neutral-400"
                          >
                            Type: <span className="text-blue-400">AAAA</span>,
                            Name: <span className="text-white">@</span>, Value:{" "}
                            <code className="bg-neutral-900 px-2 py-1 rounded select-all text-white">
                              {record.value}
                            </code>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-neutral-700 rounded-lg">
                <h5 className="font-medium mb-2">Configuration Notes:</h5>
                <ul className="text-sm text-neutral-300 space-y-1 list-disc list-inside">
                  <li>
                    <strong>CNAME</strong> is recommended as it automatically
                    updates if our server IPs change
                  </li>
                  <li>
                    <strong>A/AAAA records</strong> point directly to IP
                    addresses but may need manual updates
                  </li>
                  <li>
                    Use <code className="bg-neutral-900 px-1 rounded">@</code>{" "}
                    for the root domain or your subdomain name (e.g.,{" "}
                    <code className="bg-neutral-900 px-1 rounded">nostr</code>)
                  </li>
                  <li>
                    TTL (Time To Live) can be set to 3600 seconds (1 hour) or
                    lower for faster updates
                  </li>
                  <li>
                    Changes may take up to 24-48 hours to propagate globally
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <DomainList domains={domains?.domains || []} />
      </div>
      <AsyncButton onClick={() => setAddDomain(true)}>Add Domain</AsyncButton>
      {addDomain && (
        <Modal id="add-nostr-domain" onClose={() => setAddDomain(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-xl">Add Nostr Domain</div>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
            />
            <AsyncButton
              onClick={async () => {
                if (newDomain && newDomain.length > 4 && login?.api) {
                  await login.api.addDomain(newDomain);
                  const doms = await login.api.listDomains();
                  setDomains(doms);
                  setNewDomain(undefined);
                  setAddDomain(false);
                }
              }}
            >
              Add
            </AsyncButton>
          </div>
        </Modal>
      )}
    </>
  );
}
