// mobile/src/stores/biens.store.ts

import { create } from 'zustand';
import { Bien } from '../types/models';
import * as biensApi from '../api/biens.api';

export interface BiensState {
  biens: Bien[];
  bienSelectionne: Bien | null;
  selectedBienAnnonces: any[];
  selectedBienStats: {
    totalReservations: number;
    averageRating: number;
    reviewsCount: number;
  } | null;
  filters: biensApi.FilterBiensParams;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  isLoading: boolean;

  fetchBiens: (resetPagination?: boolean) => Promise<void>;
  fetchBienById: (id: string) => Promise<void>;
  createBien: (payload: biensApi.CreateBienPayload) => Promise<Bien>;
  updateBien: (id: string, payload: biensApi.UpdateBienPayload) => Promise<Bien>;
  deleteBien: (id: string) => Promise<void>;
  setFilters: (filters: Partial<biensApi.FilterBiensParams>) => void;
  resetFilters: () => void;
}

const initialFilters: biensApi.FilterBiensParams = {
  ville: undefined,
  type: undefined,
  prixMin: undefined,
  prixMax: undefined,
  superficieMin: undefined,
  nbPiecesMin: undefined,
  lat: undefined,
  lng: undefined,
  rayon: undefined,
  page: 1,
  limit: 10,
};

export const useBiensStore = create<BiensState>((set, get) => ({
  biens: [],
  bienSelectionne: null,
  selectedBienAnnonces: [],
  selectedBienStats: null,
  filters: initialFilters,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  },
  isLoading: false,

  fetchBiens: async (resetPagination = false) => {
    set({ isLoading: true });
    try {
      const currentFilters = get().filters;
      const targetPage = resetPagination ? 1 : currentFilters.page || 1;
      
      const searchParams = {
        ...currentFilters,
        page: targetPage,
      };

      const response = await biensApi.getBiens(searchParams);

      set((state) => ({
        biens: targetPage === 1 ? response.data : [...state.biens, ...response.data],
        filters: { ...currentFilters, page: targetPage },
        pagination: {
          page: response.meta.page,
          limit: response.meta.limit,
          total: response.meta.total,
          totalPages: response.meta.totalPages,
          hasNextPage: response.meta.hasNextPage,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch biens:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBienById: async (id: string) => {
    set({ isLoading: true });
    try {
      const data = await biensApi.getBienById(id);
      set({
        bienSelectionne: data.bien,
        selectedBienAnnonces: data.annonces,
        selectedBienStats: data.stats,
      });
    } catch (error) {
      console.error(`Failed to fetch bien details for ID ${id}:`, error);
      set({ bienSelectionne: null, selectedBienAnnonces: [], selectedBienStats: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createBien: async (payload) => {
    set({ isLoading: true });
    try {
      const newBien = await biensApi.createBien(payload);
      // Prepend the new property to the local list
      set((state) => ({
        biens: [newBien, ...state.biens],
      }));
      return newBien;
    } catch (error) {
      console.error('Failed to create bien:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateBien: async (id, payload) => {
    set({ isLoading: true });
    try {
      const updatedBien = await biensApi.updateBien(id, payload);
      set((state) => ({
        biens: state.biens.map((b) => (b.id === id ? updatedBien : b)),
        bienSelectionne: state.bienSelectionne?.id === id ? updatedBien : state.bienSelectionne,
      }));
      return updatedBien;
    } catch (error) {
      console.error(`Failed to update bien ${id}:`, error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteBien: async (id) => {
    set({ isLoading: true });
    try {
      await biensApi.deleteBien(id);
      set((state) => ({
        biens: state.biens.filter((b) => b.id !== id),
        bienSelectionne: state.bienSelectionne?.id === id ? null : state.bienSelectionne,
      }));
    } catch (error) {
      console.error(`Failed to delete bien ${id}:`, error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: initialFilters });
  },
}));

// FICHIER SUIVANT : mobile/src/stores/reservations.store.ts
