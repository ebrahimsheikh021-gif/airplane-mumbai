import { create } from 'zustand';

export const useStore = create((set, get) => ({
  arrivals: [],
  previousArrivals: [],
  selectedHex: null,
  lastUpdated: null,
  loading: false,
  error: null,
  interpolationProgress: 0,

  setArrivals: (newArrivals, timestamp) =>
    set((state) => ({
      previousArrivals: state.arrivals,
      arrivals: newArrivals,
      lastUpdated: timestamp,
      interpolationProgress: 0,
    })),

  setSelected: (hex) => set({ selectedHex: hex }),

  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),
  setInterpolationProgress: (p) => set({ interpolationProgress: p }),

  getSelectedAircraft: () => {
    const { arrivals, selectedHex } = get();
    return arrivals.find((a) => a.hex === selectedHex) || null;
  },
}));
