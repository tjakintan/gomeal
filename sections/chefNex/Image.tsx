import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle, ScrollView } from "react-native";

import {
    BackIcon,
    LevelIcon,
    TagIcon,
    MorePostIcon,
    AICameraIcon,
    FlashlightEnabledIcon,
    FlashlightNotEnabledIcon,
    PostIcon,
    RefreshIcon,
    ThumbsDownActiveIcon,
    ThumbsDownInactiveIcon,
    ThumbsUpActiveIcon,
    ThumbsUpInactiveIcon
} from "@/icons/Icon";

import { capitalize } from "@/utils/text";
import { ACCENT_COLORS } from "@/types";
import { useTheme } from "@/provider/ThemeProvider";
import { Button, Gesture, SPRING } from "@/components/ButtonComponent";
import { GradientHeader } from "@/components/GradientComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getScreenCornerRadius } from 'expo-screen-corners';
import { useBottomSheet } from "@/stores/useBottomSheet";
import { errorMessage, useChefNexImage } from "@/stores/chefNex/useChefNexImage";

import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";

import { PostScreen } from "@/sections";
import { usePost } from '../../stores/usePost';

import Tag, { EmptyTag } from "@/tags/Tag";
import { useFeed } from "@/stores/useFeed";

import { GroceryPickerScreen } from "../user/grocery";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";

import {
    Camera,
    useCameraDevice,
    usePhotoOutput,
    CommonResolutions,
    CameraOrientation
} from "react-native-vision-camera";

import { ChefNexBoundingBox, ChefNexDetectedItem, ChefNexFeedbackReason } from "@/types/chefNex.types";

