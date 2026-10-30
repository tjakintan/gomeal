import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, Pressable, Text, View } from "react-native";
import { AddIcon, SearchIcon, NotificationIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useUser } from "@/stores/useUser";
import { BadgeRender, BreadRender, DynamicAvatarRenderer } from "./Avatar";
import { useNotification } from "@/notifications/useNotification";
import { Button, Gesture } from "@/components/ButtonComponent";
import Svg, { Circle } from "react-native-svg";
import { useAvatarMood } from "../stores/useAvatar";
import { capitalize } from "@/utils/text";
import { PostScreen } from "@/sections";
import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import NotificationScreen from "@/notifications/Notification";
import  SearchMainScreen from "@/sections/feed/search";
import { usePermissions } from "@/provider/PermissionProvider";


type DashBoardProps = {
    dark?: any;
};


export const ProgressCircle: React.FC<{
    size: number;
    strokeWidth: number;
    progress: number;
    color: string;
    trackColor: string;
    children: React.ReactNode;
}> = ({ size, strokeWidth, progress, color, trackColor, children }) => {
    
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const strokeDashoffset = circumference * (1 - clampedProgress);

    return (
        <View
            style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Svg
                width={size}
                height={size}
                style={{
                    position: "absolute",
                    transform: [{ rotate: "-90deg" }],
                }}
            >
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                />
            </Svg>

            {children}
        </View>
    );
};


