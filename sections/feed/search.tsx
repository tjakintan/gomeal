import { Button } from "@/components/ButtonComponent";
import { ChefIcon, ShrimpIcon, FireIcon, XIcon, BackIcon } from "@/icons/Icon";
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SpinningLogoImage } from "@/utils/Logo";
import { AvatarRender } from "@/dashboard/Avatar";
import { Media } from "@/media/media";
import MasonryList from '@react-native-seoul/masonry-list';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useFeed } from "@/stores/useFeed";
import { useSearch } from "@/stores/useSearch";
import { Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import DiscoveryTag, { EmptyDiscoveryTag } from "@/tags/DiscoveryTag";
import GomealGlassView from "@/components/GlassComponent";
import FeedProfile, { FEED_CARD_PROFILE_RADIUS } from "./feedProfile";
import { useCook } from "@/stores/useCook";
import { MinimumFeedCard, SearchFeedCard } from "@/types/feed.types";
import { BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { useReel } from "@/stores/useReel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlideUpOverlay } from "@/stores/useSlideUpOverlay";

export const SearchMainScreen: React.FC<{onClose: () => void}> = ({ onClose }) => {

    const { colors, textStyles} = useTheme();
    const [search, setSearch] = useState("");

    const openSlideUpOverlay = useSlideUpOverlay((s) => s.openSlideUpOverlay);
    const closeSlideUpOverlay = useSlideUpOverlay((s) => s.closeSlideUpOverlay);

    const insets = useSafeAreaInsets();
    const SCREEN_WIDTH = Dimensions.get("window").width;
    const NUM_COLUMNS = 3;
    const GAP = 1;
    const ITEM_SIZE = (SCREEN_WIDTH - GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

    const { setActiveProfile, clearActiveProfile } = useFeed();
    const { trending_post, trending_user, users, posts, loadTrend, loadSearch, loading, clearSearch } = useSearch();
    
    const handleBack = () => { onClose(); };

    const trimmedSearch = search.trim();
    const hasSearch = trimmedSearch.length >= 3;

    const hasUsers = !!users?.length;
    const hasPosts = !!posts?.length;

    const hasTrendingPosts = !!trending_post?.length;
    const hasTrendingUsers = !!trending_user?.length;

    const showUsers = hasSearch && hasUsers;
    const showPosts = hasSearch && !hasUsers && hasPosts;

    const closeProfileSheet = () => {
        closeSlideUpOverlay();
        clearActiveProfile();
    };

    useEffect(() => {
        const trimmed = search.trim();

        const fetchSearch = setTimeout(() => {
            if (trimmed.length < 3) {
                clearSearch();
                return;
            }

            loadSearch(trimmed);
        }, 300);

        return () => clearTimeout(fetchSearch);
    }, [search, loadSearch, clearSearch]);


    return (

        <View style={{...StyleSheet.absoluteFillObject, paddingTop: insets.top, backgroundColor: colors.background }}>

            <View 
                style={{
                    flex: 1,
                    gap: 10, 
                }}
            >

                <View
                    style={{
                        justifyContent: "center",
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >

                    <View style={{ width: "100%", paddingHorizontal: 5, flexShrink: 1 }}>
                        <Input
                            autoFocus
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Searching... "
                            containerStyle={{
                                borderRadius: 30
                            }}
                            leftIcon={<BackIcon color={colors.text} />}
                            onIconPress={handleBack}
                        />
                    </View>

                </View>

                {hasSearch ? (

                    <>

                        <View
                            style={{ flex: 1,}}
                        >

                            {showUsers && (
                                <ScrollView
                                    style={{ flex: 1, paddingBottom: 125}}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <View
                                        style={{
                                            gap: 5,
                                            maxHeight: 300,
                                            padding: 5,
                                        }}
                                        className="w-full"
                                    >
                                        {users.map((user, index) => (
                                            <Button
                                                key={index}
                                                style={{
                                                    gap: 5,
                                                    width: "100%",
                                                    overflow: "hidden",
                                                    borderRadius: 20,
                                                    padding: 5,
                                                    flexDirection: "row",
                                                    justifyContent: "flex-start",
                                                    alignItems: "flex-end",
                                                    borderWidth: 2,
                                                    borderColor: colors.secondaryCard,
                                                }}
                                                onPress={async () => {
                                                    setActiveProfile(undefined, user?.sub);
                                                    openSlideUpOverlay(
                                                        <FeedProfile 
                                                            onClose={() => closeSlideUpOverlay()}
                                                        />
                                                    );
                                                }}
                                            >
                                                <AvatarRender
                                                    avatar={user.avatar} 
                                                    background 
                                                    showBadge
                                                    badge={user.badge}
                                                />

                                                <View
                                                    style={{
                                                        alignItems: "flex-start",
                                                        justifyContent: "flex-end",
                                                        flexDirection: "column",
                                                    }}
                                                >
                                                    <Text className={textStyles.caption} numberOfLines={1}>
                                                        {user?.profile_name}
                                                    </Text>
                                                    <Text className={textStyles.small} numberOfLines={1}>
                                                        {user?.firstName} {user?.lastName}
                                                    </Text>
                                                </View>
                                            </Button>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}

                            {showPosts && (
                                <MasonryList
                                    data={posts}
                                    numColumns={3}
                                    keyExtractor={(item) => item.post_id}
                                    showsVerticalScrollIndicator={false}
                                    style={{
                                        gap: GAP,
                                    }}
                                    contentContainerStyle={{
                                        paddingBottom: 125
                                    }}
                                    renderItem={({ item }) => {
                                        const post = item as SearchFeedCard
                                        const isVideo =
                                            post.info?.dish_media_type === "video";

                                        return (
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={{
                                                    width: ITEM_SIZE,
                                                    height: 250,
                                                    margin: 2,
                                                }}
                                            >
                                                <DiscoveryTag
                                                    card={post}
                                                    style={{
                                                        width: "100%"
                                                    }}
                                                    onPress={async (layout) => {
                                                        const fullPost = await useFeed
                                                            .getState()
                                                            .loadPost(post.post_id);

                                                        if (!fullPost) return;

                                                        useReel.getState().open(
                                                            fullPost as any,
                                                            layout,
                                                            () => {
                                                                // callback
                                                            }
                                                        );
                                                    }}
                                                    onPressProfile={() => {
                                                        setActiveProfile(
                                                            undefined,
                                                            post.user_sub
                                                        );

                                                        openSlideUpOverlay(
                                                            <FeedProfile
                                                                onClose={closeProfileSheet}
                                                            />
                                                        );
                                                    }}
                                                />
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}

                        </View>

                    </>

                ) : (

                    <>
                    
                        <SectionHeader
                            title="Trending"
                            subtitle="Who is chefing and whats cooking at this moment ?"
                            showDivider
                            leftIcon={<FireIcon size={30} />}
                        />

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={{
                                flex: 1,
                            }}
                            contentContainerStyle={{
                                paddingBottom: insets.bottom,
                            }}
                        >
                            <View
                                style={{
                                    gap: 10,
                                    paddingVertical: 10,
                                    alignItems: "center",
                                }}
                            >
                                <SectionHeader
                                    title="Food"
                                    showBackground
                                    titleClassName={textStyles.bodyMedium}
                                    leftIcon={<ShrimpIcon size={30} />}
                                />

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{
                                        gap: 8,
                                        paddingHorizontal: 10,
                                    }}
                                >
                                    {hasTrendingPosts ? (
                                        trending_post.map((post) => {
                                            console.log('[SCREEN RAW POST]', JSON.stringify(post));
                                            return (
                                            <DiscoveryTag
                                                key={post.post_id}
                                                card={post}
                                                style={{
                                                    width: 200
                                                }}
                                                onPress={async (layout) => {
                                                    const fullPost = await useFeed
                                                        .getState()
                                                        .loadPost(post.post_id);

                                                    if (!fullPost) return;

                                                    useReel.getState().open(
                                                        fullPost as any,
                                                        layout,
                                                        () => {
                                                            // callback
                                                        }
                                                    );
                                                }}
                                                onPressProfile={() => {
                                                    setActiveProfile(
                                                        undefined,
                                                        post.user_sub
                                                    );

                                                    openSlideUpOverlay(
                                                        <FeedProfile
                                                            onClose={closeProfileSheet}
                                                        />
                                                    );
                                                }}
                                            />)
                                            }
                                    )
                                    ) : (
                                        <View
                                            style={{
                                                width: 200,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <SpinningLogoImage size={40} />
                                        </View>
                                    )}
                                </ScrollView>
                            </View>

                            <View
                                style={{
                                    gap: 10,
                                    paddingVertical: 10,
                                    alignItems: "center",
                                }}
                            >
                                <SectionHeader
                                    title="Chefs"
                                    titleClassName={textStyles.bodyMedium}
                                    leftIcon={<ChefIcon size={40} />}
                                    showBackground
                                />

                                <View
                                    style={{
                                        width: "100%",
                                        paddingHorizontal: 10,
                                        gap: 10,
                                    }}
                                >
                                    {hasTrendingUsers ? (
                                        trending_user.map((user) => (
                                            <Button
                                                key={user.sub}
                                                style={{
                                                    gap: 5,
                                                    width: "100%",
                                                    overflow: "hidden",
                                                    borderRadius: 20,
                                                    padding: 5,
                                                    flexDirection: "row",
                                                    justifyContent: "flex-start",
                                                    alignItems: "flex-end",
                                                    borderWidth: 2,
                                                    borderColor: colors.secondaryCard,
                                                }}
                                                onPress={() => {
                                                    setActiveProfile(undefined, user.sub);
                                                    openSlideUpOverlay(
                                                        <FeedProfile 
                                                            onClose={() => closeSlideUpOverlay()}
                                                        />
                                                    );
                                                }}
                                            >
                                                <AvatarRender
                                                    avatar={user.avatar}
                                                    background
                                                    showBadge
                                                    badge={user.badge}
                                                />

                                                <View
                                                    style={{
                                                        alignItems: "flex-start",
                                                        justifyContent: "center",
                                                        maxWidth: 200,
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <Text
                                                        className={textStyles.caption}
                                                        numberOfLines={1}
                                                    >
                                                        {user.profile_name}
                                                    </Text>

                                                    <Text
                                                        className={textStyles.small}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {user.firstName} {user.lastName}
                                                    </Text>
                                                </View>
                                            </Button>
                                        ))
                                    ) : (
                                        <View
                                            style={{
                                                alignItems: "center",
                                                justifyContent: "center",
                                                paddingVertical: 20,
                                            }}
                                        >
                                            <EmptySearchSection />
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </>

                ) }
        
            </View>

        </View>

    );

};

const EmptySearchSection = () => {
    const { colors } = useTheme();

    return (
        <View
            style={{
                flex: 1,
                padding: 10,
                gap: 10,
            }}
        >
            {/* fake result cards */}
            {[1, 2, 3].map((i) => (
                <View
                    key={i}
                    style={{
                        height: 70,
                        width: "100%",
                        borderRadius: 20,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.secondaryCard,
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 10,
                        gap: 10,
                    }}
                >
                    <View
                        style={{
                            width: 45,
                            height: 45,
                            borderRadius: 999,
                            backgroundColor: colors.secondaryCard,
                        }}
                    />

                    <View
                        style={{
                            flex: 1,
                            gap: 8,
                        }}
                    >
                        <View
                            style={{
                                width: "45%",
                                height: 12,
                                borderRadius: 10,
                                backgroundColor: colors.secondaryCard,
                            }}
                        />

                        <View
                            style={{
                                width: "30%",
                                height: 10,
                                borderRadius: 10,
                                backgroundColor: colors.secondaryCard,
                            }}
                        />
                    </View>
                </View>
            ))}

            {/* fake post grid */}
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 2,
                    marginTop: 10,
                }}
            >
                {Array.from({ length: 9 }).map((_, i) => (
                    <View
                        key={i}
                        style={{
                            width: "33%",
                            aspectRatio: 1,
                            backgroundColor: colors.card,
                        }}
                    />
                ))}
            </View>
        </View>
    );
};