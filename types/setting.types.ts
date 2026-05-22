import { NotificationSettings as NotificationSettingsType } from "@/notifications/notification.types";
import { DietaryData } from "./index"

export const ACCENT_COLORS = {
    none: "transparent",
    blue: "#2563EB",
    indigo: "#4F46E5",
    purple: "#7C3AED",
    pink: "#DB2777",
    orange: "#EA580C",
    yellow: "#FACC15",
    teal: "#0D9488",
} as const;

export type AccentColor = keyof typeof ACCENT_COLORS;

// Food preferences
export type FoodPreferences = {
    diets: DietaryData
    calorieRange: {
        min: number | null
        max: number | null
    }
}

// Feed Controls
export type FeedControls = {
    autoPlayVideos: boolean
}

// Notificatioations boolean controls (off | on)
export type NotificationSettings = NotificationSettingsType;

// Privacy information (references ./web)
export type PrivacySettings = {}

// Application Settings
export type AppSettings = {
    theme: "light" | "dark" | "system"
    accentColor: AccentColor
    hapticsEnabled: boolean
}

// Main typ
export type Settings = {
    food: FoodPreferences
    feed: FeedControls
    notifications: NotificationSettings
    privacy: PrivacySettings
    app: AppSettings
}