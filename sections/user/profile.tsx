import { useState, type ReactNode } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme } from "@/provider/ThemeProvider";
import { useProfile } from "@/stores/useProfile";
import { SectionHeader } from "@/components/SectionComponent";
import { BadgeRender } from "@/dashboard/Avatar";
import { MinTag } from "@/tags/MinTag";
import { MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { CookIcon, GridIcon, LikeOutlineIcon, StarIcon, ShareOutlineIcon, DeleteIcon, StatsIcon, PostIcon } from "@/icons/Icon";
import { Button } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { useReward } from "@/stores/useReward";
import { usePostHog } from "posthog-react-native";
import { XPIcon, LevelIcon, RankIcon, CookPotIcon } from "@/dashboard/bread";

type ProfileItem = {
    label: string;
    value?: ReactNode;
    width?: number;
    color?: string;
};

type ProfilePostFilterMeta = {
    icon: React.ComponentType<{ color: string; size: number }>;
    label: string;
    filter: keyof UserActionedPostsType;
};

const STAT_ICONS: Record<string, React.ReactNode> = {
    Rank: <RankIcon size={18} />,
    Level: <LevelIcon size={18} />,
    XP: <XPIcon size={18} />,
    Cooked: <CookPotIcon size={18} />,
};

export function Profile() {

    const data = useProfile((s) => s.data);
    const { colors, textStyles } = useTheme();

    const renderValue = (value: ReactNode) => {
        if (typeof value === "string" || typeof value === "number") {
            return <Text className={textStyles.body}>{value}</Text>;
        }

        return value;
    };

    const DetailPill = ({
        label,
        value,
        width = 120,
        color = colors.secondaryCard,
    }: ProfileItem) => (
        <View
            style={{
                height: 40,
                width,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: colors.card,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
            }}
        >
            {STAT_ICONS[label]}

            <Text className={textStyles.body}>
                {label}:
            </Text>

            {renderValue(value ?? "-")}
        </View>
    );

    const statItems: ProfileItem[][] = [
        [
            { label: "Rank", value: data?.global_rank, color: "#ffeeac" },
            { label: "Level", value: data?.profile?.level, color: "#a2ffc3" },
        ],
        [
            { label: "XP", value: data?.profile?.xp, color: "#bbadfc" },
            { label: "Cooked", value: data?.stats?.num_cooks, color: "#faacac" },
            {
                label: "Badge",
                value: <BadgeRender badge={data?.profile?.badge} size={20} />,
                color: "#a5dbff",
            },
        ],
    ];

    return (
        <View
            style={{ flex: 1, width: "100%" }}
        >
            <View style={{ flex: 1}}>
                <View
                    style={{ 
                        borderRadius: 30,  
                        gap: 10,
                    }}
                    className="w-full"
                >
                    <SectionHeader 
                        title="Stats" 
                        titleClassName={textStyles.section}
                        subtitle="Stats you've accumulated while using gomeal"
                        showDivider
                        leftIcon={<StatsIcon size={25} color={colors.text} />}
                    />

                    <View style={{ padding: 10, gap: 8 }}>
                        {statItems.map((row, rowIndex) => (
                            <View
                                key={`stats-row-${rowIndex}`}
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                {row.map((item) => (
                                    <DetailPill
                                        key={item.label}
                                        {...item}
                                        width={`${100 / row.length}%` as unknown as number}
                                    />
                                ))}
                            </View>
                        ))}
                    </View>

                </View>

                <ProfilePostSection />
            </View>
        </View>
    );
};


function ProfilePostSection() {
    
    const posthog = usePostHog();
    const data = useProfile((s) => s.data);
    const deletePost = useProfile((s) => s.deletePost);

    const { width } = useWindowDimensions();
    
    const { reward } = useReward();
    const { colors, textStyles } = useTheme();

    const [active, setActive] = useState<keyof UserActionedPostsType>("post_made");
    const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
    const [removedPostIds, setRemovedPostIds] = useState<Set<number>>(new Set());

    const posts: MinimumFeedCard[] = (data?.activity?.[active] ?? []).filter(
        (post) => !removedPostIds.has(Number(post.post_id))
    );
    
    const PROFILE_POST_FILTERS: ProfilePostFilterMeta[] = [
        { icon: GridIcon, label: "post", filter: "post_made" },
        { icon: LikeOutlineIcon, label: "like", filter: "post_love" },
        { icon: CookIcon, label: "cook", filter: "post_cook" },
        { icon: StarIcon, label: "star", filter: "post_star" },
        { icon: ShareOutlineIcon, label: "share", filter: "post_share" },
    ];

    return (
        <View
            style={{
                minHeight: 150,
            }}
        >
            <SectionHeader 
                title="Posts" 
                titleClassName={textStyles.section}
                subtitle="Posts that you've been interacting with, swipe down to refresh. To remove a post click the trash icon"
                showDivider
                leftIcon={<PostIcon size={25} color={colors.text} />}
            />

            <View
                style={{
                    flexDirection: "row",
                    height: 60,
                    paddingVertical: 5,
                    alignItems: "center",
                }}
            >
                {PROFILE_POST_FILTERS.map((meta, index, array) => {
                    const Icon = meta.icon;
                    const isActive = active === meta.filter;

                    return (
                        <View
                            key={meta.filter}
                            style={{
                                flex: 1,
                                height: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Button
                                onPress={() => setActive(meta.filter)}
                                style={{
                                    height: 50,
                                    width: 65,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <View className="items-center gap-1">
                                    <Icon
                                        color={isActive ? colors.button : colors.text}
                                        size={23}
                                    />
                                    <Text
                                        className={textStyles.small}
                                        style={{ color: isActive ? colors.button : colors.secondaryText, textTransform: "capitalize" }}
                                    >
                                        {meta.label}
                                    </Text>
                                </View>
                            </Button>

                            {index < array.length - 1 && (
                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        height: 29,
                                        width: 2,
                                        backgroundColor: colors.secondaryCard,
                                        opacity: 0.75,
                                    }}
                                />
                            )}
                        </View>
                    );
                })}
            </View>

            <>

                {posts.length > 0 ? (

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                            gap: 10,
                            paddingHorizontal: 10,
                            alignItems: "center",
                        }}
                    >
                        {posts.map((post, index) => {
                            const isDeleting = deletingPostId === Number(post.post_id);

                            return (
                                <View 
                                    key={`${post.post_id} - ${index}`}
                                    style={{ 
                                        flex: 1,
                                        gap: 5,
                                        alignItems: "center"
                                    }}
                                >
                                    {active === "post_made" && (
                                        <View
                                            style={{
                                                alignItems: "flex-start",
                                            }}
                                            className="w-full"
                                        >
                                            <Button
                                                onPress={async () => {
                                                    const postId = Number(post.post_id);

                                                    setDeletingPostId(postId);

                                                    try {
                                                        const ok = await deletePost(postId);

                                                        if (!ok) return;

                                                        posthog.capture("[Post] => post_deleted", { post_id: postId });

                                                        setRemovedPostIds((current) => {
                                                            const next = new Set(current);
                                                            next.add(postId);
                                                            return next;
                                                        });

                                                        await reward("DELETE_POST");

                                                    } finally {
                                                        setDeletingPostId(null);
                                                    }
                                                }}
                                                style={{
                                                    backgroundColor: "transparent"
                                                }}
                                                disabled={isDeleting}
                                                clearBackground={!isDeleting}
                                            >
                                                {isDeleting ? (
                                                    <SpinningLogoImage size={20} />
                                                ) : (
                                                    <DeleteIcon size={20} color={colors.danger} />
                                                )}
                                            </Button>
                                        </View>
                                    )}

                                    <MinTag
                                        minCard={post}
                                        style={{
                                            width: width - 20,
                                        }}
                                        containerStyle={{
                                            borderRadius: 15
                                        }}
                                    />

                                </View>
                            );
                        })}
                    </ScrollView>

                ) : (

                    <View
                        style={{
                            justifyContent: "center",
                            alignItems: "center",
                            flex: 1,
                        }}
                    >
                        <Text className={textStyles.caption}>None yet</Text>
                    </View>

                )}

            </>

        </View>
    );
};

