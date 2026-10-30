import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import { Button } from '../../components/ButtonComponent';
import { SectionHeader } from '../../components/SectionComponent';
import { useTheme } from '@/provider/ThemeProvider';
import { usePost, usePostSteps } from '../../stores/usePost';
import { ACCENT_COLORS, POST_SECTIONS_INDEX, PostSection } from '@/types';
import { DishMedia, DishInfo, Ingredients, Steps, Dietary, Nutrition } from '@/sections/post/exports';
import { BackIcon, XIcon, CheckIcon, QuestionIcon, RefreshIcon } from '@/icons/Icon';
import { useAvatarMood } from '@/stores/useAvatar';
import { useReward } from '@/stores/useReward';
import { SpinningLogoImage } from '@/utils/Logo';
import * as StoreReview from "expo-store-review";
import { useOverlay } from '@/stores/useOverlay';
import HowToPage from './How-to';
import { useProfile } from "@/stores/useProfile";
import PermissionContent from '@/components/PermissionComponent';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSlidingOverlay } from '@/stores/useSlideOverlay';
import { useAnimatedThemeColors } from '@/stores/useTheme';
import { usePostHog } from 'posthog-react-native';
import { useBanner } from '@/stores/useBanner';
import { GradientHeader } from '@/components/GradientComponent';

const REVIEW_KEY = "asr_k1";
export const POST_MENU_HEIGHT = 70;

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
    dark?: boolean;
    onClose?: () => void;
}> = ({ dark = false, onClose }) => {

    const posthog = usePostHog();
    const banner = useBanner();
    const { updateStep } = usePostSteps();

    //overlay
    const openOverlay = useOverlay((s) => s.openOverlay);
    const closeOverlay = useOverlay((s) => s.closeOverlay);

    const insets = useSafeAreaInsets();
    const currentSectionRef = useRef<PagerView>(null);

    const [mediaSource, setMediaSource] = useState<'post_main' | 'step_image'>('post_main');
    const [stepsIndex, setStepsIndex] = useState(0);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    const profile = useProfile((s) => s.data);
    const reset = usePost((s) => s.reset);
    const submit = usePost((s) => s.submit);
    const loading = usePost((s) => s.loading);
    const canPost = usePost((state) => state.canPost());

    const { reward } = useReward();
    const setMood = useAvatarMood((s) => s.setMood);

    const activeSection = SECTION_KEYS[currentSectionIndex];
    const isLastSection = currentSectionIndex === SECTION_KEYS.length - 1;
    const showBackButton = currentSectionIndex > 0;

    const post = async () => {
        const isFirstPost = profile?.stats.num_posts === 0;

        let result;
        try {
            result = await submit();
        } catch (err) {
            posthog.capture("[Post] => post_submit_failed", { is_first_post: isFirstPost });
            banner.error("Couldn't post your dish. Check your connection and try again.");
            return;
        }

        posthog.capture(
            result.success ? "[Post] => post_submitted" : "[Post] => post_submit_failed",
            { is_first_post: isFirstPost }
        );

        if (result.success) {
            setMood("celebrating", 3000);
            reward("CREATE_POST");

            const alreadySeen = await hasSeenReviewPrompt();

            if (isFirstPost && !alreadySeen) {
                openOverlay({
                    custom: (
                        <PermissionContent
                            title="Enjoying GoMeal?"
                            description="Thanks for sharing your first meal! Would you mind leaving a quick review?"
                            onContinue={async () => {
                                try {
                                    await setSeenReviewPrompt();
                                    if (await StoreReview.isAvailableAsync()) {
                                        await StoreReview.requestReview();
                                        posthog.capture("[Post] => review_prompt_accepted");
                                    }
                                } finally {
                                    closeOverlay();
                                }
                            }}
                        />
                    ),
                });
            }

            close();
            return;
        }

        banner.error("Couldn't post your dish. Try again.");
    };

    const close = () => {
        if (!loading) {
            posthog.capture("[Post] => post_flow_abandoned", { section: activeSection });
        }
        onClose?.()
        setMediaSource('post_main');
    };

    const goToSection = (pageIndex: number) => {
        currentSectionRef.current?.setPage(pageIndex);
        setCurrentSectionIndex(pageIndex);
        posthog.capture("[Post] => section_viewed", { section: SECTION_KEYS[pageIndex] });
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

    const forceDark = dark || activeSection === "DishMedia";
    const { colors, textStyles } = useTheme(
        forceDark ? "dark" : undefined
    );
    const animatedColors = useAnimatedThemeColors(forceDark);
    
    useEffect(() => {
        posthog.capture("[Post] => post_flow_started");
    }, []);

    return (
        <RNAnimated.View
            style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: animatedColors.background, paddingTop: insets.top},
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
                        />
                    </View>

                    <View key="DishInfo">
                        <DishInfo
                            isFocused={activeSection === "DishInfo"}
                        />
                    </View>

                    <View key="Ingredients">
                        <Ingredients
                            isFocused={activeSection === "Ingredients"}
                        />
                    </View>

                    <View key="Steps">
                        <Steps
                            isFocused={activeSection === "Steps"}
                            stepIndex={stepsIndex}
                            onMediaSelected={handleMediaSelected}
                        />
                    </View>

                    <View key="Dietary">
                        <Dietary
                            isFocused={activeSection === "Dietary"}
                        />
                    </View>

                    <View key="Nutrition">
                        <Nutrition
                            isFocused={activeSection === "Nutrition"}
                        />
                    </View>
                </PagerView>
            </View>

            {/* Function Row */}
            <GradientHeader
                height={POST_MENU_HEIGHT}
                direction="bottom"
                baseColor={colors.background}
            >
                <Animated.View
                    style={{
                        height: POST_MENU_HEIGHT,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingBottom: insets.bottom,
                        gap: 12,
                    }}
                >
                    <Button
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                            backgroundColor: colors.danger,
                        }}
                        onPress={close}
                        background
                    >
                        <XIcon color={colors.text} size={24} />
                    </Button>

                    <Button
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                            backgroundColor: colors.buttonSecondary,
                        }}
                        onPress={reset}
                        background
                    >
                        <RefreshIcon color={colors.text} size={24} />
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
                                backgroundColor: loading ? "transparent" : ACCENT_COLORS.teal,
                                opacity: canPost ? 1 : 0.5,
                            }}
                            background={loading ? false : true}
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
                                fontSize: 21,
                            }}
                        >
                            <QuestionIcon color={colors.text} size={24} />
                        </Text>
                    </Button>
                </Animated.View>
            </GradientHeader>

        </RNAnimated.View>
    );
};

export default PostScreen;