export const DashNotificationCircle: React.FC<{ dark: boolean }> = ({ dark }) => {
    const { colors } = useTheme();
    const { unreadCount, markAllRead } = useNotification();

    const badgeScale = useRef(new Animated.Value(0)).current;
    const badgeOpacity = useRef(new Animated.Value(0)).current;

    const openSlidingOverlay = useSlidingOverlay(
        (s) => s.openSlidingOverlay
    );
    const closeSlidingOverlay = useSlidingOverlay(
        (s) => s.closeSlidingOverlay
    );

    useEffect(() => {
        if (unreadCount > 0) {
            badgeScale.setValue(0.4);
            badgeOpacity.setValue(0);

            Animated.parallel([
                Animated.spring(badgeScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(badgeOpacity, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(badgeScale, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(badgeOpacity, {
                    toValue: 0,
                    duration: 120,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [unreadCount, badgeScale, badgeOpacity]);

    const handlePress = useCallback(() => {
        Keyboard.dismiss();
        
        markAllRead();

        openSlidingOverlay(
            <NotificationScreen
                dark={dark}
                onOpen={(open) => {
                    if (!open) closeSlidingOverlay();
                }}
            />
        );
    }, [markAllRead, openSlidingOverlay, closeSlidingOverlay, dark]);

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
            }}
        >
            <Button
                style={{ padding: 0 }}
                onPress={handlePress}
            >
                <View
                    style={{
                        width: 45,
                        height: 45,
                        borderRadius: 999,
                        borderWidth: 2,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.background,
                        borderColor: colors.secondaryCard,
                        position: "relative",
                    }}
                >
                    <NotificationIcon
                        size={24}
                        color={colors.text}
                    />

                    {unreadCount > 0 && (
                        <Animated.View
                            style={{
                                position: "absolute",
                                top: 3,
                                right: 3,
                                minWidth: 19,
                                height: 19,
                                paddingHorizontal: 4,
                                borderRadius: 999,
                                backgroundColor: colors.danger,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: badgeOpacity,
                                transform: [
                                    { scale: badgeScale },
                                ],
                            }}
                        >
                            <Text
                                style={{
                                    color: "white",
                                    fontSize: 10,
                                    fontWeight: "800",
                                    lineHeight: 12,
                                    textAlign: "center",
                                }}
                                numberOfLines={1}
                            >
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </Text>
                        </Animated.View>
                    )}
                </View>
            </Button>
        </View>
    );
};


const DashPostButton: React.FC<{ dark: boolean }> = ({ dark }) => {
    const { colors } = useTheme();
    const { requestPermissions } = usePermissions();

    const openSlidingOverlay = useSlidingOverlay((s) => s.openSlidingOverlay);
    const closeSlidingOverlay = useSlidingOverlay((s) => s.closeSlidingOverlay);

    const openPostScreen = useCallback(() => {
        openSlidingOverlay(
            <PostScreen onClose={closeSlidingOverlay} />
        );
    }, [openSlidingOverlay, closeSlidingOverlay]);

    const handlePress = useCallback(() => {
        Keyboard.dismiss();
        requestPermissions({
            permissions: ["camera", "microphone"],
            title: "Allow GoMeal to access your camera",
            description:
                "Camera access lets you take meal photos and record cooking videos. Microphone access lets your videos include audio. You can change these permissions later in Settings.",
            deniedDescription:
                "Camera and/or microphone access has been disabled. Please enable Camera and Microphone access for GoMeal in Settings.",
            onGranted: () => {
                requestPermissions({
                    permissions: ["mediaLibrary"],
                    title: "Allow GoMeal to access your photos",
                    description:
                        "Photo Library access lets you choose meal photos and cooking videos to share. You can change this access later in Settings.",
                    deniedDescription:
                        "Photo Library access has been disabled. Enable Photos access for GoMeal in Settings to choose meal photos and cooking videos.",
                    onGranted: openPostScreen,
                });
            },
        });
    }, [requestPermissions, openPostScreen]);

    return (
        <Button style={{ padding: 0 }} onPress={handlePress}>
            <View
                style={{
                    width: 45,
                    height: 45,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.accent === "transparent" ? colors.button : colors.accent,
                }}
            >
                <AddIcon size={22} color={colors.text} />
            </View>
        </Button>
    );
};


const DashSearchButton: React.FC<{ dark: boolean }> = ({ dark }) => {

    const { colors } = useTheme();

    const openSlidingOverlay = useSlidingOverlay(
        (s) => s.openSlidingOverlay
    );

    const closeSlidingOverlay = useSlidingOverlay(
        (s) => s.closeSlidingOverlay
    );

    const handlePress = useCallback(() => {
        Keyboard.dismiss();
        openSlidingOverlay(
            <SearchMainScreen
                dark={dark}
                onClose={closeSlidingOverlay}
            />
        );
    }, [dark, openSlidingOverlay, closeSlidingOverlay]);

    return (
        <Button style={{ padding: 0 }} onPress={handlePress}>
            <View
                style={{
                    width: 45,
                    height: 45,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: colors.secondaryCard,
                }}
            >
                <SearchIcon color={colors.text} size={24} />
            </View>
        </Button>
    );
};


const DashBoard: React.FC<DashBoardProps> = ({ dark }) => {

    const { colors, textStyles } = useTheme();

    const user = useUser((s) => s.user);
    const setMood = useAvatarMood((s) => s.setMood);
    
    const XP_PER_LEVEL = Number(process.env.EXPO_PUBLIC_XP_PER_LEVEL);
    const xpIntoCurrentLevel = user ? user.xp % XP_PER_LEVEL : 0;
    const xpProgress = xpIntoCurrentLevel / XP_PER_LEVEL;

    if (!user) return null;

    return (
        <View
            style={{
                width: "100%",
                paddingHorizontal: 14,
                paddingTop: 8,
                zIndex: 10,
            }}
        >
            <Gesture scaleAmount={1}>
                <Pressable
                    onPress={() => {
                        Keyboard.dismiss();
                        setMood("confused", 3000);
                    }}
                    style={{ width: "100%" }}
                >
                    <View
                        style={{
                            minHeight: 64,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            overflow: "hidden",
                            gap: 5,
                        }}
                    >
                        <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>

                            <View>
                                <Text
                                    className={textStyles.section}
                                    style={{ color: colors.text }}
                                    numberOfLines={1}
                                >
                                    Hello
                                </Text>

                                <Text
                                    className={textStyles.h3}
                                    style={{ color: colors.button }}
                                    numberOfLines={1}
                                >
                                    {capitalize(user.firstName ?? " ")}
                                </Text>
                                
                            </View>

                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 8,
                                    minHeight: 33,
                                }}
                            >
                                <View
                                    style={{
                                        width: 100,
                                        height: 33,
                                        paddingHorizontal: 5,
                                        borderRadius: 999,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        borderWidth: 2,
                                        borderColor: colors.secondaryCard,
                                        backgroundColor: colors.background,
                                    }}
                                >

                                    <BreadRender dark={dark} bread={user.bread} />
                                    
                                </View>


                            </View>
                            
                        </View>

                        <ProgressCircle
                            size={52}
                            strokeWidth={4}
                            progress={xpProgress}
                            color={colors.accent === "transparent" ? colors.button : colors.accent}
                            trackColor={colors.secondaryCard}
                        >
                            <Button
                                style={{
                                    width: 40,
                                    height: 40,
                                    padding: 0,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    backgroundColor: colors.accent === "transparent" ? colors.button : colors.accent,
                                    overflow: "visible",
                                }}
                                onPress={() => setMood("confused", 3000)}
                            >
                                <View
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 999,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden"
                                    }}
                                >
                                    <DynamicAvatarRenderer size={25} />
                                </View>
                                <View style={{ position: "absolute", top: -4, right: -4 }}>
                                    <BadgeRender size={16} />
                                </View>
                            </Button>
                        </ProgressCircle>

                        <DashPostButton dark={dark} />

                        <DashSearchButton dark={dark} />
                        
                        <DashNotificationCircle dark={dark} />

                    </View>

                </Pressable>

            </Gesture>

        </View>
    );
    
};


export default DashBoard;
