import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/provider/ThemeProvider";
import {
  _DEFAULT_ICON_HEIGHT,
  _DEFAULT_ICON_WIDTH,
  NavigateProps,
  SectionIconProps,
  Sections,
} from "@/types/layout.types";
import { Button } from "../components/ButtonComponent";
import GomealGlassView from "@/components/GlassComponent";
import { CopyIcon } from "@/icons/Icon";

export const NAV_SIZE = 64;
const ICON_HEIGHT = _DEFAULT_ICON_HEIGHT;
const ICON_WIDTH = _DEFAULT_ICON_WIDTH;

const BAR_HORIZONTAL_MARGIN = 16;

const sectionIcons: SectionIconProps[] = [
  {
    key: "feed",
    name: "feed",
    icon: (color) => (
      <Svg height={_DEFAULT_ICON_HEIGHT - 2} width={_DEFAULT_ICON_WIDTH - 2} viewBox="0 0 12 12">
        <Path
          fill={color}
          d="M5.37 1.222a1 1 0 0 1 1.26 0l3.814 3.09A1.5 1.5 0 0 1 11 5.476V10a1 1 0 0 1-1 1H8.5a1 1 0 0 1-1-1V7.5A.5.5 0 0 0 7 7H5a.5.5 0 0 0-.5.5V10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5.477a1.5 1.5 0 0 1 .556-1.166l3.815-3.089Z"
        />
      </Svg>
    ),
  },
  {
    key: "leaderboard",
    name: "rank",
    icon: (color) => (
      <Svg height={_DEFAULT_ICON_HEIGHT - 5} width={_DEFAULT_ICON_WIDTH - 5} viewBox="0 0 2048 2048">
        <Path
          fill={color}
          d="M1111 512H937L580 0h888l-357 512zM1792 0q53 0 99 20t82 55t55 81t20 100q0 67-19 121t-57 109l-424 635q-91-114-217-179t-273-74L1663 0h129zM990 868q-146 8-272 73t-218 180L75 484q-36-54-55-108T0 256q0-53 20-99t55-82t81-55T256 0h129l605 868zm34 156q106 0 199 40t163 109t110 163t40 200q0 106-40 199t-109 163t-163 110t-200 40q-106 0-199-40t-163-109t-110-163t-40-200q0-106 40-199t109-163t163-110t200-40z"
        />
      </Svg>
    ),
  },
  {
    key: "post",
    name: "post",
    icon: (color) => (
      <Svg height={_DEFAULT_ICON_HEIGHT + 2} width={_DEFAULT_ICON_WIDTH + 2} viewBox="0 0 24 24">
        <Path
          fill={color}
          d="M17.5 12a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11Zm0 2l-.09.008a.5.5 0 0 0-.402.402L17 14.5V17h-2.502l-.09.009a.5.5 0 0 0-.402.402l-.008.09l.008.09a.5.5 0 0 0 .402.402l.09.008H17v2.503l.008.09a.5.5 0 0 0 .402.402l.09.008l.09-.008a.5.5 0 0 0 .402-.402l.008-.09V18h2.504l.09-.007a.5.5 0 0 0 .402-.402l.008-.09l-.008-.09a.5.5 0 0 0-.403-.402l-.09-.008H18v-2.5l-.008-.09a.5.5 0 0 0-.402-.403L17.5 14ZM13.925 2.504a2.25 2.25 0 0 1 1.94 1.11l.814 1.387h2.071A3.25 3.25 0 0 1 22 8.25v4.56a6.52 6.52 0 0 0-1.499-1.077L20.5 8.25a1.75 1.75 0 0 0-1.75-1.75h-2.5a.75.75 0 0 1-.647-.37l-1.032-1.757a.75.75 0 0 0-.646-.37h-3.803a.75.75 0 0 0-.574.268l-.065.09L8.39 6.142a.75.75 0 0 1-.639.358h-2.5A1.75 1.75 0 0 0 3.5 8.25v9.5c0 .966.784 1.75 1.75 1.75h6.063c.173.533.412 1.037.709 1.5H5.25A3.25 3.25 0 0 1 2 17.75v-9.5A3.25 3.25 0 0 1 5.25 5h2.08l.875-1.424a2.25 2.25 0 0 1 1.917-1.073h3.803ZM12 8a4.502 4.502 0 0 1 4.283 3.114c-.5.095-.98.247-1.433.449A2.999 2.999 0 0 0 9 12.5c0 1.43 1 2.625 2.338 2.927a6.446 6.446 0 0 0-.31 1.467A4.501 4.501 0 0 1 12 8.001Z"
        />
      </Svg>
    ),
  },
  {
    key: "settings",
    name: "setting",
    icon: (color) => (
      <Svg height={_DEFAULT_ICON_HEIGHT - 2} width={_DEFAULT_ICON_WIDTH - 2} viewBox="0 0 28 28">
        <Path
          fill={color}
          d="M16.693 2.311A12.974 12.974 0 0 0 14.013 2c-.924.01-1.823.115-2.704.311a.923.923 0 0 0-.716.8l-.209 1.877a1.707 1.707 0 0 1-2.371 1.376l-1.72-.757a.92.92 0 0 0-1.043.214a12.059 12.059 0 0 0-2.709 4.667a.924.924 0 0 0 .334 1.017l1.527 1.125a1.701 1.701 0 0 1 0 2.74l-1.527 1.128a.924.924 0 0 0-.334 1.016a12.064 12.064 0 0 0 2.707 4.672a.92.92 0 0 0 1.043.215l1.728-.759a1.694 1.694 0 0 1 1.526.086c.466.27.777.745.838 1.281l.208 1.877a.923.923 0 0 0 .702.796a11.67 11.67 0 0 0 5.413 0a.923.923 0 0 0 .702-.796l.208-1.88a1.693 1.693 0 0 1 2.366-1.37l1.727.759a.92.92 0 0 0 1.043-.215a12.065 12.065 0 0 0 2.707-4.667a.924.924 0 0 0-.334-1.017L23.6 15.37a1.701 1.701 0 0 1-.001-2.74l1.525-1.127a.924.924 0 0 0 .333-1.016a12.057 12.057 0 0 0-2.708-4.667a.92.92 0 0 0-1.043-.214l-1.72.757a1.666 1.666 0 0 1-.68.144a1.701 1.701 0 0 1-1.688-1.518l-.21-1.879a.922.922 0 0 0-.714-.799ZM14 18a4 4 0 1 1 0-8a4 4 0 0 1 0 8Z"
        />
      </Svg>
    ),
  },
  {
    key: "user",
    name: "profile",
    icon: (color) => (
      <Svg height={_DEFAULT_ICON_HEIGHT + 5} width={_DEFAULT_ICON_WIDTH + 5} viewBox="0 0 24 24">
        <Path
          fill={color}
          d="M12 12q-1.65 0-2.825-1.175T8 8q0-1.65 1.175-2.825T12 4q1.65 0 2.825 1.175T16 8q0 1.65-1.175 2.825T12 12Zm4 8v-6.4q.625.2 1.225.425t1.175.525q.75.375 1.175 1.088T20 17.2V20h-4Zm-6-3.5v-3.35q.5-.075 1-.113T12 13q.5 0 1 .038t1 .112v3.35h-4ZM4 20v-2.8q0-.85.425-1.563T5.6 14.55q.575-.3 1.175-.525T8 13.6V20H4Z"
        />
      </Svg>
    ),
  },
];

