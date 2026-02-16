import { DietaryData, NavCircleColor } from "./index"

// Food preferences
export type FoodPreferences = {
    diets: DietaryData
    maxCookTime: number | null 
    calorieRange: {
        min: number | null
        max: number | null
    }
    units: "metric" | "imperial"
}

// Feed Controls
export type FeedControls = {
    compactMode: boolean
    autoPlayVideos: boolean
}

// Notificatioations boolean controls (off | on)
export type NotificationSettings = {
    likes: boolean
    saves: boolean
    cookingReminderTime: string | null
}

// Privacy information (references ./web)
export type PrivacySettings = {}

// Application Settings
export type AppSettings = {
    theme: "light" | "dark" | "system"
    navCirclePosition: "TL" | "TR" | "BL" | "BR"
    navCircleColor: NavCircleColor
    hapticsEnabled: boolean
}

// Main type
export type Settings = {
    food: FoodPreferences
    feed: FeedControls
    notifications: NotificationSettings
    privacy: PrivacySettings
    app: AppSettings
}