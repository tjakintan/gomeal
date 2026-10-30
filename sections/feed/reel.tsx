import { Pressable, StyleSheet, Text, View, FlatList, RefreshControl, useWindowDimensions, ScrollView } from "react-native";
import { BackIcon, InfoIcon, MoreIcon, ReportIcon } from "@/icons/Icon";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import ReelTag, { LandscapeReelTag, EmptyReelTag } from "@/tags/ReelTag";
import { useFeed } from "@/stores/useFeed";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    PanGestureHandler,
    State,
} from "react-native-gesture-handler";
import { useReel, useReelChrome } from "@/stores/useReel";
import { isVideoPost, ReelFeedCard } from "@/types/feed.types";
import FeedShare from "./share";
import FeedProfile from "./feedProfile";
import { SpinningLogoImage } from "@/utils/Logo";
import { useCook } from "@/stores/useCook";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOverlay } from "@/stores/useOverlay";
import { capitalize } from "@/utils/text";
import { NutritionRender, DietaryRender, DifficultyRender } from "@/utils/food";
import { GradientHeader } from "@/components/GradientComponent";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { CookMainScreen } from "../cook";
import { MediaRef } from "@/media/media";
import { useBottomSheet } from "@/stores/useBottomSheet";
import { usePostHog } from "posthog-react-native";
import Report from "@/components/ReportComponent";
import { openCookOverlay } from "../cook/openCook";
import { StepData } from "@/types";
import StepsScreen from "../cook/steps";

import BottomSheet, {
    BottomSheetView,
    useBottomSheet as useGorhomBottomSheet,
} from "@gorhom/bottom-sheet";

import orientation from "@/modules/orientation";
import { Animated as RNAnimated } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

const reelSkeletons = Array.from({ length: 3 });

