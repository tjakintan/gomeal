import { useState, type ReactNode } from "react";
import { View, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTheme } from "@/provider/ThemeProvider";
import { useProfile } from "@/stores/useProfile";
import { SectionHeader } from "@/components/SectionComponent";
import { BadgeRender } from "@/dashboard/Avatar";
import { MinTag } from "@/tags/MinTag";
import { MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { EggsIcon, LikeIcon, TagIcon, CookIcon, ShareIcon, GridIcon, LikeOutlineIcon, StarOutlineIcon, ShareOutlineIcon, InfoIcon, DeleteIcon } from "@/icons/Icon";
import { FeedLoveIcon, FeedStarIcon } from "@/icons/feed_icon";
import { Button } from "@/components/ButtonComponent";
import { formatCount } from "@/utils/time";
import { SpinningLogoImage } from "@/utils/Logo";
import { useCook } from "@/stores/useCook";

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

const PROFILE_POST_FILTERS: ProfilePostFilterMeta[] = [
    { icon: GridIcon, label: "post", filter: "post_made" },
    { icon: LikeOutlineIcon, label: "like", filter: "post_love" },
    { icon: CookIcon, label: "cook", filter: "post_cook" },
    { icon: StarOutlineIcon, label: "star", filter: "post_star" },
    { icon: ShareOutlineIcon, label: "share", filter: "post_share" },
];

export function Profile() {

    const { data } = useProfile();
    const { colors, textStyles } = useTheme();

    const renderValue = (value: ReactNode) => {
        if (typeof value === "string" || typeof value === "number") {
            return <Text className={textStyles.caption}>{value}</Text>;
        }

        return value;
    };

    const DetailPill = ({ label, value, width = 100, color = colors.secondaryCard }: ProfileItem) => (
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
                gap: 8,
            }}
        >
            <Text className={textStyles.caption}>{label}: </Text>
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
            {
                label: "Cooked",
                value: data?.stats?.num_cooks,
                color: "#faacac",
            },
        ],
        [
            {
                label: "Badge",
                value: <BadgeRender badge={data?.profile?.badge} size={20} />,
                color: "#a5dbff",
            },
        ]
    ];

    return (
        <ScrollView
            style={{ flex: 1, width: "100%", backgroundColor: colors.secondaryCard }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 20, paddingVertical: 10 }}
        >
            <View
                style={{ 
                    borderRadius: 30,  
                    padding: 10, 
                    gap: 10,
                }}
                className="w-full"
            >
                <SectionHeader 
                    title="Stats" 
                    titleClassName={textStyles.h3}
                    showBackground
                    leftIcon={<InfoIcon size={25} color={colors.button} />}
                />

                <View className="flex-row gap-5">
                    {statItems.map((column, columnIndex) => (
                        <View
                            key={`stats-column-${columnIndex}`}
                            className={`flex-col gap-2`}
                        >
                            {column.map((item) => (
                                <DetailPill key={item.label} {...item} />
                            ))}
                        </View>
                    ))}
                </View>

            </View>

            <ProfilePostSection />

        </ScrollView>
    );
};

function ProfilePostSection() {
    
    const { data, deletePost } = useProfile();
    const { openCook } = useCook();
    const { colors, textStyles } = useTheme();

    const [active, setActive] = useState<keyof UserActionedPostsType>("post_made");
    const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
    const [removedPostIds, setRemovedPostIds] = useState<Set<number>>(new Set());

    const posts: MinimumFeedCard[] = (data?.activity?.[active] ?? []).filter(
        (post) => !removedPostIds.has(Number(post.post_id))
    );

    return (
        <View
            style={{
                minHeight: 200,
                margin: 5,
                borderTopWidth: 2,
                borderColor: colors.background,
            }}
        >
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
                                    width: 50,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Icon
                                    color={isActive ? colors.button : colors.text}
                                    size={23}
                                />
                            </Button>

                            {index < array.length - 1 && (
                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        height: 29,
                                        width: 2,
                                        backgroundColor: colors.background,
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

                                                        setRemovedPostIds((current) => {
                                                            const next = new Set(current);
                                                            next.add(postId);
                                                            return next;
                                                        });

                                                    } finally {
                                                        setDeletingPostId(null);
                                                    }
                                                }}
                                                style={{
                                                    backgroundColor: "transparent"
                                                }}
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? (
                                                    <SpinningLogoImage size={20} />
                                                ) : (
                                                    <DeleteIcon size={20} color={colors.danger} />
                                                )}
                                            </Button>
                                        </View>
                                    )}

                                    <Button style={{ padding: 0 }} onPress={() => {}}>

                                        <MinTag
                                            minCard={post}
                                            style={{
                                                height: 150,
                                            }}
                                            containerStyle={{
                                                borderRadius: active === "post_made" ? 10 : 25
                                            }}
                                        />

                                    </Button>

                                    {active === "post_made" && (
                                        <View
                                            style={{
                                                gap: 2,
                                                flexDirection: "column",
                                                justifyContent: "space-between"
                                            }}
                                            className="w-full"
                                        >

                                            <View style={{ marginHorizontal: 5 }} className="flex-row items-end gap-4">
                                                <Text className={textStyles.bodyMedium}>
                                                    Cooks:
                                                </Text>
                                                <Text className={textStyles.sectionText}>
                                                    {formatCount(post?.action_counts?.post_cook)}
                                                </Text>
                                            </View>

                                            <View style={{ height: 1, width: "80%", alignSelf: "center", backgroundColor: colors.background }} />

                                            <View style={{ marginHorizontal: 5 }} className="flex-row items-end gap-4">
                                                <Text className={textStyles.bodyMedium}>
                                                    Likes:
                                                </Text>
                                                <Text className={textStyles.sectionText}>
                                                    {formatCount(post?.action_counts?.post_love)}
                                                </Text>
                                            </View>

                                            <View style={{ height: 1, width: "80%", alignSelf: "center", backgroundColor: colors.background }} />

                                            <View style={{ marginHorizontal: 5 }} className="flex-row items-end gap-4">
                                                <Text className={textStyles.bodyMedium}>
                                                    Star:
                                                </Text>
                                                <Text className={textStyles.sectionText}>
                                                    {formatCount(post?.action_counts?.post_star)}
                                                </Text>
                                            </View>

                                        </View>
                                    )}

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
