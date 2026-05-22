import { formatCount } from "@/utils/time";
import { useFeed } from "@/stores/useFeed";
import { useTheme } from "@/provider/ThemeProvider";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FeedActionCountsTypes, FeedProfileCard, MinimumFeedCard, UserActionedPostsType } from "@/types/feed.types";
import { JSX, useEffect, useState } from "react";
import { CookIcon, LikeIcon, LikeOutlineIcon, EmptyImageIcon, MoreIcon, EggsIcon, GridIcon, XIcon } from "@/icons/Icon";
import { MinTag } from "@/tags/MinTag";
import { Button, ExpandingButton } from "@/components/ButtonComponent";
import { SpinningLogoImage } from "@/utils/Logo";
import { SectionHeader } from "@/components/SectionComponent";
import MessageScreen from "../messages/messages";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { useUser } from "@/stores/useUser";
import { useBlockUser, useReport } from "@/stores/useReport";
import { useCook } from "@/stores/useCook";

export const FEED_CARD_PROFILE_RADIUS = 40;

type FilterMeta = {
    icon: React.ComponentType<{ color: string; size: number }>;
    label: string;
    color: string;
    filter: keyof UserActionedPostsType;
};

const FILTERS: FilterMeta[] = [
    { icon: GridIcon, label: "Posts", color: "red", filter: "post_made"},
    { icon: LikeOutlineIcon, label: "Likes", color: "red", filter: "post_love"},
    { icon: CookIcon, label: "Cooks", color: "red", filter: "post_cook"},
];

const FeedProfile: React.FC<{
    dark?: boolean;
    showMore?: boolean;
    sectionOpen?: (open: boolean) => void;
    onClose?: () => void;
}> = ({ dark, sectionOpen, onClose, showMore = true }) => {

    const { user } = useUser();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);
    const { reportTarget, loadingReport } = useReport();
    const { blockUser, loadingBlockUser } = useBlockUser();
    const { activeProfile, removeProfile, loadingProfile, clearActiveProfile } = useFeed(); 

    const [showMenu, setShowMenu] = useState(false);
    const [showMessagesSection, setShowMessagesSection] = useState(false);

    const slideMessageSectionIn = useSharedValue(500);

    const AnimateSectionIn = useAnimatedStyle(() => ({
        transform: [{ translateX: slideMessageSectionIn.value }],
    }));
    
    const handleSectionOpen = () => {
        setShowMessagesSection(true);
        sectionOpen?.(true);
        setShowMenu(false);
        slideMessageSectionIn.value = withSpring(0, { damping: 18, stiffness: 150 });
    };

    const handleSectionClose = () => {
        sectionOpen?.(false)
        slideMessageSectionIn.value = withTiming(500, { duration: 250 }, () => {
            runOnJS(setShowMessagesSection)(false); 
        });
    };

    if (loadingProfile) {
        return (
            <View style={StyleSheet.absoluteFillObject} className="items-center justify-center">
                <SpinningLogoImage size={50} />
            </View>
        )
    };

    return (
        <View style={StyleSheet.absoluteFillObject} className="">

            {showMenu && (
                <Pressable
                    onPress={() => setShowMenu(false)}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                    }}
                />
            )}

            <View style={{height: 150}}>
                {activeProfile?.profile_img_url ? (
                    <Image
                        source={{uri: activeProfile?.profile_img_url}}
                        style={{ height: "100%", width: "100%", backgroundColor: colors.card }}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ height: "100%", width: "100%", backgroundColor: colors.card }} className="items-center justify-center">
                        <EmptyImageIcon color={colors.text} size={50} />
                    </View>
                )}

                <View
                    style={{
                        position: "absolute",
                        left: 15,
                        top: 15,
                        justifyContent: "center",
                        elevation: 20,
                        zIndex: 2,
                    }}
                >
                    <Button
                        onPress={onClose}
                        style={{ height: 40, backgroundColor: colors.danger, width: 40 }}
                        background
                    >
                        <XIcon color={colors.background} size={18} />
                    </Button>
                </View>

                <View
                    style={{
                        position: "absolute",
                        right: 15,
                        top: 15,
                        justifyContent: "center",
                        elevation: 20,
                    }}
                >
                    {showMore && (
                        <ExpandingButton
                            expanded={showMenu}
                            onPress={() => setShowMenu(true)}
                            expandedChildren={
                                <View style={{ gap: 10 }}>
                                    <Button
                                        onPress={async () => {
                                            if (!activeProfile?.sub || loadingReport) return;
                                            await reportTarget(activeProfile.sub, "user");
                                            removeProfile(activeProfile.sub);
                                        }}
                                        disabled={loadingReport}
                                        style={{ height: 40, width: 135, backgroundColor: colors.buttonSecondary }}
                                        background={loadingReport ? false : true}
                                    >
                                        {loadingReport ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <Text className={textStyles.caption}>
                                                Report
                                            </Text>
                                        )}
                                    </Button>

                                    <Button
                                        onPress={async () => {
                                            if (!activeProfile?.sub || loadingBlockUser) return;

                                            await blockUser(activeProfile.sub);
                                            removeProfile(activeProfile.sub);
                                            setShowMenu(false);
                                            clearActiveProfile();
                                        }}
                                        disabled={loadingBlockUser}
                                        style={{ height: 40, width: 135, backgroundColor: colors.danger }}
                                        background={loadingBlockUser ? false : true}
                                    >
                                        {loadingBlockUser ? (
                                            <SpinningLogoImage size={18} />
                                        ) : (
                                            <Text className={textStyles.caption}>
                                                Block
                                            </Text>
                                        )}
                                    </Button>
                                </View>
                            }
                            expandedStyle={{
                                borderRadius: 20,
                            }}
                        >
                            <MoreIcon color={colors.background} size={15} rotate={90} />
                        </ExpandingButton>
                    )}
                </View>

            </View>

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingHorizontal: 15,
                    width: "100%",
                    gap: 10,
                }}
            >
                <View
                    style={{
                        gap: 1,
                        flexDirection: "column",
                        minWidth: 0,
                    }}
                >
                    <Text
                        style={{ fontSize: 13 }}
                        className={textStyles.small}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {activeProfile?.firstName}
                    </Text>

                    <Text
                        className={textStyles.section}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {activeProfile?.lastName}
                    </Text>
                </View>

                <View
                    style={{ height: 70, gap: 15 }}
                    className="flex-row items-center justify-center"
                >
                    <View className="flex-row items-end gap-2">
                        <View
                            style={{
                                height: 40,
                                width: 40,
                                borderRadius: 999,
                                backgroundColor: colors.card,
                            }}
                            className="items-center justify-center"
                        >
                            <EggsIcon size={20} />
                        </View>
                        <Text className={textStyles.section}>
                            {formatCount(activeProfile?.num_of_cooks ?? 0)}
                        </Text>
                        <Text style={{ fontWeight: "400"}} className={textStyles.small}>
                            cooks
                        </Text>
                    </View>

                    <View className="flex-row items-end gap-2">
                        <View
                            style={{
                                height: 40,
                                width: 40,
                                borderRadius: 999,
                                backgroundColor: colors.card,
                            }}
                            className="items-center justify-center"
                        >
                            <LikeIcon size={20} />
                        </View>
                        <Text className={textStyles.section}>
                            {formatCount(activeProfile?.num_of_likes ?? 0)}
                        </Text>
                        <Text style={{ fontWeight: "400"}} className={textStyles.small}>
                            likes
                        </Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1}}>
                <FeedProfilePostsSection dark={dark}/>
            </View>

            {activeProfile?.sub !== user?.sub  && (
                <View style={{paddingHorizontal: 5, paddingVertical: 10}}>
                    <Button 
                        onPress={handleSectionOpen} 
                        style={{height: 50, width: 250, gap: 15, alignSelf: "center", flexDirection: "row", justifyContent: "center"}} 
                        background
                    >
                        <Text className={textStyles.caption}>
                            Ask A Question
                        </Text>
                    </Button>
                </View>
            )}

            {showMessagesSection && activeProfile?.sub && (
                <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 3 }}>
                    <MessageScreen
                        post_id={activeProfile.post_id ?? undefined}
                        receiver_sub={activeProfile.sub}
                        onClose={handleSectionClose}
                    />
                </View>
            )}

        </View>
    );
};

