import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import PagerView from 'react-native-pager-view';
import Animated from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import { Button } from '../../components/ButtonComponent';
import { SectionHeader } from '../../components/SectionComponent';
import { useTheme } from '@/provider/ThemeProvider';
import { usePost, usePostSteps } from '../../stores/usePost';
import { ACCENT_COLORS, BOTTOM_HEIGHT, BOTTOM_INSETS, BOTTOM_SNAP_POINTS, POST_SECTIONS_INDEX, PostSection } from '@/types';
import { DishMedia, DishInfo, Ingredients, Steps, Dietary, Nutrition } from '@/sections/post/exports';
import { AddIcon, EditIcon, BackIcon, XIcon, CheckIcon } from '@/icons/Icon';
import { useAvatarMood } from '@/dashboard/store/useAvatar';
import { useReward } from '@/dashboard/store/useReward';
import { SpinningLogoImage } from '@/utils/Logo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as StoreReview from "expo-store-review";
import { NAV_SIZE } from '../Navigate';
import { useOverlay } from '@/stores/useOverlay';
import HowToPage from './How-to';
import { useProfile } from "@/stores/useProfile";
import PermissionContent from '@/components/PermissionComponent';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSlidingOverlay } from '@/stores/useSlideOverlay';
import { useAnimatedThemeColors } from '@/stores/useTheme';

const REVIEW_KEY = "asr_k1";
const hasSeenReviewPrompt = async () => {
    const value = await AsyncStorage.getItem(REVIEW_KEY);
    return value === "true";
};
const setSeenReviewPrompt = async () => {
    await AsyncStorage.setItem(REVIEW_KEY, "true");
};

const SECTION_KEYS = [
    'DishMedia',
    'DishInfo',
    'Ingredients',
    'Steps',
    'Dietary',
    'Nutrition',
] as const;

