import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  Animated,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { useReel } from "@/stores/useReel";
import Feed from "./feed";
import FeedProfile, { FEED_CARD_PROFILE_RADIUS } from "./feedProfile";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useFeed } from "@/stores/useFeed";
import GomealGlassView from "@/components/GlassComponent";
import { SearchMainScreen } from "./search";
import { useCook } from "@/stores/useCook";
import { useSearch } from "@/stores/useSearch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeedBar from "./feedBar";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";
import { BOTTOM_HEIGHT, BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { NAV_SIZE } from "../Navigate";

type SectionType = "reel" | "profile" | "cook" | "search";

const FeedScreen: React.FC<{isFocused?: boolean; setASectionOpen?: (section: SectionType, open: boolean) => void;onChromeHidden?: (hidden: boolean) => void;chromeAnim: Animated.Value;}> = ({ isFocused, setASectionOpen, onChromeHidden, chromeAnim }) => {

  const { colors } = useTheme();
  const{ selectedPost, clearActiveProfile } = useFeed();
  
  const { isOpen, openCook } = useCook();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const slideX = useRef(new Animated.Value(Dimensions.get("window").width)).current;

  const [showSearchSection, setShowSearchSection] = useState(false);

  const isOverlayOpen = isOpen !== null || showSearchSection;

  const insets = useSafeAreaInsets();
  const height = Dimensions.get("window").height;

  const closeProfileSheet = () => {
      bottomSheetRef.current?.close();
      clearActiveProfile();
      setASectionOpen?.("profile", false);
  };

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: isOverlayOpen ? 0 : Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOverlayOpen]);

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
        setShowProfile={(open) => {
          setASectionOpen?.("profile", open);
          if (open) {
            bottomSheetRef.current?.expand();
          } else {
            bottomSheetRef.current?.close();
            clearActiveProfile(); 
          }
        }} 
        setShowCook={(post_id) => {
          openCook(post_id);
        }}
        setShowSearch={(open) => {
          setASectionOpen?.("search", open);
          setShowSearchSection(open);
        }}
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={BOTTOM_SNAP_POINTS}
        detached={false}
        onClose={() => {
            setASectionOpen?.("profile", false);
        }}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={false}
        enableDynamicSizing={false}
        backgroundStyle={{
            backgroundColor: "transparent",
        }}
        handleComponent={() => null}
      >
        <View  
          style={{ 
            flex: 1,
            borderTopLeftRadius: FEED_CARD_PROFILE_RADIUS + 10,
            borderTopRightRadius: FEED_CARD_PROFILE_RADIUS + 10,
          }}
        >

          <View
            style={{
              ...StyleSheet.absoluteFillObject, 
              opacity: 0.85,
              backgroundColor: colors.secondaryCard,
              borderRadius: FEED_CARD_PROFILE_RADIUS + 10,
            }}
          />

          <BottomSheetView
            style={{
              height: (chromeAnim as any).__getValue() >= 1 ? BOTTOM_HEIGHT - NAV_SIZE : 450,
              marginTop: 10,
              marginHorizontal: 10,
              overflow: "hidden",
              alignSelf: "center",
              backgroundColor: colors.background,
              borderWidth: 2,
              borderColor: colors.secondaryCard,
              borderRadius: FEED_CARD_PROFILE_RADIUS
            }}
          >
            <FeedProfile 
              onClose={closeProfileSheet}
            />
          </BottomSheetView>

        </View>
      </BottomSheet>

      {showSearchSection && (
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: slideX }] },
          ]}
        >
          <SearchMainScreen 
            onClose={() => {
              setASectionOpen?.("search", false);
              setShowSearchSection(false);
            }} 
          />
        </Animated.View>
      )}

    </View>
  );
};

export default FeedScreen;
