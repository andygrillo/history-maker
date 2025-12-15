import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings } from '@/types';

interface SettingsState {
  settings: Partial<UserSettings>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: Partial<UserSettings>) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  settings: {},
  isLoading: false,
  error: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setSettings: (settings) => set({ settings }),
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'history-maker-settings',
      partialize: (state) => ({
        // Only persist non-sensitive settings locally
        // API keys are stored in Supabase
        settings: {
          r2Endpoint: state.settings.r2Endpoint,
          r2BucketName: state.settings.r2BucketName,
          r2PublicUrl: state.settings.r2PublicUrl,
        },
      }),
    }
  )
);