import Reanimated, {
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import GomealGlassView from "@/components/GlassComponent";

import {
    Canvas,
    RoundedRect,
    BlurMask,
} from "@shopify/react-native-skia";

import { useBanner } from "@/stores/useBanner";
import { FeedCard, FullPost } from "@/types/feed.types";
import { SectionHeader } from "@/components/SectionComponent";
import { CookMainScreen } from "../cook";
import { openCookOverlay } from "../cook/openCook";
import { usePostHog } from "posthog-react-native";
import { wakeChefNex } from "@/api/chefNex.api";


const MENU_HEIGHT = 65;


const Glow: React.FC<{
    width: number;
    height: number;
    radius: number;
    active: boolean;
    color: string;
}> = ({
    width,
    height,
    radius,
    active,
    color,
}) => {
    const glow = useSharedValue(0);

    useEffect(() => {
        if (active) {
            glow.value = withRepeat(
                withSequence(
                    withTiming(1, {
                        duration: 900,
                    }),
                    withTiming(0.25, {
                        duration: 900,
                    })
                ),
                -1,
                false
            );
        } else {
            glow.value = withTiming(0, {
                duration: 250,
            });
        }
    }, [active]);

    if (width <= 0 || height <= 0) {
        return null;
    }

    const BLEED = 24;

    return (
        <Canvas
            pointerEvents="none"
            style={{
                position: "absolute",

                /*
                 * Make the Canvas larger than the screen so the
                 * BlurMask has room to render.
                 */
                left: -BLEED,
                top: -BLEED,
                width: width + BLEED * 2,
                height: height + BLEED * 2,

                zIndex: 11,
            }}
        >
            {/* =========================================
                IDLE BORDER
            ========================================= */}

            <RoundedRect
                x={BLEED + 1}
                y={BLEED + 1}
                width={width - 2}
                height={height - 2}
                r={radius}
                style="stroke"
                strokeWidth={2}
                color={color}
            />

            {/* =========================================
                BIG SOFT GLOW
            ========================================= */}

            {active && (
                <RoundedRect
                    x={BLEED + 1}
                    y={BLEED + 1}
                    width={width - 2}
                    height={height - 2}
                    r={radius}
                    style="stroke"
                    strokeWidth={5}
                    color={color}
                    opacity={glow}
                >
                    <BlurMask
                        blur={18}
                        style="normal"
                    />
                </RoundedRect>
            )}

            {/* =========================================
                MEDIUM GLOW
            ========================================= */}

            {active && (
                <RoundedRect
                    x={BLEED + 1}
                    y={BLEED + 1}
                    width={width - 2}
                    height={height - 2}
                    r={radius}
                    style="stroke"
                    strokeWidth={3}
                    color={color}
                    opacity={glow}
                >
                    <BlurMask
                        blur={8}
                        style="normal"
                    />
                </RoundedRect>
            )}

            {/* =========================================
                BRIGHT CORE
            ========================================= */}

            {active && (
                <RoundedRect
                    x={BLEED + 1}
                    y={BLEED + 1}
                    width={width - 2}
                    height={height - 2}
                    r={radius}
                    style="stroke"
                    strokeWidth={2}
                    color={color}
                    opacity={glow}
                />
            )}
        </Canvas>
    );
};


const Points: React.FC<{
    box: ChefNexBoundingBox;
    frameWidth: number;
    frameHeight: number;

    dark?: boolean;

    containerWidth: number;
    containerHeight: number;

    expanded: boolean;
    onPress?: () => void;

    orientation: CameraOrientation;

    children: React.ReactNode;
    expandedChildren?: React.ReactNode;

    collapsedSize?: number;
    expandedWidth?: number;

    maxExpandedHeight?: number;
    expandedContentHeight?: number;

    cornerLength?: number;
    cornerThickness?: number;
}> = ({
    box,
    frameWidth,
    frameHeight,

    containerWidth,
    containerHeight,

    orientation,

    dark,

    expanded,
    onPress,
    children,
    expandedChildren,

    collapsedSize = 40,
    expandedWidth = 175,

    maxExpandedHeight = 270,
    expandedContentHeight = 105,

    cornerLength = 32,
    cornerThickness = 5,
}) => {

    const { colors } = useTheme(dark ? "dark" : undefined);
    const width = useSharedValue(collapsedSize);
    const height = useSharedValue(collapsedSize);

    const targetExpandedHeight = Math.min(
        expandedContentHeight,
        maxExpandedHeight
    );

    const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

    useEffect(() => {
        width.value = withSpring(
            expanded ? expandedWidth : collapsedSize,
            SPRING
        );

        height.value = withSpring(
            expanded ? targetExpandedHeight : collapsedSize,
            SPRING
        );
    }, [
        expanded,
        expandedWidth,
        expandedContentHeight,
        maxExpandedHeight,
        collapsedSize,
        targetExpandedHeight,
    ]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: width.value,
        height: height.value,
    }));

    const [x1, y1, x2, y2] = box;

    /*
    * Detection center in the original captured frame.
    * NOTE: frameWidth/frameHeight are always the sensor's native
    * landscape dimensions (e.g. 1920x1080), regardless of the
    * device's physical orientation. Since the container is portrait,
    * we have to rotate the box into portrait space before scaling.
    */
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

    /*
    * Rotate frame-space coordinates 90° into portrait space.
    * Sensor landscape (frameWidth x frameHeight) becomes portrait
    * (frameHeight x frameWidth) once rotated.
    */
    const rotatedFrameWidth = frameHeight;
    const rotatedFrameHeight = frameWidth;

    const rotatedCenterX = frameHeight - centerY;
    const rotatedCenterY = centerX;

    /*
    * Map rotated frame coordinates → camera preview coordinates.
    *
    * The camera preview behaves like aspect-fill, meaning the image
    * is scaled until the entire container is covered. The excess
    * area is cropped.
    */
    const scale = Math.max(
        containerWidth / rotatedFrameWidth,
        containerHeight / rotatedFrameHeight,
    );

    const displayedWidth = rotatedFrameWidth * scale;
    const displayedHeight = rotatedFrameHeight * scale;

    const offsetX =
        (containerWidth - displayedWidth) / 2;

    const offsetY =
        (containerHeight - displayedHeight) / 2;

    const pointX =
        rotatedCenterX * scale + offsetX;

    const pointY =
        rotatedCenterY * scale + offsetY;

    /*
     * How much room do we have around the detection?
     */
    const spaceLeft = pointX;
    const spaceRight = containerWidth - pointX;
    const spaceTop = pointY;
    const spaceBottom = containerHeight - pointY;

    /*
     * Pick the direction that can actually fit the card.
     *
     * We prioritize the side with the most available space,
     * but only use a side if the expanded card can fit there.
     */
    const canExpandRight =
        spaceRight >= expandedWidth;

    const canExpandLeft =
        spaceLeft >= expandedWidth;

    const canExpandDown =
        spaceBottom >= targetExpandedHeight;

    const canExpandUp =
        spaceTop >= targetExpandedHeight;

    let expansionDirection:
        | "right"
        | "left"
        | "down"
        | "up" = "right";

    if (canExpandRight && canExpandLeft) {
        expansionDirection =
            spaceRight >= spaceLeft ? "right" : "left";
    } else if (canExpandRight) {
        expansionDirection = "right";
    } else if (canExpandLeft) {
        expansionDirection = "left";
    } else if (canExpandDown && canExpandUp) {
        expansionDirection =
            spaceBottom >= spaceTop ? "down" : "up";
    } else if (canExpandDown) {
        expansionDirection = "down";
    } else if (canExpandUp) {
        expansionDirection = "up";
    } else {
        /*
         * Nothing fits completely.
         * Pick the direction with the most space.
         */
        const spaces = {
            right: spaceRight,
            left: spaceLeft,
            down: spaceBottom,
            up: spaceTop,
        };

        expansionDirection = (
            Object.entries(spaces)
                .sort((a, b) => b[1] - a[1])[0][0]
        ) as typeof expansionDirection;
    }

    /*
     * The collapsed point remains centered on the detection.
     *
     * When expanded, however, we change the anchor so the card
     * grows AWAY from the nearest edge.
     */
    const getPositionStyle = (): ViewStyle => {
        if (!expanded) {
            return {
                position: "absolute",
                left: pointX - collapsedSize / 2,
                top: pointY - collapsedSize / 2,
                width: collapsedSize,
                height: collapsedSize,
            };
        }

        switch (expansionDirection) {
            case "right":
                return {
                    position: "absolute",

                    /*
                     * Keep the LEFT edge at the detection point.
                     */
                    left: pointX,
                    top: pointY - targetExpandedHeight / 2,

                    width: expandedWidth,
                    height: targetExpandedHeight,
                };

            case "left":
                return {
                    position: "absolute",

                    /*
                     * Keep the RIGHT edge at the detection point.
                     */
                    left: pointX - expandedWidth,
                    top: pointY - targetExpandedHeight / 2,

                    width: expandedWidth,
                    height: targetExpandedHeight,
                };

            case "down":
                return {
                    position: "absolute",

                    left: pointX - expandedWidth / 2,
                    top: pointY,

                    width: expandedWidth,
                    height: targetExpandedHeight,
                };

            case "up":
                return {
                    position: "absolute",

                    left: pointX - expandedWidth / 2,
                    top: pointY - targetExpandedHeight,

                    width: expandedWidth,
                    height: targetExpandedHeight,
                };
        }
    };

    return (
        <View
            pointerEvents="box-none"
            style={[
                getPositionStyle(),
                {
                    zIndex: expanded ? 1000 : 100,
                },
            ]}
        >
            <Gesture scaleAmount={0.97}>
                <AnimatedPressable
                    onPress={onPress}
                    disabled={expanded}
                    hitSlop={10}
                    style={[
                        animatedStyle,
                        {
                            position: "relative",
                            alignItems: "center",
                            justifyContent: "center",
                        },
                    ]}
                >
                    {!expanded ? (
                        <View
                            style={{
                                width: collapsedSize,
                                height: collapsedSize,
                                borderRadius: collapsedSize / 2,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: colors.text,
                            }}
                        >
                            {children}
                        </View>
                    ) : (
                        <>
                            {/* TOP LEFT */}
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: cornerLength,
                                    height: cornerLength,
                                    borderTopWidth: cornerThickness,
                                    borderLeftWidth: cornerThickness,
                                    borderColor: colors.text,
                                    borderTopLeftRadius: 5,
                                }}
                            />

                            {/* TOP RIGHT */}
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: cornerLength,
                                    height: cornerLength,
                                    borderTopWidth: cornerThickness,
                                    borderRightWidth: cornerThickness,
                                    borderColor: colors.text,
                                    borderTopRightRadius: 5,
                                }}
                            />

                            {/* BOTTOM LEFT */}
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    width: cornerLength,
                                    height: cornerLength,
                                    borderBottomWidth: cornerThickness,
                                    borderLeftWidth: cornerThickness,
                                    borderColor: colors.text,
                                    borderBottomLeftRadius: 5,
                                }}
                            />

                            {/* BOTTOM RIGHT */}
                            <View
                                pointerEvents="none"
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    right: 0,
                                    width: cornerLength,
                                    height: cornerLength,
                                    borderBottomWidth: cornerThickness,
                                    borderRightWidth: cornerThickness,
                                    borderColor: colors.text,
                                    borderBottomRightRadius: 5,
                                }}
                            />

                            <View
                                style={{
                                    flex: 1,
                                    width: "100%",
                                    height: "100%",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {expandedChildren}
                            </View>
                        </>
                    )}
                </AnimatedPressable>
            </Gesture>
        </View>
    );
};


