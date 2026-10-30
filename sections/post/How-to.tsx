import React, { useState } from "react";
import { Dimensions, Image, ImageSourcePropType, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { SectionHeader } from "@/components/SectionComponent";
import { useTheme } from "@/provider/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientHeader } from "@/components/GradientComponent";
import { useOverlay } from "@/stores/useOverlay";
import MediaPreview from "@/media/MediaPreview";

const { width, height } = Dimensions.get('window');

const HOW_TO_STEPS = [
    {
        index: "00",
        title: "Add your dish media",
        body: "Pick a photo or 5 second video of your dish to start your post.",
        src: require("@/assets/steps/step0.png"),
    },
    {
        index: "01",
        title: "Start with some info",
        body: "Enter basic details like your dish name, description, and difficulty to prepare (red for hard, yellow for medium, green for easy).",
        src: require("@/assets/steps/step1.png"),
    },
    {
        index: "02",
        title: "List ingredients used",
        body: "Search for the ingredients, click to add it, enrich with the quantity used and in what unit.",
        src: require("@/assets/steps/step2.png"),
    },
    {
        index: "03",
        title: "Write the steps taken",
        body: "Tap the empty box icon, to get the first steps box, then type steps taken. Enrich with timer and media",
        src: require("@/assets/steps/step4.png"),
    },
    {
        index: "04",
        title: "Set the dietary info",
        body: "Select the dietary specifications that are applicable to your dish",
        src: require("@/assets/steps/step5.png"),
    },
    {
        index: "05",
        title: "Set the Nutritional info",
        body: "Select the servings size",
        src: require("@/assets/steps/step6.png"),
    },
] as const;

const HowToPage: React.FC<{ dark?: boolean }> = ({ dark }) => {

    const insets = useSafeAreaInsets();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const openOverlay = useOverlay((s) => s.openOverlay);
    const closeOverlay = useOverlay((s) => s.closeOverlay);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            <GradientHeader
                height={60}
                baseColor={colors.background}
            >
                <SectionHeader
                    title="How to make a post"
                    subtitle="Create a GoMeal food tag one simple section at a time."
                    showDivider
                />
            </GradientHeader>

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={{
                    paddingTop: 90
                }}
            >
                <TouchableOpacity 
                    activeOpacity={1}
                    style={{
                        paddingVertical: 4,
                        gap: 12,                      
                    }}
                >
                    <View
                        className="w-full flex-row items-center justify-between p-3"
                        style={{
                            minHeight: 92,
                            borderRadius: 25,
                            backgroundColor: colors.card,
                            flexDirection: "column",
                            alignItems: "flex-start",
                        }}
                    >
                        <Text className={textStyles.h2}>Start with the empty box</Text>
                        <Text className={textStyles.body} style={{ color: colors.secondaryText }}>
                            To make a post you need to complete a picture in dish media; name, comments and difficulty in info;
                            quantity and unit are optional but recommended in ingredients; description, timer and media in steps;
                            and servings in nutrition.
                        </Text>
                    </View>

                    <View
                        style={{
                            padding: 10
                        }}
                    >

                        <Text className={textStyles.body} style={{ color: colors.secondaryText }}>
                            Tap the red button to close the modal, move section by section, then post when the green button is ready.
                        </Text>

                        <Image
                            source={require("@/assets/steps/steps_nav.png")}
                            resizeMode="contain"
                            style={{
                                width: "100%",
                                height: 60,
                                marginTop: 8,
                                marginBottom: 4,
                            }}
                        />

                    </View>

                    {HOW_TO_STEPS.map((step) => (
                        <View
                            key={step.title}
                            className="w-full flex-row items-center p-3 gap-3"
                            style={{
                                minHeight: 132,
                            }}
                        >
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                    <Text className={textStyles.caption} style={{ color: colors.button }}>
                                        {step.index}
                                    </Text>

                                    <Text className={textStyles.bodyMedium}>
                                        {step.title}
                                    </Text>
                                </View>

                                <Text className={textStyles.body} style={{ color: colors.secondaryText, marginTop: 5 }}>
                                    {step.body}
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => {
                                    openOverlay(
                                        undefined,
                                        <MediaPreview
                                            dark={dark}
                                            media={[
                                                {
                                                    uri: step.src,
                                                    mediaType: "image",
                                                },
                                            ]}
                                        />
                                        ,
                                    );
                                }}
                                style={{
                                    width: 92,
                                    height: 108,
                                    borderRadius: 16,
                                    overflow: "hidden",
                                    backgroundColor: colors.secondaryCard,
                                }}
                            >
                                <Image
                                    source={step.src}
                                    resizeMode="cover"
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                    }}
                                />
                            </Pressable>
                        </View>
                    ))}

                </TouchableOpacity>

            </ScrollView>


        </View>
    );
};

export default HowToPage;