const FeedProfilePostsSection: React.FC<{ dark?: boolean }> = ({ dark }) => {

    const { activeProfile } = useFeed();
    const { openCook } = useCook();
    const { colors, textStyles } = useTheme(dark ? "dark" : undefined);

    const [active, setActive] = useState<keyof UserActionedPostsType>("post_made");

    const posts: MinimumFeedCard[] = activeProfile?.user_posts?.[active] ?? [];
    
    return (
        <View style={StyleSheet.absoluteFillObject}>
            
            <View
                style={{
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 20,
                    alignItems: "center",
                }}
            >
                {FILTERS.map((meta, index, array) => {
                    const Icon = meta.icon;
                    const isActive = active === meta.filter;

                    return (
                        <View
                            key={meta.filter}
                            style={{ gap: 5,  alignItems: "center" }}
                        >
                            <Button
                                onPress={() => setActive(meta.filter)}
                                style={{
                                    height: 50,
                                    width: 65,
                                    gap: 5,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                background
                            >
                                <Icon color={colors.background} size={20} />
                            </Button>
                        </View>
                    );
                })}
            </View>

            {posts.length > 0 ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingHorizontal: 5, alignItems: "center" }}
                >
                    {posts.map((post, index) => (
                        <MinTag
                            key={index}
                            minCard={post}
                            dark={dark}
                            onPress={() => openCook(post.post_id)}
                        />
                    ))}
                </ScrollView>
            ) : (
                <View style={{ justifyContent: "center", alignItems: "center", flex: 1 }}>
                    <Text className={textStyles.caption}>None yet</Text>
                </View>
            )}

        </View>
    );
}

export default FeedProfile;