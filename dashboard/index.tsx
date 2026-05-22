import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import GomealGlassView from "@/components/GlassComponent";
import { NotiIcon, NotiDeliveredIcon } from "@/icons/Icon";
import { useTheme } from "@/provider/ThemeProvider";
import { useUser } from "@/stores/useUser";
import Bread from "./bread";
import { BreadRender, DynamicAvatarRenderer } from "./Avatar";
import { useNotification } from "@/notifications/useNotification";
import { useShowReward } from "./store/useReward";
import { Button } from "@/components/ButtonComponent";
import { useSettingsStore } from "@/stores/useSettings";
import Svg, { Circle } from "react-native-svg";
import { useAvatarMood } from "./store/useAvatar";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type DashBoardProps = {
    dark?: any;
    onOpenNotification: (open: boolean) => void;
};

const ProgressCircle: React.FC<{
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


const DashRewardAnim: React.FC<{ dark: boolean }> = ({ dark }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [currentItem, setCurrentItem] = useState<{
        label: string;
        color: string;
    } | null>(null);

    const dequeueReward = useShowReward((s) => s.dequeueReward);
    const queue = useShowReward((s) => s.queue);

    const showRewardAnimY = useRef(new Animated.Value(-40)).current;
    const isAnimating = useRef(false);
    const dequeueRef = useRef(dequeueReward);

    useEffect(() => {
        dequeueRef.current = dequeueReward;
    }, [dequeueReward]);

    useEffect(() => {
        const reward = queue[0];

        if (queue.length === 0 || isAnimating.current || !reward) return;

        const items = [
        reward.xpDelta !== 0 && {
            label: `${reward.xpDelta > 0 ? "+" : ""}${reward.xpDelta} XP`,
            color: "red",
        },
        reward.breadDelta !== 0 && {
            label: `+${reward.breadDelta}`,
            color: "blue",
        },
        ].filter((item): item is { label: string; color: string } => Boolean(item));

        if (items.length === 0) {
        dequeueRef.current();
        return;
        }

        isAnimating.current = true;

        const animateItem = (index: number) => {
        if (index >= items.length) {
            isAnimating.current = false;
            setCurrentItem(null);
            dequeueRef.current();
            return;
        }

        setCurrentItem(items[index]);
        showRewardAnimY.setValue(24);

        Animated.sequence([
            Animated.timing(showRewardAnimY, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
            }),
            Animated.delay(1400),
            Animated.timing(showRewardAnimY, {
            toValue: -24,
            duration: 240,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
            }),
        ]).start(() => animateItem(index + 1));
        };

        animateItem(0);
    }, [queue, showRewardAnimY]);

    if (!currentItem) return null;

    return (
        <Animated.View
            style={{
                width: 100,
                height: 33,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ translateY: showRewardAnimY }],
            }}
        >
            <Text className={textStyles.h1} style={{ color: currentItem.color }}>
                {currentItem.label}
            </Text>
        </Animated.View>
    );

};

const DashNotificationCircle: React.FC<{
  onOpenNotification: (open: boolean) => void;
  dark: boolean;
}> = ({ onOpenNotification, dark }) => {

    const { user } = useUser();
    const XP_PER_LEVEL = Number(process.env.EXPO_PUBLIC_XP_PER_LEVEL);
    const xpIntoCurrentLevel = user ? user.xp % XP_PER_LEVEL : 0;
    const xpProgress = xpIntoCurrentLevel / XP_PER_LEVEL;

    const { colors } = useTheme(dark ? "dark" : undefined);
    const { unreadCount, markAllRead } = useNotification();

    const setMood = useAvatarMood((s) => s.setMood);
    const accentColor = useSettingsStore((s) => s.settings.app.accentColor);

    const prevCountRef = useRef(unreadCount);
    const spinValue = useRef(new Animated.Value(0)).current;
    const [showDelivered, setShowDelivered] = useState(false);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    const runDeliverySpin = useCallback(() => {
        spinValue.setValue(0);
        setShowDelivered(true);

        Animated.timing(spinValue, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                setShowDelivered(false);
            }, 700);
        });
    }, [spinValue]);

    useEffect(() => {
        if (unreadCount > prevCountRef.current) {
            runDeliverySpin();
        }
        prevCountRef.current = unreadCount;
    }, [runDeliverySpin, unreadCount]);

    const handlePress = useCallback(() => {
        markAllRead();
        onOpenNotification(true);
    }, [markAllRead, onOpenNotification]);

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginLeft: 12,
            }}
        >
            <ProgressCircle
                size={52}
                strokeWidth={4}
                progress={xpProgress}
                color={accentColor === "none" ? colors.button : accentColor}
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
                        backgroundColor: accentColor === "none" ? colors.background : accentColor,
                        overflow: "hidden",
                    }}
                    onPress={() => {setMood("confused", 2000)}}
                >
                    <DynamicAvatarRenderer size={35} />
                </Button>
            </ProgressCircle>

            <Button style={{ padding: 0, }} onPress={handlePress}>

                <Animated.View
                    style={{
                        width: 45,
                        height: 45,
                        borderRadius: 999,
                        borderWidth: 2,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.background,
                        borderColor: colors.secondaryCard,
                        transform: [{ rotateY: spin }],
                    }}
                >
                    
                    <MaterialIcons
                        name={showDelivered ? "notifications-active" : "notifications-none"}
                        size={showDelivered ? 21 : 22}
                        color={colors.text}
                    />

                </Animated.View>

            </Button>

        </View>
    );
};

const DashBoard: React.FC<DashBoardProps> = ({ dark, onOpenNotification }) => {

    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { user } = useUser();

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
            <GomealGlassView
                style={{
                    minHeight: 64,
                    borderRadius: 24,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    overflow: "hidden",
                }}
            >
                <View style={{ flex: 1, gap: 5, minWidth: 0, justifyContent: "center" }}>

                    <View>
                        <Text
                            className={textStyles.sectionText}
                            style={{ color: colors.text, opacity: 0.65 }}
                            numberOfLines={1}
                        >
                            Hello,
                        </Text>

                        <Text
                            className={textStyles.h3}
                            style={{ color: colors.text }}
                            numberOfLines={1}
                        >
                            {user.firstName ?? "Dashboard"}
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

                        <DashRewardAnim dark={dark} />

                    </View>
                    
                </View>

                <DashNotificationCircle dark={dark} onOpenNotification={onOpenNotification} />

            </GomealGlassView>

        </View>
    );
    
};

export default DashBoard;
