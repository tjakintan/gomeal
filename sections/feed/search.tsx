import { Button } from "@/components/ButtonComponent";
import { ChefIcon, ShrimpIcon, FireIcon, XIcon } from "@/icons/Icon";
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
import { MinTag } from "@/tags/MinTag";
import GomealGlassView from "@/components/GlassComponent";
import FeedProfile, { FEED_CARD_PROFILE_RADIUS } from "./feedProfile";
import { useCook } from "@/stores/useCook";
import { MinimumFeedCard } from "@/types/feed.types";
import { BOTTOM_INSETS, BOTTOM_SNAP_POINTS } from "@/types";
import { DASHBOARD_HEIGHT } from "@/tags/ReelTag";

export const SearchMainScreen: React.FC<{onClose: () => void}> = ({ onClose }) => {

    const { colors, textStyles} = useTheme();
    const [search, setSearch] = useState("");

    const profileSheetRef = useRef<BottomSheet>(null);
    const [stopBottomSheet, setStopBottomSheet] = useState(false);

    const SCREEN_WIDTH = Dimensions.get("window").width;
    const NUM_COLUMNS = 3;
    const GAP = 1;
    const ITEM_SIZE = (SCREEN_WIDTH - GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

    const { openCook } = useCook();
    const { activeProfile, setActiveProfile, clearActiveProfile } = useFeed();
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
    const hasResults = showUsers || showPosts;

    const closeProfileSheet = () => {
        profileSheetRef.current?.close();
        clearActiveProfile();
        setStopBottomSheet(false);
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

        <View style={{...StyleSheet.absoluteFillObject, backgroundColor: colors.background }}>

            <View 
                style={{
                    flex: 1,
                    gap: 10, 
                }}
            >

                <View
                    style={{
                        paddingVertical: 10,
                        justifyContent: "center",
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <Button
                        onPress={handleBack}
                        clearBackground
                    >
                        <XIcon color={colors.danger} />
                    </Button>

                    <View style={{ width: 300, flexShrink: 1 }}>
                        <Input
                            autoFocus
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Searching... "
                            containerStyle={{
                                borderRadius: 30
                            }}
                        />
                    </View>

                </View>

                {hasSearch && loading ? (

                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <SpinningLogoImage size={25} />
                    </View>

                ) : hasSearch ? (

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
                                            paddingVertical: 5,
                                            paddingHorizontal: 20,
                                        }}
                                        className="w-full"
                                    >
                                        {users.map((user, index) => (
                                            <Button
                                                key={index}
                                                style={{
                                                    gap: 10,
                                                    width: "100%",
                                                    borderRadius: 0,
                                                    borderBottomWidth: 1,
                                                    borderColor: colors.text,
                                                    flexDirection: "row",
                                                    justifyContent: "flex-start",
                                                }}
                                                onPress={async () => {
                                                    setActiveProfile(undefined, user?.sub);
                                                    profileSheetRef.current?.expand()
                                                }}
                                            >
                                                <AvatarRender avatar={user?.avatar} background />

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
                                        const post = item as MinimumFeedCard;

                                        const isVideo =
                                            post.info?.dish_media_type === "video";

                                        return (
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={{
                                                    width: ITEM_SIZE,
                                                    height: isVideo
                                                        ? ITEM_SIZE * 1.5
                                                        : ITEM_SIZE,
                                                    margin: 2,
                                                }}
                                            >
                                                <MinTag
                                                    minCard={post}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                    }}
                                                    containerStyle={{
                                                        borderRadius: 15,
                                                    }}
                                                    onPress={() => openCook(post.post_id)}
                                                />
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}

                        </View>

                        {!hasResults && (
                            <View style={{ flex: 1, alignItems: "center" }}>
                                <Text className={textStyles.caption}>Ops...</Text>
                            </View>
                        )}

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
                                paddingBottom: BOTTOM_INSETS
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
                                        paddingHorizontal: 10,
                                        gap: 8,
                                    }}
                                >
                                    {hasTrendingPosts ? (
                                        trending_post.map((post) => (
                                            <MinTag
                                                key={post.post_id}
                                                minCard={post}
                                                onPress={() => openCook(post.post_id)}
                                            />
                                        ))
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
                                                    backgroundColor: colors.card,
                                                    borderWidth: 2,
                                                    borderColor: colors.secondaryCard,
                                                }}
                                                onPress={() => {
                                                    setActiveProfile(undefined, user.sub);
                                                    profileSheetRef.current?.expand();
                                                }}
                                            >
                                                <AvatarRender
                                                    avatar={user.avatar}
                                                    background
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
                                            <SpinningLogoImage size={20} />
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </>

                )}

        
            </View>

            {/* Profile Bottom Sheet */}
            <BottomSheet
                ref={profileSheetRef}
                index={-1}
                snapPoints={BOTTOM_SNAP_POINTS}
                enablePanDownToClose={false}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={false}
                backgroundStyle={{
                    backgroundColor: "transparent",
                }}
                handleComponent={() => null}
            >
                <View  
                    style={{ 
                        height: 610,  
                        borderTopLeftRadius: FEED_CARD_PROFILE_RADIUS + 10,
                        borderTopRightRadius: FEED_CARD_PROFILE_RADIUS + 10,
                    }}
                >
                    <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.85, backgroundColor: colors.secondaryCard, borderRadius: 50 }} />
                    <BottomSheetView style={{ height: 450, marginTop: 10, marginHorizontal: 10, overflow: "hidden", alignSelf: "center", backgroundColor: colors.background, borderRadius: 40 }}>
                        <FeedProfile
                            sectionOpen={(open) => setStopBottomSheet(open)}
                            onClose={closeProfileSheet}
                        />
                    </BottomSheetView>
                </View>
                </BottomSheet>


        </View>

    );

};