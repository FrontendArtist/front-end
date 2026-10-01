'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getConversionRateWithByeMoney } from '@/lib/byeMoneyApi';

const DisplayRateContext = createContext({
  rialPerNoor: null,
  tomanPerNoor: null,
  isLoading: false,
  isError: false,
  refreshRate: async () => {},
});

// Cache in module memory (15-minute TTL)
const CACHE_TTL_MS = 15 * 60 * 1000;
let memoryCache = {
  data: null, // { rialPerNoor, tomanPerNoor }
  timestamp: 0,
};
let inFlightPromise = null;

// Listeners to notify whenever the cache is invalidated/updated
const cacheListeners = new Set();

/**
 * Fetch conversion rate with 15-minute in-memory caching and in-flight deduplication.
 * @param {boolean} forceRefresh - If true, bypasses the TTL cache.
 */
export async function fetchDisplayRate(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && memoryCache.data && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
    return memoryCache.data;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await getConversionRateWithByeMoney();
      if (res.success && res.tomanPerNoor > 0) {
        memoryCache = {
          data: {
            rialPerNoor: res.rialPerNoor,
            tomanPerNoor: res.tomanPerNoor,
          },
          timestamp: Date.now(),
        };
        cacheListeners.forEach((listener) => listener(memoryCache.data));
        return memoryCache.data;
      }
      return null;
    } catch (err) {
      console.warn('[DisplayRate] Failed to fetch live conversion rate:', err?.message);
      return null;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Invalidate the in-memory display rate cache.
 * Called automatically after top-up request creations.
 */
export function invalidateConversionRateCache() {
  memoryCache = { data: null, timestamp: 0 };
  // Trigger fresh background fetch and notify listeners
  fetchDisplayRate(true).catch(() => {});
}

export function DisplayRateProvider({ children }) {
  const [rateState, setRateState] = useState({
    rialPerNoor: memoryCache.data?.rialPerNoor ?? null,
    tomanPerNoor: memoryCache.data?.tomanPerNoor ?? null,
    isLoading: !memoryCache.data,
    isError: false,
  });

  const mountedRef = useRef(true);

  const loadRate = useCallback(async (force = false) => {
    setRateState((prev) => ({ ...prev, isLoading: true, isError: false }));
    const result = await fetchDisplayRate(force);
    if (!mountedRef.current) return;

    if (result) {
      setRateState({
        rialPerNoor: result.rialPerNoor,
        tomanPerNoor: result.tomanPerNoor,
        isLoading: false,
        isError: false,
      });
    } else {
      setRateState((prev) => ({
        ...prev,
        isLoading: false,
        isError: true,
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const onCacheUpdate = (newData) => {
      if (!mountedRef.current) return;
      if (newData) {
        setRateState({
          rialPerNoor: newData.rialPerNoor,
          tomanPerNoor: newData.tomanPerNoor,
          isLoading: false,
          isError: false,
        });
      }
    };
    cacheListeners.add(onCacheUpdate);

    loadRate();

    return () => {
      mountedRef.current = false;
      cacheListeners.delete(onCacheUpdate);
    };
  }, [loadRate]);

  const value = {
    rialPerNoor: rateState.rialPerNoor,
    tomanPerNoor: rateState.tomanPerNoor,
    isLoading: rateState.isLoading,
    isError: rateState.isError,
    refreshRate: () => loadRate(true),
  };

  return (
    <DisplayRateContext.Provider value={value}>
      {children}
    </DisplayRateContext.Provider>
  );
}

/**
 * Hook to access the live Toman display hint rate across the entire app.
 */
export function useDisplayRate() {
  return useContext(DisplayRateContext);
}
