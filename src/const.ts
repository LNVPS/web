import { NostrPrefix } from "@snort/shared";
import { NostrLink } from "@snort/system";

export const KiB = 1024;
export const MiB = KiB * 1024;
export const GiB = MiB * 1024;
export const TiB = GiB * 1024;
export const PiB = TiB * 1024;

export const KB = 1000;
export const MB = KB * 1000;
export const GB = KB * 1000;
export const TB = GB * 1000;
export const PB = TB * 1000;

export const ApiUrl = import.meta.env.VITE_API_URL;

export const NostrProfile = new NostrLink(
  NostrPrefix.Profile,
  "fcd818454002a6c47a980393f0549ac6e629d28d5688114bb60d831b5c1832a7",
  undefined,
  undefined,
  [
    "wss://nos.lol/",
    "wss://relay.primal.net/",
    "wss://relay.damus.io/",
    "wss://relay.snort.social/",
  ],
);

export const ServiceBirth = new Date("2024-06-05T00:00:00Z");
