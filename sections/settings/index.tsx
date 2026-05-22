import { useRef, useMemo } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { useSettingsStore } from "@/stores/useSettings";
import UserSettings from "./UserSettings";
import { SettingsLayoutItem } from "@/types/layout.types";
import AppSettings from "./AppSettings";
import FeedSettings from "./FeedSettings";
import { useTheme } from "@/provider/ThemeProvider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ButtonComponent";
import Entypo from '@expo/vector-icons/Entypo';
import { SectionHeader } from "@/components/SectionComponent";
import Svg, { Path } from "react-native-svg";
import { _DEFAULT_ICON_HEIGHT, _DEFAULT_ICON_WIDTH } from "@/types/index";
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { FoodPreferences } from '@/types/index';
import FoodSettings from './FoodSettings';
import NotificationSettings from './NotificationSettings';

const iconHeight = _DEFAULT_ICON_HEIGHT
const iconWidth = _DEFAULT_ICON_WIDTH

const sections: SettingsLayoutItem[] = [
  {
    key: "app",
    title: "App Settings",
    render: () => (
      <AppSettings />
    ),
    icon: (color) => (
      <Svg 
        height={iconHeight} width={iconWidth}
        viewBox="0 0 24 24"
      >
        <Path fill={color} d="M17 18H7V6h10v1h2V3c0-1.1-.9-2-2-2L7 1.01C5.9 1.01 5 1.9 5 3v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4h-2v1zm4-6c0-.13-.02-.26-.04-.39l.64-.48c.2-.15.26-.44.13-.66l-.57-.96a.495.495 0 0 0-.62-.2l-.72.3c-.2-.15-.42-.29-.65-.39l-.1-.77a.505.505 0 0 0-.49-.44l-1.12-.02c-.26 0-.47.18-.5.44l-.1.79c-.24.1-.45.23-.65.39l-.72-.3c-.23-.1-.5-.01-.62.2l-.57.96c-.13.22-.08.5.13.66l.64.48c-.05.13-.07.26-.07.39s.02.25.04.37l-.64.49c-.2.15-.26.43-.13.65l.56.97c.13.22.39.31.63.21l.73-.31c.2.16.42.3.67.4l.1.77c.03.25.24.44.5.44h1.12c.25 0 .46-.19.5-.44l.1-.77c.24-.1.46-.24.67-.4l.73.31c.23.1.5.01.63-.21l.56-.97c.13-.22.07-.5-.13-.65l-.64-.49c-.02-.12 0-.24 0-.37zm-3 1.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
      </Svg>
    )
  },
  
  {
    key: "food",
    title: "Food Preferences",
    render: () => (
      <FoodSettings />
    ),
    icon: (color) => (
      <Svg 
        height={iconHeight} width={iconWidth}
        viewBox="0 0 24 24"
      >
        <Path fill={color} d="M22 18a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4v-2h6.79l2.76-4.77l1.56.9L19.87 16H22v2M9 22H2c0-3 0-6 .33-9.17C2.6 10.3 3.08 7.66 3.6 5H3V3h5v2h-.6c.52 2.66 1 5.3 1.27 7.83C9 16 9 19 9 22Z"/>
      </Svg>
    )
  },
  {
    key: "feed",
    title: "Feed Controls",
    render: () => (
      <FeedSettings />
    ),
    icon: (color) => (
      <Svg 
        height={iconHeight} width={iconWidth}
        viewBox="0 0 24 24"
      >
        <Path fill="none" stroke={color} stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7.5 11.5v3M6 13h3m3-4.653c2.005 0 3.7-1.888 5.786-1.212c2.264.733 3.82 3.413 3.708 9.492c-.022 1.224-.336 2.578-1.546 3.106c-2.797 1.221-4.397-2.328-7-2.328h-1.897c-2.605 0-4.213 3.545-6.998 2.328c-1.21-.528-1.525-1.882-1.547-3.107c-.113-6.078 1.444-8.758 3.708-9.491C8.299 6.459 9.994 8.347 12 8.347Zm0-4.565v4.342M14.874 13h3"/>
      </Svg>
    )
  },
  {
    key: "notifications",
    title: "Notifications",
    render: () => (
      <NotificationSettings />
    ),
    icon: (color) => (
      <Svg 
        height={iconHeight} width={iconWidth}
        viewBox="0 0 20 20"
      >
        <Path fill={color} d="M4 8a6 6 0 0 1 4.03-5.67a2 2 0 1 1 3.95 0A6 6 0 0 1 16 8v6l3 2v1H1v-1l3-2V8zm8 10a2 2 0 1 1-4 0h4z"/>
      </Svg>
    )
  },
];

const Settings: React.FC<{isFocused: boolean}> = ({ isFocused }) => {

  const { colors, textStyles } = useTheme();
  const [openSectionSettings, setOpenSectionSettings] = useState<string | null>(null);

  const userSectionRef = useRef<BottomSheet>(null);
  const settings = useSettingsStore((state) => state.settings);

  const handleToggle = (key: string) => {
    setOpenSectionSettings((prev) => (prev === key ? null : key));
    userSectionRef.current?.snapToIndex(0);
  };

  // reset
  useEffect(() => {
    if (!isFocused){
      setOpenSectionSettings(null);
    } 
  }, [isFocused]);

  return (

    <View style={StyleSheet.absoluteFillObject}>

      <SectionHeader 
        showDivider
        subtitle="Manage your preferences and settings"
      />

      <View style={{flex: 1}} className="w-full flex-row items-center justify-center p-1">
        <ScrollView contentContainerStyle={{flexGrow: 1, gap: 10, paddingBottom: 20}} showsVerticalScrollIndicator={false}>
          {sections.map((section) => {
            const isOpen = openSectionSettings === section.key;
            return (
              <TouchableOpacity key={section.key} activeOpacity={1}>
                <View className="p-3 gap-3">
                  <Button onPress={() => handleToggle(section.key)} className="flex-row px-10  justify-between items-center">

                    <View className="flex-row items-center gap-3">

                      {section.icon && (
                        <View className="w-9 h-9 rounded-xl items-center justify-center">
                          {section.icon(colors.text)}
                        </View>
                      )}

                      <Text style={{ color: colors.text }} className={textStyles.h3}>
                        {section.title}
                      </Text>

                    </View>

                    <Entypo
                      name={isOpen ? "chevron-thin-up" : "chevron-thin-down"}
                      size={20}
                      color={colors.text}
                    />

                  </Button>

                  {isOpen && (
                    <View>
                      {section.render()}
                    </View>
                  )}

                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <BottomSheet
        ref={userSectionRef}
        index={0} 
        snapPoints={["6%", 250]}
        enablePanDownToClose={false}
        backgroundStyle={{
          backgroundColor: colors.background, 
          borderRadius: 25,
          shadowColor: colors.text,
          shadowOpacity: 0.10,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: -4 },
          elevation: 5,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.secondaryCard, width: 45, height: 7 }}       
      >
        <BottomSheetView style={{ padding: 5, margin: 10, borderRadius: 25, backgroundColor: colors.button}}>
          <UserSettings />
        </BottomSheetView>
      </BottomSheet>

    </View>

  );
};


export default Settings;
