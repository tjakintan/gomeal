import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { Settings, defaultDietaryData } from "@/types"

type SettingsStore = {
  settings: Settings
  updateFood: (updates: Partial<Settings["food"]>) => void
  updateFeed: (updates: Partial<Settings["feed"]>) => void
  updateNotifications: (updates: Partial<Settings["notifications"]>) => void
  updateApp: (updates: Partial<Settings["app"]>) => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  food: { diets: defaultDietaryData, maxCookTime: null, calorieRange: { min: null, max: null }, units: "metric"},
  feed: { compactMode: false, autoPlayVideos: true },
  notifications: { likes: true, saves: true, cookingReminderTime: null },
  privacy: {},
  app: { theme: "system", navCirclePosition: "BR", hapticsEnabled: true, navCircleColor: "none" },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateFood: (updates) =>
        set((state) => ({ settings: { ...state.settings, food: { ...state.settings.food, ...updates } } })),
      updateFeed: (updates) =>
        set((state) => ({ settings: { ...state.settings, feed: { ...state.settings.feed, ...updates } } })),
      updateNotifications: (updates) =>
        set((state) => ({
          settings: { ...state.settings, notifications: { ...state.settings.notifications, ...updates } },
        })),
      updateApp: (updates) =>
        set((state) => ({ settings: { ...state.settings, app: { ...state.settings.app, ...updates } } })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: "gomeal-settings",
      storage: createJSONStorage(() => {
        return require("@react-native-async-storage/async-storage").default
      }),
    }
  )
)
