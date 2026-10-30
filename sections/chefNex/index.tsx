import { useTheme } from "@/provider/ThemeProvider";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, TouchableOpacity, Dimensions } from "react-native";
import React from "react";
import { useOverlay } from "@/stores/useOverlay";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import ChefNexVoiceScreen from "./Voice";
import ChefNexImageScreen from "./Image";
import ChefNexChatScreen from "./Chat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon, MenuIcon, MessageIcon, MicIcon, PictureIcon, XIcon } from "@/icons/Icon";
import { GradientHeader } from "@/components/GradientComponent";
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";
import GomealGlassView from "@/components/GlassComponent";
import { usePermissions } from "@/provider/PermissionProvider";
import Disclaimer from "@/components/DisclaimerComponent";
import { NAV_SIZE } from "../Navigate";

const MENU_HEIGHT = 80;
const ChefNexMainScreen: React.FC<{isFocused?: boolean; dark?: boolean }> = ({ isFocused, dark }) => {

    const insets = useSafeAreaInsets();
    const { requestPermissions } = usePermissions();

    const [showMenu, setShowMenu] = React.useState(false);
    const { colors, textStyles} = useTheme(dark ? "dark" : undefined);

    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    const scrollY = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const SCROLL_TRAVEL = 50; // tune this

    const titleAnimatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [0, SCROLL_TRAVEL],
            [0, -SCROLL_TRAVEL],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollY.value,
            [0, SCROLL_TRAVEL * 0.6, SCROLL_TRAVEL],
            [1, 0.4, 0],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ translateY }],
            opacity,
        };
    });

    const bgImageAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [0, SCROLL_TRAVEL],
            [0.8, 0],
            Extrapolation.CLAMP
        );

        return { opacity };
    });

    const handleOpenImage = () => {
        requestPermissions({
            permissions: ["camera"],

            title: "Allow GoMeal to access your camera",

            description:
                "Camera access lets you take a photo and search for meals, ingredients, and steps with ChefNex. You can change this access later in Settings.",

            deniedDescription:
                "Camera access has been disabled. Enable Camera access for GoMeal in Settings to search for ingredients by image.",

            onGranted: async () => {
                openSlidingOverlay(
                    <ChefNexImageScreen
                        isActive={true}
                        dark
                        onClose={() => {
                            closeSlidingOverlay();
                        }}
                    />
                );
            },
        });
    };

    const handleOpenVoice = () => {
        requestPermissions({
            permissions: ["microphone"],

            title: "Allow GoMeal to access your microphone",

            description:
                "Microphone access lets you talk with ChefNex about meals, ingredients and steps using your voice. You can change this access later in Settings.",

            deniedDescription:
                "Microphone access has been disabled. Enable Microphone access for GoMeal in Settings to talk with ChefNex about meals, ingredients and steps",

            onGranted: async () => {
                openSlidingOverlay(
                    <ChefNexVoiceScreen
                        isActive={true}
                        dark={dark}
                        onClose={() => {
                            closeSlidingOverlay();
                        }}
                    />
                );
            },
        });
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.background,
            }}
        >
            {showMenu && (
                <Pressable
                    onPress={() => setShowMenu(false)}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 4,
                    }}
                />
            )}

            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={colors.background}
                style={{
                    width: "100%",
                    flexDirection: "column",
                    zIndex: 5,
                }}
            >
                <View
                    style={{
                        position: "absolute",
                        zIndex: 2,
                        paddingRight: 10,
                        right: 0
                    }}
                >
                    {/**
                    <ExpandingButton
                        expanded={showMenu}
                        onPress={() => setShowMenu(true)}
                        clearBackground
                        anchor="top-right"
                        expandedHeight={200}
                        borderRadius={20}
                        style={{
                            top: showMenu ? 70 : 0
                        }}
                        expandedStyle={{
                            flexDirection: "row",
                            justifyContent: "space-evenly",
                            paddingHorizontal: 8,
                        }}
                        expandedChildren={
                            <>
                                <Button
                                    clearBackground
                                    onPress={() => {
                                        setShowMenu(false);
                                        // 
                                    }}
                                >

                                </Button>

                                <Button
                                    clearBackground
                                    onPress={() => {
                                        setShowMenu(false);
                                        // 
                                    }}
                                >

                                </Button>

                                <Button clearBackground onPress={() => setShowMenu(false)}>
                                    <XIcon color={colors.text} />
                                </Button>
                            </>
                        }
                    >
                        <MenuIcon color={colors.text} />
                    </ExpandingButton>
                     */}

                </View>

                {/* Title Section */}
                <Animated.View 
                    style={[
                        { width: "100%" }, 
                        titleAnimatedStyle
                    ]}
                >
                    <Text
                        style={{
                            fontSize: 44,
                            fontWeight: "700",
                            paddingLeft: 15,
                            color: colors.text,
                        }}
                    >
                        Eat
                    </Text>
                    <Text
                        className={`font-luckiest-guy`}
                        style={{
                            fontSize: 58,
                            fontWeight: "800",
                            paddingLeft: 30,
                            color: colors.button,
                        }}
                    >
                        Smarter
                    </Text>
                    <Text
                        style={{
                            fontSize: 30,
                            fontWeight: "800",
                            textAlign: "right",
                            paddingRight: 30,
                            marginTop: -15,
                            color: colors.text,
                        }}
                    >
                        with ChefNex
                    </Text>

                </Animated.View>

            </GradientHeader>

            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    gap: 10,
                    paddingHorizontal: 10,
                    height: Dimensions.get("window").height + NAV_SIZE + insets.bottom
                }}
                scrollEnabled={true}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
    
                {/* Main Container Section (Voice, text, image) */}
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        height: 490,
                        width: "auto",
                        backgroundColor: colors.card,
                        borderBottomLeftRadius: 30,
                        borderBottomRightRadius: 30,
                        paddingTop: MENU_HEIGHT * 2,
                        flexDirection: "row",
                        overflow: "hidden",
                        padding: 10,
                        gap: 10,
                    }}
                >

                    <Animated.Image
                        source={require("../../assets/chefNex/mainscreen.png")}
                        resizeMode="none"
                        style={[StyleSheet.absoluteFillObject, bgImageAnimatedStyle]}
                    />

                    <GradientHeader
                        height={MENU_HEIGHT * 2}
                        baseColor={colors.background}
                    >
                        {null}
                    </GradientHeader>

                    {/**
                    <GomealGlassView
                        style={{
                            flex: 1,
                            borderRadius: 25,
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            padding: 14
                        }}
                    >
                        <View
                            style={{
                                position: "absolute",
                                top: 14,
                                left: 14,
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                backgroundColor: colors.card,
                                justifyContent: "center",
                                alignItems: "center"
                            }}
                        >
                            <MicIcon color={colors.text} size={20}/>
                        </View>
                        <Text
                            className={textStyles.sectionText}
                            style={{
                                width: 100,
                                marginBottom: 14,
                                fontSize: 15
                            }}
                        >
                            Speak with ChefNex about your next meal
                        </Text>
                        <Button
                            onPress={handleOpenVoice}
                            style={{
                                width: 125,
                                backgroundColor: colors.card,
                                flexDirection: "row",
                                gap: 10,
                            }}
                            background
                        >
                            <Text
                                className={textStyles.body}
                            >
                                Start
                            </Text>
                            <BackIcon color={colors.text} rotate={180} size={20} />
                        </Button>
                    </GomealGlassView>
                     */}

                    <View
                        style={{
                            flex: 1,
                            gap: 10,
                        }}
                    >
                        {/**
                        <GomealGlassView
                            style={{
                                flex: 1,
                                position: "static",
                                borderRadius: 25,
                                overflow: "hidden"
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    justifyContent: "flex-end"
                                }}
                            >
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 14,
                                        left: 14,
                                        width: 40,
                                        height: 40,
                                        borderRadius: 999,
                                        backgroundColor: colors.card,
                                        justifyContent: "center",
                                        alignItems: "center"
                                    }}
                                >
                                    <MessageIcon color={colors.text} />
                                </View>
                                <Text
                                    className={textStyles.sectionText}
                                    style={{
                                        width: 100,
                                        marginLeft: 24,
                                        marginBottom: 14,
                                        fontSize: 15
                                    }}
                                >
                                    Ask a Question
                                </Text>
                            </View>
                            <Button
                                style={{
                                    position: "absolute",
                                    bottom: 14,
                                    right: 14,
                                    backgroundColor: colors.card
                                }}
                                background
                            >
                                <BackIcon color={colors.text} rotate={180} size={20} />
                            </Button>
                        </GomealGlassView>
                         */}

                        <GomealGlassView
                            style={{
                                flex: 1,
                                position: "static",
                                borderRadius: 25,
                                overflow: "hidden"
                            }}
                        >
                            <View
                                style={{
                                    flex: 1,
                                    justifyContent: "flex-end"
                                }}
                            >
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 14,
                                        left: 14,
                                        width: 40,
                                        height: 40,
                                        borderRadius: 999,
                                        backgroundColor: colors.card,
                                        justifyContent: "center",
                                        alignItems: "center"
                                    }}
                                >
                                    <PictureIcon color={colors.text} size={20}/>
                                </View>
                                <Text
                                    className={textStyles.sectionText}
                                    style={{
                                        width: 200,
                                        marginLeft: 24,
                                        fontSize: 15
                                    }}
                                >
                                    Search by image, generate fields for post creation and find ingredients
                                </Text>
                                <Text
                                    className={textStyles.body}
                                    style={{
                                        color: colors.button,
                                        width: 100,
                                        marginLeft: 24,
                                        marginBottom: 14,
                                        fontSize: 15
                                    }}
                                >
                                    Beta
                                </Text>
                            </View>
                            <Button
                                onPress={handleOpenImage}
                                style={{
                                    position: "absolute",
                                    bottom: 14,
                                    right: 14,
                                    backgroundColor: colors.card
                                }}
                                background
                            >
                                <BackIcon color={colors.text} rotate={180} size={20} />
                            </Button>
                        </GomealGlassView>

                    </View>

                </TouchableOpacity>
                                
                <Disclaimer
                    dark={dark}
                    message="ChefNex uses generative AI to help you analyze images of food to generate names, and discover ingredients. AI-generated suggestions may be inaccurate or incomplete. Always verify ingredient information, food allergies, nutritional info and servings before posting or cooking a meal."
                />

            </Animated.ScrollView>

        </View>
    )

};

export default ChefNexMainScreen;