const PostScreen: React.FC<{
}> = () => {

    const { updateStep } = usePostSteps();
    const { openOverlay, closeOverlay } = useOverlay();
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay)

    const insets = useSafeAreaInsets();
    const currentSectionRef = useRef<PagerView>(null);

    const [mediaSource, setMediaSource] = useState<'post_main' | 'step_image'>('post_main');
    const [stepsIndex, setStepsIndex] = useState(0);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    const { reset, submit, loading } = usePost();
    const canPost = usePost((state) => state.canPost());

    const { reward } = useReward();
    const setMood = useAvatarMood((s) => s.setMood);

    const activeSection = SECTION_KEYS[currentSectionIndex];
    const nextSection = SECTION_KEYS[currentSectionIndex + 1] ?? null;
    const isLastSection = currentSectionIndex === SECTION_KEYS.length - 1;
    const showBackButton = currentSectionIndex > 0;

    const profile = useProfile((s) => s.data);

    const post = async () => {
        const isFirstPost = profile?.stats.num_posts === 0;

        const result = await submit();

        if (result.success) {
            setMood("celebrating", 3000);
            reward("CREATE_POST");

            const alreadySeen = await hasSeenReviewPrompt();
            const isFirstPost = profile?.stats.num_posts === 0;

            if (isFirstPost && !alreadySeen) {
                openOverlay({
                    custom: (
                        <PermissionContent
                            title="Enjoying GoMeal?"
                            description="Thanks for sharing your first meal! Would you mind leaving a quick review?"
                            onContinue={async () => {
                                await setSeenReviewPrompt(); 

                                if (await StoreReview.isAvailableAsync()) {
                                    await StoreReview.requestReview();
                                }

                                closeOverlay();
                            }}
                        />
                    ),
                });
            }
        }

        closeSheet();
    };

    const closeSheet = () => {
        closeSlidingOverlay();
        setMediaSource('post_main');
    };

    const goToSection = (pageIndex: number) => {
        currentSectionRef.current?.setPage(pageIndex);
        setCurrentSectionIndex(pageIndex);
    };

    const goToPreviousSection = () => {
        if (currentSectionIndex === 0) return;
        goToSection(currentSectionIndex - 1);
    };

    const goToNextSection = () => {
        if (isLastSection) {
            return;
        }
        if (mediaSource === "step_image") {
            setMediaSource('post_main')
        }
        goToSection(currentSectionIndex + 1);
    };

    const openTo = (
        section: PostSection,
        source: 'post_main' | 'step_image' = 'post_main',
        index?: number
    ) => {
        setMediaSource(source);

        if (index !== undefined) {
            setStepsIndex(index);
        }

        goToSection(POST_SECTIONS_INDEX[section]);
    };

    const handleMediaSelected = (
        uri: string,
        source: 'post_main' | 'step_image' = 'post_main',
        index?: number
    ) => {
        if (source === 'step_image' && index !== undefined) {
            if (uri) {
                updateStep(index, 'image_url', uri);
                setStepsIndex(index);
                goToSection(POST_SECTIONS_INDEX.Steps);
            } else {
                openTo('DishMedia', 'step_image', index);
            }
            return;
        }

        if (!uri) {
            openTo('DishMedia', source, index);
        }
    };

    const forceDark = activeSection === "DishMedia";
    const { colors, textStyles } = useTheme(forceDark ? "dark" : undefined); 
    const animatedColors = useAnimatedThemeColors(forceDark);      

    return (
        <RNAnimated.View
            style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: animatedColors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <SectionHeader
                showDivider
                dark={activeSection === "DishMedia"}
                subtitle="Create a new food tag. Click `?` for information about how to use."
            />

            {/* Content */}
            <View
                style={{
                    flex: 1,
                    overflow: "hidden",
                }}
            >
                <PagerView
                    ref={currentSectionRef}
                    style={{ flex: 1 }}
                    initialPage={0}
                    scrollEnabled={false}
                    onPageSelected={(e) =>
                        setCurrentSectionIndex(e.nativeEvent.position)
                    }
                >
                    <View key="DishMedia">
                        <DishMedia
                            isFocused={activeSection === "DishMedia"}
                            mediaSource={mediaSource}
                            stepIndex={stepsIndex}
                            onMediaSelected={handleMediaSelected}
                            onCompleteChange={() => {}}
                        />
                    </View>

                    <View key="DishInfo">
                        <DishInfo
                            isFocused={activeSection === "DishInfo"}
                            onCompleteChange={() => {}}
                        />
                    </View>

                    <View key="Ingredients">
                        <Ingredients
                            isFocused={activeSection === "Ingredients"}
                            onCompleteChange={() => {}}
                        />
                    </View>

                    <View key="Steps">
                        <Steps
                            isFocused={activeSection === "Steps"}
                            stepIndex={stepsIndex}
                            onMediaSelected={handleMediaSelected}
                            onCompleteChange={() => {}}
                        />
                    </View>

                    <View key="Dietary">
                        <Dietary
                            isFocused={activeSection === "Dietary"}
                            onCompleteChange={() => {}}
                        />
                    </View>

                    <View key="Nutrition">
                        <Nutrition
                            isFocused={activeSection === "Nutrition"}
                            onCompleteChange={() => {}}
                        />
                    </View>
                </PagerView>
            </View>

            {/* Function Row */}
            <Animated.View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    marginVertical: 12,
                }}
            >
                <Button
                    style={{
                        width: 55,
                        height: 55,
                        borderRadius: 999,
                        backgroundColor: colors.danger,
                    }}
                    onPress={closeSheet}
                    background
                >
                    <XIcon color={colors.text} size={24} />
                </Button>

                <Button
                    style={{
                        width: 55,
                        height: 55,
                        borderRadius: 999,
                    }}
                    onPress={reset}
                    background
                >
                    <MaterialIcons
                        name="refresh"
                        size={24}
                        color={colors.text}
                    />
                </Button>

                {showBackButton && (
                    <Button
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                        }}
                        onPress={goToPreviousSection}
                        background
                    >
                        <BackIcon color={colors.text} size={24} />
                    </Button>
                )}

                {isLastSection ? (
                    <Button
                        onPress={post}
                        disabled={!canPost || loading}
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                            backgroundColor: ACCENT_COLORS.teal,
                            opacity: canPost ? 1 : 0.5,
                        }}
                        background
                    >
                        {loading ? (
                            <SpinningLogoImage size={20} />
                        ) : (
                            <CheckIcon color={colors.text} size={28} />
                        )}
                    </Button>
                ) : (
                    <Button
                        onPress={goToNextSection}
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                            backgroundColor: colors.button,
                            justifyContent: "center",
                        }}
                        background
                    >
                        <BackIcon rotate={180} color={colors.text} size={24} />
                    </Button>
                )}

                <Button
                    onPress={() =>
                        openOverlay({
                            title: "How To's",
                            custom: <HowToPage />,
                        })
                    }
                    background
                    style={{
                        width: 55,
                        height: 55,
                        borderRadius: 999,
                    }}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontWeight: "700",
                            fontSize: 18,
                        }}
                    >
                        ?
                    </Text>
                </Button>
            </Animated.View>

        </RNAnimated.View>
    );
};

export default PostScreen;
