import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";
import { useCached } from "./useCached";

const CACHE_KEY = "payment_methods";
const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

export default function usePaymentMethods() {
  return useCached(
    CACHE_KEY,
    async () => {
      const api = new LNVpsApi(ApiUrl, undefined);
      const methods = await api.getPaymentMethods();
      return methods;
    },
    CACHE_DURATION,
  );
}
