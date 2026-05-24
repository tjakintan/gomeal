import React from "react";
import { Text, View } from "react-native";
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

const ICON_HEIGHT = _DEFAULT_ICON_HEIGHT;
const ICON_WIDTH = _DEFAULT_ICON_WIDTH;

const BAR_HORIZONTAL_MARGIN = 16;

const sectionIcons: SectionIconProps[] = [
  {
    key: "user",
    name: "profile",
    icon: (color) => (
      <Svg height={ICON_HEIGHT + 8} width={ICON_WIDTH + 8} viewBox="0 0 24 24">
        <Path
          fill={color}
          d="M12 12q-1.65 0-2.825-1.175T8 8q0-1.65 1.175-2.825T12 4q1.65 0 2.825 1.175T16 8q0 1.65-1.175 2.825T12 12Zm4 8v-6.4q.625.2 1.225.425t1.175.525q.75.375 1.175 1.088T20 17.2V20h-4Zm-6-3.5v-3.35q.5-.075 1-.113T12 13q.5 0 1 .038t1 .112v3.35h-4ZM4 20v-2.8q0-.85.425-1.563T5.6 14.55q.575-.3 1.175-.525T8 13.6V20H4Z"
        />
      </Svg>
    ),
  },
  {
    key: "feed",
    name: "feed",
    icon: (color) => (
      <Svg height={ICON_HEIGHT} width={ICON_WIDTH} viewBox="0 0 24 24">
        <Path
          fill={color}
          d="M18.178 11.373a.7.7 0 0 1 .7.7v5.874c.027.812-.071 1.345-.434 1.68c-.338.311-.828.4-1.463.366H3.144C2.5 19.961 2 19.7 1.768 19.173c-.154-.347-.226-.757-.226-1.228v-5.873a.7.7 0 0 1 1.4 0v5.873c0 .232.026.42.07.562l.036.098l-.003-.01c.001-.013.03-.008.132-.002h13.84c.245.014.401 0 .456-.001l.004-.001c-.013-.053.012-.27 0-.622v-5.897a.7.7 0 0 1 .701-.7ZM10.434 0c.264 0 .5.104.722.297l8.625 8.139a.7.7 0 1 1-.962 1.017l-8.417-7.944l-9.244 7.965a.7.7 0 0 1-.915-1.06L9.689.277l.086-.064c.214-.134.428-.212.66-.212Z"
        />
      </Svg>
    ),
  },
  {
    key: "post",
    name: "post",
    icon: (color) => (
      <Svg height={ICON_HEIGHT + 2} width={ICON_WIDTH + 2} viewBox="0 0 24 24">
        <Path
          fill={color}
          d="M17.5 12a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11Zm0 2l-.09.008a.5.5 0 0 0-.402.402L17 14.5V17h-2.502l-.09.009a.5.5 0 0 0-.402.402l-.008.09l.008.09a.5.5 0 0 0 .402.402l.09.008H17v2.503l.008.09a.5.5 0 0 0 .402.402l.09.008l.09-.008a.5.5 0 0 0 .402-.402l.008-.09V18h2.504l.09-.007a.5.5 0 0 0 .402-.402l.008-.09l-.008-.09a.5.5 0 0 0-.403-.402l-.09-.008H18v-2.5l-.008-.09a.5.5 0 0 0-.402-.403L17.5 14ZM13.925 2.504a2.25 2.25 0 0 1 1.94 1.11l.814 1.387h2.071A3.25 3.25 0 0 1 22 8.25v4.56a6.52 6.52 0 0 0-1.499-1.077L20.5 8.25a1.75 1.75 0 0 0-1.75-1.75h-2.5a.75.75 0 0 1-.647-.37l-1.032-1.757a.75.75 0 0 0-.646-.37h-3.803a.75.75 0 0 0-.574.268l-.065.09L8.39 6.142a.75.75 0 0 1-.639.358h-2.5A1.75 1.75 0 0 0 3.5 8.25v9.5c0 .966.784 1.75 1.75 1.75h6.063c.173.533.412 1.037.709 1.5H5.25A3.25 3.25 0 0 1 2 17.75v-9.5A3.25 3.25 0 0 1 5.25 5h2.08l.875-1.424a2.25 2.25 0 0 1 1.917-1.073h3.803ZM12 8a4.502 4.502 0 0 1 4.283 3.114c-.5.095-.98.247-1.433.449A2.999 2.999 0 0 0 9 12.5c0 1.43 1 2.625 2.338 2.927a6.446 6.446 0 0 0-.31 1.467A4.501 4.501 0 0 1 12 8.001Z"
        />
      </Svg>
    ),
  },
  {
    key: "leaderboard",
    name: "rank",
    icon: (color) => (
      <Svg height={ICON_HEIGHT - 5} width={ICON_WIDTH - 5} viewBox="0 0 2048 2048">
        <Path
          fill={color}
          d="M1111 512H937L580 0h888l-357 512zM1792 0q53 0 99 20t82 55t55 81t20 100q0 67-19 121t-57 109l-424 635q-91-114-217-179t-273-74L1663 0h129zM990 868q-146 8-272 73t-218 180L75 484q-36-54-55-108T0 256q0-53 20-99t55-82t81-55T256 0h129l605 868zm34 156q106 0 199 40t163 109t110 163t40 200q0 106-40 199t-109 163t-163 110t-200 40q-106 0-199-40t-163-109t-110-163t-40-200q0-106 40-199t109-163t163-110t200-40z"
        />
      </Svg>
    ),
  },
  {
    key: "settings",
    name: "setting",
    icon: (color) => (
      <Svg height={ICON_HEIGHT} width={ICON_WIDTH} viewBox="0 0 32 32">
        <Path
          fill={color}
          d="M27 16.76v-1.53l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4a2 2 0 0 0-1.73-1a2 2 0 0 0-.64.1l-2.43.82a11.35 11.35 0 0 0-1.31-.75l-.51-2.52a2 2 0 0 0-2-1.61h-4.68a2 2 0 0 0-2 1.61l-.51 2.52a11.48 11.48 0 0 0-1.32.75l-2.38-.86A2 2 0 0 0 6.79 6a2 2 0 0 0-1.73 1L2.7 11a2 2 0 0 0 .41 2.51L5 15.24v1.53l-1.89 1.68A2 2 0 0 0 2.7 21l2.36 4a2 2 0 0 0 1.73 1a2 2 0 0 0 .64-.1l2.43-.82a11.35 11.35 0 0 0 1.31.75l.51 2.52a2 2 0 0 0 2 1.61h4.72a2 2 0 0 0 2-1.61l.51-2.52a11.48 11.48 0 0 0 1.32-.75l2.42.82a2 2 0 0 0 .64.1a2 2 0 0 0 1.73-1l2.28-4a2 2 0 0 0-.41-2.51ZM25.21 24l-3.43-1.16a8.86 8.86 0 0 1-2.71 1.57L18.36 28h-4.72l-.71-3.55a9.36 9.36 0 0 1-2.7-1.57L6.79 24l-2.36-4l2.72-2.4a8.9 8.9 0 0 1 0-3.13L4.43 12l2.36-4l3.43 1.16a8.86 8.86 0 0 1 2.71-1.57L13.64 4h4.72l.71 3.55a9.36 9.36 0 0 1 2.7 1.57L25.21 8l2.36 4l-2.72 2.4a8.9 8.9 0 0 1 0 3.13L27.57 20Z"
        />
        <Path
          fill={color}
          d="M16 22a6 6 0 1 1 6-6a5.94 5.94 0 0 1-6 6Zm0-10a3.91 3.91 0 0 0-4 4a3.91 3.91 0 0 0 4 4a3.91 3.91 0 0 0 4-4a3.91 3.91 0 0 0-4-4Z"
        />
      </Svg>
    ),
  },
];

