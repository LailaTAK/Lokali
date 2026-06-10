// mobile/src/stores/reservations.store.ts

import { create } from 'zustand';
import { Reservation } from '../types/models';
import * as reservationsApi from '../api/reservations.api';

export interface ReservationsState {
  reservations: Reservation[];
  reservationSelectionnee: Reservation | null;
  calendrierHost: Reservation[];
  filters: reservationsApi.FilterReservationsParams;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  isLoading: boolean;

  fetchReservations: (resetPagination?: boolean) => Promise<void>;
  fetchReservationById: (id: string) => Promise<void>;
  createReservation: (payload: reservationsApi.CreateReservationPayload) => Promise<Reservation>;
  confirmReservation: (id: string) => Promise<void>;
  cancelReservation: (id: string) => Promise<void>;
  fetchCalendrierHost: () => Promise<void>;
  setFilters: (filters: Partial<reservationsApi.FilterReservationsParams>) => void;
  resetFilters: () => void;
}

const initialFilters: reservationsApi.FilterReservationsParams = {
  statut: undefined,
  page: 1,
  limit: 10,
};

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  reservations: [],
  reservationSelectionnee: null,
  calendrierHost: [],
  filters: initialFilters,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
  },
  isLoading: false,

  fetchReservations: async (resetPagination = false) => {
    set({ isLoading: true });
    try {
      const currentFilters = get().filters;
      const targetPage = resetPagination ? 1 : currentFilters.page || 1;

      const searchParams = {
        ...currentFilters,
        page: targetPage,
      };

      const response = await reservationsApi.getReservations(searchParams);

      set((state) => ({
        reservations: targetPage === 1 ? response.data : [...state.reservations, ...response.data],
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
      console.error('Failed to fetch reservations:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchReservationById: async (id: string) => {
    set({ isLoading: true });
    try {
      const reservation = await reservationsApi.getReservationById(id);
      set({ reservationSelectionnee: reservation });
    } catch (error) {
      console.error(`Failed to fetch reservation ${id}:`, error);
      set({ reservationSelectionnee: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createReservation: async (payload) => {
    set({ isLoading: true });
    try {
      const newReservation = await reservationsApi.createReservation(payload);
      set((state) => ({
        reservations: [newReservation, ...state.reservations],
      }));
      return newReservation;
    } catch (error) {
      console.error('Failed to create reservation request:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  confirmReservation: async (id) => {
    set({ isLoading: true });
    try {
      const updated = await reservationsApi.updateStatut(id, 'CONFIRMEE');
      set((state) => ({
        reservations: state.reservations.map((r) => (r.id === id ? updated : r)),
        reservationSelectionnee: state.reservationSelectionnee?.id === id ? updated : state.reservationSelectionnee,
      }));
    } catch (error) {
      console.error(`Failed to confirm reservation ${id}:`, error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelReservation: async (id) => {
    set({ isLoading: true });
    try {
      const updated = await reservationsApi.updateStatut(id, 'ANNULEE');
      set((state) => ({
        reservations: state.reservations.map((r) => (r.id === id ? updated : r)),
        reservationSelectionnee: state.reservationSelectionnee?.id === id ? updated : state.reservationSelectionnee,
        calendrierHost: state.calendrierHost.filter((r) => r.id !== id),
      }));
    } catch (error) {
      console.error(`Failed to cancel reservation ${id}:`, error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCalendrierHost: async () => {
    set({ isLoading: true });
    try {
      const list = await reservationsApi.getCalendrierLoueur();
      set({ calendrierHost: list });
    } catch (error) {
      console.error('Failed to fetch host calendar:', error);
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

// FICHIER SUIVANT : mobile/src/stores/messages.store.ts