const SimilarPosts: React.FC<{
    postIds: number[];
    label: string;
    dark?: boolean;
    onSelectPost: (post: FullPost) => void;
}> = ({ postIds, dark, label, onSelectPost }) => {
    
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const loadPost = useFeed((s) => s.loadPost);

    const [posts, setPosts] = useState<FullPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);

            const loaded = await Promise.all(
                postIds.map((id) => loadPost(id))
            );

            if (cancelled) return;

            setPosts(
                loaded.filter((p): p is FullPost => p !== null)
            );
            setLoading(false);
        };

        load();

        return () => { cancelled = true; };
    }, [postIds]);

    return (
        <View style={{ flex: 1, gap: 10 }}>
            
            <SectionHeader
                title={`Find posts similar to ${label}`}
                titleClassName={textStyles.sectionText}
                dark={dark}
                showDivider
                leftIcon={<PostIcon color={colors.button} size={24} />}
            />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 20, paddingHorizontal: 10 }}
            >
                {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <EmptyTag key={i} delay={i * 150} />
                    ))
                    : posts.map((post) => (
                        <Tag
                            key={post.post_id}
                            dark={dark}
                            card={post as unknown as FeedCard}
                            height={260}
                            width={175}
                            onPressMedia={() => onSelectPost(post)}
                            onPressInfo={() => onSelectPost(post)}
                        />
                    ))
                }
            </ScrollView>
        </View>
    );
};