// Only the FAB keeps its color; all nav icons use a single neutral token
const ICON_INACTIVE = "rgba(120, 120, 128, 0.6)";
const ICON_ACTIVE   = "rgba(255, 255, 255, 0.9)";

const FAB_SIZE = 64;

const Navigate: React.FC<NavigateProps> = ({ section, goToSection }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const items = sectionIcons.filter((i) => i.key !== "post");
  const leftItems  = items.slice(0, 2);
  const rightItems = items.slice(2);

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

          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              marginTop: 2,
              color: iconColor,
            }}
          >
            {item.name}
          </Text>
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
        bottom: insets.bottom,
        zIndex: 100,
        alignItems: "center",
      }}
    >
      {/* ===== FAB — keeps brand color ===== */}
      <View style={{ position: "absolute", top: -15, zIndex: 10 }}>
        {(() => {
          const item = sectionIcons.find((i) => i.key === "post")!;
          return (
            <Button
              onPress={() => goToSection("post")}
              style={{
                width: FAB_SIZE,
                height: FAB_SIZE,
                borderRadius: 999,
                backgroundColor: colors.button, // ← only colored element
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon?.("#fff")}
            </Button>
          );
        })()}
      </View>

      {/* ===== Glass pill bar ===== */}
      <GomealGlassView
        glassEffectStyle="clear"
        style={{
          height: 76,
          width: "100%",
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          overflow: "hidden",
        }}
      >
        {/* LEFT items */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-evenly",
            paddingRight: FAB_SIZE / 2 + 14,
          }}
        >
          {leftItems.map(renderItem)}
        </View>

        {/* RIGHT items */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-evenly",
            paddingLeft: FAB_SIZE / 2 + 14,
          }}
        >
          {rightItems.map(renderItem)}
        </View>
      </GomealGlassView>
    </View>
  );
};

export default Navigate;