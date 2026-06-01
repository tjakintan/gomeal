import { ReactNode } from "react";
import { GlassEffectStyleConfig } from 'expo-glass-effect';
import { GlassStyle } from 'expo-glass-effect';
import { ImageSourcePropType, StyleProp, ViewStyle, ImageStyle } from "react-native";

export const _DEFAULT_ICON_WIDTH = 25
export const _DEFAULT_ICON_HEIGHT = 25
export const _DEFAULT_TAG_RADIUS = 20

export const buttonCornerRadius = 10

export type ThemePalette = {
    background: string;
    card: string;
    secondaryCard: string;
    text: string;
    secondaryText: string;
    accent: string;
    button: string;
    buttonSecondary: string;
    danger: string; 
}

//.Don't change order
export const SECTION_INDEX = {
    user: 0,
    feed: 1,
    post: 2,
    leaderboard: 3,
    settings: 4,
} as const;

export const INDEX_SECTION: Record<SectionIndex, Sections> = {
    0: "user",
    1: "feed",
    2: "post",
    3: "leaderboard",
    4: "settings",
};

export function getPrevSectionIndex(i: SectionIndex): SectionIndex {
    if (i <= 0) return 0;
    return (i - 1) as SectionIndex;
}

export type Sections = keyof typeof SECTION_INDEX;
export type SectionIndex = typeof SECTION_INDEX[Sections];

export type SectionIconProps = {
    key: Sections;
    name: string;
    icon?: (color?: string) => React.ReactNode; 
    img_url?: ImageSourcePropType; 
    imageStyle?: StyleProp<ImageStyle>;
};

export type NavigateProps = {
    section: Sections;
    dark: boolean;
    goToSection: (s: Sections) => void;
};

export type NavigateSectionProps = {
    goToSection: (s: Sections) => void | Promise<void>;
    goPrevSection: () => void | Promise<void>;
    expandsUp?: boolean;
    activeSection: Sections
}



export type SettingsSection =
    | "app"
    | "food"
    | "feed"
    | "notifications"
    | "privacy"
    | "help";

export const SETTINGS_SECTIONS_INDEX: Record<SettingsSection, number> = {
    app: 0,
    food: 1,
    feed: 2,
    notifications: 3,
    privacy: 4,
    help: 5
};

export type SettingsLayoutItem = {
  key: SettingsSection;
  icon?: (color: string) => React.ReactNode;
  title: string;
  render: () => React.ReactNode;
};

export type GomealGlassViewProps = {
    style?: StyleProp<ViewStyle>;
    children: ReactNode;
    glassEffectStyle?: GlassStyle | GlassEffectStyleConfig | undefined
};

export type PostSectionProps = {
  value: any[];
  onChange: (data: any[]) => void;
};

