import React from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { NavigateProps, Sections } from "@/types/layout.types";
import NativeTabBar from "@/modules/native-tab-bar/src/NativeTabBar";
import { GradientHeader } from "@/components/GradientComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessage } from "@/stores/useMessage";

export const NAV_SIZE = 85;

const sections: Sections[] = [
  "feed",
  "inbox",
  "chefNex",
  "user",
  "leaderboard",
];

const sectionConfig: Record<
  Sections,
  {
    title: string;
    activeIcon?: string;
    inactiveIcon?: string;
  }
> = {
  feed: {
    title: "Feed",
    activeIcon: "FeedActive",
    inactiveIcon: "FeedInactive",
  },
  inbox: {
    title: "Inbox",
    activeIcon: "InboxActive",
    inactiveIcon: "InboxInactive",
  },
  chefNex: {
    title: "ChefNex",
    activeIcon: "ChefNex",
    inactiveIcon: "ChefNex",
  },
  user: {
    title: "Profile",
    activeIcon: "UserActive",
    inactiveIcon: "UserInactive",
  },
  leaderboard: {
    title: "Rank",
    activeIcon: "LeaderboardActive",
    inactiveIcon: "LeaderboardInactive",
  },
};

const Navigate: React.FC<NavigateProps> = ({
  section,
  goToSection,
  dark,
}) => {

  const insets = useSafeAreaInsets();
  const { colors } = useTheme(dark ? "dark" : undefined);

  const unreadCount = useMessage((s) => 
    s.inbox.filter((item) => item.unread_count > 0).length
  )

  const selectedIndex = sections.indexOf(section);

  const items = sections.map((key) => {
      const config = sectionConfig[key];

      return {
          title: config.title,
          activeIcon: config.activeIcon ?? "",
          inactiveIcon: config.inactiveIcon ?? "",
          badgeCount: key === "inbox"
              ? String(unreadCount)
              : "0",
      };
  });

  return (
    <GradientHeader
      height={140}
      baseColor={colors.background}
      direction="bottom"
      contentStyle={{
        paddingHorizontal: 20,
        alignItems: "flex-end",
      }}
    >
      <NativeTabBar
        style={{
          width: "100%",
          height: NAV_SIZE,
        }}
        activeColor={colors.accent == "transparent" ? colors.button : colors.accent}
        items={items}
        selectedIndex={selectedIndex}
        onTabPress={(index) => {
          const nextSection = sections[index];

          if (nextSection) {
            goToSection(nextSection);
          }
        }}
        badgeColor={colors.danger}
        badgeTextColor={colors.text}
        badgeBorderColor={colors.danger}
      />
    </GradientHeader>
  );
};

export default React.memo(Navigate);