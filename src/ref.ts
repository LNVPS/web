export interface RefCode {
  code: string;
  saved: number;
}

export function saveRefCode() {
  const search = new URLSearchParams(window.location.search);
  const code = search.get("ref");
  if (code) {
    // save or overwrite new code from landing
    window.localStorage.setItem(
      "ref",
      JSON.stringify({
        code,
        saved: Math.floor(new Date().getTime() / 1000),
      }),
    );
    window.location.search = "";
  }
}

export function getRefCode() {
  const ref = window.localStorage.getItem("ref");
  if (ref) {
    const refObj = JSON.parse(ref) as RefCode;
    const now = Math.floor(new Date().getTime() / 1000);
    // treat code as stale if > 7days old
    if (Math.abs(refObj.saved - now) > 604800) {
      window.localStorage.removeItem("ref");
    }
    return refObj;
  }
}

export function clearRefCode() {
  window.localStorage.removeItem("ref");
}
