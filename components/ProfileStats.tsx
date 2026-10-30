import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "@/provider/ThemeProvider";
import { GradientHeader } from "@/components/GradientComponent";
import { SectionHeader } from "./SectionComponent";
import { StatRow } from "./PostStatsComponent";
import { DynamicAvatarRenderer } from "@/dashboard/Avatar";
import { formatCount } from "@/utils/time";
import { CookPotIcon, GridIcon, LikeIcon, StarIcon, ShareNetworkIcon } from "@/icons/Icon";
import { FeedProfileCard } from "@/types/feed.types";
import { limitLength } from "@/utils/text";

type ProfileStatsProps = {
    dark?: boolean;
    profile: Pick<
        FeedProfileCard,
        | "profile_name"
        | "avatar"
        | "badge"
        | "xp"
        | "num_of_likes"
        | "num_of_stars"
        | "num_of_cooks"
        | "num_of_shares"
        | "user_posts"
    >;
};

export const ProfileStats: React.FC<ProfileStatsProps> = ({ dark, profile }) => {
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const likes = profile.num_of_likes ?? 0;
    const stars = profile.num_of_stars ?? 0;
    const cooks = profile.num_of_cooks ?? 0;
    const shares = profile.num_of_shares ?? 0;
    const total = likes + stars + cooks + shares;

    const recipes = profile.user_posts?.post_made?.length ?? 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>

            <GradientHeader
                baseColor={colors.background}
                direction="top"
                zIndex={5}
                height={95}
            >
                <SectionHeader
                    dark={dark}
                    title="Profile activity"
                    subtitle="See how people are responding to this cook's recipes."
                    showDivider
                    leftIcon={<GridIcon color={colors.text} size={24} />}
                />
            </GradientHeader>

            <ScrollView showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        flexGrow: 1,
                        paddingTop: 95,
                        paddingHorizontal: 10,
                        paddingBottom: 30,
                        gap: 15,
                    }}
                >
                    {/* Profile preview */}
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
                        <DynamicAvatarRenderer
                            avatar={profile.avatar}
                            badge={profile.badge}
                            xp={profile.xp}
                            size={48}
                            background
                            showBadge
                            showProgress
                            showAvatarBackground
                            dark={dark}
                        />

                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                            <Text
                                className={textStyles.section}
                                style={{ color: colors.text, fontSize: 16 }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                @{limitLength(profile.profile_name ?? "", 20)}
                            </Text>
                            <Text
                                className={textStyles.body}
                                style={{ color: colors.secondaryText, fontSize: 13 }}
                                numberOfLines={1}
                            >
                                {recipes} {recipes === 1 ? "recipe" : "recipes"} created
                            </Text>
                        </View>
                    </View>

                    {/* Total */}
                    <View style={{ paddingHorizontal: 8, gap: 4 }}>
                        <Text
                            className={textStyles.body}
                            style={{ color: colors.secondaryText, fontSize: 14 }}
                        >
                            Total engagement received
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
                        subtitle="People who loved their recipes."
                        count={likes}
                        total={total}
                        barColor={colors.danger}
                    />

                    <StatRow
                        dark={dark}
                        icon={<StarIcon size={24} color="#ffca45" fillColor="#ffca45" />}
                        title="Stars"
                        subtitle="People who starred their recipes to come back to."
                        count={stars}
                        total={total}
                        barColor="#ffca45"
                    />

                    <StatRow
                        dark={dark}
                        icon={<CookPotIcon size={24} />}
                        title="Cooks"
                        subtitle="People who actually cooked their recipes."
                        count={cooks}
                        total={total}
                        barColor={colors.button}
                    />

                    <StatRow
                        dark={dark}
                        icon={<ShareNetworkIcon size={24} color="#8b5cf6" fill_color="#8b5cf6" />}
                        title="Shares"
                        subtitle="People who shared their recipes with others."
                        count={shares}
                        total={total}
                        barColor="#8b5cf6"
                    />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default ProfileStats;