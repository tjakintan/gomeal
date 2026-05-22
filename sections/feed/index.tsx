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
import { CookMainScreen } from "../cook";
import { SearchMainScreen } from "./search";
import { useCook } from "@/stores/useCook";
import { useSearch } from "@/stores/useSearch";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SectionType = "reel" | "profile" | "cook" | "search";


const FeedScreen: React.FC<{isFocused?: boolean; setASectionOpen?: (section: SectionType, open: boolean) => void;}> = ({ isFocused, setASectionOpen }) => {

  const { colors } = useTheme();
  const{ selectedPost, clearActiveProfile } = useFeed();
  
  const { isOpen, openCook } = useCook();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const slideX = useRef(new Animated.Value(Dimensions.get("window").width)).current;
  const [showSearchSection, setShowSearchSection] = useState(false);
  const isOverlayOpen = isOpen !== null || showSearchSection;

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

  return (
    <View
      style={{ backgroundColor: colors.background }}
      className="flex-1 w-full flex-col"
    >

      <Feed 
        isFocused={isFocused} 
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
        snapPoints={[535]}
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
            borderRadius: FEED_CARD_PROFILE_RADIUS + 10,
        }}
        handleComponent={() => null}
      >
        <GomealGlassView glassEffectStyle="clear" style={{ height: 520, marginHorizontal: 5, borderRadius: FEED_CARD_PROFILE_RADIUS + 10}}>

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
              height: 500,
              marginTop: 10,
              marginHorizontal: 10,
              overflow: "hidden",
              alignSelf: "center",
              backgroundColor: colors.background,
              borderRadius: FEED_CARD_PROFILE_RADIUS
            }}
          >
            <FeedProfile 
              onClose={closeProfileSheet}
            />
          </BottomSheetView>

        </GomealGlassView>
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
