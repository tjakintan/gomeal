import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { RewardItem, useShowReward } from "@/stores/useReward";
import { useBanner } from "@/stores/useBanner";

type Props = {
    rewards: RewardItem[];
    dark?: boolean;
};

export const RewardAnim: React.FC<Props> = ({ rewards, dark }) => {
    const { textStyles } = useTheme(dark ? "dark" : undefined);

    const dequeueReward = useShowReward((s) => s.dequeueReward);

    const [currentItem, setCurrentItem] = useState<RewardItem | null>(null);

    const showRewardAnimY = useRef(new Animated.Value(24)).current;
    const isAnimating = useRef(false);

    useEffect(() => {
        if (!rewards.length || isAnimating.current) return;

        isAnimating.current = true;

        const animateItem = (index: number) => {
            if (index >= rewards.length) {
                isAnimating.current = false;
                setCurrentItem(null);

                // Consume this reward once the entire reward animation
                // has finished.
                dequeueReward();

                return;
            }

            setCurrentItem(rewards[index]);
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
            ]).start(({ finished }) => {
                if (finished) {
                    animateItem(index + 1);
                }
            });
        };

        animateItem(0);

        return () => {
            isAnimating.current = false;
        };
    }, [
        rewards,
        showRewardAnimY,
        dequeueReward,
    ]);

    if (!currentItem) return null;

    return (
        <Animated.View
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                transform: [{ translateY: showRewardAnimY }],
            }}
        >
            <Text
                className={textStyles.h3}
                style={{
                    color: currentItem.color,
                    textAlign: "center",
                    lineHeight: 50,
                    includeFontPadding: false,
                }}
            >
                {currentItem.label}
            </Text>
        </Animated.View>
    );
};


export function useShowRewardBanner() {
    const queue = useShowReward((s) => s.queue);
    const banner = useBanner();

    useEffect(() => {
        const reward = queue[0];

        if (!reward) return;

        const rewards = [
            reward.xpDelta !== 0 && {
                label: `${reward.xpDelta > 0 ? "+" : ""}${reward.xpDelta} XP`,
                color: "red",
            },

            reward.breadDelta !== 0 && {
                label: `${reward.breadDelta > 0 ? "+" : ""}${reward.breadDelta}`,
                color: "blue",
            },
        ].filter(
            (i): i is RewardItem => Boolean(i)
        );

        if (rewards.length > 0) {
            banner.reward({ rewards });
        }
    }, [queue, banner]);
}