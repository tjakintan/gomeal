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
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { CookMainScreen } from "../cook";

const reelSkeletons = Array.from({ length: 3 });

const Reel: React.FC<{initialPost: ReelFeedCard; onBack: (data?: string) => void; }> = ({ onBack, initialPost }) => {

    const { colors, textStyles } = useTheme("dark");
    const { openCook } = useCook();
    const { openOverlay } = useOverlay();
    const {
        openSlidingOverlay,
        closeSlidingOverlay,
    } = useSlidingOverlay();
    const { reportTarget, loadingReport } = useReport();
    
    const { loadReel, loadNextReel, hasMoreReels, loadingMoreReels, removePost, setActiveProfile, clearActiveProfile } = useFeed();
    const { reels, setReels, init, nextReel, prevReel, loading } = useReel();

    const [activeIndex, setActiveIndex] = useState(0);
    const list = reels.length ? reels : [initialPost];
    const activePost = list[activeIndex] ?? initialPost;

    const [refreshing, setRefreshing] = useState(false);
    const [showMenuRow, setShowMenuRow] = useState(false);
    const [sharePostId, setSharePostId] = useState<number | null>(null);


    const shareSheetRef = useRef<BottomSheet>(null);

    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const tagHeight = windowHeight;

    const handleOpenShare = (post_id: number) => {
        setSharePostId(post_id);
    };

    const shareSheetAnimatedIndex = useSharedValue(-1);

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const maxIndex = shareSheetAnimatedIndex.value;

        return {
            opacity: interpolate(maxIndex, [-1, 0], [1, 0], Extrapolation.CLAMP),
            transform: [
                {
                    translateY: interpolate(maxIndex, [-1, 0], [0, -20], Extrapolation.CLAMP),
                },
            ],
        };
    });

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

            <Animated.View
                style={{
                    height: tagHeight,
                    backgroundColor: colors.background,
                }}
            >

                {(loading || refreshing) ? (
                    <View
                        pointerEvents="none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: "black",
                        }}
                    >
                        {reelSkeletons.map((_, i) => (
                            <EmptyReelTag key={`reel-skeleton-${i}`} delay={i * 120} height={tagHeight} />
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
                                    onSetActiveProfile={(post_id) => {
                                        setActiveProfile(post_id);

                                        openSlidingOverlay(
                                            <FeedProfile
                                                dark
                                            />
                                        );
                                    }}
                                    onSetSharePost={handleOpenShare}
                                    onOpenCook={(post_id) => {
                                        openCook(post_id);
                                        openSlidingOverlay(
                                            <CookMainScreen
                                                post_id={post_id}
                                                dark
                                                onClose={closeSlidingOverlay}
                                            />
                                        )
                                    }}
                                />
                            </>
                        )}
                    />
                )}
            </Animated.View>

            <ReanimatedAnimated.View
                pointerEvents={"box-none"}
                style={[
                    StyleSheet.absoluteFillObject,
                    { top: insets.top, zIndex: 2, elevation: 2 },
                    headerAnimatedStyle,
                ]}
            >
                <View
                    pointerEvents="box-none"
                    style={{ ...StyleSheet.absoluteFillObject, zIndex: 2, elevation: 2 }}
                >
                    <View pointerEvents="box-none" style={{ position: "absolute", left: 20,}}>
                        <Button onPress={() => onBack()} clearBackground>
                            <BackIcon color={colors.text} />
                        </Button>
                    </View>

                    <View pointerEvents="box-none" style={{ position: "absolute", right: 20,}}>
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

            {/* Share Bottom Sheet */}
            <BottomSheet
                ref={shareSheetRef}
                index={-1}
                animatedIndex={shareSheetAnimatedIndex}
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