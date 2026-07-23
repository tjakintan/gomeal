import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import PagerView from 'react-native-pager-view';
import Animated from 'react-native-reanimated';

import { Button } from '../../components/ButtonComponent';
import { SectionHeader } from '../../components/SectionComponent';
import { useTheme } from '@/provider/ThemeProvider';
import { usePost, usePostSteps } from '../../stores/usePost';
import { BOTTOM_HEIGHT, BOTTOM_INSETS, BOTTOM_SNAP_POINTS, POST_SECTIONS_INDEX, PostSection } from '@/types';
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
    isFocused?: boolean;
    setMediaEnhanceOpen: (v: boolean) => void;
}> = ({ isFocused, setMediaEnhanceOpen }) => {

    const { updateStep } = usePostSteps();
    const { colors, textStyles } = useTheme();
    const { openOverlay, closeOverlay } = useOverlay();

    const currentSectionRef = useRef<PagerView>(null);
    const overlayRef = useRef<BottomSheet>(null);
    const hintShownRef = useRef(false);

    const [mediaSource, setMediaSource] = useState<'post_main' | 'step_image'>('post_main');
    const [stepsIndex, setStepsIndex] = useState(0);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [hintVisible, setHintVisible] = useState(false);

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
                                await setSeenReviewPrompt(); // 👈 lock it forever

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
        overlayRef.current?.close();
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

        hintShownRef.current = false;
        overlayRef.current?.snapToIndex(0);
        goToSection(POST_SECTIONS_INDEX[section]);
        setHintVisible(true);
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

    useEffect(() => {
        if (isFocused) {
            overlayRef.current?.snapToIndex(0);
        }
    }, [isFocused]);
    return (
        <View style={StyleSheet.absoluteFillObject}>
            <View className="w-full flex-row p-1">
                <SectionHeader 
                    showDivider
                    subtitle="Tap `+` to create a new food tag with name, ingredients, and steps to your post." 
                />
            </View>

            <View style={{ flex: 1, paddingTop: NAV_SIZE }} className="w-full flex-row justify-center p-1">
                <View style={{ width: 220, height: 350 }}>
                    <Button
                        onPress={() => overlayRef.current?.snapToIndex(0)}
                        style={{ width: 220, height: 350, borderRadius: 25, backgroundColor: colors.card }}
                    >
                        {canPost ? <EditIcon color={colors.button} /> : <AddIcon color={colors.button} />}
                    </Button>

                    <Button
                        onPress={() => {
                            openOverlay({
                                title: "How To's",
                                body: ``,
                                custom: (
                                    <HowToPage />
                                )
                            });
                        }}
                        style={{
                            position: "absolute",
                            bottom: 325,
                            left: 195,
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 2,
                            elevation: 2
                        }}
                        background
                    >
                        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>?</Text>
                    </Button>
                </View>
            </View>

            <BottomSheet
                ref={overlayRef}
                snapPoints={BOTTOM_SNAP_POINTS}
                index={-1}
                enablePanDownToClose={false}
                enableContentPanningGesture={false}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                android_keyboardInputMode="adjustResize"
                backgroundStyle={{
                    backgroundColor: colors.background,
                    borderRadius: 35,
                    shadowColor: colors.text,
                    shadowOpacity: 0.10,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: -4 },
                    elevation: 5,
                }}
                handleComponent={() => null}
            >
                <BottomSheetView
                    style={{
                        flex: 1,
                        padding: 10,
                    }}
                >
                    <View
                        style={{
                            height: BOTTOM_HEIGHT,
                        }}
                    >

                        <PagerView
                            ref={currentSectionRef}
                            style={{
                                height: BOTTOM_HEIGHT - BOTTOM_INSETS - 90,
                                backgroundColor: colors.card,
                                borderRadius: 30,
                                overflow: 'hidden',
                            }}
                            initialPage={0}
                            onPageSelected={(e) => setCurrentSectionIndex(e.nativeEvent.position)}
                        >
                            <View key="DishMedia">
                                <DishMedia
                                    isFocused={activeSection === 'DishMedia'}
                                    mediaSource={mediaSource}
                                    stepIndex={stepsIndex}
                                    onMediaSelected={handleMediaSelected}
                                    onEnhanceMediaOpen={setMediaEnhanceOpen}
                                    onCompleteChange={() => {}}
                                />
                            </View>

                            <View key="DishInfo">
                                <DishInfo
                                    isFocused={activeSection === 'DishInfo'}
                                    onCompleteChange={() => {}}
                                />
                            </View>

                            <View key="Ingredients">
                                <Ingredients
                                    isFocused={activeSection === 'Ingredients'}
                                    onCompleteChange={() => {}}
                                />
                            </View>

                            <View key="Steps">
                                <Steps
                                    isFocused={activeSection === 'Steps'}
                                    stepIndex={stepsIndex}
                                    onMediaSelected={handleMediaSelected}
                                    onCompleteChange={() => {}}
                                />
                            </View>

                            <View key="Dietary">
                                <Dietary
                                    isFocused={activeSection === 'Dietary'}
                                    onCompleteChange={() => {}}
                                />
                            </View>

                            <View key="Nutrition">
                                <Nutrition
                                    isFocused={activeSection === 'Nutrition'}
                                    onCompleteChange={() => {}}
                                />
                            </View>
                        </PagerView>

                        <Animated.View 
                            style={{ 
                                gap: 15, 
                                paddingTop: 10,
                                justifyContent: "center", 
                                alignItems: "center",
                                overflow: 'hidden', 
                                flexDirection: "row" 
                            }}
                        >
                            <Button 
                                style={{
                                    height: 50,
                                    width: 60,
                                    borderRadius: 999,
                                    backgroundColor: colors.danger
                                }} 
                                onPress={closeSheet} 
                                background
                                disabled={loading}
                            >
                                <XIcon color={colors.text} size={25}/>
                            </Button>

                            <Button
                                style={{
                                    height: 50,
                                    width: 60,
                                    borderRadius: 999,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                onPress={reset}
                                background
                                disabled={loading}
                            >
                                <MaterialIcons name="refresh" size={26} color={colors.text} />
                            </Button>                        

                            {showBackButton && (
                                <Button 
                                    style={{
                                        height: 50,
                                        width: 60,
                                        borderRadius: 999,
                                    }} 
                                    onPress={goToPreviousSection} 
                                    background
                                >
                                    <BackIcon color={colors.text} size={25}/>
                                </Button>
                            )}

                            {isLastSection ? (
                                <Button
                                    onPress={post}
                                    disabled={!canPost || loading}
                                    style={{
                                        height: 50,
                                        width: 60,
                                        borderRadius: 999,
                                        opacity: canPost ? 1 : 0.5,
                                        backgroundColor: isLastSection ? "green" : colors.button,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    background={loading ? false : true}
                                >
                                    {loading ? (
                                        <SpinningLogoImage size={20} />
                                    ) : (
                                        <CheckIcon color={colors.text} size={30} />
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onPress={goToNextSection}
                                    style={{
                                        height: 50,
                                        gap: 10,
                                        width: 125,
                                        backgroundColor: colors.button,
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    background
                                >
                                    <Text className={textStyles.h3}>
                                        {nextSection}
                                    </Text>
                                </Button>
                            )}

                        </Animated.View>

                    </View>

                </BottomSheetView>

            </BottomSheet>

        </View>
    );
};

export default PostScreen;
