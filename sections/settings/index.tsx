import { View, Text, ScrollView, Pressable } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import { SettingsLayoutItem } from "@/types/index";
import AppSettings from "./AppSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { useState } from "react";
import { Gesture } from "@/utils/utils";

const sections: SettingsLayoutItem[] = [
  {
    key: "app",
    title: "App Settings",
    render: () => (
      <AppSettings />
    ),
  },
  {
    key: "food",
    title: "Food Preferences",
    render: () => (
      <View className="flex-1 bg-green-300">
        <Text>Food Controls Here</Text>
      </View>
    ),
  },
  {
    key: "feed",
    title: "Feed Controls",
    render: () => (
      <View>
        <Text>Feed Controls Here</Text>
      </View>
    ),
  },
  {
    key: "notifications",
    title: "Notifications",
    render: () => (
      <View>
        <Text>Notification Controls Here</Text>
      </View>
    ),
  },
];

const Settings: React.FC = () => {

  const { colors, textStyles } = useTheme();
  const [openSectionSettings, setOpenSectionSettings] =
    useState<string | null>(null);

  const settings = useSettingsStore((state) => state.settings);
  const handleToggle = (key: string) => {
    setOpenSectionSettings((prev) => (prev === key ? null : key));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1}}
        contentContainerStyle={{
          padding: 16,
          flexGrow: 1,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const isOpen = openSectionSettings === section.key;

          return (
            <View
              key={section.key}
              className="rounded-[30px] px-5 py-2 overflow-hidden"
              style={{backgroundColor: isOpen ? "transparent" : colors.card}}
            >

              <View className="flex-row justify-between items-center">

                <Text style={{ color: colors.text }} className={textStyles.h3}>
                  {section.title}
                </Text>

                <Gesture>
                  <Pressable
                    onPress={() => handleToggle(section.key)}
                    className="bg-blue-500 rounded-full p-5"
                  >
                    <Text className="text-xs">
                      {isOpen ? "Close" : "Open"}
                    </Text>
                  </Pressable>
                </Gesture>

              </View>

              {isOpen && (
                <View className="mt-2">
                  {section.render()}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};


export default Settings;
