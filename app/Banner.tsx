import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/provider/ThemeProvider";
import { AlertCircleIcon, CheckCircleIcon, RewardIcon } from "@/icons/Icon";
import { BannerItem, BannerType } from "@/stores/useBanner";
import { RewardAnim } from "@/components/RewardComponent"; 

type Props = {
    item: BannerItem;
    dark?: boolean;
    onPress?: () => void;
};

type IconComponent = (props: { color?: string; size?: number }) => React.ReactElement;

const PRESET: Partial<
    Record<
        BannerType,
        {
            label: string;
            text?: string;
            Icon: IconComponent;
            iconColor: string;
        }
    >
> = {
    error: {
        label: "ERROR",
        Icon: AlertCircleIcon,
        iconColor: "#ff5c5c",
    },

    success: {
        label: "SUCCESS",
        Icon: CheckCircleIcon,
        iconColor: "#3ddc84",
    },

    reward: {
        label: "REWARD",
        text: "Congratulations, you earned a reward",
        Icon: RewardIcon,
        iconColor: "#AA7942",
    },
};

const Banner: React.FC<Props> = ({ item, dark, onPress }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const isCustom = item.type === "custom";
    const isReward = item.type === "reward";
    const preset = PRESET[item.type]; // now safely `undefined` for "custom", not an index error

    const title = isCustom ? item.title : preset?.label;
    const titleColor = item.type === "error" ? colors.danger : colors.text;

    // Bind to a capitalized variable — JSX requires this for dynamic components
    const PresetIcon = preset?.Icon;

    return (
        <Pressable onPress={() => { item.onPress?.(); onPress?.(); }}>
            <View
                style={{
                    minHeight: 40,
                    width: "95%",
                    marginTop: 10,
                    alignSelf: "center",
                    borderRadius: 20,
                    padding: 14,
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: colors.secondaryCard,
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                }}
            >

                {isCustom
                    ? item.icon
                    : PresetIcon && <PresetIcon size={24} color={preset!.iconColor} />}

                <View style={{ flex: 1, gap: 4 }}>
                    {!!title && (
                        <Text style={{ color: titleColor, fontWeight: "700" }} className={textStyles.body}>
                            {title}
                        </Text>
                    )}
                    <Text
                        style={{ color: colors.text, opacity: 0.75, lineHeight: 18 }}
                        className={textStyles.body}
                    >
                        {isReward ? preset?.text : item.text}
                    </Text>
                </View>

                {isReward && item.rewards && item.rewards.length > 0 && (
                    <View
                        style={{
                            marginLeft: "auto",
                            alignSelf: "center",
                            paddingRight: 10,
                        }}
                    >
                        <View
                            style={{
                                height: 60,
                                width: 60,
                                borderRadius: 999,
                                borderWidth: 2,
                                borderColor: colors.card,
                                backgroundColor: colors.background,
                                justifyContent: "center",
                                alignItems: "center",
                                overflow: "hidden"
                            }}
                        >
                            <RewardAnim
                                rewards={item.rewards}
                                dark={dark}
                            />
                        </View>
                    </View>
                )}
            </View>
        </Pressable>
    );
};

export default Banner;