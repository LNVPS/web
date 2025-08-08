import { useState, useEffect, useCallback } from "react";
import { PaymentMethod } from "../api";
import useLogin from "./login";

const CACHE_KEY = "payment_methods_cache";
const CACHE_EXPIRY_KEY = "payment_methods_cache_expiry";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const login = useLogin();

  const getCachedMethods = useCallback((): PaymentMethod[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
      
      if (cached && expiry) {
        const timestamp = parseInt(expiry, 10);
        const isValid = Date.now() - timestamp < CACHE_DURATION;
        
        if (isValid) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.error("Failed to get cached payment methods:", error);
    }
    
    return null;
  }, []);

  const setCachedMethods = useCallback((paymentMethods: PaymentMethod[]) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(paymentMethods));
      localStorage.setItem(CACHE_EXPIRY_KEY, timestamp.toString());
    } catch (error) {
      console.error("Failed to cache payment methods:", error);
    }
  }, []);

  const loadFromApi = useCallback(async () => {
    if (!login?.api) return;
    
    setLoading(true);
    try {
      const apiMethods = await login.api.getPaymentMethods();
      setMethods(apiMethods);
      setCachedMethods(apiMethods);
    } catch (error) {
      console.error("Failed to load payment methods from API:", error);
    } finally {
      setLoading(false);
    }
  }, [login?.api, setCachedMethods]);

  const reloadMethods = useCallback(() => {
    loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    // First try to load from cache
    const cached = getCachedMethods();
    if (cached) {
      setMethods(cached);
    } else if (login?.api) {
      // If no valid cache, load from API
      loadFromApi();
    }
  }, [login?.api, getCachedMethods, loadFromApi]);

  return {
    methods,
    loading,
    reload: reloadMethods
  };
}