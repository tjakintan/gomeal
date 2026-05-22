import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BackIcon, MoreIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { useTheme } from "@/provider/ThemeProvider";
import ReelTag, { EmptyReelTag, REEL_TAG_HEIGHT } from "@/tags/ReelTag";
import { useFeed } from "@/stores/useFeed";
import { useEffect, useRef, useState } from "react";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useReel } from "@/stores/useReel";
import { ReelFeedCard } from "@/types/feed.types";
import FeedShare from "./share";
import { FlatList } from "react-native-gesture-handler";
import GomealGlassView from "@/components/GlassComponent";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import FeedProfile, { FEED_CARD_PROFILE_RADIUS } from "./feedProfile";
import { useReport } from "@/stores/useReport";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SpinningLogoImage } from "@/utils/Logo";
import { useCook } from "@/stores/useCook";
import { CookMainScreen } from "../cook";

const reelSkeletons = Array.from({ length: 3 });

const Reel: React.FC<{initialPost: ReelFeedCard; onBack: (data?: string) => void;}> = ({ onBack, initialPost }) => {

    const { colors, textStyles } = useTheme("dark");
    const { openCook } = useCook();
    const { reportTarget, loadingReport } = useReport();
    const { loadReel, removePost, setActiveProfile, clearActiveProfile } = useFeed();
    const { reels, setReels, init, nextReel, prevReel, loading } = useReel();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [showMenuRow, setShowMenuRow] = useState(false);
    const [sharePostId, setSharePostId] = useState<number | null>(null);

    const [stopBottomSheet, setStopBottomSheet] = useState(false);
    const profileSheetRef = useRef<BottomSheet>(null);
    const shareSheetRef = useRef<BottomSheet>(null);

    const handleBack = () => { onBack(); };
    const handleNext = () => { nextReel(); setCurrentIndex((prev) => Math.min(prev + 1, reels.length - 1)); };
    const handlePrev = () => { prevReel(); setCurrentIndex((prev) => Math.max(prev - 1, 0)); };

    const activePost = (reels.length ? reels : [initialPost])[currentIndex] ?? initialPost;

    const handleOpenShare = (post_id: number) => {
        setSharePostId(post_id);
    };

    const closeProfileSheet = () => {
        profileSheetRef.current?.close();
        clearActiveProfile();
        setStopBottomSheet(false);
    };

    const handleReport = async () => {
        if (!activePost?.post_id || loadingReport) return;
        //console.log(activePost.post_id)
        await reportTarget(activePost.post_id, "post");
        removePost(activePost.post_id);
        setShowMenuRow(false);
    };

    const handleOnRefresh = async () => {
        setRefreshing(true);

        try {
            const freshReels = await loadReel(undefined, undefined, true, true);
            setReels(freshReels);
            setCurrentIndex(0);
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
        setCurrentIndex(0);
    }, [initialPost.post_id]);

    return (

        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "black" }]}>

            {/* Header */}
            <View style={{ height: 70, paddingVertical: 10 }} className="justify-center">

                {showMenuRow ? (
                    <View
                        style={{
                            flex: 1,
                            paddingHorizontal: 10,
                            flexDirection: "column",
                            alignItems: "flex-end",
                            justifyContent: "center"
                        }}
                        className="w-full"
                    >
                        <Button 
                            style={{
                                height: 40,
                                width: 70,
                                backgroundColor: colors.danger,
                            }}
                            onPress={handleReport} 
                            background
                        >
                            {loadingReport ? (
                                <SpinningLogoImage size={20} />
                            ) : (
                                <Text className={textStyles.caption}>
                                    Report
                                </Text>
                            )}                       
                        </Button>
                    </View>
                ) : (
                    <>
                        <View style={{ position: 'absolute', left: 20, top: 0, bottom: 0, justifyContent: 'center' }}>
                            <Button onPress={handleBack} background><BackIcon color={colors.text} /></Button>
                        </View>
                        <Text style={{ alignSelf: "center" }} className={textStyles.h3}>
                            {refreshing ? "Refreshing..." : ""}
                        </Text>
                        <View style={{ position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' }}>
                            <Button onPress={() => {setShowMenuRow(true)}} background>
                                <MoreIcon color={colors.text} size={15} rotate={90}/>
                            </Button>
                        </View>
                    </>
                )}

            </View>

            {/* Reel FlatList */}
            <View style={{ height: REEL_TAG_HEIGHT, backgroundColor: colors.background }}>

                {(loading || refreshing) ? (
                    <View
                        pointerEvents="none"
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: "black",
                        }}
                    >
                        {reelSkeletons.map((_, i) => (
                            <EmptyReelTag key={`reel-skeleton-${i}`} delay={i * 120} />
                        ))}
                    </View>
                ) : (
                    <FlatList
                        data={reels.length ? reels : [initialPost]}
                        keyExtractor={(item) => item.post_id.toString()}
                        showsVerticalScrollIndicator={false}
                        pagingEnabled
                        snapToInterval={REEL_TAG_HEIGHT}
                        decelerationRate="fast"
                        scrollEnabled={currentIndex === 0}
                        onScrollEndDrag={async (event) => {
                            const offsetY = event.nativeEvent.contentOffset.y;

                            if (currentIndex === 0 && offsetY < -80 && !refreshing) {
                                await handleOnRefresh();
                            }
                        }}
                        scrollEventThrottle={16}
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
                                            zIndex: 50,
                                            elevation: 50,
                                            backgroundColor: "transparent",
                                        }}
                                        onPress={() => setShowMenuRow(false)}
                                    />
                                )}
                                <ReelTag
                                    card={item}
                                    onSwipeUp={handleNext}
                                    onSwipeDown={handlePrev}
                                    onSetActiveProfile={(post_id) => {
                                        setActiveProfile(post_id);
                                        profileSheetRef.current?.expand();
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

            {/* Profile Bottom Sheet */}
            <BottomSheet
                ref={profileSheetRef}
                index={-1}
                snapPoints={[535]}
                enableDynamicSizing={false}
                enablePanDownToClose={false}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={false}
                backgroundStyle={{
                    backgroundColor: "transparent",
                    borderRadius: FEED_CARD_PROFILE_RADIUS + 10,
                }}
                handleComponent={() => null}
            >
                <GomealGlassView glassEffectStyle="clear" style={{ height: 520, marginHorizontal: 5, borderRadius: FEED_CARD_PROFILE_RADIUS + 10 }}>
                    <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.85, backgroundColor: colors.secondaryCard, borderRadius: FEED_CARD_PROFILE_RADIUS + 10 }} />
                    <BottomSheetView style={{ height: 500, marginTop: 10, marginHorizontal: 10, overflow: "hidden", alignSelf: "center", backgroundColor: colors.background, borderRadius: FEED_CARD_PROFILE_RADIUS }}>
                        <FeedProfile
                            dark
                            sectionOpen={(open) => setStopBottomSheet(open)}
                            onClose={closeProfileSheet}
                        />
                    </BottomSheetView>
                </GomealGlassView>
            </BottomSheet>

            {/* Share Bottom Sheet */}
                <BottomSheet
                    ref={shareSheetRef}
                    index={-1}
                    enablePanDownToClose
                    onClose={() => setSharePostId(null)}
                    keyboardBehavior="interactive"
                    keyboardBlurBehavior="restore"
                    android_keyboardInputMode="adjustResize"
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