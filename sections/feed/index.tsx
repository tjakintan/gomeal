import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Dimensions,
  Animated,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import Feed from "./feed";
import { useFeed } from "@/stores/useFeed";

type SectionType = "reel" | "profile" | "cook" | "search";

const FeedScreen: React.FC<{isFocused?: boolean; setASectionOpen?: (section: SectionType, open: boolean) => void; onChromeHidden?: (hidden: boolean) => void; chromeAnim: Animated.Value;}> = ({ isFocused, setASectionOpen, onChromeHidden, chromeAnim }) => {

  const { colors } = useTheme();
  const{ clearActiveProfile } = useFeed();

  const [showSearchSection, setShowSearchSection] = useState(false);
  const slideX = useRef(new Animated.Value(Dimensions.get("window").width)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: showSearchSection ? 0 : Dimensions.get("window").width,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showSearchSection]);

  const closeProfileSheet = () => {
    clearActiveProfile();
    setASectionOpen?.("profile", false);
  };

  useEffect(() => {
    if (!isFocused) {
      closeProfileSheet()
    }
  }, [isFocused]);

  return (
    <View
      style={{ flex: 1, width: "100%", flexDirection: "column", backgroundColor: colors.background }}
    >

      <Feed 
        isFocused={isFocused} 
        isSearchOpen={showSearchSection}
        onChromeHidden={onChromeHidden}
        chromeAnim={chromeAnim}
        setReelOpen={(open) => {
          setASectionOpen?.("reel", open);
        }} 
      />

    </View>
  );
};

export default FeedScreen;
