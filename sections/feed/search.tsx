import { Button } from "@/components/ButtonComponent";
import { BackIcon, MessageIcon, ChefIcon, ShrimpIcon, FireIcon, XIcon } from "@/icons/Icon";
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/provider/ThemeProvider";
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SpinningLogoImage } from "@/utils/Logo";
import { AvatarRender } from "@/dashboard/Avatar";
import { Media } from "@/media/media";
import MessageScreen from "@/sections/messages/messages";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { FullPost } from "@/types/feed.types";
import { useFeed } from "@/stores/useFeed";
import { useSearch } from "@/stores/useSearch";
import { Input } from "@/components/InputComponent";
import { SectionHeader } from "@/components/SectionComponent";
import { MinTag } from "@/tags/MinTag";
import GomealGlassView from "@/components/GlassComponent";
import FeedProfile from "./feedProfile";
import { useCook } from "@/stores/useCook";

export const SearchMainScreen: React.FC<{onClose: () => void}> = ({ onClose }) => {

    const { colors, textStyles} = useTheme();
    const [search, setSearch] = useState("");

    const profileSheetRef = useRef<BottomSheet>(null);
    const [stopBottomSheet, setStopBottomSheet] = useState(false);

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

        <View style={{...StyleSheet.absoluteFillObject, backgroundColor: colors.background, paddingBottom: 125}}>

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
                        style={{ height: 40, width: 40, backgroundColor: colors.danger }}
                        onPress={handleBack}
                        background
                    >
                        <XIcon color={colors.background} />
                    </Button>

                    <View style={{ width: 300, flexShrink: 1 }}>
                        <Input
                            autoFocus
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Searching... "
                        />
                    </View>

                </View>

                {hasSearch && loading ? (

                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <SpinningLogoImage size={25} />
                    </View>

                ) : hasSearch ? (

                    <>

                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator={false}
                        >

                            {showUsers && (
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
                            )}

                            {showPosts && (
                                <ScrollView
                                    contentContainerStyle={{
                                        padding: 5,
                                        gap: 5,
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        justifyContent: "center",
                                    }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {posts.map((post, index) => (
                                        <MinTag
                                            key={index}
                                            minCard={post}
                                            onPress={() => openCook(post.post_id)}
                                        />
                                    ))}
                                </ScrollView>
                            )}

                        </ScrollView>

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
                                        trending_post.map((post, index) => (
                                            <MinTag
                                                key={index}
                                                minCard={post}
                                                onPress={() => openCook(post.post_id)}
                                            />
                                        ))
                                    ) : (
                                        <View style={{ flex: 1, justifyContent: "center" }}>
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

                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    style={{ width: "100%", padding: 10, maxHeight: 300 }}
                                    contentContainerStyle={{
                                        gap: 10,
                                        flexDirection: "column",
                                        justifyContent: hasTrendingUsers ? "flex-start" : "center",
                                        alignItems: hasTrendingUsers ? "stretch" : "center",
                                        flexGrow: 1,
                                    }}
                                >
                                    {hasTrendingUsers ? (
                                        trending_user.map((user, index) => (
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
                                                    backgroundColor: colors.card,
                                                    borderWidth: 2,
                                                    borderColor: colors.secondaryCard,
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
                                                        justifyContent: "center",
                                                        maxWidth: 200,
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <Text className={textStyles.caption} numberOfLines={1}>
                                                        {user?.profile_name}
                                                    </Text>
                                                    <Text className={textStyles.small} ellipsizeMode="tail" numberOfLines={1}>
                                                        {user?.firstName} {user?.lastName}
                                                    </Text>
                                                </View>

                                            </Button>
                                        ))
                                    ) : (
                                        <View style={{ flex: 1, justifyContent: "center" }}>
                                            <SpinningLogoImage size={20} />
                                        </View>
                                    )}
                                </ScrollView>
                            </View>

                        </ScrollView>

                    </>

                )}

        
            </View>

            {/* Profile Bottom Sheet */}
            <BottomSheet
                ref={profileSheetRef}
                index={-1}
                snapPoints={[525]}
                enablePanDownToClose={false}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={false}
                backgroundStyle={{ backgroundColor: "transparent", borderRadius: 50 }}
                handleComponent={() => null}
            >
                <GomealGlassView glassEffectStyle="clear" style={{ height: 520, marginHorizontal: 5, borderRadius: 50}}>
                    <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.85, backgroundColor: colors.secondaryCard, borderRadius: 50 }} />
                    <BottomSheetView style={{ height: 500, marginTop: 10, marginHorizontal: 10, overflow: "hidden", alignSelf: "center", backgroundColor: colors.background, borderRadius: 40 }}>
                        <FeedProfile
                            sectionOpen={(open) => setStopBottomSheet(open)}
                            onClose={closeProfileSheet}
                        />
                    </BottomSheetView>
                </GomealGlassView>
            </BottomSheet>


        </View>

    );

};