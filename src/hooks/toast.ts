import { useSyncExternalStore } from "react";
import { Toast, ToastState } from "../toast";

const EMPTY: Array<Toast> = [];

export default function useToasts() {
  return useSyncExternalStore(
    (c) => ToastState.hook(c),
    () => ToastState.snapshot(),
    () => EMPTY,
  );
}
