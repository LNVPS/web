import { hexToBech32 } from "@snort/shared";
import { NostrLink } from "@snort/system";
import { useUserProfile } from "@snort/system-react";

export default function Profile({ link }: { link: NostrLink }) {
  const profile = useUserProfile(link.id);
  const name = profile?.display_name ?? profile?.name ?? "";
  return (
    <div className="flex gap-2 items-center">
      <img
        src={profile?.picture}
        className="w-12 h-12 rounded-full bg-neutral-800 object-cover object-center"
      />
      <div>
        {name.length > 0 ? name : hexToBech32("npub", link.id).slice(0, 12)}
      </div>
    </div>
  );
}