const FEEDBACK_REASONS: { value: ChefNexFeedbackReason; label: string }[] = [
    { value: "wrong_item", label: "Wrong item" },
    { value: "wrong_box", label: "Box in wrong place" },
    { value: "wrong_ingredients", label: "Wrong ingredients" },
    { value: "other", label: "Something else" },
];

const FeedbackSheet: React.FC<{
    label: string;
    showIngredientReason: boolean;
    dark?: boolean;
    onSelect: (reason: ChefNexFeedbackReason) => void;
}> = ({ label, showIngredientReason, dark, onSelect }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const reasons = FEEDBACK_REASONS.filter(
        (r) => showIngredientReason || r.value !== "wrong_ingredients"
    );

    return (
        <View style={{ flex: 1, gap: 10 }}>
            <SectionHeader
                title={`What's wrong with ${label}?`}
                titleClassName={textStyles.sectionText}
                dark={dark}
                showDivider
                leftIcon={<ThumbsDownActiveIcon color={colors.button} size={24} />}
            />

            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                }}
            >
                {reasons.map((r) => (
                    <Button
                        key={r.value}
                        background
                        onPress={() => onSelect(r.value)}
                        style={{
                            paddingHorizontal: 16,
                            height: 40,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: colors.text }} className={textStyles.small}>
                            {r.label}
                        </Text>
                    </Button>
                ))}
            </View>
        </View>
    );
};


