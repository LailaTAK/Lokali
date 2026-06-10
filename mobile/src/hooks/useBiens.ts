// mobile/src/hooks/useBiens.ts

import { useEffect, useCallback, useRef } from 'react';
import { useBiensStore } from '../stores/biens.store';
import { FilterBiensParams } from '../api/biens.api';

// Simple cache object to implement SWR-like state persistence for property details
const detailsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime

/**
 * Hook to manage property listings, search filters with debounce, and infinite scrolling.
 */
export function useBiens() {
  const {
    biens,
    bienSelectionne,
    selectedBienAnnonces,
    selectedBienStats,
    filters,
    pagination,
    isLoading,
    fetchBiens,
    fetchBienById,
    setFilters,
    resetFilters,
  } = useBiensStore();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Refreshes the list from scratch (resets pagination to page 1).
   */
  const refresh = useCallback(async () => {
    await fetchBiens(true);
  }, [fetchBiens]);

  /**
   * Loads the next page of properties if available.
   * Ideal for FlatList 'onEndReached' handlers.
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !pagination.hasNextPage) return;
    
    // Increment page counter and fetch in append mode
    setFilters({ page: pagination.page + 1 });
    await fetchBiens(false);
  }, [isLoading, pagination, setFilters, fetchBiens]);

  /**
   * Updates filters with a 300ms debounce to prevent multiple server requests during typing.
   */
  const updateFiltersDebounced = useCallback(
    (newFilters: Partial<FilterBiensParams>) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Merge filters locally first
      setFilters(newFilters);

      debounceTimeoutRef.current = setTimeout(async () => {
        // Trigger a fresh search
        await fetchBiens(true);
      }, 300);
    },
    [setFilters, fetchBiens]
  );

  /**
   * Fetch details for a specific property using an SWR-like caching strategy.
   * 
   * @param {string} id - The property ID.
   */
  const fetchBienWithCache = useCallback(
    async (id: string) => {
      const cached = detailsCache.get(id);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_TTL) {
        // Hydrate from cache immediately
        useBiensStore.setState({
          bienSelectionne: cached.data.bien,
          selectedBienAnnonces: cached.data.annonces,
          selectedBienStats: cached.data.stats,
        });
        return;
      }

      // Fetch fresh data from backend
      await fetchBienById(id);

      // Save to cache
      const state = useBiensStore.getState();
      detailsCache.set(id, {
        data: {
          bien: state.bienSelectionne,
          annonces: state.selectedBienAnnonces,
          stats: state.selectedBienStats,
        },
        timestamp: Date.now(),
      });
    },
    [fetchBienById]
  );

  // Clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    biens,
    bienSelectionne,
    selectedBienAnnonces,
    selectedBienStats,
    filters,
    pagination,
    isLoading,
    refresh,
    loadMore,
    updateFiltersDebounced,
    fetchBienWithCache,
    resetFilters,
  };
}

// FICHIER SUIVANT : mobile/src/hooks/useSocket.ts
