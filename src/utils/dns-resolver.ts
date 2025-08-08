import DnsOverHttpResolver from "dns-over-http-resolver";

export interface DnsRecord {
  type: string;
  value: string;
  ttl?: number;
}

function isValidIpAddress(value: string): boolean {
  // IPv4 regex
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (more comprehensive)
  const ipv6Regex =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4})*$|^(?:[0-9a-fA-F]{1,4}:)+:[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(value) || ipv6Regex.test(value);
}

export async function resolveDnsRecords(domain: string): Promise<DnsRecord[]> {
  const resolver = new DnsOverHttpResolver();
  const records: DnsRecord[] = [];

  try {
    // Resolve A records (IPv4) - this follows CNAME chains to get final IPs
    const aRecords = await resolver.resolve4(domain);
    records.push(
      ...aRecords
        .filter((ip: string) => isValidIpAddress(ip))
        .map((ip: string) => ({ type: "A", value: ip })),
    );
  } catch (error) {
    console.warn(`Failed to resolve A records for ${domain}:`, error);
  }

  try {
    // Resolve AAAA records (IPv6) - this follows CNAME chains to get final IPs
    const aaaaRecords = await resolver.resolve6(domain);
    records.push(
      ...aaaaRecords
        .filter((ip: string) => isValidIpAddress(ip))
        .map((ip: string) => ({ type: "AAAA", value: ip })),
    );
  } catch (error) {
    console.warn(`Failed to resolve AAAA records for ${domain}:`, error);
  }

  // If no records found, try resolving CNAME chain manually
  if (records.length === 0) {
    try {
      const cnameRecords = await resolver.resolveCname(domain);
      if (cnameRecords && cnameRecords.length > 0) {
        // Recursively resolve the CNAME target
        const targetRecords = await resolveDnsRecords(cnameRecords[0]);
        records.push(...targetRecords);
      }
    } catch (error) {
      console.warn(`Failed to resolve CNAME records for ${domain}:`, error);
    }
  }

  return records;
}
