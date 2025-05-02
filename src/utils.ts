import { base16 } from "@scure/base";

export async function openFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const elm = document.createElement("input");
    let lock = false;
    elm.type = "file";
    const handleInput = (e: Event) => {
      lock = true;
      const elm = e.target as HTMLInputElement;
      if ((elm.files?.length ?? 0) > 0) {
        resolve(elm.files![0]);
      } else {
        resolve(undefined);
      }
    };

    elm.onchange = (e) => handleInput(e);
    elm.click();
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!lock) {
            resolve(undefined);
          }
        }, 300);
      },
      { once: true },
    );
  });
}

export function toEui64(prefix: string, mac: string) {
  const macData = base16.decode(mac.replace(/:/g, "").toUpperCase());
  const macExtended = new Uint8Array([
    ...macData.subarray(0, 3),
    0xff,
    0xfe,
    ...macData.subarray(3, 6),
  ]);
  macExtended[0] |= 0x02;
  return (
    prefix +
    base16.encode(macExtended.subarray(0, 2)) +
    ":" +
    base16.encode(macExtended.subarray(2, 4)) +
    ":" +
    base16.encode(macExtended.subarray(4, 6)) +
    ":" +
    base16.encode(macExtended.subarray(6, 8))
  ).toLowerCase();
}

export function timeValue(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    return "Invalid input";
  }

  if (n >= 86400) {
    const days = Math.floor(n / 86400);
    return days.toLocaleString() + " day" + (days !== 1 ? "s" : "");
  }
  if (n >= 3600) {
    const hours = Math.floor(n / 3600);
    const minutes = Math.floor((n % 3600) / 60);
    return (
      hours +
      " hr" +
      (hours !== 1 ? "s" : "") +
      (minutes > 0 ? " " + minutes + " min" + (minutes !== 1 ? "s" : "") : "")
    );
  }
  if (n >= 60) {
    const minutes = Math.floor(n / 60);
    return minutes + " min" + (minutes !== 1 ? "s" : "");
  }
  return n + " sec" + (n !== 1 ? "s" : "");
}