const Navigate: React.FC<NavigateProps> = ({ section, goToSection, dark }) => {

  const insets = useSafeAreaInsets();
  const { colors } = useTheme(dark ? "dark": undefined);

  const items = sectionIcons.filter((i) => i.key !== "post");
  const leftItems  = items.slice(0, 2);
  const rightItems = items.slice(2);

  const ICON_INACTIVE = colors.secondaryText;
  const ICON_ACTIVE   = colors.text;

  const renderItem = (item: SectionIconProps) => {
    const active = section === item.key;
    const iconColor = active ? ICON_ACTIVE : ICON_INACTIVE;

    return (

      <Button
        key={item.key}
        onPress={() => goToSection(item.key as Sections)}
        style={{
          height: 60,
          width: 60,
          alignItems: "center",
          justifyContent: "center",
        }}
      >

        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            height: 60,
          }}
        >
          <View
            style={{
              height: 28,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.icon?.(iconColor)}
          </View>

        </View>

      </Button>

    );

  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: BAR_HORIZONTAL_MARGIN,
        right: BAR_HORIZONTAL_MARGIN,
        bottom: insets.bottom - 5,
        zIndex: 100,
        alignItems: "center",
      }}
    >

      <View style={{ position: "absolute", top: -15, zIndex: 10 }}>
        {(() => {
          const item = sectionIcons.find((i) => i.key === "post")!;
          return (
            <Button
              onPress={() => goToSection("post")}
              style={{
                width: NAV_SIZE,
                height: NAV_SIZE,
                borderRadius: 999,
                backgroundColor: colors.accent == "transparent" ? colors.button : colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon?.("white")}
            </Button>
          );
        })()}
      </View>

      <View
        style={{
          borderRadius: 999,
          shadowColor: "black",
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 1,
        }}
      >
        <GomealGlassView
          style={{
            width: "100%",
            borderRadius: 999,
            overflow: "hidden",
            padding: 7,
          }}
          interactive
        >
          
          <View
            style={{
              width: "100%",
              borderRadius: 999,
              backgroundColor: colors.background,
              padding: 10,
            }}
          >
            
            <View
              style={{
                height: 40,
                gap: 5,
                width: "100%",
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "transparent",
                overflow: "hidden",
              }}
            >
              {/* LEFT items */}
              <View
                style={{
                  height: 40,
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                  alignItems: "center",
                  paddingRight: NAV_SIZE / 2, 
                }}
              >
                {leftItems.map(renderItem)}
              </View>

              {/* RIGHT items */}
              <View
                style={{
                  height: 40,
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                  alignItems: "center",
                  paddingLeft: NAV_SIZE / 2, 
                }}
              >
                {rightItems.map(renderItem)}
              </View>

            </View>

          </View>

        </GomealGlassView>
      </View>

    </View>
  );

};

export default React.memo(Navigate);