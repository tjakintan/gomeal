import { ImageSourcePropType, StyleProp, ViewStyle, ImageStyle } from "react-native";

export type ThemePalette = {
  background: string
  card: string
  secondaryCard: string,
  text: string
  secondaryText: string
  accent: string
}

export const NAV_COLORS = {
    none: "transparent",
    blue: "#2563EB",
    indigo: "#4F46E5",
    purple: "#7C3AED",
    pink: "#DB2777",
    orange: "#EA580C",
    yellow: "#FACC15",
    teal: "#0D9488",
} as const;

export type NavCircleColor = keyof typeof NAV_COLORS;

//.Don't change order
export const SECTION_INDEX = {
    gomeal: 0,
    settings: 1,
    feed: 2,
    discover: 3,
    post: 4,
    user: 5,
} as const;

export const INDEX_SECTION = Object.fromEntries(
    Object.entries(SECTION_INDEX).map(([k, v]) => [v, k])
) as Record<SectionIndex, Sections>;

export function getPrevSectionIndex(i: SectionIndex): SectionIndex {
    if (i <= 0) return 0;
    return (i - 1) as SectionIndex;
}

export type Sections = keyof typeof SECTION_INDEX;
export type SectionIndex = typeof SECTION_INDEX[Sections];

export type SectionIconProps = {
    name: Sections;
    img_url: ImageSourcePropType;
    imageStyle?: StyleProp<ImageStyle>;
}

export type NavigateProps = {
    section: Sections;
    openNavigateSection: boolean;
    setOpenNavigateSection: (v: boolean) => void;
    goToSection: (s: Sections) => void;
};

export type NavigateSectionProps = {
    goToSection: (s: Sections) => void | Promise<void>;
    goPrevSection: () => void | Promise<void>;
    expandsUp?: boolean;
}

export type GestureProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleAmount?: number;
  duration?: number;
  haptic?: boolean;
}

export type SettingsSection =
    | "app"
    | "food"
    | "feed"
    | "notifications"
    | "privacy";

export const SETTINGS_SECTIONS_INDEX: Record<SettingsSection, number> = {
    app: 0,
    food: 1,
    feed: 2,
    notifications: 3,
    privacy: 4,
};

export type SettingsLayoutItem = {
  key: SettingsSection;
  title: string;
  render: () => React.ReactNode;
};




