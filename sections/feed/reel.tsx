import { Pressable, StyleSheet, Text, View, FlatList, RefreshControl, useWindowDimensions, Animated, TouchableOpacity, ScrollView } from "react-native";
import { BackIcon, InfoIcon, MoreIcon, ReportIcon } from "@/icons/Icon";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import ReelTag, { DASHBOARD_HEIGHT, EmptyReelTag, REEL_TAG_HEIGHT } from "@/tags/ReelTag";
import { useFeed } from "@/stores/useFeed";
import { useEffect, useRef, useState } from "react";
import { useReel } from "@/stores/useReel";
import { ReelFeedCard } from "@/types/feed.types";
import FeedShare from "./share";
import GomealGlassView from "@/components/GlassComponent";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import FeedProfile, { FEED_CARD_PROFILE_RADIUS } from "./feedProfile";
import { useReport } from "@/stores/useReport";
import { SpinningLogoImage } from "@/utils/Logo";
import { useCook } from "@/stores/useCook";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOTTOM_HEIGHT, BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { NAV_SIZE } from "../Navigate";
import { useOverlay } from "@/stores/useOverlay";
import { capitalize } from "@/utils/text";
import { NutritionRender, DietaryRender, DifficultyRender } from "@/utils/food";
import ReanimatedAnimated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { GradientHeader } from "@/components/GradientComponent";

const reelSkeletons = Array.from({ length: 3 });