const ChefNexImageScreen: React.FC<{
    isActive?: boolean;
    dark?: boolean;
    onClose?: () => void;
}> = ({ isActive, dark, onClose }) => {

    const posthog = usePostHog();

    const banner = useBanner();
    const insets = useSafeAreaInsets();
    const radius = getScreenCornerRadius();

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const results = useChefNexImage((state) => state.results);
    const similar_post_ids = useChefNexImage((state) => state.similar_post_ids);
    

    const error = useChefNexImage((state) => state.error);
    const clearError = useChefNexImage((state) => state.clearError);


    const lastHeartbeatRef = useRef(0);
    const [warmingUp, setWarmingUp] = useState(false);


    const status = useChefNexImage((state) => state.status);
    const awaitingResult = useChefNexImage((state) => state.awaitingResult);


    const feedback = useChefNexImage((s) => s.feedback);
    const sendFeedback = useChefNexImage((s) => s.sendFeedback);


    const connect = useChefNexImage((state) => state.connect);
    const disconnect = useChefNexImage((state) => state.disconnect);
    const startStreaming = useChefNexImage((state) => state.startStreaming);
    const stopStreaming = useChefNexImage((state) => state.stopStreaming);
    const reset = useChefNexImage((state) => state.reset);


    const [showPoints, setShowPoints] = useState(true);
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [cameraLayout, setCameraLayout] = React.useState({
        width: 0,
        height: 0,
    });


    const [orientation, setOrientation] = useState<CameraOrientation>("up");
    const [expandedId, setExpandedId] = React.useState<number | null>(null);


    // overlays
    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);


    // bottom sheet 
    const openBottomSheet = useBottomSheet((state) => state.openBottomSheet);
    const closeBottomSheet = useBottomSheet((state) => state.closeBottomSheet);


    const device = useCameraDevice("back");
    const photoOutput = usePhotoOutput({
        targetResolution: CommonResolutions.VGA_16_9,
        containerFormat: "jpeg",
    });


    // functions
    const openCartWithIngs = (item: ChefNexDetectedItem) => {
        const ingredients =
            item.ingredient?.ingredients
                ?.filter(
                    (ingredient) =>
                        ingredient.id != null
                )
                .map((ingredient) => ({
                    id: Number(ingredient.id),
                    name: ingredient.name,
                    quantity: 1,
                    unit: null,
                    category: ingredient.category ?? null,
                    media_url: ingredient.media_url ?? null,
                    price: ingredient.price ?? null,
                })) ?? [];

        if (!ingredients.length) return;

        openSlidingOverlay(
            <GroceryPickerScreen
                ingredients={ingredients}
                dark={dark}
                onIngredientsAdded={() => {
                    setExpandedId(null);
                }}
                onClose={() => {
                    closeSlidingOverlay();
                }}
            />
        );
    };


    const openFeedbackSheet = (item: ChefNexDetectedItem) => {
        openBottomSheet(
            <FeedbackSheet
                label={capitalize(item.label)}
                showIngredientReason={!!item.ingredient?.ingredients?.length}
                dark={dark}
                onSelect={async (reason) => {
                    closeBottomSheet();
                    const ok = await sendFeedback(item, -1, reason);
                    if (!ok) banner.error("Couldn't send feedback.");
                }}
            />,
            [260 + insets.bottom],
            1,
            undefined,
            undefined,
            dark
        );
    };


    const rateItem = async (item: ChefNexDetectedItem, rating: 1 | -1) => {
        const ok = await sendFeedback(item, rating);
        if (!ok) {
            banner.error("Couldn't send feedback.");
            return;
        }
        if (rating === -1) openFeedbackSheet(item);
    };


    const setInfo = usePost((state) => state.setInfo);
    const setMedia = usePost((state) => state.setMedia);
    const addIngredient = usePost((state) => state.addIngredient);
    const openPostWithPhoto = async () => {
        if (!cameraReady || isCapturingRef.current) {
            return;
        }

        isCapturingRef.current = true;

        try {
            setExpandedId(null);
            setShowPoints(false);
            stopStreaming();

            await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve())
            );

            const photo = await photoOutput.capturePhoto(
                {
                    enableShutterSound: true,
                    flashMode: "off",
                },
                {}
            );

            setShowPoints(true);

            const arrayBuffer = await photo.getFileDataAsync();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const fileUri = `${FileSystem.cacheDirectory}gomeal_${Date.now()}.jpg`;

            await FileSystem.writeAsStringAsync(
                fileUri,
                base64,
                {
                    encoding: FileSystem.EncodingType.Base64,
                }
            );

            setMedia(fileUri, "image");
            const dishName = results
                .map((item) => item.label?.trim())
                .filter((label): label is string => Boolean(label))
                .map((label) => capitalize(label))
                .join(" & ");
            if (dishName) {
                setInfo({
                    ...usePost.getState().info,
                    dish_name: dishName,
                });
            }
            results.forEach((item) => {
                item.ingredient?.ingredients
                    ?.filter((ing) => ing.id != null)
                    .forEach((ing) => {
                        addIngredient({
                            id: Number(ing.id),
                            name: ing.name,
                            category: ing.category ?? "",
                            media_url: ing.media_url ?? null,
                        });
                    });
            });

            photo.dispose();

            openSlidingOverlay(
                <PostScreen
                    onClose={() => closeSlidingOverlay()}
                />
            );

        } catch (error) {
            banner.error("Couldn't capture the photo. Try again.");

            setShowPoints(true);
        } finally {
            isCapturingRef.current = false;
        }
    };


    // Sequenced capture loop — never fires the next capture until the
    // previous one (capture + read + dispose) has fully finished.
    const [cameraReady, setCameraReady] = useState(false);
    const isCapturingRef = useRef(false);


    const connectWithWarmup = async (isCancelled: () => boolean) => {
        wakeChefNex().catch(() => {});             // no-op server-side if the GPU is up
        const t0 = Date.now();
        let delay = 2000;
        while (!isCancelled() && Date.now() - t0 < 5 * 60_000) {
            await connect();
            if (isCancelled()) return false;
            if (useChefNexImage.getState().isConnected) {
                if (Date.now() - t0 > 4000) {
                    posthog.capture("[ChefNex] => warmup_finished", { seconds: Math.round((Date.now() - t0) / 1000) });
                }
                setWarmingUp(false);
                return true;
            }
            setWarmingUp(true);
            await new Promise((r) => setTimeout(r, delay));
            delay = Math.min(delay * 1.5, 15000);
        }
        setWarmingUp(false);
        return false;
    };


    useEffect(() => {
        if (!isActive) return;
        let cancelled = false;
        posthog.capture("[ChefNex] => screen_opened");
        (async () => {
            const ok = await connectWithWarmup(() => cancelled);
            if (cancelled) return;
            if (ok) startStreaming();
            else banner.error("ChefNex is unavailable right now. Try again in a few minutes.");
        })();
        return () => { cancelled = true; reset(); setWarmingUp(false); setExpandedId(null); };
    }, [isActive, connect, startStreaming, stopStreaming, disconnect]);


    useEffect(() => {
        if (!isActive || !cameraReady) return;
        let cancelled = false;

        const loop = async () => {
            while (!cancelled) {
                if (!useChefNexImage.getState().isStreaming) {
                    await new Promise((resolve) => setTimeout(resolve, 250));
                    continue;
                }

                if (!isCapturingRef.current) {
                    isCapturingRef.current = true;
                    try {
                        const photo = await photoOutput.capturePhoto({ enableShutterSound: false, flashMode: "off" }, {});
                        setOrientation(photo.orientation);
                        const bytes = await photo.getFileDataAsync();
                        useChefNexImage.getState().submitFrame(bytes, photo.width, photo.height);
                        // Analytics from lambda to start a cn-server
                        const now = Date.now();
                        if (now - lastHeartbeatRef.current > 30_000) {
                            lastHeartbeatRef.current = now;
                            posthog.capture("[ChefNex] => scan_active");
                        }
                        photo.dispose();
                    } catch (err) {
                        //console.error("[chefNex] capture failed:", err);
                    } finally {
                        isCapturingRef.current = false;
                    }
                }
            }
        };

        loop();

        return () => { cancelled = true; };
    }, [isActive, cameraReady, photoOutput]);


    useEffect(() => {
        if (!isActive) return;
        let cancelled = false;

        const start = async () => {
            await connect();
            if (cancelled) return;
            if (!useChefNexImage.getState().isConnected) return;
            startStreaming();
        };

        start();

        return () => {
            cancelled = true;
            reset();
            setExpandedId(null);
        };
    }, [isActive, connect, startStreaming, stopStreaming, disconnect]);


    useEffect(() => {
        if (!error) return;
        if (warmingUp) { clearError(); return; }
        banner.error(errorMessage(error));
        clearError(); // mark as shown so the same message can re-fire later
    }, [error]);
    

    return (
        <View
            style={{
                ...StyleSheet.absoluteFillObject,
            }}
        >

            <View
                style={StyleSheet.absoluteFill}
                onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    setCameraLayout({
                        width,
                        height,
                    });
                }}
            >
                {isActive && device && (
                    <Camera
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={isActive}
                        torchMode={torchEnabled ? "on" : "off"}
                        outputs={[photoOutput]}
                        onConfigured={() => setCameraReady(true)}
                    />
                )}

                {showPoints && cameraLayout.width > 0 && cameraLayout.height > 0 &&
                    results.map((item) => {

                        const ingredientCount = item.ingredient?.ingredients?.length ?? 0;
                        const expandedContentHeight =
                            42 +                    // top header
                            10 +                    // spacing
                            ingredientCount * 22 +  // ingredient rows
                            42;                     // bottom button

                        const voted = feedback[`${item.frameId}:${item.id}`];   // 1 | -1 | undefined
                        
                        return (
                            <Points
                                key={item.id}
                                box={item.box}

                                dark={dark}

                                orientation={orientation}

                                frameWidth={item.frameWidth}
                                frameHeight={item.frameHeight}

                                containerWidth={cameraLayout.width}
                                containerHeight={cameraLayout.height}

                                expanded={expandedId === item.id}
                                onPress={() => setExpandedId(item.id)}

                                expandedWidth={215}
                                maxExpandedHeight={270}
                                expandedContentHeight={expandedContentHeight}

                                cornerLength={30}
                                collapsedSize={20}
                                cornerThickness={2}
                                expandedChildren={
                                    <GomealGlassView
                                        style={{
                                            width: "96%",
                                            height: "96%",
                                            borderRadius: 3,
                                            overflow: "hidden",
                                        }}
                                        glassEffectStyle="none"
                                    >
                                        <View
                                            style={{
                                                flex: 1,
                                                width: "100%",
                                            }}
                                        >
                                            <GradientHeader
                                                height={42}
                                                fadeSteps={[0.5, 0]}
                                                baseColor={colors.background}
                                                direction="top"
                                                contentStyle={{
                                                    height: 42,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    paddingHorizontal: 5,
                                                }}
                                            >
                                                <ScrollView
                                                    style={{
                                                        flex: 1,
                                                    }}
                                                    contentContainerStyle={{
                                                        flexDirection: "row",
                                                        alignItems: "flex-end",
                                                        paddingBottom: 2,
                                                        gap: 4,
                                                    }}
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                >
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <TagIcon size={20} color={colors.text} />
                                                        <Text
                                                            style={{
                                                                color: colors.text,
                                                                fontWeight: "700",
                                                                fontSize: 16,
                                                            }}
                                                            className={textStyles.caption}
                                                        >
                                                            {capitalize(item.label)}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <LevelIcon size={17} color={colors.secondaryText} />
                                                        {item.ingredient?.confidence != null && (
                                                            <Text
                                                                className={textStyles.small}
                                                            >
                                                                {Math.round(
                                                                    item.ingredient.confidence * 100
                                                                )}%
                                                            </Text>
                                                        )}
                                                    </View>
                                                </ScrollView>

                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4 }}>
                                                    <Button onPress={() => rateItem(item, 1)} style={{ padding: 0 }}>
                                                        {voted === 1
                                                            ? <ThumbsUpActiveIcon size={20} color={colors.button} />
                                                            : <ThumbsUpInactiveIcon size={20} color={colors.text} />}
                                                    </Button>

                                                    <Button onPress={() => rateItem(item, -1)} style={{ padding: 0 }}>
                                                        {voted === -1
                                                            ? <ThumbsDownActiveIcon size={20} color={colors.button} />
                                                            : <ThumbsDownInactiveIcon size={20} color={colors.text} />}
                                                    </Button>
                                                </View>

                                            </GradientHeader>

                                            <ScrollView
                                                style={{
                                                    flex: 1,
                                                    width: "100%",
                                                }}
                                                contentContainerStyle={{
                                                    paddingTop: 35,
                                                    paddingBottom: 45,
                                                    paddingHorizontal: 5,
                                                    gap: 5,
                                                }}
                                                showsVerticalScrollIndicator={false}
                                                nestedScrollEnabled
                                            >
                                                <View
                                                    style={{                                                  
                                                    }}
                                                >
                                                    {item.ingredient?.ingredients?.map(
                                                        (ingredient) => (
                                                            <View
                                                                key={ingredient.id}
                                                                style={{
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    justifyContent: "space-between",
                                                                    minHeight: 22,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: colors.text,
                                                                        fontSize: 12,
                                                                        fontWeight: "500",
                                                                        flex: 1,
                                                                    }}
                                                                    numberOfLines={1}
                                                                >
                                                                    {capitalize(ingredient.name)}
                                                                </Text>

                                                                <Text
                                                                    style={{
                                                                        color: colors.secondaryText,
                                                                        fontSize: 10,
                                                                        marginLeft: 5,
                                                                    }}
                                                                    className={textStyles.small}
                                                                >
                                                                    {Math.round(
                                                                        (ingredient.confidence ?? 0) * 100
                                                                    )}%
                                                                </Text>
                                                            </View>
                                                        )
                                                    )}
                                                </View>
                                            </ScrollView>

                                            {item.ingredient?.ingredients?.length ? (
                                                <GradientHeader
                                                    height={42}
                                                    fadeSteps={[0.5, 0]}
                                                    baseColor={colors.background}
                                                    direction="bottom"
                                                    contentStyle={{
                                                        height: 42,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        paddingBottom: 7,
                                                    }}
                                                >
                                                    <Button
                                                        style={{
                                                            width: 130,
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 5,
                                                        }}
                                                        background
                                                        onPress={() => openCartWithIngs(item)}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: colors.text,
                                                                textAlignVertical: "center",
                                                                includeFontPadding: false,
                                                            }}
                                                            className={textStyles.sectionText}
                                                        >
                                                            add to cart
                                                        </Text>

                                                        <BackIcon
                                                            size={20}
                                                            rotate={180}
                                                            color={colors.text}
                                                        />
                                                    </Button>
                                                </GradientHeader>
                                            ) : null}

                                        </View>
                                    </GomealGlassView>
                                }
                            >
                                {null}
                            </Points>
                        )
                    })
                }

                {expandedId !== null && (
                    <Pressable
                        onPress={() => setExpandedId(null)}
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                zIndex: 900,
                            },
                        ]}
                    />
                )}

            </View>

            {cameraLayout.width > 0 && cameraLayout.height > 0 && (awaitingResult || warmingUp) && (
                <Glow
                    width={cameraLayout.width}
                    height={cameraLayout.height}
                    radius={radius}
                    color={warmingUp ? ACCENT_COLORS.teal : colors.button}
                    active={true}
                />
            )}

            <GradientHeader
                height={MENU_HEIGHT}
                baseColor={"transparent"}
                direction="top"
                style={{
                    paddingTop: insets.top,
                }}
                contentStyle={{
                    height: MENU_HEIGHT,
                    paddingHorizontal: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
                zIndex={10}
            >
                {/* LEFT */}
                <View
                    style={{
                        width: 40,
                        alignItems: "flex-start",
                        justifyContent: "center",
                    }}
                >
                    <Button
                        onPress={() => {
                            reset();
                            onClose?.();
                        }}
                        clearBackground
                    >
                        <BackIcon color={colors.text} />
                    </Button>
                </View>

                <Text
                    className={textStyles.sectionText}
                    style={{
                        color: colors.text,
                        textAlign: "center",
                        flex: 1,
                    }}
                    pointerEvents="none"
                >
                    Find ingredients...
                </Text>

                <View
                    style={{
                        width: 40,
                        alignItems: "flex-end",
                        justifyContent: "center",
                    }}
                >
                    <Button
                        onPress={() => {
                            setTorchEnabled((c) => !c)
                        }}
                        clearBackground
                    >
                        {!torchEnabled ? (
                            <FlashlightEnabledIcon
                                size={24}
                                color={colors.text}
                            />
                        ) : (
                            <FlashlightNotEnabledIcon
                                size={24}
                                color={colors.text}
                            />
                        )}
                    </Button>
                </View>
            </GradientHeader>

            {!awaitingResult && (
                <GradientHeader
                    height={MENU_HEIGHT}
                    baseColor={"transparent"}
                    direction="bottom"
                    contentStyle={{
                        height: MENU_HEIGHT,
                        paddingHorizontal: 20,
                        paddingBottom: insets.bottom,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                    }}
                    zIndex={10}
                >
                    <Button
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                            backgroundColor: colors.buttonSecondary,
                        }}
                        onPress={async () => {
                            reset();
                            const ok = await connectWithWarmup(() => false);
                            if (ok) startStreaming(); else banner.error("Couldn't reconnect. Try again.");
                        }}
                        background
                        disabled={warmingUp}
                    >
                        <RefreshIcon color={colors.text} size={28} />
                    </Button>

                    <Button
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                            backgroundColor: ACCENT_COLORS.teal,
                        }}
                        onPress={openPostWithPhoto}
                        background
                    >
                        <AICameraIcon size={24} color={colors.text} />
                    </Button>

                    <Button
                        style={{
                            width: 55,
                            height: 55,
                            borderRadius: 999,
                        }}
                        onPress={() => {
                            if (!similar_post_ids.length) {
                                banner.error("No similar dishes found for this frame.");
                                return;
                            }
                            const dishName = results
                                .map((item) => item.label?.trim())
                                .filter((label): label is string => Boolean(label))
                                .map((label) => capitalize(label))
                                .join(" & ");

                            openBottomSheet(
                                <SimilarPosts
                                    label={dishName}
                                    postIds={similar_post_ids}
                                    dark={dark}
                                    onSelectPost={(post) => { closeBottomSheet(); openCookOverlay(post.post_id, { dark }); }}
                                />, 
                                [420],
                                1,
                                undefined,
                                undefined,
                                dark
                            );
                        }}
                        background
                    >
                        <MorePostIcon size={24} color={colors.text} />
                    </Button>

                </GradientHeader>
            )}

            {/* similar posts */}


        </View>
    )

};




export default ChefNexImageScreen;