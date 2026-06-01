import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import PagerView from 'react-native-pager-view';
import Animated from 'react-native-reanimated';

import { Button } from '../../components/ButtonComponent';
import { SectionHeader } from '../../components/SectionComponent';
import { useTheme } from '@/provider/ThemeProvider';
import { usePost, usePostSteps } from '../../stores/usePost';
import { POST_SECTIONS_INDEX, PostSection } from '@/types';
import { DishMedia, DishInfo, Ingredients, Steps, Dietary, Nutrition } from '@/sections/post/exports';
import { AddIcon, EditIcon, BackIcon, XIcon, CheckIcon } from '@/icons/Icon';
import { useAvatarMood } from '@/dashboard/store/useAvatar';
import { useReward } from '@/dashboard/store/useReward';
import { SpinningLogoImage } from '@/utils/Logo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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

    const post = async () => {
        const result = await submit();

        if (result.success) {
            setMood('celebrating', 3000);
            reward('CREATE_POST');
        };
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

    return (
        <View style={StyleSheet.absoluteFillObject}>
            <View className="w-full flex-row p-1">
                <SectionHeader 
                    showDivider
                    subtitle="Create a new food tag with name, ingredients, and steps to your post." 
                />
            </View>

            <View className="w-full items-center justify-end flex-row p-1">
                {canPost && (
                    <View style={{ height: 60 }} className="flex-row justify-end items-center gap-5 px-5">
                        <Button onPress={reset}>
                            <Text className={textStyles.caption} style={{ color: colors.danger }}>
                                - reset
                            </Text>
                        </Button>

                        <Button
                            onPress={post}
                            background={loading ? false : true}
                            style={{ width: 100, height: 40, flexDirection: 'row', gap: 10, justifyContent: 'center' }}
                        >
                            {loading ? (
                                <SpinningLogoImage size={20} />
                            ) : (
                                <Text className={textStyles.bodyMedium}>+ post</Text>
                            )}
                        </Button>
                    </View>
                )}
            </View>

            <View style={{ flex: 1, paddingBottom: 125 }} className="w-full flex-row items-center justify-center p-1">
                <Button
                    onPress={() => overlayRef.current?.snapToIndex(0)}
                    style={{ width: 220, height: 350, borderRadius: 25, backgroundColor: colors.card }}
                >
                    {canPost ? <EditIcon color={colors.button} /> : <AddIcon color={colors.button} />}
                </Button>
            </View>

            <BottomSheet
                ref={overlayRef}
                snapPoints={[550]}
                bottomInset={125}
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
                        height: 530,
                        padding: 10,
                    }}
                >
                    <PagerView
                        ref={currentSectionRef}
                        style={{
                            height: 425,
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
                            paddingVertical: 20,
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

                </BottomSheetView>
            </BottomSheet>
        </View>
    );
};

export default PostScreen;
