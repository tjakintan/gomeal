import { useEffect, useMemo, useRef } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import UserSettings from "./UserSettings";
import AppSettings from "./AppSettings";
import FeedSettings from "./FeedSettings";
import FoodSettings from "./FoodSettings";
import NotificationSettings from "./NotificationSettings";
import HelpSettings from "./HelpSettings";

import { Button } from "@/components/ButtonComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { GradientHeader } from "@/components/GradientComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { AppIcon, BackIcon, FeedIcon, FoodIcon, NotificationIcon, QuestionIcon, SettingsIcon } from "@/icons/Icon";
import { SettingsLayoutItem } from "@/types/layout.types";
import { _DEFAULT_ICON_HEIGHT, _DEFAULT_ICON_WIDTH } from "@/types/index";

const MENU_HEIGHT = 85;

type SettingsSection = SettingsLayoutItem & { description: string };

/* ---------- icons (constants are read at render, not module load) ---------- */


/* ---------- sections, built at render time ---------- */
const useSettingsSections = (): SettingsSection[] =>
  useMemo(
    () => [
      {
        key: "app",
        title: "App Settings",
        description: "Appearance and how the app behaves",
        render: () => <AppSettings />,
        icon: (color: string) => <AppIcon color={color} />,
      },
      {
        key: "food",
        title: "Food Preferences",
        description: "Dietary needs and what you like to cook",
        render: () => <FoodSettings />,
        icon: (color: string) => <FoodIcon color={color} />,
      },
      {
        key: "feed",
        title: "Feed Controls",
        description: "Choose what shows up in your feed",
        render: () => <FeedSettings />,
        icon: (color: string) => <FeedIcon color={color} />,
      },
      {
        key: "notifications",
        title: "Notifications",
        description: "Pick which alerts you get",
        render: () => <NotificationSettings />,
        icon: (color: string) => <NotificationIcon color={color} />,
      },
      {
        key: "help",
        title: "Help & Support",
        description: "Contact the team and get answers",
        render: () => <HelpSettings />,
        icon: (color: string) => <QuestionIcon color={color} />,
      },
    ],
    []
  );

/* ---------- screen pushed into the sliding overlay ---------- */
const SettingsSectionScreen: React.FC<{
  section: SettingsSection;
  onBack: () => void;
}> = ({ section, onBack }) => {
  const insets = useSafeAreaInsets();
  const { colors, textStyles } = useTheme();

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background }}>
      <GradientHeader
        height={MENU_HEIGHT}
        baseColor={colors.background}
        style={{ marginTop: insets.top }}
        contentStyle={{
          height: MENU_HEIGHT,
          paddingHorizontal: 20,
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <Button onPress={onBack} clearBackground>
          <BackIcon color={colors.text} />
        </Button>

        <SectionHeader
          title={section.title}
          showBackground
          titleClassName={textStyles.h3}
          leftIcon={section.icon?.(colors.button)}
        />
      </GradientHeader>

      <View style={{ flex: 1, marginTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingTop: MENU_HEIGHT,
            paddingBottom: insets.bottom,
          }}
        >
          {section.render()}
        </ScrollView>
      </View>
    </View>
  );
};

/* ---------- main screen ---------- */
const Settings: React.FC<{ onClose?: () => void; isFocused?: boolean }> = ({
  onClose,
  isFocused,
}) => {
  const { colors, textStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const sections = useSettingsSections();

  const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
  const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

  // id of the overlay this screen opened, so we only ever close our own
  const overlayIdRef = useRef<string | null>(null);

  const openSection = (section: SettingsSection) => {
    overlayIdRef.current = openSlidingOverlay(
      <SettingsSectionScreen section={section} onBack={() => closeSlidingOverlay()} />
    );
  };

  // close our overlay if the tab loses focus
  useEffect(() => {
    if (isFocused) return;

    const id = overlayIdRef.current;
    if (!id) return;

    const top = useSlidingOverlay.getState().stack.at(-1);
    if (top?.id === id) closeSlidingOverlay();

    overlayIdRef.current = null;
  }, [isFocused, closeSlidingOverlay]);

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background }}>
      <GradientHeader
        height={MENU_HEIGHT}
        baseColor={colors.background}
        style={{ marginTop: insets.top }}
        contentStyle={{
          height: MENU_HEIGHT,
          paddingHorizontal: 20,
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        <Button onPress={() => onClose?.()} clearBackground>
          <BackIcon color={colors.text} />
        </Button>

        <SectionHeader
          title="Settings"
          showBackground
          titleClassName={textStyles.h3}
          leftIcon={<SettingsIcon color={colors.button} size={30} />}
          showDivider
          subtitle="Manage your preferences and settings"
        />
      </GradientHeader>

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            gap: 10,
            padding: 10,
            paddingTop: MENU_HEIGHT,
            paddingBottom: insets.bottom,
          }}
        >
          {sections.map((section) => (
            <Button
              key={section.key}
              onPress={() => openSection(section)}
              style={{
                width: "100%",
                minHeight: 95,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 12,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className={textStyles.section} style={{ color: colors.text }}>
                    {section.title}
                  </Text>
                  <Text
                    className={textStyles.small}
                    numberOfLines={1}
                    style={{ color: colors.secondaryText }}
                  >
                    {section.description}
                  </Text>
                </View>
                <View style={{ flexShrink: 0 }}>{section.icon?.(colors.text)}</View>
              </View>
            </Button>
          ))}
          <UserSettings />
        </ScrollView>
      </View>
    </View>
  );
};

export default Settings;