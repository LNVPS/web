Since our last round-up in March, we have kept shipping improvements across the control panel. Here is everything new.

## Per-VM Firewall Rules

You can now manage a firewall for each VM directly from the control panel. A new **Firewall** tab on the VM page lets you set inbound and outbound default policies and add up to 20 custom rules. Each rule supports a direction, protocol (TCP/UDP/ICMP), port or port range, source/destination address, and an action (accept, drop, or reject). Rules can be enabled, edited, or removed at any time, giving you fine-grained control over network access without touching the guest OS.

## Telegram and WhatsApp Notifications

In addition to email and encrypted Nostr DMs, you can now receive account notifications via **Telegram** and **WhatsApp**. Manage all of your notification channels from the redesigned account settings page, where each channel shows its current connection status and can be toggled independently.

## Account Settings Redesign

The account settings page has been reorganised into clean, sectioned panels with terminal-style status rows for each notification channel. The Support tab no longer needs you to attach your public key manually — it is now included automatically — and the Messages tab keeps a read-only history of past support conversations.

## VM Overview with Sidebar Navigation

The VM detail page has a new sidebar layout with dedicated sections for **Overview, Billing, Console, Firewall, Graphs, History, and Upgrade**. The overview has been redesigned with a clear spec grid (CPU, RAM, disk, OS, region, SSH key), a live status pill showing CPU and RAM usage, and expiry information with quick Pay Now / Renew actions. VMs that are still provisioning now show an animated loader instead of incomplete details, and brand-new VMs awaiting their first payment are clearly badged.

## Status Page Improvements

The public status page now shows a **monthly uptime graph** covering the past 12 months, so you can see historical availability at a glance. We also added a **Planned** state for scheduled maintenance, making it clear when work is expected rather than an unexpected incident.

## SEO and Discoverability

The site now ships per-route page titles and meta descriptions, a `robots.txt`, a sitemap, and structured data. News posts and key pages are properly described for search engines and social previews, in every supported language.

As always, thank you for using LNVPS. More to come.