const Reel: React.FC<{initialPost: ReelFeedCard; onBack: (data?: string) => void; chromeAnim?: Animated.Value;}> = ({ onBack, initialPost, chromeAnim }) => {

    const { colors, textStyles } = useTheme("dark");
    const { openCook } = useCook();
    const { openOverlay } = useOverlay();
    const { reportTarget, loadingReport } = useReport();
    
    const { loadReel, loadNextReel, hasMoreReels, loadingMoreReels, removePost, setActiveProfile, clearActiveProfile } = useFeed();
    const { reels, setReels, init, nextReel, prevReel, loading } = useReel();

    const [activeIndex, setActiveIndex] = useState(0);
    const list = reels.length ? reels : [initialPost];
    const activePost = list[activeIndex] ?? initialPost;

    const [refreshing, setRefreshing] = useState(false);
    const [showMenuRow, setShowMenuRow] = useState(false);
    const [sharePostId, setSharePostId] = useState<number | null>(null);

    const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
    const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
    const [isChromeHidden, setIsChromeHidden] = useState(false);

    const profileSheetRef = useRef<BottomSheet>(null);
    const shareSheetRef = useRef<BottomSheet>(null);

    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const tagHeight = isChromeHidden ? windowHeight : REEL_TAG_HEIGHT;

    const handleOpenShare = (post_id: number) => {
        setSharePostId(post_id);
    };

    const profileSheetAnimatedIndex = useSharedValue(-1);
    const shareSheetAnimatedIndex = useSharedValue(-1);

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const maxIndex = Math.max(profileSheetAnimatedIndex.value, shareSheetAnimatedIndex.value);

        return {
            opacity: interpolate(maxIndex, [-1, 0], [1, 0], Extrapolation.CLAMP),
            transform: [
                {
                    translateY: interpolate(maxIndex, [-1, 0], [0, -20], Extrapolation.CLAMP),
                },
            ],
        };
    });

    const closeProfileSheet = () => {
        profileSheetRef.current?.close();
        setIsProfileSheetOpen(false);
        clearActiveProfile();
    };

    const handleReport = async () => {
        if (!activePost?.post_id || loadingReport) return;
        await reportTarget(activePost.post_id, "post");
        removePost(activePost.post_id);
        setShowMenuRow(false);
    };

    const handleOnRefresh = async () => {

        setRefreshing(true);

        try {
            const freshReels = await loadReel(undefined, undefined, true, true);
            setReels(freshReels);
        } finally {
            setRefreshing(false);
        }
    };
        
    useEffect(() => {
        if (!chromeAnim) return;

        const currentValue = (chromeAnim as any).__getValue();
        setIsChromeHidden(currentValue >= 0.99);

        const id = chromeAnim.addListener(({ value }) => {
            setIsChromeHidden(value >= 0.99);
        });
        return () => chromeAnim.removeListener(id);
    }, [chromeAnim]);

    useEffect(() => {
        if (sharePostId == null) return;

        requestAnimationFrame(() => {
            shareSheetRef.current?.expand();
        });
    }, [sharePostId]);

    useEffect(() => {
        init(initialPost);
    }, [initialPost.post_id]);

    useEffect(() => {
        setActiveIndex(0);
    }, [initialPost.post_id]);

    useEffect(() => {
        if (activeIndex > list.length - 1) {
            setActiveIndex(Math.max(0, list.length - 1));
        }
    }, [list.length]);

    return (

        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "black" }]}>

            <View style={{ height: tagHeight, backgroundColor: colors.background }}>

                {(loading || refreshing) ? (
                    <View
                        pointerEvents="none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: "black",
                        }}
                    >
                        {reelSkeletons.map((_, i) => (
                            <EmptyReelTag key={`reel-skeleton-${i}`} delay={i * 120} height={tagHeight} fullscreen={isChromeHidden}/>
                        ))}
                    </View>
                ) : (
                    <FlatList
                        data={reels.length ? reels : [initialPost]}
                        keyExtractor={(item) => item.post_id.toString()}
                        showsVerticalScrollIndicator={false}
                        decelerationRate="fast"
                        pagingEnabled
                        scrollEnabled
                        onEndReachedThreshold={0.5}
                        scrollEventThrottle={16}
                        getItemLayout={(_, index) => ({
                            length: tagHeight,
                            offset: tagHeight * index,
                            index,
                        })}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleOnRefresh}
                                tintColor="transparent"    
                                colors={["transparent"]}   
                                progressBackgroundColor="transparent"
                            />
                        }
                        onMomentumScrollEnd={(e) => {
                            const offsetY = e.nativeEvent.contentOffset.y;
                            const index = Math.round(offsetY / tagHeight);
                            setActiveIndex(index);
                        }}
                        onScrollEndDrag={(e) => {
                            const offsetY = e.nativeEvent.contentOffset.y;
                            const index = Math.round(offsetY / tagHeight);
                            setActiveIndex(index);
                        }}
                        onScrollBeginDrag={() => {
                            setShowMenuRow(false);
                            if (sharePostId != null) {
                                shareSheetRef.current?.close();
                                setSharePostId(null);
                            }
                        }}
                        onEndReached={() => {
                            if (loadingMoreReels || !hasMoreReels) return;
                            loadNextReel().then((freshReels) => {
                                if (!freshReels.length) return;
                                useReel.setState((state) => {
                                    const existingIds = new Set(state.reels.map((r) => r.post_id));
                                    const newOnes = freshReels.filter((r) => !existingIds.has(r.post_id));
                                    return { reels: [...state.reels, ...newOnes] };
                                });
                            });
                        }}
                        renderItem={({ item }) => (
                            <>
                                {showMenuRow && (
                                    <Pressable
                                        style={{
                                            position: "absolute",
                                            top: 70,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            zIndex: 2,
                                            elevation: 2,
                                            backgroundColor: "transparent",
                                        }}
                                        onPress={() => setShowMenuRow(false)}
                                    />
                                )}
                                <ReelTag
                                    card={item}
                                    height={tagHeight}
                                    onSwipeUp={nextReel}
                                    onSwipeDown={prevReel}
                                    fullscreen={isChromeHidden}
                                    onSetActiveProfile={(post_id) => {
                                        setActiveProfile(post_id);
                                        profileSheetRef.current?.expand();
                                        setIsProfileSheetOpen(true);
                                    }}
                                    onSetSharePost={handleOpenShare}
                                    onOpenCook={(post_id) => {
                                        openCook(post_id);
                                    }}
                                />
                            </>
                        )}
                    />
                )}
            </View>

            <ReanimatedAnimated.View
                pointerEvents={isProfileSheetOpen ? "none" : "box-none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { zIndex: 2, elevation: 2 },
                    headerAnimatedStyle,
                ]}
            >
                <View
                    pointerEvents="box-none"
                    style={{ ...StyleSheet.absoluteFillObject, zIndex: 2, elevation: 2 }}
                >
                    <View pointerEvents="box-none" style={{ position: "absolute", left: 20, top: isChromeHidden ? insets.bottom + 25 : 15 }}>
                        <Button onPress={() => onBack()} clearBackground>
                            <BackIcon color={colors.text} />
                        </Button>
                    </View>

                    <View pointerEvents="box-none" style={{ position: "absolute", right: 20, top: isChromeHidden ? insets.bottom + 25 : 15 }}>
                        <ExpandingButton
                            expanded={showMenuRow}
                            onPress={() => setShowMenuRow(true)}
                            expandedChildren={
                                <View
                                    style={{
                                        gap: 5,
                                        overflow: "hidden",
                                        minWidth: 150,
                                    }}
                                >
                                    <Button
                                        onPress={() => {
                                            setShowMenuRow(false);
                                            openOverlay({
                                                title: "Info",
                                                custom: (
                                                    <View style={{ flex: 1}}>
                                                        <GradientHeader
                                                            baseColor={colors.background}
                                                        >
                                                            <Text className={textStyles.body} style={{ color: colors.secondaryText }}>
                                                                {`Please read the nutritional, level of difficulty and dietary specifications of ${capitalize(activePost?.firstName ?? "")} ${capitalize(activePost?.lastName ?? "")}'s ${activePost?.info?.dish_name}`}
                                                            </Text>
                                                        </GradientHeader>
                                                        <ScrollView style={{ paddingTop: 80 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
                                                            <DifficultyRender difficulty={activePost?.info?.dish_difficulty} dark />
                                                            <NutritionRender nutrition={activePost?.nutrition ?? []} dark />
                                                            <DietaryRender dietary={activePost?.dietary ?? []} dark />
                                                        </ScrollView> 
                                                    </View>
                                                ),
                                            });
                                        }}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16 }}>Info</Text>
                                        <InfoIcon color={colors.text} size={18} />
                                    </Button>

                                    <Button
                                        onPress={handleReport}
                                        disabled={loadingReport}
                                        style={{
                                            width: "auto",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            backgroundColor: colors.background
                                        }}
                                    >
                                        <Text style={{ color: colors.danger, fontSize: 16 }}>Report</Text>
                                        {loadingReport ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <ReportIcon color={colors.danger} size={18} />
                                        )}
                                    </Button>
                                </View>
                            }
                            expandedStyle={{
                                borderRadius: 20,
                            }}
                            style={{
                                borderRadius: 20
                            }}
                            clearBackground
                        >
                            <MoreIcon color={colors.text} size={15} rotate={90} />
                        </ExpandingButton>
                    </View>
                </View>
            </ReanimatedAnimated.View>

            <BottomSheet
                ref={profileSheetRef}
                index={-1}
                snapPoints={BOTTOM_SNAP_POINTS}
                detached={false}
                animatedIndex={profileSheetAnimatedIndex}
                onChange={(index) => setIsProfileSheetOpen(index !== -1)}
                enableDynamicSizing={false}
                enablePanDownToClose={false}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={false}
                backdropComponent={(props) => (
                    <BottomSheetBackdrop
                        {...props}
                        disappearsOnIndex={-1}
                        appearsOnIndex={0}
                        opacity={0.7}
                        pressBehavior="close"
                    />
                )}
                backgroundStyle={{
                    backgroundColor: "transparent",
                    borderRadius: FEED_CARD_PROFILE_RADIUS + 10,
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
                    <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.85, backgroundColor: colors.secondaryCard, borderRadius: FEED_CARD_PROFILE_RADIUS + 10 }} />
                    <BottomSheetView style={{ height: (chromeAnim as any).__getValue() >= 1 ? BOTTOM_HEIGHT - NAV_SIZE : 450, marginTop: 10, marginHorizontal: 10, overflow: "hidden", alignSelf: "center", backgroundColor: colors.background, borderRadius: FEED_CARD_PROFILE_RADIUS }}>
                        <FeedProfile
                            dark
                            onClose={closeProfileSheet}
                        />
                    </BottomSheetView>
                </View>
            </BottomSheet>

            {/* Share Bottom Sheet */}
            <BottomSheet
                ref={shareSheetRef}
                index={-1}
                animatedIndex={shareSheetAnimatedIndex}
                bottomInset={isChromeHidden ? insets.bottom : BOTTOM_INSETS}
                onChange={(index) => setIsShareSheetOpen(index !== -1)}
                enablePanDownToClose
                onClose={() => setSharePostId(null)}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                android_keyboardInputMode="adjustResize"
                backdropComponent={(props) => (
                    <BottomSheetBackdrop
                        {...props}
                        disappearsOnIndex={-1}
                        appearsOnIndex={0}
                        opacity={0.7}
                        pressBehavior="close"
                    />
                )}
                backgroundStyle={{ 
                    backgroundColor: colors.background, 
                    borderRadius: 30,
                    shadowColor: colors.text,
                    shadowOpacity: 0.15,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 5,
                }}
                handleIndicatorStyle={{ backgroundColor: colors.secondaryCard, width: 45, height: 7 }}
            >
                <BottomSheetView style={{ height: 210, overflow: "hidden" }}>
                    {sharePostId && (
                        <FeedShare
                            post_id={sharePostId} 
                        />
                    )}
                </BottomSheetView>
            </BottomSheet>
            
        </View>
    )
};

export default Reel;