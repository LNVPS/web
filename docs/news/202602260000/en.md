Yesterday we experienced an extended network outage during what was planned as routine maintenance: a firmware upgrade on our core router. We want to be transparent about what happened and why it took as long as it did to resolve.

## What happened

The firmware upgrade itself appeared to complete without issue. The router came up cleanly, interfaces were present, and local traffic between servers on the router worked fine. However, our upstream BGP sessions and VXLAN tunnels refused to come back up.

What followed was roughly eight hours of diagnosing some of the strangest network behaviour we have encountered. ARP resolution on the transit ports was inconsistent. BGP sessions would establish, traffic would begin routing, and then the link would effectively go dead — not actually down at the interface level, but simply not forwarding packets, with zero drops reported. Every diagnostic we ran on the router showed nothing wrong: no errors, no log entries, nothing.

We contacted our transit provider, who confirmed they could see nothing wrong on their end either. We tried numerous different configurations. We even moved the BGP and tunnel configs off the router entirely onto a separate Linux server to isolate the problem — and hit the exact same behaviour. At that point the router itself seemed ruled out, since the issue followed the transit ports regardless of what was driving them.

After exhausting every other avenue, we factory reset the router as a last resort and applied a minimal configuration from scratch — just the bridge and VLAN setup. To our surprise, it worked instantly. Perfectly.

## Root cause

As best as we can determine, the firmware upgrade resulted in some form of silent corruption in the router's state that affected how the transit-facing interfaces handled traffic. Despite the upgrade appearing completely successful, the router reporting no errors, and the issue even reproducing when BGP was handled by a different machine entirely, a factory reset and clean configuration was all it took to resolve it. It remains one of the more puzzling failures we have dealt with.

## What you may need to do

- **If your VM is unreachable**, please stop and start it from your control panel. In most cases this will restore connectivity.
- **If it is still unreachable after a stop/start**, please contact support and we will investigate.
- **If you see an SSH host key change warning** when connecting to your VM, this is expected. VMs were reconfigured in bulk to work with the new setup, and cloud-init regenerated host keys as part of that process. This is standard cloud-init behaviour when a VM is re-initialised — you can safely accept the new key.

We apologise for the extended downtime and the frustration it caused. We are reviewing our upgrade procedures to ensure we can identify and recover from issues like this more quickly in the future.
