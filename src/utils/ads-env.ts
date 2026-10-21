import { isOnion } from "../const";
import { adsConfig } from "./ads";

export const AdsSettings = adsConfig(import.meta.env);

export function adsActive() {
  return AdsSettings !== undefined && !isOnion();
}
