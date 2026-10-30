import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/provider/ThemeProvider";
import { useOverlay } from "@/stores/useOverlay";
import { GradientHeader } from "@/components/GradientComponent";
import { SectionHeader } from "./SectionComponent";
import { Button } from "./ButtonComponent";
import { Media } from "@/media/media";
import { formatCount } from "@/utils/time";
import { CookPotIcon, GridIcon, LikeIcon, StarIcon, ShareNetworkIcon } from "@/icons/Icon";
import { ImageMediaType } from "@/types/media.types";
import { MinimumFeedCard } from "@/types/feed.types";

/**
 * Works with both MinimumFeedCard and SearchFeedCard (SearchFeedCard is a
 * superset), so MinTag and DiscoveryTag can pass their card straight in.
 */
type PostStatsProps = {
    dark?: boolean;
    card: Pick<MinimumFeedCard, "post_id" | "info"> & {
        action_counts?: MinimumFeedCard["action_counts"];
    };
};

type StatRowProps = {
    dark?: boolean;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    count: number;
    total: number;
    barColor: string;
};

export const StatRow: React.FC<StatRowProps> = ({
    dark,
    icon,
    title,
    subtitle,
    count,
    total,
    barColor,
}) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <View
            style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: colors.secondaryCard,
                gap: 12,
            }}
        >
        
            <SectionHeader
                dark={dark}
                title={title}
                subtitle={subtitle}
                leftIcon={icon}
                rightIcon={
                    <Text
                        className={textStyles.section}
                        style={{
                            color: colors.text,
                            fontSize: 24,
                            fontVariant: ["tabular-nums"],
                        }}
                    >
                        {formatCount(count)}
                    </Text>
                }
            />

            {/* share of total engagement */}
            <View style={{ gap: 6, paddingHorizontal: 8 }}>
                <View
                    style={{
                        height: 6,
                        borderRadius: 3,
                        overflow: "hidden",
                        backgroundColor: colors.background,
                    }}
                >
                    <View
                        style={{
                            width: `${pct}%`,
                            height: "100%",
                            borderRadius: 3,
                            backgroundColor: barColor,
                        }}
                    />
                </View>

                <Text
                    className={textStyles.body}
                    style={{ color: colors.secondaryText, fontSize: 12 }}
                >
                    {total > 0 ? `${pct}% of all engagement` : "No engagement yet"}
                </Text>
            </View>
        </View>
    );
};

export const PostStats: React.FC<PostStatsProps> = ({ dark, card }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const insets = useSafeAreaInsets();
    const requestClose = useOverlay((s) => s.requestClose);

    const { info, action_counts } = card;

    const likes = action_counts?.post_love ?? 0;
    const stars = action_counts?.post_star ?? 0;
    const cooks = action_counts?.post_cook ?? 0;
    const shares = action_counts?.post_share ?? 0;
    const total = likes + stars + cooks + shares;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            
            <GradientHeader
                baseColor={colors.background}
                direction="top"
                zIndex={5}
                height={75}
            >
                <SectionHeader
                    dark={dark}
                    title="Post activity"
                    subtitle="See how people are responding to this recipe."
                    showDivider
                    leftIcon={<GridIcon color={colors.text} size={24} />}
                />
            </GradientHeader>

            <ScrollView
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        flexGrow: 1,
                        paddingTop: 75,
                        paddingHorizontal: 10,
                        gap: 15,
                    }}
                >

                    {/* Post preview (like the quoted tweet at the top) */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            padding: 12,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.secondaryCard,
                        }}
                    >
                        <View
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                overflow: "hidden",
                                backgroundColor: colors.secondaryCard,
                            }}
                        >
                            <Media
                                uri={info.dish_media_url}
                                mediaType={info.dish_media_type as ImageMediaType}
                                style={{ width: "100%", height: "100%" }}
                                iconSize={16}
                            />
                        </View>

                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                            <Text
                                className={textStyles.section}
                                style={{ color: colors.text, fontSize: 16 }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {info.dish_name}
                            </Text>
                            <Text
                                className={textStyles.body}
                                style={{
                                    color: colors.secondaryText,
                                    fontSize: 13,
                                    lineHeight: 17,
                                }}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {info.dish_description?.trim() ||
                                    "Discover this delicious recipe."}
                            </Text>
                        </View>
                    </View>

                    {/* Total, the "Impressions" equivalent */}
                    <View style={{ paddingHorizontal: 8,  gap: 4 }}>
                        <Text
                            className={textStyles.body}
                            style={{ color: colors.secondaryText, fontSize: 14 }}
                        >
                            Total engagement
                        </Text>
                        <Text
                            className={textStyles.section}
                            style={{
                                color: colors.text,
                                fontSize: 44,
                                lineHeight: 52,
                                fontVariant: ["tabular-nums"],
                            }}
                        >
                            {formatCount(total)}
                        </Text>
                    </View>

                    <StatRow
                        dark={dark}
                        icon={<LikeIcon size={24} />}
                        title="Likes"
                        subtitle="People who loved this recipe."
                        count={likes}
                        total={total}
                        barColor={colors.danger}
                    />

                    <StatRow
                        dark={dark}
                        icon={<StarIcon size={24} color="#ffca45" fillColor="#ffca45" />}
                        title="Stars"
                        subtitle="People who starred this recipe to come back to."
                        count={stars}
                        total={total}
                        barColor="#ffca45"
                    />

                    <StatRow
                        dark={dark}
                        icon={<CookPotIcon size={24} />}
                        title="Cooks"
                        subtitle="People who actually cooked this recipe."
                        count={cooks}
                        total={total}
                        barColor={colors.button}
                    />

                    <StatRow
                        dark={dark}
                        icon={<ShareNetworkIcon size={24} color="#8b5cf6" fill_color="#8b5cf6" />}
                        title="Shares"
                        subtitle="People who shared this recipe with others."
                        count={shares}
                        total={total}
                        barColor="#8b5cf6"
                    />

                </TouchableOpacity>

            </ScrollView>

        </View>
    );
};

export default PostStats;