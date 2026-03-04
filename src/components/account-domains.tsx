import { useState, useEffect } from "react";
import { NostrDomainsResponse } from "../api";
import useLogin from "../hooks/login";
import { AsyncButton } from "./button";
import Modal from "./modal";
import { DomainList } from "./domain-list";
import { resolveDnsRecords, DnsRecord } from "../utils/dns-resolver";
import { FormattedMessage } from "react-intl";

export function AccountNostrDomains() {
  const login = useLogin();
  const [domains, setDomains] = useState<NostrDomainsResponse>();
  const [addDomain, setAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState<string>();
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [showSetupDetails, setShowSetupDetails] = useState(false);

  useEffect(() => {
    if (login?.api) {
      login.api.listDomains().then(setDomains);
    }
  }, [login]);

  const handleMoreInfoClick = async () => {
    if (!showSetupDetails && domains?.cname && dnsRecords.length === 0) {
      try {
        const records = await resolveDnsRecords(domains.cname);
        setDnsRecords(records);
      } catch (error) {
        console.error("Failed to resolve DNS records:", error);
      }
    }
    setShowSetupDetails(!showSetupDetails);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3>
          <FormattedMessage defaultMessage="Nostr Domains" />
        </h3>
        <div className="bg-cyber-panel-light p-4 rounded-sm border border-cyber-border">
          <h4 className="text-lg font-medium mb-3 text-cyber-primary">
            <FormattedMessage defaultMessage="Domain Setup" />
          </h4>
          <p className="text-sm text-cyber-text mb-3">
            <FormattedMessage
              defaultMessage="Free NIP-05 hosting. Point your domain at {cname} using DNS or a path proxy."
              values={{
                cname: (
                  <code className="bg-cyber-panel px-2 py-1 rounded-sm select-all text-cyber-primary">
                    {domains?.cname}
                  </code>
                ),
              }}
            />
          </p>

          <button
            onClick={handleMoreInfoClick}
            className="text-cyber-accent hover:text-cyber-primary text-sm underline"
          >
            <FormattedMessage defaultMessage="Setup Instructions" />
          </button>

          {showSetupDetails && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-cyber-text">
                <FormattedMessage defaultMessage="Choose one of the following methods to verify your domain:" />
              </p>

              <div className="space-y-3">
                {/* CNAME Option */}
                <div className="bg-cyber-panel p-3 rounded-sm border border-cyber-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-cyber-primary font-mono text-sm bg-cyber-primary/20 px-2 py-1 rounded-sm">
                      CNAME
                    </span>
                    <span className="text-sm text-cyber-text">
                      <FormattedMessage defaultMessage="(Recommended)" />
                    </span>
                  </div>
                  <div className="font-mono text-sm">
                    <div className="text-cyber-muted">
                      Type: <span className="text-cyber-primary">CNAME</span>,
                      Name: <span className="text-cyber-text-bright">@</span>,
                      Value:{" "}
                      <code className="bg-cyber-panel px-2 py-1 rounded-sm select-all text-cyber-text-bright">
                        {domains?.cname}
                      </code>
                    </div>
                  </div>
                </div>

                {/* A/AAAA Records Option */}
                <div className="bg-cyber-panel p-3 rounded-sm border border-cyber-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-cyber-accent font-mono text-sm bg-cyber-accent/20 px-2 py-1 rounded-sm">
                      A / AAAA
                    </span>
                    <span className="text-sm text-cyber-text">
                      <FormattedMessage defaultMessage="(Alternative)" />
                    </span>
                  </div>
                  <div className="font-mono text-sm space-y-1">
                    {dnsRecords.length === 0 ? (
                      <div className="text-cyber-muted text-sm">
                        <FormattedMessage
                          defaultMessage="Resolving IPs for {cname}…"
                          values={{
                            cname: (
                              <span className="text-cyber-text-bright">
                                {domains?.cname}
                              </span>
                            ),
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        {dnsRecords
                          .filter((record) => record.type === "A")
                          .map((record, index) => (
                            <div
                              key={`A-${index}`}
                              className="text-cyber-muted"
                            >
                              Type: <span className="text-cyber-accent">A</span>
                              , Name:{" "}
                              <span className="text-cyber-text-bright">@</span>,
                              Value:{" "}
                              <code className="bg-cyber-panel px-2 py-1 rounded-sm select-all text-cyber-text-bright">
                                {record.value}
                              </code>
                            </div>
                          ))}
                        {dnsRecords
                          .filter((record) => record.type === "AAAA")
                          .map((record, index) => (
                            <div
                              key={`AAAA-${index}`}
                              className="text-cyber-muted"
                            >
                              Type:{" "}
                              <span className="text-cyber-accent">AAAA</span>,
                              Name:{" "}
                              <span className="text-cyber-text-bright">@</span>,
                              Value:{" "}
                              <code className="bg-cyber-panel px-2 py-1 rounded-sm select-all text-cyber-text-bright">
                                {record.value}
                              </code>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Path Proxy Option */}
              <div className="bg-cyber-panel p-3 rounded-sm border border-cyber-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-cyber-warning font-mono text-sm bg-cyber-warning/20 px-2 py-1 rounded-sm">
                    Path Proxy
                  </span>
                  <span className="text-sm text-cyber-text">
                    <FormattedMessage defaultMessage="(No DNS change required)" />
                  </span>
                </div>
                <p className="text-sm text-cyber-muted mb-3">
                  <FormattedMessage
                    defaultMessage="If you cannot change your DNS, proxy {path} on your existing server to {target}"
                    values={{
                      path: (
                        <code className="bg-cyber-panel-light px-1 rounded-sm text-cyber-text-bright">
                          /.well-known/nostr.json
                        </code>
                      ),
                      target: (
                        <code className="select-all bg-cyber-panel-light px-1 rounded-sm text-cyber-text-bright">
                          https://{domains?.cname}/.well-known/nostr.json
                        </code>
                      ),
                    }}
                  />
                </p>
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-cyber-muted uppercase tracking-wide">
                    nginx
                  </div>
                  <pre className="bg-cyber-panel-light text-xs text-cyber-text-bright p-2 rounded-sm overflow-x-auto select-all whitespace-pre">{`location /.well-known/nostr.json {
    proxy_pass https://${domains?.cname}/.well-known/nostr.json;
    proxy_set_header Host ${domains?.cname};
}`}</pre>
                  <div className="text-xs text-cyber-muted uppercase tracking-wide mt-1">
                    Cloudflare Worker
                  </div>
                  <pre className="bg-cyber-panel-light text-xs text-cyber-text-bright p-2 rounded-sm overflow-x-auto select-all whitespace-pre">{`export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "${domains?.cname}";
    return fetch(url.toString(), request);
  }
}`}</pre>
                  <p className="text-xs text-cyber-muted">
                    <FormattedMessage
                      defaultMessage="Deploy this Worker and add a route for {route}"
                      values={{
                        route: (
                          <code className="bg-cyber-panel px-1 rounded-sm">
                            yourdomain.com/.well-known/nostr.json*
                          </code>
                        ),
                      }}
                    />
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-cyber-panel rounded-sm border border-cyber-border">
                <h5 className="font-medium mb-2 text-cyber-primary">
                  <FormattedMessage defaultMessage="Notes" />
                </h5>
                <ul className="text-sm text-cyber-text space-y-1 list-disc list-inside">
                  <li>
                    <FormattedMessage
                      defaultMessage="{cname} is recommended — it automatically follows server IP changes"
                      values={{ cname: <strong>CNAME</strong> }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      defaultMessage="{records} point directly to IPs and may need updating if they change"
                      values={{ records: <strong>A/AAAA records</strong> }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      defaultMessage="{proxy} works without any DNS changes — useful if you already have a site on the domain"
                      values={{ proxy: <strong>Path proxy</strong> }}
                    />
                  </li>
                  <li>
                    <FormattedMessage defaultMessage="DNS changes may take up to 24–48 hours to propagate" />
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <DomainList domains={domains?.domains || []} />
      </div>
      <AsyncButton onClick={() => setAddDomain(true)}>
        <FormattedMessage defaultMessage="Add Domain" />
      </AsyncButton>
      {addDomain && (
        <Modal id="add-nostr-domain" onClose={() => setAddDomain(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-xl">
              <FormattedMessage defaultMessage="Add Nostr Domain" />
            </div>
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
              <FormattedMessage defaultMessage="Add" />
            </AsyncButton>
          </div>
        </Modal>
      )}
    </>
  );
}
