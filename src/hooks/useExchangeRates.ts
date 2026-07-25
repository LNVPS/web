import { LNVpsApi } from "../api";
import { ApiUrl } from "../const";
import { useCached } from "./useCached";

const CACHE_KEY = "exchange_rates";
// Rates change slowly; the server itself caches ~5 min.
const CACHE_DURATION = 5 * 60; // seconds

/** Public BTC-based exchange-rate snapshot, cached client-side. */
export default function useExchangeRates() {
  return useCached(
    CACHE_KEY,
    async () => {
      const api = new LNVpsApi(ApiUrl, undefined);
      return await api.getExchangeRates("BTC");
    },
    CACHE_DURATION,
  );
}