const Reel: React.FC<{initialPost: ReelFeedCard; onBack: (data?: string) => void; }> = ({ onBack, initialPost }) => {

    const posthog = usePostHog();
    const { colors, textStyles } = useTheme("dark");
    
    const chrome = useReelChrome();
    const loadReel = useFeed((s) => s.loadReel);
    const loadNextReel = useFeed((s) => s.loadNextReel);
    const hasMoreReels = useFeed((s) => s.hasMoreReels);
    const loadingMoreReels = useFeed((s) => s.loadingMoreReels);
    const removePost = useFeed((s) => s.removePost);
    const setActiveProfile = useFeed((s) => s.setActiveProfile);
    const markPostSeen = useFeed((s) => s.markPostSeen);

    const order = useReel((s) => s.order);
    const setReels = useReel((s) => s.setReels);
    const init = useReel((s) => s.init);
    const nextReel = useReel((s) => s.nextReel);
    const prevReel = useReel((s) => s.prevReel);
    const loading = useReel((s) => s.loading);
    const isScrubbing = useReel((s) => s.isScrubbing);
    
    const openOverlay = useOverlay((s) => s.openOverlay);
    const closeOverlay = useOverlay((s) => s.closeOverlay);
    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    const mediaRefs = useRef<Map<number, MediaRef | null>>(new Map());
        const resumeActive = (index: number) => {
        const card = list[index];
        if (!card) return;
        mediaRefs.current.get(card.post_id)?.resume();
    };

    const seenRef = useRef<Set<number>>(new Set());

    const [activeIndex, setActiveIndex] = useState(0);
    // order is just post_ids now — resolve each to its live post object,
    // which is the same object togglePostAction patches, so likes/stars
    // update here automatically.
    const feedPosts = useFeed((s) => s.posts);

    const list = useMemo(() => {
        if (!order.length) return [initialPost];

        return order
            .map((id) => feedPosts.find((p) => p.post_id === id))
            .filter((p): p is ReelFeedCard => !!p && isVideoPost(p));  
    }, [order, feedPosts, initialPost]);

    const activePost = list[activeIndex] ?? initialPost;

    const flatListRef = useRef<FlatList<ReelFeedCard>>(null);
    const listLatest = useRef(list);
    listLatest.current = list;
    const activeIndexRef = useRef(0);
    activeIndexRef.current = activeIndex;

    const [refreshing, setRefreshing] = useState(false);
    const [showMenuRow, setShowMenuRow] = useState(false);

    const openBottomSheet = useBottomSheet((s) => s.openBottomSheet);
    const closeBottomSheet = useBottomSheet((s) => s.closeBottomSheet);
    const sheetIsOpen = useBottomSheet((s) => s.isOpen);

    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const SWIPE_THRESHOLD = windowWidth * 0.15;
    const tagHeight = windowHeight;


    const handleToggleLandscape = useCallback((next: boolean) => {
        setManualLandscape(next);
        orientation.rotate(next);
    }, []);


    const handleOnRefresh = async () => {

        setRefreshing(true);

        try {
            const freshReels = await loadReel(undefined, undefined, true, true);
            setReels(freshReels);
        } finally {
            setRefreshing(false);
        }
    };


    const handleOpenShare = useCallback((post_id: number) => {
        posthog.capture("[Feed] => share_opened", { post_id });
        openBottomSheet(
            <FeedShare post_id={post_id} dark />,
            [210 + insets.bottom],
            1,
            undefined,
            undefined,
            true,
            isLandscape,
        );
    }, [openBottomSheet]);


    // orientation
    const isLandscape = windowWidth > windowHeight;
    const [manualLandscape, setManualLandscape] = useState(false);
    const orientationLocked = isLandscape && !manualLandscape;

    // landscape
    const [landscapeSteps, setLandscapeSteps] = useState<{
        steps: StepData[];
        dishName: string;
    } | null>(null);

    const sheetProgress = useSharedValue(0);

    const sheetWidth = windowWidth * 0.40;

    const reelAnimatedStyle = useAnimatedStyle(() => ({
        width: interpolate(
            sheetProgress.value,
            [0, 1],
            [windowWidth, windowWidth - sheetWidth],
            Extrapolation.CLAMP
        ),
    }));

    const handleOpenSteps = useCallback(
        (steps: StepData[], dishName: string) => {
            if (isLandscape) {
                setLandscapeSteps({ steps, dishName });
                return;
            }

            openBottomSheet(
                <StepsScreen
                    asSheet
                    dark
                    dishName={dishName}
                    steps={steps}
                />,
                [windowHeight * 0.5, windowHeight - insets.top - 50],
                0,
                0.5,
                false,
                true
            );
        },
        [isLandscape, openBottomSheet, windowHeight, insets.top]
    );

    const LandscapeSheetProgress: React.FC<{
        progress: ReturnType<typeof useSharedValue<number>>;
        screenHeight: number;
        firstSnapHeight: number;
    }> = ({ progress, screenHeight, firstSnapHeight }) => {
        const { animatedPosition } = useGorhomBottomSheet();

        useAnimatedReaction(
            () => animatedPosition.value,
            (position) => {
                const closedPosition = screenHeight;

                progress.value = interpolate(
                    position,
                    [firstSnapHeight, closedPosition],
                    [1, 0],
                    Extrapolation.CLAMP
                );
            },
            [screenHeight, firstSnapHeight]
        );

        return null;
    };

    const handleOpenLandscapeSteps = useCallback(
        (steps: StepData[], dishName: string) => {
            setLandscapeSteps({ steps, dishName });
        },
        []
    );
    

    // force portrait 
    const previousOrientation = useRef<boolean | null>(null);

    const runInPortrait = useCallback((fn: () => void) => {
        // Save the Reel's orientation only on the first transition.
        if (previousOrientation.current === null) {
            previousOrientation.current = isLandscape;
        }

        if (isLandscape) {
            setManualLandscape(false);
            orientation.rotate(false);

            setTimeout(fn, 350);
        } else {
            fn();
        }
    }, [isLandscape]);

    const restorePreviousOrientation = useCallback(() => {
        const previous = previousOrientation.current;

        if (previous === null) return;

        previousOrientation.current = null;

        if (previous) {
            setManualLandscape(true);
            orientation.rotate(true);
        }
    }, []);


    const handleSetActiveProfile = useCallback((post_id: number) => {
        runInPortrait(() => {
            setActiveProfile(post_id);
            openSlidingOverlay(
                <FeedProfile
                    dark
                    onClose={restorePreviousOrientation}
                />
            );
        });
    }, [setActiveProfile, openSlidingOverlay, runInPortrait]);


    const handleOpenCookScreen = useCallback((post_id: number) => {
        runInPortrait(() =>
            openCookOverlay(post_id, {
                dark: true,
                onDismiss: restorePreviousOrientation,
            })
        );
    }, [runInPortrait, restorePreviousOrientation]);


    const openReport = useCallback(() => {
        if (!activePost?.post_id) return;

        setShowMenuRow(false);

        runInPortrait(() => {
            openOverlay({
                title: "Report",
                custom: (
                    <Report
                        dark
                        target_user_sub={activePost.user_sub}
                        profile_name={activePost.profile_name}
                        target_id={activePost.post_id}
                        target_type="post"
                        onReported={() => {
                            posthog.capture("[Trust] => post_reported", {
                                post_id: activePost.post_id,
                            });

                            restorePreviousOrientation();
                            removePost(activePost.post_id);
                            closeOverlay();
                        }}
                    />
                ),
                onDismiss: restorePreviousOrientation
            });
        });
    }, [
        activePost,
        runInPortrait,
        openOverlay,
        posthog,
        removePost,
        closeOverlay,
        restorePreviousOrientation,
    ]);


    const openInfo = useCallback(() => {
        setShowMenuRow(false);

        runInPortrait(() => {
            openOverlay({
                title: "Info",
                custom: (
                    <View style={{ flex: 1 }}>
                        <GradientHeader baseColor={colors.background}>
                            <Text
                                className={textStyles.body}
                                style={{ color: colors.secondaryText }}
                            >
                                {`Please read the nutritional, level of difficulty and dietary specifications of ${capitalize(activePost?.firstName ?? "")} ${capitalize(activePost?.lastName ?? "")}'s ${activePost?.info?.dish_name}`}
                            </Text>
                        </GradientHeader>

                        <ScrollView
                            style={{ paddingTop: 80 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                gap: 20,
                                paddingBottom: insets.bottom,
                            }}
                        >
                            <DifficultyRender
                                difficulty={activePost?.info?.dish_difficulty}
                                dark
                            />
                            <NutritionRender
                                nutrition={activePost?.nutrition ?? []}
                                dark
                            />
                            <DietaryRender
                                dietary={activePost?.dietary ?? []}
                                dark
                            />
                        </ScrollView>
                    </View>
                ),
                onDismiss: restorePreviousOrientation
            });
        });
    }, [
        runInPortrait,
        openOverlay,
        colors.background,
        colors.secondaryText,
        textStyles.body,
        activePost,
        insets.bottom,
        restorePreviousOrientation,
    ]);


    // reel swipe 
    const handleNextReel = useCallback(() => {
        if (landscapeSteps !== null) return;
        nextReel();
    }, [landscapeSteps, nextReel]);

    const handlePreviousReel = useCallback(() => {
        if (landscapeSteps !== null) return;
        prevReel();
    }, [landscapeSteps, prevReel]);

    const handleVideoEnd = useCallback((post_id: number): boolean => {
        const items = listLatest.current;
        const current = activeIndexRef.current;

        if (items[current]?.post_id !== post_id) return true;

        const next = current + 1;
        if (next >= items.length) return false;

        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        setActiveIndex(next);
        mediaRefs.current.get(items[next].post_id)?.resume();
        return true;
    }, []);


    /**
     * Opens the active post's profile when the user swipes left.
     *
     * Only a horizontal left swipe is accepted. Vertical movement is ignored
     * so the Reel's normal swipe-up/swipe-down navigation continues to work.
     */
    const handleProfileSwipe = useCallback(
        (event: any) => {

            if (useReel.getState().isScrubbing) return;
            
            const {
                state,
                translationX,
                translationY,
                velocityX,
            } = event.nativeEvent;

            if (
                state !== State.END &&
                state !== State.CANCELLED &&
                state !== State.FAILED
            ) {
                return;
            }

            if (
                state === State.CANCELLED ||
                state === State.FAILED
            ) {
                return;
            }

            const SWIPE_THRESHOLD = windowHeight * 0.08;
            const VELOCITY_THRESHOLD = 150;

            // Require the gesture to clearly be horizontal.
            const isHorizontal =
                Math.abs(translationX) > Math.abs(translationY);

            if (!isHorizontal) {
                return;
            }

            // Left swipe = negative translationX.
            const shouldOpenProfile =
                translationX <= -SWIPE_THRESHOLD ||
                velocityX <= -VELOCITY_THRESHOLD;

            if (!shouldOpenProfile) {
                return;
            }

            handleSetActiveProfile(activePost.post_id);
        },
        [
            windowHeight,
            activePost?.post_id,
            handleSetActiveProfile,
        ]
    );


    useEffect(() => {
        orientation.rotate(isLandscape);
    }, [isLandscape]);

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


    useEffect(() => {
        const id = activePost?.post_id;
        if (!id || seenRef.current.has(id)) return;

        const t = setTimeout(() => {
            seenRef.current.add(id);
            markPostSeen(id);
        }, 1000);

        return () => clearTimeout(t);
    }, [activePost?.post_id, markPostSeen]);

    useEffect(() => {
        if (!isLandscape) setManualLandscape(false);
    }, [isLandscape]);

    // renders
    const Tag = isLandscape ? LandscapeReelTag : ReelTag;
    const renderItem = useCallback(
        ({ item }: { item: ReelFeedCard }) => (
            <>
                {showMenuRow && (
                    <Pressable
                        style={{ position: "absolute", top: 70, left: 0, right: 0, bottom: 0, zIndex: 2, elevation: 2, backgroundColor: "transparent" }}
                        onPress={() => setShowMenuRow(false)}
                    />
                )}
                <Tag
                    ref={(r) => {
                        if (r) mediaRefs.current.set(item.post_id, r);
                        else mediaRefs.current.delete(item.post_id);
                    }}
                    card={item}
                    height={tagHeight}
                    onSwipeUp={handleNextReel}
                    onSwipeDown={handlePreviousReel}
                    onSetActiveProfile={handleSetActiveProfile}
                    onSetSharePost={handleOpenShare}
                    onOpenCook={handleOpenCookScreen}
                    onOpenSteps={isLandscape ? handleOpenLandscapeSteps : handleOpenSteps}
                    onVideoEnd={handleVideoEnd}
                    isActive={item.post_id === activePost?.post_id}
                    isLandscape={isLandscape}
                    landscapeSheetOpen={isLandscape && landscapeSteps !== null}
                    onOrientationChange={handleToggleLandscape}
                    orientationLocked={orientationLocked}
                />
            </>
        ),
        [showMenuRow, tagHeight, activePost?.post_id, nextReel, prevReel, handleSetActiveProfile, handleOpenShare, handleOpenCookScreen, handleOpenSteps, handleVideoEnd, isLandscape, landscapeSteps]
    );

    const menuContent = (
        <View
            style={{
                gap: 5,
                overflow: "hidden",
                minWidth: 150,
            }}
        >
            <Button
                onPress={openInfo}
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
                onPress={openReport}
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
                    <ReportIcon color={colors.danger} size={18} />
            </Button>
        </View>
    )

    return (

        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: landscapeSteps ? colors.background : undefined }]}>

            <PanGestureHandler
                enabled={!isScrubbing}
                activeOffsetX={[-windowWidth * 0.15, windowWidth * 0.15]}
                failOffsetY={[-20, 20]}
                onHandlerStateChange={handleProfileSwipe}
            >
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: tagHeight,
                            backgroundColor: colors.background,
                            overflow: "hidden",
                        },
                        reelAnimatedStyle,
                    ]}
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
                            data={list}
                            ref={flatListRef}
                            keyExtractor={(item) => item.post_id.toString()}
                            extraData={isLandscape}
                            showsVerticalScrollIndicator={false}
                            decelerationRate="fast"
                            pagingEnabled
                            scrollEnabled={!isScrubbing}
                            onEndReachedThreshold={0.5}
                            scrollEventThrottle={16}
                            getItemLayout={(_, index) => ({ length: tagHeight, offset: tagHeight * index, index })}
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
                                resumeActive(index);
                            }}
                            onScrollEndDrag={(e) => {
                                const offsetY = e.nativeEvent.contentOffset.y;
                                const index = Math.round(offsetY / tagHeight);
                                setActiveIndex(index);
                                resumeActive(index);
                            }}
                            onScrollBeginDrag={() => {
                                setShowMenuRow(false);

                                if (sheetIsOpen) {
                                    closeBottomSheet();
                                }
                            }}
                            onEndReached={() => {
                                if (loadingMoreReels || !hasMoreReels) return;

                                loadNextReel().then((freshReels) => {
                                    const videos = freshReels.filter(isVideoPost);          
                                    if (!videos.length) return;

                                    useReel.setState((state) => {
                                        const existingIds = new Set(state.order);
                                        const newIds = videos
                                            .map((r) => r.post_id)
                                            .filter((id) => !existingIds.has(id));
                                        return { order: [...state.order, ...newIds] };
                                    });
                                });
                            }}
                            renderItem={renderItem}
                        />
                    )}
                </Animated.View>

            </PanGestureHandler>

            {!landscapeSteps && (
                <RNAnimated.View
                    pointerEvents="box-none"
                    style={[StyleSheet.absoluteFillObject, { top: insets.top, zIndex: 2, elevation: 2, opacity: chrome }]}
                >
                    <View
                        pointerEvents="box-none"
                        style={{ 
                            ...StyleSheet.absoluteFillObject, 
                            zIndex: 2, 
                            elevation: 2,
                            top: isLandscape ? 10 : 0,
                        }}
                    >
                        <View 
                            pointerEvents="box-none" 
                            style={{ 
                                position: "absolute", 
                                left: isLandscape ? Math.max(insets.left, 16) : 20
                            }}
                        >
                            <Button 
                                onPress={() => {
                                    onBack();
                                }} 
                                style={{
                                    padding: 0,
                                }}
                                clearBackground
                            >
                                <BackIcon color={colors.text} />
                            </Button>
                        </View>

                        <View 
                            pointerEvents="box-none" 
                            style={{ 
                                position: "absolute", 
                                right: isLandscape ? Math.max(insets.right, 16) : 20
                            }}
                        >
                            <ExpandingButton
                                expanded={showMenuRow}
                                onPress={() => setShowMenuRow(true)}
                                expandedChildren={menuContent}
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
                </RNAnimated.View>
            )}
                        
            {isLandscape && landscapeSteps && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: sheetWidth,
                        overflow: "hidden",
                        zIndex: 10,
                        elevation: 10,
                    }}
                >
                    <BottomSheet
                        index={0}
                        snapPoints={["100%"]}
                        enableDynamicSizing={false}
                        enablePanDownToClose
                        animateOnMount
                        onChange={(index) => {
                            if (index === -1) {
                                setLandscapeSteps(null);
                            }
                        }}
                        backgroundStyle={{
                            backgroundColor: colors.background,
                        }}
                        handleIndicatorStyle={{
                            backgroundColor: colors.secondaryCard,
                            width: 45,
                            height: 5,
                        }}
                    >
                        <LandscapeSheetProgress
                            progress={sheetProgress}
                            screenHeight={windowHeight}
                            firstSnapHeight={0}
                        />
                            <StepsScreen
                                asSheet
                                dark
                                dishName={landscapeSteps.dishName}
                                steps={landscapeSteps.steps}
                            />
                    </BottomSheet>
                </View>
            )}

        </View>
    )
};

export default Reel;